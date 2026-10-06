import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable ${name}`)
  return v
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

let adminClient: SupabaseClient | null = null

/** Service-role client. Bypasses RLS: only use after the caller has been authenticated and authorized in code. */
export function admin(): SupabaseClient {
  adminClient ??= createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), opts)
  return adminClient
}

/** Client that acts as the signed-in user, so Row Level Security applies to every query. */
export function asUser(token: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}
