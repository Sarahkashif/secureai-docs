import type { PlanTier, UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  admin: 'Admin',
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  basic: 'Basic',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export const ROLE_CAPABILITIES: Record<UserRole, { can: string[]; cannot: string[] }> = {
  employee: {
    can: ['Upload personal documents', 'View your own documents', 'Ask AI questions on authorized documents'],
    cannot: ['View confidential HR documents', 'View salary records', 'Access the admin dashboard'],
  },
  hr_manager: {
    can: ['Upload HR files', 'View employee files', 'View salary files', 'Ask AI questions on HR documents'],
    cannot: ['Manage system settings'],
  },
  admin: {
    can: ['View all files', 'Manage users and permissions', 'Manage subscriptions', 'Access analytics and security dashboards'],
    cannot: [],
  },
}

export const hasRole = (role: UserRole | undefined, allowed: UserRole[]) => !!role && allowed.includes(role)
export const isAdmin = (role?: UserRole) => role === 'admin'
export const canAccessSensitive = (role?: UserRole) => role === 'admin' || role === 'hr_manager'
