import type { Tenant } from './tenantTypes'

export const TENANTS: Tenant[] = [
  { id: 't-1', name: 'شركة الرؤيا', plan: 'Enterprise', status: 'active', contacts: 42 },
  { id: 't-2', name: 'نماء للحلول', plan: 'Business', status: 'active', contacts: 18 },
  {
    id: 't-3',
    name: 'سحاب للخدمات',
    plan: 'Starter',
    status: 'suspended',
    contacts: 7,
    inactiveReason: 'تم تعليق الاشتراك مؤقتاً بانتظار مراجعة الفوترة.',
    lastActivityAt: '2026-05-09T16:30:00+03:00',
  },
]

export const DEFAULT_TENANT_ID = TENANTS[0]?.id ?? null

export function findTenantById(tenantId: string | null | undefined): Tenant | null {
  if (!tenantId) return null
  return TENANTS.find((tenant) => tenant.id === tenantId) ?? null
}

export function findTenantByName(tenantName: string | null | undefined): Tenant | null {
  if (!tenantName) return null
  return TENANTS.find((tenant) => tenant.name === tenantName) ?? null
}
