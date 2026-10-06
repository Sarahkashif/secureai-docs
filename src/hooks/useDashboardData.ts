import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export interface RecentDoc {
  id: string
  title: string
  category: string
  status: string
  created_at: string
  owner?: { full_name: string | null } | null
}
export interface QueryRow {
  id: string
  question: string
  found: boolean | null
  was_denied: boolean
  created_at: string
}
export interface DashboardData {
  totalDocs: number
  storageBytes: number
  byCategory: Record<string, number>
  team: number | null
  recentDocs: RecentDoc[]
  queries: QueryRow[]
}

/** Every query runs as the signed-in user, so all numbers already respect their role. */
export function useDashboardData() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profile) return
    let active = true
    const since = new Date(Date.now() - 13 * 86_400_000).toISOString()
    const seesTeam = profile.role === 'admin' || profile.role === 'hr_manager'
    ;(async () => {
      const [stats, recent, queries, team] = await Promise.all([
        supabase.rpc('dashboard_stats'),
        supabase.from('documents').select('id, title, category, status, created_at, owner:profiles(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('chat_queries').select('id, question, found, was_denied, created_at').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(500),
        seesTeam ? supabase.from('profiles').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: null, error: null }),
      ])
      if (!active) return
      if (stats.error || recent.error || queries.error) {
        setError('Could not load your dashboard. Try again.')
      } else {
        const s = (stats.data ?? {}) as { documents?: number; storage_bytes?: number; by_category?: Record<string, number> }
        setData({
          totalDocs: s.documents ?? 0,
          storageBytes: s.storage_bytes ?? 0,
          byCategory: s.by_category ?? {},
          team: team.count,
          recentDocs: (recent.data ?? []) as unknown as RecentDoc[],
          queries: (queries.data ?? []) as QueryRow[],
        })
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [user, profile])

  return { data, error, loading }
}
