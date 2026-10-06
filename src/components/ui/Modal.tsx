import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-navy-800 sm:rounded-2xl',
          wide ? 'max-w-3xl' : 'max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-navy-700">
          <h2 className="min-w-0 break-words text-base font-semibold text-navy-900 dark:text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
