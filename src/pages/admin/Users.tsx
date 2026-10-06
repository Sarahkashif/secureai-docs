import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Copy, UserPlus, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { ROLE_LABELS } from '@/lib/roles'
import { formatDateTime, isValidEmail } from '@/lib/utils'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { UserRole } from '@/types'

interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  department: string | null
  role: UserRole
  is_active: boolean
  last_sign_in_at: string | null
}

export default function Users() {
  const { user } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ users: AdminUser[] }>('/api/admin', { action: 'list_users' })
      setUsers(res.users)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, body: Record<string, unknown>, success: string) {
    setBusy(id)
    try {
      await apiFetch('/api/admin', body)
      toast.success(success)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">User management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Invite people, assign roles and deactivate access. Every change is audited.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" /> Invite user</Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users" description="Invite your first teammate." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-navy-700 dark:text-slate-400">
                  <th scope="col" className="px-5 py-3 font-medium">User</th>
                  <th scope="col" className="px-3 py-3 font-medium">Role</th>
                  <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Last sign-in</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
                {users.map((u) => {
                  const self = u.id === user?.id
                  return (
                    <tr key={u.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-navy-900 dark:text-white">{u.full_name || 'Unnamed'}{self && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}{u.department ? ` \u00b7 ${u.department}` : ''}</p>
                      </td>
                      <td className="px-3 py-3">
                        {self ? <Badge tone="blue">{ROLE_LABELS[u.role]}</Badge> : (
                          <select
                            aria-label={`Role for ${u.full_name ?? u.email}`}
                            value={u.role}
                            disabled={busy === u.id}
                            onChange={(e) => act(u.id, { action: 'set_role', userId: u.id, role: e.target.value }, 'Role updated.')}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
                          >
                            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 dark:text-slate-300 md:table-cell">{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : 'Never'}</td>
                      <td className="px-3 py-3"><Badge tone={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge></td>
                      <td className="px-5 py-3 text-right">
                        {!self && (
                          <Button size="sm" variant="secondary" loading={busy === u.id} onClick={() => act(u.id, { action: 'set_active', userId: u.id, active: !u.is_active }, u.is_active ? 'User deactivated.' : 'User reactivated.')}>
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onDone={load} />}
    </div>
  )
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ fullName: '', email: '', department: '', role: 'employee' as UserRole })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (form.fullName.trim().length < 2) return setError('Enter their full name.')
    if (!isValidEmail(form.email)) return setError('Enter a valid email address.')
    setError(null)
    setBusy(true)
    try {
      const res = await apiFetch<{ tempPassword: string }>('/api/admin', { action: 'invite', ...form, department: form.department || undefined })
      setCreated({ email: form.email, password: res.tempPassword })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite this user.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal title="User created" onClose={onClose}>
        <p className="text-sm text-slate-600 dark:text-slate-300">Share these sign-in details with {created.email} through a secure channel. <strong>The password is shown only once.</strong> They can change it from their profile.</p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-navy-700 dark:bg-navy-900">
          <code className="break-all text-sm text-navy-900 dark:text-white">{created.password}</code>
          <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(created.password); toast.success('Copied.') }}><Copy className="h-4 w-4" /> Copy</Button>
        </div>
        <div className="mt-6 flex justify-end"><Button onClick={onClose}>Done</Button></div>
      </Modal>
    )
  }

  return (
    <Modal title="Invite a user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Input label="Full name" value={form.fullName} maxLength={100} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input label="Work email" type="email" value={form.email} maxLength={200} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Department (optional)" value={form.department} maxLength={100} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Create user</Button>
        </div>
      </form>
    </Modal>
  )
}
