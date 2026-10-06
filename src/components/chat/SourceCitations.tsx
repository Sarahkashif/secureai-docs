import { useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSource } from '@/hooks/useChat'

export function SourceCitations({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false)
  if (sources.length === 0) return null
  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-navy-700">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden />
        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {sources.map((s) => (
            <li key={s.index} className="rounded-lg bg-white p-3 dark:bg-navy-900">
              <p className="flex items-center gap-2 text-xs font-medium text-navy-900 dark:text-white">
                <span className="inline-flex min-w-4 items-center justify-center rounded bg-brand-100 px-1 text-[11px] font-semibold text-brand-800 dark:bg-brand-900/60 dark:text-brand-100">
                  {s.index}
                </span>
                <span className="truncate">{s.title}</span>
              </p>
              <p className="mt-1.5 line-clamp-3 text-xs text-slate-600 dark:text-slate-400">{s.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
