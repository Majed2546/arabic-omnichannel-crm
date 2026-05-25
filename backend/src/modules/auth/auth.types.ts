import type { CrmPermission, CrmRole } from './permissions'

export type AuthMode = 'local' | 'keycloak'
export type PlatformRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER'

export type KeycloakTokenPayload = {
  sub?: string
  preferred_username?: string
  name?: string
  email?: string
  iss?: string
  aud?: string | string[]
  exp?: number
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
  groups?: string[]
  platform_role?: string
}

export type AuthenticatedUser = {
  id: string
  name: string
  email: string
  role: CrmRole
  roles: string[]
  permissions: CrmPermission[]
  platformRole: PlatformRole
  issuer?: string
}
