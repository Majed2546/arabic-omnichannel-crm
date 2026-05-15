import type { PersistedAuthState } from './authTypes'

const AUTH_STORAGE_KEY = 'arabic-crm-auth'

export function loadPersistedAuth(): PersistedAuthState | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedAuthState
  } catch {
    return null
  }
}

export function savePersistedAuth(state: PersistedAuthState) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

export function clearPersistedAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getStoredAccessToken(): string | null {
  return loadPersistedAuth()?.tokens.accessToken ?? null
}
