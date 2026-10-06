import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DocCategory, DocumentRow } from '@/types'

interface Filters {
  search: string
  category: 'all' | DocCategory
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`)

/** Row Level Security decides which documents come back, so the UI never has to filter by role. */
export function useDocuments({ search, category }: Filters) {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      let q = supabase
        .from('documents')
        .select(
          'id, org_id, owner_id, title, file_path, mime_type, size_bytes, category, sensitivity, status, page_count, chunk_count, error_message, created_at, owner:profiles(full_name)',
        )
      if (category !== 'all') q = q.eq('category', category)
      if (search.trim()) q = q.ilike('title', `%${escapeLike(search.trim())}%`)

      const { data, error: err } = await q.order('created_at', { ascending: false }).limit(200)
      if (!active) return
      if (err) setError('Could not load documents. Try again.')
      else {
        setError(null)
        setDocuments((data ?? []) as unknown as DocumentRow[])
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [search, category, tick])

  // Re-check while anything is still being indexed.
  const processing = documents.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const t = window.setInterval(() => setTick((n) => n + 1), 4000)
    return () => window.clearInterval(t)
  }, [processing])

  const refetch = useCallback(() => setTick((n) => n + 1), [])
  return { documents, loading, error, refetch }
}
