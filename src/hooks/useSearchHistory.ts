import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

/** Last few distinct searches for the signed-in user (own rows only, enforced by RLS). */
export function useSearchHistory() {
  const { user } = useAuth()
  const [items, setItems] = useState<string[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('search_history').select('query').order('created_at', { ascending: false }).limit(20)
    const unique = [...new Set((data ?? []).map((r: { query: string }) => r.query))]
    setItems(unique.slice(0, 5))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const record = useCallback(
    async (query: string) => {
      const q = query.trim()
      if (!user || q.length < 2 || q === items[0]) return
      await supabase.from('search_history').insert({ user_id: user.id, query: q })
      void load()
    },
    [user, items, load],
  )

  return { items, record }
}
