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

export function persistPortalSession(user: User): void {
  memorySession = { ...user }
  const session: PortalSession = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role ?? 'user',
    orgId: user.orgId,
    orgKind: user.orgKind,
    mustChangePassword: user.mustChangePassword,
  }
  try {
    sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session))
  } catch {
    // Memory session still available for this tab.
  }
}

export function readPortalSession(): User | null {
  if (memorySession) return { ...memorySession }
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as PortalSession
    const user: User = {
      id: session.id,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
      orgId: session.orgId,
      orgKind: session.orgKind,
      mustChangePassword: session.mustChangePassword,
    }
    memorySession = user
    return user
  } catch {
    return null
  }
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
