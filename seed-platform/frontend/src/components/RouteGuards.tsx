import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { UserRole } from '@/types'

// Maps each role to its home route. Used for post-login redirects and
// wrong-role redirects — avoids landing anyone at the legacy /dashboard stub.
export const ROLE_HOME: Record<UserRole, string> = {
  PARENT:    '/parent/dashboard',
  CLINICIAN: '/clinician/dashboard',
  ADMIN:     '/admin/dashboard',
}

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-seed-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

interface RoleRouteProps {
  children: React.ReactNode
  roles: UserRole[]
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, roles }) => {
  const { user, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-seed-ice flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-seed-teal border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!roles.includes(user.role)) {
    // Redirect to the user's own home — not the legacy /dashboard stub
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return <>{children}</>
}
