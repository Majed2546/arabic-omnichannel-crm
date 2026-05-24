import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthContextValue, AuthUser } from './authTypes'
import { loginRequest, logoutRequest, refreshTokenRequest, getCurrentAccessToken, getCurrentUserFromStorage } from './authService'
import { AuthContext } from './authContext'

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

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    setUser(result.user)
    setToken(result.tokens.accessToken)
    setStatus('authenticated')
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

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      login,
      logout,
      refreshAuth,
      canAccess,
    }),
    [status, user, token, login, logout, refreshAuth, canAccess],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
