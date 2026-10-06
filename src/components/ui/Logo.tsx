import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-semibold tracking-tight', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn('text-lg', light ? 'text-white' : 'text-navy-900 dark:text-white')}>SecureAI Docs</span>
    </span>
  )
}
