import { useEffect, useMemo, useState } from 'react'
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
  fetchBillingPlans,
  fetchBillingUsage,
  updateTenantBillingPlan,
  updateTenantBillingStatus,
  type BillingPlan,
  type BillingPlanId,
  type BillingStatus,
  type BillingUsage,
} from './billingData'

const planLabels: Record<BillingPlanId, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
}

const statusLabels: Record<string, string> = {
  TRIAL: 'تجربة',
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
  CANCELLED: 'ملغي',
  INACTIVE: 'غير نشط',
  ARCHIVED: 'مؤرشف',
}

function statusTone(status: BillingStatus) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'TRIAL') return 'info'
  if (status === 'SUSPENDED') return 'warning'
  if (status === 'CANCELLED') return 'danger'
  return 'muted'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ar-SA') : 'غير محدد'
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString('ar-SA')
}

function ratio(current: number, limit: number) {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((current / limit) * 100))
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const value = ratio(current, limit)
  const tone = value >= 100 ? 'danger' : value >= 80 ? 'warning' : 'ok'
  return (
    <div className="billing-usage-bar">
      <div>
        <span>{label}</span>
        <strong>{number(current)} / {number(limit)}</strong>
      </div>
      <progress value={value} max={100} className={tone} />
      {tone === 'warning' ? <small>اقتربت من الحد</small> : null}
      {tone === 'danger' ? <small>تم تجاوز الحد</small> : null}
    </div>
  )
}

function SubscriptionCard({ usage }: { usage: BillingUsage }) {
  return (
    <AppCard className="billing-current-card">
      <div className="panel-header split-header">
        <div>
          <h2>{usage.tenantName}</h2>
          <p>{planLabels[usage.plan]} · بداية الاشتراك {formatDate(usage.subscriptionStart)} · نهاية الاشتراك {formatDate(usage.subscriptionEnd)}</p>
        </div>
        <StatusBadge label={statusLabels[usage.status] ?? usage.status} tone={statusTone(usage.status)} />
      </div>
      <div className="billing-usage-grid">
        <UsageBar label="المستخدمون" current={usage.usage.usersCount} limit={usage.limits.maxUsers} />
        <UsageBar label="القنوات" current={usage.usage.channelsCount} limit={usage.limits.maxChannels} />
        <UsageBar label="المحادثات الشهرية" current={usage.usage.monthlyConversationsCount} limit={usage.limits.monthlyConversationLimit} />
        <UsageBar label="الرسائل الشهرية" current={usage.usage.monthlyMessagesCount} limit={usage.limits.monthlyMessageLimit} />
      </div>
      <div className="billing-warning-list">
        {usage.warnings.length ? usage.warnings.map((warning) => (
          <StatusBadge key={`${warning.type}-${warning.label}`} label={warning.label} tone={warning.severity === 'danger' ? 'danger' : 'warning'} />
        )) : <StatusBadge label="الاستخدام ضمن الحدود" tone="success" />}
      </div>
    </AppCard>
  )
}

export default function BillingPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN'
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [usageRows, setUsageRows] = useState<BillingUsage[]>([])
  const [isLoading, setLoading] = useState(true)

  const currentUsage = useMemo(() => usageRows[0], [usageRows])

  function refresh() {
    setLoading(true)
    Promise.all([fetchBillingPlans(), fetchBillingUsage()])
      .then(([planItems, usage]) => {
        setPlans(planItems)
        setUsageRows(usage.platform ? usage.tenants ?? [] : usage.tenant ? [usage.tenant] : [])
      })
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل الاشتراكات', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function changePlan(tenantId: string, plan: BillingPlanId) {
    await updateTenantBillingPlan(tenantId, plan)
    showToast('تم تحديث باقة الشركة', 'success')
    refresh()
  }

  async function changeStatus(tenantId: string, status: BillingStatus) {
    await updateTenantBillingStatus(tenantId, status)
    showToast('تم تحديث حالة الاشتراك', 'success')
    refresh()
  }

  return (
    <div className="page-layout billing-page">
      <PageHeader
        title="الاشتراكات والباقات"
        description={isSuperAdmin ? 'جاهزية التحكم بالباقات وحالات الاشتراك دون ربط بوابة دفع.' : `اشتراك ${currentTenant?.name ?? 'الشركة الحالية'} واستخدام الحدود الشهرية.`}
        actions={!isSuperAdmin ? <AppButton variant="primary" onClick={() => showToast('تم تسجيل طلب الترقية كإجراء Placeholder', 'info')}>طلب ترقية</AppButton> : null}
      />

      <section className="billing-plan-grid">
        {plans.map((plan) => (
          <AppCard key={plan.id} className="billing-plan-card">
            <StatusBadge label={planLabels[plan.id]} tone={plan.id === 'ENTERPRISE' ? 'vip' : 'info'} />
            <dl>
              <div><dt>المستخدمون</dt><dd>{number(plan.maxUsers)}</dd></div>
              <div><dt>القنوات</dt><dd>{number(plan.maxChannels)}</dd></div>
              <div><dt>المحادثات الشهرية</dt><dd>{number(plan.monthlyConversationLimit)}</dd></div>
              <div><dt>الرسائل الشهرية</dt><dd>{number(plan.monthlyMessageLimit)}</dd></div>
            </dl>
            <div className="tag-list compact">{plan.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
          </AppCard>
        ))}
      </section>

      {isLoading ? <EmptyState title="جار تحميل الاشتراكات" message="نراجع حدود الباقات والاستخدام الحالي." /> : null}

      {isSuperAdmin ? (
        <AppCard>
          <div className="panel-header split-header">
            <div>
              <h2>اشتراكات الشركات</h2>
              <p>تغيير الخطة أو حالة الاشتراك لا يفعّل دفعًا إلكترونيًا ولا يحظر واتساب في هذا الإصدار.</p>
            </div>
          </div>
          <div className="platform-table-wrapper billing-table">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>الشركة</th>
                  <th>الحالة</th>
                  <th>الباقة</th>
                  <th>الاستخدام</th>
                  <th>تحذيرات</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((row) => (
                  <tr key={row.tenantId}>
                    <td><strong>{row.tenantName}</strong><small>{row.tenantId}</small></td>
                    <td><StatusBadge label={statusLabels[row.status] ?? row.status} tone={statusTone(row.status)} /></td>
                    <td>
                      <AppSelect value={row.plan} onChange={(event) => changePlan(row.tenantId, event.target.value as BillingPlanId)}>
                        {plans.map((plan) => <option key={plan.id} value={plan.id}>{planLabels[plan.id]}</option>)}
                      </AppSelect>
                    </td>
                    <td>
                      <small>{number(row.usage.usersCount)} مستخدم</small>
                      <small>{number(row.usage.channelsCount)} قناة</small>
                      <small>{number(row.usage.monthlyConversationsCount)} محادثة</small>
                      <small>{number(row.usage.monthlyMessagesCount)} رسالة</small>
                    </td>
                    <td>{row.warnings.length ? row.warnings.map((warning) => <small key={warning.label}>{warning.label}</small>) : <small>ضمن الحدود</small>}</td>
                    <td>
                      <div className="platform-actions">
                        <AppButton variant="ghost" onClick={() => changeStatus(row.tenantId, 'ACTIVE')}>تفعيل</AppButton>
                        <AppButton variant="ghost" onClick={() => changeStatus(row.tenantId, 'SUSPENDED')}>إيقاف</AppButton>
                        <AppButton variant="ghost" onClick={() => changeStatus(row.tenantId, 'CANCELLED')}>إلغاء</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>
      ) : currentUsage ? (
        <SubscriptionCard usage={currentUsage} />
      ) : null}
    </div>
  )
}
