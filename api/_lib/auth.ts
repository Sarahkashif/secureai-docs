import type { VercelRequest } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.js'
import { admin, asUser } from './supabase.js'

export type Role = 'employee' | 'hr_manager' | 'admin'

export interface AuthContext {
  userId: string
  orgId: string
  role: Role
  fullName: string | null
  /** Service-role client (bypasses RLS). */
  db: SupabaseClient
  /** Client acting as the user (RLS applies). */
  userDb: SupabaseClient
}

/** Verifies the bearer token with Supabase Auth, then loads the caller's active profile. */
export async function authenticate(req: VercelRequest): Promise<AuthContext> {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new HttpError(401, 'Sign in to continue.')

  const db = admin()
  const { data: userData, error } = await db.auth.getUser(token)
  if (error || !userData.user) throw new HttpError(401, 'Your session has expired. Sign in again.')

  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role, full_name, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!profile || !profile.is_active) throw new HttpError(403, 'This account does not have access.')

  return {
    userId: userData.user.id,
    orgId: profile.org_id,
    role: profile.role as Role,
    fullName: profile.full_name,
    db,
    userDb: asUser(token),
  }
}
