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

export type OnboardingPlan = 'starter' | 'professional' | 'enterprise'
export type OnboardingRequestStatus =
  | 'new'
  | 'waiting_for_info'
  | 'under_review'
  | 'ready_to_create'
  | 'activated'
  | 'rejected'
export type OnboardingOperationMode = 'platform_only' | 'app_and_platform'

export type OnboardingRequest = {
  id: string
  organizationName: string
  website?: string
  contactName: string
  contactEmail: string
  contactPhone: string
  requestedPlan: OnboardingPlan
  requestedUsers: number
  requestedChannels: string[]
  whatsappNumber?: string
  hasMetaBusiness: boolean
  hasWhatsAppBusinessApp: boolean
  operationMode: OnboardingOperationMode
  status: OnboardingRequestStatus
  notes?: string
  activatedTenantId?: string
  activatedTenant?: Pick<PlatformCompany, 'id' | 'name' | 'slug' | 'status' | 'plan'>
  createdAt: string
  updatedAt: string
}

export type SaveOnboardingRequestPayload = Omit<
  OnboardingRequest,
  'id' | 'status' | 'activatedTenantId' | 'activatedTenant' | 'createdAt' | 'updatedAt'
>

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

const onboardingStatusMap: Record<string, OnboardingRequestStatus> = {
  NEW: 'new',
  WAITING_FOR_INFO: 'waiting_for_info',
  UNDER_REVIEW: 'under_review',
  READY_TO_CREATE: 'ready_to_create',
  ACTIVATED: 'activated',
  REJECTED: 'rejected',
  new: 'new',
  waiting_for_info: 'waiting_for_info',
  under_review: 'under_review',
  ready_to_create: 'ready_to_create',
  activated: 'activated',
  rejected: 'rejected',
}

const operationModeMap: Record<string, OnboardingOperationMode> = {
  PLATFORM_ONLY: 'platform_only',
  APP_AND_PLATFORM: 'app_and_platform',
  platform_only: 'platform_only',
  app_and_platform: 'app_and_platform',
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

function normalizeOnboardingRequest(item: Partial<OnboardingRequest> & Record<string, unknown>): OnboardingRequest {
  return {
    id: String(item.id ?? ''),
    organizationName: String(item.organizationName ?? ''),
    website: item.website ? String(item.website) : undefined,
    contactName: String(item.contactName ?? ''),
    contactEmail: String(item.contactEmail ?? ''),
    contactPhone: String(item.contactPhone ?? ''),
    requestedPlan: planMap[String(item.requestedPlan ?? 'starter')] ?? 'starter',
    requestedUsers: Number(item.requestedUsers ?? 1),
    requestedChannels: Array.isArray(item.requestedChannels) ? item.requestedChannels.map(String) : [],
    whatsappNumber: item.whatsappNumber ? String(item.whatsappNumber) : undefined,
    hasMetaBusiness: Boolean(item.hasMetaBusiness),
    hasWhatsAppBusinessApp: Boolean(item.hasWhatsAppBusinessApp),
    operationMode: operationModeMap[String(item.operationMode ?? 'platform_only')] ?? 'platform_only',
    status: onboardingStatusMap[String(item.status ?? 'new')] ?? 'new',
    notes: item.notes ? String(item.notes) : undefined,
    activatedTenantId: item.activatedTenantId ? String(item.activatedTenantId) : undefined,
    activatedTenant: item.activatedTenant ? normalizeCompany(item.activatedTenant as Partial<Tenant>) : undefined,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
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

function toOnboardingApiPayload(payload: Partial<SaveOnboardingRequestPayload>) {
  return {
    ...payload,
    requestedPlan: payload.requestedPlan?.toUpperCase(),
    operationMode: payload.operationMode?.toUpperCase(),
    website: payload.website || undefined,
    whatsappNumber: payload.whatsappNumber || undefined,
    notes: payload.notes || undefined,
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

export async function fetchOnboardingRequests(): Promise<OnboardingRequest[]> {
  const response = await apiFetch(apiUrl('/onboarding-requests'))
  if (!response.ok) throw new Error('تعذر تحميل طلبات الاشتراك')
  const payload = await response.json()
  return unwrapItems<Partial<OnboardingRequest> & Record<string, unknown>>(payload).map(normalizeOnboardingRequest)
}

export async function fetchOnboardingRequest(id: string): Promise<OnboardingRequest> {
  const response = await apiFetch(apiUrl(`/onboarding-requests/${id}`))
  if (!response.ok) throw new Error('تعذر تحميل طلب الاشتراك')
  return normalizeOnboardingRequest(await response.json())
}

export async function createOnboardingRequest(payload: SaveOnboardingRequestPayload) {
  const response = await apiFetch(apiUrl('/onboarding-requests'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toOnboardingApiPayload(payload)),
  })
  if (!response.ok) throw new Error('تعذر إنشاء طلب الاشتراك')
  return normalizeOnboardingRequest(await response.json())
}

export async function updateOnboardingRequest(id: string, payload: Partial<SaveOnboardingRequestPayload>) {
  const response = await apiFetch(apiUrl(`/onboarding-requests/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toOnboardingApiPayload(payload)),
  })
  if (!response.ok) throw new Error('تعذر تحديث طلب الاشتراك')
  return normalizeOnboardingRequest(await response.json())
}

export async function updateOnboardingRequestStatus(id: string, status: OnboardingRequestStatus) {
  const response = await apiFetch(apiUrl(`/onboarding-requests/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: status.toUpperCase() }),
  })
  if (!response.ok) throw new Error('تعذر تحديث حالة الطلب')
  return normalizeOnboardingRequest(await response.json())
}

export async function createTenantFromOnboardingRequest(id: string) {
  const response = await apiFetch(apiUrl(`/onboarding-requests/${id}/create-tenant`), {
    method: 'POST',
  })
  if (!response.ok) throw new Error('تعذر إنشاء الشركة من الطلب')
  return normalizeOnboardingRequest(await response.json())
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
