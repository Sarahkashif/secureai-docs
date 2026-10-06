import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export interface RecentQuestion {
  id: string
  question: string
  was_denied: boolean
  created_at: string
}

/** The signed-in user's own latest questions. (Admins can read everyone's rows, so this filters by user explicitly.) */
export function useRecentQuestions(limit = 8) {
  const { user } = useAuth()
  const [items, setItems] = useState<RecentQuestion[]>([])

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('chat_queries')
      .select('id, question, was_denied, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    setItems((data ?? []) as RecentQuestion[])
  }, [user, limit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { items, refresh }
}
