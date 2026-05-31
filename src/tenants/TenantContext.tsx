import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { apiFetch, apiUrl } from '../lib/apiClient'
import { unwrapItems } from '../lib/restUtils'
import { DEFAULT_TENANT_ID, TENANTS, findTenantByName } from './tenantRegistry'
import { TENANT_CONTEXT_EVENT, loadCurrentTenantId, saveCurrentTenantId } from './tenantStorage'
import { TenantContext } from './tenantContextObject'
import type { Tenant, TenantContextValue, TenantPlan, TenantStatus } from './tenantTypes'

type TenantProviderProps = {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>(TENANTS)
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(() => {
    const storedTenantId = loadCurrentTenantId()
    return storedTenantId ?? DEFAULT_TENANT_ID
  })

  const userTenant = useMemo(() => {
    if (!user?.tenant) return null
    return tenants.find((tenant) => tenant.id === user.tenant || tenant.slug === user.tenant || tenant.name === user.tenant || tenant.displayName === user.tenant) ?? findTenantByName(user.tenant)
  }, [tenants, user?.tenant])
  const canUseAnyTenant = user?.platformRole === 'SUPER_ADMIN'
  const effectiveTenantId = userTenant && !canUseAnyTenant ? userTenant.id : currentTenantId

  const loadTenants = useCallback(async () => {
    if (!user) return TENANTS
    try {
      const response = await apiFetch(apiUrl('/tenants'))
      if (!response.ok) throw new Error('Failed to load tenants')
      const payload = await response.json()
      const items = unwrapItems<RemoteTenant>(payload).map(normalizeTenant)
      return mergeTenants(TENANTS, items)
    } catch {
      return TENANTS
    }
  }, [user?.platformRole, user?.tenant])

  const refreshTenants = useCallback(async () => {
    setTenants(await loadTenants())
  }, [loadTenants])

  useEffect(() => {
    if (!user) return
    let isActive = true

    loadTenants()
      .then((nextTenants) => {
        if (!isActive) return
        setTenants(nextTenants)
      })

    return () => {
      isActive = false
    }
  }, [loadTenants, user?.platformRole, user?.tenant])

  useEffect(() => {
    if (!effectiveTenantId) return
    saveCurrentTenantId(effectiveTenantId)
  }, [effectiveTenantId])

  useEffect(() => {
    function syncStoredTenant(event: Event) {
      const nextTenantId = event instanceof CustomEvent ? event.detail?.tenantId : loadCurrentTenantId()
      setCurrentTenantIdState(nextTenantId ?? DEFAULT_TENANT_ID)
    }

    window.addEventListener(TENANT_CONTEXT_EVENT, syncStoredTenant)
    window.addEventListener('storage', syncStoredTenant)
    return () => {
      window.removeEventListener(TENANT_CONTEXT_EVENT, syncStoredTenant)
      window.removeEventListener('storage', syncStoredTenant)
    }
  }, [])

  const canAccessTenant = useCallback((tenantId: string) => {
    if (!tenants.some((tenant) => tenant.id === tenantId)) return false
    if (!userTenant || canUseAnyTenant) return true
    return userTenant.id === tenantId
  }, [canUseAnyTenant, tenants, userTenant])

  const setCurrentTenantId = useCallback((tenantId: string) => {
    if (!canAccessTenant(tenantId)) return
    setCurrentTenantIdState(tenantId)
    saveCurrentTenantId(tenantId)
  }, [canAccessTenant])

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants,
      currentTenant: tenants.find((tenant) => tenant.id === effectiveTenantId) ?? null,
      currentTenantId: effectiveTenantId,
      setCurrentTenantId,
      canAccessTenant,
      refreshTenants,
    }),
    [tenants, effectiveTenantId, setCurrentTenantId, canAccessTenant, refreshTenants],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

const statusMap: Record<string, TenantStatus> = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  INACTIVE: 'suspended',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  ARCHIVED: 'cancelled',
  trial: 'trial',
  active: 'active',
  suspended: 'suspended',
  cancelled: 'cancelled',
}

const planMap: Record<string, TenantPlan> = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  starter: 'starter',
  professional: 'professional',
  enterprise: 'enterprise',
}

type RemoteTenant = Partial<Tenant> & {
  createdAt?: string
  settings?: {
    companyDisplayName?: string | null
  } | null
}

function normalizeTenant(item: RemoteTenant): Tenant {
  const id = String(item.id ?? item.slug ?? 'default-tenant')
  const name = String(item.name ?? id)
  const displayName = item.displayName ?? item.settings?.companyDisplayName ?? name
  return {
    id,
    name,
    displayName: String(displayName).trim() || name,
    slug: item.slug ? String(item.slug) : id,
    logoUrl: item.logoUrl,
    status: statusMap[String(item.status ?? 'active')] ?? 'active',
    plan: planMap[String(item.plan ?? 'enterprise')] ?? 'enterprise',
    subscriptionStart: item.subscriptionStart ?? item.createdAt,
    subscriptionEnd: item.subscriptionEnd,
    maxUsers: item.maxUsers ?? 10,
    maxChannels: item.maxChannels ?? 2,
    monthlyConversationLimit: item.monthlyConversationLimit ?? 1000,
    contacts: item.contacts ?? 0,
    inactiveReason: item.inactiveReason,
    lastActivityAt: item.lastActivityAt,
  }
}

function mergeTenants(fallback: Tenant[], remote: Tenant[]) {
  const map = new Map<string, Tenant>()
  fallback.forEach((tenant) => map.set(tenant.id, tenant))
  remote.forEach((tenant) => map.set(tenant.id, tenant))
  return Array.from(map.values())
}
