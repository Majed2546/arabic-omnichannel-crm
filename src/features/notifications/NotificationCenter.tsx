import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityEvent } from './ActivityEvent'
import { NotificationBadge } from './NotificationBadge'
import { NotificationItem } from './NotificationItem'
import { useNotificationStore } from './notificationStore'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const notifications = useNotificationStore((state) => state.notifications)
  const activities = useNotificationStore((state) => state.activities)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const clearNotification = useNotificationStore((state) => state.clearNotification)
  const clearAll = useNotificationStore((state) => state.clearAll)
  const navigate = useNavigate()

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  function openConversation(conversationId: string) {
    markAllAsRead()
    setOpen(false)
    navigate(`/inbox?conversation=${conversationId}`)
  }

  return (
    <div className={`notification-center ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="topbar-control notification-bell"
        onClick={() => setOpen((current) => !current)}
        aria-label="مركز التنبيهات"
        aria-expanded={open}
      >
        <span aria-hidden="true">جرس</span>
        <NotificationBadge count={unreadCount} />
      </button>

      {open ? (
        <section className="notification-panel" aria-label="مركز التنبيهات">
          <div className="notification-panel-header">
            <div>
              <strong>مركز التنبيهات</strong>
              <small>{unreadCount} غير مقروء</small>
            </div>
            <div>
              <button type="button" onClick={markAllAsRead}>قراءة الكل</button>
              <button type="button" onClick={clearAll}>مسح</button>
              <button type="button" onClick={() => { setOpen(false); navigate('/activity') }}>السجل</button>
            </div>
          </div>

          <div className="notification-panel-grid">
            <div className="notification-list">
              {notifications.length ? (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onClear={clearNotification}
                    onOpenConversation={openConversation}
                  />
                ))
              ) : (
                <p className="notification-empty">لا توجد تنبيهات حالياً.</p>
              )}
            </div>

            <div className="activity-feed">
              <div className="activity-feed-title">
                <strong>سجل النشاط</strong>
                <small>تحديثات مباشرة</small>
              </div>
              {activities.map((event) => <ActivityEvent key={event.id} event={event} />)}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
