import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCEPT_ATTR } from '@/lib/documents'

export function UploadZone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const open = () => !disabled && input.current?.click()
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) onFiles(Array.from(e.dataTransfer.files))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Choose files to upload"
      onClick={open}
      onKeyDown={onKey}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        dragging
          ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30'
          : 'border-slate-300 bg-slate-50 hover:border-brand-400 dark:border-navy-700 dark:bg-navy-800',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <UploadCloud className="h-9 w-9 text-brand-600 dark:text-brand-300" aria-hidden />
      <p className="mt-3 text-sm font-medium text-navy-900 dark:text-white">Drop files here, or click to browse</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF, DOCX or TXT. Up to 10 MB each.</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}
