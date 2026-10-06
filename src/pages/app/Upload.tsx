import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileText, Loader2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import {
  ACCEPTED,
  allowedSensitivities,
  CATEGORIES,
  extOf,
  formatBytes,
  safeName,
  SENSITIVITY_META,
  stripExt,
  validateFile,
} from '@/lib/documents'
import { supabase } from '@/lib/supabase'
import { UploadZone } from '@/components/documents/UploadZone'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import type { DocCategory, DocSensitivity } from '@/types'

type ItemStatus = 'queued' | 'uploading' | 'indexing' | 'ready' | 'failed'
interface QueueItem {
  id: string
  file: File
  status: ItemStatus
  error?: string
}

const STATUS_TEXT: Record<ItemStatus, string> = {
  queued: 'Ready to upload',
  uploading: 'Uploading...',
  indexing: 'Reading and indexing...',
  ready: 'Indexed and ready',
  failed: 'Failed',
}

export default function Upload() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'employee'
  const sensitivities = allowedSensitivities(role)

  const [category, setCategory] = useState<DocCategory>('General')
  const [sensitivity, setSensitivity] = useState<DocSensitivity>(sensitivities[0])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const queued = queue.filter((i) => i.status === 'queued')
  const finished = queue.length > 0 && queue.every((i) => i.status === 'ready' || i.status === 'failed')

  function addFiles(files: File[]) {
    const accepted: QueueItem[] = []
    const problems: string[] = []
    for (const file of files) {
      const problem = validateFile(file)
      if (problem) problems.push(`${file.name}: ${problem}`)
      else accepted.push({ id: crypto.randomUUID(), file, status: 'queued' })
    }
    setRejected(problems)
    setQueue((q) => [...q.filter((i) => i.status !== 'ready'), ...accepted])
  }

  const patch = (id: string, change: Partial<QueueItem>) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...change } : i)))

  async function run() {
    if (!profile || running) return
    setRunning(true)
    for (const item of queued) {
      patch(item.id, { status: 'uploading' })
      const path = `${profile.org_id}/${profile.id}/${crypto.randomUUID()}-${safeName(item.file.name)}`
      const { error } = await supabase.storage
        .from('documents')
        .upload(path, item.file, { contentType: ACCEPTED[extOf(item.file.name)].mime, upsert: false })
      if (error) {
        patch(item.id, { status: 'failed', error: 'Upload failed. Check your connection and try again.' })
        continue
      }
      patch(item.id, { status: 'indexing' })
      try {
        await apiFetch('/api/ingest', { filePath: path, title: stripExt(item.file.name).slice(0, 200), category, sensitivity })
        patch(item.id, { status: 'ready' })
      } catch (e) {
        patch(item.id, { status: 'failed', error: e instanceof Error ? e.message : 'Indexing failed.' })
      }
    }
    setRunning(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Upload documents</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Files are stored privately, read, and indexed so the AI assistant can answer questions from them.
        </p>
      </div>

      <Card>
        <CardHeader title="Settings for this upload" description="Applies to every file in the list below." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as DocCategory)} disabled={running}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select
            label="Who can open it"
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value as DocSensitivity)}
            disabled={running || sensitivities.length === 1}
            hint={SENSITIVITY_META[sensitivity].description}
          >
            {sensitivities.map((s) => (
              <option key={s} value={s}>
                {SENSITIVITY_META[s].label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <UploadZone onFiles={addFiles} disabled={running} />

      {rejected.length > 0 && (
        <Alert tone="error">
          <p className="font-medium">Some files were skipped:</p>
          <ul className="mt-1 list-disc pl-5">
            {rejected.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}

      {queue.length > 0 && (
        <Card>
          <CardHeader
            title={`${queue.length} ${queue.length === 1 ? 'file' : 'files'}`}
            action={
              queued.length > 0 && (
                <Button onClick={run} loading={running}>
                  Upload {queued.length} {queued.length === 1 ? 'file' : 'files'}
                </Button>
              )
            }
          />
          <ul className="divide-y divide-slate-200 dark:divide-navy-700">
            {queue.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900 dark:text-white">{item.file.name}</p>
                  <p className={`text-xs ${item.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {formatBytes(item.file.size)} &middot; {item.status === 'failed' ? item.error : STATUS_TEXT[item.status]}
                  </p>
                </div>
                {(item.status === 'uploading' || item.status === 'indexing') && <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-label={STATUS_TEXT[item.status]} />}
                {item.status === 'ready' && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Done" />}
                {item.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-600" aria-label="Failed" />}
                {item.status === 'queued' && (
                  <button
                    onClick={() => setQueue((q) => q.filter((i) => i.id !== item.id))}
                    aria-label={`Remove ${item.file.name}`}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {finished && (
            <div className="border-t border-slate-200 px-5 py-4 dark:border-navy-700">
              <Link to="/app/library" className={buttonStyles('secondary')}>
                Go to library
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
