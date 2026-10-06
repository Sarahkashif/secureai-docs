import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name?: string | null, fallback = '?') {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The last n calendar days (oldest first) with a short axis label. */
export function lastNDays(n: number) {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' })
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ key: dayKey(d), label: fmt.format(d) })
  }
  return out
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
