import { NotificationPriority, NotificationType } from '@prisma/client'

export type ListNotificationsQueryDto = {
  status?: string
  priority?: string
  type?: string
  limit?: string
}

export type CreateNotificationInput = {
  tenantId: string
  userId?: string | null
  teamId?: string | null
  type: NotificationType
  title: string
  message: string
  targetType?: string | null
  targetId?: string | null
  conversationId?: string | null
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
}

export type CreateTestNotificationDto = {
  type?: NotificationType
  title?: string
  message?: string
  priority?: NotificationPriority
  targetType?: string
  targetId?: string
}
