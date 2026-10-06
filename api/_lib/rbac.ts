export type Role = 'employee' | 'hr_manager' | 'admin'
export type RestrictedTopic = 'salary' | 'hr_confidential'

/**
 * Layer 1 of AI access control: classify what the question is asking about BEFORE any retrieval or LLM call.
 * Layer 2 (the real guarantee) is Row Level Security: retrieval runs as the user, so restricted chunks are
 * invisible to them even if this classifier misses a paraphrase.
 */
const PATTERNS: Record<RestrictedTopic, RegExp[]> = {
  salary: [
    /\b(salar(y|ies)|payroll|compensation|remuneration|wages?|ctc|take[- ]home|increments?)\b/i,
    /\bpay\s?(grades?|bands?|scales?|slips?|structures?|ranges?)\b/i,
    /\bbonus(es)?\b/i,
    /\bhow much (does|do|did|is|are)\b.*\b(earn|make|paid|get paid)\b/i,
  ],
  hr_confidential: [
    /\b(employee|personnel|staff)\s+(records?|files?|lists?|directory|details|data|information)\b/i,
    /\bwhich\s+(employees|staff|people)\b/i,
    /\b(list|names?)\s+of\s+(all\s+)?(employees|staff)\b/i,
    /\bwho\s+(works|is working|belongs?|reports)\s+(in|on|under|to)\b/i,
    /\b(disciplinary|grievances?|performance\s+(reviews?|ratings?|appraisals?)|background\s+checks?)\b/i,
    /\bterminat(ed|ion)\s+(records?|lists?)\b/i,
    /\bhr[- ]confidential\b/i,
  ],
}

const MESSAGES: Record<RestrictedTopic, string> = {
  salary:
    "You don't have permission to access salary information. Salary records are limited to HR managers and administrators. If you need this, contact your HR team.",
  hr_confidential:
    "You don't have permission to access confidential HR records such as employee files. These are limited to HR managers and administrators. If you need this, contact your HR team.",
}

export function detectRestrictedTopic(text: string): RestrictedTopic | null {
  for (const topic of Object.keys(PATTERNS) as RestrictedTopic[]) {
    if (PATTERNS[topic].some((re) => re.test(text))) return topic
  }
  return null
}

/** HR managers and admins may ask about restricted topics; employees may not. */
export function roleCanAccessTopic(role: Role, _topic: RestrictedTopic): boolean {
  return role === 'hr_manager' || role === 'admin'
}

export type AccessDecision = { allowed: true } | { allowed: false; topic: RestrictedTopic; message: string }

export function evaluateAccess(role: Role, text: string): AccessDecision {
  const topic = detectRestrictedTopic(text)
  if (topic && !roleCanAccessTopic(role, topic)) return { allowed: false, topic, message: MESSAGES[topic] }
  return { allowed: true }
}
