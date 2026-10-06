import type { DocCategory, DocSensitivity, UserRole } from '@/types'

export const CATEGORIES: DocCategory[] = ['HR', 'Finance', 'Company Policies', 'Operations', 'Legal', 'General']
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const ACCEPTED: Record<string, { mime: string; label: string }> = {
  pdf: { mime: 'application/pdf', label: 'PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  txt: { mime: 'text/plain', label: 'TXT' },
}
export const ACCEPT_ATTR = '.pdf,.docx,.txt'

export const SENSITIVITY_META: Record<
  DocSensitivity,
  { label: string; tone: 'neutral' | 'blue' | 'amber' | 'red'; description: string }
> = {
  personal: { label: 'Personal', tone: 'neutral', description: 'Visible to you, HR managers and admins.' },
  standard: { label: 'Company-wide', tone: 'blue', description: 'Visible to everyone in your organization, except files in the HR category.' },
  hr_confidential: { label: 'HR confidential', tone: 'amber', description: 'HR managers and admins only.' },
  salary: { label: 'Salary records', tone: 'red', description: 'HR managers and admins only.' },
}

/** Employees can only upload personal files; HR managers and admins can choose any class. */
export function allowedSensitivities(role: UserRole): DocSensitivity[] {
  return role === 'employee' ? ['personal'] : ['personal', 'standard', 'hr_confidential', 'salary']
}

export function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED[extOf(file.name)]) return 'Only PDF, DOCX and TXT files are supported.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > MAX_FILE_BYTES) return 'Files must be 10 MB or smaller.'
  return null
}

export function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file'
}

export function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

export function kindLabel(mime: string) {
  return Object.values(ACCEPTED).find((a) => a.mime === mime)?.label ?? 'File'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
}
