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

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  activities: [],
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
