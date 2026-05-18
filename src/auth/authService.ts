import type { AuthTokens, AuthUser } from './authTypes'
import { loadPersistedAuth, savePersistedAuth, clearPersistedAuth } from './authStorage'

function createLocalAuthSession(email: string) {
  const user: AuthUser = {
    id: 'auth-1',
    name: 'المستخدم الحالي',
    email,
    role: email.includes('admin') ? 'admin' : email.includes('analyst') ? 'analyst' : 'support',
    tenant: 'المستأجر الافتراضي',
    permissions: email.includes('admin')
      ? ['read', 'write', 'manage']
      : ['read', 'write'],
  }

  const tokens: AuthTokens = {
    accessToken: 'local-access-token',
    refreshToken: 'local-refresh-token',
  }

  return { user, tokens }
}

export async function loginRequest(email: string, password: string) {
  void password
  const session = createLocalAuthSession(email)
  savePersistedAuth(session)
  return session
}

export async function refreshTokenRequest() {
  const persisted = loadPersistedAuth()
  if (!persisted?.tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const tokens: AuthTokens = {
    accessToken: `local-access-token-${Date.now()}`,
    refreshToken: persisted.tokens.refreshToken,
  }

  const session = { user: persisted.user, tokens }
  savePersistedAuth(session)
  return session
}

export function logoutRequest() {
  clearPersistedAuth()
}

export function getCurrentUserFromStorage(): AuthUser | null {
  return loadPersistedAuth()?.user ?? null
}

export function getCurrentAccessToken(): string | null {
  return loadPersistedAuth()?.tokens.accessToken ?? null
}
