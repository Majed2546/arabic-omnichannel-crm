export type AuthUserRole = 'admin' | 'support' | 'analyst'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: AuthUserRole
  tenant?: string
  permissions: string[]
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
  logout: () => void
  refreshAuth: () => Promise<void>
  canAccess: (allowedRoles?: AuthUserRole[]) => boolean
}
