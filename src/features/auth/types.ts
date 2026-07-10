export type SocialAuthProvider = 'google' | 'facebook' | 'microsoft' | 'apple'

export interface SocialAuthOption {
  id: SocialAuthProvider
  label: string
}

export const SOCIAL_AUTH_OPTIONS: SocialAuthOption[] = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'microsoft', label: 'Microsoft' },
  { id: 'apple', label: 'Apple' },
]
