import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, type = 'text', className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400',
            'border-slate-300 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100',
            error && 'border-red-500 dark:border-red-500',
            isPassword && 'pr-10',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
