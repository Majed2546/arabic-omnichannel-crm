import { StatusBadge } from '../../components/ui/StatusBadge'
import type { TenantPlan, TenantStatus } from '../../tenants/tenantTypes'

const statusLabels: Record<TenantStatus, string> = {
  trial: 'تجريبي',
  active: 'نشط',
  suspended: 'معلق',
  cancelled: 'ملغي',
}

const planLabels: Record<TenantPlan, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const tone = status === 'active' ? 'success' : status === 'trial' ? 'info' : status === 'suspended' ? 'warning' : 'danger'
  return <StatusBadge label={statusLabels[status]} tone={tone} />
}

export function TenantPlanBadge({ plan }: { plan: TenantPlan }) {
  const tone = plan === 'enterprise' ? 'vip' : plan === 'professional' ? 'info' : 'muted'
  return <StatusBadge label={planLabels[plan]} tone={tone} />
}
