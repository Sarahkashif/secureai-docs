import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, Sun, UserCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { initials } from '@/lib/utils'
import { PLAN_LABELS, ROLE_LABELS } from '@/lib/roles'
import { Badge } from '@/components/ui/Badge'
import { useUnreadCount } from '@/hooks/useNotifications'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, organization, user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const unread = useUnreadCount()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconBtn = 'rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-navy-700 dark:bg-navy-900/90 sm:px-6">
      <button onClick={onMenu} aria-label="Open menu" className={`${iconBtn} lg:hidden`}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{organization?.name}</span>
        {organization && <Badge tone="blue">{PLAN_LABELS[organization.plan]}</Badge>}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className={iconBtn}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Link to="/app/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} className={`${iconBtn} relative`}>
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600 dark:border-navy-900" />}
        </Link>

        <div className="relative ml-2" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
          >
            {initials(profile?.full_name, user?.email?.[0]?.toUpperCase())}
          </button>
          {open && (
            <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-navy-700 dark:bg-navy-800">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{profile?.full_name || 'Unnamed user'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                {profile && <Badge className="mt-2">{ROLE_LABELS[profile.role]}</Badge>}
              </div>
              <div className="my-1 border-t border-slate-200 dark:border-navy-700" />
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  navigate('/app/profile')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-700"
              >
                <UserCircle className="h-4 w-4" /> Profile
              </button>
              <button
                role="menuitem"
                onClick={async () => {
                  setOpen(false)
                  await signOut()
                  navigate('/login', { replace: true })
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-700"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
