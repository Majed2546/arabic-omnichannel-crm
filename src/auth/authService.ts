import type { AuthTokens, AuthUser } from './authTypes'
import { loadPersistedAuth, savePersistedAuth, clearPersistedAuth } from './authStorage'

function createMockAuthSession(email: string) {
  const user: AuthUser = {
    id: 'auth-1',
    name: email.includes('admin') ? 'أحمد المدير' : 'ليلى الدعم',
    email,
    role: email.includes('admin') ? 'admin' : email.includes('analyst') ? 'analyst' : 'support',
    tenant: 'شركة الرؤيا',
    permissions: email.includes('admin')
      ? ['read', 'write', 'manage']
      : ['read', 'write'],
  }

  const tokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }

  return { user, tokens }
}

export async function loginRequest(email: string, password: string) {
  void password
  const session = createMockAuthSession(email)
  savePersistedAuth(session)
  return session
}

export async function refreshTokenRequest() {
  const persisted = loadPersistedAuth()
  if (!persisted?.tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }

  const tokens: AuthTokens = {
    accessToken: `mock-access-token-${Date.now()}`,
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
