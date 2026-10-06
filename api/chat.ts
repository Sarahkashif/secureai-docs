import { z } from 'zod'
import { audit } from './_lib/audit.js'
import { authenticate } from './_lib/auth.js'
import { HttpError, handler } from './_lib/http.js'
import { embedTexts, llm } from './_lib/llm.js'
import {
  buildExcerptBlock,
  buildSystemPrompt,
  extractCitedIndexes,
  isNotFound,
  normalizeCitations,
  NOT_FOUND,
  retrievalQuery,
  type Excerpt,
} from './_lib/rag.js'
import { enforceRateLimit } from './_lib/rateLimit.js'
import { evaluateAccess } from './_lib/rbac.js'

const body = z.object({
  question: z.string().trim().min(2).max(1000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(6)
    .default([]),
})

/** Higher plans get deeper retrieval and higher limits ("priority AI"). */
const PLAN_AI = {
  free: { topK: 4, perMin: 6, perDay: 30 },
  basic: { topK: 6, perMin: 12, perDay: 200 },
  professional: { topK: 8, perMin: 30, perDay: 1000 },
  enterprise: { topK: 10, perMin: 60, perDay: 10000 },
} as const

interface Match {
  chunk_id: string
  document_id: string
  title: string
  content: string
  similarity: number
}

/**
 * POST /api/chat
 * 1. authenticate + rate limit (per minute and per day, by plan)
 * 2. RBAC: deny restricted topics BEFORE any retrieval or model call
 * 3. retrieve as the user (RLS), so unreadable documents never reach the model
 * 4. nothing relevant -> fixed "not found" answer, no model call
 * 5. grounded generation with citations, then log everything
 */
export default handler(['POST'], async (req) => {
  const started = Date.now()
  const ctx = await authenticate(req)
  const input = body.parse(req.body)

  const { data: org } = await ctx.db.from('organizations').select('name, plan').eq('id', ctx.orgId).single()
  const limits = PLAN_AI[(org?.plan ?? 'free') as keyof typeof PLAN_AI] ?? PLAN_AI.free
  await enforceRateLimit(ctx.db, `chat:min:${ctx.userId}`, limits.perMin, 60, 'You are asking questions too quickly. Wait a few seconds and try again.')
  await enforceRateLimit(ctx.db, `chat:day:${ctx.userId}`, limits.perDay, 86400, "You've reached your plan's daily limit for AI questions. It resets within 24 hours, or upgrade for more.")

  const preview = input.question.slice(0, 120)
  const record = async (fields: { answer: string; found: boolean; denied?: boolean; sources?: unknown[]; docIds?: string[] }) => {
    const { data } = await ctx.db
      .from('chat_queries')
      .insert({
        org_id: ctx.orgId,
        user_id: ctx.userId,
        question: input.question,
        answer: fields.answer,
        found: fields.found,
        was_denied: fields.denied ?? false,
        sources: fields.sources ?? [],
        source_doc_ids: fields.docIds ?? [],
        latency_ms: Date.now() - started,
      })
      .select('id')
      .single()
    return data?.id as string | undefined
  }

  // --- 2) RBAC before retrieval ---
  const rq = retrievalQuery(input.question, input.history)
  const decision = evaluateAccess(ctx.role, rq)
  if (!decision.allowed) {
    const id = await record({ answer: decision.message, found: false, denied: true })
    await audit(ctx, req, {
      action: 'access_denied',
      resourceType: 'ai_query',
      resourceId: id,
      metadata: { topic: decision.topic, role: ctx.role, question: preview },
    })
    return { id, answer: decision.message, found: false, denied: true, sources: [] }
  }

  // --- 3) Retrieval, running as the user so RLS applies ---
  let matches: Match[]
  try {
    const [embedding] = await embedTexts([rq])
    const { data, error } = await ctx.userDb.rpc('match_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_count: limits.topK,
      min_similarity: Number(process.env.RAG_MIN_SIMILARITY ?? 0.3),
    })
    if (error) throw error
    matches = (data ?? []) as Match[]
  } catch (e) {
    console.error('Retrieval failed', e)
    throw new HttpError(502, 'The AI service is unavailable. Try again shortly.')
  }

  // --- 4) Nothing relevant: fixed answer, no model call ---
  if (matches.length === 0) {
    const id = await record({ answer: NOT_FOUND, found: false })
    await audit(ctx, req, { action: 'ai_query', resourceType: 'ai_query', resourceId: id, metadata: { found: false, question: preview } })
    return { id, answer: NOT_FOUND, found: false, denied: false, sources: [] }
  }

  // --- 5) Grounded generation ---
  const excerpts: Excerpt[] = matches.map((m, i) => ({
    index: i + 1,
    documentId: m.document_id,
    title: m.title,
    content: m.content,
    similarity: m.similarity,
  }))

  let raw: string
  try {
    const completion = await llm().chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        { role: 'system', content: buildSystemPrompt(org?.name ?? 'your organization') },
        ...input.history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: `${buildExcerptBlock(excerpts)}\n\nQuestion: ${input.question}` },
      ],
    })
    raw = completion.choices[0]?.message?.content?.trim() ?? ''
  } catch (e) {
    console.error('LLM call failed', e)
    throw new HttpError(502, 'The AI service is unavailable. Try again shortly.')
  }

  if (!raw || isNotFound(raw)) {
    const id = await record({ answer: NOT_FOUND, found: false })
    await audit(ctx, req, { action: 'ai_query', resourceType: 'ai_query', resourceId: id, metadata: { found: false, question: preview } })
    return { id, answer: NOT_FOUND, found: false, denied: false, sources: [] }
  }

  const answer = normalizeCitations(raw)
  const cited = extractCitedIndexes(answer, excerpts.length)
  const used = cited.length > 0 ? excerpts.filter((e) => cited.includes(e.index)) : excerpts // no citations: show everything the model saw
  const sources = used.map((e) => ({
    index: e.index,
    documentId: e.documentId,
    title: e.title,
    snippet: e.content.slice(0, 280),
  }))
  const docIds = [...new Set(used.map((e) => e.documentId))]

  const id = await record({ answer, found: true, sources, docIds })
  await audit(ctx, req, {
    action: 'ai_query',
    resourceType: 'ai_query',
    resourceId: id,
    metadata: { found: true, question: preview, documents: docIds.length },
  })
  return { id, answer, found: true, denied: false, sources }
})
