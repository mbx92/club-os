import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Import plugins
import ApiPlugin, { api } from './plugins/api'
import UtilsPlugin from './plugins/utils'
import DialogPlugin from './plugins/dialog'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { debug } from '@/utils/debug'

// Import directives
import { vFeatureLock, featureLockStyles } from '@/directives/featureLock'

// Create app
const app = createApp(App)

// Register directives
app.directive('feature-lock', vFeatureLock)

// Inject feature lock styles
const styleEl = document.createElement('style')
styleEl.textContent = featureLockStyles
document.head.appendChild(styleEl)

// Use plugins
app.use(createPinia())
app.use(router)
app.use(ApiPlugin)
app.use(UtilsPlugin)
app.use(DialogPlugin)

// Initialize stores
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// Connect stores to API interceptor
api.setSubscriptionStore(subscriptionStore)
api.setAuthStore(authStore)

// Initialize auth BEFORE mounting app to ensure stores are ready
const initApp = async () => {
  try {
    await authStore.initializeAuth()
    debug.log('[Main] Auth initialized')
  } catch (err) {
    debug.error('[Main] Auth initialization failed:', err)
  }
  
  // Mount app after auth is initialized
  app.mount('#app')
}

initApp()
