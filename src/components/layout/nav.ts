import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  Upload,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
export interface NavSection {
  heading: string
  roles?: UserRole[] // omit = visible to everyone
  items: NavItem[]
}

export const NAV: NavSection[] = [
  {
    heading: 'Workspace',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/upload', label: 'Upload', icon: Upload },
      { to: '/app/library', label: 'Library', icon: FileText },
      { to: '/app/chat', label: 'AI Chat', icon: MessageSquareText },
    ],
  },
  {
    heading: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: Bell },
      { to: '/app/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    heading: 'Administration',
    roles: ['admin'],
    items: [
      { to: '/app/admin/users', label: 'Users', icon: Users },
      { to: '/app/admin/subscription', label: 'Subscription', icon: CreditCard },
      { to: '/app/admin/audit', label: 'Audit logs', icon: ScrollText },
      { to: '/app/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/app/admin/security', label: 'Security', icon: ShieldCheck },
    ],
  },
]
