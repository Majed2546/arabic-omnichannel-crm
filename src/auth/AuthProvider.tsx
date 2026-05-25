import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthContextValue, AuthUser } from './authTypes'
import {
  beginKeycloakLogin,
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  getCurrentAccessToken,
  getCurrentUserFromStorage,
  applyLocalTestProfile,
} from './authService'
import { AuthContext } from './authContext'
import { AUTH_MODE } from './authConfig'
import type { CrmPermission } from './permissions'
import { LOCAL_TEST_CONTEXT_EVENT } from './localTestContext'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrapAuth() {
      const storedUser = getCurrentUserFromStorage()
      const storedToken = getCurrentAccessToken()

      if (!storedUser || !storedToken) {
        setStatus('unauthenticated')
        return
      }

      try {
        const refreshed = await refreshTokenRequest()
        setUser(refreshed.user)
        setToken(refreshed.tokens.accessToken)
        setStatus('authenticated')
      } catch {
        setUser(storedUser)
        setToken(storedToken)
        setStatus('authenticated')
      }
    }

    bootstrapAuth()
  }, [])

  useEffect(() => {
    if (AUTH_MODE !== 'local') return

    function syncLocalTestContext() {
      setUser((currentUser) => (currentUser ? applyLocalTestProfile(currentUser) : currentUser))
    }

    window.addEventListener(LOCAL_TEST_CONTEXT_EVENT, syncLocalTestContext)
    window.addEventListener('storage', syncLocalTestContext)
    return () => {
      window.removeEventListener(LOCAL_TEST_CONTEXT_EVENT, syncLocalTestContext)
      window.removeEventListener('storage', syncLocalTestContext)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    setUser(result.user)
    setToken(result.tokens.accessToken)
    setStatus('authenticated')
  }, [])

  const loginWithKeycloak = useCallback(async () => {
    await beginKeycloakLogin()
  }, [])

  const logout = useCallback(() => {
    logoutRequest()
    setUser(null)
    setToken(null)
    setStatus('unauthenticated')
  }, [])

  const refreshAuth = useCallback(async () => {
    try {
      const result = await refreshTokenRequest()
      setUser(result.user)
      setToken(result.tokens.accessToken)
      setStatus('authenticated')
    } catch {
      logout()
    }
  }, [logout])

  const canAccess = useCallback((allowedRoles?: AuthUser['role'][]) => {
    if (!allowedRoles || !user) return Boolean(user)
    return allowedRoles.includes(user.role)
  }, [user])

  const can = useCallback((permission: CrmPermission) => {
    return Boolean(user?.permissions.includes(permission))
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      login,
      loginWithKeycloak,
      logout,
      refreshAuth,
      canAccess,
      can,
    }),
    [status, user, token, login, loginWithKeycloak, logout, refreshAuth, canAccess, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
