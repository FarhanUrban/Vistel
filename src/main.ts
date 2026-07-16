import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useMockServices } from './services/config'
import { initFirebaseAnalytics, initFirebaseAuth } from './services/api'
import { useAuthStore } from './features/auth/store'
import './assets/main.css'

/** Survives one hard reload; must NOT be cleared on `load` or we infinite-loop. */
const CHUNK_RELOAD_KEY = 'vislet_chunk_reload_v2'

// Main bundle executed — safe to clear the one-shot deploy recovery flag.
// (Only lazy chunks failing should set it again via router.onError.)
try {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
} catch {
  // ignore
}

function showBootFailure(message: string) {
  const fallback = document.getElementById('boot-fallback')
  if (fallback) {
    fallback.hidden = false
    const text = fallback.querySelector('p')
    if (text) text.textContent = message
  }
  clearTimeout((window as Window & { __visletBootTimer?: number }).__visletBootTimer)
}

function isChunkLoadError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('importing a module script failed') ||
    m.includes('error loading dynamically imported module') ||
    m.includes('unable to preload css') ||
    m.includes('failed to load module script')
  )
}

/**
 * After a deploy, stale hashed chunks can 404. Reload at most once per tab session.
 * Do not clear the flag on window `load` — that caused blank-page refresh loops on
 * vislet.org when lazy routes kept failing after each reset.
 */
function installDeployRecovery(): void {
  const tryReloadOnce = () => {
    try {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    } catch {
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.set('_', String(Date.now()))
    window.location.replace(url.toString())
  }

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    tryReloadOnce()
  })

  router.onError((error) => {
    const message = error instanceof Error ? error.message : String(error)
    if (!isChunkLoadError(message)) return
    tryReloadOnce()
  })
}

async function bootstrap() {
  installDeployRecovery()

  // Strip legacy localStorage leftovers from older builds (business data must not persist locally).
  try {
    const legacyKeys = [
      'vislet_uploaded_docs',
      'vislet_applications',
      'vislet_onboarding',
      'vislet_onboarding_drafts',
      'vislet_mock_user',
      'vislet_portal_user',
      'vislet_agency_orgs',
      'vislet_country_keys',
      'vislet_notifications',
      'vislet_audit_log',
      'vislet_submission_log',
      'vislet_agency_key_vault',
      'vislet_encrypted_payloads',
      'vislet_platform_seeded',
      'vislet_rejection_codes',
      'vislet_payment_history',
      'vislet_org_invite_passwords',
      'vislet_promo_banner',
      'vislet_promo_banner_dismissed',
    ]
    for (const key of legacyKeys) localStorage.removeItem(key)
  } catch {
    // ignore
  }

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  const authStore = useAuthStore(pinia)
  authStore.hydratePortalSessionSync()

  await router.isReady()
  app.mount('#app')
  const bootWindow = window as Window & {
    __visletBootTimer?: number
    __visletMarkBooted?: () => void
  }
  bootWindow.__visletMarkBooted?.()
  clearTimeout(bootWindow.__visletBootTimer)

  // Hydrate after mount so a slow/hung R2 call cannot blank the boot screen.
  // platformRevision bumps when keys arrive so destination pickers unlock live.
  void import('./services/platformStorage')
    .then(({ hydratePlatformFromRemote }) => hydratePlatformFromRemote())
    .catch((error) => console.error('[bootstrap] platform hydrate failed', error))

  void authStore.finishAuthBootstrap()
  if (!useMockServices()) {
    void initFirebaseAuth().catch((error) => {
      console.error('[bootstrap] Firebase auth init failed.', error)
    })
    void initFirebaseAnalytics()
  }
}

void bootstrap().catch((error) => {
  console.error('[bootstrap] failed', error)
  showBootFailure('Vislet could not start. Please reload the page.')
})
