import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { useMockServices } from './config'

const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let analytics: Analytics | null = null
let analyticsInitPromise: Promise<Analytics | null> | null = null

function assertFirebaseEnv(): void {
  const missing = FIREBASE_ENV_KEYS.filter((key) => !import.meta.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill in your Firebase web app config.`,
    )
  }
}

function getFirebaseConfig(): FirebaseOptions {
  assertFirebaseEnv()

  const config: FirebaseOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
  if (measurementId) {
    config.measurementId = measurementId
  }

  return config
}

export function getFirebaseApp(): FirebaseApp {
  if (useMockServices()) {
    throw new Error('Firebase is disabled in mock mode. Set VITE_USE_MOCK_SERVICES=false to use Firebase.')
  }
  if (!app) {
    app = initializeApp(getFirebaseConfig())
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp())
  }
  return storage
}

/** Initializes Analytics in the browser when supported and configured. */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (useMockServices()) return null
  if (analytics) return analytics
  if (analyticsInitPromise) return analyticsInitPromise

  analyticsInitPromise = (async () => {
    if (typeof window === 'undefined') return null
    if (!(await isSupported())) return null

    const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
    if (!measurementId) return null

    analytics = getAnalytics(getFirebaseApp())
    return analytics
  })()

  return analyticsInitPromise
}
