import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, MessageSquare, Ticket, Users, Wifi } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { getChannelLabel } from '../../shared/utils'
import { fetchPlatformCompanies, type PlatformCompany } from '../platform/platformData'
import { fetchReportsBundle, type ReportFilters, type ReportPair, type ReportsBundle, type UsageTenant } from './reportData'

const statusLabels: Record<string, string> = {
  OPEN: 'مفتوحة',
  ASSIGNED: 'مسندة',
  PENDING_CUSTOMER: 'بانتظار العميل',
  PENDING_AGENT: 'بانتظار الموظف',
  SLA_WARNING: 'تحذير SLA',
  SLA_BREACHED: 'متجاوزة SLA',
  RESOLVED: 'تم الحل',
  CLOSED: 'مغلقة',
  IN_PROGRESS: 'قيد المعالجة',
  WAITING_CUSTOMER: 'بانتظار العميل',
  SCHEDULED: 'مجدول',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
  NO_SHOW: 'لم يحضر',
  CONNECTED: 'متصل',
  PENDING: 'قيد الربط',
  DISCONNECTED: 'غير متصل',
  FAILED: 'يوجد خطأ',
  NEEDS_REVIEW: 'يحتاج مراجعة',
}

const priorityLabels: Record<string, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
}

const channelOptions = ['WHATSAPP', 'EMAIL', 'WEBCHAT', 'INSTAGRAM', 'SMS', 'X']

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString('ar-SA')
}

function labelForKey(key: string) {
  return statusLabels[key] ?? priorityLabels[key] ?? getChannelLabel(key)
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Users }) {
  return (
    <AppCard className="report-metric-card">
      <span><Icon size={18} /></span>
      <div>
        <strong>{number(value)}</strong>
        <small>{title}</small>
      </div>
    </AppCard>
  )
}

function PairList({ items, emptyLabel = 'لا توجد بيانات' }: { items: ReportPair[]; emptyLabel?: string }) {
  if (!items.length) return <EmptyState title={emptyLabel} message="ستظهر المؤشرات عند توفر بيانات ضمن الفترة المحددة." />
  return (
    <div className="report-pair-list">
      {items.map((item) => (
        <article key={item.key}>
          <span>{labelForKey(item.key)}</span>
          <strong>{number(item.count)}</strong>
        </article>
      ))}
    </div>
  )
}

function UsageTable({ tenants }: { tenants: UsageTenant[] }) {
  if (!tenants.length) return <EmptyState title="لا يوجد استخدام" message="لا توجد شركات ضمن نطاق التقرير الحالي." />
  return (
    <div className="platform-table-wrapper reports-usage-table">
      <table className="platform-table">
        <thead>
          <tr>
            <th>الشركة</th>
            <th>الباقة</th>
            <th>المستخدمون</th>
            <th>القنوات</th>
            <th>محادثات الشهر</th>
            <th>رسائل الشهر</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.tenantId}>
              <td><strong>{tenant.tenantName}</strong><small>{tenant.tenantId}</small></td>
              <td><StatusBadge label={tenant.plan} tone={tenant.plan === 'ENTERPRISE' ? 'vip' : 'info'} /></td>
              <td>{number(tenant.usersCount)} / {number(tenant.maxUsers)}</td>
              <td>{number(tenant.channelsCount)} / {number(tenant.maxChannels)}</td>
              <td>{number(tenant.monthlyConversationsCount)} / {number(tenant.monthlyConversationLimit)}</td>
              <td>{number(tenant.monthlyMessagesCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { currentTenantId, currentTenant } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN'
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [tenantId, setTenantId] = useState('')
  const [channelType, setChannelType] = useState('')
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [bundle, setBundle] = useState<ReportsBundle | null>(null)
  const [isLoading, setLoading] = useState(true)

  const filters = useMemo<ReportFilters>(() => ({
    from,
    to,
    tenantId: isSuperAdmin ? tenantId : undefined,
    channelType,
  }), [from, to, isSuperAdmin, tenantId, channelType])

  function refresh() {
    setLoading(true)
    setBundle(null)
    fetchReportsBundle(filters)
      .then(setBundle)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل التقارير', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [currentTenantId, filters])

  useEffect(() => {
    if (!isSuperAdmin) return
    fetchPlatformCompanies().then(setCompanies).catch(() => setCompanies([]))
  }, [isSuperAdmin])

  const usageTenants = bundle?.usage.platform ? bundle.usage.tenants ?? [] : bundle?.usage.tenant ? [bundle.usage.tenant] : []
  const totals = bundle?.overview.totals

  return (
    <div className="page-layout reports-page">
      <PageHeader
        title="التقارير"
        description={isSuperAdmin ? 'مؤشرات استخدام المنصة وأداء الشركات ضمن الفترة المحددة.' : `مؤشرات أداء ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'} ضمن الفترة المحددة.`}
        actions={<AppButton variant="secondary" disabled>تصدير التقرير</AppButton>}
      />

      <AppCard className="reports-filters">
        <label><span>من</span><AppInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>إلى</span><AppInput type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        {isSuperAdmin ? (
          <label>
            <span>الشركة</span>
            <AppSelect value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">كل الشركات</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </AppSelect>
          </label>
        ) : null}
        <label>
          <span>القناة</span>
          <AppSelect value={channelType} onChange={(event) => setChannelType(event.target.value)}>
            <option value="">كل القنوات</option>
            {channelOptions.map((channel) => <option key={channel} value={channel}>{getChannelLabel(channel)}</option>)}
          </AppSelect>
        </label>
      </AppCard>

      {isLoading ? <EmptyState title="جار تحميل التقارير" message="نجمع المؤشرات التشغيلية للفترة المحددة." /> : null}

      {totals ? (
        <section className="report-metric-grid">
          <MetricCard title="العملاء" value={totals.customers} icon={Users} />
          <MetricCard title="المحادثات" value={totals.conversations} icon={MessageSquare} />
          <MetricCard title="الرسائل" value={totals.messages} icon={BarChart3} />
          <MetricCard title="التذاكر المفتوحة" value={totals.openTickets} icon={Ticket} />
          <MetricCard title="المواعيد القادمة" value={totals.upcomingAppointments} icon={CalendarDays} />
          <MetricCard title="القنوات المتصلة" value={totals.connectedChannels} icon={Wifi} />
        </section>
      ) : null}

      {bundle ? (
        <>
          <section className="reports-section-grid">
            <AppCard>
              <div className="panel-header"><h2>أداء المحادثات</h2><p>{number(bundle.conversations.messagesCount)} رسالة · {number(bundle.conversations.unreadCount)} غير مقروءة</p></div>
              <PairList items={bundle.conversations.byChannel} />
              <PairList items={bundle.conversations.byStatus} />
            </AppCard>
            <AppCard>
              <div className="panel-header"><h2>أداء التذاكر</h2><p>حسب الحالة والأولوية والتصنيف.</p></div>
              <PairList items={bundle.tickets.byStatus} />
              <PairList items={bundle.tickets.byPriority} />
              <PairList items={bundle.tickets.byCategory} />
            </AppCard>
          </section>

          <section className="reports-section-grid">
            <AppCard>
              <div className="panel-header"><h2>المواعيد</h2><p>{number(bundle.appointments.upcomingAppointments)} موعد قادم · {number(bundle.appointments.noShowCount)} لم يحضر</p></div>
              <PairList items={bundle.appointments.byStatus} />
            </AppCard>
            <AppCard>
              <div className="panel-header"><h2>استخدام القنوات</h2><p>{bundle.channels.whatsappReady ? 'واتساب جاهز' : 'واتساب غير متصل'} · {number(bundle.channels.connectedChannels)} قناة متصلة</p></div>
              <PairList items={bundle.channels.byType} />
              <PairList items={bundle.channels.byStatus} />
            </AppCard>
          </section>

          <AppCard>
            <div className="panel-header split-header">
              <div>
                <h2>استخدام الاشتراك</h2>
                <p>{isSuperAdmin && !tenantId ? 'استخدام المنصة حسب الشركة.' : 'استخدام الشركة الحالية وحدود الباقة.'}</p>
              </div>
              {isSuperAdmin ? <StatusBadge label="منظور المنصة" tone="vip" /> : <StatusBadge label="منظور الشركة" tone="info" />}
            </div>
            <UsageTable tenants={usageTenants} />
          </AppCard>
        </>
      ) : null}
    </div>
  )
}
