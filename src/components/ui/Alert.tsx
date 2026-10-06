import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'error' | 'success' | 'info'
const styles: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  info: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-100',
}
const icons = { error: AlertCircle, success: CheckCircle2, info: Info }

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const Icon = icons[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border p-3 text-sm', styles[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
