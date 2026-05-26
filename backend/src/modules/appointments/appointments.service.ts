import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { ListAppointmentsQueryDto, SaveAppointmentDto } from './dto'

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function blankToNull(value?: string) {
  const normalized = value?.trim()
  return normalized || null
}

function appointmentSelectSql() {
  return Prisma.sql`
    a.id,
    a.tenant_id AS "tenantId",
    a.customer_id AS "customerId",
    a.conversation_id AS "conversationId",
    a.assigned_user_id AS "assignedUserId",
    a.title,
    a.description,
    a.start_at AS "startAt",
    a.end_at AS "endAt",
    a.status,
    a.meeting_type AS "meetingType",
    a.meeting_link AS "meetingLink",
    a.location,
    a.notes,
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    c.name AS "customerName",
    c.phone AS "customerPhone",
    c.email AS "customerEmail",
    u.name AS "assignedUserName"
    ,
    m.id AS "visualMeetingId",
    m.provider AS "meetingProvider",
    m.meeting_link AS "visualMeetingLink",
    m.status AS "meetingStatus"
  `
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListAppointmentsQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`a.tenant_id = ${tenantId}`, Prisma.sql`a.deleted_at IS NULL`]
    if (query.status) conditions.push(Prisma.sql`a.status = ${query.status}::"AppointmentStatus"`)
    if (query.customerId) conditions.push(Prisma.sql`a.customer_id = ${query.customerId}`)
    if (query.assignedUserId) conditions.push(Prisma.sql`a.assigned_user_id = ${query.assignedUserId}`)
    if (query.date) {
      const start = new Date(query.date)
      if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid date')
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      conditions.push(Prisma.sql`a.start_at >= ${start} AND a.start_at < ${end}`)
    }

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${appointmentSelectSql()}
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      LEFT JOIN users u ON u.id = a.assigned_user_id AND u.tenant_id = a.tenant_id
      LEFT JOIN meetings m ON m.appointment_id = a.id AND m.tenant_id = a.tenant_id AND m.deleted_at IS NULL
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY a.start_at ASC
      LIMIT 300
    `)
  }

  async findById(tenantId: string, id: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT ${appointmentSelectSql()}
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      LEFT JOIN users u ON u.id = a.assigned_user_id AND u.tenant_id = a.tenant_id
      LEFT JOIN meetings m ON m.appointment_id = a.id AND m.tenant_id = a.tenant_id AND m.deleted_at IS NULL
      WHERE a.id = ${id} AND a.tenant_id = ${tenantId} AND a.deleted_at IS NULL
      LIMIT 1
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Appointment not found')
    return rows[0]
  }

  async create(tenantId: string, dto: SaveAppointmentDto) {
    const { startAt, endAt } = this.validateTimeRange(dto.startAt, dto.endAt)
    await this.validateReferences(tenantId, dto)

    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO appointments (
        id, tenant_id, customer_id, conversation_id, assigned_user_id, title, description,
        start_at, end_at, status, meeting_type, meeting_link, location, notes, updated_at
      )
      VALUES (
        ${cuid('appt')},
        ${tenantId},
        ${dto.customerId},
        ${blankToNull(dto.conversationId)},
        ${blankToNull(dto.assignedUserId)},
        ${dto.title.trim()},
        ${blankToNull(dto.description)},
        ${startAt},
        ${endAt},
        ${dto.status ?? 'SCHEDULED'}::"AppointmentStatus",
        ${dto.meetingType}::"AppointmentMeetingType",
        ${blankToNull(dto.meetingLink)},
        ${blankToNull(dto.location)},
        ${blankToNull(dto.notes)},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `) as Array<{ id: string }>

    return this.findById(tenantId, rows[0].id)
  }

  async update(tenantId: string, id: string, dto: SaveAppointmentDto) {
    await this.findById(tenantId, id)
    const { startAt, endAt } = this.validateTimeRange(dto.startAt, dto.endAt)
    await this.validateReferences(tenantId, dto)

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE appointments
      SET
        customer_id = ${dto.customerId},
        conversation_id = ${blankToNull(dto.conversationId)},
        assigned_user_id = ${blankToNull(dto.assignedUserId)},
        title = ${dto.title.trim()},
        description = ${blankToNull(dto.description)},
        start_at = ${startAt},
        end_at = ${endAt},
        status = ${dto.status ?? 'SCHEDULED'}::"AppointmentStatus",
        meeting_type = ${dto.meetingType}::"AppointmentMeetingType",
        meeting_link = ${blankToNull(dto.meetingLink)},
        location = ${blankToNull(dto.location)},
        notes = ${blankToNull(dto.notes)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)

    return this.findById(tenantId, id)
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE appointments
      SET status = ${status}::"AppointmentStatus", updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return this.findById(tenantId, id)
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE appointments
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return { deleted: true, id }
  }

  private validateTimeRange(startValue: string, endValue: string) {
    const startAt = new Date(startValue)
    const endAt = new Date(endValue)
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid appointment time')
    }
    if (startAt >= endAt) throw new BadRequestException('startAt must be before endAt')
    return { startAt, endAt }
  }

  private async validateReferences(tenantId: string, dto: SaveAppointmentDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!customer) throw new BadRequestException('Customer does not belong to current tenant')

    if (dto.conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, tenantId, customerId: dto.customerId, deletedAt: null },
        select: { id: true },
      })
      if (!conversation) throw new BadRequestException('Conversation does not belong to the selected customer and tenant')
    }

    if (dto.assignedUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.assignedUserId, tenantId, deletedAt: null },
        select: { id: true },
      })
      if (!user) throw new BadRequestException('Assigned user does not belong to current tenant')
    }
  }
}
