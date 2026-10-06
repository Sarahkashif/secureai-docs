import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FileSearch, FileText, History, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useDebounced } from '@/hooks/useDebounced'
import { useDocuments } from '@/hooks/useDocuments'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { apiFetch } from '@/lib/api'
import { CategoryFilter } from '@/components/documents/CategoryFilter'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { DocumentTable } from '@/components/documents/DocumentTable'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { DocCategory, DocumentRow } from '@/types'

export default function Library() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput, 300)
  const [category, setCategory] = useState<'all' | DocCategory>('all')
  const { documents, loading, error, refetch } = useDocuments({ search, category })
  const history = useSearchHistory()

  const [selected, setSelected] = useState<DocumentRow | null>(null)
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = search.trim() !== '' || category !== 'all'
  const canDelete = (d: DocumentRow) => d.owner_id === user?.id || profile?.role === 'admin'

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    void history.record(searchInput)
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await apiFetch('/api/documents', { action: 'delete', id: toDelete.id })
      toast.success(`Deleted "${toDelete.title}".`)
      setToDelete(null)
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the document.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">Document library</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Showing documents your role can access.</p>
        </div>
        <Link to="/app/upload" className={buttonStyles('primary')}>
          Upload documents
        </Link>
      </div>

      <div className="space-y-3">
        <form onSubmit={onSearchSubmit} role="search" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title"
            aria-label="Search documents by title"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm placeholder:text-slate-400 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100"
          />
        </form>
        {history.items.length > 0 && searchInput === '' && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <History className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="text-slate-500 dark:text-slate-400">Recent:</span>
            {history.items.map((q) => (
              <button
                key={q}
                onClick={() => setSearchInput(q)}
                className="rounded-full bg-slate-200 px-2.5 py-0.5 text-slate-700 hover:bg-slate-300 dark:bg-navy-700 dark:text-slate-200 dark:hover:bg-navy-600"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <Card>
        {error ? (
          <div className="space-y-3 p-5">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" onClick={refetch}>Try again</Button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-5" aria-label="Loading documents">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={FileSearch}
              title="No matching documents"
              description="Nothing matches your search or filter. Try a different title or category."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchInput('')
                    setCategory('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Upload a PDF, Word or text file and the AI assistant will be able to answer questions from it."
              action={
                <Link to="/app/upload" className={buttonStyles('primary')}>
                  Upload your first document
                </Link>
              }
            />
          )
        ) : (
          <DocumentTable documents={documents} canDelete={canDelete} onOpen={setSelected} onDelete={setToDelete} />
        )}
      </Card>

      {selected && <DocumentDetailModal doc={selected} onClose={() => setSelected(null)} />}

      {toDelete && (
        <Modal title="Delete this document?" onClose={() => !deleting && setToDelete(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong className="text-navy-900 dark:text-white">{toDelete.title}</strong> and its indexed content will be permanently removed. The AI assistant will no longer be able to answer from it.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>Delete document</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
