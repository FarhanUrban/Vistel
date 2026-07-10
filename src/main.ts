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

  if (!useMockServices()) {
    await initFirebaseAuth()
    await useAuthStore(pinia).loadCurrentUser()
    void initFirebaseAnalytics()
  }

  app.mount('#app')
}

void bootstrap()
