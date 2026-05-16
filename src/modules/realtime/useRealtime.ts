import { useEffect } from 'react'
import type { RealtimeEvent } from './eventBus'
import { socketClient } from './socketClient'
import { useRealtimeStore } from './realtimeStore'
import type {
  AgentPresencePayload,
  ConversationAssignedPayload,
  ConversationStatusChangedPayload,
  MessageReadPayload,
  MessageCreatedPayload,
  MessageUpdatedPayload,
  NotificationCreatedPayload,
  QueueUpdatedPayload,
  RealtimeEnvelope,
  SlaWarningPayload,
} from './realtimeEvents'
import { useInboxStore } from '../../features/inbox/inboxStore'
import { useNotificationStore } from '../../features/notifications/notificationStore'
import { usePresenceStore } from './presenceStore'

function toLegacyEvent(event: RealtimeEnvelope): RealtimeEvent | null {
  const updatedAt = 'الآن'

  if (event.type === 'message.created') {
    const payload = event.payload as MessageCreatedPayload
    return {
      type: 'message.created',
      conversationId: payload.conversationId,
      unreadIncrement: 1,
      lastMessage: payload.body,
      updatedAt,
      message: {
        id: event.id,
        direction: 'incoming',
        body: payload.body,
        author: payload.author,
        sentAt: updatedAt,
      },
    }
  }

  if (event.type === 'message.updated' || event.type === 'message.read') {
    const payload = event.payload as MessageUpdatedPayload & MessageReadPayload
    return {
      type: 'message.created',
      conversationId: payload.conversationId,
      unreadIncrement: 0,
      lastMessage: event.type === 'message.read' ? `تمت قراءة الرسالة بواسطة ${payload.readBy}` : 'تم تحديث حالة الرسالة',
      updatedAt,
      message: {
        id: `${event.id}-receipt`,
        direction: 'incoming',
        kind: 'internal_note',
        body: event.type === 'message.read' ? `تمت قراءة الرسالة ${payload.messageId}` : `تحديث الرسالة ${payload.messageId}: ${payload.deliveryStatus}`,
        author: 'النظام',
        sentAt: updatedAt,
      },
    }
  }

  if (event.type === 'conversation.assigned') {
    const payload = event.payload as ConversationAssignedPayload
    return {
      type: 'conversation.assigned',
      conversationId: payload.conversationId,
      assignee: {
        id: payload.agentId,
        name: payload.agentName,
        team: payload.team,
        presence: payload.presence,
      },
      updatedAt,
    }
  }

  if (event.type === 'conversation.status_changed') {
    const payload = event.payload as ConversationStatusChangedPayload
    return {
      type: 'conversation.status_changed',
      conversationId: payload.conversationId,
      status: payload.status,
      updatedAt,
    }
  }

  if (event.type === 'sla.warning') {
    const payload = event.payload as SlaWarningPayload
    return {
      type: 'conversation.sla_warning',
      conversationId: payload.conversationId,
      slaDueAt: payload.dueLabel,
      updatedAt,
    }
  }

  if (event.type === 'agent.online' || event.type === 'agent.offline') {
    const payload = event.payload as AgentPresencePayload
    return {
      type: 'agent.presence_changed',
      agentId: payload.agentId,
      presence: payload.presence,
      updatedAt,
    }
  }

  if (event.type === 'queue.updated') {
    const payload = event.payload as QueueUpdatedPayload
    return {
      type: 'queue.overloaded',
      queue: payload.queue || 'غير مصنف',
      activeCount: payload.activeCount,
      updatedAt,
    }
  }

  return null
}

function handleNotificationEvent(event: RealtimeEnvelope) {
  const notificationStore = useNotificationStore.getState()

  if (event.type === 'notification.created') {
    const payload = event.payload as NotificationCreatedPayload

    notificationStore.addAwarenessEvent({
      type: 'customer_replied',
      priority: payload.priority,
      category: 'conversation',
      icon: 'i',
      title: payload.title,
      message: payload.message,
      source: event.source,
    })
  }

  if (event.type === 'sla.warning') {
    notificationStore.addAwarenessEvent({
      type: 'sla_warning',
      priority: 'warning',
      category: 'sla',
      icon: '!',
      title: 'تحذير SLA مباشر',
      message: 'وصل تحديث SLA من قناة الوقت الفعلي.',
      source: event.source,
      relatedConversationId: (event.payload as SlaWarningPayload).conversationId,
    })
  }

  if (event.type === 'agent.online' || event.type === 'agent.offline') {
    notificationStore.addAwarenessEvent({
      type: 'agent_mentioned',
      priority: 'info',
      category: 'agent',
      icon: '@',
      title: 'تحديث حضور وكيل',
      message: event.type === 'agent.online' ? 'وكيل عاد للاتصال.' : 'وكيل أصبح غير متصل.',
      source: event.source,
    })
  }

  if (event.type === 'queue.updated') {
    const payload = event.payload as QueueUpdatedPayload
    notificationStore.addAwarenessEvent({
      type: 'queue_overload',
      priority: payload.slaWarnings > 0 ? 'warning' : 'info',
      category: 'queue',
      icon: '#',
      title: 'تحديث قائمة مباشر',
      message: `${payload.queue}: ${payload.activeCount} نشطة، ${payload.waitingCount} بانتظار الإسناد.`,
      source: event.source,
    })
  }
}

export function useRealtime() {
  useEffect(() => {
    let disposed = false
    const realtimeState = useRealtimeStore.getState()

    realtimeState.setConnectionState('يعيد الاتصال')
    realtimeState.incrementReconnectAttempts()

    socketClient.connect().then(() => {
      if (disposed) return
      const state = useRealtimeStore.getState()
      state.setConnectionState('متصل')
      state.resetReconnectAttempts()
    })

    const unsubscribe = socketClient.subscribe((event) => {
      useRealtimeStore.getState().recordEvent(event)
      handleNotificationEvent(event)

      if (event.type === 'agent.online' || event.type === 'agent.offline') {
        const payload = event.payload as AgentPresencePayload
        usePresenceStore.getState().setAgentPresence(payload.agentId, payload.presence, event.source)
      }

      const legacyEvent = toLegacyEvent(event)
      if (legacyEvent) {
        useInboxStore.getState().applyRealtimeEvent(legacyEvent)
      }
    })

    const stopSimulator = socketClient.startSimulator(() => useInboxStore.getState().conversations)

    return () => {
      disposed = true
      unsubscribe()
      stopSimulator()
      useRealtimeStore.getState().setConnectionState('غير متصل')
    }
  }, [])
}
