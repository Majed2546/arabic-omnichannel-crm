import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { ListMeetingsQueryDto, SaveMeetingDto } from './dto'

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function blankToNull(value?: string) {
  const normalized = value?.trim()
  return normalized || null
}

function meetingSelectSql() {
  return Prisma.sql`
    m.id,
    m.tenant_id AS "tenantId",
    m.appointment_id AS "appointmentId",
    m.customer_id AS "customerId",
    m.conversation_id AS "conversationId",
    m.provider,
    m.meeting_link AS "meetingLink",
    m.meeting_id AS "meetingId",
    m.status,
    m.notes,
    m.created_at AS "createdAt",
    m.updated_at AS "updatedAt",
    a.title AS "appointmentTitle",
    a.start_at AS "appointmentStartAt",
    a.end_at AS "appointmentEndAt",
    c.name AS "customerName",
    c.phone AS "customerPhone",
    c.email AS "customerEmail"
  `
}

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListMeetingsQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`m.tenant_id = ${tenantId}`, Prisma.sql`m.deleted_at IS NULL`]
    if (query.provider) conditions.push(Prisma.sql`m.provider = ${query.provider}::"MeetingProvider"`)
    if (query.status) conditions.push(Prisma.sql`m.status = ${query.status}::"MeetingStatus"`)
    if (query.customerId) conditions.push(Prisma.sql`m.customer_id = ${query.customerId}`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${meetingSelectSql()}
      FROM meetings m
      JOIN appointments a ON a.id = m.appointment_id AND a.tenant_id = m.tenant_id
      JOIN customers c ON c.id = m.customer_id AND c.tenant_id = m.tenant_id
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY a.start_at ASC, m.updated_at DESC
      LIMIT 300
    `)
  }

  async findById(tenantId: string, id: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT ${meetingSelectSql()}
      FROM meetings m
      JOIN appointments a ON a.id = m.appointment_id AND a.tenant_id = m.tenant_id
      JOIN customers c ON c.id = m.customer_id AND c.tenant_id = m.tenant_id
      WHERE m.id = ${id} AND m.tenant_id = ${tenantId} AND m.deleted_at IS NULL
      LIMIT 1
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Meeting not found')
    return rows[0]
  }

  async create(tenantId: string, dto: SaveMeetingDto) {
    const appointment = await this.validateAppointment(tenantId, dto.appointmentId)
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO meetings (
        id, tenant_id, appointment_id, customer_id, conversation_id, provider,
        meeting_link, meeting_id, status, notes, updated_at
      )
      VALUES (
        ${cuid('meet')},
        ${tenantId},
        ${dto.appointmentId},
        ${appointment.customerId},
        ${appointment.conversationId},
        ${dto.provider}::"MeetingProvider",
        ${dto.meetingLink.trim()},
        ${blankToNull(dto.meetingId)},
        ${dto.status ?? 'LINK_ADDED'}::"MeetingStatus",
        ${blankToNull(dto.notes)},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (appointment_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        meeting_link = EXCLUDED.meeting_link,
        meeting_id = EXCLUDED.meeting_id,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `) as Array<{ id: string }>

    return this.findById(tenantId, rows[0].id)
  }

  async update(tenantId: string, id: string, dto: SaveMeetingDto) {
    await this.findById(tenantId, id)
    const appointment = await this.validateAppointment(tenantId, dto.appointmentId)

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE meetings
      SET
        appointment_id = ${dto.appointmentId},
        customer_id = ${appointment.customerId},
        conversation_id = ${appointment.conversationId},
        provider = ${dto.provider}::"MeetingProvider",
        meeting_link = ${dto.meetingLink.trim()},
        meeting_id = ${blankToNull(dto.meetingId)},
        status = ${dto.status ?? 'LINK_ADDED'}::"MeetingStatus",
        notes = ${blankToNull(dto.notes)},
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `)

    return this.findById(tenantId, id)
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE meetings
      SET status = ${status}::"MeetingStatus", updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return this.findById(tenantId, id)
  }

  private async validateAppointment(tenantId: string, appointmentId: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT
        a.id,
        a.customer_id AS "customerId",
        a.conversation_id AS "conversationId"
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id AND c.deleted_at IS NULL
      LEFT JOIN conversations cv ON cv.id = a.conversation_id AND cv.tenant_id = a.tenant_id AND cv.deleted_at IS NULL
      WHERE a.id = ${appointmentId} AND a.tenant_id = ${tenantId} AND a.deleted_at IS NULL
      LIMIT 1
    `) as Array<{ id: string; customerId: string; conversationId?: string | null }>

    if (!rows.length) throw new BadRequestException('Appointment does not belong to current tenant')
    return rows[0]
  }
}
