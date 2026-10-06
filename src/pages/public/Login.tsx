import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail } from '@/lib/utils'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 60

export default function Login() {
  const { signIn, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedFor, setLockedFor] = useState(0)

  // Client-side cool-down is a UX guard only; Supabase enforces real server-side auth rate limits.
  useEffect(() => {
    if (lockedFor <= 0) return
    const t = window.setTimeout(() => setLockedFor((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [lockedFor])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (lockedFor > 0) return
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')

    setError(null)
    setSubmitting(true)
    const result = await signIn(email, password)
    setSubmitting(false)

    if (result.error) {
      const next = attempts + 1
      setAttempts(next)
      if (next >= MAX_ATTEMPTS) {
        setAttempts(0)
        setLockedFor(LOCK_SECONDS)
        setError(`Too many failed attempts. Try again in ${LOCK_SECONDS} seconds.`)
      } else {
        setError(result.error)
      }
    }
    // On success AuthContext updates and PublicOnlyRoute redirects into the app.
  }

  const message = lockedFor > 0 ? `Too many failed attempts. Try again in ${lockedFor}s.` : (error ?? authError)

  return (
    <AuthLayout
      title="Sign in to SecureAI Docs"
      subtitle="Use the email and password for your workspace."
      footer={
        <>
          New to SecureAI Docs?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Create a workspace
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {message && <Alert tone="error">{message}</Alert>}
        <Input label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={lockedFor > 0}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
