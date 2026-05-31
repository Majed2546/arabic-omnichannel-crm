import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LOCAL_TEST_CONTEXT_EVENT } from '../../auth/localTestContext'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { NotificationBadge } from './NotificationBadge'
import {
  archiveNotification,
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
  const [panelPosition, setPanelPosition] = useState({ top: 72, right: 16 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)

  const latest = useMemo(() => notifications.slice(0, 6), [notifications])

  const refresh = useCallback(() => {
    if (!currentTenantId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    fetchUnreadNotificationsCount()
      .then((result) => setUnreadCount(result.count))
      .catch(() => setUnreadCount(0))
    fetchNotifications({ limit: 8 })
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [currentTenantId])

  const updatePanelPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const right = Math.max(12, window.innerWidth - rect.right)
    const top = rect.bottom + 10
    setPanelPosition({ top, right })
  }, [])

  useEffect(() => {
    setNotifications([])
    setUnreadCount(0)
    refresh()
    const interval = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(interval)
  }, [currentTenantId])

  useEffect(() => {
    function handleContextChange() {
      setNotifications([])
      setUnreadCount(0)
      window.setTimeout(refresh, 0)
    }

    window.addEventListener(LOCAL_TEST_CONTEXT_EVENT, handleContextChange)
    window.addEventListener('storage', handleContextChange)
    return () => {
      window.removeEventListener(LOCAL_TEST_CONTEXT_EVENT, handleContextChange)
      window.removeEventListener('storage', handleContextChange)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return
    refresh()
    updatePanelPosition()

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open, refresh, updatePanelPosition])

  async function openNotification(notification: ApiNotification) {
    if (notification.status === 'UNREAD') {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item))
      setUnreadCount((count) => Math.max(0, count - 1))
      await markNotificationRead(notification.id)
    }
    setOpen(false)
    const path = targetPath(notification)
    if (path) navigate(path)
    else navigate('/notifications')
  }

  async function markRead(notification: ApiNotification) {
    try {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item))
      if (notification.status === 'UNREAD') setUnreadCount((count) => Math.max(0, count - 1))
      await markNotificationRead(notification.id)
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تعليم الإشعار كمقروء', 'warning')
      refresh()
    }
  }

  async function archive(notification: ApiNotification) {
    try {
      setNotifications((items) => items.filter((item) => item.id !== notification.id))
      if (notification.status === 'UNREAD') setUnreadCount((count) => Math.max(0, count - 1))
      await archiveNotification(notification.id)
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر أرشفة الإشعار', 'warning')
      refresh()
    }
  }

  async function readAll() {
    try {
      setNotifications((items) => items.map((item) => ({ ...item, status: 'READ', readAt: item.readAt ?? new Date().toISOString() })))
      setUnreadCount(0)
      await markAllNotificationsRead()
      refresh()
      showToast('تم تعليم كل الإشعارات كمقروءة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث الإشعارات', 'warning')
    }
  }

  function toggleOpen() {
    updatePanelPosition()
    setOpen((current) => !current)
  }

  const panel = open ? createPortal(
    <section
      ref={panelRef}
      className="notification-panel notification-panel-portal"
      style={{ top: panelPosition.top, right: panelPosition.right }}
      aria-label="مركز الإشعارات"
    >
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
          <article
            key={notification.id}
            className={`api-notification-item ${notification.status === 'UNREAD' ? 'unread' : ''}`}
          >
            <button type="button" className="api-notification-main" onClick={() => openNotification(notification)}>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{formatTime(notification.createdAt)}</small>
            </button>
            <footer className="api-notification-actions">
              <button type="button" onClick={() => openNotification(notification)}>فتح</button>
              {notification.status === 'UNREAD' ? <button type="button" onClick={() => markRead(notification)}>تعليم كمقروء</button> : null}
              <button type="button" onClick={() => archive(notification)}>أرشفة</button>
            </footer>
          </article>
        )) : <p className="notification-empty">لا توجد إشعارات</p>}
      </div>
    </section>,
    document.body,
  ) : null

  return (
    <div className={`notification-center ${open ? 'open' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="topbar-control notification-bell"
        onClick={toggleOpen}
        aria-label="مركز الإشعارات"
        aria-expanded={open}
      >
        <Bell size={18} />
        <NotificationBadge count={unreadCount} />
      </button>
      {panel}
    </div>
  )
}
