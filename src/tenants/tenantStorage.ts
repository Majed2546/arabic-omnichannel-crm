const CURRENT_TENANT_STORAGE_KEY = 'arabic-crm.current-tenant-id'

export function loadCurrentTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CURRENT_TENANT_STORAGE_KEY)
}

export function saveCurrentTenantId(tenantId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CURRENT_TENANT_STORAGE_KEY, tenantId)
}

export function clearCurrentTenantId() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CURRENT_TENANT_STORAGE_KEY)
}
