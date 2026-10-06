import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { PLANS } from '@/lib/plans'

export default function Pricing() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-navy-900 dark:text-white sm:text-4xl">Simple pricing for every team size</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Start free and upgrade when your document library grows. Every plan includes role-based access control and audit logging.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.tier} className={cn('flex flex-col rounded-xl border p-6', p.highlighted ? 'border-brand-600 bg-white shadow-card ring-1 ring-brand-600 dark:bg-navy-800' : 'border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800')}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{p.name}</h2>
                {p.highlighted && <Badge tone="blue">Most popular</Badge>}
              </div>
              <p className="mt-4"><span className="text-3xl font-semibold text-navy-900 dark:text-white">{p.price}</span>{p.period && <span className="text-sm text-slate-500 dark:text-slate-400">{p.period}</span>}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />{f}</li>
                ))}
              </ul>
              <Link to={p.tier === 'enterprise' ? '/contact' : '/signup'} className={buttonStyles(p.highlighted ? 'primary' : 'secondary', 'md', 'mt-8 w-full')}>
                {p.tier === 'enterprise' ? 'Contact sales' : p.tier === 'free' ? 'Start free' : `Choose ${p.name}`}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">Demo environment: plan changes take effect immediately and no payment is collected.</p>
      </section>
    </PublicLayout>
  )
}
