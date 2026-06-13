import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { ReportsQueryDto } from './dto'

type Scope = {
  tenantId?: string
  isPlatform: boolean
}

type Range = {
  from: Date
  to: Date
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  getRange(query: ReportsQueryDto): Range {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const from = query.from ? new Date(query.from) : start
    const to = query.to ? new Date(query.to) : end
    if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) && !Number.isNaN(to.getTime())) {
      to.setDate(to.getDate() + 1)
    }
    return {
      from: Number.isNaN(from.getTime()) ? start : from,
      to: Number.isNaN(to.getTime()) ? end : to,
    }
  }

  async overview(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const [customers, conversations, messages, tickets, openTickets, resolvedTickets, appointments, upcomingAppointments, connectedChannels] = await Promise.all([
      this.count('customers', scope, range),
      this.count('conversations', scope, range),
      this.count('messages', scope, range),
      this.count('tickets', scope, range),
      this.count('tickets', scope, range, Prisma.sql`status IN ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER')`),
      this.count('tickets', scope, range, Prisma.sql`status IN ('RESOLVED', 'CLOSED')`),
      this.count('appointments', scope, range, undefined, 'start_at'),
      this.count('appointments', scope, { from: new Date(), to: range.to }, Prisma.sql`status IN ('SCHEDULED', 'CONFIRMED')`, 'start_at'),
      this.count('channels', scope, range, Prisma.sql`status = 'CONNECTED'`, 'created_at'),
    ])

    return {
      range: this.serializeRange(range),
      scope,
      totals: {
        customers,
        conversations,
        messages,
        tickets,
        openTickets,
        resolvedTickets,
        appointments,
        upcomingAppointments,
        connectedChannels,
      },
    }
  }

  async conversations(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const channelFilter = query.channelType ? Prisma.sql`AND ch.type::text = ${query.channelType}` : Prisma.empty
    const [byChannel, byStatus, unread, messages] = await Promise.all([
      this.prisma.$queryRaw(Prisma.sql`
        SELECT ch.type::text AS "key", COUNT(*)::int AS "count"
        FROM conversations c
        JOIN channels ch ON ch.id = c.channel_id
        WHERE ${this.scopeSql('c', scope)}
          AND c.deleted_at IS NULL
          AND c.created_at >= ${range.from}
          AND c.created_at < ${range.to}
          ${channelFilter}
        GROUP BY ch.type
        ORDER BY COUNT(*) DESC
      `),
      this.groupBy('conversations', 'status', scope, range),
      this.sumUnread(scope),
      this.count('messages', scope, range),
    ])
    return { range: this.serializeRange(range), byChannel, byStatus, unreadCount: unread, messagesCount: messages }
  }

  async customers(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const [total, newCustomers, tagged] = await Promise.all([
      this.count('customers', scope, range),
      this.count('customers', scope, range),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT unnest(tags)::text AS "key", COUNT(*)::int AS "count"
        FROM customers
        WHERE ${this.scopeSql(undefined, scope)}
          AND deleted_at IS NULL
          AND created_at >= ${range.from}
          AND created_at < ${range.to}
          AND cardinality(tags) > 0
        GROUP BY "key"
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `),
    ])
    return { range: this.serializeRange(range), total, newCustomers, tags: tagged }
  }

  async tickets(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const [byStatus, byPriority, byCategory] = await Promise.all([
      this.groupBy('tickets', 'status', scope, range),
      this.groupBy('tickets', 'priority', scope, range),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT COALESCE(category, 'غير مصنف') AS "key", COUNT(*)::int AS "count"
        FROM tickets
        WHERE ${this.scopeSql(undefined, scope)}
          AND deleted_at IS NULL
          AND created_at >= ${range.from}
          AND created_at < ${range.to}
        GROUP BY COALESCE(category, 'غير مصنف')
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `),
    ])
    return { range: this.serializeRange(range), byStatus, byPriority, byCategory }
  }

  async appointments(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const [byStatus, upcomingAppointments, noShowCount] = await Promise.all([
      this.groupBy('appointments', 'status', scope, range, 'start_at'),
      this.count('appointments', scope, { from: new Date(), to: range.to }, Prisma.sql`status IN ('SCHEDULED', 'CONFIRMED')`, 'start_at'),
      this.count('appointments', scope, range, Prisma.sql`status = 'NO_SHOW'`, 'start_at'),
    ])
    return { range: this.serializeRange(range), byStatus, upcomingAppointments, noShowCount }
  }

  async channels(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    const [byStatus, byType, connectedChannels, whatsappReady] = await Promise.all([
      this.groupBy('channels', 'status', scope, range, 'created_at'),
      this.groupBy('channels', 'type', scope, range, 'created_at'),
      this.count('channels', scope, range, Prisma.sql`status = 'CONNECTED'`, 'created_at'),
      this.count('channels', scope, range, Prisma.sql`type = 'WHATSAPP' AND status = 'CONNECTED'`, 'created_at'),
    ])
    return {
      range: this.serializeRange(range),
      byStatus,
      byType,
      connectedChannels,
      placeholderChannels: ['EMAIL', 'WEBCHAT', 'INSTAGRAM', 'TELEGRAM', 'SMS', 'VOICE'].map((type) => ({ type, status: 'PLACEHOLDER' })),
      whatsappReady: whatsappReady > 0,
    }
  }

  async usage(scope: Scope, query: ReportsQueryDto) {
    const range = this.getRange(query)
    if (scope.isPlatform && !scope.tenantId) {
      const tenants = await this.prisma.$queryRaw(Prisma.sql`
        SELECT
          t.id AS "tenantId",
          t.name AS "tenantName",
          t.plan::text AS plan,
          t.max_users AS "maxUsers",
          t.max_channels AS "maxChannels",
          t.monthly_conversation_limit AS "monthlyConversationLimit",
          COUNT(DISTINCT u.id)::int AS "usersCount",
          COUNT(DISTINCT ch.id)::int AS "channelsCount",
          COUNT(DISTINCT c.id)::int AS "monthlyConversationsCount",
          COUNT(DISTINCT m.id)::int AS "monthlyMessagesCount"
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id AND u.deleted_at IS NULL
        LEFT JOIN channels ch ON ch.tenant_id = t.id AND ch.deleted_at IS NULL
        LEFT JOIN conversations c ON c.tenant_id = t.id AND c.deleted_at IS NULL AND c.created_at >= ${range.from} AND c.created_at < ${range.to}
        LEFT JOIN messages m ON m.tenant_id = t.id AND m.deleted_at IS NULL AND m.created_at >= ${range.from} AND m.created_at < ${range.to}
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `)
      return { range: this.serializeRange(range), platform: true, tenants }
    }

    const tenantId = scope.tenantId
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT
        t.id AS "tenantId",
        t.name AS "tenantName",
        t.plan::text AS plan,
        t.max_users AS "maxUsers",
        t.max_channels AS "maxChannels",
        t.monthly_conversation_limit AS "monthlyConversationLimit",
        (SELECT COUNT(*)::int FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS "usersCount",
        (SELECT COUNT(*)::int FROM channels WHERE tenant_id = t.id AND deleted_at IS NULL) AS "channelsCount",
        (SELECT COUNT(*)::int FROM conversations WHERE tenant_id = t.id AND deleted_at IS NULL AND created_at >= ${range.from} AND created_at < ${range.to}) AS "monthlyConversationsCount",
        (SELECT COUNT(*)::int FROM messages WHERE tenant_id = t.id AND deleted_at IS NULL AND created_at >= ${range.from} AND created_at < ${range.to}) AS "monthlyMessagesCount"
      FROM tenants t
      WHERE t.id = ${tenantId} AND t.deleted_at IS NULL
      LIMIT 1
    `) as unknown[]
    return { range: this.serializeRange(range), platform: false, tenant: rows[0] ?? null }
  }

  private async count(table: string, scope: Scope, range: Range, extra?: Prisma.Sql, dateColumn = 'created_at') {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM ${Prisma.raw(table)}
      WHERE ${this.scopeSql(undefined, scope)}
        AND deleted_at IS NULL
        AND ${Prisma.raw(dateColumn)} >= ${range.from}
        AND ${Prisma.raw(dateColumn)} < ${range.to}
        ${extra ? Prisma.sql`AND ${extra}` : Prisma.empty}
    `) as Array<{ count: number }>
    return rows[0]?.count ?? 0
  }

  private groupBy(table: string, column: string, scope: Scope, range: Range, dateColumn = 'created_at') {
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${Prisma.raw(column)}::text AS "key", COUNT(*)::int AS "count"
      FROM ${Prisma.raw(table)}
      WHERE ${this.scopeSql(undefined, scope)}
        AND deleted_at IS NULL
        AND ${Prisma.raw(dateColumn)} >= ${range.from}
        AND ${Prisma.raw(dateColumn)} < ${range.to}
      GROUP BY ${Prisma.raw(column)}
      ORDER BY COUNT(*) DESC
    `)
  }

  private async sumUnread(scope: Scope) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT COALESCE(SUM(unread_count), 0)::int AS count
      FROM conversations
      WHERE ${this.scopeSql(undefined, scope)}
        AND deleted_at IS NULL
    `) as Array<{ count: number }>
    return rows[0]?.count ?? 0
  }

  private scopeSql(alias: string | undefined, scope: Scope) {
    if (scope.isPlatform && !scope.tenantId) return Prisma.sql`1 = 1`
    const prefix = alias ? Prisma.raw(`${alias}.`) : Prisma.empty
    return Prisma.sql`${prefix}tenant_id = ${scope.tenantId}`
  }

  private serializeRange(range: Range) {
    return { from: range.from.toISOString(), to: range.to.toISOString() }
  }
}
