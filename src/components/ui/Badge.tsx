import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red'
const tones: Record<Tone, string> = {
  neutral: 'bg-slate-200 text-slate-700 dark:bg-navy-700 dark:text-slate-200',
  blue: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}

export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  )
}
