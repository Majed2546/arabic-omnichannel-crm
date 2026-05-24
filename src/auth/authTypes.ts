import type { AuthUserRole, CrmPermission } from './permissions'

export type { AuthUserRole, CrmPermission }

export interface AuthUser {
  id: string
  name: string
  email: string
  role: AuthUserRole
  roles?: string[]
  tenant?: string
  permissions: CrmPermission[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface PersistedAuthState {
  user: AuthUser
  tokens: AuthTokens
}

export interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithKeycloak: () => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
  canAccess: (allowedRoles?: AuthUserRole[]) => boolean
  can: (permission: CrmPermission) => boolean
}
