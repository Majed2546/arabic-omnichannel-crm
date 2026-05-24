import type { AuthTokens, AuthUser } from './authTypes'
import { loadPersistedAuth, savePersistedAuth, clearPersistedAuth } from './authStorage'
import { AUTH_MODE, isKeycloakConfigured, keycloakConfig } from './authConfig'
import { ROLE_PERMISSIONS, mapExternalRolesToLocalRole } from './permissions'

const KEYCLOAK_PKCE_KEY = 'arabic-crm-keycloak-pkce'

type KeycloakPayload = {
  sub?: string
  name?: string
  email?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
  groups?: string[]
}

function createLocalAuthSession(email: string) {
  const user: AuthUser = {
    id: 'auth-1',
    name: 'المستخدم الحالي',
    email,
    role: email.includes('admin') ? 'admin' : email.includes('analyst') ? 'analyst' : 'support',
    tenant: 'المستأجر الافتراضي',
    permissions: ROLE_PERMISSIONS[email.includes('admin') ? 'admin' : email.includes('analyst') ? 'analyst' : 'support'],
  }

  const tokens: AuthTokens = {
    accessToken: 'local-access-token',
    refreshToken: 'local-refresh-token',
  }

  return { user, tokens }
}

export async function loginRequest(email: string, password: string) {
  void password
  if (AUTH_MODE === 'keycloak') {
    throw new Error('Local password login is disabled while Keycloak mode is active')
  }

  const session = createLocalAuthSession(email)
  savePersistedAuth(session)
  return session
}

export async function refreshTokenRequest() {
  const persisted = loadPersistedAuth()
  if (!persisted?.tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }

  if (AUTH_MODE === 'keycloak') {
    return persisted
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

export async function beginKeycloakLogin() {
  if (!isKeycloakConfigured() || !keycloakConfig.issuer || !keycloakConfig.clientId) {
    throw new Error('Keycloak is not configured')
  }

  const verifier = createRandomString()
  const challenge = await createCodeChallenge(verifier)
  window.sessionStorage.setItem(KEYCLOAK_PKCE_KEY, verifier)

  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: `${window.location.origin}/login`,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.assign(`${keycloakConfig.issuer}/protocol/openid-connect/auth?${params.toString()}`)
}

export async function completeKeycloakLoginFromCallback(search = window.location.search) {
  if (!keycloakConfig.issuer || !keycloakConfig.clientId) {
    throw new Error('Keycloak is not configured')
  }

  const code = new URLSearchParams(search).get('code')
  const verifier = window.sessionStorage.getItem(KEYCLOAK_PKCE_KEY)
  if (!code || !verifier) {
    throw new Error('Missing Keycloak login callback')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: keycloakConfig.clientId,
    code,
    redirect_uri: `${window.location.origin}/login`,
    code_verifier: verifier,
  })

  if (keycloakConfig.clientSecret) {
    body.set('client_secret', keycloakConfig.clientSecret)
  }

  const response = await fetch(`${keycloakConfig.issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    throw new Error('Keycloak token exchange failed')
  }

  const tokenResponse = (await response.json()) as {
    access_token: string
    refresh_token?: string
  }

  const user = createUserFromKeycloakToken(tokenResponse.access_token)
  const session = {
    user,
    tokens: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? tokenResponse.access_token,
    },
  }

  window.sessionStorage.removeItem(KEYCLOAK_PKCE_KEY)
  savePersistedAuth(session)
  window.history.replaceState({}, document.title, '/login')
  return session
}

function createUserFromKeycloakToken(token: string): AuthUser {
  const payload = decodeJwtPayload<KeycloakPayload>(token)
  const roles = extractKeycloakRoles(payload)
  const role = mapExternalRolesToLocalRole(roles)

  return {
    id: payload.sub ?? payload.preferred_username ?? 'keycloak-user',
    name: payload.name ?? payload.preferred_username ?? payload.email ?? 'Keycloak user',
    email: payload.email ?? `${payload.preferred_username ?? 'user'}@keycloak.local`,
    role,
    roles,
    tenant: 'Keycloak',
    permissions: ROLE_PERMISSIONS[role],
  }
}

function extractKeycloakRoles(payload: KeycloakPayload) {
  const clientRoles = keycloakConfig.clientId
    ? payload.resource_access?.[keycloakConfig.clientId]?.roles ?? []
    : []
  const realmRoles = payload.realm_access?.roles ?? []
  const groupRoles = (payload.groups ?? []).map((group) => group.split('/').filter(Boolean).at(-1) ?? group)

  return Array.from(new Set([...realmRoles, ...clientRoles, ...groupRoles]))
}

function decodeJwtPayload<T>(token: string): T {
  const payload = token.split('.')[1]
  if (!payload) throw new Error('Invalid Keycloak token')
  return JSON.parse(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as T
}

function createRandomString() {
  const values = new Uint8Array(32)
  window.crypto.getRandomValues(values)
  return base64UrlEncode(values)
}

async function createCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(values: Uint8Array) {
  return window.btoa(String.fromCharCode(...values)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
