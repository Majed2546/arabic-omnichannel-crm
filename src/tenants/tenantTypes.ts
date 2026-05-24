export type TenantStatus = 'active' | 'suspended'

export type Tenant = {
  id: string
  name: string
  plan: string
  status: TenantStatus
  contacts: number
  inactiveReason?: string
  lastActivityAt?: string
}

export type TenantScoped = {
  tenant_id: string
}

export type TenantContextValue = {
  tenants: Tenant[]
  currentTenant: Tenant | null
  currentTenantId: string | null
  setCurrentTenantId: (tenantId: string) => void
  canAccessTenant: (tenantId: string) => boolean
}
