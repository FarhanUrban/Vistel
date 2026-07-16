import type { User } from '@/types'
import type { SocialAuthProvider } from '@/features/auth/types'
import { buildPortalDemoUser, isPortalDemoEmail, resolvePortalRole } from '@/services/portalAuth'
import { readPortalSession } from '@/services/portalToken'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockSignIn(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignIn', { email })
  if (!isPortalDemoEmail(email)) {
    await delay(200)
  }
  if (isPortalDemoEmail(email)) {
    return buildPortalDemoUser(email)
  }
  return {
    id: `mock-${email}`,
    email,
    displayName: email.split('@')[0],
    role: resolvePortalRole(email),
  }
}

export async function mockSignUp(email: string, _password: string): Promise<User> {
  console.info('[authMocks] mockSignUp', { email })
  if (!isPortalDemoEmail(email)) {
    await delay(200)
  }
  if (isPortalDemoEmail(email)) {
    return buildPortalDemoUser(email)
  }
  return { id: `mock-${email}`, email, displayName: 'New User', role: 'user' }
}

export async function mockSignInWithProvider(_provider: SocialAuthProvider): Promise<User> {
  console.info('[authMocks] mockSignInWithProvider', { provider: 'google' })
  await delay(200)
  return {
    id: 'mock-user-google',
    email: 'demo@gmail.com',
    displayName: 'Google User',
    role: 'user',
  }
}

/** @deprecated Use mockSignInWithProvider('google') */
export async function mockSignInWithGoogle(): Promise<User> {
  return mockSignInWithProvider('google')
}

export async function mockSignOut(): Promise<void> {
  console.info('[authMocks] mockSignOut')
}

export async function mockGetCurrentUser(): Promise<User | null> {
  return readPortalSession()
}
