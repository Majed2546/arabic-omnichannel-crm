import { loadCurrentTenantId } from './tenantStorage'
import type { TenantScoped } from './tenantTypes'

export const TENANT_HEADER_NAME = 'x-tenant-id'

export function getCurrentTenantId(): string | null {
  return loadCurrentTenantId()
}

export function createTenantHeaders(tenantId = getCurrentTenantId()): Record<string, string> {
  return tenantId
    ? {
        [TENANT_HEADER_NAME]: tenantId,
        tenant_id: tenantId,
      }
    : {}
}

export function withTenantScope<T extends object>(payload: T, tenantId = getCurrentTenantId()): T & Partial<TenantScoped> {
  return tenantId ? { ...payload, tenant_id: tenantId } : payload
}

export function isTenantScopedRecord<T extends TenantScoped>(record: T, tenantId: string | null): boolean {
  return Boolean(tenantId && record.tenant_id === tenantId)
}

export function requireTenantId(tenantId = getCurrentTenantId()): string {
  if (!tenantId) {
    throw new Error('Tenant context is required before calling a tenant-scoped service')
  }
  return tenantId
}
