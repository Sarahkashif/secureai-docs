import OpenAI from 'openai'

let client: OpenAI | null = null

export function llm(): OpenAI {
  if (!client) {
    if (!process.env.LLM_API_KEY) throw new Error('Missing environment variable LLM_API_KEY')
    client = new OpenAI({ apiKey: process.env.LLM_API_KEY, baseURL: process.env.LLM_BASE_URL || undefined })
  }
  return client
}

/** Embeds texts in batches. Output order matches input order. Dimension must match vector(1536). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  const out: number[][] = []
  const BATCH = 64
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await llm().embeddings.create({ model, input: texts.slice(i, i + BATCH) })
    for (const item of res.data.sort((a, b) => a.index - b.index)) out.push(item.embedding)
  }
  return out
}
