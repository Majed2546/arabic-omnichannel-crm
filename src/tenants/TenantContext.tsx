import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { DEFAULT_TENANT_ID, TENANTS, findTenantById, findTenantByName } from './tenantRegistry'
import { loadCurrentTenantId, saveCurrentTenantId } from './tenantStorage'
import { TenantContext } from './tenantContextObject'
import type { TenantContextValue } from './tenantTypes'

type TenantProviderProps = {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { user } = useAuth()
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(() => {
    const storedTenantId = loadCurrentTenantId()
    return findTenantById(storedTenantId)?.id ?? DEFAULT_TENANT_ID
  })

  const userTenant = useMemo(() => findTenantByName(user?.tenant), [user?.tenant])
  const canUseAnyTenant = user?.platformRole === 'SUPER_ADMIN'
  const effectiveTenantId = userTenant && !canUseAnyTenant ? userTenant.id : currentTenantId

  useEffect(() => {
    if (!effectiveTenantId) return
    saveCurrentTenantId(effectiveTenantId)
  }, [effectiveTenantId])

  const canAccessTenant = useCallback((tenantId: string) => {
    if (!findTenantById(tenantId)) return false
    if (!userTenant || canUseAnyTenant) return true
    return userTenant.id === tenantId
  }, [canUseAnyTenant, userTenant])

  const setCurrentTenantId = useCallback((tenantId: string) => {
    if (!canAccessTenant(tenantId)) return
    setCurrentTenantIdState(tenantId)
    saveCurrentTenantId(tenantId)
  }, [canAccessTenant])

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants: TENANTS,
      currentTenant: findTenantById(effectiveTenantId),
      currentTenantId: effectiveTenantId,
      setCurrentTenantId,
      canAccessTenant,
    }),
    [effectiveTenantId, setCurrentTenantId, canAccessTenant],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
