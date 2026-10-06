import { Link } from 'react-router-dom'
import { FileText, HardDrive, MessageSquareText, Users, CreditCard, Upload, ShieldAlert } from 'lucide-react'
import { StackedBars, HorizontalBars } from '@/components/charts/Charts'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Alert } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatBytes } from '@/lib/documents'
import { planInfo, formatLimit } from '@/lib/plans'
import { PLAN_LABELS } from '@/lib/roles'
import { dayKey, lastNDays, timeAgo } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

function Stat({ icon: Icon, label, value, children }: { icon: LucideIcon; label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold text-navy-900 dark:text-white">{value}</p>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}

export default function Dashboard() {
  const { profile, organization } = useAuth()
  const { data, error, loading } = useDashboardData()
  if (!profile || !organization) return null

  const plan = planInfo(organization.plan)
  const firstName = profile.full_name?.split(' ')[0]
  const isManager = profile.role === 'admin' || profile.role === 'hr_manager'

  const days = lastNDays(7)
  const perDay = days.map((d) => ({ label: d.label, answered: 0, notFound: 0, denied: 0 }))
  const index = new Map(days.map((d, i) => [d.key, i]))
  for (const q of data?.queries ?? []) {
    const i = index.get(dayKey(new Date(q.created_at)))
    if (i === undefined) continue
    if (q.was_denied) perDay[i].denied++
    else if (q.found) perDay[i].answered++
    else perDay[i].notFound++
  }
  const categoryData = Object.entries(data?.byCategory ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  const timeline = [
    ...(data?.recentDocs ?? []).map((d) => ({ id: `d${d.id}`, at: d.created_at, text: `Document added: ${d.title}`, tone: 'blue' as const })),
    ...(data?.queries ?? []).slice(0, 8).map((q) => ({
      id: `q${q.id}`,
      at: q.created_at,
      text: q.was_denied ? 'A request was restricted by your role' : `Asked: ${q.question.slice(0, 80)}`,
      tone: q.was_denied ? ('amber' as const) : ('neutral' as const),
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{organization.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/upload" className={buttonStyles('secondary')}><Upload className="h-4 w-4" /> Upload</Link>
          <Link to="/app/chat" className={buttonStyles('primary')}><MessageSquareText className="h-4 w-4" /> Ask AI</Link>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : data && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={FileText} label="Documents you can access" value={data.totalDocs.toLocaleString()}>
              <Progress value={data.totalDocs} max={plan.maxDocuments} label="Document usage" />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">of {formatLimit(plan.maxDocuments)} on your plan</p>
            </Stat>
            {isManager ? (
              <Stat icon={Users} label="Team members" value={(data.team ?? 0).toLocaleString()}>
                <p className="text-xs text-slate-500 dark:text-slate-400">of {formatLimit(plan.maxUsers)} on your plan</p>
              </Stat>
            ) : (
              <Stat icon={MessageSquareText} label="Your questions (14 days)" value={data.queries.length.toLocaleString()} />
            )}
            <Stat icon={HardDrive} label="Storage used" value={formatBytes(data.storageBytes)}>
              <Progress value={data.storageBytes / 1048576} max={plan.storageMb} label="Storage usage" />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">of {plan.storageMb ? `${plan.storageMb >= 1024 ? `${plan.storageMb / 1024} GB` : `${plan.storageMb} MB`}` : 'Unlimited'}</p>
            </Stat>
            <Stat icon={CreditCard} label="Subscription" value={PLAN_LABELS[organization.plan]}>
              <div className="flex items-center justify-between">
                <Badge tone="green">Active</Badge>
                {profile.role === 'admin' ? <Link to="/app/admin/subscription" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">Manage</Link> : <Link to="/pricing" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">Compare plans</Link>}
              </div>
            </Stat>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Your AI questions" description="Last 7 days" />
              <div className="p-5">
                {data.queries.length === 0 ? <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No questions yet. Ask the assistant something to see activity here.</p> : (
                  <StackedBars data={perDay} series={[{ key: 'answered', label: 'Answered', color: '#2563EB' }, { key: 'notFound', label: 'Not found', color: '#94A3B8' }, { key: 'denied', label: 'Restricted', color: '#F59E0B' }]} />
                )}
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Documents by category" />
              <div className="p-5">
                {categoryData.length === 0 ? <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No documents yet.</p> : <HorizontalBars data={categoryData} />}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Recent uploads" action={<Link to="/app/library" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">View all</Link>} />
              {data.recentDocs.length === 0 ? (
                <EmptyState icon={FileText} title="No documents yet" description="Upload a file and the assistant can answer questions from it." action={<Link to="/app/upload" className={buttonStyles('primary')}>Upload a document</Link>} />
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-navy-700">
                  {data.recentDocs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy-900 dark:text-white">{d.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{d.category} &middot; {timeAgo(d.created_at)}</p>
                      </div>
                      <Badge tone={d.status === 'ready' ? 'green' : d.status === 'failed' ? 'red' : 'amber'}>{d.status === 'ready' ? 'Ready' : d.status === 'failed' ? 'Failed' : 'Indexing'}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Recent AI queries" action={<Link to="/app/chat" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">Open chat</Link>} />
              {data.queries.length === 0 ? (
                <EmptyState icon={MessageSquareText} title="No questions yet" description="Your recent questions to the assistant will appear here." action={<Link to="/app/chat" className={buttonStyles('primary')}>Ask a question</Link>} />
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-navy-700">
                  {data.queries.slice(0, 5).map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-navy-900 dark:text-white">{q.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(q.created_at)}</p>
                      </div>
                      {q.was_denied ? <Badge tone="amber">Restricted</Badge> : q.found ? <Badge tone="green">Answered</Badge> : <Badge>Not found</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Activity timeline" description="Your latest uploads and questions" />
            {timeline.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">Activity will appear here as you use SecureAI Docs.</p> : (
              <ol className="relative px-5 py-4">
                {timeline.map((t, i) => (
                  <li key={t.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < timeline.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200 dark:bg-navy-700" aria-hidden />}
                    <span className={`relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white dark:border-navy-800 ${t.tone === 'blue' ? 'bg-brand-600' : t.tone === 'amber' ? 'bg-amber-500' : 'bg-slate-400'}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800 dark:text-slate-100">{t.text}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(t.at)}</p>
                    </div>
                    {t.tone === 'amber' && <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
