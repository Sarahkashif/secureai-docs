import { z } from 'zod'
import { audit } from './_lib/audit.js'
import { authenticate } from './_lib/auth.js'
import { handler } from './_lib/http.js'
import { enforceRateLimit } from './_lib/rateLimit.js'

const body = z.object({ event: z.enum(['login', 'logout']) })

/** POST /api/audit: records sign-in and sign-out. Only these two fixed events are accepted from the browser. */
export default handler(['POST'], async (req) => {
  const ctx = await authenticate(req)
  await enforceRateLimit(ctx.db, `audit:${ctx.userId}`, 30, 60)
  const { event } = body.parse(req.body)
  await audit(ctx, req, { action: event, resourceType: 'session' })
  return { ok: true }
})
