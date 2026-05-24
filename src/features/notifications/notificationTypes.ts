export type NotificationType =
  | 'new_conversation'
  | 'assigned_conversation'
  | 'new_message'
  | 'sla_warning'
  | 'sla_breached'
  | 'conversation_escalated'
  | 'customer_replied'
  | 'queue_overload'
  | 'automation_triggered'
  | 'agent_mentioned'
  | 'supervisor_alert'
  | 'webhook_issue'
  | 'whatsapp_quality_warning'

export type NotificationPriority = 'info' | 'warning' | 'critical'

export type NotificationCategory = 'conversation' | 'sla' | 'queue' | 'agent' | 'supervisor' | 'automation' | 'webhook' | 'whatsapp'

export type NotificationRecord = {
  id: string
  type: NotificationType
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  timestamp: number
  read: boolean
  source: string
  relatedConversationId?: string
}

export type ActivityRecord = {
  id: string
  category: NotificationCategory
  icon: string
  title: string
  description: string
  timestamp: number
  priority: NotificationPriority
  source: string
  type: NotificationType
}
