import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-slate-50 shadow-card dark:border-navy-700 dark:bg-navy-800',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-navy-700">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
