import { useEffect, useState } from 'react'
import { History, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/hooks/useChat'
import { useRecentQuestions } from '@/hooks/useRecentQuestions'
import { supabase } from '@/lib/supabase'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { suggestionsFor } from '@/components/chat/SuggestedQuestions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'

export default function Chat() {
  const { profile } = useAuth()
  const recent = useRecentQuestions()
  const chat = useChat(recent.refresh)
  const [draft, setDraft] = useState('')
  const [docs, setDocs] = useState<{ count: number; titles: string[] } | null>(null)

  // What the user can actually read: drives the empty state and "Summarize <title>" suggestions.
  useEffect(() => {
    let active = true
    supabase
      .from('documents')
      .select('title', { count: 'exact' })
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(2)
      .then(({ data, count }) => {
        if (active) setDocs({ count: count ?? 0, titles: (data ?? []).map((d: { title: string }) => d.title) })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">AI assistant</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ask questions in plain language and get answers from your documents.</p>
        </div>
        {chat.messages.length > 0 && (
          <Button variant="secondary" size="sm" onClick={chat.clear}>
            <Trash2 className="h-4 w-4" /> New conversation
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="h-[calc(100vh-13rem)] min-h-[34rem] overflow-hidden bg-white dark:bg-navy-900">
          <ChatWindow
            messages={chat.messages}
            loading={chat.loading}
            suggestions={suggestionsFor(profile?.role, docs?.titles ?? [])}
            noDocuments={docs !== null && docs.count === 0}
            onSend={chat.send}
            draft={draft}
            onDraftChange={setDraft}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Recent questions" />
            {recent.items.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Your questions will appear here.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-navy-700">
                {recent.items.map((q) => (
                  <li key={q.id}>
                    <button
                      onClick={() => setDraft(q.question)}
                      title="Use this question again"
                      className="flex w-full items-start gap-2.5 px-5 py-3 text-left text-sm text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-navy-700"
                    >
                      <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2">{q.question}</span>
                        {q.was_denied && <Badge tone="amber" className="mt-1.5">Restricted</Badge>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden /> How answers stay secure
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Your role is checked before anything is searched.</li>
              <li>Only documents you can open are read.</li>
              <li>If the documents don't say, the assistant says so.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
