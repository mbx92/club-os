import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

/**
 * AGGRESSIVE FEATURE ACCESS CONTROL
 * Composable untuk proteksi akses fitur secara terpusat
 * Auto-redirect jika akses ditolak
 */
export function useFeatureAccess() {
  const router = useRouter()
  const subscriptionStore = useSubscriptionStore()
  const authStore = useAuthStore()
  
  // Track access violations
  let violationCount = 0
  const MAX_VIOLATIONS = 3
  
  /**
   * Check if user has valid access (subscription or trial)
   */
  const hasValidAccess = computed(() => {
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) return true
    
    return subscriptionStore.hasSubscription || subscriptionStore.isTrialActive
  })
  
  /**
   * AGGRESSIVE: Guard a feature/module with auto-redirect
   * @param {Object} options - { module, feature, redirect, showModal }
   * @returns {boolean} - true if access granted, false if denied
   */
  const guardFeature = (options = {}) => {
    const { 
      module = null, 
      feature = null, 
      redirect = '/errors/no-subscription', 
      showModal = true,
      throwError = false 
    } = options
    
    // SUPER ADMIN BYPASS - Full access to everything
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) {
      console.log('[FeatureAccess] ✅ Super admin - Full access granted')
      return true
    }
    
    // Check basic subscription access
    if (!hasValidAccess.value) {
      console.error('[FeatureAccess] 🚫 ACCESS DENIED - No subscription')
      violationCount++
      
      if (showModal) {
        subscriptionStore.showSubscriptionRequiredModal()
      }
      
      // Force redirect after delay
      setTimeout(() => {
        router.push(redirect)
      }, 1500)
      
      // Check if too many violations
      if (violationCount >= MAX_VIOLATIONS) {
        console.error('[FeatureAccess] 🚨 TOO MANY VIOLATIONS - Forcing logout')
        forceLogout('Too many access violations')
      }
      
      if (throwError) {
        throw new Error('SUBSCRIPTION_REQUIRED')
      }
      
      return false
    }
    
    // Check module access
    if (module) {
      const hasModuleAccess = subscriptionStore.hasModule(module)
      if (!hasModuleAccess) {
        console.error('[FeatureAccess] 🚫 MODULE DENIED:', module)
        violationCount++
        
        if (showModal) {
          subscriptionStore.showUpgradeModal({
            type: 'module',
            module,
            message: `Module ${module} tidak tersedia`,
            currentPlan: subscriptionStore.currentPlan
          })
        }
        
        setTimeout(() => {
          router.push(redirect)
        }, 1500)
        
        if (violationCount >= MAX_VIOLATIONS) {
          forceLogout('Too many module access violations')
        }
        
        return false
      }
    }
    
    // Check feature access
    if (feature) {
      const { category, name } = feature
      const hasFeatureAccess = subscriptionStore.hasFeature(category, name)
      if (!hasFeatureAccess) {
        console.error('[FeatureAccess] 🚫 FEATURE DENIED:', feature)
        violationCount++
        
        if (showModal) {
          subscriptionStore.showUpgradeModal({
            type: 'feature',
            feature: `${category}.${name}`,
            message: `Fitur ini tidak tersedia`,
            currentPlan: subscriptionStore.currentPlan
          })
        }
        
        setTimeout(() => {
          router.push(redirect)
        }, 1500)
        
        if (violationCount >= MAX_VIOLATIONS) {
          forceLogout('Too many feature access violations')
        }
        
        return false
      }
    }
    
    // Reset violation count on successful access
    violationCount = 0
    return true
  }
  
  /**
   * AGGRESSIVE: Validate limit with auto-block
   * @param {string} limitName - Name of the limit to check
   * @param {number} currentCount - Current count
   * @param {boolean} throwError - Throw error if limit reached
   * @returns {boolean} - true if within limit, false if exceeded
   */
  const validateLimit = (limitName, currentCount, throwError = true) => {
    // SUPER ADMIN BYPASS - Unlimited for super admin
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) {
      console.log('[FeatureAccess] ✅ Super admin - Unlimited access')
      return true
    }
    
    const limit = subscriptionStore.getLimit(limitName)
    
    // 0 means unlimited
    if (limit === 0) return true
    
    const isExceeded = currentCount >= limit
    
    if (isExceeded) {
      console.error('[FeatureAccess] 🚫 LIMIT REACHED:', { limitName, current: currentCount, limit })
      
      subscriptionStore.showLimitModal({
        limit,
        current: currentCount,
        message: `Batas maksimal ${limitName} tercapai`,
        currentPlan: subscriptionStore.currentPlan
      })
      
      if (throwError) {
        throw new Error(`LIMIT_REACHED: ${limitName}`)
      }
      
      return false
    }
    
    return true
  }
  
  /**
   * AGGRESSIVE: Force logout user
   * NEVER called for super admin
   */
  const forceLogout = (reason = 'Access violation') => {
    // SUPER ADMIN PROTECTION - Never logout super admin
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) {
      console.warn('[FeatureAccess] ⚠️ Logout prevented - User is super admin')
      return
    }
    
    console.error('[FeatureAccess] 🚨 FORCE LOGOUT:', reason)
    
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Reset stores
    authStore.logout()
    subscriptionStore.reset()
    
    // Redirect to login with message
    router.push({
      path: '/auth/login',
      query: { 
        message: reason,
        forced: 'true'
      }
    })
  }
  
  /**
   * Watch for subscription changes and validate access
   */
  watch(() => subscriptionStore.subscription, (newSub, oldSub) => {
    // SUPER ADMIN BYPASS - Never affect super admin
    const isSuperAdmin = authStore.user?.isSuperAdmin === true
    if (isSuperAdmin) return
    
    // If subscription becomes inactive while user is logged in
    if (oldSub && !newSub && authStore.isAuthenticated) {
      console.warn('[FeatureAccess] ⚠️ Subscription lost during session')
      
      const currentPath = router.currentRoute.value.path
      const isAllowedPath = ['/subscription', '/auth', '/errors'].some(p => currentPath.startsWith(p))
      
      if (!isAllowedPath) {
        subscriptionStore.showSubscriptionRequiredModal()
        router.push('/subscription')
      }
    }
  })
  
  return {
    hasValidAccess,
    guardFeature,
    validateLimit,
    forceLogout
  }
}
