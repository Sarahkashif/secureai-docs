import { NavLink, Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { NAV } from './nav'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const sections = NAV.filter((s) => !s.roles || (profile && s.roles.includes(profile.role)))

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-navy-700 dark:bg-navy-900',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/app" aria-label="Dashboard">
            <Logo />
          </Link>
          <button onClick={onClose} aria-label="Close menu" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="px-3 pb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{section.heading}</p>
              <ul className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
