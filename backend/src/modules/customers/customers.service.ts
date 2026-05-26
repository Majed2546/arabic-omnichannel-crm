import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma, TenantPlan, TenantStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { DEFAULT_TENANT_ID } from '../../common/tenant-access.service'
import type { AuthMode } from '../auth/auth.types'
import type { CreateCustomerDto, ListCustomersQueryDto, UpdateCustomerDto } from './dto'

type CustomerMetadata = {
  status?: string
  sourceChannel?: string
  notes?: string
  lastActivityAt?: string
} & Record<string, unknown>

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(tenantId: string, query: ListCustomersQueryDto) {
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? query.limit ?? 50, 100)
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { phone: { contains: query.search.trim(), mode: 'insensitive' } },
              { email: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: this.includeSummary(),
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return customers
      .map((customer) => this.toCustomerDto(customer))
      .filter((customer) => !query.status || customer.status === query.status)
      .filter((customer) => !query.sourceChannel || customer.sourceChannel === query.sourceChannel)
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.includeDetails(),
    })
    if (!customer) throw new NotFoundException('Customer not found')
    return this.toCustomerDto(customer)
  }

  async listConversations(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')

    const conversations = await this.prisma.conversation.findMany({
      where: { tenantId, customerId, deletedAt: null },
      include: { channel: true },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })

    return conversations.map((conversation) => ({
      id: conversation.id,
      channel: conversation.channel.type,
      channelName: conversation.channel.name,
      status: conversation.status,
      priority: conversation.priority,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      lastActivityDate: (conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt).toISOString(),
      unreadCount: conversation.unreadCount,
      createdAt: conversation.createdAt,
    }))
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const resolvedTenantId = await this.ensureTenantForCreate(tenantId)
    const normalizedPhone = this.blankToNull(dto.phone)
    const existingByPhone = normalizedPhone
      ? await this.prisma.customer.findFirst({
          where: { tenantId: resolvedTenantId, phone: normalizedPhone, deletedAt: null },
          include: this.includeDetails(),
        })
      : null

    if (existingByPhone) return this.toCustomerDto(existingByPhone)

    const customer = await this.prisma.customer.create({
      data: {
        tenantId: resolvedTenantId,
        name: dto.name.trim(),
        phone: normalizedPhone,
        email: this.blankToNull(dto.email),
        tags: this.normalizeTags(dto.tags),
        metadata: this.toMetadata(dto),
      },
      include: this.includeDetails(),
    })

    return this.toCustomerDto(customer)
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, metadata: true },
    })
    if (!existing) throw new NotFoundException('Customer not found')

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        phone: dto.phone === undefined ? undefined : this.blankToNull(dto.phone),
        email: dto.email === undefined ? undefined : this.blankToNull(dto.email),
        tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
        metadata: this.toMetadata(dto, this.readMetadata(existing.metadata)),
      },
      include: this.includeDetails(),
    })

    return this.toCustomerDto(customer)
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('Customer not found')

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return { deleted: true, id }
  }

  private includeSummary() {
    return {
      conversations: {
        where: { deletedAt: null },
        include: { channel: true, queue: true },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take: 3,
      },
      _count: { select: { conversations: true } },
    } satisfies Prisma.CustomerInclude
  }

  private includeDetails() {
    return {
      conversations: {
        where: { deletedAt: null },
        include: { channel: true, queue: true },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      },
      _count: { select: { conversations: true } },
    } satisfies Prisma.CustomerInclude
  }

  private toCustomerDto(customer: Prisma.CustomerGetPayload<{ include: ReturnType<CustomersService['includeDetails']> }>) {
    const metadata = this.readMetadata(customer.metadata)
    const lastConversation = customer.conversations[0]
    const derivedLastActivityAt =
      metadata.lastActivityAt ??
      lastConversation?.lastMessageAt?.toISOString() ??
      lastConversation?.updatedAt?.toISOString() ??
      customer.updatedAt.toISOString()

    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      status: metadata.status ?? 'ACTIVE',
      tags: customer.tags,
      sourceChannel: metadata.sourceChannel ?? lastConversation?.channel?.type ?? null,
      notes: metadata.notes ?? '',
      lastActivityAt: derivedLastActivityAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      conversationsCount: customer._count.conversations,
      conversations: customer.conversations.map((conversation) => ({
        id: conversation.id,
        status: conversation.status,
        priority: conversation.priority,
        channelType: conversation.channel?.type ?? null,
        channelName: conversation.channel?.name ?? null,
        queueName: 'queue' in conversation ? conversation.queue?.name ?? null : null,
        lastMessagePreview: conversation.lastMessagePreview,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
        createdAt: conversation.createdAt,
      })),
    }
  }

  private readMetadata(value: Prisma.JsonValue | null | undefined): CustomerMetadata {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as CustomerMetadata
  }

  private toMetadata(dto: CreateCustomerDto | UpdateCustomerDto, existing: CustomerMetadata = {}) {
    return {
      ...existing,
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.sourceChannel !== undefined ? { sourceChannel: dto.sourceChannel } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
      ...(dto.lastActivityAt !== undefined ? { lastActivityAt: dto.lastActivityAt } : {}),
    } satisfies Prisma.InputJsonObject
  }

  private normalizeTags(tags: string[] | undefined) {
    return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 20)
  }

  private blankToNull(value?: string) {
    const normalized = value?.trim()
    return normalized || null
  }

  private async ensureTenantForCreate(tenantId?: string) {
    const resolvedTenantId = tenantId || DEFAULT_TENANT_ID
    const authMode = this.config.get<AuthMode>('auth.mode') ?? 'local'

    if (authMode !== 'keycloak' && resolvedTenantId === DEFAULT_TENANT_ID) {
      await this.prisma.tenant.upsert({
        where: { id: DEFAULT_TENANT_ID },
        create: {
          id: DEFAULT_TENANT_ID,
          name: 'Default Tenant',
          slug: 'default',
          status: TenantStatus.ACTIVE,
          plan: TenantPlan.ENTERPRISE,
          maxUsers: 50,
          maxChannels: 10,
          monthlyConversationLimit: 50000,
          createdBy: 'local-dev',
          updatedBy: 'local-dev',
        },
        update: {
          name: 'Default Tenant',
          slug: 'default',
          status: TenantStatus.ACTIVE,
          plan: TenantPlan.ENTERPRISE,
          maxUsers: 50,
          maxChannels: 10,
          monthlyConversationLimit: 50000,
          updatedBy: 'local-dev',
          deletedAt: null,
        },
      })
      return resolvedTenantId
    }

    const existing = await this.prisma.tenant.findFirst({
      where: { id: resolvedTenantId, deletedAt: null },
      select: { id: true },
    })
    if (!existing) throw new BadRequestException(`Tenant not found: ${resolvedTenantId}`)

    return resolvedTenantId
  }
}
