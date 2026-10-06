import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail } from '@/lib/utils'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    setError(null)
    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)
    if (result.error) return setError(result.error)
    setDone(true)
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        // Identical message whether or not the account exists, so emails cannot be enumerated.
        <Alert tone="success">If an account exists for {email}, a reset link is on its way. The link expires after one hour.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
