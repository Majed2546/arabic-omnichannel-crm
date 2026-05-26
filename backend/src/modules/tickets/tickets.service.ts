import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { ListTicketsQueryDto, SaveTicketDto } from './dto'

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function blankToNull(value?: string) {
  const normalized = value?.trim()
  return normalized || null
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 20)
}

function ticketSelectSql() {
  return Prisma.sql`
    t.id,
    t.tenant_id AS "tenantId",
    t.customer_id AS "customerId",
    t.conversation_id AS "conversationId",
    t.assigned_user_id AS "assignedUserId",
    t.title,
    t.description,
    t.status,
    t.priority,
    t.category,
    t.tags,
    t.due_at AS "dueAt",
    t.created_at AS "createdAt",
    t.updated_at AS "updatedAt",
    c.name AS "customerName",
    c.phone AS "customerPhone",
    c.email AS "customerEmail",
    cv.last_message_preview AS "conversationPreview",
    cv.status AS "conversationStatus",
    u.name AS "assignedUserName"
  `
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: ListTicketsQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`t.tenant_id = ${tenantId}`, Prisma.sql`t.deleted_at IS NULL`]
    if (query.status) conditions.push(Prisma.sql`t.status = ${query.status}::"TicketStatus"`)
    if (query.priority) conditions.push(Prisma.sql`t.priority = ${query.priority}::"TicketPriority"`)
    if (query.category?.trim()) conditions.push(Prisma.sql`t.category = ${query.category.trim()}`)
    if (query.assignedUserId) conditions.push(Prisma.sql`t.assigned_user_id = ${query.assignedUserId}`)
    if (query.customerId) conditions.push(Prisma.sql`t.customer_id = ${query.customerId}`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${ticketSelectSql()}
      FROM tickets t
      LEFT JOIN customers c ON c.id = t.customer_id AND c.tenant_id = t.tenant_id
      LEFT JOIN conversations cv ON cv.id = t.conversation_id AND cv.tenant_id = t.tenant_id
      LEFT JOIN users u ON u.id = t.assigned_user_id AND u.tenant_id = t.tenant_id
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY t.updated_at DESC, t.created_at DESC
      LIMIT 300
    `)
  }

  async findById(tenantId: string, id: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT ${ticketSelectSql()}
      FROM tickets t
      LEFT JOIN customers c ON c.id = t.customer_id AND c.tenant_id = t.tenant_id
      LEFT JOIN conversations cv ON cv.id = t.conversation_id AND cv.tenant_id = t.tenant_id
      LEFT JOIN users u ON u.id = t.assigned_user_id AND u.tenant_id = t.tenant_id
      WHERE t.id = ${id} AND t.tenant_id = ${tenantId} AND t.deleted_at IS NULL
      LIMIT 1
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Ticket not found')
    return rows[0]
  }

  async create(tenantId: string, dto: SaveTicketDto) {
    await this.validateReferences(tenantId, dto)
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('Invalid dueAt')

    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO tickets (
        id, tenant_id, customer_id, conversation_id, assigned_user_id, title, description,
        status, priority, category, tags, due_at, updated_at
      )
      VALUES (
        ${cuid('ticket')},
        ${tenantId},
        ${blankToNull(dto.customerId)},
        ${blankToNull(dto.conversationId)},
        ${blankToNull(dto.assignedUserId)},
        ${dto.title.trim()},
        ${blankToNull(dto.description)},
        ${dto.status ?? 'OPEN'}::"TicketStatus",
        ${dto.priority ?? 'MEDIUM'}::"TicketPriority",
        ${blankToNull(dto.category)},
        ${normalizeTags(dto.tags)},
        ${dueAt},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `) as Array<{ id: string }>

    return this.findById(tenantId, rows[0].id)
  }

  async update(tenantId: string, id: string, dto: SaveTicketDto) {
    await this.findById(tenantId, id)
    await this.validateReferences(tenantId, dto)
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('Invalid dueAt')

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE tickets
      SET
        customer_id = ${blankToNull(dto.customerId)},
        conversation_id = ${blankToNull(dto.conversationId)},
        assigned_user_id = ${blankToNull(dto.assignedUserId)},
        title = ${dto.title.trim()},
        description = ${blankToNull(dto.description)},
        status = ${dto.status ?? 'OPEN'}::"TicketStatus",
        priority = ${dto.priority ?? 'MEDIUM'}::"TicketPriority",
        category = ${blankToNull(dto.category)},
        tags = ${normalizeTags(dto.tags)},
        due_at = ${dueAt},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)

    return this.findById(tenantId, id)
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE tickets
      SET status = ${status}::"TicketStatus", updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return this.findById(tenantId, id)
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE tickets
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return { deleted: true, id }
  }

  private async validateReferences(tenantId: string, dto: SaveTicketDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId, deletedAt: null }, select: { id: true } })
      if (!customer) throw new BadRequestException('Customer does not belong to current tenant')
    }

    if (dto.conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: dto.conversationId,
          tenantId,
          deletedAt: null,
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
        },
        select: { id: true },
      })
      if (!conversation) throw new BadRequestException('Conversation does not belong to current tenant')
    }

    if (dto.assignedUserId) {
      const user = await this.prisma.user.findFirst({ where: { id: dto.assignedUserId, tenantId, deletedAt: null }, select: { id: true } })
      if (!user) throw new BadRequestException('Assigned user does not belong to current tenant')
    }
  }
}
