import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'
import { TENANTS } from '../../tenants/tenantRegistry'
import type { Tenant, TenantPlan, TenantStatus } from '../../tenants/tenantTypes'

export type PlatformCompany = {
  id: string
  name: string
  slug: string
  logoUrl?: string
  status: TenantStatus
  plan: TenantPlan
  subscriptionStart?: string
  subscriptionEnd?: string
  maxUsers: number
  maxChannels: number
  monthlyConversationLimit: number
}

export type SaveCompanyPayload = Omit<PlatformCompany, 'id'> & {
  admin?: {
    name: string
    email: string
  }
}

const statusMap: Record<string, TenantStatus> = {
  trial: 'trial',
  active: 'active',
  suspended: 'suspended',
  cancelled: 'cancelled',
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
}

const planMap: Record<string, TenantPlan> = {
  starter: 'starter',
  professional: 'professional',
  enterprise: 'enterprise',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
}

export function normalizeCompany(tenant: Partial<Tenant> & { createdAt?: string }): PlatformCompany {
  return {
    id: tenant.id ?? 'default-tenant',
    name: tenant.name ?? 'شركة غير مسماة',
    slug: tenant.slug ?? tenant.id ?? 'default',
    logoUrl: tenant.logoUrl,
    status: statusMap[String(tenant.status ?? 'active')] ?? 'active',
    plan: planMap[String(tenant.plan ?? 'enterprise')] ?? 'enterprise',
    subscriptionStart: tenant.subscriptionStart ?? tenant.createdAt,
    subscriptionEnd: tenant.subscriptionEnd,
    maxUsers: tenant.maxUsers ?? 50,
    maxChannels: tenant.maxChannels ?? 10,
    monthlyConversationLimit: tenant.monthlyConversationLimit ?? 50000,
  }
}

export async function fetchPlatformCompanies(): Promise<PlatformCompany[]> {
  try {
    const response = await apiFetch(apiUrl('/tenants'))
    if (!response.ok) return TENANTS.map(normalizeCompany)
    const payload = await response.json()
    const items = unwrapItems<Partial<Tenant> & { createdAt?: string }>(payload)
    return items.length ? items.map(normalizeCompany) : TENANTS.map(normalizeCompany)
  } catch {
    return TENANTS.map(normalizeCompany)
  }
}

function toApiPayload(payload: Partial<SaveCompanyPayload>) {
  return {
    ...payload,
    status: payload.status?.toUpperCase(),
    plan: payload.plan?.toUpperCase(),
  }
}

export async function createPlatformCompany(payload: SaveCompanyPayload) {
  const response = await apiFetch(apiUrl('/tenants'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(payload)),
  })
  if (!response.ok) throw new Error('تعذر إنشاء الشركة')
  return normalizeCompany(await response.json())
}

export async function updatePlatformCompany(id: string, payload: Partial<SaveCompanyPayload>) {
  const response = await apiFetch(apiUrl(`/tenants/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(payload)),
  })
  if (!response.ok) throw new Error('تعذر تحديث الشركة')
  return normalizeCompany(await response.json())
}

export async function updatePlatformCompanyStatus(id: string, status: TenantStatus) {
  const response = await apiFetch(apiUrl(`/tenants/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: status.toUpperCase() }),
  })
  if (!response.ok) throw new Error('تعذر تحديث حالة الاشتراك')
  return normalizeCompany(await response.json())
}
