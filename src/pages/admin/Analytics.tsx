import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { HorizontalBars, StackedBars } from '@/components/charts/Charts'
import { buttonStyles } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { ACTION_LABELS } from '@/lib/audit'
import { hasAnalytics } from '@/lib/plans'
import { supabase } from '@/lib/supabase'
import { dayKey, lastNDays } from '@/lib/utils'

interface Data {
  queries: { found: boolean | null; was_denied: boolean; created_at: string }[]
  audit: { action: string; user_id: string | null; created_at: string }[]
}

export default function Analytics() {
  const { organization } = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const allowed = organization ? hasAnalytics(organization.plan) : false

  useEffect(() => {
    if (!allowed) return
    let active = true
    const since = new Date(Date.now() - 13 * 86_400_000).toISOString()
    Promise.all([
      supabase.from('chat_queries').select('found, was_denied, created_at').gte('created_at', since).limit(5000),
      supabase.from('audit_logs').select('action, user_id, created_at').gte('created_at', since).limit(5000),
    ]).then(([q, a]) => {
      if (!active) return
      if (q.error || a.error) setError('Could not load analytics.')
      else setData({ queries: (q.data ?? []) as Data['queries'], audit: (a.data ?? []) as Data['audit'] })
    })
    return () => {
      active = false
    }
  }, [allowed])

  if (!allowed) {
    return (
      <Card>
        <EmptyState icon={BarChart3} title="Analytics is a Professional feature" description="Upgrade to Professional to see usage trends, answer quality and team activity." action={<Link to="/app/admin/subscription" className={buttonStyles('primary')}>View plans</Link>} />
      </Card>
    )
  }

  const days = lastNDays(14)
  const idx = new Map(days.map((d, i) => [d.key, i]))
  const questions = days.map((d) => ({ label: d.label, answered: 0, notFound: 0, denied: 0 }))
  const uploads = days.map((d) => ({ label: d.label, uploads: 0, views: 0 }))
  const actionCounts = new Map<string, number>()
  const activeUsers = new Set<string>()
  let answered = 0
  let notDenied = 0

  for (const q of data?.queries ?? []) {
    const i = idx.get(dayKey(new Date(q.created_at)))
    if (i === undefined) continue
    if (q.was_denied) questions[i].denied++
    else {
      notDenied++
      if (q.found) {
        questions[i].answered++
        answered++
      } else questions[i].notFound++
    }
  }
  for (const a of data?.audit ?? []) {
    const i = idx.get(dayKey(new Date(a.created_at)))
    actionCounts.set(a.action, (actionCounts.get(a.action) ?? 0) + 1)
    if (a.user_id) activeUsers.add(a.user_id)
    if (i === undefined) continue
    if (a.action === 'upload') uploads[i].uploads++
    if (a.action === 'view_doc') uploads[i].views++
  }
  const topActions = [...actionCounts.entries()].map(([k, v]) => ({ label: ACTION_LABELS[k] ?? k, value: v })).sort((a, b) => b.value - a.value).slice(0, 8)
  const totalQuestions = data?.queries.length ?? 0
  const summary = [
    { label: 'AI questions (14 days)', value: totalQuestions.toLocaleString() },
    { label: 'Answer rate', value: notDenied ? `${Math.round((answered / notDenied) * 100)}%` : '-' },
    { label: 'Active users', value: activeUsers.size.toLocaleString() },
    { label: 'Uploads', value: uploads.reduce((s, u) => s + u.uploads, 0).toLocaleString() },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Organization-wide activity for the last 14 days.</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold text-navy-900 dark:text-white">{s.value}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="AI questions per day" description="Answered, not found, and restricted by role" />
              <div className="p-5"><StackedBars data={questions} series={[{ key: 'answered', label: 'Answered', color: '#2563EB' }, { key: 'notFound', label: 'Not found', color: '#94A3B8' }, { key: 'denied', label: 'Restricted', color: '#F59E0B' }]} /></div>
            </Card>
            <Card>
              <CardHeader title="Uploads and document views" />
              <div className="p-5"><StackedBars data={uploads} series={[{ key: 'uploads', label: 'Uploads', color: '#2563EB' }, { key: 'views', label: 'Views', color: '#93C5FD' }]} /></div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Most frequent events" />
            <div className="p-5">{topActions.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No activity yet.</p> : <HorizontalBars data={topActions} />}</div>
          </Card>
        </>
      )}
    </div>
  )
}
