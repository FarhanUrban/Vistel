export type SocialAuthProvider = 'google'

export interface SocialAuthOption {
  id: SocialAuthProvider
  label: string
}

export const SOCIAL_AUTH_OPTIONS: SocialAuthOption[] = [{ id: 'google', label: 'Google' }]
