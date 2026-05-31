import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { NotificationBadge } from './NotificationBadge'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from './notificationData'

function targetPath(notification: ApiNotification) {
  if (notification.targetType === 'CONVERSATION' && notification.targetId) return `/inbox?conversationId=${notification.targetId}`
  if (notification.conversationId) return `/inbox?conversationId=${notification.conversationId}`
  if (notification.targetType === 'TICKET' && notification.targetId) return `/tickets?ticketId=${notification.targetId}`
  if (notification.targetType === 'APPOINTMENT' && notification.targetId) return `/appointments?appointmentId=${notification.targetId}`
  return ''
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)

  const latest = useMemo(() => notifications.slice(0, 6), [notifications])

  function refresh() {
    if (!currentTenantId) return
    fetchUnreadNotificationsCount()
      .then((result) => setUnreadCount(result.count))
      .catch(() => setUnreadCount(0))
    fetchNotifications({ limit: 6 })
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(interval)
  }, [currentTenantId])

  async function openNotification(notification: ApiNotification) {
    if (notification.status === 'UNREAD') await markNotificationRead(notification.id)
    setOpen(false)
    const path = targetPath(notification)
    if (path) navigate(path)
    else navigate('/notifications')
  }

  async function readAll() {
    try {
      await markAllNotificationsRead()
      refresh()
      showToast('تم تعليم كل الإشعارات كمقروءة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث الإشعارات', 'warning')
    }
  }

  return (
    <div className={`notification-center ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="topbar-control notification-bell"
        onClick={() => setOpen((current) => !current)}
        aria-label="مركز الإشعارات"
        aria-expanded={open}
      >
        <Bell size={18} />
        <NotificationBadge count={unreadCount} />
      </button>

      {open ? (
        <section className="notification-panel" aria-label="مركز الإشعارات">
          <div className="notification-panel-header">
            <div>
              <strong>الإشعارات</strong>
              <small>{unreadCount.toLocaleString('ar-SA')} غير مقروء</small>
            </div>
            <div>
              <button type="button" onClick={readAll}>قراءة الكل</button>
              <button type="button" onClick={() => { setOpen(false); navigate('/notifications') }}>عرض الكل</button>
            </div>
          </div>

          <div className="notification-list api-notification-list">
            {latest.length ? latest.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`api-notification-item ${notification.status === 'UNREAD' ? 'unread' : ''}`}
                onClick={() => openNotification(notification)}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatTime(notification.createdAt)}</small>
              </button>
            )) : <p className="notification-empty">لا توجد إشعارات</p>}
          </div>
        </section>
      ) : null}
    </div>
  )
}
