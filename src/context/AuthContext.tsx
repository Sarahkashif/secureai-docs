import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Organization, Profile } from '@/types'

interface ProfileState {
  userId: string | null
  profile: Profile | null
  organization: Organization | null
}

interface SignUpInput {
  email: string
  password: string
  fullName: string
  orgName: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (input: SignUpInput) => Promise<{ error?: string; needsConfirmation?: boolean }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error?: string }>
  updatePassword: (password: string) => Promise<{ error?: string }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<{ profile: Profile | null; organization: Organization | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, org_id, full_name, department, role, is_active, created_at, organization:organizations(id, name, plan)')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return { profile: null, organization: null }
  const { organization, ...profile } = data as unknown as Profile & { organization: Organization | null }
  return { profile, organization }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [state, setState] = useState<ProfileState>({ userId: null, profile: null, organization: null })
  const [authError, setAuthError] = useState<string | null>(null)

  // 1) Session bootstrap + live updates (token refresh, sign-out in another tab, recovery links)
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setSessionReady(true)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // 2) Load the profile whenever the signed-in user changes (kept out of the auth callback to avoid deadlocks)
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!sessionReady) return
    if (!userId) {
      setState({ userId: null, profile: null, organization: null })
      return
    }
    let active = true
    fetchProfile(userId).then(async (result) => {
      if (!active) return
      if (!result.profile || !result.profile.is_active) {
        // RLS hides deactivated accounts, so a missing profile means "no access".
        setAuthError('This account is deactivated or has no workspace. Contact your administrator.')
        setState({ userId, profile: null, organization: null })
        await supabase.auth.signOut()
        return
      }
      setAuthError(null)
      setState({ userId, ...result })
    })
    return () => {
      active = false
    }
  }, [userId, sessionReady])

  const loading = !sessionReady || (!!userId && state.userId !== userId)

  const signIn: AuthContextValue['signIn'] = useCallback(async (email, password) => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    // Same message for every failure so the form never reveals which emails exist.
    if (error) return { error: 'Invalid email or password.' }
    void apiFetch('/api/audit', { event: 'login' }).catch(() => undefined)
    return {}
  }, [])

  const signUp: AuthContextValue['signUp'] = useCallback(async ({ email, password, fullName, orgName }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim(), org_name: orgName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) return { error: error.message }
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    await apiFetch('/api/audit', { event: 'logout' }).catch(() => undefined)
    await supabase.auth.signOut()
  }, [])

  const requestPasswordReset: AuthContextValue['requestPasswordReset'] = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error ? { error: 'Could not send the reset email. Try again in a few minutes.' } : {}
  }, [])

  const updatePassword: AuthContextValue['updatePassword'] = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { error: error.message } : {}
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const result = await fetchProfile(userId)
    if (result.profile) setState({ userId, ...result })
  }, [userId])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: state.profile,
      organization: state.organization,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [session, state, loading, authError, signIn, signUp, signOut, requestPasswordReset, updatePassword, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
