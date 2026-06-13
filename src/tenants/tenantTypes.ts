export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
export type TenantPlan = 'starter' | 'professional' | 'enterprise'

export type Tenant = {
  id: string
  name: string
  displayName?: string
  slug?: string
  logoUrl?: string
  plan: TenantPlan
  status: TenantStatus
  subscriptionStart?: string
  subscriptionEnd?: string
  maxUsers?: number
  maxChannels?: number
  monthlyConversationLimit?: number
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
  refreshTenants: () => Promise<void>
}
