import { PublicLayout } from '@/components/layout/PublicLayout'

const principles = [
  { title: 'Access first', text: 'Permissions are enforced by the database on every query. The interface only reflects them.' },
  { title: 'Grounded answers', text: 'The assistant answers from your documents and cites them. When they do not say, it says so.' },
  { title: 'Everything accountable', text: 'Uploads, views, questions and denied requests are written to a tamper-resistant audit log.' },
]

export default function About() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-navy-900 dark:text-white sm:text-4xl">Secure document intelligence for modern organizations</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Teams keep policies, contracts and HR records in files nobody wants to search. General-purpose AI tools can read them, but they cannot tell who is allowed to see what. SecureAI Docs closes that gap: one assistant for the whole organization, with each person seeing only what their role permits.
        </p>
        <dl className="mt-12 space-y-8">
          {principles.map((p) => (
            <div key={p.title}>
              <dt className="text-base font-semibold text-navy-900 dark:text-white">{p.title}</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-400">{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PublicLayout>
  )
}
