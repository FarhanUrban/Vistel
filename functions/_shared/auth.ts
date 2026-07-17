import { createRemoteJWKSet, jwtVerify } from 'jose'
import { touchAndResolveSession } from './sessions'

export interface Env {
  CLIENT_DATA: R2Bucket
  AGENCY_LOGINS?: R2Bucket
  OLD_CLIENT_DATA?: R2Bucket
  DB?: D1Database
  FIREBASE_PROJECT_ID: string
  PORTAL_BRIDGE_SECRET?: string
  MIGRATE_SECRET?: string
  ARCHIVE_SECRET?: string
}

export interface PlatformActor {
  uid: string
  email?: string
  role?: string
  kind: 'firebase' | 'portal' | 'session'
  orgId?: string
}

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

const PORTAL_ALLOWLIST = new Set([
  'admin@vislet.com',
  'admin@vistel.com',
  'agency@vislet.com',
  'agency@vistel.com',
])

export async function requireFirebaseUid(
  request: Request,
  env: Env,
): Promise<{ uid: string; token: string }> {
  const actor = await requirePlatformActor(request, env)
  if (actor.kind === 'portal') {
    throw json({ error: 'Firebase authentication required for this endpoint' }, 401)
  }
  const header = request.headers.get('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return { uid: actor.uid, token: match?.[1] ?? '' }
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPortalHeader(
  request: Request,
  env: Env,
): Promise<PlatformActor | null> {
  const header = request.headers.get('Authorization') ?? ''
  const match = header.match(/^Portal\s+(.+)$/i)
  if (!match) return null

  let parsed: { email?: string; role?: string; id?: string; ts?: string; sig?: string }
  try {
    parsed = JSON.parse(atob(match[1])) as typeof parsed
  } catch {
    return null
  }

  const email = parsed.email?.trim().toLowerCase()
  const role = parsed.role
  const id = parsed.id
  const ts = parsed.ts
  const sig = parsed.sig
  if (!email || !role || !id || !ts || !sig) return null

  const ageMs = Date.now() - Number(ts)
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 12 * 60 * 60 * 1000) {
    return null
  }

  const secret = env.PORTAL_BRIDGE_SECRET?.trim() || 'vislet-portal-bridge-v1'
  const payload = `${email}|${role}|${id}|${ts}`
  const expected = await sha256Hex(`${payload}|${secret}`)
  if (expected !== sig) return null

  if (!PORTAL_ALLOWLIST.has(email) && role !== 'agency' && role !== 'admin') {
    return null
  }

  return { uid: id, email, role, kind: 'portal' }
}

async function verifyFirebaseBearer(
  request: Request,
  env: Env,
): Promise<PlatformActor | null> {
  const header = request.headers.get('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const token = match[1]
  const projectId = env.FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    throw json({ error: 'Server missing FIREBASE_PROJECT_ID' }, 500)
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })
    const uid = typeof payload.user_id === 'string' ? payload.user_id : payload.sub
    if (!uid || typeof uid !== 'string') {
      throw new Error('Token missing uid')
    }
    const email = typeof payload.email === 'string' ? payload.email : undefined
    return { uid, email, kind: 'firebase' }
  } catch (error) {
    if (error instanceof Response) throw error
    return null
  }
}

/** Verify Authorization bearer/portal without preferring the session cookie. */
export async function authenticateFromHeaders(
  request: Request,
  env: Env,
): Promise<PlatformActor | null> {
  const portal = await verifyPortalHeader(request, env)
  if (portal) return portal
  return verifyFirebaseBearer(request, env)
}

export async function requirePlatformActor(
  request: Request,
  env: Env,
): Promise<PlatformActor> {
  // Prefer D1 session cookie (30-minute idle).
  const sessionActor = await touchAndResolveSession(request, env)
  if (sessionActor) {
    return { ...sessionActor, kind: 'session' }
  }

  const headerActor = await authenticateFromHeaders(request, env)
  if (headerActor) return headerActor

  throw json({ error: 'Missing session, Authorization bearer, or portal token' }, 401)
}

export function requireRole(actor: PlatformActor, roles: string[]): void {
  if (!actor.role || !roles.includes(actor.role)) {
    throw json({ error: 'Forbidden for this role' }, 403)
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  return sanitized || 'file'
}
