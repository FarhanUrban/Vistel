const PLACEHOLDER_VALUES = new Set([
  'your-api-key',
  'your-project.firebaseapp.com',
  'your-project-id',
  'your-project.firebasestorage.app',
  'your-sender-id',
  'your-app-id',
  'your-measurement-id',
])

/** Returns true when required Firebase web config values are present and not placeholders. */
export function hasFirebaseConfig(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim()
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()

  if (!apiKey || !projectId) return false
  if (PLACEHOLDER_VALUES.has(apiKey) || PLACEHOLDER_VALUES.has(projectId)) return false

  return FIREBASE_ENV_KEYS.every((key) => {
    const value = import.meta.env[key]?.trim()
    return Boolean(value && !PLACEHOLDER_VALUES.has(value))
  })
}

const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

/**
 * Returns true when mock services should be used instead of Firebase.
 * Production builds with valid Firebase config always use live Firebase.
 */
export function useMockServices(): boolean {
  if (!hasFirebaseConfig()) {
    return true
  }

  const value = import.meta.env.VITE_USE_MOCK_SERVICES?.trim().toLowerCase()

  if (value === 'false') return false
  if (value === 'true') return true

  // Production deploys should never silently fall back to mocks when config exists.
  if (import.meta.env.PROD && hasFirebaseConfig()) return false

  return true
}

export type DocumentStorageBackend = 'local' | 'firebase'

/**
 * Document storage backend. Defaults to `local` (browser localStorage).
 * Uploads are simulated locally — no Firebase Storage or Firestore document writes.
 * Set VITE_DOCUMENT_STORAGE=firebase when Firebase Storage is enabled.
 */
export function getDocumentStorageBackend(): DocumentStorageBackend {
  if (useMockServices()) return 'local'

  const value = import.meta.env.VITE_DOCUMENT_STORAGE?.trim().toLowerCase()
  if (value === 'firebase') return 'firebase'
  return 'local'
}

export function useFirebaseDocumentStorage(): boolean {
  return !useMockServices() && getDocumentStorageBackend() === 'firebase'
}
