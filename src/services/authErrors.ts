import { FirebaseError } from 'firebase/app'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/configuration-not-found':
    'Firebase Authentication is not enabled yet. In Firebase Console go to Build → Authentication → Get started, then enable Email/Password and Google under Sign-in method.',
  'auth/operation-not-allowed':
    'This sign-in method is disabled. Enable Email/Password or Google in Firebase Console → Authentication → Sign-in method.',
  'auth/unauthorized-domain':
    'This site domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/invalid-api-key': 'Invalid Firebase API key. Check VITE_FIREBASE_API_KEY in your .env file.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  'auth/popup-blocked': 'Sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
}

export function formatAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Authentication failed'
}
