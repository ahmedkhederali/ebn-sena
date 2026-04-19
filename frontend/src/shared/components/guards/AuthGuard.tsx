import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'
import type { Role } from '@shared/types/user.types'

interface AuthGuardProps {
  children: ReactNode
  /** If provided, user must have one of these roles */
  roles?: Role[]
  /** Where to redirect unauthenticated users (default: /login) */
  redirectTo?: string
}

export function AuthGuard({ children, roles, redirectTo = '/login' }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (roles && user && !roles.includes(user.role as Role)) {
    if (user.role === 'admin' || user.role === 'receptionist') return <Navigate to="/admin" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor/schedule" replace />
    return <Navigate to="/portal" replace />
  }

  return <>{children}</>
}

/** Redirect already-authenticated users away from auth pages */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    if (user?.role === 'admin' || user?.role === 'receptionist') return <Navigate to="/admin" replace />
    if (user?.role === 'doctor') return <Navigate to="/doctor/schedule" replace />
    return <Navigate to="/portal" replace />
  }

  return <>{children}</>
}
