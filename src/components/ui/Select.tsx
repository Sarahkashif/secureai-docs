import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ label, hint, className, id, children, ...rest }, ref) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-describedby={hint ? `${selectId}-hint` : undefined}
        className={cn(
          'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && (
        <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
})
