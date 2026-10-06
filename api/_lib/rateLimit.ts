import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.js'

/** Fixed-window limiter backed by the check_rate_limit() SQL function. Fails closed if the check cannot run. */
export async function enforceRateLimit(db: SupabaseClient, key: string, max: number, windowSeconds: number, message = 'Too many requests. Wait a moment and try again.') {
  const { data, error } = await db.rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Rate limit check failed', error.message)
    throw new HttpError(503, 'Service temporarily unavailable. Try again shortly.')
  }
  if (data === false) throw new HttpError(429, message)
}
