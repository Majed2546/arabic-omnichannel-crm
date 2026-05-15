import type { Conversation } from '../../features/inbox/inboxMock'
import type { RealtimeEnvelope, RealtimeEventType } from './realtimeEvents'

type RealtimeHandler = (event: RealtimeEnvelope) => void
type ConversationProvider = () => Conversation[]

const eventTypes: RealtimeEventType[] = [
  'message.created',
  'message.updated',
  'message.read',
  'sla.warning',
  'agent.online',
  'agent.offline',
  'conversation.assigned',
  'conversation.status_changed',
  'queue.updated',
  'notification.created',
]

class MockSocketClient {
  private handlers = new Set<RealtimeHandler>()
  private timerId: number | null = null
  private sequence = 0

  connect() {
    return Promise.resolve()
  }

  disconnect() {
    this.stopSimulator()
    this.handlers.clear()
  }

  subscribe(handler: RealtimeHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  emit(event: RealtimeEnvelope) {
    this.handlers.forEach((handler) => handler(event))
  }

  startSimulator(getConversations: ConversationProvider) {
    if (this.timerId !== null) return () => this.stopSimulator()

    const tick = () => {
      this.timerId = window.setTimeout(() => {
        this.emit(this.createMockEvent(getConversations()))
        tick()
      }, 12_000)
    }

    tick()
    return () => this.stopSimulator()
  }

  stopSimulator() {
    if (this.timerId === null) return
    window.clearTimeout(this.timerId)
    this.timerId = null
  }

  private createMockEvent(conversations: Conversation[]): RealtimeEnvelope {
    this.sequence += 1
    const type = eventTypes[this.sequence % eventTypes.length]
    const conversation = conversations[this.sequence % Math.max(conversations.length, 1)]
    const timestamp = Date.now()

    if (type === 'message.created' && conversation) {
      return this.wrap(type, timestamp, {
        conversationId: conversation.id,
        body: 'تحديث مباشر من قناة واتساب التجريبية.',
        author: conversation.customerName,
      })
    }

    if (type === 'sla.warning' && conversation) {
      return this.wrap(type, timestamp, {
        conversationId: conversation.id,
        dueLabel: 'خلال 10 دقائق',
      })
    }

    if ((type === 'message.updated' || type === 'message.read') && conversation) {
      const lastMessage = conversation.messages[conversation.messages.length - 1]
      return this.wrap(type, timestamp, {
        conversationId: conversation.id,
        messageId: lastMessage?.id ?? `msg-${this.sequence}`,
        deliveryStatus: 'read',
        readBy: conversation.customerName,
      })
    }

    if (type === 'conversation.assigned' && conversation) {
      return this.wrap(type, timestamp, {
        conversationId: conversation.id,
        agentId: 'agent-layla',
        agentName: 'ليلى الحسن',
        team: 'فريق الدعم',
        presence: 'online',
      })
    }

    if (type === 'conversation.status_changed' && conversation) {
      return this.wrap(type, timestamp, {
        conversationId: conversation.id,
        status: conversation.status === 'pending' ? 'assigned' : 'pending',
      })
    }

    if (type === 'agent.online' || type === 'agent.offline') {
      return this.wrap(type, timestamp, {
        agentId: type === 'agent.online' ? 'agent-reem' : 'agent-saud',
        presence: type === 'agent.online' ? 'online' : 'offline',
      })
    }

    if (type === 'queue.updated') {
      return this.wrap(type, timestamp, {
        queue: conversation?.queue ?? 'الدعم',
        activeCount: 8 + (this.sequence % 5),
        waitingCount: this.sequence % 4,
        slaWarnings: this.sequence % 3,
      })
    }

    return this.wrap('notification.created', timestamp, {
      title: 'تحديث تشغيلي مباشر',
      message: 'وصل حدث تجريبي من محاكي WebSocket.',
      priority: 'info',
    })
  }

  private wrap<TPayload extends Record<string, unknown>>(
    type: RealtimeEventType,
    timestamp: number,
    payload: TPayload,
  ): RealtimeEnvelope<TPayload> {
    return {
      id: `rt-${timestamp}-${this.sequence}`,
      type,
      timestamp,
      source: 'mock-websocket',
      payload,
    }
  }
}

export const socketClient = new MockSocketClient()
