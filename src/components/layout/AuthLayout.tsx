import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileLock2, ScanSearch, ScrollText } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const points = [
  { icon: FileLock2, title: 'Access follows the document', text: 'The AI only reads files your role is allowed to open.' },
  { icon: ScanSearch, title: 'Answers from your files only', text: 'No guessing. If it is not in your documents, it says so.' },
  { icon: ScrollText, title: 'Every access is logged', text: 'Uploads, views and AI questions leave an audit trail.' },
]

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-navy-900 p-12 text-slate-300 lg:flex">
        <Link to="/" aria-label="SecureAI Docs home">
          <Logo light />
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            Secure document intelligence for modern organizations.
          </h2>
          <ul className="mt-10 space-y-6">
            {points.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-brand-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-white">{t}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} SecureAI Docs</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-block lg:hidden" aria-label="SecureAI Docs home">
            <Logo />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
