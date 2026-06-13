import { Injectable } from '@nestjs/common'
import { Prisma, TenantPlan } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { getBillingPlan } from '../billing/billing-plans'
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

  private monthRange(): Range {
    const from = new Date()
    from.setUTCDate(1)
    from.setUTCHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setUTCMonth(to.getUTCMonth() + 1)
    return { from, to }
  }

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

  async executiveSummary(scope: Scope) {
    const month = this.monthRange()
    const tenantId = scope.tenantId
    const [
      tenantRows,
      totalsRows,
      inboxRows,
      ticketRows,
      slaRows,
      automationRows,
      botRows,
      latestMessages,
      latestTickets,
      latestAppointments,
      latestNotifications,
      latestAutomationLogs,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.$queryRaw(Prisma.sql`
        SELECT id AS "tenantId", name AS "tenantName", plan::text AS plan, max_users AS "maxUsers",
          max_channels AS "maxChannels", monthly_conversation_limit AS "monthlyConversationLimit"
        FROM tenants
        WHERE id = ${tenantId} AND deleted_at IS NULL
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT
          (SELECT COUNT(*)::int FROM customers WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS customers,
          (SELECT COUNT(*)::int FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status NOT IN ('RESOLVED', 'CLOSED')) AS "activeConversations",
          (SELECT COALESCE(SUM(unread_count), 0)::int FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS "unreadMessages",
          (SELECT COUNT(*)::int FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status NOT IN ('RESOLVED', 'CLOSED')) AS "openTickets",
          (SELECT COUNT(*)::int FROM appointments WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status IN ('SCHEDULED', 'CONFIRMED') AND start_at >= CURRENT_TIMESTAMP) AS "upcomingAppointments",
          (SELECT COUNT(*)::int FROM notifications WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status = 'UNREAD') AS "unreadNotifications",
          (SELECT COUNT(*)::int FROM channels WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status = 'CONNECTED') AS "connectedChannels",
          (SELECT COUNT(*)::int FROM users WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS users,
          (SELECT COUNT(*)::int FROM channels WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS channels,
          (SELECT COUNT(*)::int FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= ${month.from} AND created_at < ${month.to}) AS "monthlyConversations",
          (SELECT COUNT(*)::int FROM messages WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= ${month.from} AND created_at < ${month.to}) AS "monthlyMessages"
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(unread_count), 0)::int AS unread,
          COUNT(*) FILTER (WHERE status IN ('OPEN', 'PENDING_AGENT', 'SLA_WARNING', 'SLA_BREACHED'))::int AS "pendingReply",
          COUNT(*) FILTER (WHERE status IN ('ASSIGNED'))::int AS "inProgress",
          (SELECT MAX(created_at) FROM messages WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sender_type = 'CUSTOMER') AS "lastInboundAt"
        FROM conversations
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS "inProgress",
          COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
          COUNT(*) FILTER (WHERE priority IN ('HIGH', 'URGENT'))::int AS "highPriority",
          COUNT(*) FILTER (WHERE sla_status = 'BREACHED')::int AS "slaBreached"
        FROM tickets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT
          (
            (SELECT COUNT(*) FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status IN ('ON_TRACK', 'PAUSED')) +
            (SELECT COUNT(*) FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status IN ('ON_TRACK', 'PAUSED'))
          )::int AS "onTrack",
          (
            (SELECT COUNT(*) FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'WARNING') +
            (SELECT COUNT(*) FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'WARNING')
          )::int AS warning,
          (
            (SELECT COUNT(*) FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'BREACHED') +
            (SELECT COUNT(*) FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'BREACHED')
          )::int AS breached,
          (
            (SELECT COUNT(*) FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'MET') +
            (SELECT COUNT(*) FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND sla_status = 'MET')
          )::int AS met
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(*) FILTER (WHERE is_active = true)::int AS "activeRules", MAX(updated_at) AS "lastRuleUpdatedAt"
        FROM automation_rules
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT
          (SELECT is_enabled FROM whatsapp_bot_settings WHERE tenant_id = ${tenantId} LIMIT 1) AS "isEnabled",
          (SELECT COUNT(*)::int FROM tickets WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND tags && ARRAY['وكيل آلي', 'whatsapp-bot', 'bot']::text[]) AS "createdTickets",
          (SELECT COUNT(*)::int FROM appointments WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND (description ILIKE '%وكيل واتساب%' OR title ILIKE '%وكيل واتساب%')) AS "createdAppointments"
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT id, content, sender_type::text AS "senderType", created_at AS "createdAt"
        FROM messages
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT id, title, status::text AS status, updated_at AS "updatedAt", created_at AS "createdAt"
        FROM tickets
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT id, title, status::text AS status, start_at AS "startAt", updated_at AS "updatedAt"
        FROM appointments
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY start_at DESC
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT id, title, created_at AS "createdAt"
        FROM notifications
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT l.id, COALESCE(r.name, l.trigger_type::text) AS title, l.status::text AS status, l.created_at AS "createdAt"
        FROM automation_logs l
        LEFT JOIN automation_rules r ON r.id = l.rule_id AND r.tenant_id = l.tenant_id
        WHERE l.tenant_id = ${tenantId}
        ORDER BY l.created_at DESC
        LIMIT 1
      `),
      this.prisma.$queryRaw(Prisma.sql`
        SELECT a.id, a.title, a.start_at AS "startAt", a.status::text AS status, a.meeting_type::text AS "meetingType",
          c.name AS "customerName", u.name AS "assignedUserName", tm.name AS "assignedTeamName"
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
        LEFT JOIN users u ON u.id = a.assigned_user_id AND u.tenant_id = a.tenant_id
        LEFT JOIN teams tm ON tm.id = a.assigned_team_id AND tm.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantId} AND a.deleted_at IS NULL AND a.status IN ('SCHEDULED', 'CONFIRMED') AND a.start_at >= CURRENT_TIMESTAMP
        ORDER BY a.start_at ASC
        LIMIT 3
      `),
    ]) as [
      Array<{ tenantId: string; tenantName: string; plan: string; maxUsers: number; maxChannels: number; monthlyConversationLimit: number }>,
      Array<Record<string, number>>,
      Array<Record<string, number | Date | null>>,
      Array<Record<string, number>>,
      Array<Record<string, number>>,
      Array<{ activeRules: number; lastRuleUpdatedAt: Date | null }>,
      Array<{ isEnabled: boolean | null; createdTickets: number; createdAppointments: number }>,
      unknown[],
      unknown[],
      unknown[],
      unknown[],
      unknown[],
      unknown[],
    ]

    const tenant = tenantRows[0]
    const plan = getBillingPlan((tenant?.plan ?? TenantPlan.STARTER) as TenantPlan)
    const totals = totalsRows[0] ?? {}
    const sla = slaRows[0] ?? { warning: 0, breached: 0 }
    const usagePercent = Math.max(
      this.percent(Number(totals.monthlyConversations ?? 0), Number(tenant?.monthlyConversationLimit ?? plan.monthlyConversationLimit)),
      this.percent(Number(totals.monthlyMessages ?? 0), plan.monthlyMessageLimit),
    )

    return {
      tenant,
      generatedAt: new Date().toISOString(),
      kpis: {
        customers: Number(totals.customers ?? 0),
        activeConversations: Number(totals.activeConversations ?? 0),
        unreadMessages: Number(totals.unreadMessages ?? 0),
        openTickets: Number(totals.openTickets ?? 0),
        upcomingAppointments: Number(totals.upcomingAppointments ?? 0),
        slaAlerts: Number((sla.warning ?? 0) as number) + Number((sla.breached ?? 0) as number),
        unreadNotifications: Number(totals.unreadNotifications ?? 0),
        connectedChannels: Number(totals.connectedChannels ?? 0),
      },
      inbox: inboxRows[0] ?? { total: 0, unread: 0, pendingReply: 0, inProgress: 0, lastInboundAt: null },
      tickets: ticketRows[0] ?? { open: 0, inProgress: 0, resolved: 0, highPriority: 0, slaBreached: 0 },
      appointments: upcomingAppointments,
      sla: slaRows[0] ?? { onTrack: 0, warning: 0, breached: 0, met: 0 },
      automation: {
        activeRules: automationRows[0]?.activeRules ?? 0,
        lastRun: (latestAutomationLogs[0] as object | undefined) ?? null,
        botEnabled: Boolean(botRows[0]?.isEnabled),
        botCreatedTickets: botRows[0]?.createdTickets ?? 0,
        botCreatedAppointments: botRows[0]?.createdAppointments ?? 0,
      },
      subscription: {
        plan: tenant?.plan ?? 'STARTER',
        users: Number(totals.users ?? 0),
        maxUsers: tenant?.maxUsers ?? plan.maxUsers,
        channels: Number(totals.channels ?? 0),
        maxChannels: tenant?.maxChannels ?? plan.maxChannels,
        monthlyConversations: Number(totals.monthlyConversations ?? 0),
        monthlyConversationLimit: tenant?.monthlyConversationLimit ?? plan.monthlyConversationLimit,
        monthlyMessages: Number(totals.monthlyMessages ?? 0),
        monthlyMessageLimit: plan.monthlyMessageLimit,
        usagePercent,
      },
      latestActivity: {
        message: latestMessages[0] ?? null,
        ticket: latestTickets[0] ?? null,
        appointment: latestAppointments[0] ?? null,
        notification: latestNotifications[0] ?? null,
        automation: latestAutomationLogs[0] ?? null,
      },
    }
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

  private percent(used: number, limit: number) {
    if (!limit || limit <= 0) return 0
    return Math.min(100, Math.round((used / limit) * 100))
  }
}
