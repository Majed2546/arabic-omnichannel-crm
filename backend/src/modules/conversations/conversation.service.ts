import { Injectable, NotFoundException } from '@nestjs/common'
import { ConversationPriority, ConversationStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { CreateConversationDto, ListConversationsQueryDto, UpdateConversationSummaryDto } from './dto'

type PrismaTx = Prisma.TransactionClient

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateConversationDto) {
    return this.prisma.conversation.create({
      data: {
        tenantId: dto.tenantId,
        channelId: dto.channelId,
        customerId: dto.customerId,
        assignedUserId: dto.assignedUserId,
        queueId: dto.queueId,
        status: dto.status ?? ConversationStatus.OPEN,
        priority: dto.priority ?? ConversationPriority.NORMAL,
        slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : undefined,
      },
      include: this.includeSummary(),
    })
  }

  async findById(tenantId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.includeSummary(),
    })
    if (!conversation) throw new NotFoundException('Conversation not found')
    return conversation
  }

  list(tenantId: string, query: ListConversationsQueryDto) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? query.limit ?? 25, 100)

    return this.prisma.conversation.findMany({
      where: { tenantId, deletedAt: null },
      include: this.includeSummary(),
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
  }

  updateSummary(tenantId: string, id: string, dto: UpdateConversationSummaryDto) {
    return this.prisma.conversation.update({
      where: { id, tenantId },
      data: {
        lastMessagePreview: dto.lastMessagePreview,
        lastMessageAt: dto.lastMessageAt ? new Date(dto.lastMessageAt) : undefined,
        unreadCount: dto.unreadCount,
        slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : undefined,
      },
    })
  }

  async findOrCreateForCustomer(input: {
    tenantId: string
    channelId: string
    customerId: string
    queueId?: string
  }, tx?: PrismaTx) {
    const client = tx ?? this.prisma
    const existing = await client.conversation.findFirst({
      where: {
        tenantId: input.tenantId,
        channelId: input.channelId,
        customerId: input.customerId,
        status: { notIn: [ConversationStatus.CLOSED, ConversationStatus.RESOLVED] },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) return existing

    return client.conversation.create({
      data: {
        tenantId: input.tenantId,
        channelId: input.channelId,
        customerId: input.customerId,
        queueId: input.queueId,
        status: ConversationStatus.OPEN,
        priority: ConversationPriority.NORMAL,
      },
    })
  }

  async findOrCreateCustomer(input: {
    tenantId: string
    name: string
    phone?: string
    email?: string
    metadata?: Prisma.InputJsonValue
  }, tx?: PrismaTx) {
    const client = tx ?? this.prisma
    const existing = input.phone
      ? await client.customer.findFirst({ where: { tenantId: input.tenantId, phone: input.phone, deletedAt: null } })
      : null

    if (existing) return existing

    return client.customer.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        metadata: input.metadata,
      },
    })
  }

  touchForMessage(input: {
    tenantId: string
    conversationId: string
    preview: string
    incrementUnread: boolean
    createdAt: Date
  }, tx: PrismaTx) {
    return tx.conversation.update({
      where: { id: input.conversationId, tenantId: input.tenantId },
      data: {
        lastMessagePreview: input.preview.slice(0, 280),
        lastMessageAt: input.createdAt,
        unreadCount: input.incrementUnread ? { increment: 1 } : undefined,
        updatedAt: input.createdAt,
      },
    })
  }

  updateSlaTimestamps(input: {
    tenantId: string
    conversationId: string
    slaDeadline?: Date
    slaWarnedAt?: Date
    slaBreachedAt?: Date
  }) {
    return this.prisma.conversation.update({
      where: { id: input.conversationId, tenantId: input.tenantId },
      data: {
        slaDeadline: input.slaDeadline,
        slaWarnedAt: input.slaWarnedAt,
        slaBreachedAt: input.slaBreachedAt,
      },
    })
  }

  private includeSummary() {
    return {
      channel: true,
      customer: true,
      assignedUser: true,
      queue: true,
      _count: { select: { messages: true, notifications: true } },
    } satisfies Prisma.ConversationInclude
  }
}
