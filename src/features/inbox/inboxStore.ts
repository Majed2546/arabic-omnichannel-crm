import { create } from 'zustand'
import type { RealtimeEvent } from '../../modules/realtime/eventBus'
import {
  type Conversation,
  type ConversationPriority,
  type MessageDeliveryStatus,
  type QueueAgent,
  type SupportQueue,
} from './inboxMock'

type InboxState = {
  conversations: Conversation[]
  agents: QueueAgent[]
  selectedId: string
  replaceConversations: (conversations: Conversation[]) => void
  selectConversation: (conversationId: string) => void
  clearSelection: () => void
  addOutgoingReply: (conversationId: string, body: string, author: string, messageId?: string, deliveryStatus?: MessageDeliveryStatus) => void
  retryMessage: (conversationId: string, messageId: string) => void
  addInternalNote: (conversationId: string, body: string, author: string) => void
  assignConversation: (conversationId: string) => void
  assignConversationToAgent: (conversationId: string, agentId: string) => void
  moveConversationQueue: (conversationId: string, queue: SupportQueue) => void
  escalateConversation: (conversationId: string) => void
  resolveConversation: (conversationId: string) => void
  markUnread: (conversationId: string) => void
  cyclePriority: (conversationId: string) => void
  archiveConversation: (conversationId: string) => void
  applyRealtimeEvent: (event: RealtimeEvent) => void
}

function reduceRealtimeEvent(
  conversations: Conversation[],
  event: RealtimeEvent,
  selectedConversationId: string,
): Conversation[] {
  if (event.type === 'conversation.created') {
    return [event.conversation, ...conversations]
  }

  if (event.type === 'message.created') {
    return conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            status: selectedConversationId === conversation.id ? conversation.status : 'unread',
            unreadCount:
              selectedConversationId === conversation.id
                ? conversation.unreadCount
                : conversation.unreadCount + event.unreadIncrement,
            lastMessage: event.lastMessage,
            updatedAt: event.updatedAt,
            messages: conversation.messages.some((message) => message.id === event.message.id)
              ? conversation.messages
              : [...conversation.messages, event.message],
          }
        : conversation,
    )
  }

  if (event.type === 'conversation.assigned') {
    return conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            status: 'assigned',
            assignmentState: 'مسند',
            assignee: event.assignee,
            updatedAt: event.updatedAt,
            timeline: [
              ...conversation.timeline,
              {
                id: `tl-${Date.now()}`,
                type: 'assigned',
                label: `تم إسناد المحادثة إلى ${event.assignee.name}`,
                actor: 'النظام',
                occurredAt: event.updatedAt,
              },
            ],
          }
        : conversation,
    )
  }

  if (event.type === 'conversation.status_changed') {
    return conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            status: event.status,
            assignmentState: event.status === 'pending' ? 'بانتظار العميل' : conversation.assignmentState,
            updatedAt: event.updatedAt,
          }
        : conversation,
    )
  }

  if (event.type === 'conversation.sla_warning') {
    return conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            status: 'sla_warning',
            assignmentState: conversation.assignmentState === 'مغلق' ? conversation.assignmentState : 'مصعد',
            slaDueAt: event.slaDueAt,
            slaDeadlineMs: Date.now() + 10 * 60 * 1000,
            updatedAt: event.updatedAt,
            timeline: [
              ...conversation.timeline,
              {
                id: `tl-${Date.now()}`,
                type: 'sla_warning',
                label: `تحذير SLA: ${event.slaDueAt}`,
                actor: 'النظام',
                occurredAt: event.updatedAt,
              },
            ],
          }
        : conversation,
    )
  }

  if (event.type === 'conversation.queue_changed') {
    return conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            queue: event.queue,
            updatedAt: event.updatedAt,
            timeline: [
              ...conversation.timeline,
              {
                id: `tl-${Date.now()}`,
                type: 'reopened',
                label: `نقلت المحادثة إلى قائمة ${event.queue}`,
                actor: 'النظام',
                occurredAt: event.updatedAt,
              },
            ],
          }
        : conversation,
    )
  }

  if (
    event.type === 'conversation.escalated' ||
    event.type === 'conversation.sla_breached' ||
    event.type === 'queue.overloaded' ||
    event.type === 'agent.mentioned'
  ) {
    return conversations
  }

  return conversations.map((conversation) =>
    conversation.assignee.id === event.agentId
      ? {
          ...conversation,
          assignee: { ...conversation.assignee, presence: event.presence },
          updatedAt: event.updatedAt,
        }
      : conversation,
  )
}

function setMessageDeliveryState(
  set: (partial: Partial<InboxState> | ((state: InboxState) => Partial<InboxState>)) => void,
  conversationId: string,
  messageId: string,
  deliveryStatus: MessageDeliveryStatus,
) {
  set((state) => ({
    conversations: state.conversations.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            messages: conversation.messages.map((message) =>
              message.id === messageId ? { ...message, deliveryStatus } : message,
            ),
          }
        : conversation,
    ),
  }))
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  agents: [],
  selectedId: '',
  replaceConversations: (conversations) =>
    set((state) => ({
      conversations,
      selectedId: conversations.some((conversation) => conversation.id === state.selectedId)
        ? state.selectedId
        : conversations[0]?.id ?? '',
    })),
  selectConversation: (conversationId) =>
    set((state) => ({
      selectedId: conversationId,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0, status: conversation.status === 'unread' ? 'assigned' : conversation.status }
          : conversation,
      ),
    })),
  clearSelection: () => set({ selectedId: '' }),
  addOutgoingReply: (conversationId, body, author, messageId = `local-${Date.now()}`, deliveryStatus = 'pending') =>
    {
      set((state) => ({
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                status: 'assigned',
                assignmentState: 'قيد المعالجة',
                lastMessage: body,
                updatedAt: 'الآن',
                messages: [
                  ...conversation.messages,
                  {
                    id: messageId,
                    direction: 'outgoing',
                    body,
                    author,
                    sentAt: 'الآن',
                    deliveryStatus,
                  },
                ],
              }
          : conversation,
        ),
      }))
    },
  retryMessage: (conversationId, messageId) =>
    {
      setMessageDeliveryState(set, conversationId, messageId, 'pending')
      window.setTimeout(() => setMessageDeliveryState(set, conversationId, messageId, 'sent'), 1000)
    },
  addInternalNote: (conversationId, body, author) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  id: `note-${Date.now()}`,
                  direction: 'outgoing',
                  kind: 'internal_note',
                  body,
                  author,
                  sentAt: 'الآن',
                  deliveryStatus: 'sent',
                },
              ],
            }
          : conversation,
      ),
    })),
  assignConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              status: 'assigned',
              assignmentState: 'مسند',
              assignee: { ...conversation.assignee, id: 'current-user', name: 'المستخدم الحالي', presence: 'online' },
              updatedAt: 'الآن',
              timeline: [
                ...conversation.timeline,
                { id: `tl-${Date.now()}`, type: 'assigned', label: 'تم إسناد المحادثة إلى المستخدم الحالي', actor: 'النظام', occurredAt: 'الآن' },
              ],
            }
          : conversation,
      ),
    })),
  assignConversationToAgent: (conversationId, agentId) =>
    set((state) => {
      const agent = state.agents.find((item) => item.id === agentId)
      if (!agent) return {}

      return {
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                status: 'assigned',
                assignmentState: 'مسند',
                queue: agent.queue,
                assignee: {
                  id: agent.id,
                  name: agent.name,
                  team: `فريق ${agent.queue}`,
                  presence: agent.presence,
                },
                updatedAt: 'الآن',
                timeline: [
                  ...conversation.timeline,
                  {
                    id: `tl-${Date.now()}`,
                    type: 'assigned',
                    label: `تم إسناد المحادثة إلى ${agent.name}`,
                    actor: 'النظام',
                    occurredAt: 'الآن',
                  },
                ],
              }
            : conversation,
        ),
      }
    }),
  moveConversationQueue: (conversationId, queue) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              queue,
              updatedAt: 'الآن',
              timeline: [
                ...conversation.timeline,
                {
                  id: `tl-${Date.now()}`,
                  type: 'reopened',
                  label: `نقلت المحادثة إلى قائمة ${queue}`,
                  actor: 'النظام',
                  occurredAt: 'الآن',
                },
              ],
            }
          : conversation,
      ),
    })),
  escalateConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              status: 'sla_warning',
              assignmentState: 'مصعد',
              updatedAt: 'الآن',
              timeline: [
                ...conversation.timeline,
                {
                  id: `tl-${Date.now()}`,
                  type: 'sla_warning',
                  label: 'تم تصعيد المحادثة',
                  actor: 'النظام',
                  occurredAt: 'الآن',
                },
              ],
            }
          : conversation,
      ),
    })),
  resolveConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              status: 'resolved',
              assignmentState: 'مغلق',
              unreadCount: 0,
              updatedAt: 'الآن',
              timeline: [
                ...conversation.timeline,
                { id: `tl-${Date.now()}`, type: 'resolved', label: 'تم حل المحادثة', actor: 'النظام', occurredAt: 'الآن' },
              ],
            }
          : conversation,
      ),
    })),
  markUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              status: 'unread',
              assignmentState: conversation.assignee.id === 'unassigned' ? 'غير مسند' : conversation.assignmentState,
              unreadCount: Math.max(1, conversation.unreadCount),
              updatedAt: 'الآن',
            }
          : conversation,
      ),
    })),
  cyclePriority: (conversationId) => {
    const nextPriority: Record<ConversationPriority, ConversationPriority> = {
      normal: 'urgent',
      urgent: 'VIP',
      VIP: 'normal',
    }

    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, priority: nextPriority[conversation.priority], updatedAt: 'الآن' }
          : conversation,
      ),
    }))
  },
  archiveConversation: (conversationId) =>
    set((state) => ({
      selectedId: state.selectedId === conversationId ? '' : state.selectedId,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, archived: true, updatedAt: 'الآن' } : conversation,
      ),
    })),
  applyRealtimeEvent: (event) =>
    set((state) => ({
      conversations: reduceRealtimeEvent(state.conversations, event, get().selectedId),
    })),
}))
