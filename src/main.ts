import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useMockServices } from './services/config'
import { initFirebaseAnalytics, initFirebaseAuth } from './services/api'
import { useAuthStore } from './features/auth/store'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  const authStore = useAuthStore(pinia)
  // Portal sessions restore instantly; never block mount on Firebase.
  authStore.hydratePortalSessionSync()

  await router.isReady()
  app.mount('#app')

  void authStore.finishAuthBootstrap()
  if (!useMockServices()) {
    void initFirebaseAuth().catch((error) => {
      console.error('[bootstrap] Firebase auth init failed.', error)
    })
    void initFirebaseAnalytics()
  }
}

void bootstrap()
