import type { ReactNode } from 'react'

const TOKEN = /(\*\*[^*\n]+\*\*|\[\d{1,2}\])/g
const BULLET = /^\s*(?:[-*\u2022])\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

function inline(line: string): ReactNode[] {
  return line.split(TOKEN).map((part, i) => {
    if (/^\[\d{1,2}\]$/.test(part)) {
      return (
        <sup
          key={i}
          title={`Source ${part.slice(1, -1)}`}
          className="mx-0.5 inline-flex min-w-4 items-center justify-center rounded bg-brand-100 px-1 text-[11px] font-semibold text-brand-800 dark:bg-brand-900/60 dark:text-brand-100"
        >
          {part.slice(1, -1)}
        </sup>
      )
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}

/** Renders model output safely as React nodes (no HTML injection): paragraphs, lists, bold and [n] citation chips. */
export function AnswerText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const kind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null
    if (kind) {
      const re = kind === 'ul' ? BULLET : NUMBERED
      const items: string[] = []
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].match(re)![1])
        i++
      }
      const List = kind
      blocks.push(
        <List key={blocks.length} className={`ml-5 space-y-1 ${kind === 'ul' ? 'list-disc' : 'list-decimal'}`}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </List>,
      )
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>)
      i++
    }
  }
  return <div className="space-y-3 text-sm leading-relaxed">{blocks}</div>
}
