import type { VercelRequest } from '@vercel/node'
import type { AuthContext } from './auth.js'
import { clientIp } from './http.js'

export interface AuditEvent {
  action: string // upload | view_doc | delete_doc | ai_query | access_denied | role_change | ...
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/** Writes through the service role: audit rows cannot be created or altered from the browser. Never throws. */
export async function audit(ctx: AuthContext, req: VercelRequest, event: AuditEvent) {
  const { error } = await ctx.db.from('audit_logs').insert({
    org_id: ctx.orgId,
    user_id: ctx.userId,
    action: event.action,
    resource_type: event.resourceType ?? null,
    resource_id: event.resourceId ?? null,
    metadata: event.metadata ?? {},
    ip: clientIp(req),
  })
  if (error) console.error('Audit write failed', error.message)
}
