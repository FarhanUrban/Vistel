/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** Set to "true" to use mock services instead of Firebase (no credentials needed) */
  readonly VITE_USE_MOCK_SERVICES: string
  /** Firebase API key */
  readonly VITE_FIREBASE_API_KEY: string
  /** Firebase auth domain */
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  /** Firebase project ID */
  readonly VITE_FIREBASE_PROJECT_ID: string
  /** Firebase storage bucket */
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  /** Firebase messaging sender ID */
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  /** Firebase app ID */
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}
