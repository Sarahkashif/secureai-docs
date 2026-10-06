import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

interface Item {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export default function Notifications() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error: err } = await supabase.from('notifications').select('id, title, body, is_read, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (err) setError('Could not load notifications.')
    else setItems((data ?? []) as Item[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function markRead(ids: string[]) {
    if (!user || ids.length === 0) return
    setItems((list) => list.map((i) => (ids.includes(i.id) ? { ...i, is_read: true } : i)))
    await supabase.from('notifications').update({ is_read: true }).in('id', ids).eq('user_id', user.id)
  }

  const unread = items.filter((i) => !i.is_read)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{unread.length > 0 ? `${unread.length} unread` : 'You are all caught up.'}</p>
        </div>
        {unread.length > 0 && <Button variant="secondary" onClick={() => markRead(unread.map((i) => i.id))}>Mark all as read</Button>}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="You'll be notified when documents finish indexing, roles change and more." />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-navy-700">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => !n.is_read && markRead([n.id])} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-white dark:hover:bg-navy-700/50">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.is_read ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-navy-900 dark:text-white'}`}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{n.body}</span>}
                    <span className="mt-1 block text-xs text-slate-500">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="sr-only">Unread</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
