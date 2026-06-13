import { AUTH_MODE } from './authConfig'
import type { PlatformRole } from './authTypes'

export const LOCAL_TEST_CONTEXT_EVENT = 'arabic-crm-local-test-context-change'
const LOCAL_TEST_ROLE_KEY = 'arabic-crm.local-test-role'
const LOCAL_TEST_TENANT_KEY = 'arabic-crm.local-test-tenant-id'

export const LOCAL_TEST_ROLES: PlatformRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']

export function isLocalTestContextEnabled() {
  return AUTH_MODE === 'local' || import.meta.env.DEV
}

export function shouldSendLocalTestHeaders() {
  return AUTH_MODE === 'local'
}

export function loadLocalTestRole(): PlatformRole {
  if (typeof window === 'undefined') return 'SUPER_ADMIN'
  const storedRole = window.localStorage.getItem(LOCAL_TEST_ROLE_KEY) as PlatformRole | null
  return storedRole && LOCAL_TEST_ROLES.includes(storedRole) ? storedRole : 'SUPER_ADMIN'
}

export function saveLocalTestRole(role: PlatformRole) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_TEST_ROLE_KEY, role)
  window.dispatchEvent(new Event(LOCAL_TEST_CONTEXT_EVENT))
}

export function loadLocalTestTenantId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(LOCAL_TEST_TENANT_KEY)
}

export function saveLocalTestTenantId(tenantId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_TEST_TENANT_KEY, tenantId)
  window.dispatchEvent(new Event(LOCAL_TEST_CONTEXT_EVENT))
}
