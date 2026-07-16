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

async function assertAgencyInvitePassword(email: string, password: string): Promise<void> {
  if (isPortalDemoEmail(email)) return
  const org = findOrgByMemberEmail(email)
  if (!org?.invitePasswordHash) return
  const ok = await verifyPassword(password, org.invitePasswordHash)
  if (!ok) {
    throw new Error('Incorrect password for this agency account')
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  await assertAgencyInvitePassword(email, password)

  if (useMockServices() || isPortalDemoEmail(email)) {
    const user = attachUserToOrg(await mockSignIn(email, password))
    if (isPortalDemoEmail(email) || user.role === 'agency' || user.role === 'admin') {
      persistPortalSession(user)
    }
    return user
  }

  const org = findOrgByMemberEmail(email)
  if (org?.invitePasswordHash) {
    const user = attachUserToOrg({
      id: `agency-${org.id}-${email}`,
      email: email.trim().toLowerCase(),
      displayName: org.name,
      role: 'agency',
      orgId: org.id,
      orgKind: org.orgKind,
      mustChangePassword: org.mustChangePassword,
    })
    persistPortalSession(user)
    return user
  }

  const auth = getFirebaseAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  clearPortalSession()
  return mapFirebaseUser(result.user)
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
    return user
  }
  const auth = getFirebaseAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
  clearPortalSession()
  return mapFirebaseUser(result.user)
}

export async function signInWithProvider(provider: SocialAuthProvider): Promise<User> {
  if (useMockServices()) {
    return mockSignInWithProvider(provider)
  }
  const auth = getFirebaseAuth()
  const result = await signInWithPopup(auth, getAuthProvider(provider))
  clearPortalSession()
  return attachUserToOrg(mapFirebaseUser(result.user))
}

/** @deprecated Use signInWithProvider('google') */
export async function signInWithGoogle(): Promise<User> {
  return signInWithProvider('google')
}

export async function signOut(): Promise<void> {
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
}

export async function getCurrentUser(): Promise<User | null> {
  const portalUser = readPortalSession()
  if (portalUser) return attachUserToOrg(portalUser)

  if (useMockServices()) {
    const mock = await mockGetCurrentUser()
    return mock ? attachUserToOrg(mock) : null
  }

  const fbUser = await waitForFirebaseUser()
  return fbUser ? attachUserToOrg(fbUser) : null
}

export async function deleteAccount(password?: string): Promise<void> {
  const portalUser = readPortalSession()
  if (portalUser || useMockServices()) {
    clearPortalSession()
    wipeAllVisletLocalData()
    await mockSignOut()
    return
  }

  await accountService.deleteAccount(password)
  clearPortalSession()
  wipeAllVisletLocalData()
}
