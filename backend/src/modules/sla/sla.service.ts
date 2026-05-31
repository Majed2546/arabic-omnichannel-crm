import { Injectable } from '@nestjs/common'
import { NotificationPriority, Prisma, SlaStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { SlaItemsQueryDto } from './dto'

type SlaSettings = {
  firstResponseMinutes: number
  resolutionMinutes: number
  warningBeforeMinutes: number
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000)
}

function statusForDue(dueAt: Date | null | undefined, now: Date, warningBeforeMinutes: number) {
  if (!dueAt) return SlaStatus.ON_TRACK
  if (dueAt.getTime() <= now.getTime()) return SlaStatus.BREACHED
  if (dueAt.getTime() - now.getTime() <= warningBeforeMinutes * 60_000) return SlaStatus.WARNING
  return SlaStatus.ON_TRACK
}

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getSettings(tenantId: string): Promise<SlaSettings> {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } })
    const workingHours = settings?.workingHours && typeof settings.workingHours === 'object' && !Array.isArray(settings.workingHours)
      ? settings.workingHours as Record<string, unknown>
      : {}

    return {
      firstResponseMinutes: settings?.slaFirstResponseMinutes ?? 15,
      resolutionMinutes: settings?.slaResolutionMinutes ?? 240,
      warningBeforeMinutes: Number(workingHours.slaWarningBeforeMinutes ?? 10),
    }
  }

  async ensureConversationSla(tenantId: string, conversationId: string, createdAt = new Date()) {
    const settings = await this.getSettings(tenantId)
    const firstResponseDueAt = addMinutes(createdAt, settings.firstResponseMinutes)
    const resolutionDueAt = addMinutes(createdAt, settings.resolutionMinutes)

    await this.prisma.conversation.updateMany({
      where: {
        id: conversationId,
        tenantId,
        deletedAt: null,
        firstRespondedAt: null,
        firstResponseDueAt: null,
      },
      data: {
        firstResponseDueAt,
        resolutionDueAt,
        slaDeadline: firstResponseDueAt,
        slaStatus: statusForDue(firstResponseDueAt, new Date(), settings.warningBeforeMinutes),
      },
    })
  }

  async markConversationFirstResponse(tenantId: string, conversationId: string, respondedAt = new Date()) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, deletedAt: null },
      select: { firstRespondedAt: true, firstResponseDueAt: true },
    })
    if (!conversation || conversation.firstRespondedAt) return

    await this.prisma.conversation.update({
      where: { id: conversationId, tenantId },
      data: {
        firstRespondedAt: respondedAt,
        slaStatus: conversation.firstResponseDueAt && respondedAt.getTime() > conversation.firstResponseDueAt.getTime()
          ? SlaStatus.BREACHED
          : SlaStatus.MET,
      },
    })
  }

  async resolutionDueForTicket(tenantId: string, createdAt = new Date()) {
    const settings = await this.getSettings(tenantId)
    return addMinutes(createdAt, settings.resolutionMinutes)
  }

  ticketStatusForResolution(status: string, resolutionDueAt?: Date | null, resolvedAt = new Date()) {
    if (status !== 'RESOLVED' && status !== 'CLOSED') return undefined
    return resolutionDueAt && resolvedAt.getTime() > resolutionDueAt.getTime() ? SlaStatus.BREACHED : SlaStatus.MET
  }

  async recalculate(tenantId: string) {
    const settings = await this.getSettings(tenantId)
    const now = new Date()
    const conversations = await this.prisma.conversation.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, firstResponseDueAt: true, resolutionDueAt: true, firstRespondedAt: true, status: true, createdAt: true },
      take: 1000,
    })
    const tickets = await this.prisma.ticket.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, resolutionDueAt: true, status: true, createdAt: true, resolvedAt: true },
      take: 1000,
    })

    for (const conversation of conversations) {
      const dueAt = conversation.firstRespondedAt ? conversation.resolutionDueAt : conversation.firstResponseDueAt ?? conversation.createdAt
      const isClosed = conversation.status === 'RESOLVED' || conversation.status === 'CLOSED'
      await this.prisma.conversation.update({
        where: { id: conversation.id, tenantId },
        data: {
          firstResponseDueAt: conversation.firstResponseDueAt ?? addMinutes(conversation.createdAt, settings.firstResponseMinutes),
          resolutionDueAt: conversation.resolutionDueAt ?? addMinutes(conversation.createdAt, settings.resolutionMinutes),
          slaDeadline: conversation.firstResponseDueAt ?? addMinutes(conversation.createdAt, settings.firstResponseMinutes),
          slaStatus: isClosed ? SlaStatus.MET : statusForDue(dueAt, now, settings.warningBeforeMinutes),
        },
      })
    }

    for (const ticket of tickets) {
      const dueAt = ticket.resolutionDueAt ?? addMinutes(ticket.createdAt, settings.resolutionMinutes)
      const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
      await this.prisma.ticket.update({
        where: { id: ticket.id, tenantId },
        data: {
          resolutionDueAt: dueAt,
          dueAt: ticket.resolutionDueAt ? undefined : dueAt,
          slaStatus: isClosed
            ? this.ticketStatusForResolution(ticket.status, dueAt, ticket.resolvedAt ?? now)
            : statusForDue(dueAt, now, settings.warningBeforeMinutes),
        },
      })
    }

    return { conversations: conversations.length, tickets: tickets.length }
  }

  async overview(tenantId: string) {
    await this.recalculate(tenantId)
    const [conversationGroups, ticketGroups] = await Promise.all([
      this.prisma.conversation.groupBy({ by: ['slaStatus'], where: { tenantId, deletedAt: null }, _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['slaStatus'], where: { tenantId, deletedAt: null }, _count: { _all: true } }),
    ])

    const overview = { onTrack: 0, warning: 0, breached: 0, met: 0, paused: 0, averageFirstResponseMinutes: 0, averageResolutionMinutes: 0 }
    for (const group of [...conversationGroups, ...ticketGroups]) {
      if (group.slaStatus === SlaStatus.ON_TRACK) overview.onTrack += group._count._all
      if (group.slaStatus === SlaStatus.WARNING) overview.warning += group._count._all
      if (group.slaStatus === SlaStatus.BREACHED) overview.breached += group._count._all
      if (group.slaStatus === SlaStatus.MET) overview.met += group._count._all
      if (group.slaStatus === SlaStatus.PAUSED) overview.paused += group._count._all
    }
    return overview
  }

  async items(tenantId: string, query: SlaItemsQueryDto) {
    await this.recalculate(tenantId)
    const conditions = {
      status: query.status ? query.status as SlaStatus : undefined,
      assignedUserId: query.assignedUserId || undefined,
      assignedTeamId: query.assignedTeamId || undefined,
    }

    const includeConversations = !query.type || query.type === 'all' || query.type === 'conversation'
    const includeTickets = !query.type || query.type === 'all' || query.type === 'ticket'
    const items = []

    if (includeConversations) {
      const conversations = await this.prisma.conversation.findMany({
        where: { tenantId, deletedAt: null, slaStatus: conditions.status, assignedUserId: conditions.assignedUserId, assignedTeamId: conditions.assignedTeamId },
        include: { customer: true, assignedUser: true, assignedTeam: true },
        orderBy: [{ slaStatus: 'asc' }, { firstResponseDueAt: 'asc' }],
        take: 250,
      })
      items.push(...conversations.map((conversation) => ({
        type: 'conversation',
        id: conversation.id,
        customer: conversation.customer.name || conversation.customer.phone || 'عميل',
        dueAt: (conversation.firstRespondedAt ? conversation.resolutionDueAt : conversation.firstResponseDueAt)?.toISOString() ?? null,
        status: conversation.slaStatus,
        assignedUser: conversation.assignedUser?.name ?? null,
        assignedTeam: conversation.assignedTeam?.name ?? null,
        assignedUserId: conversation.assignedUserId,
        assignedTeamId: conversation.assignedTeamId,
        priority: conversation.priority,
      })))
    }

    if (includeTickets) {
      const tickets = await this.prisma.ticket.findMany({
        where: { tenantId, deletedAt: null, slaStatus: conditions.status, assignedUserId: conditions.assignedUserId, assignedTeamId: conditions.assignedTeamId },
        include: { customer: true, assignedUser: true, assignedTeam: true },
        orderBy: [{ slaStatus: 'asc' }, { resolutionDueAt: 'asc' }],
        take: 250,
      })
      items.push(...tickets.map((ticket) => ({
        type: 'ticket',
        id: ticket.id,
        customer: ticket.customer?.name || ticket.customer?.phone || ticket.title,
        dueAt: ticket.resolutionDueAt?.toISOString() ?? ticket.dueAt?.toISOString() ?? null,
        status: ticket.slaStatus,
        assignedUser: ticket.assignedUser?.name ?? null,
        assignedTeam: ticket.assignedTeam?.name ?? null,
        assignedUserId: ticket.assignedUserId,
        assignedTeamId: ticket.assignedTeamId,
        priority: ticket.priority,
      })))
    }

    return items
  }

  async checkEscalations(tenantId: string) {
    await this.recalculate(tenantId)
    const items = await this.items(tenantId, { status: undefined, type: 'all' })
    const actionable = items.filter((item) => item.status === SlaStatus.WARNING || item.status === SlaStatus.BREACHED)
    let created = 0

    for (const item of actionable) {
      const type = item.status === SlaStatus.BREACHED ? 'SLA_BREACHED' : 'SLA_WARNING'
      const leadId = item.assignedTeamId ? await this.findTeamLead(tenantId, item.assignedTeamId) : null
      await this.notifications.create({
        tenantId,
        userId: leadId ?? item.assignedUserId ?? undefined,
        teamId: leadId ? undefined : item.assignedTeamId ?? undefined,
        type,
        title: item.status === SlaStatus.BREACHED ? 'تجاوز SLA' : 'تحذير SLA',
        message: `${item.type === 'ticket' ? 'تذكرة' : 'محادثة'} ${item.customer} تحتاج متابعة.`,
        targetType: item.type === 'ticket' ? 'TICKET' : 'CONVERSATION',
        targetId: item.id,
        priority: item.status === SlaStatus.BREACHED ? NotificationPriority.URGENT : NotificationPriority.HIGH,
        metadata: { slaStatus: item.status, dueAt: item.dueAt, assignedTeamId: item.assignedTeamId },
      })
      created += 1
    }

    return { checked: items.length, escalations: actionable.length, notificationsAttempted: created }
  }

  private async findTeamLead(tenantId: string, teamId: string) {
    const lead = await this.prisma.teamMember.findFirst({
      where: { tenantId, teamId, role: 'LEAD' },
      select: { userId: true },
    })
    return lead?.userId ?? null
  }
}
