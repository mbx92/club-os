import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useAuthStore } from '@/stores/auth'
import { debug, isDebug as isDev } from '@/utils/debug'

const STORAGE_KEY = 'gym-subscription-store'

// Helper to save state to localStorage
const saveToStorage = (state) => {
  try {
    const dataToSave = {
      subscription: state.subscription,
      features: state.features,
      isTrialActive: state.isTrialActive,
      timestamp: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    debug.error('[SubscriptionStore] Failed to save to localStorage:', error)
  }
}

// Helper to load state from localStorage
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const data = JSON.parse(stored)
    
    // Check if data is stale (older than 24 hours)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - data.timestamp > maxAge) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    
    return data
  } catch (error) {
    debug.error('[SubscriptionStore] Failed to load from localStorage:', error)
    return null
  }
}

// Helper to clear storage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    debug.error('[SubscriptionStore] Failed to clear localStorage:', error)
  }
}

// Helper to check if cache is still valid
const hasFreshCache = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    
    const data = JSON.parse(stored)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    return (Date.now() - data.timestamp) < maxAge
  } catch (error) {
    return false
  }
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const api = useApi()
  
  // Try to restore from localStorage on init
  const cachedData = loadFromStorage()
  
  // State - initialize from cache if available
  const subscription = ref(cachedData?.subscription || null)
  const features = ref(cachedData?.features || null)
  const isTrialActive = ref(cachedData?.isTrialActive || false)
  const loading = ref(false)
  const error = ref(null)
  
  // Modal states
  const upgradeModal = ref({
    visible: false,
    type: null, // 'module' | 'feature'
    module: null,
    feature: null,
    message: '',
    currentPlan: ''
  })
  
  const limitModal = ref({
    visible: false,
    limit: 0,
    current: 0,
    message: '',
    currentPlan: ''
  })
  
  const subscriptionRequiredModal = ref({
    visible: false
  })
  
  // Helper to check if user is super admin
  const isSuperAdmin = () => {
    const authStore = useAuthStore()
    return authStore.user?.isSuperAdmin === true
  }
  
  // Getters
  const currentPlan = computed(() => subscription.value?.plan?.name || 'No Plan')
  const isActive = computed(() => subscription.value?.status === 'active')
  const hasSubscription = computed(() => !!subscription.value && isActive.value)
  
  // Module access checks - super admin bypasses
  const hasModule = computed(() => (moduleName) => {
    if (isSuperAdmin()) return true
    if (isTrialActive.value) return true
    // If subscription data couldn't be loaded (null), don't block menu items.
    // The actual route/API call will return a proper 403 if the user truly lacks access.
    if (features.value === null) return true
    return features.value?.modules?.[moduleName] === true
  })
  
  // Feature access checks - super admin bypasses, flat key lookup
  const hasFeature = computed(() => (flatKey) => {
    if (isSuperAdmin()) return true
    if (isTrialActive.value) return true
    if (!features.value) return true // graceful degradation

    // Dot notation: "transactions.vouchers" → features.transactions.vouchers
    if (flatKey.includes('.')) {
      const parts = flatKey.split('.')
      let val = features.value
      for (const p of parts) {
        val = val?.[p]
        if (val === undefined) return false
      }
      return val === true
    }

    // Flat key: search all categories
    for (const [, catFeatures] of Object.entries(features.value)) {
      if (catFeatures && typeof catFeatures === 'object' && catFeatures[flatKey] === true) {
        return true
      }
    }
    return false
  })
  
  // Limit checks - super admin gets unlimited
  const getLimit = computed(() => (limitName) => {
    if (isSuperAdmin()) return 0 // 0 = unlimited
    if (isTrialActive.value) return 999999
    return features.value?.limits?.[limitName] || 0
  })
  
  // Actions
  async function fetchSubscription(force = false) {
    // Skip fetch if we have fresh cache and not forced
    if (!force && hasFreshCache() && subscription.value) {
      if (isDev) debug.log('[SubscriptionStore] Using cached subscription data')
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      if (isDev) debug.log('[SubscriptionStore] Fetching subscription from API...')
      const response = await api.get('/subscription/current')
      
      if (response.success) {
        subscription.value = response.data.subscription
        features.value = response.data.features
        isTrialActive.value = response.data.isTrialActive || false
        
        // Save to localStorage
        saveToStorage({
          subscription: subscription.value,
          features: features.value,
          isTrialActive: isTrialActive.value
        })
        
        if (isDev) {
          debug.log('[SubscriptionStore] Subscription loaded:', {
            plan: currentPlan.value,
            isActive: isActive.value,
            isTrialActive: isTrialActive.value,
            features: features.value
          })
        }
      } else {
        // API returned success: false
        debug.warn('[SubscriptionStore] No active subscription:', response.message)
        error.value = response.message || 'No active subscription'
        
        // Set default empty state
        subscription.value = null
        features.value = {
          modules: {},
          limits: {},
          transactions: {},
          payments: { cash: true } // Always allow cash at minimum
        }
        isTrialActive.value = false
        
        // Clear storage
        clearStorage()
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch subscription'
      debug.error('[SubscriptionStore] Failed to fetch subscription:', err)

      const is403 = err?.status === 403 || err?.statusCode === 403 || String(err?.message).includes('403')

      if (is403) {
        // 403 = auth/permission issue, not a true subscription error.
        // Preserve whatever features we already have (from cache/previous fetch).
        // Do NOT wipe features — that would blank the sidebar.
        debug.warn('[SubscriptionStore] 403 on subscription fetch — keeping existing features to avoid blank sidebar')
        // Only reset if we truly have nothing
        if (!features.value) {
          features.value = null // hasModule will treat null as "allow all"
        }
      } else {
        // Real subscription error — set empty state
        subscription.value = null
        features.value = {
          modules: {},
          limits: {},
          transactions: {},
          payments: { cash: true }
        }
        isTrialActive.value = false
        clearStorage()
      }
    } finally {
      loading.value = false
    }
  }
  
  function showUpgradeModal(payload) {
    // Super admin should never see upgrade modal
    if (isSuperAdmin()) {
      debug.log('[SubscriptionStore] Upgrade modal NOT shown - user is super admin')
      return
    }
    
    upgradeModal.value = {
      visible: true,
      type: payload.type || null,
      module: payload.module || null,
      feature: payload.feature || null,
      message: payload.message || '',
      currentPlan: payload.currentPlan || currentPlan.value
    }
    
    debug.log('[SubscriptionStore] Showing upgrade modal:', upgradeModal.value)
  }
  
  function hideUpgradeModal() {
    upgradeModal.value.visible = false
  }
  
  function showLimitModal(payload) {
    // Super admin should never see limit modal (they have unlimited access)
    if (isSuperAdmin()) {
      debug.log('[SubscriptionStore] Limit modal NOT shown - user is super admin')
      return
    }
    
    limitModal.value = {
      visible: true,
      limit: payload.limit || 0,
      current: payload.current || 0,
      message: payload.message || '',
      currentPlan: payload.currentPlan || currentPlan.value
    }
    
    debug.log('[SubscriptionStore] Showing limit modal:', limitModal.value)
  }
  
  function hideLimitModal() {
    limitModal.value.visible = false
  }
  
  function showSubscriptionRequiredModal() {
    // Only show modal if tenant doesn't have active subscription or trial
    if (!hasSubscription.value && !isTrialActive.value && !isSuperAdmin()) {
      subscriptionRequiredModal.value.visible = true
      debug.log('[SubscriptionStore] Showing subscription required modal')
    } else {
      debug.log('[SubscriptionStore] Modal NOT shown - tenant has active subscription:', {
        hasSubscription: hasSubscription.value,
        isActive: isActive.value,
        isTrialActive: isTrialActive.value,
        isSuperAdmin: isSuperAdmin()
      })
    }
  }
  
  function hideSubscriptionRequiredModal() {
    subscriptionRequiredModal.value.visible = false
  }
  
  function reset() {
    subscription.value = null
    features.value = null
    isTrialActive.value = false
    error.value = null
    hideUpgradeModal()
    hideLimitModal()
    hideSubscriptionRequiredModal()
    
    // Clear from localStorage on reset (e.g., logout)
    clearStorage()
  }
  
  // Set subscription data directly (e.g., from login response or permissions payload)
  function setData(data) {
    if (!data) {
      debug.warn('[SubscriptionStore] setData called with no data')
      return
    }

    // Permissions payload format from /permissions/user or login response
    if (data.status !== undefined && data.subscription === undefined && data.plan === undefined) {
      const isTrial = data.isInTrial === true || data.status === 'trial'
      const isActive = data.status === 'active' || isTrial

      if (isActive) {
        subscription.value = {
          status: isTrial ? 'trial' : 'active',
          plan: { name: data.planName || (isTrial ? 'Trial' : 'Unknown') },
        }
        features.value = {
          modules: data.modules || {},
          limits: data.limits || {},
          ...(data.features && typeof data.features === 'object' ? data.features : {}),
        }
        isTrialActive.value = isTrial
      } else {
        subscription.value = null
        features.value = null
        isTrialActive.value = false
      }
    } else {
      // /subscription/current API format
      subscription.value = data.subscription || data.plan || null
      features.value = data.features || null
      isTrialActive.value = data.isTrialActive || false
    }
    
    // Save to localStorage
    saveToStorage({
      subscription: subscription.value,
      features: features.value,
      isTrialActive: isTrialActive.value
    })
    
    if (isDev) {
      debug.log('[SubscriptionStore] Data set directly:', {
        plan: currentPlan.value,
        isActive: isActive.value,
        isTrialActive: isTrialActive.value,
        features: features.value
      })
    }
  }

  async function ensureSubscriptionLoaded() {
    if (loading.value) {
      while (loading.value) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return
    }

    if (hasSubscription.value || isTrialActive.value) {
      return
    }

    await fetchSubscription(true)
  }
  
  // Watch for changes and persist to localStorage
  watch(
    [subscription, features, isTrialActive],
    () => {
      if (subscription.value || features.value) {
        saveToStorage({
          subscription: subscription.value,
          features: features.value,
          isTrialActive: isTrialActive.value
        })
      }
    },
    { deep: true }
  )
  
  return {
    // State
    subscription,
    features,
    isTrialActive,
    loading,
    error,
    upgradeModal,
    limitModal,
    subscriptionRequiredModal,
    
    // Getters
    currentPlan,
    isActive,
    hasSubscription,
    hasModule,
    hasFeature,
    getLimit,
    
    // Actions
    ensureSubscriptionLoaded,
    fetchSubscription,
    setData,
    showUpgradeModal,
    hideUpgradeModal,
    showLimitModal,
    hideLimitModal,
    showSubscriptionRequiredModal,
    hideSubscriptionRequiredModal,
    reset
  }
})
