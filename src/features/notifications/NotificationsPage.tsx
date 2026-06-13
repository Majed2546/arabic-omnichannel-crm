import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Eye, Inbox, Trash2 } from 'lucide-react'
import { LOCAL_TEST_CONTEXT_EVENT } from '../../auth/localTestContext'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import {
  archiveNotification,
  createTestNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
  type ApiNotificationPriority,
  type ApiNotificationType,
} from './notificationData'

const typeLabels: Record<ApiNotificationType, string> = {
  NEW_MESSAGE: 'رسالة جديدة',
  CONVERSATION_ASSIGNED: 'إسناد محادثة',
  TICKET_CREATED: 'تذكرة جديدة',
  TICKET_ASSIGNED: 'إسناد تذكرة',
  APPOINTMENT_UPCOMING: 'موعد قريب',
  SLA_WARNING: 'تحذير SLA',
  SLA_BREACHED: 'تجاوز SLA',
  MESSAGE_SEND_FAILED: 'فشل إرسال رسالة',
  SUBSCRIPTION_WARNING: 'تنبيه اشتراك',
  AUTOMATION_EXECUTED: 'تنفيذ أتمتة',
}

const priorityLabels: Record<ApiNotificationPriority, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
  INFO: 'معلومة',
  WARNING: 'تحذير',
  CRITICAL: 'حرجة',
}

function priorityTone(priority: ApiNotificationPriority) {
  if (priority === 'URGENT' || priority === 'CRITICAL') return 'danger'
  if (priority === 'HIGH' || priority === 'WARNING') return 'warning'
  if (priority === 'MEDIUM' || priority === 'INFO') return 'info'
  return 'muted'
}

function targetPath(notification: ApiNotification) {
  if (notification.targetType === 'CONVERSATION' && notification.targetId) return `/inbox?conversationId=${notification.targetId}`
  if (notification.conversationId) return `/inbox?conversationId=${notification.conversationId}`
  if (notification.targetType === 'TICKET' && notification.targetId) return `/tickets?ticketId=${notification.targetId}`
  if (notification.targetType === 'APPOINTMENT' && notification.targetId) return `/appointments?appointmentId=${notification.targetId}`
  return ''
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [filter, setFilter] = useState('all')
  const [type, setType] = useState('')
  const [isLoading, setLoading] = useState(true)
  const canManage = can('notifications.manage')

  const filters = useMemo(() => {
    if (filter === 'unread') return { status: 'UNREAD', type }
    if (filter === 'high') return { priority: 'HIGH', type }
    return { type }
  }, [filter, type])

  function loadNotifications() {
    if (!currentTenantId) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchNotifications(filters)
      .then(setNotifications)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل الإشعارات', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setNotifications([])
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 15_000)
    return () => window.clearInterval(interval)
  }, [currentTenantId, filters])

  useEffect(() => {
    function handleContextChange() {
      setNotifications([])
      window.setTimeout(loadNotifications, 0)
    }

    window.addEventListener(LOCAL_TEST_CONTEXT_EVENT, handleContextChange)
    window.addEventListener('storage', handleContextChange)
    return () => {
      window.removeEventListener(LOCAL_TEST_CONTEXT_EVENT, handleContextChange)
      window.removeEventListener('storage', handleContextChange)
    }
  }, [filters, currentTenantId])

  async function markRead(notification: ApiNotification) {
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item))
    try {
      await markNotificationRead(notification.id)
      loadNotifications()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تعليم الإشعار كمقروء', 'warning')
      loadNotifications()
    }
  }

  async function archive(notification: ApiNotification) {
    setNotifications((items) => items.filter((item) => item.id !== notification.id))
    try {
      await archiveNotification(notification.id)
      loadNotifications()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر أرشفة الإشعار', 'warning')
      loadNotifications()
    }
  }

  async function openNotification(notification: ApiNotification) {
    if (notification.status === 'UNREAD') {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item))
      await markNotificationRead(notification.id)
    }
    const path = targetPath(notification)
    if (path) navigate(path)
    else loadNotifications()
  }

  async function readAll() {
    setNotifications((items) => items.map((item) => ({ ...item, status: 'READ', readAt: item.readAt ?? new Date().toISOString() })))
    try {
      await markAllNotificationsRead()
      loadNotifications()
      showToast('تم تعليم كل الإشعارات كمقروءة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث الإشعارات', 'warning')
      loadNotifications()
    }
  }

  async function testNotification() {
    await createTestNotification()
    loadNotifications()
    showToast('تم إنشاء إشعار تجريبي', 'success')
  }

  return (
    <div className="page-layout notifications-page">
      <PageHeader
        title="الإشعارات"
        description="مركز داخلي لتنبيهات الرسائل، الإسناد، التذاكر، SLA، والأتمتة داخل الشركة الحالية."
        actions={(
          <>
            <AppButton variant="secondary" onClick={readAll}><CheckCheck size={16} /> تعليم الكل كمقروء</AppButton>
            {canManage ? <AppButton variant="primary" onClick={testNotification}><Bell size={16} /> إشعار تجريبي</AppButton> : null}
          </>
        )}
      />

      <AppCard className="notifications-filters">
        <AppSelect value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">الكل</option>
          <option value="unread">غير مقروء</option>
          <option value="high">عالي الأهمية</option>
        </AppSelect>
        <AppSelect value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">كل الأنواع</option>
          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
      </AppCard>

      <section className="notifications-list">
        {isLoading ? <EmptyState title="جار تحميل الإشعارات" message="نراجع آخر التنبيهات التشغيلية." /> : null}
        {!isLoading && !notifications.length ? <EmptyState title="لا توجد إشعارات" message="ستظهر التنبيهات الداخلية هنا عند حدوث أحداث مهمة." /> : null}
        {notifications.map((notification) => (
          <article key={notification.id} className={`notification-row panel-panel ${notification.status === 'UNREAD' ? 'unread' : ''}`}>
            <div className="notification-row-icon"><Inbox size={18} /></div>
            <div>
              <header>
                <strong>{notification.title}</strong>
                <span>{formatTime(notification.createdAt)}</span>
              </header>
              <p>{notification.message}</p>
              <div className="notification-row-meta">
                <StatusBadge label={typeLabels[notification.type] ?? notification.type} tone="info" />
                <StatusBadge label={priorityLabels[notification.priority] ?? notification.priority} tone={priorityTone(notification.priority)} />
                <StatusBadge label={notification.status === 'UNREAD' ? 'غير مقروء' : 'مقروء'} tone={notification.status === 'UNREAD' ? 'warning' : 'muted'} />
              </div>
            </div>
            <footer>
              {targetPath(notification) ? <AppButton variant="ghost" onClick={() => openNotification(notification)}><Eye size={15} /> فتح</AppButton> : null}
              {notification.status === 'UNREAD' ? <AppButton variant="ghost" onClick={() => markRead(notification)}>تعليم كمقروء</AppButton> : null}
              <AppButton variant="ghost" onClick={() => archive(notification)}><Trash2 size={15} /> أرشفة</AppButton>
            </footer>
          </article>
        ))}
      </section>
    </div>
  )
}
