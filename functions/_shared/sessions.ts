import type { Env, PlatformActor } from './auth'
import { json } from './auth'

export const SESSION_COOKIE = 'vislet_session'
export const IDLE_MS = 30 * 60 * 1000

export interface SessionRow {
  id: string
  user_id: string
  email: string | null
  role: string | null
  org_id: string | null
  kind: string
  created_at: number
  last_seen_at: number
  expires_at: number
  revoked_at: number | null
}

function cookieOptions(maxAgeSeconds: number): string {
  const secure = 'Secure; '
  return `${secure}HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
}

export function readSessionId(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/(?:^|;\s*)vislet_session=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function sessionSetCookie(sessionId: string): string {
  // Session cookie: Max-Age matches idle window; browser clears when session ends if we omit Max-Age.
  // Plan: cookie disappears when all windows close → use session cookie (no Max-Age) + server idle.
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Secure; HttpOnly; SameSite=Lax; Path=/`
}

export function sessionClearCookie(): string {
  return `${SESSION_COOKIE}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(
  env: Env,
  actor: PlatformActor & { orgId?: string },
): Promise<{ sessionId: string; expiresAt: number }> {
  if (!env.DB) {
    throw json({ error: 'D1 database is not bound' }, 500)
  }
  const sessionId = randomId()
  const now = Date.now()
  const expiresAt = now + IDLE_MS
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, email, role, org_id, kind, created_at, last_seen_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      sessionId,
      actor.uid,
      actor.email ?? null,
      actor.role ?? null,
      actor.orgId ?? null,
      actor.kind,
      now,
      now,
      expiresAt,
    )
    .run()
  return { sessionId, expiresAt }
}

export async function revokeSession(env: Env, sessionId: string): Promise<void> {
  if (!env.DB) return
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .bind(Date.now(), sessionId)
    .run()
}

export async function revokeUserSessions(env: Env, userId: string): Promise<void> {
  if (!env.DB) return
  await env.DB.prepare(
    'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
  )
    .bind(Date.now(), userId)
    .run()
}

export async function touchAndResolveSession(
  request: Request,
  env: Env,
): Promise<PlatformActor | null> {
  if (!env.DB) return null
  const sessionId = readSessionId(request)
  if (!sessionId) return null

  const row = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first<SessionRow>()

  if (!row || row.revoked_at) return null

  const now = Date.now()
  if (now > row.expires_at) {
    await revokeSession(env, sessionId)
    return null
  }

  const expiresAt = now + IDLE_MS
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?')
    .bind(now, expiresAt, sessionId)
    .run()

  return {
    uid: row.user_id,
    email: row.email ?? undefined,
    role: row.role ?? undefined,
    orgId: row.org_id ?? undefined,
    kind: row.kind === 'portal' ? 'portal' : row.kind === 'session' ? 'session' : 'firebase',
  }
}

export { cookieOptions }
