import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isIP } from 'node:net'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Fn = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

/** Wraps a handler with method checks, no-store caching, and error handling that never leaks internals. */
export function handler(methods: string[], fn: Fn) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    if (!methods.includes(req.method ?? '')) {
      res.setHeader('Allow', methods.join(', '))
      return res.status(405).json({ error: 'Method not allowed.' })
    }
    try {
      const out = await fn(req, res)
      if (!res.writableEnded) res.status(200).json(out)
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message })
      if (e instanceof ZodError) return res.status(400).json({ error: 'Invalid request.' })
      console.error('Unhandled API error', e)
      return res.status(500).json({ error: 'Something went wrong. Try again.' })
    }
  }
}

export function clientIp(req: VercelRequest): string | null {
  const raw = req.headers['x-forwarded-for']
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim()
  return first && isIP(first) ? first : null
}
