import type { User } from '@/types'
import type { SocialAuthProvider } from '@/features/auth/types'

const MOCK_SOCIAL_PROFILES: Record<SocialAuthProvider, { email: string; displayName: string }> = {
  google: { email: 'demo@gmail.com', displayName: 'Google User' },
  facebook: { email: 'demo@facebook.com', displayName: 'Facebook User' },
  microsoft: { email: 'demo@outlook.com', displayName: 'Microsoft User' },
  apple: { email: 'demo@icloud.com', displayName: 'Apple User' },
}

export async function mockSignIn(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignIn', { email })
  await delay(500)
  return { id: 'mock-user-1', email, displayName: 'Demo User' }
}

export async function mockSignUp(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignUp', { email })
  await delay(500)
  return { id: 'mock-user-1', email, displayName: 'New User' }
}

export async function mockSignInWithProvider(provider: SocialAuthProvider): Promise<User> {
  const profile = MOCK_SOCIAL_PROFILES[provider]
  console.info('[authMocks] mockSignInWithProvider', { provider })
  await delay(500)
  return {
    id: `mock-user-${provider}`,
    email: profile.email,
    displayName: profile.displayName,
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
