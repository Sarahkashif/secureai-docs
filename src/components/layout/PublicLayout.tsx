import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { buttonStyles } from '@/components/ui/Button'

const links = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function PublicLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-navy-900">
      <header className="border-b border-slate-200 dark:border-navy-700">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/" aria-label="SecureAI Docs home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/app" className={buttonStyles('primary')}>Open app</Link>
            ) : (
              <>
                <Link to="/login" className={buttonStyles('ghost')}>Sign in</Link>
                <Link to="/signup" className={buttonStyles('primary')}>Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 dark:border-navy-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} SecureAI Docs</p>
          <nav aria-label="Footer" className="flex gap-5">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-slate-900 dark:hover:text-white">{l.label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
