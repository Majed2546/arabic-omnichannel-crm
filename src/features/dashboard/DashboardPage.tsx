import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useTenant } from '../../tenants/useTenant'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'

type DashboardConversation = {
  id: string
  status?: string
  priority?: string
  unreadCount?: number
  channel?: { type?: string } | null
  createdAt?: string
  updatedAt?: string
  lastMessageAt?: string | null
}

type DashboardNotification = {
  id: string
  priority?: string
  readAt?: string | null
}

type DashboardChannel = {
  id: string
  type?: string
  status?: string
}

type DashboardTicket = {
  id: string
  title?: string
  status?: string
  slaStatus?: string | null
  createdAt?: string
  updatedAt?: string
}

type DashboardAppointment = {
  id: string
  title?: string
  status?: string
  startAt?: string
  createdAt?: string
  updatedAt?: string
}

type DashboardMeeting = {
  id: string
  status?: string
}

type DashboardAutomationLog = {
  id: string
  ruleName?: string | null
  status?: string
  createdAt?: string
}

type DashboardCustomer = {
  id: string
}

async function fetchItems<T>(path: string): Promise<T[]> {
  const response = await apiFetch(apiUrl(path))
  if (!response.ok) return []
  return unwrapItems<T>(await response.json())
}

function formatDate(value?: string | null) {
  if (!value) return 'لا يوجد توقيت'
  return new Date(value).toLocaleString('ar-SA')
}

function getStatusCount<T extends { status?: string }>(items: T[], status: string) {
  return items.filter((item) => item.status === status).length
}

function latestByDate<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items]
    .filter((item) => getDate(item))
    .sort((first, second) => new Date(getDate(second) ?? 0).getTime() - new Date(getDate(first) ?? 0).getTime())[0]
}

export default function DashboardPage() {
  const { currentTenant, currentTenantId } = useTenant()
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [channels, setChannels] = useState<DashboardChannel[]>([])
  const [tickets, setTickets] = useState<DashboardTicket[]>([])
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([])
  const [meetings, setMeetings] = useState<DashboardMeeting[]>([])
  const [automationLogs, setAutomationLogs] = useState<DashboardAutomationLog[]>([])
  const [customers, setCustomers] = useState<DashboardCustomer[]>([])

  useEffect(() => {
    let disposed = false
    setConversations([])
    setNotifications([])
    setChannels([])
    setTickets([])
    setAppointments([])
    setMeetings([])
    setAutomationLogs([])
    setCustomers([])

    async function loadDashboard() {
      if (!currentTenantId) return
      const [
        nextConversations,
        nextNotifications,
        nextChannels,
        nextTickets,
        nextAppointments,
        nextMeetings,
        nextAutomationLogs,
        nextCustomers,
      ] = await Promise.all([
        fetchItems<DashboardConversation>('/conversations?limit=100'),
        fetchItems<DashboardNotification>('/notifications'),
        fetchItems<DashboardChannel>('/channels'),
        fetchItems<DashboardTicket>('/tickets'),
        fetchItems<DashboardAppointment>('/appointments'),
        fetchItems<DashboardMeeting>('/meetings'),
        fetchItems<DashboardAutomationLog>('/automation/logs'),
        fetchItems<DashboardCustomer>('/customers?limit=100'),
      ])

      if (disposed) return
      setConversations(nextConversations)
      setNotifications(nextNotifications)
      setChannels(nextChannels)
      setTickets(nextTickets)
      setAppointments(nextAppointments)
      setMeetings(nextMeetings)
      setAutomationLogs(nextAutomationLogs)
      setCustomers(nextCustomers)
    }

    loadDashboard()
    const interval = window.setInterval(loadDashboard, 10_000)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [currentTenantId])

  const metrics = useMemo(() => {
    const activeConversations = conversations.filter((conversation) =>
      !['CLOSED', 'RESOLVED'].includes(conversation.status ?? ''),
    )
    const unreadMessages = conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0)
    const unreadNotifications = notifications.filter((notification) => !notification.readAt).length
    const connectedChannels = channels.filter((channel) =>
      ['ACTIVE', 'CONNECTED'].includes(channel.status ?? ''),
    ).length
    const openTickets = tickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status ?? '')).length
    const now = Date.now()
    const upcomingAppointments = appointments.filter((appointment) =>
      !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status ?? '') &&
      new Date(appointment.startAt ?? appointment.createdAt ?? now).getTime() >= now,
    ).length
    const slaWarning = tickets.filter((ticket) => ticket.slaStatus === 'WARNING').length +
      conversations.filter((conversation) => conversation.status === 'SLA_WARNING').length
    const slaBreached = tickets.filter((ticket) => ticket.slaStatus === 'BREACHED').length +
      conversations.filter((conversation) => conversation.status === 'SLA_BREACHED').length
    const slaAlerts = slaWarning + slaBreached
    const slaOnTrack = tickets.filter((ticket) => ['ON_TRACK', 'PAUSED'].includes(ticket.slaStatus ?? '')).length
    const slaMet = tickets.filter((ticket) => ticket.slaStatus === 'MET').length
    const latestMessage = latestByDate(conversations, (conversation) =>
      conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
    )
    const latestTicket = latestByDate(tickets, (ticket) => ticket.updatedAt ?? ticket.createdAt)
    const latestAppointment = latestByDate(appointments, (appointment) => appointment.startAt ?? appointment.updatedAt)
    const latestAutomation = latestByDate(automationLogs, (log) => log.createdAt)

    return {
      activeConversations: activeConversations.length,
      unreadMessages,
      customers: customers.length,
      openTickets,
      upcomingAppointments,
      slaAlerts,
      connectedChannels,
      inboxSummary: [
        { label: 'إجمالي المحادثات', value: conversations.length },
        { label: 'غير مقروء', value: unreadMessages },
        { label: 'تنبيهات', value: unreadNotifications + slaAlerts },
        { label: 'القنوات', value: connectedChannels },
      ],
      ticketStatuses: [
        { label: 'مفتوحة', value: getStatusCount(tickets, 'OPEN') },
        { label: 'قيد المعالجة', value: getStatusCount(tickets, 'IN_PROGRESS') },
        { label: 'بانتظار العميل', value: getStatusCount(tickets, 'WAITING_CUSTOMER') },
        { label: 'محلولة', value: getStatusCount(tickets, 'RESOLVED') },
        { label: 'مغلقة', value: getStatusCount(tickets, 'CLOSED') },
      ],
      operatingSummary: [
        { label: 'المواعيد القادمة', value: upcomingAppointments },
        { label: 'الاجتماعات المرئية', value: meetings.filter((meeting) => !['CANCELLED', 'COMPLETED'].includes(meeting.status ?? '')).length },
        { label: 'الأتمتة المنفذة', value: automationLogs.filter((log) => log.status === 'SUCCESS').length },
      ],
      slaSummary: [
        { label: 'ضمن الوقت', value: slaOnTrack },
        { label: 'قريب من التأخير', value: slaWarning },
        { label: 'متأخر', value: slaBreached },
        { label: 'تم الالتزام', value: slaMet },
      ],
      recentActivity: [
        {
          id: 'latest-message',
          label: 'آخر رسالة',
          text: latestMessage ? `محادثة ${latestMessage.status ?? 'نشطة'}` : 'لا توجد رسائل حديثة',
          time: formatDate(latestMessage?.lastMessageAt ?? latestMessage?.updatedAt ?? latestMessage?.createdAt),
        },
        {
          id: 'latest-ticket',
          label: 'آخر تذكرة',
          text: latestTicket?.title ?? 'لا توجد تذاكر حديثة',
          time: formatDate(latestTicket?.updatedAt ?? latestTicket?.createdAt),
        },
        {
          id: 'latest-appointment',
          label: 'آخر موعد',
          text: latestAppointment?.title ?? 'لا توجد مواعيد حديثة',
          time: formatDate(latestAppointment?.startAt ?? latestAppointment?.updatedAt),
        },
        {
          id: 'latest-automation',
          label: 'آخر أتمتة',
          text: latestAutomation?.ruleName ?? 'لا توجد أتمتة حديثة',
          time: formatDate(latestAutomation?.createdAt),
        },
      ],
      channelsByType: Array.from(
        channels.reduce((counts, channel) => {
          const type = channel.type || 'غير محدد'
          counts.set(type, (counts.get(type) ?? 0) + 1)
          return counts
        }, new Map<string, number>()),
      ).map(([name, count]) => ({ name, count })),
    }
  }, [appointments, automationLogs, channels, conversations, customers, meetings, notifications, tickets])

  return (
    <div className="page-layout">
      <Card>
        <PageHeader
          title="الملخص التنفيذي"
          description="نظرة تنفيذية على أداء العملاء، المحادثات، التذاكر، المواعيد، الأتمتة، ومستوى الخدمة داخل الشركة الحالية."
        />
        <p className="notification-empty">{currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'}</p>
      </Card>

      <Card>
        <PageHeader title="المؤشرات الرئيسية" />
        <div className="stats-grid">
          <StatCard value={metrics.activeConversations} label="المحادثات النشطة" />
          <StatCard value={metrics.unreadMessages} label="الرسائل غير المقروءة" />
          <StatCard value={metrics.customers} label="العملاء" />
          <StatCard value={metrics.openTickets} label="التذاكر المفتوحة" />
          <StatCard value={metrics.upcomingAppointments} label="المواعيد القادمة" />
          <StatCard value={metrics.slaAlerts} label="تنبيهات SLA" />
          <StatCard value={metrics.connectedChannels} label="القنوات المتصلة" />
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <PageHeader title="ملخص صندوق الوارد" />
          <ul className="summary-list">
            {metrics.inboxSummary.map((item) => (
              <li key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </li>
            ))}
          </ul>
          <div className="chart-card">
            <h3>القنوات</h3>
            <ul className="channel-list">
              {metrics.channelsByType.map((channel) => (
                <li key={channel.name}>
                  <p>{channel.name}</p>
                  <div className="progress-bar">
                    <span style={{ width: channels.length ? `${Math.min(100, (channel.count / channels.length) * 100)}%` : '0%' }} />
                  </div>
                  <strong>{channel.count}</strong>
                </li>
              ))}
              {!metrics.channelsByType.length ? <li><p>لا توجد قنوات مسجلة</p><strong>0</strong></li> : null}
            </ul>
          </div>
        </Card>

        <Card>
          <PageHeader title="مؤشرات التشغيل" />
          <ul className="summary-list">
            {metrics.operatingSummary.map((item) => (
              <li key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </li>
            ))}
          </ul>
          <div className="chart-card">
            <h3>التذاكر حسب الحالة</h3>
            <ul className="channel-list">
              {metrics.ticketStatuses.map((status) => (
                <li key={status.label}>
                  <p>{status.label}</p>
                  <div className="progress-bar">
                    <span style={{ width: tickets.length ? `${Math.min(100, (status.value / tickets.length) * 100)}%` : '0%' }} />
                  </div>
                  <strong>{status.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <PageHeader title="مستوى الخدمة SLA" />
          <ul className="summary-list">
            {metrics.slaSummary.map((item) => (
              <li key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <PageHeader title="توصيات تنفيذية" />
          <ul className="summary-list">
            <li><small>راقب المحادثات غير المقروءة لتقليل وقت الاستجابة.</small></li>
            <li><small>راجع التذاكر المتأخرة لتحسين مستوى الخدمة.</small></li>
            <li><small>فعّل الأتمتة للمهام المتكررة.</small></li>
          </ul>
        </Card>
      </div>

      <Card>
        <PageHeader title="آخر النشاط" />
        <div className="activity-feed">
          {metrics.recentActivity.map((activity) => (
            <article key={activity.id} className="activity-item">
              <small>{activity.label}</small>
              <p>{activity.text}</p>
              <small>{activity.time}</small>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
