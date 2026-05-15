import { create } from 'zustand'
import type { ActivityRecord, NotificationRecord } from './notificationTypes'

type AwarenessInput = Omit<NotificationRecord, 'id' | 'timestamp' | 'read'> & {
  icon: string
  activityTitle?: string
}

type NotificationState = {
  notifications: NotificationRecord[]
  activities: ActivityRecord[]
  addAwarenessEvent: (input: AwarenessInput) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
}

const initialTimestamp = Date.now()

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    {
      id: 'seed-sla',
      type: 'sla_warning',
      priority: 'warning',
      category: 'sla',
      title: 'تحذير SLA',
      message: 'محادثة VIP تقترب من حد الاستجابة.',
      timestamp: initialTimestamp - 8 * 60_000,
      read: false,
      source: 'mock-event-bus',
      relatedConversationId: 'conv-1',
    },
    {
      id: 'seed-queue',
      type: 'queue_overload',
      priority: 'critical',
      category: 'queue',
      title: 'ضغط على قائمة الفواتير',
      message: 'عدد المحادثات النشطة أعلى من الحد التشغيلي.',
      timestamp: initialTimestamp - 14 * 60_000,
      read: false,
      source: 'operations-monitor',
    },
    {
      id: 'seed-whatsapp-quality',
      type: 'whatsapp_quality_warning',
      priority: 'warning',
      category: 'whatsapp',
      title: 'جودة واتساب تحتاج مراجعة',
      message: 'تقييم الرقم قريب من المنطقة الصفراء.',
      timestamp: initialTimestamp - 22 * 60_000,
      read: true,
      source: 'whatsapp-cloud-placeholder',
    },
  ],
  activities: [
    {
      id: 'activity-seed-sla',
      category: 'sla',
      icon: '!',
      title: 'تحذير SLA',
      description: 'محادثة VIP تقترب من حد الاستجابة.',
      timestamp: initialTimestamp - 8 * 60_000,
      priority: 'warning',
      source: 'mock-event-bus',
      type: 'sla_warning',
    },
    {
      id: 'activity-seed-queue',
      category: 'queue',
      icon: '#',
      title: 'ضغط قائمة',
      description: 'قائمة الفواتير تجاوزت الحد التشغيلي.',
      timestamp: initialTimestamp - 14 * 60_000,
      priority: 'critical',
      source: 'operations-monitor',
      type: 'queue_overload',
    },
    {
      id: 'activity-seed-automation',
      category: 'automation',
      icon: 'A',
      title: 'تشغيل أتمتة',
      description: 'تم تشغيل قاعدة تحويل واتساب للدعم.',
      timestamp: initialTimestamp - 30 * 60_000,
      priority: 'info',
      source: 'automation-engine',
      type: 'automation_triggered',
    },
  ],
  addAwarenessEvent: (input) =>
    set((state) => {
      const timestamp = Date.now()
      const id = `${input.type}-${timestamp}-${Math.random().toString(16).slice(2)}`

      return {
        notifications: [
          {
            id,
            type: input.type,
            priority: input.priority,
            category: input.category,
            title: input.title,
            message: input.message,
            timestamp,
            read: false,
            source: input.source,
            relatedConversationId: input.relatedConversationId,
          },
          ...state.notifications,
        ].slice(0, 30),
        activities: [
          {
            id: `activity-${id}`,
            category: input.category,
            icon: input.icon,
            title: input.activityTitle ?? input.title,
            description: input.message,
            timestamp,
            priority: input.priority,
            source: input.source,
            type: input.type,
          },
          ...state.activities,
        ].slice(0, 40),
      }
    }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    })),
  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  clearAll: () => set({ notifications: [], activities: [] }),
}))
