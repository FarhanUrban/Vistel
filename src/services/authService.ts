import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import type { SocialAuthProvider } from '@/features/auth/types'
import type { User } from '@/types'
import { useMockServices } from './config'
import { getFirebaseAuth } from './api'
import * as accountService from './accountService'
import {
  mockSignIn,
  mockSignUp,
  mockSignInWithProvider,
  mockSignOut,
  mockGetCurrentUser,
} from './mocks/authMocks'
import { isPortalDemoEmail, resolvePortalRole } from './portalAuth'
import {
  attachUserToOrg,
  clearMustChangePassword,
  findOrgByMemberEmail,
  verifyPassword,
} from './agencyOrgService'
import {
  clearPortalSession,
  persistPortalSession,
  readPortalSession,
} from './portalToken'
import { wipeAllVisletLocalData } from './localDocumentStorage'
import {
  destroyServerSession,
  establishServerSession,
  fetchServerSession,
} from './sessionService'

const FIREBASE_AUTH_WAIT_MS = 400

function mapFirebaseUser(fbUser: {
  uid: string
  email: string | null
  displayName: string | null
}): User {
  const email = fbUser.email ?? ''
  const base: User = {
    id: fbUser.uid,
    email,
    displayName: fbUser.displayName ?? undefined,
    role: resolvePortalRole(email),
  }
  return attachUserToOrg(base)
}

function getAuthProvider(provider: SocialAuthProvider): GoogleAuthProvider {
  void provider
  return new GoogleAuthProvider()
}

/** Sync peek for instant UI bootstrap (sessionStorage only, cleared on logout). */
export function peekPortalUser(): User | null {
  return readPortalSession()
}

function waitForFirebaseUser(): Promise<User | null> {
  try {
    const auth = getFirebaseAuth()
    return new Promise((resolve) => {
      let settled = false
      const finish = (user: User | null) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        unsubscribe()
        resolve(user)
      }
      const timer = window.setTimeout(() => finish(null), FIREBASE_AUTH_WAIT_MS)
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        finish(fbUser ? mapFirebaseUser(fbUser) : null)
      })
    })
  } catch {
    return Promise.resolve(null)
  }
}

async function tryAgencyServerLogin(
  email: string,
  password: string,
): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/agency-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (response.status === 404) return null
    const data = (await response.json().catch(() => ({}))) as {
      matched?: boolean
      error?: string
      user?: User
    }
    if (response.status === 401) {
      throw new Error(data.error || 'Incorrect password for this agency account')
    }
    if (!response.ok || !data.matched || !data.user) {
      if (response.status >= 500) {
        throw new Error(data.error || 'Agency login service unavailable')
      }
      return null
    }
    return {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName,
      role: 'agency',
      orgId: data.user.orgId,
      orgKind: data.user.orgKind,
      mustChangePassword: data.user.mustChangePassword,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Incorrect password')) {
      throw error
    }
    console.warn('[auth] agency-login failed, falling back', error)
    return null
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  if (useMockServices() || isPortalDemoEmail(email)) {
    const org = findOrgByMemberEmail(email)
    if (org?.invitePasswordHash) {
      const ok = await verifyPassword(password, org.invitePasswordHash)
      if (!ok) throw new Error('Incorrect password for this agency account')
    }
    const user = attachUserToOrg(await mockSignIn(email, password))
    if (isPortalDemoEmail(email) || user.role === 'agency' || user.role === 'admin') {
      persistPortalSession(user)
    }
    await establishServerSession(user)
    return user
  }

  // Server-verified org login (reads R2 orgs.json) — no client hydration needed.
  const agencyUser = await tryAgencyServerLogin(email, password)
  if (agencyUser) {
    const user = attachUserToOrg(agencyUser)
    persistPortalSession(user)
    // Session cookie already set by agency-login; also establish via portal header for consistency.
    await establishServerSession(user)
    return user
  }

  // Legacy in-memory match (same-tab admin create before R2 round-trip).
  const org = findOrgByMemberEmail(email)
  if (org?.invitePasswordHash) {
    const ok = await verifyPassword(password, org.invitePasswordHash)
    if (!ok) throw new Error('Incorrect password for this agency account')
    const user = attachUserToOrg({
      id: `agency-${org.id}-${email.trim().toLowerCase()}`,
      email: email.trim().toLowerCase(),
      displayName: org.name,
      role: 'agency',
      orgId: org.id,
      orgKind: org.orgKind,
      mustChangePassword: org.mustChangePassword,
    })
    persistPortalSession(user)
    await establishServerSession(user)
    return user
  }

  const auth = getFirebaseAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  clearPortalSession()
  const user = mapFirebaseUser(result.user)
  await establishServerSession(user)
  return user
}

export async function changeAgencyPassword(
  orgId: string,
  newPassword: string,
): Promise<User | null> {
  await clearMustChangePassword(orgId, newPassword)
  const portal = readPortalSession()
  if (portal && portal.orgId === orgId) {
    const updated = { ...portal, mustChangePassword: false }
    persistPortalSession(updated)
    return updated
  }
  return null
}

export async function signUp(email: string, password: string): Promise<User> {
  if (useMockServices() || isPortalDemoEmail(email)) {
    const user = await mockSignUp(email, password)
    if (isPortalDemoEmail(email)) persistPortalSession(user)
    await establishServerSession(user)
    return user
  }
  const auth = getFirebaseAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
  clearPortalSession()
  const user = mapFirebaseUser(result.user)
  await establishServerSession(user)
  return user
}

export async function signInWithProvider(provider: SocialAuthProvider): Promise<User> {
  if (useMockServices()) {
    const user = await mockSignInWithProvider(provider)
    await establishServerSession(user)
    return user
  }
  const auth = getFirebaseAuth()
  const result = await signInWithPopup(auth, getAuthProvider(provider))
  clearPortalSession()
  const user = attachUserToOrg(mapFirebaseUser(result.user))
  await establishServerSession(user)
  return user
}

/** @deprecated Use signInWithProvider('google') */
export async function signInWithGoogle(): Promise<User> {
  return signInWithProvider('google')
}

export async function signOut(): Promise<void> {
  try {
    await destroyServerSession()
  } catch {
    // Continue clearing local identity even if remote revoke fails.
  }
  try {
    clearPortalSession()
    wipeAllVisletLocalData()
    if (useMockServices()) {
      await mockSignOut()
      return
    }
    try {
      const auth = getFirebaseAuth()
      await firebaseSignOut(auth)
    } catch {
      // Ignore Firebase sign-out failures after clearing portal session.
    }
  } finally {
    clearPortalSession()
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const portalUser = readPortalSession()
  if (portalUser) return attachUserToOrg(portalUser)

  const remote = await fetchServerSession()
  if (remote) {
    const restored = attachUserToOrg({
      id: remote.uid,
      email: remote.email ?? '',
      role: (remote.role as User['role']) || resolvePortalRole(remote.email ?? ''),
      orgId: remote.orgId,
    })
    if (restored.role === 'agency' || restored.role === 'admin') {
      persistPortalSession(restored)
    }
    return restored
  }

  if (useMockServices()) {
    const mock = await mockGetCurrentUser()
    return mock ? attachUserToOrg(mock) : null
  }

  const fbUser = await waitForFirebaseUser()
  return fbUser ? attachUserToOrg(fbUser) : null
}

export async function deleteAccount(
  password?: string,
  onPhase?: (phase: accountService.DeleteAccountPhase) => void,
): Promise<void> {
  const portalUser = readPortalSession()
  if (portalUser || useMockServices()) {
    onPhase?.('wiping_cloud')
    clearPortalSession()
    wipeAllVisletLocalData()
    await destroyServerSession()
    await mockSignOut()
    onPhase?.('done')
    return
  }

  await accountService.deleteAccount(password, onPhase)
  clearPortalSession()
  wipeAllVisletLocalData()
}
