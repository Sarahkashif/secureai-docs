import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-navy-700', className)} />
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-navy-700 dark:border-t-brand-400" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-navy-900">
      <Spinner label="Loading your workspace" />
    </div>
  )
}
