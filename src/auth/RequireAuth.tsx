import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'
import { AUTH_MODE } from './authConfig'
import { useAuth } from './useAuth'
import type { AuthUserRole, CrmPermission } from './authTypes'

type RequireAuthProps = {
  children: ReactElement
  allowedRoles?: AuthUserRole[]
  requiredPermissions?: CrmPermission[]
  requirePlatformAdmin?: boolean
}

export function RequireAuth({ children, allowedRoles, requiredPermissions, requirePlatformAdmin }: RequireAuthProps) {
  const { status, user, canAccess, can } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState message="جارِ التحقق من الجلسة..." />
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const hasPlatformAccess = !requirePlatformAdmin || AUTH_MODE === 'local' || user.platformRole === 'SUPER_ADMIN'

  if (!hasPlatformAccess || !canAccess(allowedRoles) || requiredPermissions?.some((permission) => !can(permission))) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
