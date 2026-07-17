import { getFirebaseAuth } from './api'
import { buildPortalAuthHeader } from './portalToken'
import type { User } from '@/types'

export interface RemoteSession {
  uid: string
  email?: string
  role?: string
  orgId?: string
}

async function authHeaderFor(user?: User | null): Promise<string | null> {
  if (user) {
    const portal = await buildPortalAuthHeader(user)
    if (portal) return portal
  }
  try {
    const auth = getFirebaseAuth()
    const fb = auth.currentUser
    if (fb) {
      const token = await fb.getIdToken()
      return `Bearer ${token}`
    }
  } catch {
    // Firebase unavailable in mock/portal-only mode.
  }
  return user ? buildPortalAuthHeader(user) : null
}

/** Establish a D1 HttpOnly session cookie after login. */
export async function establishServerSession(user: User): Promise<void> {
  const header = await authHeaderFor(user)
  if (!header) return
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: header,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orgId: user.orgId }),
    })
  } catch {
    // Session endpoint may be unavailable in local Vite without Functions.
  }
}

export async function destroyServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    })
  } catch {
    // ignore
  }
}

/** Restore identity from D1 session cookie (no browser-persisted auth). */
export async function fetchServerSession(): Promise<RemoteSession | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      authenticated?: boolean
      uid?: string
      email?: string
      role?: string
      orgId?: string
    }
    if (!data.authenticated || !data.uid) return null
    return { uid: data.uid, email: data.email, role: data.role, orgId: data.orgId }
  } catch {
    return null
  }
}
