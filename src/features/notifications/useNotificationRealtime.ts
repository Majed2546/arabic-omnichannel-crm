import { useEffect } from 'react'
import { realtimeEventBus } from '../../modules/realtime/eventBus'
import { useInboxStore } from '../inbox/inboxStore'
import { useNotificationStore } from './notificationStore'

export function useNotificationRealtime() {
  const addAwarenessEvent = useNotificationStore((state) => state.addAwarenessEvent)

  useEffect(() => {
    const unsubscribe = realtimeEventBus.subscribe((event) => {
      if (event.type === 'conversation.created') {
        addAwarenessEvent({
          type: 'new_conversation',
          priority: 'info',
          category: 'conversation',
          icon: '+',
          title: 'محادثة جديدة',
          message: `وصلت محادثة جديدة من ${event.conversation.customerName} في قائمة ${event.conversation.queue}.`,
          source: 'mock-event-bus',
          relatedConversationId: event.conversation.id,
        })
      }

      if (event.type === 'message.created') {
        const conversation = useInboxStore.getState().conversations.find((item) => item.id === event.conversationId)
        addAwarenessEvent({
          type: 'customer_replied',
          priority: 'info',
          category: 'conversation',
          icon: '↵',
          title: 'رد العميل',
          message: `${conversation?.customerName ?? 'عميل'} أرسل رداً جديداً.`,
          source: 'mock-event-bus',
          relatedConversationId: event.conversationId,
        })
        console.info('notification sound placeholder: customer-replied')
      }

      if (event.type === 'conversation.assigned') {
        addAwarenessEvent({
          type: 'assigned_conversation',
          priority: 'info',
          category: 'agent',
          icon: '✓',
          title: 'إسناد محادثة',
          message: `تم إسناد محادثة إلى ${event.assignee.name}.`,
          source: 'mock-event-bus',
          relatedConversationId: event.conversationId,
        })
      }

      if (event.type === 'conversation.sla_warning') {
        addAwarenessEvent({
          type: 'sla_warning',
          priority: 'warning',
          category: 'sla',
          icon: '!',
          title: 'تحذير SLA',
          message: `محادثة اقتربت من حد SLA: ${event.slaDueAt}.`,
          source: 'sla-monitor',
          relatedConversationId: event.conversationId,
        })
      }

      if (event.type === 'conversation.escalated') {
        addAwarenessEvent({
          type: 'conversation_escalated',
          priority: 'critical',
          category: 'supervisor',
          icon: '↑',
          title: 'تم تصعيد محادثة',
          message: `${event.customerName} تم تصعيده إلى ${event.queue}.`,
          source: 'supervisor-routing',
          relatedConversationId: event.conversationId,
        })
      }

      if (event.type === 'conversation.sla_breached') {
        addAwarenessEvent({
          type: 'supervisor_alert',
          priority: 'critical',
          category: 'supervisor',
          icon: '!',
          title: 'SLA متجاوز',
          message: `تجاوزت محادثة ${event.customerName} حد SLA في قائمة ${event.queue}.`,
          source: 'sla-monitor',
          relatedConversationId: event.conversationId,
        })
      }

      if (event.type === 'queue.overloaded') {
        addAwarenessEvent({
          type: 'queue_overload',
          priority: 'critical',
          category: 'queue',
          icon: '#',
          title: 'ضغط قائمة',
          message: `قائمة ${event.queue} تضم ${event.activeCount} محادثة نشطة.`,
          source: 'queue-monitor',
        })
      }

      if (event.type === 'agent.mentioned') {
        addAwarenessEvent({
          type: 'agent_mentioned',
          priority: 'warning',
          category: 'agent',
          icon: '@',
          title: 'تم ذكرك',
          message: `${event.agentName} ذُكر في محادثة ${event.customerName}.`,
          source: 'agent-collaboration',
          relatedConversationId: event.conversationId,
        })
      }
    })

    const supervisorInterval = window.setInterval(() => {
      const { conversations, agents } = useInboxStore.getState()
      const activeConversations = conversations.filter((conversation) => !conversation.archived && conversation.assignmentState !== 'مغلق')
      const onlineAgents = agents.filter((agent) => agent.presence === 'online')
      const breached = activeConversations.find((conversation) => conversation.slaDeadlineMs < Date.now())

      if (breached) {
        addAwarenessEvent({
          type: 'supervisor_alert',
          priority: 'critical',
          category: 'supervisor',
          icon: '!',
          title: 'SLA متجاوز',
          message: `تحتاج محادثة ${breached.customerName} إلى تدخل مشرف.`,
          source: 'supervisor-monitor',
          relatedConversationId: breached.id,
        })
      }

      if (activeConversations.length >= 8) {
        addAwarenessEvent({
          type: 'queue_overload',
          priority: 'warning',
          category: 'queue',
          icon: '#',
          title: 'ضغط تشغيلي',
          message: 'إجمالي المحادثات النشطة يقترب من حد الضغط.',
          source: 'queue-monitor',
        })
      }

      if (onlineAgents.length === 0) {
        addAwarenessEvent({
          type: 'supervisor_alert',
          priority: 'critical',
          category: 'supervisor',
          icon: '!',
          title: 'لا يوجد وكلاء متصلون',
          message: 'كل الوكلاء غير متصلين حالياً.',
          source: 'agent-presence',
        })
      }
    }, 45_000)

    return () => {
      unsubscribe()
      window.clearInterval(supervisorInterval)
    }
  }, [addAwarenessEvent])
}
