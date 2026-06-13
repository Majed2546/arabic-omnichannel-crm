import type {
  AgentPresence,
  Conversation,
  ConversationMessage,
  ConversationStatus,
  InboxAssignee,
  SupportQueue,
} from '../../features/inbox/inboxMock'

export type RealtimeEventName =
  | 'conversation.created'
  | 'message.created'
  | 'conversation.assigned'
  | 'conversation.status_changed'
  | 'conversation.sla_warning'
  | 'conversation.queue_changed'
  | 'conversation.escalated'
  | 'conversation.sla_breached'
  | 'queue.overloaded'
  | 'agent.mentioned'
  | 'agent.presence_changed'

export type ConversationCreatedEvent = {
  type: 'conversation.created'
  conversation: Conversation
}

export type MessageCreatedEvent = {
  type: 'message.created'
  conversationId: string
  message: ConversationMessage
  unreadIncrement: number
  lastMessage: string
  updatedAt: string
}

export type ConversationAssignedEvent = {
  type: 'conversation.assigned'
  conversationId: string
  assignee: InboxAssignee
  updatedAt: string
}

export type ConversationStatusChangedEvent = {
  type: 'conversation.status_changed'
  conversationId: string
  status: ConversationStatus
  updatedAt: string
}

export type ConversationSlaWarningEvent = {
  type: 'conversation.sla_warning'
  conversationId: string
  slaDueAt: string
  updatedAt: string
}

export type ConversationQueueChangedEvent = {
  type: 'conversation.queue_changed'
  conversationId: string
  queue: SupportQueue
  updatedAt: string
}

export type ConversationEscalatedEvent = {
  type: 'conversation.escalated'
  conversationId: string
  customerName: string
  queue: SupportQueue
  updatedAt: string
}

export type ConversationSlaBreachedEvent = {
  type: 'conversation.sla_breached'
  conversationId: string
  customerName: string
  queue: SupportQueue
  updatedAt: string
}

export type QueueOverloadedEvent = {
  type: 'queue.overloaded'
  queue: SupportQueue
  activeCount: number
  updatedAt: string
}

export type AgentMentionedEvent = {
  type: 'agent.mentioned'
  conversationId: string
  agentName: string
  customerName: string
  updatedAt: string
}

export type AgentPresenceChangedEvent = {
  type: 'agent.presence_changed'
  agentId: string
  presence: AgentPresence
  updatedAt: string
}

export type RealtimeEvent =
  | ConversationCreatedEvent
  | MessageCreatedEvent
  | ConversationAssignedEvent
  | ConversationStatusChangedEvent
  | ConversationSlaWarningEvent
  | ConversationQueueChangedEvent
  | ConversationEscalatedEvent
  | ConversationSlaBreachedEvent
  | QueueOverloadedEvent
  | AgentMentionedEvent
  | AgentPresenceChangedEvent

type EventHandler<TEvent extends RealtimeEvent = RealtimeEvent> = (event: TEvent) => void

type EventMap = {
  [EventName in RealtimeEventName]: Extract<RealtimeEvent, { type: EventName }>
}

class RealtimeEventBus {
  private handlers = new Set<EventHandler>()

  subscribe(handler: EventHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  on<EventName extends RealtimeEventName>(type: EventName, handler: EventHandler<EventMap[EventName]>) {
    const wrappedHandler: EventHandler = (event) => {
      if (event.type === type) handler(event as EventMap[EventName])
    }

    return this.subscribe(wrappedHandler)
  }

  emit(event: RealtimeEvent) {
    this.handlers.forEach((handler) => handler(event))
  }
}

export const realtimeEventBus = new RealtimeEventBus()
