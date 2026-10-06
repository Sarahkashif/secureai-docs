import { z } from 'zod'
import { audit } from './_lib/audit.js'
import { authenticate } from './_lib/auth.js'
import { HttpError, handler } from './_lib/http.js'
import { enforceRateLimit } from './_lib/rateLimit.js'

const BUCKET = 'documents'

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('url'), id: z.string().uuid(), purpose: z.enum(['preview', 'download']).default('preview') }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
])

/**
 * POST /api/documents
 *   { action: 'url', id, purpose }  -> short-lived signed URL (access is logged)
 *   { action: 'delete', id }        -> deletes row, chunks and stored file (logged)
 * Authorization is decided by Row Level Security: the lookup runs as the user, so a document they cannot read looks like it does not exist.
 */
export default handler(['POST'], async (req) => {
  const ctx = await authenticate(req)
  await enforceRateLimit(ctx.db, `documents:${ctx.userId}`, 120, 60)
  const input = body.parse(req.body)

  if (input.action === 'url') {
    const { data: doc } = await ctx.userDb
      .from('documents')
      .select('id, title, file_path, mime_type, status')
      .eq('id', input.id)
      .maybeSingle()

    if (!doc) {
      await audit(ctx, req, { action: 'access_denied', resourceType: 'document', resourceId: input.id, metadata: { purpose: input.purpose } })
      throw new HttpError(404, 'Document not found.')
    }

    const { data, error } = await ctx.db.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_path, 60, input.purpose === 'download' ? { download: doc.title } : undefined)
    if (error || !data) throw new HttpError(500, 'Could not open the file. Try again.')

    await audit(ctx, req, {
      action: 'view_doc',
      resourceType: 'document',
      resourceId: doc.id,
      metadata: { title: doc.title, purpose: input.purpose },
    })
    return { url: data.signedUrl, mime_type: doc.mime_type, title: doc.title }
  }

  // delete: the policy only lets the owner or an admin delete, and returns no row otherwise.
  const { data: removed } = await ctx.userDb
    .from('documents')
    .delete()
    .eq('id', input.id)
    .select('id, title, file_path')
    .maybeSingle()

  if (!removed) {
    await audit(ctx, req, { action: 'access_denied', resourceType: 'document', resourceId: input.id, metadata: { attempted: 'delete' } })
    throw new HttpError(403, 'You do not have permission to delete this document.')
  }
  await ctx.db.storage.from(BUCKET).remove([removed.file_path])
  await audit(ctx, req, { action: 'delete_doc', resourceType: 'document', resourceId: removed.id, metadata: { title: removed.title } })
  return { ok: true }
})
