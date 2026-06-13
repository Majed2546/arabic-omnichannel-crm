import { Injectable, NotFoundException } from '@nestjs/common'
import { NotificationPriority, NotificationStatus, NotificationType, PlatformRole, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { CreateNotificationInput, CreateTestNotificationDto, ListNotificationsQueryDto } from './dto'

function asJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value as Prisma.InputJsonValue | undefined
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private isTenantAdmin(user: AuthenticatedUser) {
    return user.platformRole === 'SUPER_ADMIN' || user.platformRole === 'COMPANY_ADMIN'
  }

  private async visibilityWhere(tenantId: string, user: AuthenticatedUser): Promise<Prisma.NotificationWhereInput> {
    if (this.isTenantAdmin(user)) {
      return { tenantId, status: { not: NotificationStatus.ARCHIVED } }
    }

    const memberships = await this.prisma.teamMember.findMany({
      where: { tenantId, userId: user.id },
      select: { teamId: true },
    })
    const teamIds = memberships.map((member) => member.teamId)

    return {
      tenantId,
      status: { not: NotificationStatus.ARCHIVED },
      OR: [
        { userId: user.id },
        { userId: null, teamId: null },
        teamIds.length ? { teamId: { in: teamIds } } : { id: '__no_team_notifications__' },
      ],
    }
  }

  private normalize(notification: {
    id: string
    tenantId: string
    userId: string | null
    teamId: string | null
    type: NotificationType
    title: string
    body: string
    message: string
    targetType: string | null
    targetId: string | null
    conversationId: string | null
    status: NotificationStatus
    priority: NotificationPriority
    metadata: Prisma.JsonValue | null
    createdAt: Date
    readAt: Date | null
  }) {
    return {
      ...notification,
      message: notification.message || notification.body,
    }
  }

  async list(tenantId: string, user: AuthenticatedUser, query: ListNotificationsQueryDto) {
    const where = await this.visibilityWhere(tenantId, user)
    if (query.status && query.status in NotificationStatus) where.status = query.status as NotificationStatus
    if (query.priority && query.priority in NotificationPriority) where.priority = query.priority as NotificationPriority
    if (query.type && query.type in NotificationType) where.type = query.type as NotificationType

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit ?? 50) || 50, 100),
    })

    return items.map((item) => this.normalize(item))
  }

  async unreadCount(tenantId: string, user: AuthenticatedUser) {
    const where = await this.visibilityWhere(tenantId, user)
    where.status = NotificationStatus.UNREAD
    return { count: await this.prisma.notification.count({ where }) }
  }

  async markRead(tenantId: string, user: AuthenticatedUser, id: string) {
    const where = await this.visibilityWhere(tenantId, user)
    const existing = await this.prisma.notification.findFirst({ where: { ...where, id } })
    if (!existing) throw new NotFoundException('Notification not found')

    return this.normalize(await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    }))
  }

  async readAll(tenantId: string, user: AuthenticatedUser) {
    const where = await this.visibilityWhere(tenantId, user)
    const result = await this.prisma.notification.updateMany({
      where: { ...where, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    })
    return { updated: result.count }
  }

  async archive(tenantId: string, user: AuthenticatedUser, id: string) {
    const where = await this.visibilityWhere(tenantId, user)
    const existing = await this.prisma.notification.findFirst({ where: { ...where, id } })
    if (!existing) throw new NotFoundException('Notification not found')

    return this.normalize(await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.ARCHIVED, deletedAt: new Date() },
    }))
  }

  async create(input: CreateNotificationInput) {
    if (input.targetType && input.targetId) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId: input.tenantId,
          type: input.type,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      })
      if (existing) return this.normalize(existing)
    }

    const notification = await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? undefined,
        teamId: input.teamId ?? undefined,
        conversationId: input.conversationId ?? undefined,
        type: input.type,
        priority: input.priority ?? NotificationPriority.MEDIUM,
        title: input.title,
        body: input.message,
        message: input.message,
        targetType: input.targetType ?? undefined,
        targetId: input.targetId ?? undefined,
        metadata: asJson(input.metadata),
      },
    })

    return this.normalize(notification)
  }

  createTest(tenantId: string, user: AuthenticatedUser, dto: CreateTestNotificationDto) {
    return this.create({
      tenantId,
      userId: user.platformRole === 'COMPANY_USER' ? user.id : undefined,
      type: dto.type ?? NotificationType.NEW_MESSAGE,
      title: dto.title?.trim() || 'إشعار تجريبي',
      message: dto.message?.trim() || 'هذا إشعار داخلي لاختبار مركز الإشعارات.',
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      targetType: dto.targetType ?? 'SYSTEM',
      targetId: dto.targetId ?? `test-${Date.now()}`,
      metadata: { source: 'manual-test' },
    })
  }
}
