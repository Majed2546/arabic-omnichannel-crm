import { loadPersistedAuth } from '../auth/authStorage'

export const REST_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const IS_DEVELOPMENT = import.meta.env.DEV

export const AUTH_API_BASE_URL = REST_API_BASE_URL

export function getAuthToken(): string | null {
  return loadPersistedAuth()?.tokens.accessToken ?? null
}
