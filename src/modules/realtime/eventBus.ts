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

const incomingMessages = [
  'هل يمكن متابعة الطلب الآن؟',
  'أرسلت لكم لقطة الشاشة عبر القناة.',
  'نحتاج تحديثاً قبل نهاية الدوام.',
  'هل وصلتكم تفاصيل الحساب؟',
  'أحتاج تأكيد حالة الربط من فضلكم.',
]

const createdConversationNames = [
  { name: 'هند السعد', company: 'سلة', email: 'hind@salla.example', phone: '+966 55 880 2044' },
  { name: 'عبدالله راشد', company: 'تمارا', email: 'abdullah@tamara.example', phone: '+966 50 224 7710' },
  { name: 'ريم الغامدي', company: 'زد', email: 'reem@zid.example', phone: '+966 54 701 3309' },
]

const queues: SupportQueue[] = ['الدعم', 'المبيعات', 'التقنية', 'الفواتير', 'VIP']

class MockRealtimeEventBus {
  private handlers = new Set<EventHandler>()
  private timerId: number | null = null
  private sequence = 0

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

  startMockInboxStream(getConversations: () => Conversation[]) {
    if (this.timerId !== null) return () => this.stopMockInboxStream()

    const scheduleNext = () => {
      this.timerId = window.setTimeout(() => {
        this.emit(this.createMockEvent(getConversations()))
        scheduleNext()
      }, randomBetween(20_000, 40_000))
    }

    scheduleNext()
    return () => this.stopMockInboxStream()
  }

  stopMockInboxStream() {
    if (this.timerId === null) return
    window.clearTimeout(this.timerId)
    this.timerId = null
  }

  private createMockEvent(conversations: Conversation[]): RealtimeEvent {
    this.sequence += 1
    const mode = this.sequence % 13
    const conversation = conversations[this.sequence % Math.max(conversations.length, 1)]

    if (!conversation || mode === 0) return this.createConversation()

    if (mode === 1 || mode === 4) return this.createMessage(conversation)

    if (mode === 2) {
      return {
        type: 'conversation.status_changed',
        conversationId: conversation.id,
        status: conversation.status === 'pending' ? 'assigned' : 'pending',
        updatedAt: 'الآن',
      }
    }

    if (mode === 3) {
      return {
        type: 'conversation.assigned',
        conversationId: conversation.id,
        assignee: { id: 'agent-layla', name: 'ليلى الحسن', team: conversation.assignee.team, presence: 'online' },
        updatedAt: 'الآن',
      }
    }

    if (mode === 5) {
      return {
        type: 'conversation.sla_warning',
        conversationId: conversation.id,
        slaDueAt: 'خلال 10 دقائق',
        updatedAt: 'الآن',
      }
    }

    if (mode === 6) {
      return {
        type: 'conversation.queue_changed',
        conversationId: conversation.id,
        queue: queues[this.sequence % queues.length],
        updatedAt: 'الآن',
      }
    }

    if (mode === 7) {
      return {
        type: 'conversation.assigned',
        conversationId: conversation.id,
        assignee: { id: 'agent-nasser', name: 'ناصر القحطاني', team: 'فريق الفواتير', presence: 'online' },
        updatedAt: 'الآن',
      }
    }

    if (mode === 8) {
      return {
        type: 'conversation.escalated',
        conversationId: conversation.id,
        customerName: conversation.customerName,
        queue: 'VIP',
        updatedAt: 'الآن',
      }
    }

    if (mode === 9) {
      return {
        type: 'conversation.sla_breached',
        conversationId: conversation.id,
        customerName: conversation.customerName,
        queue: conversation.queue,
        updatedAt: 'الآن',
      }
    }

    if (mode === 10) {
      return {
        type: 'queue.overloaded',
        queue: queues[this.sequence % queues.length],
        activeCount: randomBetween(9, 16),
        updatedAt: 'الآن',
      }
    }

    if (mode === 11) {
      return {
        type: 'agent.mentioned',
        conversationId: conversation.id,
        agentName: 'ليلى الحسن',
        customerName: conversation.customerName,
        updatedAt: 'الآن',
      }
    }

    return {
      type: 'agent.presence_changed',
      agentId: conversation.assignee.id,
      presence: conversation.assignee.presence === 'online' ? 'away' : 'online',
      updatedAt: 'الآن',
    }
  }

  private createMessage(conversation: Conversation): MessageCreatedEvent {
    const body = incomingMessages[this.sequence % incomingMessages.length]

    return {
      type: 'message.created',
      conversationId: conversation.id,
      unreadIncrement: 1,
      lastMessage: body,
      updatedAt: 'الآن',
      message: {
        id: `rt-${Date.now()}-${this.sequence}`,
        direction: 'incoming',
        body,
        author: conversation.customerName,
        sentAt: 'الآن',
      },
    }
  }

  private createConversation(): ConversationCreatedEvent {
    const customer = createdConversationNames[this.sequence % createdConversationNames.length]
    const openingMessage = incomingMessages[(this.sequence + 1) % incomingMessages.length]

    return {
      type: 'conversation.created',
      conversation: {
        id: `conv-rt-${Date.now()}-${this.sequence}`,
        customerName: customer.name,
        customerCompany: customer.company,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerLocation: 'الرياض',
        channel: 'WhatsApp',
        queue: 'الدعم',
        assignmentState: 'غير مسند',
        status: 'unread',
        priority: 'normal',
        unreadCount: 1,
        tags: ['وارد جديد', 'تجريبي'],
        lastMessage: openingMessage,
        messages: [
          {
            id: `msg-rt-${Date.now()}-${this.sequence}`,
            direction: 'incoming',
            body: openingMessage,
            author: customer.name,
            sentAt: 'الآن',
          },
        ],
        timeline: [
          {
            id: `tl-rt-${Date.now()}-${this.sequence}`,
            type: 'assigned',
            label: 'تم إنشاء المحادثة وإسنادها تلقائياً',
            actor: 'النظام',
            occurredAt: 'الآن',
          },
        ],
        assignee: { id: 'agent-layla', name: 'ليلى الحسن', team: 'فريق الدعم', presence: 'online' },
        updatedAt: 'الآن',
        slaDueAt: 'اليوم 17:00',
        slaDeadlineMs: Date.now() + 55 * 60 * 1000,
      },
    }
  }
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const realtimeEventBus = new MockRealtimeEventBus()
