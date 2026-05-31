import { InjectQueue } from '@nestjs/bullmq'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { BotFlowType, BotStateStatus, MessageSenderType, MessageStatus, MessageType, NotificationPriority, Prisma } from '@prisma/client'
import type { Queue } from 'bullmq'
import { PrismaService } from '../../database/prisma.service'
import { WHATSAPP_OUTBOUND_QUEUE } from '../../events/queue.constants'
import { createQueueJobId } from '../../events/queue-job-id'
import { NotificationsService } from '../notifications/notifications.service'
import { WhatsAppOutboundMessageType } from '../whatsapp/whatsapp-send.dto'
import type { WhatsAppOutboundJob } from '../whatsapp/whatsapp-send.types'
import type { InboundBotMessage, TestBotMessageDto, UpdateBotSettingsDto } from './dto'

const DEFAULT_WELCOME = 'أهلًا بك 👋\nكيف نقدر نخدمك؟\n1. حجز موعد\n2. الدعم الفني\n3. متابعة طلب\n4. التحدث مع موظف'
const DEFAULT_HANDOFF = 'تم تحويلك لأحد موظفينا، سيتم الرد عليك قريبًا.'

function asJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function readData(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalize(input: string) {
  return input.trim().toLowerCase()
}

@Injectable()
export class BotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(WHATSAPP_OUTBOUND_QUEUE) private readonly outboundQueue: Queue<WhatsAppOutboundJob>,
  ) {}

  async getSettings(tenantId: string) {
    const settings = await this.prisma.whatsAppBotSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        isEnabled: false,
        welcomeMessage: DEFAULT_WELCOME,
        handoffMessage: DEFAULT_HANDOFF,
      },
      update: {},
    })
    return settings
  }

  async updateSettings(tenantId: string, dto: UpdateBotSettingsDto) {
    await this.validateAssignments(tenantId, dto)
    return this.prisma.whatsAppBotSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        isEnabled: Boolean(dto.isEnabled),
        welcomeMessage: dto.welcomeMessage?.trim() || DEFAULT_WELCOME,
        handoffMessage: dto.handoffMessage?.trim() || DEFAULT_HANDOFF,
        appointmentEnabled: dto.appointmentEnabled ?? true,
        ticketEnabled: dto.ticketEnabled ?? true,
        workingHoursOnly: dto.workingHoursOnly ?? false,
        defaultAppointmentDurationMinutes: Number(dto.defaultAppointmentDurationMinutes ?? 30),
        defaultAssignedTeamId: dto.defaultAssignedTeamId?.trim() || undefined,
        defaultAssignedUserId: dto.defaultAssignedUserId?.trim() || undefined,
      },
      update: {
        isEnabled: dto.isEnabled,
        welcomeMessage: dto.welcomeMessage?.trim() || undefined,
        handoffMessage: dto.handoffMessage?.trim() || undefined,
        appointmentEnabled: dto.appointmentEnabled,
        ticketEnabled: dto.ticketEnabled,
        workingHoursOnly: dto.workingHoursOnly,
        defaultAppointmentDurationMinutes: dto.defaultAppointmentDurationMinutes,
        defaultAssignedTeamId: dto.defaultAssignedTeamId?.trim() || null,
        defaultAssignedUserId: dto.defaultAssignedUserId?.trim() || null,
      },
    })
  }

  getFlows() {
    return {
      mainMenu: ['1. حجز موعد', '2. الدعم الفني', '3. متابعة طلب', '4. التحدث مع موظف'],
      appointment: ['نوع الموعد', 'اليوم/التاريخ', 'الوقت', 'نوع اللقاء', 'إنشاء الموعد'],
      ticket: ['وصف المشكلة', 'الأولوية', 'إنشاء التذكرة'],
      cancelWords: ['إلغاء', 'cancel'],
    }
  }

  async testMessage(tenantId: string, dto: TestBotMessageDto) {
    const settings = await this.getSettings(tenantId)
    const choice = this.detectChoice(dto.message)
    return {
      enabled: settings.isEnabled,
      detected: choice ?? 'MAIN_MENU',
      reply: this.previewReply(settings, choice),
    }
  }

  async reset(tenantId: string, conversationId: string) {
    await this.ensureConversation(tenantId, conversationId)
    await this.prisma.conversationBotState.updateMany({
      where: { tenantId, conversationId, status: BotStateStatus.ACTIVE },
      data: { status: BotStateStatus.CANCELLED },
    })
    return { reset: true, conversationId }
  }

  async handoff(tenantId: string, conversationId: string) {
    const conversation = await this.ensureConversation(tenantId, conversationId)
    const settings = await this.getSettings(tenantId)
    await this.markHandoff(tenantId, conversationId, conversation.customerId, settings)
    return { handedOff: true, conversationId }
  }

  async getConversationState(tenantId: string, conversationId: string) {
    await this.ensureConversation(tenantId, conversationId)
    const [settings, state] = await Promise.all([
      this.getSettings(tenantId),
      this.prisma.conversationBotState.findFirst({
        where: { tenantId, conversationId },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    return { isEnabled: settings.isEnabled, state }
  }

  async handleInbound(input: InboundBotMessage) {
    const settings = await this.getSettings(input.tenantId)
    if (!settings.isEnabled) return { skipped: true, reason: 'disabled' }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId, deletedAt: null },
      include: { customer: true },
    })
    if (!conversation) return { skipped: true, reason: 'conversation_not_found' }

    const duplicate = await this.prisma.conversationBotState.findFirst({
      where: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        collectedData: { path: ['lastExternalMessageId'], equals: input.externalMessageId },
      },
    })
    if (duplicate) return { skipped: true, reason: 'duplicate' }

    const active = await this.prisma.conversationBotState.findFirst({
      where: { tenantId: input.tenantId, conversationId: input.conversationId, status: BotStateStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
    })

    if (conversation.assignedUserId && active?.flowType === BotFlowType.HANDOFF) {
      return { skipped: true, reason: 'human_handoff' }
    }

    const text = normalize(input.content)
    if (text === 'إلغاء' || text === 'الغاء' || text === 'cancel') {
      await this.cancelActive(input.tenantId, input.conversationId)
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'تم إلغاء الطلب الحالي. يمكنك إرسال أي رسالة لبدء القائمة من جديد.')
      return { cancelled: true }
    }

    if (!active) {
      const choice = this.detectChoice(input.content)
      if (!choice) {
        await this.createState(input, BotFlowType.MAIN_MENU, 'awaiting_choice', { lastExternalMessageId: input.externalMessageId })
        await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, settings.welcomeMessage)
        return { started: true, flow: 'MAIN_MENU' }
      }
      return this.startFlow(input, settings, choice)
    }

    return this.continueFlow(input, settings, active)
  }

  private async startFlow(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, choice: BotFlowType | 'FOLLOW_UP') {
    await this.cancelActive(input.tenantId, input.conversationId)
    if (choice === BotFlowType.BOOK_APPOINTMENT && settings.appointmentEnabled) {
      await this.createState(input, BotFlowType.BOOK_APPOINTMENT, 'appointment_type', { lastExternalMessageId: input.externalMessageId })
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'اختر نوع الموعد:\n1. عرض تجريبي\n2. استشارة\n3. دعم فني')
      return { flow: 'BOOK_APPOINTMENT' }
    }
    if ((choice === BotFlowType.CREATE_TICKET || choice === 'FOLLOW_UP') && settings.ticketEnabled) {
      await this.createState(input, BotFlowType.CREATE_TICKET, 'summary', { category: choice === 'FOLLOW_UP' ? 'متابعة' : 'دعم فني', lastExternalMessageId: input.externalMessageId })
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'اكتب ملخص الطلب أو المشكلة وسنفتح لك تذكرة متابعة.')
      return { flow: 'CREATE_TICKET' }
    }
    if (choice === BotFlowType.HANDOFF) {
      await this.markHandoff(input.tenantId, input.conversationId, input.customerId ?? null, settings)
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, settings.handoffMessage)
      return { flow: 'HANDOFF' }
    }
    await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, settings.welcomeMessage)
    return { flow: 'MAIN_MENU' }
  }

  private async continueFlow(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: { id: string; flowType: BotFlowType; step: string; collectedData: Prisma.JsonValue }) {
    if (state.flowType === BotFlowType.MAIN_MENU) {
      const choice = this.detectChoice(input.content)
      if (!choice) {
        await this.updateState(state.id, { lastExternalMessageId: input.externalMessageId })
        await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, settings.welcomeMessage)
        return { flow: 'MAIN_MENU' }
      }
      return this.startFlow(input, settings, choice)
    }

    if (state.flowType === BotFlowType.BOOK_APPOINTMENT) return this.continueAppointment(input, settings, state)
    if (state.flowType === BotFlowType.CREATE_TICKET) return this.continueTicket(input, settings, state)
    return { skipped: true }
  }

  private async continueAppointment(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: { id: string; step: string; collectedData: Prisma.JsonValue }) {
    const data: Record<string, unknown> = { ...readData(state.collectedData), lastExternalMessageId: input.externalMessageId }
    if (state.step === 'appointment_type') {
      data.appointmentType = this.appointmentType(input.content)
      await this.updateState(state.id, data, 'date')
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'ما اليوم أو التاريخ المناسب؟ مثال: غدًا أو 2026-06-01')
      return { step: 'date' }
    }
    if (state.step === 'date') {
      data.date = input.content.trim()
      await this.updateState(state.id, data, 'time')
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'ما الوقت المناسب؟ مثال: 10:30 صباحًا')
      return { step: 'time' }
    }
    if (state.step === 'time') {
      data.time = input.content.trim()
      await this.updateState(state.id, data, 'meeting_type')
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'اختر نوع اللقاء:\n1. اتصال\n2. أونلاين\n3. حضوري')
      return { step: 'meeting_type' }
    }

    data.meetingType = this.meetingType(input.content)
    const appointment = await this.createAppointment(input, settings, data)
    await this.completeState(state.id, data)
    await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, `تم تسجيل طلب الموعد بنجاح. رقم الموعد: ${appointment.id}`)
    return { completed: true, appointmentId: appointment.id }
  }

  private async continueTicket(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: { id: string; step: string; collectedData: Prisma.JsonValue }) {
    const data: Record<string, unknown> = { ...readData(state.collectedData), lastExternalMessageId: input.externalMessageId }
    if (state.step === 'summary') {
      data.summary = input.content.trim()
      await this.updateState(state.id, data, 'priority')
      await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, 'اختر الأولوية:\n1. عادي\n2. مهم\n3. عاجل')
      return { step: 'priority' }
    }

    data.priority = this.ticketPriority(input.content)
    const ticket = await this.createTicket(input, settings, data)
    await this.completeState(state.id, data)
    await this.sendBotReply(input.tenantId, input.conversationId, input.customerPhone, `تم إنشاء تذكرة لك بنجاح. رقم التذكرة: ${ticket.id}`)
    return { completed: true, ticketId: ticket.id }
  }

  private detectChoice(content: string): BotFlowType | 'FOLLOW_UP' | null {
    const text = normalize(content)
    if (text === '1' || text.includes('حجز') || text.includes('موعد')) return BotFlowType.BOOK_APPOINTMENT
    if (text === '2' || text.includes('دعم') || text.includes('مشكلة')) return BotFlowType.CREATE_TICKET
    if (text === '3' || text.includes('متابعة')) return 'FOLLOW_UP'
    if (text === '4' || text.includes('موظف') || text.includes('إنسان') || text.includes('انسان')) return BotFlowType.HANDOFF
    return null
  }

  private previewReply(settings: Awaited<ReturnType<BotService['getSettings']>>, choice: BotFlowType | 'FOLLOW_UP' | null) {
    if (choice === BotFlowType.BOOK_APPOINTMENT) return 'اختر نوع الموعد:\n1. عرض تجريبي\n2. استشارة\n3. دعم فني'
    if (choice === BotFlowType.CREATE_TICKET || choice === 'FOLLOW_UP') return 'اكتب ملخص الطلب أو المشكلة وسنفتح لك تذكرة متابعة.'
    if (choice === BotFlowType.HANDOFF) return settings.handoffMessage
    return settings.welcomeMessage
  }

  private appointmentType(content: string) {
    const text = normalize(content)
    if (text === '1') return 'عرض تجريبي'
    if (text === '2') return 'استشارة'
    if (text === '3') return 'دعم فني'
    return content.trim() || 'موعد عميل'
  }

  private meetingType(content: string): 'PHONE' | 'ONLINE' | 'IN_PERSON' {
    const text = normalize(content)
    if (text === '2' || text.includes('اونلاين') || text.includes('أونلاين')) return 'ONLINE'
    if (text === '3' || text.includes('حضوري')) return 'IN_PERSON'
    return 'PHONE'
  }

  private ticketPriority(content: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const text = normalize(content)
    if (text === '3' || text.includes('عاجل')) return 'URGENT'
    if (text === '2' || text.includes('مهم')) return 'HIGH'
    return 'MEDIUM'
  }

  private async createAppointment(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, data: Record<string, unknown>) {
    const startAt = this.parsePreferredDateTime(String(data.date ?? ''), String(data.time ?? ''))
    const endAt = new Date(startAt.getTime() + settings.defaultAppointmentDurationMinutes * 60_000)
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId ?? await this.customerIdForConversation(input.tenantId, input.conversationId),
        conversationId: input.conversationId,
        assignedUserId: settings.defaultAssignedUserId,
        assignedTeamId: settings.defaultAssignedTeamId,
        title: `موعد ${String(data.appointmentType ?? 'عميل')}`,
        description: `تم إنشاء الموعد بواسطة وكيل واتساب. التاريخ المطلوب: ${String(data.date ?? '')} ${String(data.time ?? '')}`,
        startAt,
        endAt,
        meetingType: data.meetingType as 'PHONE' | 'ONLINE' | 'IN_PERSON',
      },
    })
    await this.notifications.create({
      tenantId: input.tenantId,
      userId: settings.defaultAssignedUserId,
      teamId: settings.defaultAssignedTeamId,
      type: 'APPOINTMENT_UPCOMING',
      title: 'موعد أنشأه وكيل واتساب',
      message: appointment.title,
      targetType: 'APPOINTMENT',
      targetId: appointment.id,
      conversationId: input.conversationId,
      priority: NotificationPriority.MEDIUM,
      metadata: { source: 'whatsapp-bot' },
    })
    return appointment
  }

  private async createTicket(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, data: Record<string, unknown>) {
    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId ?? await this.customerIdForConversation(input.tenantId, input.conversationId),
        conversationId: input.conversationId,
        assignedUserId: settings.defaultAssignedUserId,
        assignedTeamId: settings.defaultAssignedTeamId,
        title: String(data.summary ?? 'طلب من واتساب').slice(0, 120),
        description: String(data.summary ?? ''),
        priority: data.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        category: String(data.category ?? 'دعم فني'),
        tags: ['واتساب', 'وكيل آلي'],
      },
    })
    await this.notifications.create({
      tenantId: input.tenantId,
      userId: settings.defaultAssignedUserId,
      teamId: settings.defaultAssignedTeamId,
      type: 'TICKET_CREATED',
      title: 'تذكرة أنشأها وكيل واتساب',
      message: ticket.title,
      targetType: 'TICKET',
      targetId: ticket.id,
      conversationId: input.conversationId,
      priority: ticket.priority === 'URGENT' ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      metadata: { source: 'whatsapp-bot' },
    })
    return ticket
  }

  private async markHandoff(tenantId: string, conversationId: string, customerId: string | null, settings: Awaited<ReturnType<BotService['getSettings']>>) {
    await this.cancelActive(tenantId, conversationId)
    await this.prisma.conversationBotState.create({
      data: {
        tenantId,
        conversationId,
        customerId,
        flowType: BotFlowType.HANDOFF,
        step: 'handoff',
        status: BotStateStatus.HANDED_OFF,
        collectedData: asJson({ handedOffAt: new Date().toISOString() }),
      },
    })
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: {
        assignedUserId: settings.defaultAssignedUserId,
        assignedTeamId: settings.defaultAssignedTeamId,
        status: 'PENDING_AGENT',
      },
    })
    await this.notifications.create({
      tenantId,
      userId: settings.defaultAssignedUserId,
      teamId: settings.defaultAssignedTeamId,
      type: 'CONVERSATION_ASSIGNED',
      title: 'تحويل من وكيل واتساب',
      message: 'طلب العميل التحدث مع موظف.',
      targetType: 'CONVERSATION',
      targetId: conversationId,
      conversationId,
      priority: NotificationPriority.HIGH,
      metadata: { source: 'whatsapp-bot', flow: 'handoff' },
    })
  }

  private async sendBotReply(tenantId: string, conversationId: string, recipient: string, message: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, deletedAt: null },
      include: { channel: true },
    })
    if (!conversation || conversation.channel.type !== 'WHATSAPP') return
    const config = this.readChannelConfig(conversation.channel.config)
    const saved = await this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        channelId: conversation.channelId,
        senderType: MessageSenderType.SYSTEM,
        content: message,
        messageType: MessageType.TEXT,
        status: MessageStatus.PENDING,
        metadata: asJson({ whatsapp: { recipient, outboundType: 'TEXT', bot: true } }),
      },
    })
    await this.outboundQueue.add('whatsapp.outbound.send', {
      tenantId,
      conversationId,
      messageId: saved.id,
      channelId: conversation.channelId,
      phoneNumberId: config.phoneNumberId ?? conversation.channel.externalId ?? 'test-phone-number-id',
      recipient,
      message,
      messageType: WhatsAppOutboundMessageType.TEXT,
      accessToken: config.accessToken,
      apiVersion: 'v21.0',
      testMode: false,
    }, {
      jobId: createQueueJobId('whatsapp-bot-outbound', saved.id),
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    })
  }

  private async createState(input: InboundBotMessage, flowType: BotFlowType, step: string, collectedData: Record<string, unknown>) {
    return this.prisma.conversationBotState.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        customerId: input.customerId ?? undefined,
        flowType,
        step,
        collectedData: asJson(collectedData),
      },
    })
  }

  private updateState(id: string, data: Record<string, unknown>, step?: string) {
    return this.prisma.conversationBotState.update({
      where: { id },
      data: {
        collectedData: asJson(data),
        step,
        lastMessageAt: new Date(),
      },
    })
  }

  private completeState(id: string, data: Record<string, unknown>) {
    return this.prisma.conversationBotState.update({
      where: { id },
      data: { collectedData: asJson(data), status: BotStateStatus.COMPLETED, lastMessageAt: new Date() },
    })
  }

  private cancelActive(tenantId: string, conversationId: string) {
    return this.prisma.conversationBotState.updateMany({
      where: { tenantId, conversationId, status: BotStateStatus.ACTIVE },
      data: { status: BotStateStatus.CANCELLED },
    })
  }

  private async ensureConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id: conversationId, tenantId, deletedAt: null } })
    if (!conversation) throw new NotFoundException('Conversation not found')
    return conversation
  }

  private async customerIdForConversation(tenantId: string, conversationId: string) {
    const conversation = await this.ensureConversation(tenantId, conversationId)
    return conversation.customerId
  }

  private parsePreferredDateTime(dateText: string, timeText: string) {
    const now = new Date()
    const isoMatch = dateText.match(/\d{4}-\d{2}-\d{2}/)?.[0]
    const timeMatch = timeText.match(/\d{1,2}(:\d{2})?/)?.[0] ?? '10:00'
    if (isoMatch) {
      const [hour, minute = '00'] = timeMatch.split(':')
      return new Date(`${isoMatch}T${hour.padStart(2, '0')}:${minute}:00`)
    }
    const start = new Date(now)
    start.setDate(now.getDate() + (dateText.includes('غد') ? 1 : 0))
    const [hour, minute = '00'] = timeMatch.split(':')
    start.setHours(Number(hour), Number(minute), 0, 0)
    return start
  }

  private async validateAssignments(tenantId: string, dto: UpdateBotSettingsDto) {
    if (dto.defaultAssignedTeamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.defaultAssignedTeamId, tenantId, deletedAt: null }, select: { id: true } })
      if (!team) throw new BadRequestException('Default team does not belong to tenant')
    }
    if (dto.defaultAssignedUserId) {
      const user = await this.prisma.user.findFirst({ where: { id: dto.defaultAssignedUserId, tenantId, deletedAt: null }, select: { id: true } })
      if (!user) throw new BadRequestException('Default user does not belong to tenant')
    }
  }

  private readChannelConfig(config: Prisma.JsonValue | null) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return {} as { phoneNumberId?: string; accessToken?: string }
    return config as { phoneNumberId?: string; accessToken?: string }
  }
}
