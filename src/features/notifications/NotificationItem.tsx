import type { NotificationRecord } from './notificationTypes'
import { formatRelativeTime } from './notificationUtils'

type NotificationItemProps = {
  notification: NotificationRecord
  onRead: (id: string) => void
  onClear: (id: string) => void
  onOpenConversation?: (conversationId: string) => void
}

const priorityLabels = {
  info: 'معلومة',
  warning: 'تنبيه',
  critical: 'حرج',
} as const

const typeLabels: Record<NotificationRecord['type'], string> = {
  new_conversation: 'محادثة جديدة',
  assigned_conversation: 'إسناد',
  new_message: 'رسالة جديدة',
  sla_warning: 'تحذير SLA',
  sla_breached: 'SLA متجاوز',
  conversation_escalated: 'تصعيد',
  customer_replied: 'رد عميل',
  queue_overload: 'ضغط قائمة',
  automation_triggered: 'أتمتة',
  agent_mentioned: 'إشارة',
  supervisor_alert: 'مشرف',
  webhook_issue: 'Webhook',
  whatsapp_quality_warning: 'جودة واتساب',
}

export function NotificationItem({ notification, onRead, onClear, onOpenConversation }: NotificationItemProps) {
  return (
    <article className={`notification-item ${notification.priority} ${notification.read ? 'read' : 'unread'}`}>
      <button type="button" onClick={() => onRead(notification.id)}>
        <div>
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
          <footer>
            <span>{typeLabels[notification.type]}</span>
            <span>{priorityLabels[notification.priority]}</span>
            <span>{notification.source}</span>
            <time>{formatRelativeTime(notification.timestamp)}</time>
          </footer>
        </div>
      </button>
      <div className="notification-actions">
        {notification.relatedConversationId && onOpenConversation ? (
          <button type="button" onClick={() => onOpenConversation(notification.relatedConversationId!)}>
            فتح المحادثة
          </button>
        ) : null}
        {!notification.read ? (
          <button type="button" onClick={() => onRead(notification.id)}>
            تعيين كمقروء
          </button>
        ) : null}
        <button type="button" onClick={() => onClear(notification.id)}>
          حذف
        </button>
      </div>
    </article>
  )
}
