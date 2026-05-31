import type { AgentPresence, ConversationStatus } from '../../features/inbox/inboxMock'

export type RealtimeConnectionState = 'متصل' | 'يعيد الاتصال' | 'غير متصل'

export type RealtimeEventType =
  | 'message.created'
  | 'message.updated'
  | 'message.read'
  | 'conversation.created'
  | 'conversation.assigned'
  | 'conversation.status_changed'
  | 'sla.warning'
  | 'agent.online'
  | 'agent.offline'
  | 'notification.created'
  | 'queue.updated'

export type RealtimeEventSource = 'socket.io' | 'redis-pubsub' | 'nestjs-gateway'

export type RealtimeEnvelope<TPayload = Record<string, unknown>> = {
  id: string
  type: RealtimeEventType
  timestamp: number
  source: RealtimeEventSource
  payload: TPayload
}

export type MessageCreatedPayload = {
  id?: string
  conversationId: string
  body?: string
  content?: string
  author?: string
  senderType?: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | string
  messageType?: string
  status?: string
}

export type MessageUpdatedPayload = {
  conversationId: string
  messageId: string
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed'
}

export type MessageReadPayload = {
  conversationId: string
  messageId: string
  readBy: string
}

export type ConversationAssignedPayload = {
  conversationId: string
  agentId: string
  agentName: string
  team: string
  presence: AgentPresence
}

export type ConversationStatusChangedPayload = {
  conversationId: string
  status: ConversationStatus
}

export type SlaWarningPayload = {
  conversationId: string
  dueLabel: string
}

export type AgentPresencePayload = {
  agentId: string
  presence: Extract<AgentPresence, 'online' | 'offline'>
}

export type NotificationCreatedPayload = {
  title: string
  message: string
  priority: 'info' | 'warning' | 'critical'
}

export type QueueUpdatedPayload = {
  queue: string
  activeCount: number
  waitingCount: number
  slaWarnings: number
}
