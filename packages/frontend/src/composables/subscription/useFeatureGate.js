import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

export function useFeatureGate() {
  const subscriptionStore = useSubscriptionStore()
  
  // Check module access
  const canAccessModule = (moduleName) => {
    return computed(() => subscriptionStore.hasModule(moduleName))
  }
  
  // Check feature access
  const canUseFeature = (category, featureName) => {
    return computed(() => subscriptionStore.hasFeature(category, featureName))
  }
  
  // Check limit
  const getLimit = (limitName) => {
    return computed(() => subscriptionStore.getLimit(limitName))
  }
  
  // Check if approaching limit (80% threshold)
  const isApproachingLimit = (limitName, currentCount) => {
    return computed(() => {
      const limit = subscriptionStore.getLimit(limitName)
      if (limit === 0) return false // Unlimited
      return currentCount >= limit * 0.8
    })
  }
  
  // Check if at limit
  const isAtLimit = (limitName, currentCount) => {
    return computed(() => {
      const limit = subscriptionStore.getLimit(limitName)
      if (limit === 0) return false // Unlimited
      return currentCount >= limit
    })
  }
  
  return {
    canAccessModule,
    canUseFeature,
    getLimit,
    isApproachingLimit,
    isAtLimit
  }
}
