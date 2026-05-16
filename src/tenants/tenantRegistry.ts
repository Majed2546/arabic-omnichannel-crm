import type { Tenant } from './tenantTypes'

export const TENANTS: Tenant[] = [
  { id: 'default-tenant', name: 'المستأجر الافتراضي', plan: 'Enterprise', status: 'active', contacts: 0 },
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
