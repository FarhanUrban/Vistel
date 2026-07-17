import type { Env } from './auth'
import { json } from './auth'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 500

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export async function enforceRateLimit(
  request: Request,
  env: Env,
  actorKey?: string,
): Promise<void> {
  if (!env.DB) return

  const key = `rl:${actorKey || `ip:${clientIp(request)}`}`
  const now = Date.now()
  const windowStart = now - (now % WINDOW_MS)

  const row = await env.DB.prepare(
    'SELECT window_start, count FROM rate_limits WHERE key = ?',
  )
    .bind(key)
    .first<{ window_start: number; count: number }>()

  if (!row || row.window_start !== windowStart) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (key, window_start, count, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1, updated_at = excluded.updated_at`,
    )
      .bind(key, windowStart, now)
      .run()
    return
  }

  if (row.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000))
    throw new Response(JSON.stringify({ error: 'Too many requests', retryAfter }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    })
  }

  await env.DB.prepare(
    'UPDATE rate_limits SET count = count + 1, updated_at = ? WHERE key = ?',
  )
    .bind(now, key)
    .run()
}

/** Best-effort cleanup of expired windows (called occasionally from middleware). */
export async function cleanupRateLimits(env: Env): Promise<void> {
  if (!env.DB) return
  const cutoff = Date.now() - WINDOW_MS * 2
  await env.DB.prepare('DELETE FROM rate_limits WHERE updated_at < ?').bind(cutoff).run()
}

export { json }
