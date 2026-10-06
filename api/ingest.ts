import { z } from 'zod'
import { audit } from './_lib/audit.js'
import { authenticate } from './_lib/auth.js'
import { chunkText } from './_lib/chunk.js'
import { detectMime, extractText } from './_lib/extract.js'
import { HttpError, handler } from './_lib/http.js'
import { embedTexts } from './_lib/llm.js'
import { enforceRateLimit } from './_lib/rateLimit.js'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_CHARS = 300_000
const BUCKET = 'documents'

const body = z.object({
  filePath: z.string().min(10).max(400),
  title: z.string().trim().min(1).max(200),
  category: z.enum(['HR', 'Finance', 'Company Policies', 'Operations', 'Legal', 'General']),
  sensitivity: z.enum(['standard', 'personal', 'hr_confidential', 'salary']),
})

/**
 * POST /api/ingest
 * The browser has already uploaded the file to the private bucket under {org_id}/{user_id}/.
 * This endpoint validates it, enforces role + plan rules, then: extract text -> chunk -> embed -> store.
 */
export default handler(['POST'], async (req) => {
  const ctx = await authenticate(req)
  await enforceRateLimit(ctx.db, `ingest:${ctx.userId}`, 20, 3600)
  const input = body.parse(req.body)

  // 1) The path must sit inside the caller's own folder (blocks pointing at someone else's file).
  const prefix = `${ctx.orgId}/${ctx.userId}/`
  if (!input.filePath.startsWith(prefix) || input.filePath.includes('..')) {
    await audit(ctx, req, { action: 'access_denied', metadata: { reason: 'foreign_file_path' } })
    throw new HttpError(403, 'You can only index files you uploaded.')
  }

  const removeFile = () => ctx.db.storage.from(BUCKET).remove([input.filePath])

  // 2) Role rule: employees may only upload personal files; sensitive classes need HR or admin.
  if (ctx.role === 'employee' && input.sensitivity !== 'personal') {
    await removeFile()
    await audit(ctx, req, { action: 'access_denied', metadata: { reason: 'sensitivity_not_allowed', sensitivity: input.sensitivity } })
    throw new HttpError(403, 'Your role can only upload personal documents.')
  }

  // 3) Plan limit.
  const { data: org } = await ctx.db.from('organizations').select('plan').eq('id', ctx.orgId).single()
  const { data: plan } = await ctx.db.from('plans').select('max_documents').eq('tier', org?.plan ?? 'free').single()
  if (plan?.max_documents != null) {
    const { count } = await ctx.db.from('documents').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId)
    if ((count ?? 0) >= plan.max_documents) {
      await removeFile()
      throw new HttpError(402, `Your plan allows ${plan.max_documents} documents. Delete some or upgrade to add more.`)
    }
  }

  // 4) Fetch the file and verify what it really is (extension + signature), never trusting the client.
  const { data: blob, error: dlError } = await ctx.db.storage.from(BUCKET).download(input.filePath)
  if (dlError || !blob) throw new HttpError(404, 'Uploaded file not found. Upload it again.')
  if (blob.size > MAX_BYTES) {
    await removeFile()
    throw new HttpError(413, 'Files must be 10 MB or smaller.')
  }
  const buffer = Buffer.from(await blob.arrayBuffer())
  const mime = detectMime(input.filePath, buffer)
  if (!mime) {
    await removeFile()
    throw new HttpError(415, 'Unsupported or corrupted file. Upload a valid PDF, DOCX or TXT file.')
  }

  // 5) Create the row in "processing" state.
  const { data: doc, error: insertError } = await ctx.db
    .from('documents')
    .insert({
      org_id: ctx.orgId,
      owner_id: ctx.userId,
      title: input.title,
      file_path: input.filePath,
      mime_type: mime,
      size_bytes: buffer.length,
      category: input.category,
      sensitivity: input.sensitivity,
      status: 'processing',
    })
    .select('id')
    .single()
  if (insertError || !doc) {
    await removeFile()
    const limit = insertError?.message.includes('Document limit')
    throw new HttpError(limit ? 402 : 500, limit ? insertError!.message : 'Could not save the document.')
  }

  // 6) Extract -> chunk -> embed -> store. Any failure marks the document as failed with a readable reason.
  const fail = async (message: string, status = 422): Promise<never> => {
    await ctx.db.from('document_chunks').delete().eq('document_id', doc.id)
    await ctx.db.from('documents').update({ status: 'failed', error_message: message }).eq('id', doc.id)
    await audit(ctx, req, { action: 'upload_failed', resourceType: 'document', resourceId: doc.id, metadata: { reason: message } })
    throw new HttpError(status, message)
  }

  let text: string
  let pageCount: number | null
  try {
    ;({ text, pageCount } = await extractText(buffer, mime))
  } catch {
    return fail('The text in this file could not be read. It may be corrupted or password-protected.')
  }
  if (text.length < 20) return fail('No readable text found. Scanned documents need OCR before they can be indexed.')
  if (text.length > MAX_CHARS) return fail('This document has too much text to index (limit is about 300,000 characters).')

  const chunks = chunkText(text)
  try {
    const embeddings = await embedTexts(chunks)
    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      org_id: ctx.orgId,
      chunk_index: i,
      content,
      embedding: JSON.stringify(embeddings[i]),
    }))
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await ctx.db.from('document_chunks').insert(rows.slice(i, i + 100))
      if (error) throw error
    }
  } catch (e) {
    console.error('Indexing failed', e)
    return fail('Indexing failed. Try uploading again in a moment.', 502)
  }

  await ctx.db
    .from('documents')
    .update({ status: 'ready', page_count: pageCount, chunk_count: chunks.length, error_message: null })
    .eq('id', doc.id)

  await audit(ctx, req, {
    action: 'upload',
    resourceType: 'document',
    resourceId: doc.id,
    metadata: { title: input.title, category: input.category, sensitivity: input.sensitivity, chunks: chunks.length },
  })
  await ctx.db.from('notifications').insert({
    user_id: ctx.userId,
    title: 'Document ready',
    body: `"${input.title}" is indexed and available to the AI assistant.`,
  })

  return { id: doc.id, chunks: chunks.length }
})
