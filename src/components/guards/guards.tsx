import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { hasRole } from '@/lib/roles'
import type { UserRole } from '@/types'
import { FullPageSpinner } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/Button'

/** Requires a signed-in user with an active profile. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session || !profile) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

/** Requires one of the listed roles. The database enforces the same rule through RLS; this only shapes the UI. */
export function RoleRoute({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { profile } = useAuth()
  if (!hasRole(profile?.role, roles)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Your role does not include this area. If you think this is a mistake, ask an administrator to review your permissions."
        action={
          <Link to="/app" className={buttonStyles('secondary')}>
            Back to dashboard
          </Link>
        }
      />
    )
  }
  return <>{children}</>
}

/** Login, signup and forgot-password pages bounce signed-in users into the app. */
export function PublicOnlyRoute() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (session && profile) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    return <Navigate to={from && from.startsWith('/app') ? from : '/app'} replace />
  }
  return <Outlet />
}
