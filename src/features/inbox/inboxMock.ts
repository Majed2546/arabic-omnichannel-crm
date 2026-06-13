export type ConversationStatus = 'unread' | 'assigned' | 'pending' | 'resolved' | 'sla_warning'
export type ConversationPriority = 'VIP' | 'urgent' | 'normal'
export type AgentPresence = 'online' | 'away' | 'offline'
export type ConversationChannel = 'WhatsApp' | 'Email' | 'Web Chat' | 'Telegram'
export type SupportQueue = string
export type AssignmentState = 'غير مسند' | 'مسند' | 'قيد المعالجة' | 'بانتظار العميل' | 'مصعد' | 'مغلق'
export type MessageDirection = 'incoming' | 'outgoing'
export type MessageDeliveryStatus = 'pending' | 'failed' | 'sent' | 'delivered' | 'read'
export type ConversationTimelineType = 'assigned' | 'sla_warning' | 'resolved' | 'reopened'

export type InboxAssignee = {
  id: string
  name: string
  team: string
  presence: AgentPresence
}

export type ConversationMessage = {
  id: string
  direction: MessageDirection
  body: string
  author: string
  sentAt: string
  deliveryStatus?: MessageDeliveryStatus
  kind?: 'message' | 'internal_note'
  botFailed?: boolean
}

export type Conversation = {
  id: string
  customerId?: string
  customerName: string
  customerCompany: string
  customerEmail: string
  customerPhone: string
  customerLocation: string
  channel: ConversationChannel
  queue: SupportQueue
  assignmentState: AssignmentState
  status: ConversationStatus
  priority: ConversationPriority
  unreadCount: number
  tags: string[]
  lastMessage: string
  messages: ConversationMessage[]
  timeline: ConversationTimelineEvent[]
  assignee: InboxAssignee
  updatedAt: string
  slaDueAt: string
  slaDeadlineMs: number
  slaStatus?: 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'MET'
  firstResponseDueAt?: string
  archived?: boolean
}

export type ConversationTimelineEvent = {
  id: string
  type: ConversationTimelineType
  label: string
  actor: string
  occurredAt: string
}

export type QueueAgent = {
  id: string
  name: string
  queue: SupportQueue
  presence: AgentPresence
  activeChats: number
  slaWarnings: number
}

export const supportQueues: SupportQueue[] = []

export const inboxRealtimeConfig = {
  transport: 'Socket.IO',
  channels: [
    'conversation.created',
    'message.created',
    'conversation.assigned',
    'conversation.status_changed',
    'conversation.sla_warning',
    'conversation.queue_changed',
    'agent.presence_changed',
  ],
  reconnectMs: 3000,
} as const
