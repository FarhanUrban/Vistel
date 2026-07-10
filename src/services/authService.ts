import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type AuthProvider,
} from 'firebase/auth'
import type { SocialAuthProvider } from '@/features/auth/types'
import type { User } from '@/types'
import { useMockServices } from './config'
import { getFirebaseAuth } from './api'
import * as accountService from './accountService'
import { wipeAllVisletLocalData } from './localDocumentStorage'
import {
  mockSignIn,
  mockSignUp,
  mockSignInWithProvider,
  mockSignOut,
  mockGetCurrentUser,
} from './mocks/authMocks'

function mapFirebaseUser(fbUser: { uid: string; email: string | null; displayName: string | null }): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? undefined,
  }
}

function getAuthProvider(provider: SocialAuthProvider): AuthProvider {
  switch (provider) {
    case 'google':
      return new GoogleAuthProvider()
    case 'facebook':
      return new FacebookAuthProvider()
    case 'microsoft': {
      const microsoftProvider = new OAuthProvider('microsoft.com')
      microsoftProvider.setCustomParameters({ prompt: 'select_account' })
      return microsoftProvider
    }
    case 'apple': {
      const appleProvider = new OAuthProvider('apple.com')
      appleProvider.addScope('email')
      appleProvider.addScope('name')
      return appleProvider
    }
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  if (useMockServices()) {
    const user = await mockSignIn(email, password)
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    return user
  }
  const auth = getFirebaseAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  return mapFirebaseUser(result.user)
}

export async function signUp(email: string, password: string): Promise<User> {
  if (useMockServices()) {
    const user = await mockSignUp(email, password)
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    return user
  }
  const auth = getFirebaseAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
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
  return mapFirebaseUser(result.user)
}

/** @deprecated Use signInWithProvider('google') */
export async function signInWithGoogle(): Promise<User> {
  return signInWithProvider('google')
}

export async function signOut(): Promise<void> {
  if (useMockServices()) {
    await mockSignOut()
    localStorage.removeItem('vislet_mock_user')
    return
  }
  const auth = getFirebaseAuth()
  await firebaseSignOut(auth)
}

export async function getCurrentUser(): Promise<User | null> {
  if (useMockServices()) {
    return mockGetCurrentUser()
  }
  const auth = getFirebaseAuth()
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      unsubscribe()
      if (!fbUser) {
        resolve(null)
        return
      }
      resolve(mapFirebaseUser(fbUser))
    })
  })
}

export async function deleteAccount(password?: string): Promise<void> {
  if (useMockServices()) {
    wipeAllVisletLocalData()
    await mockSignOut()
    return
  }
  await accountService.deleteAccount(password)
}
