import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface Env {
  CLIENT_DATA: R2Bucket
  FIREBASE_PROJECT_ID: string
}

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export async function requireFirebaseUid(
  request: Request,
  env: Env,
): Promise<{ uid: string; token: string }> {
  const header = request.headers.get('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = match[1]
  const projectId = env.FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    throw new Response(JSON.stringify({ error: 'Server missing FIREBASE_PROJECT_ID' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
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
    return { uid, token }
  } catch (error) {
    if (error instanceof Response) throw error
    throw new Response(JSON.stringify({ error: 'Invalid or expired auth token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
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
