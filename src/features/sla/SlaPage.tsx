import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { checkSlaEscalations, fetchSlaItems, fetchSlaOverview, type SlaItem, type SlaOverview, type SlaStatus } from './slaData'

const statusLabels: Record<SlaStatus, string> = {
  ON_TRACK: 'ضمن الوقت',
  WARNING: 'تحذير',
  BREACHED: 'متأخر',
  PAUSED: 'متوقف',
  MET: 'تم الالتزام',
}

function statusTone(status: SlaStatus) {
  if (status === 'BREACHED') return 'danger'
  if (status === 'WARNING') return 'warning'
  if (status === 'MET') return 'success'
  return 'info'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير محدد'
}

const emptyOverview: SlaOverview = {
  onTrack: 0,
  warning: 0,
  breached: 0,
  met: 0,
  paused: 0,
  averageFirstResponseMinutes: 0,
  averageResolutionMinutes: 0,
}

export default function SlaPage() {
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const [overview, setOverview] = useState<SlaOverview>(emptyOverview)
  const [items, setItems] = useState<SlaItem[]>([])
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setLoading] = useState(true)

  function loadSla() {
    if (!currentTenantId) return
    setLoading(true)
    Promise.all([
      fetchSlaOverview(),
      fetchSlaItems({ type, status }),
    ])
      .then(([nextOverview, nextItems]) => {
        setOverview(nextOverview)
        setItems(nextItems)
      })
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل SLA', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setItems([])
    loadSla()
  }, [currentTenantId, type, status])

  async function runEscalationCheck() {
    try {
      const result = await checkSlaEscalations()
      showToast(`تم فحص ${result.checked.toLocaleString('ar-SA')} عنصر وإنشاء تنبيهات التصعيد عند الحاجة`, 'success')
      loadSla()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر فحص التصعيد', 'warning')
    }
  }

  return (
    <div className="page-layout sla-page">
      <PageHeader
        title="SLA والتصعيد"
        description="متابعة التزامات الرد والحل للمحادثات والتذاكر مع جاهزية تنبيهات التصعيد."
        actions={<AppButton variant="primary" onClick={runEscalationCheck}><ShieldAlert size={16} /> فحص التصعيد الآن</AppButton>}
      />

      <section className="sla-summary-grid">
        <AppCard className="sla-summary-card"><Clock3 size={18} /><span>ضمن الوقت</span><strong>{overview.onTrack.toLocaleString('ar-SA')}</strong></AppCard>
        <AppCard className="sla-summary-card warning"><AlertTriangle size={18} /><span>قريب من التأخير</span><strong>{overview.warning.toLocaleString('ar-SA')}</strong></AppCard>
        <AppCard className="sla-summary-card danger"><ShieldAlert size={18} /><span>متأخر</span><strong>{overview.breached.toLocaleString('ar-SA')}</strong></AppCard>
        <AppCard className="sla-summary-card success"><CheckCircle2 size={18} /><span>تم الالتزام</span><strong>{overview.met.toLocaleString('ar-SA')}</strong></AppCard>
      </section>

      <AppCard className="sla-filters">
        <AppSelect value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">الكل</option>
          <option value="conversation">محادثات</option>
          <option value="ticket">تذاكر</option>
        </AppSelect>
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
      </AppCard>

      <section className="sla-item-list">
        {isLoading ? <EmptyState title="جار تحميل SLA" message="نحسب الالتزامات الحالية حسب إعدادات الشركة." /> : null}
        {!isLoading && !items.length ? <EmptyState title="لا توجد عناصر SLA" message="ستظهر المحادثات والتذاكر ذات الالتزامات هنا." /> : null}
        {items.map((item) => (
          <article key={`${item.type}-${item.id}`} className="sla-item-card panel-panel">
            <div>
              <strong>{item.customer}</strong>
              <span>{item.type === 'ticket' ? 'تذكرة' : 'محادثة'} · {item.priority ?? 'عادي'}</span>
            </div>
            <StatusBadge label={statusLabels[item.status]} tone={statusTone(item.status)} />
            <div>
              <small>موعد الاستحقاق</small>
              <span>{formatDate(item.dueAt)}</span>
            </div>
            <div>
              <small>المسؤول/الفريق</small>
              <span>{item.assignedUser || item.assignedTeam || 'غير مسند'}</span>
            </div>
            <Link className="app-button app-button-secondary control-safe text-safe" to={item.type === 'ticket' ? `/tickets?ticketId=${item.id}` : `/inbox?conversationId=${item.id}`}>
              {item.type === 'ticket' ? 'فتح التذكرة' : 'فتح المحادثة'}
            </Link>
          </article>
        ))}
      </section>
    </div>
  )
}
