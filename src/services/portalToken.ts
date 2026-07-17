import type { User } from '@/types'
import { isPortalDemoEmail } from './portalAuth'

const PORTAL_SESSION_KEY = 'vislet_portal_session'
const BRIDGE_SECRET =
  (import.meta.env.VITE_PORTAL_BRIDGE_SECRET as string | undefined)?.trim() ||
  'vislet-portal-bridge-v1'

/** In-memory fallback when sessionStorage is unavailable. */
let memorySession: User | null = null

export interface PortalSession {
  id: string
  email: string
  displayName?: string
  role: NonNullable<User['role']>
  orgId?: string
  orgKind?: User['orgKind']
  mustChangePassword?: boolean
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Builds Authorization header for portal (non-Firebase) admin/agency actors. */
export async function buildPortalAuthHeader(user: User): Promise<string | null> {
  const role = user.role
  const isPortalActor =
    role === 'admin' || role === 'agency' || isPortalDemoEmail(user.email)
  if (!user.email || !isPortalActor) return null

  const ts = String(Date.now())
  const payload = `${user.email.trim().toLowerCase()}|${role ?? 'user'}|${user.id}|${ts}`
  const sig = await sha256Hex(`${payload}|${BRIDGE_SECRET}`)
  const body = JSON.stringify({
    email: user.email.trim().toLowerCase(),
    role,
    id: user.id,
    ts,
    sig,
  })
  return `Portal ${btoa(body)}`
}

/** Memory-only identity for this tab; durable auth is the D1 session cookie. */
export function persistPortalSession(user: User): void {
  memorySession = { ...user }
  try {
    // Purge any legacy browser-persisted portal identity.
    sessionStorage.removeItem(PORTAL_SESSION_KEY)
  } catch {
    // ignore
  }
}

export function readPortalSession(): User | null {
  return memorySession ? { ...memorySession } : null
}

export function clearPortalSession(): void {
  memorySession = null
  try {
    sessionStorage.removeItem(PORTAL_SESSION_KEY)
  } catch {
    // ignore
  }
}

export function getPortalBridgeSecret(): string {
  return BRIDGE_SECRET
}
