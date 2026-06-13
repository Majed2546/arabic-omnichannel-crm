import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { BotFlowType, BotStateStatus, MessageSenderType, MessageStatus, MessageType, NotificationPriority, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { WhatsAppOutboundMessageType } from '../whatsapp/whatsapp-send.dto'
import { WhatsAppSendService } from '../whatsapp/whatsapp-send.service'
import type { InboundBotMessage, TestBotMessageDto, UpdateBotSettingsDto } from './dto'

const DEFAULT_APPOINTMENT_TIMEZONE = 'Asia/Riyadh'
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30

const DEFAULT_WELCOME = 'أهلًا بك 👋\nكيف نقدر نخدمك؟\n1. حجز موعد\n2. الدعم الفني\n3. متابعة طلب\n4. التحدث مع موظف'
const DEFAULT_HANDOFF = 'تم تحويلك لأحد موظفينا، سيتم الرد عليك قريبًا.'

function asJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function readData(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function processedInboundIds(data: Record<string, unknown>) {
  return Array.isArray(data.processedInboundMessageIds)
    ? data.processedInboundMessageIds.filter((id): id is string => typeof id === 'string')
    : []
}

function withProcessedInbound(data: Record<string, unknown>, inboundMessageId: string) {
  const nextData = { ...data }
  delete nextData.lastSendFailure
  return {
    ...nextData,
    lastExternalMessageId: inboundMessageId,
    processedInboundMessageIds: Array.from(new Set([...processedInboundIds(data), inboundMessageId])).slice(-30),
  }
}

function normalize(input: string) {
  return input.trim().toLowerCase()
}

type BotStateLite = {
  id: string
  flowType: BotFlowType
  step: string
  collectedData: Prisma.JsonValue
}

type BotSendContext = {
  tenantId: string
  conversationId: string
  recipient: string
  message: string
  inboundMessageId: string
  botStateId?: string
  step?: string
}

type ParsedAppointmentDateTime = {
  startAt: Date
  endAt: Date
  timezone: string
  durationMinutes: number
  dateLabel: string
  timeLabel: string
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly whatsappSend: WhatsAppSendService,
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
      where: { tenantId, conversationId, status: { in: [BotStateStatus.ACTIVE, BotStateStatus.HANDED_OFF] } },
      data: { status: BotStateStatus.CANCELLED },
    })
    return { reset: true, conversationId }
  }

  async stop(tenantId: string, conversationId: string) {
    const conversation = await this.ensureConversation(tenantId, conversationId)
    await this.cancelActive(tenantId, conversationId)
    await this.prisma.conversationBotState.create({
      data: {
        tenantId,
        conversationId,
        customerId: conversation.customerId,
        flowType: BotFlowType.HANDOFF,
        step: 'stopped',
        status: BotStateStatus.HANDED_OFF,
        collectedData: asJson({ stoppedAt: new Date().toISOString(), reason: 'manual_stop' }),
      },
    })
    return { stopped: true, conversationId }
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
    const data = readData(state?.collectedData ?? null)
    return {
      isEnabled: settings.isEnabled,
      state,
      waitingForCustomer: state?.status === BotStateStatus.ACTIVE && !data.lastSendFailure,
      lastSendFailed: state?.status === BotStateStatus.ACTIVE && Boolean(data.lastSendFailure),
    }
  }

  async handleInbound(input: InboundBotMessage) {
    const settings = await this.getSettings(input.tenantId)
    if (!settings.isEnabled) return { skipped: true, reason: 'disabled' }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId, deletedAt: null },
      include: { customer: true },
    })
    if (!conversation) return { skipped: true, reason: 'conversation_not_found' }

    if (await this.isDuplicateInbound(input)) return { skipped: true, reason: 'duplicate' }

    const [active, latestState] = await Promise.all([
      this.prisma.conversationBotState.findFirst({
        where: { tenantId: input.tenantId, conversationId: input.conversationId, status: BotStateStatus.ACTIVE },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.conversationBotState.findFirst({
        where: { tenantId: input.tenantId, conversationId: input.conversationId },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    if (!active && latestState?.status === BotStateStatus.HANDED_OFF) {
      return { skipped: true, reason: latestState.step === 'stopped' ? 'bot_stopped' : 'human_handoff' }
    }

    const text = normalize(input.content)
    if (text === 'إلغاء' || text === 'الغاء' || text === 'cancel') {
      await this.cancelActive(input.tenantId, input.conversationId)
      await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'تم إلغاء الطلب الحالي. يمكنك إرسال أي رسالة لبدء القائمة من جديد.',
        inboundMessageId: input.externalMessageId,
        step: 'cancel',
      })
      return { cancelled: true }
    }

    if (!active) {
      const choice = this.detectChoice(input.content)
      if (!choice) {
        const state = await this.createState(input, BotFlowType.MAIN_MENU, 'awaiting_choice', withProcessedInbound({}, input.externalMessageId))
        await this.sendBotReply({
          tenantId: input.tenantId,
          conversationId: input.conversationId,
          recipient: input.customerPhone,
          message: settings.welcomeMessage,
          inboundMessageId: input.externalMessageId,
          botStateId: state.id,
          step: 'awaiting_choice',
        })
        return { started: true, flow: 'MAIN_MENU' }
      }
      return this.startFlow(input, settings, choice)
    }

    return this.continueFlow(input, settings, active)
  }

  private async startFlow(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, choice: BotFlowType | 'FOLLOW_UP') {
    await this.cancelActive(input.tenantId, input.conversationId)
    if (choice === BotFlowType.BOOK_APPOINTMENT && settings.appointmentEnabled) {
      const state = await this.createState(input, BotFlowType.BOOK_APPOINTMENT, 'appointment_type', withProcessedInbound({}, input.externalMessageId))
      await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'اختر نوع الموعد:\n1. عرض تجريبي\n2. استشارة\n3. دعم فني',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'appointment_type',
      })
      return { flow: 'BOOK_APPOINTMENT' }
    }
    if ((choice === BotFlowType.CREATE_TICKET || choice === 'FOLLOW_UP') && settings.ticketEnabled) {
      const state = await this.createState(input, BotFlowType.CREATE_TICKET, 'summary', withProcessedInbound({ category: choice === 'FOLLOW_UP' ? 'متابعة' : 'دعم فني' }, input.externalMessageId))
      await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'اكتب ملخص الطلب أو المشكلة وسنفتح لك تذكرة متابعة.',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'summary',
      })
      return { flow: 'CREATE_TICKET' }
    }
    if (choice === BotFlowType.HANDOFF) {
      const state = await this.markHandoff(input.tenantId, input.conversationId, input.customerId ?? null, settings)
      await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: settings.handoffMessage,
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'handoff',
      })
      return { flow: 'HANDOFF' }
    }
    await this.sendBotReply({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      recipient: input.customerPhone,
      message: settings.welcomeMessage,
      inboundMessageId: input.externalMessageId,
      step: 'awaiting_choice',
    })
    return { flow: 'MAIN_MENU' }
  }

  private async continueFlow(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: BotStateLite) {
    if (state.flowType === BotFlowType.MAIN_MENU) {
      const choice = this.detectChoice(input.content)
      if (!choice) {
        await this.updateState(state.id, withProcessedInbound(readData(state.collectedData), input.externalMessageId))
        await this.sendBotReply({
          tenantId: input.tenantId,
          conversationId: input.conversationId,
          recipient: input.customerPhone,
          message: settings.welcomeMessage,
          inboundMessageId: input.externalMessageId,
          botStateId: state.id,
          step: 'awaiting_choice',
        })
        return { flow: 'MAIN_MENU' }
      }
      return this.startFlow(input, settings, choice)
    }

    if (state.flowType === BotFlowType.BOOK_APPOINTMENT) return this.continueAppointment(input, settings, state)
    if (state.flowType === BotFlowType.CREATE_TICKET) return this.continueTicket(input, settings, state)
    return { skipped: true }
  }

  private async continueAppointment(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: BotStateLite) {
    const data: Record<string, unknown> = withProcessedInbound(readData(state.collectedData), input.externalMessageId)
    if (state.step === 'appointment_type') {
      data.appointmentType = this.appointmentType(input.content)
      const sent = await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'ما اليوم أو التاريخ المناسب؟ مثال: غدًا أو 2026-06-01',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'date',
      })
      await this.updateState(state.id, sent.ok ? data : this.withSendFailure(data, sent.messageId), sent.ok ? 'date' : undefined)
      return { step: 'date' }
    }
    if (state.step === 'date') {
      data.date = input.content.trim()
      const sent = await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'ما الوقت المناسب؟ مثال: 10:30 صباحًا',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'time',
      })
      await this.updateState(state.id, sent.ok ? data : this.withSendFailure(data, sent.messageId), sent.ok ? 'time' : undefined)
      return { step: 'time' }
    }
    if (state.step === 'time') {
      data.time = input.content.trim()
      const sent = await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'اختر نوع اللقاء:\n1. اتصال\n2. أونلاين\n3. حضوري',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'meeting_type',
      })
      await this.updateState(state.id, sent.ok ? data : this.withSendFailure(data, sent.messageId), sent.ok ? 'meeting_type' : undefined)
      return { step: 'meeting_type' }
    }

    data.meetingType = this.meetingType(input.content)
    const created = await this.createAppointment(input, settings, data)
    if (!created) {
      delete data.date
      delete data.time
      delete data.meetingType
      await this.updateState(state.id, data, 'date')
      await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'لم أتمكن من فهم التاريخ أو الوقت. فضلاً أرسل التاريخ بصيغة مثل: غداً أو 2026-06-01، ثم الوقت مثل: 11 صباحاً أو 16:00.',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'date',
      })
      return { step: 'date', reason: 'invalid_appointment_datetime' }
    }
    const { appointment, parsed } = created
    await this.completeState(state.id, data)
    await this.sendBotReply({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      recipient: input.customerPhone,
      message: `تم تسجيل طلب الموعد بنجاح.\nالتاريخ: ${parsed.dateLabel}\nالوقت: ${parsed.timeLabel}\nرقم الموعد: ${appointment.id}`,
      inboundMessageId: input.externalMessageId,
      botStateId: state.id,
      step: 'completed',
    })
    return { completed: true, appointmentId: appointment.id }
  }

  private async continueTicket(input: InboundBotMessage, settings: Awaited<ReturnType<BotService['getSettings']>>, state: BotStateLite) {
    const data: Record<string, unknown> = withProcessedInbound(readData(state.collectedData), input.externalMessageId)
    if (state.step === 'summary') {
      data.summary = input.content.trim()
      const sent = await this.sendBotReply({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        recipient: input.customerPhone,
        message: 'اختر الأولوية:\n1. عادي\n2. مهم\n3. عاجل',
        inboundMessageId: input.externalMessageId,
        botStateId: state.id,
        step: 'priority',
      })
      await this.updateState(state.id, sent.ok ? data : this.withSendFailure(data, sent.messageId), sent.ok ? 'priority' : undefined)
      return { step: 'priority' }
    }

    data.priority = this.ticketPriority(input.content)
    const ticket = await this.createTicket(input, settings, data)
    await this.completeState(state.id, data)
    await this.sendBotReply({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      recipient: input.customerPhone,
      message: `تم إنشاء تذكرة لك بنجاح. رقم التذكرة: ${ticket.id}`,
      inboundMessageId: input.externalMessageId,
      botStateId: state.id,
      step: 'completed',
    })
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
    const tenantSchedule = await this.getTenantAppointmentSettings(input.tenantId)
    const parsed = this.parsePreferredDateTimeInTenantZone(String(data.date ?? ''), String(data.time ?? ''), tenantSchedule.timezone, tenantSchedule.durationMinutes)
    if (!parsed) return null
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId ?? await this.customerIdForConversation(input.tenantId, input.conversationId),
        conversationId: input.conversationId,
        assignedUserId: settings.defaultAssignedUserId,
        assignedTeamId: settings.defaultAssignedTeamId,
        title: `موعد ${String(data.appointmentType ?? 'عميل')}`,
        description: `تم إنشاء الموعد بواسطة وكيل واتساب. التاريخ المطلوب: ${String(data.date ?? '')} ${String(data.time ?? '')}`,
        notes: [
          `originalDateInput: ${String(data.date ?? '')}`,
          `originalTimeInput: ${String(data.time ?? '')}`,
          `parsedTimezone: ${parsed.timezone}`,
          `parsedDateTime: ${parsed.dateLabel} ${parsed.timeLabel}`,
        ].join('\n'),
        startAt: parsed.startAt,
        endAt: parsed.endAt,
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
    return { appointment, parsed }
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
    const state = await this.prisma.conversationBotState.create({
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
    return state
  }

  private async sendBotReply(context: BotSendContext) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: context.conversationId, tenantId: context.tenantId, deletedAt: null },
      include: { channel: true },
    })
    if (!conversation || conversation.channel.type !== 'WHATSAPP') return { ok: false }

    const existing = await this.prisma.message.findFirst({
      where: {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        senderType: MessageSenderType.SYSTEM,
        metadata: { path: ['whatsapp', 'botInboundExternalMessageId'], equals: context.inboundMessageId },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      this.logBotSend({
        botStateId: context.botStateId,
        conversationId: context.conversationId,
        inboundMessageId: context.inboundMessageId,
        outboundMessageId: existing.id,
        mode: 'retry',
        sendStatus: existing.status,
      })
      return { ok: existing.status !== MessageStatus.FAILED, messageId: existing.id, duplicate: true }
    }

    const saved = await this.prisma.message.create({
      data: {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        channelId: conversation.channelId,
        senderType: MessageSenderType.SYSTEM,
        content: context.message,
        messageType: MessageType.TEXT,
        status: MessageStatus.PENDING,
        metadata: asJson({
          whatsapp: {
            recipient: context.recipient,
            outboundType: 'TEXT',
            bot: true,
            botStateId: context.botStateId,
            botStep: context.step,
            botInboundExternalMessageId: context.inboundMessageId,
            botFresh: true,
          },
        }),
      },
    })
    try {
      await this.whatsappSend.enqueueExistingMessage({
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        messageId: saved.id,
        recipient: context.recipient,
        message: context.message,
        messageType: WhatsAppOutboundMessageType.TEXT,
        source: 'bot',
      })
      this.logBotSend({
        botStateId: context.botStateId,
        conversationId: context.conversationId,
        inboundMessageId: context.inboundMessageId,
        outboundMessageId: saved.id,
        mode: 'fresh',
        sendStatus: 'queued',
      })
      return { ok: true, messageId: saved.id }
    } catch (error) {
      await this.prisma.message.update({
        where: { id: saved.id },
        data: {
          status: MessageStatus.FAILED,
          metadata: asJson({
            whatsapp: {
              recipient: context.recipient,
              outboundType: 'TEXT',
              bot: true,
              botStateId: context.botStateId,
              botStep: context.step,
              botInboundExternalMessageId: context.inboundMessageId,
              botFresh: true,
              sendFailure: error instanceof Error ? error.message : 'queue_failed',
            },
          }),
        },
      })
      if (context.botStateId) {
        const state = await this.prisma.conversationBotState.findUnique({ where: { id: context.botStateId } })
        await this.updateState(context.botStateId, this.withSendFailure(readData(state?.collectedData ?? null), saved.id))
      }
      this.logBotSend({
        botStateId: context.botStateId,
        conversationId: context.conversationId,
        inboundMessageId: context.inboundMessageId,
        outboundMessageId: saved.id,
        mode: 'fresh',
        sendStatus: 'failed',
        error: error instanceof Error ? error.message : 'queue_failed',
      })
      return { ok: false, messageId: saved.id }
    }
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

  private async isDuplicateInbound(input: InboundBotMessage) {
    const [states, message] = await Promise.all([
      this.prisma.conversationBotState.findMany({
        where: { tenantId: input.tenantId, conversationId: input.conversationId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.message.findFirst({
        where: {
          tenantId: input.tenantId,
          conversationId: input.conversationId,
          senderType: MessageSenderType.SYSTEM,
          metadata: { path: ['whatsapp', 'botInboundExternalMessageId'], equals: input.externalMessageId },
        },
        select: { id: true },
      }),
    ])
    if (message) return true
    return states.some((state) => {
      const data = readData(state.collectedData)
      return data.lastExternalMessageId === input.externalMessageId || processedInboundIds(data).includes(input.externalMessageId)
    })
  }

  private withSendFailure(data: Record<string, unknown>, outboundMessageId?: string) {
    return {
      ...data,
      lastSendFailure: {
        outboundMessageId,
        failedAt: new Date().toISOString(),
      },
    }
  }

  private logBotSend(event: {
    botStateId?: string
    conversationId: string
    inboundMessageId: string
    outboundMessageId: string
    mode: 'fresh' | 'retry'
    sendStatus: string
    error?: string
  }) {
    this.logger.log(JSON.stringify({ event: 'whatsapp_bot_send', ...event }))
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

  private async getTenantAppointmentSettings(tenantId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true, defaultAppointmentDurationMinutes: true },
    })
    return {
      timezone: this.validTimeZone(settings?.timezone) ? settings?.timezone ?? DEFAULT_APPOINTMENT_TIMEZONE : DEFAULT_APPOINTMENT_TIMEZONE,
      durationMinutes: this.positiveInteger(settings?.defaultAppointmentDurationMinutes) ?? DEFAULT_APPOINTMENT_DURATION_MINUTES,
    }
  }

  private parsePreferredDateTimeInTenantZone(dateText: string, timeText: string, timezone: string, durationMinutes: number): ParsedAppointmentDateTime | null {
    const dateParts = this.parseAppointmentDate(dateText, timezone)
    const timeParts = this.parseAppointmentTime(timeText)
    if (!dateParts || !timeParts) return null

    const startAt = this.localDateTimeToDate({ ...dateParts, ...timeParts }, timezone)
    const endAt = new Date(startAt.getTime() + durationMinutes * 60_000)
    return {
      startAt,
      endAt,
      timezone,
      durationMinutes,
      dateLabel: this.formatDateInTimeZone(startAt, timezone),
      timeLabel: this.formatTimeInTimeZone(startAt, timezone),
    }
  }

  private parseAppointmentDate(dateText: string, timezone: string): { year: number; month: number; day: number } | null {
    const text = this.normalizeArabicInput(dateText)
    const today = this.datePartsInTimeZone(new Date(), timezone)
    const relativeDays = text === 'اليوم'
      ? 0
      : ['غدا', 'غداً', 'بكره', 'بكرة'].includes(text)
        ? 1
        : text === 'بعد بكره' || text === 'بعد بكرة'
          ? 2
          : null
    if (relativeDays !== null) return this.addDays(today, relativeDays)

    const explicit = text.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/)
    if (!explicit) return null
    const first = Number(explicit[1])
    const second = Number(explicit[2])
    const third = Number(explicit[3])
    const year = explicit[1].length === 4 ? first : third
    const month = second
    const day = explicit[1].length === 4 ? third : first
    if (!this.validDateParts(year, month, day)) return null
    return { year, month, day }
  }

  private parseAppointmentTime(timeText: string): { hour: number; minute: number } | null {
    const text = this.normalizeArabicInput(timeText)
    const match = text.match(/(\d{1,2})(?::(\d{1,2}))?/)
    if (!match) return null
    let hour = Number(match[1])
    const minute = Number(match[2] ?? '0')
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null

    const isAm = /(^|\s)(ص|صباحا|صباح)(\s|$)/.test(text)
    const isPm = /(^|\s)(م|مساء|مساءا|عصرا|عصر)(\s|$)/.test(text)
    if (isAm && isPm) return null
    if (isAm || isPm) {
      if (hour < 1 || hour > 12) return null
      if (isAm && hour === 12) hour = 0
      if (isPm && hour < 12) hour += 12
    } else if (hour < 0 || hour > 23 || (hour >= 1 && hour <= 12)) {
      return null
    }
    return { hour, minute }
  }

  private normalizeArabicInput(value: string) {
    return value
      .trim()
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
      .replace(/[\u064b-\u065f\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .toLowerCase()
  }

  private datePartsInTimeZone(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      calendar: 'gregory',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    return { year: value('year'), month: value('month'), day: value('day') }
  }

  private addDays(parts: { year: number; month: number; day: number }, days: number) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
  }

  private validDateParts(year: number, month: number, day: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }

  private localDateTimeToDate(parts: { year: number; month: number; day: number; hour: number; minute: number }, timezone: string) {
    const localTimestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    let utcTimestamp = localTimestamp - this.timeZoneOffsetMs(new Date(localTimestamp), timezone)
    utcTimestamp = localTimestamp - this.timeZoneOffsetMs(new Date(utcTimestamp), timezone)
    return new Date(utcTimestamp)
  }

  private timeZoneOffsetMs(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      calendar: 'gregory',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
    return asUtc - date.getTime()
  }

  private formatDateInTimeZone(date: Date, timezone: string) {
    const parts = this.datePartsInTimeZone(date, timezone)
    return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`
  }

  private formatTimeInTimeZone(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
    return `${value('hour')}:${value('minute')}`
  }

  private validTimeZone(timezone?: string | null) {
    if (!timezone) return false
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
      return true
    } catch {
      return false
    }
  }

  private positiveInteger(value?: number | null) {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null
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
}
