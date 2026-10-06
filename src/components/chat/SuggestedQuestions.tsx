import { Sparkles } from 'lucide-react'
import type { UserRole } from '@/types'

const BASE = ['What is our leave policy?', 'Show reimbursement guidelines.', 'Summarize the company handbook.']
const HR_ONLY = ['What are the salary rules?', 'Which employees belong to sales?']

/** Role-aware suggestions, so employees are never nudged toward questions they will be denied. */
export function suggestionsFor(role: UserRole | undefined, recentTitles: string[]): string[] {
  const sensitive = role === 'hr_manager' || role === 'admin'
  const fromDocs = recentTitles.map((t) => `Summarize "${t}"`)
  return [...BASE, ...(sensitive ? HR_ONLY : []), ...fromDocs].slice(0, 6)
}

export function SuggestedQuestions({ questions, onPick, disabled }: { questions: string[]; onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden /> Suggested questions
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {questions.map((q) => (
          <button
            key={q}
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-800 transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-100 dark:hover:bg-navy-700"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
