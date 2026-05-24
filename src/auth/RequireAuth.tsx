import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from './useAuth'
import type { AuthUserRole, CrmPermission } from './authTypes'

type RequireAuthProps = {
  children: ReactElement
  allowedRoles?: AuthUserRole[]
  requiredPermissions?: CrmPermission[]
}

export function RequireAuth({ children, allowedRoles, requiredPermissions }: RequireAuthProps) {
  const { status, user, canAccess, can } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState message="جارِ التحقق من الجلسة..." />
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!canAccess(allowedRoles) || requiredPermissions?.some((permission) => !can(permission))) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
