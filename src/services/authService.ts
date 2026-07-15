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

const PORTAL_SESSION_KEY = 'vislet_portal_user'
const FIREBASE_AUTH_WAIT_MS = 1500

function mapFirebaseUser(fbUser: {
  uid: string
  email: string | null
  displayName: string | null
}): User {
  const email = fbUser.email ?? ''
  return {
    id: fbUser.uid,
    email,
    displayName: fbUser.displayName ?? undefined,
    role: resolvePortalRole(email),
  }
}

function getAuthProvider(_provider: SocialAuthProvider): GoogleAuthProvider {
  return new GoogleAuthProvider()
}

function persistPortalUser(user: User) {
  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(user))
}

function clearPortalUser() {
  localStorage.removeItem(PORTAL_SESSION_KEY)
}

function readPortalUser(): User | null {
  const stored = localStorage.getItem(PORTAL_SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

/** Sync peek for instant UI bootstrap (no Firebase). */
export function peekPortalUser(): User | null {
  return readPortalUser()
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

export async function signIn(email: string, password: string): Promise<User> {
  // Admin/agency demo portals authenticate locally — they are not Firebase users.
  if (useMockServices() || isPortalDemoEmail(email)) {
    const user = await mockSignIn(email, password)
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    if (isPortalDemoEmail(email)) persistPortalUser(user)
    return user
  }
  const auth = getFirebaseAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  clearPortalUser()
  return mapFirebaseUser(result.user)
}

export async function signUp(email: string, password: string): Promise<User> {
  if (useMockServices() || isPortalDemoEmail(email)) {
    const user = await mockSignUp(email, password)
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    if (isPortalDemoEmail(email)) persistPortalUser(user)
    return user
  }
  const auth = getFirebaseAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
  clearPortalUser()
  return mapFirebaseUser(result.user)
}

export async function signInWithProvider(provider: SocialAuthProvider): Promise<User> {
  if (useMockServices()) {
    const user = await mockSignInWithProvider(provider)
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    return user
  }
  const auth = getFirebaseAuth()
  const result = await signInWithPopup(auth, getAuthProvider(provider))
  clearPortalUser()
  return mapFirebaseUser(result.user)
}

/** @deprecated Use signInWithProvider('google') */
export async function signInWithGoogle(): Promise<User> {
  return signInWithProvider('google')
}

export async function signOut(): Promise<void> {
  clearPortalUser()
  if (useMockServices()) {
    await mockSignOut()
    localStorage.removeItem('vislet_mock_user')
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
  const portalUser = readPortalUser()
  if (portalUser) return portalUser

  if (useMockServices()) {
    return mockGetCurrentUser()
  }

  return waitForFirebaseUser()
}

export async function deleteAccount(password?: string): Promise<void> {
  // Portal demo accounts are local-only — no Firebase Auth user to delete.
  const portalUser = readPortalUser()
  if (portalUser || useMockServices()) {
    clearPortalUser()
    await mockSignOut()
    localStorage.removeItem('vislet_mock_user')
    return
  }

  await accountService.deleteAccount(password)
  clearPortalUser()
}
