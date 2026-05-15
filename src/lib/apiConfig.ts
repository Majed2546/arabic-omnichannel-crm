import { loadPersistedAuth } from '../auth/authStorage'

export const GRAPHQL_API_URL =
  import.meta.env.VITE_TWENTY_GRAPHQL_URL
  ?? import.meta.env.VITE_GRAPHQL_API_URL
  ?? 'http://localhost:3000/graphql'

export const TWENTY_API_KEY = import.meta.env.VITE_TWENTY_API_KEY ?? ''
export const IS_DEVELOPMENT = import.meta.env.DEV

export const AUTH_API_BASE_URL = GRAPHQL_API_URL.replace(/\/graphql$/, '')

export function getAuthToken(): string | null {
  return loadPersistedAuth()?.tokens.accessToken ?? null
}

export function getGraphqlAuthToken(): string | null {
  if (TWENTY_API_KEY) return TWENTY_API_KEY

  const token = getAuthToken()
  if (!token || token.startsWith('mock-access-token')) return null
  return token
}

export function hasTwentyApiKey(): boolean {
  return Boolean(TWENTY_API_KEY)
}
