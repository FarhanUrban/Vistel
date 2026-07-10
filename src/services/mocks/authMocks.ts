import type { User } from '@/types'

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

export async function mockSignInWithGoogle(): Promise<User> {
  console.info('[authMocks] mockSignInWithGoogle')
  await delay(500)
  return { id: 'mock-user-google', email: 'demo@gmail.com', displayName: 'Google User' }
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
