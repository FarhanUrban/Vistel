import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import type { User } from '@/types'
import { useMockServices } from './config'
import { getFirebaseAuth } from './api'
import {
  mockSignIn,
  mockSignUp,
  mockSignInWithGoogle,
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

export async function signInWithGoogle(): Promise<User> {
  if (useMockServices()) {
    const user = await mockSignInWithGoogle()
    localStorage.setItem('vislet_mock_user', JSON.stringify(user))
    return user
  }
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return mapFirebaseUser(result.user)
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
