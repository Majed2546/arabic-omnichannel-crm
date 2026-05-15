import { useMemo } from 'react'
import { createTenantApolloContext } from './tenantUtils'
import { useTenant } from './useTenant'

export function useTenantQueryOptions() {
  const { currentTenantId } = useTenant()

  return useMemo(
    () => ({
      variables: currentTenantId ? { tenant_id: currentTenantId } : undefined,
      context: createTenantApolloContext(currentTenantId),
    }),
    [currentTenantId],
  )
}
