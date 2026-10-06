import { useState, type FormEvent } from 'react'
import { Check, Minus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { checkPassword, isPasswordValid } from '@/lib/password'
import { PLAN_LABELS, ROLE_CAPABILITIES, ROLE_LABELS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/documents'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

export default function Profile() {
  const { profile, organization, user, refreshProfile, updatePassword } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [dept, setDept] = useState(profile?.department ?? '')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  if (!profile || !organization) return null
  const caps = ROLE_CAPABILITIES[profile.role]

  async function saveDetails(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Enter your full name.')
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), department: dept.trim() || null }).eq('id', profile!.id)
    setSaving(false)
    if (error) return toast.error('Could not save your profile.')
    await refreshProfile()
    toast.success('Profile updated.')
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    if (!isPasswordValid(pw)) return setPwError('Password does not meet all requirements.')
    if (pw !== pw2) return setPwError('Passwords do not match.')
    setPwError(null)
    setPwSaving(true)
    const res = await updatePassword(pw)
    setPwSaving(false)
    if (res.error) return setPwError(res.error)
    setPw('')
    setPw2('')
    toast.success('Password updated.')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your details and password.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your details" />
          <form onSubmit={saveDetails} className="space-y-4 p-5">
            <Input label="Full name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <Input label="Department" value={dept} maxLength={100} onChange={(e) => setDept(e.target.value)} />
            <Input label="Email" value={user?.email ?? ''} disabled readOnly hint="Email changes are handled by your administrator." />
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={savePassword} className="space-y-4 p-5" noValidate>
            {pwError && <Alert tone="error">{pwError}</Alert>}
            <div>
              <Input label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
                {checkPassword(pw).map((c) => (
                  <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {c.passed ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <Button type="submit" loading={pwSaving}>Update password</Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader title="Account" description={`${organization.name} \u00b7 ${PLAN_LABELS[organization.plan]} plan \u00b7 member since ${formatDate(profile.created_at)}`} action={<Badge tone="blue">{ROLE_LABELS[profile.role]}</Badge>} />
        <ul className="divide-y divide-slate-200 dark:divide-navy-700">
          {caps.can.map((item) => (
            <li key={item} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-800 dark:text-slate-100">
              <Check className="h-4 w-4 text-emerald-600" aria-hidden /><span className="flex-1">{item}</span><Badge tone="green">Allowed</Badge>
            </li>
          ))}
          {caps.cannot.map((item) => (
            <li key={item} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
              <Minus className="h-4 w-4 text-slate-400" aria-hidden /><span className="flex-1">{item}</span><Badge>Restricted</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
