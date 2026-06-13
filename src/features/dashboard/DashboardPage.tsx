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
  title?: string
  priority?: string
  readAt?: string | null
  createdAt?: string
  updatedAt?: string
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
  priority?: string
  slaStatus?: string | null
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

type DashboardAppointment = {
  id: string
  title?: string
  customerName?: string | null
  status?: string
  meetingType?: string
  startAt?: string
  createdAt?: string
  updatedAt?: string
  description?: string | null
}

type DashboardAutomationRule = {
  id: string
  name?: string
  isActive?: boolean
  updatedAt?: string
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

type DashboardUser = {
  id: string
}

type DashboardBotSettings = {
  isEnabled?: boolean
  appointmentEnabled?: boolean
  ticketEnabled?: boolean
}

type DashboardUsageCounts = {
  usersCount?: number
  channelsCount?: number
  monthlyConversationsCount?: number
  monthlyMessagesCount?: number
}

type DashboardBillingTenant = DashboardUsageCounts & {
  tenantId?: string
  plan?: string
  maxUsers?: number
  maxChannels?: number
  monthlyConversationLimit?: number
  monthlyMessageLimit?: number
  usage?: DashboardUsageCounts
}

type DashboardBillingUsage = {
  platform?: boolean
  tenant?: DashboardBillingTenant | null
  tenants?: DashboardBillingTenant[]
}

type SummaryItem = {
  label: string
  value: string | number
  hint?: string
}

async function fetchItems<T>(path: string): Promise<T[]> {
  const response = await apiFetch(apiUrl(path))
  if (!response.ok) return []
  return unwrapItems<T>(await response.json())
}

async function fetchOne<T>(path: string): Promise<T | null> {
  const response = await apiFetch(apiUrl(path))
  if (!response.ok) return null
  return response.json() as Promise<T>
}

function formatDate(value?: string | null) {
  if (!value) return 'لا يوجد توقيت'
  return new Date(value).toLocaleString('ar-SA')
}

function latestByDate<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items]
    .filter((item) => getDate(item))
    .sort((first, second) => new Date(getDate(second) ?? 0).getTime() - new Date(getDate(first) ?? 0).getTime())[0]
}

function countByStatus<T extends { status?: string }>(items: T[], statuses: string[]) {
  return items.filter((item) => statuses.includes(item.status ?? '')).length
}

function percent(used: number, limit?: number) {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function meetingTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    IN_PERSON: 'حضوري',
    PHONE: 'اتصال',
    ONLINE: 'أونلاين',
  }
  return labels[type ?? ''] ?? 'غير محدد'
}

function appointmentStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'مجدول',
    CONFIRMED: 'مؤكد',
    CANCELLED: 'ملغي',
    COMPLETED: 'مكتمل',
    NO_SHOW: 'لم يحضر',
  }
  return labels[status ?? ''] ?? 'غير محدد'
}

function planLabel(plan?: string) {
  const labels: Record<string, string> = {
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
  }
  return labels[plan ?? ''] ?? 'غير محددة'
}

function SummaryList({ items }: { items: SummaryItem[] }) {
  return (
    <ul className="summary-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.value}</span>
          <small>{item.label}{item.hint ? ` · ${item.hint}` : ''}</small>
        </li>
      ))}
    </ul>
  )
}

export default function DashboardPage() {
  const { currentTenant, currentTenantId } = useTenant()
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [channels, setChannels] = useState<DashboardChannel[]>([])
  const [tickets, setTickets] = useState<DashboardTicket[]>([])
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([])
  const [automationRules, setAutomationRules] = useState<DashboardAutomationRule[]>([])
  const [automationLogs, setAutomationLogs] = useState<DashboardAutomationLog[]>([])
  const [customers, setCustomers] = useState<DashboardCustomer[]>([])
  const [users, setUsers] = useState<DashboardUser[]>([])
  const [botSettings, setBotSettings] = useState<DashboardBotSettings | null>(null)
  const [billingUsage, setBillingUsage] = useState<DashboardBillingUsage | null>(null)

  useEffect(() => {
    let disposed = false
    setConversations([])
    setNotifications([])
    setChannels([])
    setTickets([])
    setAppointments([])
    setAutomationRules([])
    setAutomationLogs([])
    setCustomers([])
    setUsers([])
    setBotSettings(null)
    setBillingUsage(null)

    async function loadDashboard() {
      if (!currentTenantId) return
      const [
        nextConversations,
        nextNotifications,
        nextChannels,
        nextTickets,
        nextAppointments,
        nextAutomationRules,
        nextAutomationLogs,
        nextCustomers,
        nextUsers,
        nextBotSettings,
        nextBillingUsage,
      ] = await Promise.all([
        fetchItems<DashboardConversation>('/conversations?limit=100'),
        fetchItems<DashboardNotification>('/notifications'),
        fetchItems<DashboardChannel>('/channels'),
        fetchItems<DashboardTicket>('/tickets'),
        fetchItems<DashboardAppointment>('/appointments'),
        fetchItems<DashboardAutomationRule>('/automation/rules'),
        fetchItems<DashboardAutomationLog>('/automation/logs'),
        fetchItems<DashboardCustomer>('/customers?limit=100'),
        fetchItems<DashboardUser>('/users'),
        fetchOne<DashboardBotSettings>('/bot/settings'),
        fetchOne<DashboardBillingUsage>('/billing/usage'),
      ])

      if (disposed) return
      setConversations(nextConversations)
      setNotifications(nextNotifications)
      setChannels(nextChannels)
      setTickets(nextTickets)
      setAppointments(nextAppointments)
      setAutomationRules(nextAutomationRules)
      setAutomationLogs(nextAutomationLogs)
      setCustomers(nextCustomers)
      setUsers(nextUsers)
      setBotSettings(nextBotSettings)
      setBillingUsage(nextBillingUsage)
    }

    loadDashboard()
    const interval = window.setInterval(loadDashboard, 10_000)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [currentTenantId])

  const metrics = useMemo(() => {
    const now = Date.now()
    const activeConversations = conversations.filter((conversation) =>
      !['CLOSED', 'RESOLVED'].includes(conversation.status ?? ''),
    )
    const unreadMessages = conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0)
    const pendingReply = countByStatus(conversations, ['OPEN', 'NEW', 'PENDING_AGENT', 'SLA_WARNING', 'SLA_BREACHED'])
    const inProgressConversations = countByStatus(conversations, ['IN_PROGRESS', 'ASSIGNED'])
    const connectedChannels = channels.filter((channel) =>
      ['ACTIVE', 'CONNECTED'].includes(channel.status ?? ''),
    ).length
    const openTickets = tickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status ?? '')).length
    const resolvedTickets = countByStatus(tickets, ['RESOLVED', 'CLOSED'])
    const inProgressTickets = countByStatus(tickets, ['IN_PROGRESS'])
    const highPriorityTickets = tickets.filter((ticket) => ['HIGH', 'URGENT'].includes(ticket.priority ?? '')).length
    const slaWarning = tickets.filter((ticket) => ticket.slaStatus === 'WARNING').length +
      conversations.filter((conversation) => conversation.status === 'SLA_WARNING').length
    const slaBreached = tickets.filter((ticket) => ticket.slaStatus === 'BREACHED').length +
      conversations.filter((conversation) => conversation.status === 'SLA_BREACHED').length
    const slaAlerts = slaWarning + slaBreached
    const slaOnTrack = tickets.filter((ticket) => ['ON_TRACK', 'PAUSED'].includes(ticket.slaStatus ?? '')).length
    const slaMet = tickets.filter((ticket) => ticket.slaStatus === 'MET').length
    const upcomingAppointments = appointments
      .filter((appointment) =>
        !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status ?? '') &&
        new Date(appointment.startAt ?? appointment.createdAt ?? now).getTime() >= now,
      )
      .sort((first, second) => new Date(first.startAt ?? first.createdAt ?? now).getTime() - new Date(second.startAt ?? second.createdAt ?? now).getTime())
    const latestConversation = latestByDate(conversations, (conversation) =>
      conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
    )
    const latestTicket = latestByDate(tickets, (ticket) => ticket.updatedAt ?? ticket.createdAt)
    const latestAppointment = latestByDate(appointments, (appointment) => appointment.startAt ?? appointment.updatedAt)
    const latestNotification = latestByDate(notifications, (notification) => notification.updatedAt ?? notification.createdAt)
    const latestAutomationLog = latestByDate(automationLogs, (log) => log.createdAt)
    const latestAutomationRule = latestByDate(automationRules, (rule) => rule.updatedAt)
    const activeAutomationRules = automationRules.filter((rule) => rule.isActive).length
    const botCreatedTickets = tickets.filter((ticket) =>
      ticket.tags?.some((tag) => ['وكيل آلي', 'whatsapp-bot', 'bot'].includes(tag)),
    ).length
    const botCreatedAppointments = appointments.filter((appointment) =>
      appointment.description?.includes('وكيل واتساب') || appointment.title?.includes('وكيل واتساب'),
    ).length
    const usageTenant = billingUsage?.tenant ?? billingUsage?.tenants?.find((tenant) => tenant.tenantId === currentTenantId) ?? billingUsage?.tenants?.[0]
    const usage = usageTenant?.usage ?? usageTenant
    const monthlyConversations = Number(usage?.monthlyConversationsCount ?? conversations.length)
    const monthlyMessages = Number(usage?.monthlyMessagesCount ?? unreadMessages)
    const monthlyConversationLimit = Number(usageTenant?.monthlyConversationLimit ?? 0)
    const monthlyMessageLimit = Number(usageTenant?.monthlyMessageLimit ?? 0)
    const usagePercent = Math.max(percent(monthlyConversations, monthlyConversationLimit), percent(monthlyMessages, monthlyMessageLimit))
    const recommendations = [
      unreadMessages > 10 ? 'راجع الرسائل غير المقروءة لتقليل وقت الاستجابة.' : null,
      openTickets > 10 ? 'وزّع التذاكر على الفريق.' : null,
      slaBreached > 0 ? 'راجع عناصر SLA المتأخرة.' : null,
      activeAutomationRules === 0 ? 'فعّل الأتمتة للمهام المتكررة.' : null,
    ].filter((item): item is string => Boolean(item))

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
        { label: 'بانتظار الرد', value: pendingReply },
        { label: 'قيد المعالجة', value: inProgressConversations },
        { label: 'آخر رسالة واردة', value: latestConversation ? formatDate(latestConversation.lastMessageAt ?? latestConversation.updatedAt ?? latestConversation.createdAt) : 'لا توجد رسائل' },
      ],
      ticketPerformance: [
        { label: 'مفتوحة', value: openTickets },
        { label: 'قيد المعالجة', value: inProgressTickets },
        { label: 'تم الحل', value: resolvedTickets },
        { label: 'عالية الأولوية', value: highPriorityTickets },
        { label: 'متأخرة حسب SLA', value: slaBreached },
      ],
      slaSummary: [
        { label: 'ضمن الوقت', value: slaOnTrack },
        { label: 'قريب من التأخير', value: slaWarning },
        { label: 'متأخر', value: slaBreached },
        { label: 'تم الالتزام', value: slaMet },
      ],
      automationSummary: [
        { label: 'قواعد الأتمتة المفعلة', value: activeAutomationRules },
        { label: 'آخر تنفيذ أتمتة', value: latestAutomationLog ? formatDate(latestAutomationLog.createdAt) : 'لا يوجد تنفيذ' },
        { label: 'حالة وكيل واتساب الذكي', value: botSettings?.isEnabled ? 'مفعل' : 'غير مفعل' },
        { label: 'تذاكر/مواعيد أنشأها الوكيل', value: botCreatedTickets + botCreatedAppointments },
      ],
      subscriptionUsage: [
        { label: 'الباقة الحالية', value: planLabel(usageTenant?.plan) },
        { label: 'المستخدمون', value: Number(usage?.usersCount ?? users.length), hint: usageTenant?.maxUsers ? `من ${usageTenant.maxUsers}` : undefined },
        { label: 'القنوات', value: Number(usage?.channelsCount ?? channels.length), hint: usageTenant?.maxChannels ? `من ${usageTenant.maxChannels}` : undefined },
        { label: 'محادثات الشهر', value: monthlyConversations, hint: monthlyConversationLimit ? `من ${monthlyConversationLimit}` : undefined },
        { label: 'رسائل الشهر', value: monthlyMessages, hint: monthlyMessageLimit ? `من ${monthlyMessageLimit}` : undefined },
        { label: 'نسبة الاستخدام', value: `${usagePercent}%` },
      ],
      recentActivity: [
        {
          id: 'latest-conversation',
          label: 'آخر محادثة',
          text: latestConversation ? `محادثة ${latestConversation.status ?? 'نشطة'}` : 'لا توجد محادثات حديثة',
          time: formatDate(latestConversation?.lastMessageAt ?? latestConversation?.updatedAt ?? latestConversation?.createdAt),
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
          id: 'latest-notification',
          label: 'آخر إشعار',
          text: latestNotification?.title ?? 'لا توجد إشعارات حديثة',
          time: formatDate(latestNotification?.updatedAt ?? latestNotification?.createdAt),
        },
        {
          id: 'latest-automation-rule',
          label: 'آخر قاعدة أتمتة',
          text: latestAutomationRule?.name ?? 'لا توجد قواعد أتمتة',
          time: formatDate(latestAutomationRule?.updatedAt),
        },
      ],
      recommendations: recommendations.length ? recommendations : ['المؤشرات مستقرة حالياً. راقب المؤشرات الرئيسية بشكل دوري.'],
    }
  }, [appointments, automationLogs, automationRules, billingUsage, botSettings, channels, conversations, currentTenantId, customers, notifications, tickets, users])

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
          <StatCard value={metrics.customers} label="العملاء" />
          <StatCard value={metrics.activeConversations} label="المحادثات النشطة" />
          <StatCard value={metrics.unreadMessages} label="الرسائل غير المقروءة" />
          <StatCard value={metrics.openTickets} label="التذاكر المفتوحة" />
          <StatCard value={metrics.upcomingAppointments.length} label="المواعيد القادمة" />
          <StatCard value={metrics.slaAlerts} label="تنبيهات SLA" />
          <StatCard value={metrics.connectedChannels} label="القنوات المتصلة" />
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <PageHeader title="ملخص صندوق الوارد" />
          <SummaryList items={metrics.inboxSummary} />
        </Card>

        <Card>
          <PageHeader title="أداء التذاكر" />
          <SummaryList items={metrics.ticketPerformance} />
        </Card>
      </div>

      <Card>
        <PageHeader title="المواعيد القادمة" />
        <div className="activity-feed">
          {metrics.upcomingAppointments.slice(0, 3).map((appointment) => (
            <article key={appointment.id} className="activity-item">
              <small>{appointment.customerName ?? 'عميل غير محدد'}</small>
              <p>{appointment.title ?? 'موعد قادم'}</p>
              <small>{formatDate(appointment.startAt)} · {meetingTypeLabel(appointment.meetingType)} · {appointmentStatusLabel(appointment.status)}</small>
            </article>
          ))}
          {!metrics.upcomingAppointments.length ? <p className="notification-empty">لا توجد مواعيد قادمة ضمن الشركة الحالية.</p> : null}
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <PageHeader title="SLA ومستوى الخدمة" />
          <SummaryList items={metrics.slaSummary} />
        </Card>

        <Card>
          <PageHeader title="الأتمتة والوكيل الذكي" />
          <SummaryList items={metrics.automationSummary} />
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <PageHeader title="استخدام الاشتراك" />
          <SummaryList items={metrics.subscriptionUsage} />
        </Card>

        <Card>
          <PageHeader title="توصيات تنفيذية" />
          <ul className="summary-list">
            {metrics.recommendations.map((recommendation) => (
              <li key={recommendation}><small>{recommendation}</small></li>
            ))}
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
