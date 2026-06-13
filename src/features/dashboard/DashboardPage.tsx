import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { StatCard } from '../../components/ui/StatCard'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useTenant } from '../../tenants/useTenant'

type SummaryItem = {
  label: string
  value: string | number
  hint?: string
}

type ExecutiveAppointment = {
  id: string
  title?: string | null
  customerName?: string | null
  startAt?: string | null
  status?: string | null
  meetingType?: string | null
  assignedUserName?: string | null
  assignedTeamName?: string | null
}

type ActivityItem = {
  id?: string
  title?: string | null
  content?: string | null
  status?: string | null
  senderType?: string | null
  startAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type ExecutiveSummary = {
  tenant?: {
    tenantName?: string
    plan?: string
  } | null
  kpis: {
    customers: number
    activeConversations: number
    unreadMessages: number
    openTickets: number
    upcomingAppointments: number
    slaAlerts: number
    unreadNotifications: number
    connectedChannels: number
  }
  inbox: {
    total: number
    unread: number
    pendingReply: number
    inProgress: number
    lastInboundAt?: string | null
  }
  tickets: {
    open: number
    inProgress: number
    resolved: number
    highPriority: number
    slaBreached: number
  }
  appointments: ExecutiveAppointment[]
  sla: {
    onTrack: number
    warning: number
    breached: number
    met: number
  }
  automation: {
    activeRules: number
    lastRun?: ActivityItem | null
    botEnabled: boolean
    botCreatedTickets: number
    botCreatedAppointments: number
  }
  subscription: {
    plan: string
    users: number
    maxUsers: number
    channels: number
    maxChannels: number
    monthlyConversations: number
    monthlyConversationLimit: number
    monthlyMessages: number
    monthlyMessageLimit: number
    usagePercent: number
  }
  latestActivity: {
    message?: ActivityItem | null
    ticket?: ActivityItem | null
    appointment?: ActivityItem | null
    notification?: ActivityItem | null
    automation?: ActivityItem | null
  }
}

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('ar-SA')
}

function formatDate(value?: string | null) {
  if (!value) return 'لا يوجد توقيت'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'لا يوجد توقيت'
  return date.toLocaleString('ar-SA')
}

function planLabel(plan?: string | null) {
  const labels: Record<string, string> = {
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
  }
  return labels[plan ?? ''] ?? 'غير محددة'
}

function meetingTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    IN_PERSON: 'حضوري',
    PHONE: 'اتصال',
    ONLINE: 'أونلاين',
  }
  return labels[type ?? ''] ?? 'غير محدد'
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    SCHEDULED: 'مجدول',
    CONFIRMED: 'مؤكد',
    CANCELLED: 'ملغي',
    COMPLETED: 'مكتمل',
    NO_SHOW: 'لم يحضر',
    OPEN: 'مفتوحة',
    IN_PROGRESS: 'قيد المعالجة',
    WAITING_CUSTOMER: 'بانتظار العميل',
    RESOLVED: 'تم الحل',
    CLOSED: 'مغلقة',
    SUCCESS: 'ناجح',
    FAILED: 'فشل',
    SKIPPED: 'تم التجاوز',
  }
  return labels[status ?? ''] ?? 'غير محدد'
}

function SummaryList({ items }: { items: SummaryItem[] }) {
  return (
    <ul className="summary-list executive-summary-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.value}</span>
          <small>{item.label}{item.hint ? ` · ${item.hint}` : ''}</small>
        </li>
      ))}
    </ul>
  )
}

function activityText(item: ActivityItem | null | undefined, fallback: string) {
  return item?.title ?? item?.content ?? fallback
}

async function fetchExecutiveSummary(signal: AbortSignal) {
  const response = await apiFetch(apiUrl('/reports/executive-summary'), { signal })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || 'تعذر تحميل الملخص التنفيذي')
  }
  return response.json() as Promise<ExecutiveSummary>
}

export default function DashboardPage() {
  const { currentTenant, currentTenantId } = useTenant()
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      if (!currentTenantId) return
      setIsLoading(true)
      setError(null)

      try {
        const nextSummary = await fetchExecutiveSummary(controller.signal)
        setSummary(nextSummary)
      } catch (nextError) {
        if (controller.signal.aborted) return
        setSummary(null)
        setError(nextError instanceof Error ? nextError.message : 'تعذر تحميل الملخص التنفيذي')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    setSummary(null)
    loadSummary()
    const interval = window.setInterval(loadSummary, 30_000)

    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [currentTenantId])

  const sections = useMemo(() => {
    if (!summary) return null

    const recommendations = [
      summary.kpis.unreadMessages > 0 ? 'راجع الرسائل غير المقروءة لتقليل وقت الاستجابة.' : null,
      summary.kpis.openTickets > 0 ? 'وزّع التذاكر المفتوحة على الفريق.' : null,
      summary.sla.breached > 0 ? 'راجع عناصر SLA المتأخرة فورًا.' : null,
      summary.automation.activeRules === 0 ? 'فعّل الأتمتة للمهام المتكررة.' : null,
      summary.kpis.connectedChannels === 0 ? 'راجع إعدادات القنوات لبدء استقبال المحادثات.' : null,
    ].filter((item): item is string => Boolean(item))

    return {
      kpis: [
        { label: 'العملاء', value: summary.kpis.customers },
        { label: 'المحادثات النشطة', value: summary.kpis.activeConversations },
        { label: 'الرسائل غير المقروءة', value: summary.kpis.unreadMessages },
        { label: 'التذاكر المفتوحة', value: summary.kpis.openTickets },
        { label: 'المواعيد القادمة', value: summary.kpis.upcomingAppointments },
        { label: 'تنبيهات SLA', value: summary.kpis.slaAlerts },
        { label: 'الإشعارات غير المقروءة', value: summary.kpis.unreadNotifications },
        { label: 'القنوات المتصلة', value: summary.kpis.connectedChannels },
      ],
      inbox: [
        { label: 'إجمالي المحادثات', value: summary.inbox.total },
        { label: 'غير مقروء', value: summary.inbox.unread },
        { label: 'بانتظار الرد', value: summary.inbox.pendingReply },
        { label: 'قيد المعالجة', value: summary.inbox.inProgress },
        { label: 'آخر رسالة واردة', value: summary.inbox.lastInboundAt ? formatDate(summary.inbox.lastInboundAt) : 'لا توجد رسائل واردة' },
      ],
      tickets: [
        { label: 'مفتوحة', value: summary.tickets.open },
        { label: 'قيد المعالجة', value: summary.tickets.inProgress },
        { label: 'تم الحل', value: summary.tickets.resolved },
        { label: 'عالية الأولوية', value: summary.tickets.highPriority },
        { label: 'متأخرة حسب SLA', value: summary.tickets.slaBreached },
      ],
      sla: [
        { label: 'ضمن الوقت', value: summary.sla.onTrack },
        { label: 'قريب من التأخير', value: summary.sla.warning },
        { label: 'متأخر', value: summary.sla.breached },
        { label: 'تم الالتزام', value: summary.sla.met },
      ],
      automation: [
        { label: 'قواعد الأتمتة المفعلة', value: summary.automation.activeRules },
        { label: 'آخر تنفيذ أتمتة', value: summary.automation.lastRun ? `${formatDate(summary.automation.lastRun.createdAt)} · ${statusLabel(summary.automation.lastRun.status)}` : 'لا يوجد تنفيذ' },
        { label: 'حالة وكيل واتساب الذكي', value: summary.automation.botEnabled ? 'مفعل' : 'غير مفعل' },
        { label: 'عدد التذاكر التي أنشأها الوكيل', value: summary.automation.botCreatedTickets },
        { label: 'عدد المواعيد التي أنشأها الوكيل', value: summary.automation.botCreatedAppointments },
      ],
      subscription: [
        { label: 'الباقة الحالية', value: planLabel(summary.subscription.plan) },
        { label: 'المستخدمون', value: formatNumber(summary.subscription.users), hint: `من ${formatNumber(summary.subscription.maxUsers)}` },
        { label: 'القنوات', value: formatNumber(summary.subscription.channels), hint: `من ${formatNumber(summary.subscription.maxChannels)}` },
        { label: 'محادثات الشهر', value: formatNumber(summary.subscription.monthlyConversations), hint: `من ${formatNumber(summary.subscription.monthlyConversationLimit)}` },
        { label: 'رسائل الشهر', value: formatNumber(summary.subscription.monthlyMessages), hint: `من ${formatNumber(summary.subscription.monthlyMessageLimit)}` },
        { label: 'نسبة الاستخدام', value: `${formatNumber(summary.subscription.usagePercent)}%` },
      ],
      activity: [
        { label: 'آخر رسالة', text: activityText(summary.latestActivity.message, 'لا توجد رسائل حديثة'), time: formatDate(summary.latestActivity.message?.createdAt) },
        { label: 'آخر تذكرة', text: activityText(summary.latestActivity.ticket, 'لا توجد تذاكر حديثة'), time: formatDate(summary.latestActivity.ticket?.updatedAt ?? summary.latestActivity.ticket?.createdAt) },
        { label: 'آخر موعد', text: activityText(summary.latestActivity.appointment, 'لا توجد مواعيد حديثة'), time: formatDate(summary.latestActivity.appointment?.startAt ?? summary.latestActivity.appointment?.updatedAt) },
        { label: 'آخر إشعار', text: activityText(summary.latestActivity.notification, 'لا توجد إشعارات حديثة'), time: formatDate(summary.latestActivity.notification?.createdAt) },
        { label: 'آخر تنفيذ أتمتة', text: activityText(summary.latestActivity.automation, 'لا يوجد تنفيذ أتمتة حديث'), time: formatDate(summary.latestActivity.automation?.createdAt) },
      ],
      recommendations: recommendations.length ? recommendations : ['المؤشرات مستقرة حالياً. راقب المؤشرات الرئيسية بشكل دوري.'],
    }
  }, [summary])

  if (isLoading && !summary) {
    return (
      <div className="page-layout executive-page">
        <PageHeader
          title="الملخص التنفيذي"
          description="نظرة تنفيذية على أداء العملاء، المحادثات، التذاكر، المواعيد، الأتمتة، ومستوى الخدمة داخل الشركة الحالية."
        />
        <LoadingState message="جاري تحميل الملخص التنفيذي للشركة الحالية..." />
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="page-layout executive-page">
        <PageHeader
          title="الملخص التنفيذي"
          description="نظرة تنفيذية على أداء العملاء، المحادثات، التذاكر، المواعيد، الأتمتة، ومستوى الخدمة داخل الشركة الحالية."
        />
        <ErrorState title="تعذر تحميل الملخص التنفيذي" message="تحقق من الاتصال أو صلاحيات الشركة الحالية ثم حاول مرة أخرى." />
      </div>
    )
  }

  if (!summary || !sections) {
    return (
      <div className="page-layout executive-page">
        <EmptyState title="لا توجد بيانات" message="ستظهر المؤشرات التنفيذية عند توفر بيانات داخل الشركة الحالية." />
      </div>
    )
  }

  return (
    <div className="page-layout executive-page">
      <PageHeader
        title="الملخص التنفيذي"
        description="نظرة تنفيذية على أداء العملاء، المحادثات، التذاكر، المواعيد، الأتمتة، ومستوى الخدمة داخل الشركة الحالية."
      />

      <p className="notification-empty executive-tenant-label">
        {currentTenant?.displayName ?? currentTenant?.name ?? summary.tenant?.tenantName ?? 'الشركة الحالية'}
        {isLoading ? ' · يتم تحديث البيانات...' : ''}
      </p>

      <section className="stats-grid executive-kpi-grid" aria-label="المؤشرات الرئيسية">
        {sections.kpis.map((metric) => (
          <StatCard key={metric.label} value={formatNumber(metric.value)} label={metric.label} />
        ))}
      </section>

      <section className="dashboard-grid">
        <Card>
          <PageHeader title="ملخص صندوق الوارد" />
          <SummaryList items={sections.inbox} />
        </Card>

        <Card>
          <PageHeader title="أداء التذاكر" />
          <SummaryList items={sections.tickets} />
        </Card>
      </section>

      <Card>
        <PageHeader title="المواعيد القادمة" />
        <div className="activity-feed executive-appointments">
          {summary.appointments.map((appointment) => (
            <article key={appointment.id} className="activity-item">
              <small>{appointment.customerName ?? 'عميل غير محدد'}</small>
              <p>{formatDate(appointment.startAt)} · {meetingTypeLabel(appointment.meetingType)} · {statusLabel(appointment.status)}</p>
              <small>{appointment.assignedUserName ?? appointment.assignedTeamName ?? 'لا يوجد مسؤول محدد'} · {appointment.title ?? 'موعد قادم'}</small>
            </article>
          ))}
          {!summary.appointments.length ? <p className="notification-empty">لا توجد مواعيد قادمة ضمن الشركة الحالية.</p> : null}
        </div>
      </Card>

      <section className="dashboard-grid">
        <Card>
          <PageHeader title="مستوى الخدمة SLA" />
          <SummaryList items={sections.sla} />
        </Card>

        <Card>
          <PageHeader title="الأتمتة ووكيل واتساب الذكي" />
          <SummaryList items={sections.automation} />
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card>
          <PageHeader title="استخدام الاشتراك" />
          <SummaryList items={sections.subscription} />
        </Card>

        <Card>
          <PageHeader title="توصيات تنفيذية" />
          <ul className="summary-list executive-recommendations">
            {sections.recommendations.map((recommendation) => (
              <li key={recommendation}><small>{recommendation}</small></li>
            ))}
          </ul>
        </Card>
      </section>

      <Card>
        <PageHeader title="آخر النشاط" />
        <div className="activity-feed">
          {sections.activity.map((activity) => (
            <article key={activity.label} className="activity-item">
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
