import type { Tenant } from './tenantTypes'

export const TENANTS: Tenant[] = [
  {
    id: 'default-tenant',
    name: 'المستأجر الافتراضي',
    slug: 'default',
    plan: 'enterprise',
    status: 'active',
    maxUsers: 50,
    maxChannels: 10,
    monthlyConversationLimit: 50000,
    contacts: 0,
  },
  {
    id: 'test-company-2',
    name: 'شركة اختبار 2',
    slug: 'test-company-2',
    plan: 'professional',
    status: 'active',
    maxUsers: 10,
    maxChannels: 4,
    monthlyConversationLimit: 10000,
    contacts: 0,
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
