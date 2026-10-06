import { cn } from '@/lib/utils'

export function Progress({ value, max, label }: { value: number; max: number | null; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-700" role="progressbar" aria-label={label} aria-valuenow={max ? pct : undefined} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: max ? `${Math.max(pct, value > 0 ? 2 : 0)}%` : '0%' }} />
      </div>
    </div>
  )
}
