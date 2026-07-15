import type { User } from '@/types'
import type { SocialAuthProvider } from '@/features/auth/types'

const MOCK_GOOGLE_PROFILE = { email: 'demo@gmail.com', displayName: 'Google User' }

export async function mockSignIn(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignIn', { email })
  await delay(500)
  const lowEmail = email.toLowerCase()
  if (lowEmail === 'admin@vislet.com' || lowEmail === 'admin@vistel.com') {
    return { id: 'mock-admin', email, displayName: 'System Admin', role: 'admin' }
  }
  if (lowEmail === 'agency@vislet.com' || lowEmail === 'agency@vistel.com') {
    return { id: 'mock-agency', email, displayName: 'Global Visa Agency', role: 'agency' }
  }
  return { id: 'mock-user-1', email, displayName: 'Demo User', role: 'user' }
}

export async function mockSignUp(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignUp', { email })
  await delay(500)
  const lowEmail = email.toLowerCase()
  if (lowEmail === 'admin@vislet.com' || lowEmail === 'admin@vistel.com') {
    return { id: 'mock-admin', email, displayName: 'System Admin', role: 'admin' }
  }
  if (lowEmail === 'agency@vislet.com' || lowEmail === 'agency@vistel.com') {
    return { id: 'mock-agency', email, displayName: 'Global Visa Agency', role: 'agency' }
  }
  return { id: 'mock-user-1', email, displayName: 'New User', role: 'user' }
}

export async function mockSignInWithProvider(_provider: SocialAuthProvider): Promise<User> {
  console.info('[authMocks] mockSignInWithProvider', { provider: 'google' })
  await delay(500)
  return {
    id: 'mock-user-google',
    email: MOCK_GOOGLE_PROFILE.email,
    displayName: MOCK_GOOGLE_PROFILE.displayName,
    role: 'user',
  }
}

/** @deprecated Use mockSignInWithProvider('google') */
export async function mockSignInWithGoogle(): Promise<User> {
  return mockSignInWithProvider('google')
}

export async function mockSignOut(): Promise<void> {
  console.info('[authMocks] mockSignOut')
  await delay(200)
}

export async function mockGetCurrentUser(): Promise<User | null> {
  const stored = localStorage.getItem('vislet_mock_user')
  if (!stored) return null
  return JSON.parse(stored) as User
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
