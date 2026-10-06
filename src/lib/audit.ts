export interface AuditRow {
  id: number
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export const ACTION_LABELS: Record<string, string> = {
  login: 'Sign in',
  logout: 'Sign out',
  upload: 'Upload',
  upload_failed: 'Upload failed',
  view_doc: 'View document',
  delete_doc: 'Delete document',
  ai_query: 'AI question',
  access_denied: 'Access denied',
  user_invited: 'User invited',
  role_change: 'Role change',
  user_deactivated: 'User deactivated',
  user_activated: 'User reactivated',
  plan_change: 'Plan change',
}

export function actionTone(action: string): 'neutral' | 'blue' | 'green' | 'amber' | 'red' {
  if (action === 'access_denied' || action === 'upload_failed') return 'red'
  if (action === 'delete_doc' || action === 'user_deactivated' || action === 'role_change') return 'amber'
  if (action === 'upload' || action === 'user_invited' || action === 'plan_change' || action === 'user_activated') return 'green'
  if (action === 'ai_query' || action === 'view_doc') return 'blue'
  return 'neutral'
}

/** One-line human summary of an audit event's metadata. */
export function summarize(row: AuditRow): string {
  const m = row.metadata ?? {}
  const s = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : null)
  switch (row.action) {
    case 'upload':
    case 'view_doc':
    case 'delete_doc':
      return s('title') ?? row.resource_type ?? ''
    case 'ai_query':
      return s('question') ?? ''
    case 'access_denied':
      return [s('topic') && `topic: ${s('topic')}`, s('reason'), s('attempted') && `attempted: ${s('attempted')}`, s('question')].filter(Boolean).join(' \u00b7 ')
    case 'role_change':
    case 'plan_change':
      return `${s('from') ?? '?'} \u2192 ${s('to') ?? '?'}`
    case 'user_invited':
      return [s('email'), s('role')].filter(Boolean).join(' \u00b7 ')
    default:
      return s('reason') ?? ''
  }
}

/** CSV with formula-injection protection (cells starting with = + - @ are prefixed with an apostrophe). */
export function toCsv(rows: string[][]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
    return `"${safe.replace(/"/g, '""')}"`
  }
  return rows.map((r) => r.map(cell).join(',')).join('\n')
}
