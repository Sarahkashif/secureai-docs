import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ACTION_LABELS, summarize, type AuditRow } from '@/lib/audit'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'

interface Person {
  id: string
  full_name: string | null
  role: string
  is_active: boolean
}

const CONTROLS = [
  'Row Level Security on every table',
  'Role-based access checked before AI retrieval',
  'AI retrieval runs as the user, so unreadable files never reach the model',
  'Private storage bucket with 60-second signed URLs',
  'Server-written, read-only audit log',
  'Rate limiting on uploads, chat, admin and document access',
  'Role, plan and account status editable only through the admin API',
  'Strict CSP and security headers',
]

export default function Security() {
  const [events, setEvents] = useState<AuditRow[] | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    Promise.all([
      supabase.from('audit_logs').select('id, user_id, action, resource_type, resource_id, metadata, ip, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
      supabase.from('profiles').select('id, full_name, role, is_active'),
    ]).then(([a, p]) => {
      if (!active) return
      if (a.error || p.error) return setError('Could not load security data.')
      setEvents((a.data ?? []) as AuditRow[])
      setPeople((p.data ?? []) as Person[])
    })
    return () => {
      active = false
    }
  }, [])

  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.full_name ?? 'Unknown'
  const count = (action: string) => events?.filter((e) => e.action === action).length ?? 0
  const denied = events?.filter((e) => e.action === 'access_denied') ?? []

  const perUser = new Map<string, number>()
  for (const d of denied) if (d.user_id) perUser.set(d.user_id, (perUser.get(d.user_id) ?? 0) + 1)
  const repeat = [...perUser.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])

  const stats = [
    { label: 'Denied requests', value: count('access_denied'), tone: count('access_denied') > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
    { label: 'Failed uploads', value: count('upload_failed'), tone: '' },
    { label: 'Documents deleted', value: count('delete_doc'), tone: '' },
    { label: 'Document views', value: count('view_doc'), tone: '' },
  ]
  const roles = { admin: 0, hr_manager: 0, employee: 0 } as Record<string, number>
  for (const p of people) if (p.is_active) roles[p.role] = (roles[p.role] ?? 0) + 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Security</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Access posture and suspicious activity for the last 7 days.</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {repeat.length > 0 && (
        <Alert tone="info">
          <p className="font-medium">Repeated denied attempts</p>
          <p className="mt-0.5">{repeat.map(([id, n]) => `${nameOf(id)} (${n})`).join(', ')} triggered 3 or more access denials this week. Review the audit log.</p>
        </Alert>
      )}
      {!events && !error ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : events && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className={`mt-2 text-2xl font-semibold text-navy-900 dark:text-white ${s.tone}`}>{s.value}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent denied requests" description="Blocked by role-based access control" />
              {denied.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No denied requests this week.</p> : (
                <ul className="divide-y divide-slate-200 dark:divide-navy-700">
                  {denied.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-start gap-3 px-5 py-3">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-navy-900 dark:text-white">{nameOf(d.user_id)}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{summarize(d) || ACTION_LABELS[d.action]}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{formatDateTime(d.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Active accounts" />
              <dl className="divide-y divide-slate-200 text-sm dark:divide-navy-700">
                {[['Admins', roles.admin], ['HR managers', roles.hr_manager], ['Employees', roles.employee]].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between px-5 py-3"><dt className="text-slate-600 dark:text-slate-300">{k}</dt><dd className="font-medium text-navy-900 dark:text-white">{v}</dd></div>
                ))}
                <div className="flex justify-between px-5 py-3"><dt className="text-slate-600 dark:text-slate-300">Deactivated</dt><dd><Badge>{people.filter((p) => !p.is_active).length}</Badge></dd></div>
              </dl>
            </Card>
          </div>
          <Card>
            <CardHeader title="Active security controls" />
            <ul className="grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2">
              {CONTROLS.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{c}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
