import { apiFetch, apiUrl } from '../../lib/apiClient'

export type BillingPlanId = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type BillingStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'INACTIVE' | 'ARCHIVED'

export type BillingPlan = {
  id: BillingPlanId
  name: string
  maxUsers: number
  maxChannels: number
  monthlyConversationLimit: number
  monthlyMessageLimit: number
  features: string[]
}

export type BillingWarning = {
  type: string
  label: string
  severity: 'warning' | 'danger'
}

export type BillingSubscription = {
  tenantId: string
  tenantName: string
  status: BillingStatus
  plan: BillingPlanId
  planDefinition: BillingPlan
  subscriptionStart?: string | null
  subscriptionEnd?: string | null
  limits: {
    maxUsers: number
    maxChannels: number
    monthlyConversationLimit: number
    monthlyMessageLimit: number
  }
}

export type BillingUsage = BillingSubscription & {
  usage: {
    usersCount: number
    channelsCount: number
    monthlyConversationsCount: number
    monthlyMessagesCount: number
  }
  warnings: BillingWarning[]
}

export type BillingUsageResponse = {
  platform: boolean
  tenants?: BillingUsage[]
  tenant?: BillingUsage | null
}

export type CurrentSubscriptionResponse = {
  platform: boolean
  tenants?: BillingSubscription[]
  tenant?: BillingSubscription | null
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchBillingPlans() {
  return parseResponse<BillingPlan[]>(await apiFetch(apiUrl('/billing/plans')), 'تعذر تحميل الباقات')
}

export async function fetchCurrentSubscription() {
  return parseResponse<CurrentSubscriptionResponse>(await apiFetch(apiUrl('/billing/current-subscription')), 'تعذر تحميل الاشتراك الحالي')
}

export async function fetchBillingUsage() {
  return parseResponse<BillingUsageResponse>(await apiFetch(apiUrl('/billing/usage')), 'تعذر تحميل استخدام الاشتراك')
}

export async function updateTenantBillingPlan(tenantId: string, plan: BillingPlanId) {
  return parseResponse<BillingSubscription>(await apiFetch(apiUrl(`/billing/tenants/${tenantId}/plan`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  }), 'تعذر تحديث باقة الشركة')
}

export async function updateTenantBillingStatus(tenantId: string, status: BillingStatus) {
  return parseResponse<BillingSubscription>(await apiFetch(apiUrl(`/billing/tenants/${tenantId}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }), 'تعذر تحديث حالة الاشتراك')
}
