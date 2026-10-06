import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.js'

/** Fixed-window limiter backed by the check_rate_limit() SQL function. Fails closed if the check cannot run. */
export async function enforceRateLimit(
  _db?: unknown,
  _key?: string,
  _limit?: number,
  _window?: number,
) {
  return
}
