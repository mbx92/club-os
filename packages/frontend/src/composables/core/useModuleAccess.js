import { ref, computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

/**
 * Composable to check module access and handle MODULE_NOT_AVAILABLE errors
 * Provides reactive state for UI elements (buttons, navigation, etc.)
 */
export function useModuleAccess() {
  const subscriptionStore = useSubscriptionStore()
  const authStore = useAuthStore()
  
  // Track if current page/module is locked
  const isModuleLocked = ref(false)
  const lockedModule = ref(null)
  const errorCode = ref(null)
  
  /**
   * Check if super admin (bypasses all module locks)
   */
  const isSuperAdmin = computed(() => {
    return authStore.user?.isSuperAdmin === true
  })
  
  /**
   * Check if module is available
   */
  const hasModuleAccess = (moduleName) => {
    if (isSuperAdmin.value) return true
    if (!moduleName) return true
    
    return subscriptionStore.hasModule(moduleName)
  }
  
  /**
   * Check if feature is available
   */
  const hasFeatureAccess = (category, featureName) => {
    if (isSuperAdmin.value) return true
    if (!category || !featureName) return true
    
    return subscriptionStore.hasFeature(category, featureName)
  }
  
  /**
   * Set module as locked (useful for error handling)
   */
  const setModuleLocked = (moduleName, code = 'MODULE_NOT_AVAILABLE') => {
    isModuleLocked.value = true
    lockedModule.value = moduleName
    errorCode.value = code
  }
  
  /**
   * Clear locked state
   */
  const clearLocked = () => {
    isModuleLocked.value = false
    lockedModule.value = null
    errorCode.value = null
  }
  
  /**
   * Check if button should be disabled
   */
  const isButtonDisabled = computed(() => {
    if (isSuperAdmin.value) return false
    return isModuleLocked.value
  })
  
  /**
   * Check if navigation should be hidden
   */
  const shouldHideNavigation = computed(() => {
    if (isSuperAdmin.value) return false
    return isModuleLocked.value
  })
  
  /**
   * Handle API error and check if it's MODULE_NOT_AVAILABLE
   */
  const handleModuleError = (error) => {
    const code = error?.code || 
                 error?.data?.code || 
                 error?.response?.data?.code
    
    if (code === 'MODULE_NOT_AVAILABLE') {
      const moduleName = error?.requiredModule || 
                        error?.data?.requiredModule || 
                        error?.response?.data?.requiredModule
      
      setModuleLocked(moduleName, code)
      return true // Error is MODULE_NOT_AVAILABLE
    }
    
    if (code === 'FEATURE_NOT_AVAILABLE') {
      const featureName = error?.requiredFeature || 
                         error?.data?.requiredFeature || 
                         error?.response?.data?.requiredFeature
      
      setModuleLocked(featureName, code)
      return true // Error is FEATURE_NOT_AVAILABLE
    }
    
    return false // Not a module access error
  }
  
  /**
   * Get disabled button class
   */
  const disabledClass = computed(() => {
    return isButtonDisabled.value ? 'btn-disabled opacity-50 cursor-not-allowed' : ''
  })
  
  /**
   * Get disabled button attributes
   */
  const disabledAttrs = computed(() => {
    return isButtonDisabled.value ? { disabled: true, 'aria-disabled': true } : {}
  })
  
  return {
    // State
    isModuleLocked,
    lockedModule,
    errorCode,
    isSuperAdmin,
    
    // Computed
    isButtonDisabled,
    shouldHideNavigation,
    disabledClass,
    disabledAttrs,
    
    // Methods
    hasModuleAccess,
    hasFeatureAccess,
    setModuleLocked,
    clearLocked,
    handleModuleError
  }
}
