import { useCallback, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

export interface ChatSource {
  index: number
  documentId: string
  title: string
  snippet: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  denied?: boolean
  notFound?: boolean
  error?: boolean
}

interface ChatResponse {
  id?: string
  answer: string
  found: boolean
  denied: boolean
  sources: ChatSource[]
}

export function useChat(onAnswered?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const latest = useRef<ChatMessage[]>([])
  latest.current = messages
  const busy = useRef(false)

  const send = useCallback(
    async (question: string) => {
      const q = question.trim()
      if (q.length < 2 || busy.current) return
      busy.current = true
      setLoading(true)

      // Only successful answers are sent back as conversation context.
      const history = latest.current
        .filter((m) => !m.error && !m.denied && !m.notFound)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))

      setMessages((list) => [...list, { id: crypto.randomUUID(), role: 'user', content: q }])
      try {
        const res = await apiFetch<ChatResponse>('/api/chat', { question: q, history })
        setMessages((list) => [
          ...list,
          {
            id: res.id ?? crypto.randomUUID(),
            role: 'assistant',
            content: res.answer,
            sources: res.sources,
            denied: res.denied,
            notFound: !res.found && !res.denied,
          },
        ])
        onAnswered?.()
      } catch (e) {
        setMessages((list) => [
          ...list,
          { id: crypto.randomUUID(), role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong. Try again.', error: true },
        ])
      } finally {
        busy.current = false
        setLoading(false)
      }
    },
    [onAnswered],
  )

  const clear = useCallback(() => setMessages([]), [])
  return { messages, loading, send, clear }
}
