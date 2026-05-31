import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, NotFoundException } from '@nestjs/common'
import { MessageSenderType, MessageStatus, MessageType, Prisma } from '@prisma/client'
import type { Queue } from 'bullmq'
import { PrismaService } from '../../database/prisma.service'
import { MESSAGE_QUEUE } from '../../events/queue.constants'
import { createQueueJobId } from '../../events/queue-job-id'
import { RealtimeService } from '../realtime/realtime.service'
import { ConversationService } from '../conversations/conversation.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { CreateMessageDto, ListMessagesQueryDto, UpdateMessageStatusDto } from './dto'

function asJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value as Prisma.InputJsonValue | undefined
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    @InjectQueue(MESSAGE_QUEUE) private readonly messageQueue: Queue,
  ) {}

  async create(dto: CreateMessageDto) {
    const createdAt = new Date()
    const message = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: { id: dto.conversationId, tenantId: dto.tenantId, deletedAt: null },
      })
      if (!conversation) throw new NotFoundException('Conversation not found')

      const saved = await tx.message.create({
        data: {
          tenantId: dto.tenantId,
          conversationId: dto.conversationId,
          channelId: dto.channelId,
          senderType: dto.senderType,
          senderId: dto.senderId,
          content: dto.content,
          messageType: dto.messageType,
          status: dto.status ?? MessageStatus.PENDING,
          externalMessageId: dto.externalMessageId,
          metadata: asJson(dto.metadata),
          createdAt,
        },
      })

      await this.conversations.touchForMessage({
        tenantId: dto.tenantId,
        conversationId: dto.conversationId,
        preview: dto.content,
        incrementUnread: dto.senderType === MessageSenderType.CUSTOMER,
        createdAt,
      }, tx)

      return saved
    })

    await this.messageQueue.add('message.persisted', { messageId: message.id, tenantId: message.tenantId }, {
      jobId: createQueueJobId('message', message.id, 'persisted'),
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
    })

    this.realtime.publishDomainEvent('message.created', message.tenantId, {
      id: message.id,
      conversationId: message.conversationId,
      channelId: message.channelId,
      senderType: message.senderType,
      content: message.content,
      messageType: message.messageType,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    }, 'queue')

    return message
  }

  async createIncomingWhatsApp(input: {
    tenantId: string
    channelId: string
    customerName?: string
    customerPhone: string
    content: string
    messageType: MessageType
    externalMessageId: string
    metadata?: Record<string, unknown>
  }) {
    const existing = await this.prisma.message.findFirst({
      where: {
        tenantId: input.tenantId,
        externalMessageId: input.externalMessageId,
        deletedAt: null,
      },
      include: { conversation: true },
    })
    if (existing) {
      return { conversation: existing.conversation, message: existing, duplicate: true }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await this.conversations.findOrCreateCustomer({
        tenantId: input.tenantId,
        name: input.customerName ?? input.customerPhone,
        phone: input.customerPhone,
        metadata: asJson(input.metadata),
      }, tx)
      const conversation = await this.conversations.findOrCreateForCustomer({
        tenantId: input.tenantId,
        channelId: input.channelId,
        customerId: customer.id,
      }, tx)
      const message = await tx.message.create({
        data: {
          tenantId: input.tenantId,
          conversationId: conversation.id,
          channelId: input.channelId,
          senderType: MessageSenderType.CUSTOMER,
          content: input.content,
          messageType: input.messageType,
          status: MessageStatus.DELIVERED,
          externalMessageId: input.externalMessageId,
          metadata: asJson(input.metadata),
        },
      })

      await this.conversations.touchForMessage({
        tenantId: input.tenantId,
        conversationId: conversation.id,
        preview: input.content,
        incrementUnread: true,
        createdAt: message.createdAt,
      }, tx)

      return { conversation, message, duplicate: false }
    })

    if (!result.duplicate) {
      this.realtime.publishDomainEvent('conversation.created', input.tenantId, {
        id: result.conversation.id,
        customerPhone: input.customerPhone,
        channelId: input.channelId,
      }, 'webhook')
      this.realtime.publishDomainEvent('message.created', input.tenantId, {
        id: result.message.id,
        conversationId: result.conversation.id,
        content: result.message.content,
        messageType: result.message.messageType,
        status: result.message.status,
      }, 'webhook')
      this.realtime.publishDomainEvent('notification.created', input.tenantId, {
        type: 'NEW_MESSAGE',
        conversationId: result.conversation.id,
        title: 'رسالة واتساب جديدة',
        body: result.message.content,
      }, 'webhook')
      await this.notifications.create({
        tenantId: input.tenantId,
        type: 'NEW_MESSAGE',
        title: 'رسالة جديدة',
        message: result.message.content,
        targetType: 'CONVERSATION',
        targetId: result.conversation.id,
        conversationId: result.conversation.id,
        priority: 'MEDIUM',
        metadata: {
          messageId: result.message.id,
          externalMessageId: input.externalMessageId,
          source: 'whatsapp',
        },
      })
    }

    return result
  }

  async updateStatus(id: string, dto: UpdateMessageStatusDto) {
    const message = await this.prisma.message.update({
      where: { id, tenantId: dto.tenantId },
      data: { status: dto.status },
    })

    this.realtime.publishDomainEvent(
      dto.status === MessageStatus.READ ? 'message.read' : 'message.updated',
      message.tenantId,
      {
        id: message.id,
        conversationId: message.conversationId,
        status: message.status,
      },
      'queue',
    )

    return message
  }

  async updateStatusByExternalId(input: {
    tenantId: string
    externalMessageId: string
    status: MessageStatus
  }) {
    const existing = await this.prisma.message.findFirst({
      where: {
        tenantId: input.tenantId,
        externalMessageId: input.externalMessageId,
        deletedAt: null,
      },
    })
    if (!existing) return null

    return this.updateStatus(existing.id, {
      tenantId: input.tenantId,
      status: input.status,
    })
  }

  async updateDelivery(input: {
    tenantId: string
    messageId: string
    status: MessageStatus
    externalMessageId?: string
    deliveryLog?: Record<string, unknown>
  }) {
    const message = await this.prisma.message.update({
      where: { id: input.messageId, tenantId: input.tenantId },
      data: {
        status: input.status,
        externalMessageId: input.externalMessageId,
        metadata: input.deliveryLog ? asJson({ delivery: input.deliveryLog }) : undefined,
      },
    })

    this.realtime.publishDomainEvent(
      input.status === MessageStatus.READ ? 'message.read' : 'message.updated',
      message.tenantId,
      {
        id: message.id,
        conversationId: message.conversationId,
        externalMessageId: message.externalMessageId,
        status: message.status,
      },
      'queue',
    )

    if (input.status === MessageStatus.FAILED) {
      await this.notifications.create({
        tenantId: input.tenantId,
        type: 'MESSAGE_SEND_FAILED',
        title: 'فشل إرسال رسالة',
        message: 'تعذر إرسال رسالة واتساب. راجع المحادثة وحاول مرة أخرى.',
        targetType: 'CONVERSATION',
        targetId: message.conversationId,
        conversationId: message.conversationId,
        priority: 'HIGH',
        metadata: {
          messageId: message.id,
          externalMessageId: message.externalMessageId,
          deliveryLog: input.deliveryLog,
        },
      })
    }

    return message
  }

  fetchConversationMessages(tenantId: string, conversationId: string, query: ListMessagesQueryDto) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? query.limit ?? 50, 100)

    return this.prisma.message.findMany({
      where: { tenantId, conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
  }

  async fetchUnreadCounts(tenantId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, unreadCount: true },
    })

    return conversations.reduce<Record<string, number>>((counts, conversation) => {
      counts[conversation.id] = conversation.unreadCount
      return counts
    }, {})
  }

  createOutgoing(input: Omit<CreateMessageDto, 'senderType' | 'status'>) {
    return this.create({
      ...input,
      senderType: MessageSenderType.AGENT,
      status: MessageStatus.PENDING,
    })
  }

  createSystemEvent(input: Omit<CreateMessageDto, 'senderType' | 'messageType' | 'status'>) {
    return this.create({
      ...input,
      senderType: MessageSenderType.SYSTEM,
      messageType: MessageType.SYSTEM,
      status: MessageStatus.SENT,
    })
  }

  createInternalNote(input: Omit<CreateMessageDto, 'senderType' | 'messageType' | 'status'>) {
    return this.create({
      ...input,
      senderType: MessageSenderType.AGENT,
      messageType: MessageType.INTERNAL_NOTE,
      status: MessageStatus.SENT,
    })
  }
}
