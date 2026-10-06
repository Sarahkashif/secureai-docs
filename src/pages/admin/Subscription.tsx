import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { formatLimit, PLANS, planInfo } from '@/lib/plans'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Progress } from '@/components/ui/Progress'
import { useToast } from '@/components/ui/Toast'
import type { PlanTier } from '@/types'

export default function Subscription() {
  const { organization, refreshProfile } = useAuth()
  const toast = useToast()
  const [usage, setUsage] = useState<{ docs: number; users: number } | null>(null)
  const [target, setTarget] = useState<PlanTier | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]).then(([d, u]) => active && setUsage({ docs: d.count ?? 0, users: u.count ?? 0 }))
    return () => {
      active = false
    }
  }, [organization?.plan])

  if (!organization) return null
  const current = planInfo(organization.plan)

  async function confirm() {
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/api/admin', { action: 'set_plan', plan: target })
      await refreshProfile()
      toast.success(`Switched to the ${planInfo(target).name} plan.`)
      setTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change plan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Subscription</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Demo billing: plan changes apply immediately and no payment is collected.</p>
      </div>

      <Card>
        <CardHeader title="Current plan" action={<Badge tone="green">Active</Badge>} />
        <div className="grid gap-6 p-5 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold text-navy-900 dark:text-white">{current.name}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{current.price}{current.period}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Documents: <strong>{usage?.docs ?? '-'}</strong> / {formatLimit(current.maxDocuments)}</p>
            <div className="mt-2"><Progress value={usage?.docs ?? 0} max={current.maxDocuments} label="Documents used" /></div>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Users: <strong>{usage?.users ?? '-'}</strong> / {formatLimit(current.maxUsers)}</p>
            <div className="mt-2"><Progress value={usage?.users ?? 0} max={current.maxUsers} label="Users" /></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.tier === organization.plan
          return (
            <div key={p.tier} className={cn('flex flex-col rounded-xl border p-5', isCurrent ? 'border-brand-600 bg-white ring-1 ring-brand-600 dark:bg-navy-800' : 'border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800')}>
              <h2 className="font-semibold text-navy-900 dark:text-white">{p.name}</h2>
              <p className="mt-2 text-2xl font-semibold text-navy-900 dark:text-white">{p.price}<span className="text-sm font-normal text-slate-500">{p.period}</span></p>
              <ul className="my-5 flex-1 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />{f}</li>)}
              </ul>
              {p.tier === 'enterprise' ? (
                <Link to="/contact" className={buttonStyles('secondary', 'md', 'w-full')}>Contact sales</Link>
              ) : (
                <Button variant={isCurrent ? 'secondary' : 'primary'} disabled={isCurrent} onClick={() => { setError(null); setTarget(p.tier) }}>
                  {isCurrent ? 'Current plan' : `Switch to ${p.name}`}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {target && (
        <Modal title={`Switch to ${planInfo(target).name}?`} onClose={() => !busy && setTarget(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Your organization will move from <strong>{current.name}</strong> to <strong>{planInfo(target).name}</strong> ({planInfo(target).price}{planInfo(target).period}). Plan limits apply immediately.</p>
          {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirm} loading={busy}>Confirm change</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
