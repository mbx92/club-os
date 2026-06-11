import { ref, onMounted, onUnmounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

const LAST_CHECK_KEY = 'subscription_last_check'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Periodic subscription monitoring — refreshes data once per day.
 * On subscription loss, shows a modal instead of force-logout.
 */
export function useSubscriptionMonitor(options = {}) {
  const {
    interval = CHECK_INTERVAL_MS,
    enabled = true,
  } = options

  const subscriptionStore = useSubscriptionStore()
  const authStore = useAuthStore()

  const isMonitoring = ref(false)
  const lastCheckTime = ref(null)
  const checkCount = ref(0)

  let monitorInterval = null

  const shouldCheck = () => {
    try {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
      if (!lastCheck) return true
      return (Date.now() - new Date(lastCheck).getTime()) >= CHECK_INTERVAL_MS
    } catch {
      return true
    }
  }

  const checkSubscriptionStatus = async () => {
    if (!shouldCheck()) {
      if (isDev) console.log('[SubscriptionMonitor] Skipping check — within 24h window')
      return true
    }

    try {
      checkCount.value++
      lastCheckTime.value = new Date()

      await subscriptionStore.fetchSubscription()

      if (authStore.user?.isSuperAdmin) {
        localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
        return true
      }

      const hasValidAccess = subscriptionStore.hasSubscription || subscriptionStore.isTrialActive

      if (!hasValidAccess) {
        subscriptionStore.showSubscriptionRequiredModal()
        return false
      }

      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
      return true
    } catch (error) {
      console.error('[SubscriptionMonitor] Check failed:', error.message)
      return false
    }
  }

  const startMonitoring = () => {
    if (!enabled || isMonitoring.value) return
    isMonitoring.value = true
    checkSubscriptionStatus()
    monitorInterval = setInterval(() => checkSubscriptionStatus(), interval)
  }

  const stopMonitoring = () => {
    if (!isMonitoring.value) return
    if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null }
    isMonitoring.value = false
  }

  onMounted(() => {
    if (enabled && authStore.isAuthenticated) startMonitoring()
  })

  onUnmounted(() => stopMonitoring())

  return {
    isMonitoring,
    lastCheckTime,
    checkCount,
    startMonitoring,
    stopMonitoring,
    checkNow: checkSubscriptionStatus,
  }
}
