import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/documents'
import type { DocCategory } from '@/types'

type Value = 'all' | DocCategory

export function CategoryFilter({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const options: Value[] = ['all', ...CATEGORIES]
  return (
    <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className={cn(
            'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
            value === c
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700',
          )}
        >
          {c === 'all' ? 'All' : c}
        </button>
      ))}
    </div>
  )
}
