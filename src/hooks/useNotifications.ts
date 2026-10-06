import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

/** Unread count for the bell. Refreshes on every navigation, which also covers returning from the Notifications page. */
export function useUnreadCount() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count: c }) => active && setCount(c ?? 0))
    return () => {
      active = false
    }
  }, [user, pathname])

  return count
}
