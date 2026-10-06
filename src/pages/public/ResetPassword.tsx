import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { checkPassword, isPasswordValid } from '@/lib/password'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FullPageSpinner } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Check, Circle } from 'lucide-react'

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <FullPageSpinner />

  // The recovery link signs the user in with a short-lived session. No session means the link is invalid or expired.
  if (!session) {
    return (
      <AuthLayout title="This reset link has expired">
        <div className="space-y-5">
          <Alert tone="error">Reset links work once and expire after an hour. Request a new one to continue.</Alert>
          <Link to="/forgot-password" className={buttonStyles('primary', 'lg', 'w-full')}>
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isPasswordValid(password)) return setError('Password does not meet all requirements.')
    if (password !== confirm) return setError('Passwords do not match.')
    setError(null)
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) return setError(result.error)
    toast.success('Password updated.')
    navigate('/app', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
            {checkPassword(password).map((c) => (
              <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {c.passed ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
