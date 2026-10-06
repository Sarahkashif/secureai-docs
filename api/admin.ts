import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { audit } from './_lib/audit.js'
import { authenticate, type AuthContext } from './_lib/auth.js'
import { HttpError, handler } from './_lib/http.js'
import { enforceRateLimit } from './_lib/rateLimit.js'

const role = z.enum(['employee', 'hr_manager', 'admin'])
const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list_users') }),
  z.object({
    action: z.literal('invite'),
    email: z.string().trim().email().max(200),
    fullName: z.string().trim().min(2).max(100),
    role,
    department: z.string().trim().max(100).optional(),
  }),
  z.object({ action: z.literal('set_role'), userId: z.string().uuid(), role }),
  z.object({ action: z.literal('set_active'), userId: z.string().uuid(), active: z.boolean() }),
  z.object({ action: z.literal('set_plan'), plan: z.enum(['free', 'basic', 'professional']) }),
])

async function countAdmins(ctx: AuthContext) {
  const { count } = await ctx.db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .eq('role', 'admin')
    .eq('is_active', true)
  return count ?? 0
}

async function targetProfile(ctx: AuthContext, userId: string) {
  const { data } = await ctx.db.from('profiles').select('id, role, is_active, full_name').eq('id', userId).eq('org_id', ctx.orgId).maybeSingle()
  if (!data) throw new HttpError(404, 'User not found.')
  return data as { id: string; role: string; is_active: boolean; full_name: string | null }
}

/**
 * POST /api/admin (admins only). Every change is checked against the caller's own organization and written to the audit log.
 * Role, active flag and plan can ONLY be changed here: database grants stop the browser from touching them.
 */
export default handler(['POST'], async (req) => {
  const ctx = await authenticate(req)
  if (ctx.role !== 'admin') {
    await audit(ctx, req, { action: 'access_denied', metadata: { attempted: 'admin_api', role: ctx.role } })
    throw new HttpError(403, 'Administrator access required.')
  }
  await enforceRateLimit(ctx.db, `admin:${ctx.userId}`, 60, 60)
  const input = body.parse(req.body)

  if (input.action === 'list_users') {
    const { data: profiles } = await ctx.db
      .from('profiles')
      .select('id, full_name, department, role, is_active, created_at')
      .eq('org_id', ctx.orgId)
      .order('created_at')
    const { data: authData } = await ctx.db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const byId = new Map((authData?.users ?? []).map((u) => [u.id, u]))
    return {
      users: (profiles ?? []).map((p) => ({
        ...p,
        email: byId.get(p.id)?.email ?? null,
        last_sign_in_at: byId.get(p.id)?.last_sign_in_at ?? null,
      })),
    }
  }

  if (input.action === 'invite') {
    const { data: org } = await ctx.db.from('organizations').select('plan').eq('id', ctx.orgId).single()
    const { data: plan } = await ctx.db.from('plans').select('max_users').eq('tier', org?.plan ?? 'free').single()
    if (plan?.max_users != null) {
      const { count } = await ctx.db.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId)
      if ((count ?? 0) >= plan.max_users) {
        throw new HttpError(402, `Your plan allows ${plan.max_users} ${plan.max_users === 1 ? 'user' : 'users'}. Upgrade to add more people.`)
      }
    }
    // Temporary password, shown once to the admin. The new user can change it from Profile.
    const tempPassword = `${randomBytes(9).toString('base64url')}#Aa1`
    const { data, error } = await ctx.db.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, department: input.department ?? null },
      app_metadata: { org_id: ctx.orgId, role: input.role }, // server-only fields: decide org and role
    })
    if (error || !data.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? '')
      throw new HttpError(exists ? 409 : 500, exists ? 'A user with this email already exists.' : 'Could not create the user.')
    }
    await audit(ctx, req, { action: 'user_invited', resourceType: 'user', resourceId: data.user.id, metadata: { email: input.email, role: input.role } })
    return { userId: data.user.id, tempPassword }
  }

  if (input.action === 'set_role') {
    if (input.userId === ctx.userId) throw new HttpError(400, 'You cannot change your own role.')
    const target = await targetProfile(ctx, input.userId)
    if (target.role === 'admin' && input.role !== 'admin' && (await countAdmins(ctx)) < 2) {
      throw new HttpError(400, 'At least one administrator must remain.')
    }
    await ctx.db.from('profiles').update({ role: input.role }).eq('id', target.id)
    await audit(ctx, req, { action: 'role_change', resourceType: 'user', resourceId: target.id, metadata: { from: target.role, to: input.role } })
    await ctx.db.from('notifications').insert({ user_id: target.id, title: 'Your role changed', body: `An administrator changed your role to ${input.role.replace('_', ' ')}.` })
    return { ok: true }
  }

  if (input.action === 'set_active') {
    if (input.userId === ctx.userId) throw new HttpError(400, 'You cannot deactivate your own account.')
    const target = await targetProfile(ctx, input.userId)
    if (!input.active && target.role === 'admin' && (await countAdmins(ctx)) < 2) {
      throw new HttpError(400, 'At least one administrator must remain.')
    }
    await ctx.db.from('profiles').update({ is_active: input.active }).eq('id', target.id)
    await audit(ctx, req, { action: input.active ? 'user_activated' : 'user_deactivated', resourceType: 'user', resourceId: target.id })
    return { ok: true }
  }

  // set_plan (demo billing: no payment is collected; connect Stripe here for production)
  const { data: org } = await ctx.db.from('organizations').select('plan').eq('id', ctx.orgId).single()
  const { data: target } = await ctx.db.from('plans').select('max_documents, max_users').eq('tier', input.plan).single()
  const { count: docs } = await ctx.db.from('documents').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId)
  const { count: users } = await ctx.db.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', ctx.orgId)
  if (target?.max_documents != null && (docs ?? 0) > target.max_documents) {
    throw new HttpError(400, `You have ${docs} documents but this plan allows ${target.max_documents}. Delete some first.`)
  }
  if (target?.max_users != null && (users ?? 0) > target.max_users) {
    throw new HttpError(400, `You have ${users} users but this plan allows ${target.max_users}. Deactivate or remove some first.`)
  }
  await ctx.db.from('organizations').update({ plan: input.plan }).eq('id', ctx.orgId)
  await audit(ctx, req, { action: 'plan_change', resourceType: 'organization', resourceId: ctx.orgId, metadata: { from: org?.plan, to: input.plan } })
  await ctx.db.from('notifications').insert({ user_id: ctx.userId, title: 'Plan updated', body: `Your organization is now on the ${input.plan} plan.` })
  return { plan: input.plan }
})
