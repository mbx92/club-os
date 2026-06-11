import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

/**
 * Thin wrapper over the subscription store.
 * Replaces useFeatureGate, useFeatureAccess.
 */
export function useSubscription() {
  const store = useSubscriptionStore()

  const hasModule = (name) => store.hasModule(name)
  const hasFeature = (name) => store.hasFeature(name)   // flat key
  const getLimit = (limitName) => store.getLimit(limitName)
  const isActive = computed(() => store.hasSubscription || store.isTrialActive)

  return {
    hasModule,
    hasFeature,
    getLimit,
    isActive,
  }
}
