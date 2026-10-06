import { supabase } from '@/lib/supabase'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** POSTs JSON to a serverless endpoint with the user's access token. Throws ApiError with a readable message. */
export async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError(401, 'Your session has expired. Sign in again.')

  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.')
  }
  const json = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new ApiError(res.status, json?.error ?? 'Request failed. Try again.')
  return json as T
}
