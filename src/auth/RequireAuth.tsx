import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from './useAuth'

type RequireAuthProps = {
  children: ReactElement
  allowedRoles?: Array<'admin' | 'support' | 'analyst'>
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { status, user, canAccess } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState message="جارِ التحقق من الجلسة..." />
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!canAccess(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
