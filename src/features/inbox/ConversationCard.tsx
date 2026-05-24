import type { MouseEvent } from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type {
  AssignmentState,
  ConversationChannel,
  ConversationPriority,
  ConversationStatus,
  InboxAssignee,
  SupportQueue,
} from './inboxMock'

type ConversationCardProps = {
  id: string
  customerName: string
  preview: string
  channel: ConversationChannel
  queue: SupportQueue
  assignmentState: AssignmentState
  priority: ConversationPriority
  status: ConversationStatus
  slaLabel: string
  slaState: 'ok' | 'warning' | 'breached'
  unreadCount: number
  timestamp: string
  selected: boolean
  assignedAgent: InboxAssignee
  canAssign: boolean
  canManage: boolean
  onClick: () => void
  onAssign: (conversationId: string) => void
  onResolve: (conversationId: string) => void
  onMarkUnread: (conversationId: string) => void
  onPriority: (conversationId: string) => void
  onArchive: (conversationId: string) => void
  onEscalate: (conversationId: string) => void
}

const statusLabels: Record<ConversationStatus, string> = {
  unread: 'غير مقروء',
  assigned: 'مسند',
  pending: 'بانتظار',
  resolved: 'تم الحل',
  sla_warning: 'تحذير SLA',
}

const priorityLabels: Record<ConversationPriority, string> = {
  VIP: 'VIP',
  urgent: 'عاجل',
  normal: 'عادي',
}

const channelBadges: Record<ConversationChannel, string> = {
  WhatsApp: 'واتساب',
  Telegram: 'TG',
  Email: 'EM',
  'Web Chat': 'WEB',
}

function statusTone(status: ConversationStatus) {
  if (status === 'assigned') return 'info'
  if (status === 'pending') return 'warning'
  if (status === 'resolved') return 'success'
  if (status === 'sla_warning') return 'danger'
  return 'muted'
}

function priorityTone(priority: ConversationPriority) {
  if (priority === 'VIP') return 'vip'
  if (priority === 'urgent') return 'danger'
  return 'muted'
}

export function ConversationCard({
  id,
  customerName,
  preview,
  channel,
  queue,
  assignmentState,
  priority,
  status,
  slaLabel,
  slaState,
  unreadCount,
  timestamp,
  selected,
  assignedAgent,
  canAssign,
  canManage,
  onClick,
  onAssign,
  onResolve,
  onMarkUnread,
  onPriority,
  onArchive,
  onEscalate,
}: ConversationCardProps) {
  function handleAction(action: (conversationId: string) => void) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      action(id)
    }
  }

  return (
    <article
      className={`conversation-item ${selected ? 'active' : ''}`}
    >
      <button type="button" className="conversation-select-button" onClick={onClick} aria-pressed={selected}>
        <div className="conversation-card-header">
          <span className="channel-icon" aria-label={channel}>
            {channelBadges[channel]}
          </span>
          <div className="conversation-card-title">
            <strong className="text-safe">{customerName}</strong>
            <small className="text-safe">
              <span className={`presence-dot ${assignedAgent.presence}`} />
              {assignedAgent.name}
            </small>
          </div>
          <time>{timestamp}</time>
        </div>

        <p className="conversation-preview text-safe">{preview}</p>

        <div className="conversation-card-footer">
          <div className="conversation-tags">
            <StatusBadge label={queue} tone={queue === 'VIP' ? 'vip' : 'info'} />
            <StatusBadge label={assignmentState} tone={assignmentState === 'مصعد' ? 'danger' : assignmentState === 'مغلق' ? 'success' : 'muted'} />
            <StatusBadge label={statusLabels[status]} tone={statusTone(status)} />
            <StatusBadge label={priorityLabels[priority]} tone={priorityTone(priority)} />
          </div>
          {unreadCount > 0 ? <b className="unread-counter">{unreadCount}</b> : null}
        </div>
      </button>

      {canAssign || canManage ? (
        <div className="conversation-action-toolbar" aria-label="إجراءات سريعة">
          {canAssign ? <button type="button" onClick={handleAction(onAssign)}>إسناد</button> : null}
          {canManage ? <button type="button" onClick={handleAction(onResolve)}>حل</button> : null}
          {canManage ? <button type="button" onClick={handleAction(onMarkUnread)}>غير مقروء</button> : null}
          {canManage ? <button type="button" onClick={handleAction(onPriority)}>أولوية</button> : null}
          {canAssign ? <button type="button" onClick={handleAction(onEscalate)}>تصعيد</button> : null}
          {canManage ? <button type="button" onClick={handleAction(onArchive)}>أرشفة</button> : null}
        </div>
      ) : null}
      <div className={`conversation-sla-strip ${slaState}`}>
        <span>SLA</span>
        <b>{slaLabel}</b>
      </div>
    </article>
  )
}
