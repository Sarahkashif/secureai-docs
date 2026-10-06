import { FileText, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatBytes, formatDate, kindLabel, SENSITIVITY_META } from '@/lib/documents'
import type { DocumentRow, DocStatus } from '@/types'

const STATUS: Record<DocStatus, { label: string; tone: 'amber' | 'green' | 'red' }> = {
  processing: { label: 'Indexing', tone: 'amber' },
  ready: { label: 'Ready', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
}

export function DocumentTable({
  documents,
  canDelete,
  onOpen,
  onDelete,
}: {
  documents: DocumentRow[]
  canDelete: (d: DocumentRow) => boolean
  onOpen: (d: DocumentRow) => void
  onDelete: (d: DocumentRow) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 dark:border-navy-700 dark:text-slate-400">
            <th scope="col" className="px-5 py-3 font-medium">Document</th>
            <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Category</th>
            <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">Access</th>
            <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">Owner</th>
            <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">Uploaded</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
          {documents.map((d) => {
            const s = STATUS[d.status]
            const sens = SENSITIVITY_META[d.sensitivity]
            return (
              <tr key={d.id} className="hover:bg-white/60 dark:hover:bg-navy-700/40">
                <td className="max-w-[16rem] px-5 py-3">
                  <button onClick={() => onOpen(d)} className="flex items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900 hover:underline dark:text-white">{d.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {kindLabel(d.mime_type)} &middot; {formatBytes(d.size_bytes)}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="hidden px-3 py-3 text-slate-700 dark:text-slate-200 md:table-cell">{d.category}</td>
                <td className="hidden px-3 py-3 lg:table-cell"><Badge tone={sens.tone}>{sens.label}</Badge></td>
                <td className="hidden px-3 py-3 text-slate-700 dark:text-slate-200 lg:table-cell">{d.owner?.full_name || 'Team member'}</td>
                <td className="hidden px-3 py-3 text-slate-700 dark:text-slate-200 sm:table-cell">{formatDate(d.created_at)}</td>
                <td className="px-3 py-3"><Badge tone={s.tone} title={d.error_message ?? undefined}>{s.label}</Badge></td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => onOpen(d)}>View</Button>
                    {canDelete(d) && (
                      <Button size="sm" variant="ghost" onClick={() => onDelete(d)} aria-label={`Delete ${d.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
