import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const toneStyles: Record<Tone, string> = {
  success: 'border-emerald-300 dark:border-emerald-800',
  error: 'border-red-300 dark:border-red-800',
  info: 'border-brand-300 dark:border-brand-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = Date.now() + Math.random()
      setItems((list) => [...list.slice(-3), { id, message, tone }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-navy-800',
              toneStyles[t.tone],
            )}
          >
            <p className="flex-1 text-slate-800 dark:text-slate-100">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
