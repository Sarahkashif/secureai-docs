import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion, FileText, SendHorizonal, ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/useChat'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnswerText } from './AnswerText'
import { SourceCitations } from './SourceCitations'
import { SuggestedQuestions } from './SuggestedQuestions'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  suggestions: string[]
  noDocuments: boolean
  onSend: (question: string) => void
  draft: string
  onDraftChange: (value: string) => void
}

function AssistantBubble({ m }: { m: ChatMessage }) {
  if (m.denied) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Access restricted</p>
          <p className="mt-1">{m.content}</p>
          <p className="mt-2 text-xs opacity-80">This request was recorded in the audit log.</p>
        </div>
      </div>
    )
  }
  if (m.error) {
    return (
      <div role="alert" className="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p>{m.content}</p>
      </div>
    )
  }
  if (m.notFound) {
    return (
      <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-navy-700 dark:bg-navy-800">
        <FileQuestion className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <div>
          <p className="font-medium text-navy-900 dark:text-white">{m.content}</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Try rephrasing, or upload the document that covers this topic.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100">
      <AnswerText text={m.content} />
      <SourceCitations sources={m.sources ?? []} />
    </div>
  )
}

export function ChatWindow({ messages, loading, suggestions, noDocuments, onSend, draft, onDraftChange }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  // Grow the textarea with its content, up to a limit.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  const submit = () => {
    if (!draft.trim() || loading || noDocuments) return
    onSend(draft)
    onDraftChange('')
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {noDocuments && messages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Upload a document to get started"
            description="The assistant answers only from your organization's documents, and none have been indexed yet."
            action={<Link to="/app/upload" className={buttonStyles('primary')}>Upload documents</Link>}
          />
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-2xl pt-4 sm:pt-10">
            <h2 className="text-xl font-semibold tracking-tight text-navy-900 dark:text-white">Ask about your documents</h2>
            <p className="mb-8 mt-2 text-sm text-slate-600 dark:text-slate-400">
              Answers come only from files your role can open, and every answer shows its sources.
            </p>
            <SuggestedQuestions questions={suggestions} onPick={onSend} disabled={loading} />
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">{m.content}</p>
              </div>
            ) : (
              <div key={m.id} className="max-w-[95%] sm:max-w-[85%]">
                <AssistantBubble m={m} />
              </div>
            ),
          )
        )}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex gap-1" aria-hidden>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            Searching your documents...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-navy-700 sm:p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={area}
            rows={1}
            value={draft}
            maxLength={1000}
            disabled={noDocuments}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKey}
            aria-label="Ask a question about your documents"
            placeholder={noDocuments ? 'Upload a document first' : 'Ask a question about your documents'}
            className={cn(
              'max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400',
              'dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100 disabled:opacity-60',
            )}
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || loading || noDocuments}
            aria-label="Send question"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-600/50"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Enter to send, Shift+Enter for a new line. Questions are logged for security review.</p>
      </div>
    </div>
  )
}
