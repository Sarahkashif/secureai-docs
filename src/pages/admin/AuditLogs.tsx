import { useCallback, useEffect, useState } from 'react'
import { Download, ScrollText } from 'lucide-react'
import { ACTION_LABELS, actionTone, summarize, toCsv, type AuditRow } from '@/lib/audit'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'

const PAGE = 50

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [action, setAction] = useState('all')
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(({ data }) => setNames(new Map((data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? 'Unnamed']))))
  }, [])

  const load = useCallback(async (from: number, replace: boolean) => {
    let q = supabase.from('audit_logs').select('id, user_id, action, resource_type, resource_id, metadata, ip, created_at').order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (action !== 'all') q = q.eq('action', action)
    const { data, error: err } = await q
    if (err) setError('Could not load the audit log.')
    else {
      setError(null)
      const list = (data ?? []) as AuditRow[]
      setRows((prev) => (replace ? list : [...prev, ...list]))
      setMore(list.length === PAGE)
    }
    setLoading(false)
  }, [action])

  useEffect(() => {
    setLoading(true)
    void load(0, true)
  }, [load])

  function exportCsv() {
    const csv = toCsv([['Time', 'User', 'Action', 'Details', 'IP'], ...rows.map((r) => [r.created_at, names.get(r.user_id ?? '') ?? r.user_id ?? '', r.action, summarize(r), r.ip ?? ''])])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Audit logs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Written only by the server. Read-only for administrators.</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-48">
            <Select label="Event type" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="all">All events</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export CSV</Button>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events" description="Nothing matches this filter yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-navy-700 dark:text-slate-400">
                  <th scope="col" className="px-5 py-3 font-medium">Time</th>
                  <th scope="col" className="px-3 py-3 font-medium">User</th>
                  <th scope="col" className="px-3 py-3 font-medium">Event</th>
                  <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Details</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(r.created_at)}</td>
                    <td className="px-3 py-3 text-slate-800 dark:text-slate-100">{names.get(r.user_id ?? '') ?? 'System'}</td>
                    <td className="px-3 py-3"><Badge tone={actionTone(r.action)}>{ACTION_LABELS[r.action] ?? r.action}</Badge></td>
                    <td className="hidden max-w-xs truncate px-3 py-3 text-slate-600 dark:text-slate-300 md:table-cell" title={summarize(r)}>{summarize(r)}</td>
                    <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">{r.ip ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {more && !loading && <div className="border-t border-slate-200 p-4 text-center dark:border-navy-700"><Button variant="secondary" onClick={() => load(rows.length, false)}>Load more</Button></div>}
      </Card>
    </div>
  )
}
