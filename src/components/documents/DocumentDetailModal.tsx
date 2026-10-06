import { useEffect, useState, type ReactNode } from 'react'
import { Download, Eye } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatBytes, formatDate, kindLabel, SENSITIVITY_META } from '@/lib/documents'
import { supabase } from '@/lib/supabase'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { DocumentRow } from '@/types'

type Preview =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'pdf'; src: string }
  | { status: 'text'; text: string; truncated: boolean }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }

interface UrlResponse {
  url: string
  mime_type: string
}

export function DocumentDetailModal({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview>({ status: 'idle' })
  const [passages, setPassages] = useState<string[] | null>(null)
  const sens = SENSITIVITY_META[doc.sensitivity]

  // Indexed passages = exactly what the AI assistant can retrieve from this document.
  useEffect(() => {
    let active = true
    supabase
      .from('document_chunks')
      .select('content')
      .eq('document_id', doc.id)
      .order('chunk_index')
      .limit(5)
      .then(({ data }) => active && setPassages((data ?? []).map((r: { content: string }) => r.content)))
    return () => {
      active = false
    }
  }, [doc.id])

  // Release the blob URL when the preview changes or the modal closes.
  useEffect(() => {
    if (preview.status !== 'pdf') return
    return () => URL.revokeObjectURL(preview.src)
  }, [preview])

  async function loadPreview() {
    setPreview({ status: 'loading' })
    try {
      const { url, mime_type } = await apiFetch<UrlResponse>('/api/documents', { action: 'url', id: doc.id, purpose: 'preview' })
      if (mime_type === 'application/pdf') {
        const res = await fetch(url)
        if (!res.ok) throw new Error('fetch failed')
        const blob = new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
        setPreview({ status: 'pdf', src: URL.createObjectURL(blob) })
      } else if (mime_type === 'text/plain') {
        const text = await (await fetch(url)).text()
        setPreview({ status: 'text', text: text.slice(0, 20000), truncated: text.length > 20000 })
      } else {
        setPreview({ status: 'unsupported' })
      }
    } catch (e) {
      setPreview({ status: 'error', message: e instanceof Error && e.message !== 'fetch failed' ? e.message : 'Could not load the preview. Try again.' })
    }
  }

  async function download() {
    try {
      const { url } = await apiFetch<UrlResponse>('/api/documents', { action: 'url', id: doc.id, purpose: 'download' })
      window.location.assign(url)
    } catch (e) {
      setPreview({ status: 'error', message: e instanceof Error ? e.message : 'Download failed.' })
    }
  }

  const meta: [string, ReactNode][] = [
    ['Category', doc.category],
    ['Access', <Badge key="a" tone={sens.tone}>{sens.label}</Badge>],
    ['Type', `${kindLabel(doc.mime_type)}, ${formatBytes(doc.size_bytes)}${doc.page_count ? `, ${doc.page_count} pages` : ''}`],
    ['Uploaded', `${formatDate(doc.created_at)} by ${doc.owner?.full_name || 'a team member'}`],
    ['Indexed passages', doc.status === 'ready' ? String(doc.chunk_count) : '-'],
  ]

  return (
    <Modal title={doc.title} onClose={onClose} wide>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {meta.map(([k, v]) => (
          <div key={k}>
            <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>

      {doc.status === 'failed' && (
        <div className="mt-5">
          <Alert tone="error">{doc.error_message ?? 'This document could not be indexed.'} Delete it and upload a corrected file.</Alert>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={loadPreview} loading={preview.status === 'loading'} disabled={doc.status !== 'ready'}>
          <Eye className="h-4 w-4" /> Preview
        </Button>
        <Button variant="secondary" onClick={download} disabled={doc.status === 'processing'}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Opening or downloading a file is recorded in the audit log.</p>

      {preview.status === 'error' && <div className="mt-4"><Alert tone="error">{preview.message}</Alert></div>}
      {preview.status === 'pdf' && (
        <iframe title={`Preview of ${doc.title}`} src={preview.src} className="mt-4 h-[28rem] w-full rounded-lg border border-slate-200 dark:border-navy-700" />
      )}
      {preview.status === 'text' && (
        <div className="mt-4">
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-200">{preview.text}</pre>
          {preview.truncated && <p className="mt-2 text-xs text-slate-500">Showing the first 20,000 characters. Download the file to read the rest.</p>}
        </div>
      )}
      {preview.status === 'unsupported' && (
        <div className="mt-4"><Alert tone="info">Inline preview isn't available for Word files. Download the file, or review the indexed passages below.</Alert></div>
      )}

      {passages && passages.length > 0 && (
        <section className="mt-6" aria-label="Indexed passages">
          <h3 className="text-sm font-semibold text-navy-900 dark:text-white">What the AI can read from this file</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">First {passages.length} of {doc.chunk_count} indexed passages.</p>
          <ol className="mt-3 space-y-2">
            {passages.map((p, i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-300">
                <p className="line-clamp-4 whitespace-pre-line">{p}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Modal>
  )
}
