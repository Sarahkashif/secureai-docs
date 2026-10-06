import { Link } from 'react-router-dom'
import { FileLock2, ScanSearch, ScrollText } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { buttonStyles } from '@/components/ui/Button'

const features = [
  { icon: FileLock2, title: 'Role-based access, enforced in the database', text: 'Employees, HR managers and admins each see only what their role allows. The AI inherits the same limits, so it cannot quote a salary file to someone who cannot open it.' },
  { icon: ScanSearch, title: 'Answers grounded in your documents', text: 'Questions are answered from retrieved passages with the source files cited. When the documents do not cover it, the assistant says so instead of guessing.' },
  { icon: ScrollText, title: 'A complete audit trail', text: 'Uploads, document views, AI questions and denied requests are recorded in a log that only administrators can read and nobody can edit.' },
]

export default function Landing() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-6 sm:pt-24">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-navy-900 dark:text-white sm:text-5xl">
          Ask questions about your confidential documents without exposing them.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          SecureAI Docs gives your organization an AI assistant that reads only the files each person is allowed to see, answers only from those files, and logs every access.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/signup" className={buttonStyles('primary', 'lg')}>Create a workspace</Link>
          <Link to="/pricing" className={buttonStyles('secondary', 'lg')}>View pricing</Link>
        </div>
      </section>
      <section className="border-t border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-navy-900 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}
