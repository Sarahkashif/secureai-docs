/**
 * Seeds a demo organization: 3 users (admin, HR manager, employee), 7 indexed documents, notifications and
 * 10 days of sample activity so dashboards are populated.
 *
 *   npm run seed        (needs .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY)
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { chunkText } from '../api/_lib/chunk.js'
import { embedTexts } from '../api/_lib/llm.js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || !process.env.LLM_API_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or LLM_API_KEY in .env.local')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const ORG_NAME = 'Northwind Demo Co'
const PASSWORD = 'Demo#Pass2026'
const USERS = [
  { key: 'admin', email: 'admin@secureai-demo.com', name: 'Alex Morgan', role: 'admin', dept: 'Management' },
  { key: 'hr', email: 'hr@secureai-demo.com', name: 'Priya Shah', role: 'hr_manager', dept: 'Human Resources' },
  { key: 'employee', email: 'employee@secureai-demo.com', name: 'Sam Rivera', role: 'employee', dept: 'Sales' },
] as const

const DOCS = [
  { file: 'company-handbook.txt', title: 'Company Handbook', category: 'Company Policies', sensitivity: 'standard', owner: 'admin' },
  { file: 'leave-policy.txt', title: 'Leave Policy', category: 'Company Policies', sensitivity: 'standard', owner: 'admin' },
  { file: 'reimbursement-policy.txt', title: 'Reimbursement Policy', category: 'Finance', sensitivity: 'standard', owner: 'admin' },
  { file: 'hr-policies.txt', title: 'HR Policies', category: 'HR', sensitivity: 'hr_confidential', owner: 'hr' },
  { file: 'employee-records.txt', title: 'Employee Records', category: 'HR', sensitivity: 'hr_confidential', owner: 'hr' },
  { file: 'salary-structure.txt', title: 'Salary Structure', category: 'HR', sensitivity: 'salary', owner: 'hr' },
  { file: 'my-onboarding-notes.txt', title: 'My Onboarding Notes', category: 'General', sensitivity: 'personal', owner: 'employee' },
] as const

const must = <T>(res: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (res.error || res.data === null) {
    console.error(`Failed: ${what}: ${res.error?.message}`)
    process.exit(1)
  }
  return res.data
}

async function main() {
  const { data: existing } = await db.from('organizations').select('id').eq('name', ORG_NAME).maybeSingle()
  if (existing) {
    console.log(`"${ORG_NAME}" already exists. To re-seed, delete that organization (Table Editor) and the three demo users (Authentication > Users), then run again.`)
    return
  }

  console.log('Creating organization...')
  const org = must(await db.from('organizations').insert({ name: ORG_NAME, plan: 'professional' }).select('id').single(), 'create organization')

  console.log('Creating users...')
  const ids: Record<string, string> = {}
  for (const u of USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.name, department: u.dept },
      app_metadata: { org_id: org.id, role: u.role },
    })
    if (error || !data.user) {
      console.error(`Failed to create ${u.email}: ${error?.message}. If the user already exists, delete it in Authentication > Users and retry.`)
      process.exit(1)
    }
    ids[u.key] = data.user.id
    await db.from('notifications').insert({ user_id: data.user.id, title: 'Welcome to SecureAI Docs', body: 'Your demo workspace is ready. Try asking the AI assistant a question.' })
  }

  console.log('Indexing documents (this calls your embedding API)...')
  for (const d of DOCS) {
    const text = readFileSync(new URL(`../demo-data/${d.file}`, import.meta.url), 'utf8')
    const ownerId = ids[d.owner]
    const path = `${org.id}/${ownerId}/${randomUUID()}-${d.file}`
    const buf = Buffer.from(text, 'utf8')
    const up = await db.storage.from('documents').upload(path, buf, { contentType: 'text/plain', upsert: false })
    if (up.error) {
      console.error(`Upload failed for ${d.file}: ${up.error.message}. Did you run migration 002 (creates the bucket)?`)
      process.exit(1)
    }
    const doc = must(
      await db.from('documents').insert({ org_id: org.id, owner_id: ownerId, title: d.title, file_path: path, mime_type: 'text/plain', size_bytes: buf.length, category: d.category, sensitivity: d.sensitivity, status: 'processing' }).select('id').single(),
      `insert ${d.title}`,
    )
    const chunks = chunkText(text.replace(/\r\n?/g, '\n').trim())
    const vectors = await embedTexts(chunks)
    const rows = chunks.map((content, i) => ({ document_id: doc.id, org_id: org.id, chunk_index: i, content, embedding: JSON.stringify(vectors[i]) }))
    const ins = await db.from('document_chunks').insert(rows)
    if (ins.error) {
      console.error(`Chunk insert failed for ${d.title}: ${ins.error.message}`)
      process.exit(1)
    }
    await db.from('documents').update({ status: 'ready', chunk_count: chunks.length }).eq('id', doc.id)
    console.log(`  ${d.title}: ${chunks.length} passages`)
  }

  console.log('Adding sample activity...')
  const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString()
  const questions = [
    ['employee', 'What is our leave policy?', true, false],
    ['employee', 'Show reimbursement guidelines.', true, false],
    ['employee', 'What are the working hours?', true, false],
    ['employee', 'What are the salary rules?', false, true],
    ['hr', 'What are the salary rules?', true, false],
    ['hr', 'Which employees belong to sales?', true, false],
    ['hr', 'What is the disciplinary procedure?', true, false],
    ['admin', 'Summarize the company handbook.', true, false],
    ['admin', 'How many sick days do employees get?', true, false],
    ['employee', 'What is the parental leave policy?', true, false],
    ['employee', 'What is the dental coverage?', false, false],
    ['employee', 'Which employees belong to sales?', false, true],
  ] as const
  const qRows: Record<string, unknown>[] = []
  const aRows: Record<string, unknown>[] = []
  for (let i = 0; i < 28; i++) {
    const [who, q, found, denied] = questions[i % questions.length]
    const at = ago(Math.floor((i * 10) / 28), (i * 7) % 20)
    qRows.push({ org_id: org.id, user_id: ids[who], question: q, answer: denied ? 'Access restricted.' : found ? 'Answered from company documents.' : 'Information not found in uploaded documents.', found, was_denied: denied, sources: [], created_at: at })
    aRows.push({ org_id: org.id, user_id: ids[who], action: denied ? 'access_denied' : 'ai_query', resource_type: 'ai_query', metadata: denied ? { topic: q.includes('salary') ? 'salary' : 'hr_confidential', role: who === 'employee' ? 'employee' : who, question: q } : { found, question: q }, created_at: at })
  }
  for (let i = 0; i < 12; i++) {
    const who = USERS[i % 3].key
    aRows.push({ org_id: org.id, user_id: ids[who], action: 'login', resource_type: 'session', metadata: {}, created_at: ago(Math.floor(i / 1.3), (i * 3) % 12) })
  }
  for (const d of DOCS) {
    aRows.push({ org_id: org.id, user_id: ids[d.owner], action: 'upload', resource_type: 'document', metadata: { title: d.title, category: d.category, sensitivity: d.sensitivity }, created_at: ago(9, DOCS.indexOf(d)) })
  }
  for (let i = 0; i < 8; i++) {
    const d = DOCS[i % 4]
    aRows.push({ org_id: org.id, user_id: ids[i % 2 ? 'hr' : 'admin'], action: 'view_doc', resource_type: 'document', metadata: { title: d.title, purpose: 'preview' }, created_at: ago(i % 7, i) })
  }
  await db.from('chat_queries').insert(qRows)
  await db.from('audit_logs').insert(aRows)

  console.log('\nDone. Sign in with any of these (password for all: ' + PASSWORD + '):')
  for (const u of USERS) console.log(`  ${u.role.padEnd(10)} ${u.email}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
