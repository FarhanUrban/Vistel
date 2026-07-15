import type { User } from '@/types'

/** Demo portal accounts — used in mocks and as an email→role allowlist for live Auth. */
export const PORTAL_DEMO_ACCOUNTS = {
  admin: {
    emails: ['admin@vislet.com', 'admin@vistel.com'],
    id: 'mock-admin',
    displayName: 'System Admin',
    role: 'admin' as const,
  },
  agency: {
    emails: ['agency@vislet.com', 'agency@vistel.com'],
    id: 'mock-agency',
    displayName: 'Global Visa Agency',
    role: 'agency' as const,
  },
} as const

export type PortalRole = 'admin' | 'agency' | 'user'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function resolvePortalRole(email: string | null | undefined): PortalRole {
  const low = normalizeEmail(email ?? '')
  if ((PORTAL_DEMO_ACCOUNTS.admin.emails as readonly string[]).includes(low)) {
    return 'admin'
  }
  if ((PORTAL_DEMO_ACCOUNTS.agency.emails as readonly string[]).includes(low)) {
    return 'agency'
  }
  return 'user'
}

export function isPortalDemoEmail(email: string | null | undefined): boolean {
  const role = resolvePortalRole(email)
  return role === 'admin' || role === 'agency'
}

export function buildPortalDemoUser(email: string): User {
  const role = resolvePortalRole(email)
  if (role === 'admin') {
    return {
      id: PORTAL_DEMO_ACCOUNTS.admin.id,
      email,
      displayName: PORTAL_DEMO_ACCOUNTS.admin.displayName,
      role: 'admin',
    }
  }
  if (role === 'agency') {
    return {
      id: PORTAL_DEMO_ACCOUNTS.agency.id,
      email,
      displayName: PORTAL_DEMO_ACCOUNTS.agency.displayName,
      role: 'agency',
    }
  }
  return { id: 'mock-user-1', email, displayName: 'Demo User', role: 'user' }
}
