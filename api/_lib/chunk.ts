/**
 * Splits text into overlapping chunks that prefer paragraph and sentence boundaries,
 * so retrieved passages stay readable and facts spanning a boundary are not lost.
 */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const pieces: string[] = []
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim()
    if (!p) continue
    if (p.length <= size) {
      pieces.push(p)
      continue
    }
    // Oversized paragraph: split by sentence, hard-slicing any sentence that is still too long.
    for (const sentence of p.split(/(?<=[.!?])\s+/)) {
      if (sentence.length <= size) pieces.push(sentence)
      else for (let i = 0; i < sentence.length; i += size) pieces.push(sentence.slice(i, i + size))
    }
  }

  const chunks: string[] = []
  let current = ''
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current)
      current = tail(current, overlap)
    }
    current = current ? `${current}\n\n${piece}` : piece
  }
  if (current.trim()) chunks.push(current)
  return chunks
}

/** Last `n` characters, trimmed forward to a word boundary. */
function tail(s: string, n: number): string {
  if (s.length <= n) return s
  const slice = s.slice(-n)
  const space = slice.indexOf(' ')
  return space > -1 ? slice.slice(space + 1) : slice
}
