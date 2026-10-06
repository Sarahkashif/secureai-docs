import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Enter your name.')
    if (!isValidEmail(form.email)) return setError('Enter a valid email address.')
    if (form.message.trim().length < 10) return setError('Tell us a little more (at least 10 characters).')
    setError(null)
    setBusy(true)
    const { error: err } = await supabase.from('contact_messages').insert({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
    setBusy(false)
    if (err) return setError('Could not send your message. Try again in a moment.')
    setSent(true)
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-xl px-5 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-navy-900 dark:text-white">Contact us</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Questions about plans, security or Enterprise requirements? Send us a note.</p>
        {sent ? (
          <div className="mt-8 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm">Thanks, your message has been received. We'll reply by email.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {error && <Alert tone="error">{error}</Alert>}
            <Input label="Name" autoComplete="name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" autoComplete="email" value={form.email} maxLength={200} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div>
              <label htmlFor="msg" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Message</label>
              <textarea id="msg" rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100" />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={busy}>Send message</Button>
          </form>
        )}
      </section>
    </PublicLayout>
  )
}
