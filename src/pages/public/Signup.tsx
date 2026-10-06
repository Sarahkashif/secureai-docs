import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, MailCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { checkPassword, isPasswordValid } from '@/lib/password'
import { isValidEmail } from '@/lib/utils'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Signup() {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ fullName: '', orgName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name.'
    if (form.orgName.trim().length < 2) next.orgName = 'Enter your organization name.'
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.'
    if (!isPasswordValid(form.password)) next.password = 'Password does not meet all requirements.'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    setSubmitting(true)
    const result = await signUp(form)
    setSubmitting(false)
    if (result.error) return setFormError(result.error)
    if (result.needsConfirmation) setSentTo(form.email)
    // Otherwise a session exists and PublicOnlyRoute redirects into the app.
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email">
        <div className="space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
            <MailCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We sent a confirmation link to <strong className="text-slate-900 dark:text-white">{sentTo}</strong>. Open it to activate your workspace, then sign in.
          </p>
          <Link to="/login" className={buttonStyles('secondary', 'md', 'w-full')}>
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="You'll be the administrator and can invite your team afterwards."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Input label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Input label="Organization" autoComplete="organization" value={form.orgName} onChange={set('orgName')} error={errors.orgName} />
        <Input label="Work email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <div>
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
            {checkPassword(form.password).map((c) => (
              <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {c.passed ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create workspace
        </Button>
      </form>
    </AuthLayout>
  )
}
