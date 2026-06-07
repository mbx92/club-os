import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

const LAST_CHECK_KEY = 'subscription_last_check'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * DAILY SUBSCRIPTION MONITORING
 * Monitors subscription status once per day
 * Auto-logout if subscription expires
 */
export function useSubscriptionMonitor(options = {}) {
  const {
    interval = CHECK_INTERVAL_MS, // Check every 24 hours
    enabled = true,
    autoLogout = true,
    strictMode = true // If true, any subscription loss = instant logout
  } = options
  
  const router = useRouter()
  const subscriptionStore = useSubscriptionStore()
  const authStore = useAuthStore()
  
  const isMonitoring = ref(false)
  const lastCheckTime = ref(null)
  const checkCount = ref(0)
  const errorCount = ref(0)
  
  let monitorInterval = null
  const MAX_ERRORS = 3
  
  /**
   * Check if we should check subscription (more than 24 hours since last check)
   */
  const shouldCheckSubscription = () => {
    try {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
      if (!lastCheck) return true
      
      const lastCheckTime = new Date(lastCheck)
      const now = new Date()
      const timeSinceLastCheck = now - lastCheckTime
      
      return timeSinceLastCheck >= CHECK_INTERVAL_MS
    } catch (error) {
      console.warn('[SubscriptionMonitor] Error reading last check time:', error)
      return true // Check if can't read timestamp
    }
  }
  
  /**
   * Update last check timestamp
   */
  const updateLastCheckTime = () => {
    try {
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
    } catch (error) {
      console.warn('[SubscriptionMonitor] Error saving last check time:', error)
    }
  }
  
  /**
   * Check subscription status
   */
  const checkSubscriptionStatus = async () => {
    // Check if we should check (more than 24 hours since last check)
    if (!shouldCheckSubscription()) {
      if (isDev) {
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
        const nextCheck = new Date(new Date(lastCheck).getTime() + CHECK_INTERVAL_MS)
        console.log('[SubscriptionMonitor] ⏭️ Skipping check - last checked:', lastCheck, 'next check:', nextCheck.toLocaleString())
      }
      return true
    }
    
    try {
      checkCount.value++
      lastCheckTime.value = new Date()
      
      if (isDev) {
        console.log('[SubscriptionMonitor] 🔍 Checking subscription status...', {
          check: checkCount.value,
          time: lastCheckTime.value.toLocaleTimeString()
        })
      }
      
      // Fetch latest subscription data
      await subscriptionStore.fetchSubscription()
      
      const isSuperAdmin = authStore.user?.isSuperAdmin === true
      const hasValidAccess = subscriptionStore.hasSubscription || subscriptionStore.isTrialActive
      
      // Super admin bypass
      if (isSuperAdmin) {
        errorCount.value = 0 // Reset error count
        updateLastCheckTime()
        return true
      }
      
      // Check if subscription is invalid
      if (!hasValidAccess) {
        console.error('[SubscriptionMonitor] 🚨 SUBSCRIPTION INVALID DETECTED')
        
        errorCount.value = 0 // Reset since this is a valid detection, not an error
        
        if (strictMode) {
          handleSubscriptionLoss('immediate')
        } else {
          // Show warning first
          subscriptionStore.showSubscriptionRequiredModal()
          
          // Check current route
          const currentPath = router.currentRoute.value.path
          const isAllowedPath = ['/subscription', '/auth', '/errors'].some(p => currentPath.startsWith(p))
          
          if (!isAllowedPath) {
            router.push('/subscription')
          }
        }
        
        return false
      }
      
      // Check if trial is about to expire (within 24 hours)
      if (subscriptionStore.isTrialActive && subscriptionStore.subscription?.trialEndDate) {
        const trialEnd = new Date(subscriptionStore.subscription.trialEndDate)
        const now = new Date()
        const hoursLeft = (trialEnd - now) / (1000 * 60 * 60)
        
        if (hoursLeft <= 24 && hoursLeft > 0) {
          if (isDev) console.warn('[SubscriptionMonitor] ⚠️ Trial expiring soon:', Math.floor(hoursLeft), 'hours left')
          // Could show a warning notification here
        }
      }
      
      // Check if subscription is about to expire (within 3 days)
      if (subscriptionStore.subscription?.endDate) {
        const endDate = new Date(subscriptionStore.subscription.endDate)
        const now = new Date()
        const daysLeft = (endDate - now) / (1000 * 60 * 60 * 24)
        
        if (daysLeft <= 3 && daysLeft > 0) {
          if (isDev) console.warn('[SubscriptionMonitor] ⚠️ Subscription expiring soon:', Math.floor(daysLeft), 'days left')
          // Could show a warning notification here
        }
      }
      
      // Reset error count on successful check
      errorCount.value = 0
      updateLastCheckTime() // Save timestamp after successful check
      return true
      
    } catch (error) {
      errorCount.value++
      console.error('[SubscriptionMonitor] ❌ Check failed:', error.message, {
        errorCount: errorCount.value,
        maxErrors: MAX_ERRORS
      })
      
      // If too many errors, assume something is wrong
      if (errorCount.value >= MAX_ERRORS) {
        console.error('[SubscriptionMonitor] 🚨 TOO MANY CHECK FAILURES - Forcing logout')
        handleSubscriptionLoss('error')
      }
      
      return false
    }
  }
  
  /**
   * Handle subscription loss
   * NEVER called for super admin
   */
  const handleSubscriptionLoss = (reason = 'expired') => {
    // SUPER ADMIN PROTECTION - Never logout super admin
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) {
      console.warn('[SubscriptionMonitor] ⚠️ Subscription loss ignored - User is super admin')
      return
    }
    
    console.error('[SubscriptionMonitor] 🚨 HANDLING SUBSCRIPTION LOSS:', reason)
    
    // Stop monitoring
    stopMonitoring()
    
    if (autoLogout) {
      console.error('[SubscriptionMonitor] 🚪 Forcing logout...')
      
      // Clear all data
      localStorage.clear()
      sessionStorage.clear()
      
      // Reset stores
      authStore.logout()
      subscriptionStore.reset()
      
      // Determine message
      let message = 'Your subscription has expired'
      if (reason === 'immediate') {
        message = 'No active subscription detected'
      } else if (reason === 'error') {
        message = 'Unable to verify subscription status'
      }
      
      // Redirect to login
      router.push({
        path: '/auth/login',
        query: { 
          message,
          reason,
          forced: 'true'
        }
      })
    } else {
      // Just redirect to subscription page
      subscriptionStore.showSubscriptionRequiredModal()
      router.push('/subscription')
    }
  }
  
  /**
   * Start monitoring
   */
  const startMonitoring = () => {
    if (!enabled || isMonitoring.value) return
    
    console.log('[SubscriptionMonitor] 🟢 Starting subscription monitoring', {
      interval: interval / (1000 * 60 * 60) + 'h',
      strictMode,
      autoLogout
    })
    
    isMonitoring.value = true
    
    // Do immediate check
    checkSubscriptionStatus()
    
    // Set up interval
    monitorInterval = setInterval(() => {
      checkSubscriptionStatus()
    }, interval)
  }
  
  /**
   * Stop monitoring
   */
  const stopMonitoring = () => {
    if (!isMonitoring.value) return
    
    console.log('[SubscriptionMonitor] 🔴 Stopping subscription monitoring')
    
    if (monitorInterval) {
      clearInterval(monitorInterval)
      monitorInterval = null
    }
    
    isMonitoring.value = false
  }
  
  /**
   * Force check now
   */
  const checkNow = async () => {
    console.log('[SubscriptionMonitor] 🔄 Manual check triggered')
    return await checkSubscriptionStatus()
  }
  
  // Auto-start on mount if enabled
  onMounted(() => {
    if (enabled && authStore.isAuthenticated) {
      startMonitoring()
    }
  })
  
  // Auto-stop on unmount
  onUnmounted(() => {
    stopMonitoring()
  })
  
  return {
    isMonitoring,
    lastCheckTime,
    checkCount,
    errorCount,
    startMonitoring,
    stopMonitoring,
    checkNow,
    checkSubscriptionStatus
  }
}
