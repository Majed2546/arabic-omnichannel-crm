export type RealtimeEventName =
  | 'message.created'
  | 'message.updated'
  | 'message.read'
  | 'conversation.created'
  | 'conversation.assigned'
  | 'conversation.status_changed'
  | 'sla.warning'
  | 'notification.created'
  | 'queue.updated'
  | 'agent.online'
  | 'agent.offline'

export type RealtimeNamespace = 'inbox' | 'notifications' | 'presence'
export type PresenceState = 'online' | 'away' | 'offline'
export type RoomKind = 'tenant' | 'conversation' | 'agent'

export type RealtimeEnvelope<TPayload = Record<string, unknown>> = {
  id: string
  type: RealtimeEventName
  tenantId: string
  namespace: RealtimeNamespace
  payload: TPayload
  occurredAt: string
  source: 'socket' | 'redis' | 'webhook' | 'queue' | 'automation' | 'simulator'
  instanceId?: string
}

export type SocketAuthContext = {
  tenantId: string
  userId?: string
  agentId?: string
}

export type PresenceRecord = {
  tenantId: string
  agentId: string
  state: PresenceState
  socketId?: string
  updatedAt: string
}

export const realtimeEventNamespaces: Record<RealtimeEventName, RealtimeNamespace> = {
  'message.created': 'inbox',
  'message.updated': 'inbox',
  'message.read': 'inbox',
  'conversation.created': 'inbox',
  'conversation.assigned': 'inbox',
  'conversation.status_changed': 'inbox',
  'sla.warning': 'inbox',
  'notification.created': 'notifications',
  'queue.updated': 'inbox',
  'agent.online': 'presence',
  'agent.offline': 'presence',
}

export function tenantRoom(tenantId: string) {
  return `tenant:${tenantId}`
}

export function conversationRoom(tenantId: string, conversationId: string) {
  return `tenant:${tenantId}:conversation:${conversationId}`
}

export function agentRoom(tenantId: string, agentId: string) {
  return `tenant:${tenantId}:agent:${agentId}`
}
