<template>
  <div v-if="hasAccess">
    <slot></slot>
  </div>
  <div v-else-if="showUpgradePrompt" class="feature-locked">
    <div class="lock-icon">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <p class="locked-message">{{ lockedMessage }}</p>
    <button @click="showUpgrade" class="btn btn-primary btn-sm mt-4">
      🔓 Unlock This Feature
    </button>
    <p class="redirect-message" v-if="redirectCountdown > 0">
      Redirecting in {{ redirectCountdown }}s...
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureGate } from '@/composables/subscription/useFeatureGate'
import { useFeatureAccess } from '@/composables/subscription/useFeatureAccess'
import { useSubscriptionStore } from '@/stores/subscription'

const props = defineProps({
  module: {
    type: String,
    default: null
  },
  feature: {
    type: Object, // { category: 'transactions', name: 'combinedBilling' }
    default: null
  },
  showUpgradePrompt: {
    type: Boolean,
    default: true
  },
  autoRedirect: {
    type: Boolean,
    default: true
  },
  redirectDelay: {
    type: Number,
    default: 5000 // 5 seconds
  }
})

const router = useRouter()
const { canAccessModule, canUseFeature } = useFeatureGate()
const { guardFeature } = useFeatureAccess()
const subscriptionStore = useSubscriptionStore()

const redirectCountdown = ref(0)
let redirectTimer = null
let countdownInterval = null

const hasAccess = computed(() => {
  if (props.module) {
    return canAccessModule(props.module).value
  }
  if (props.feature) {
    return canUseFeature(props.feature.category, props.feature.name).value
  }
  return false
})

const lockedMessage = computed(() => {
  if (props.module) {
    return `Module ${props.module} tidak tersedia di plan Anda`
  }
  if (props.feature) {
    return `Fitur ini tidak tersedia di plan Anda`
  }
  return 'Fitur ini dikunci'
})

function showUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: props.module ? 'module' : 'feature',
    module: props.module,
    feature: props.feature ? `${props.feature.category}.${props.feature.name}` : null,
    message: lockedMessage.value,
    currentPlan: subscriptionStore.currentPlan
  })
}

// AGGRESSIVE: Auto-redirect if access denied
function setupAutoRedirect() {
  if (!hasAccess.value && props.autoRedirect) {
    console.warn('[FeatureGuard] 🚫 Access denied, setting up auto-redirect')
    
    // Start countdown
    redirectCountdown.value = Math.ceil(props.redirectDelay / 1000)
    
    countdownInterval = setInterval(() => {
      redirectCountdown.value--
      if (redirectCountdown.value <= 0) {
        clearInterval(countdownInterval)
      }
    }, 1000)
    
    // Set redirect timer
    redirectTimer = setTimeout(() => {
      console.warn('[FeatureGuard] ⏱️ Redirecting to no-subscription page')
      router.push('/errors/no-subscription')
    }, props.redirectDelay)
  }
}

function cleanupRedirect() {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
    redirectTimer = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  redirectCountdown.value = 0
}

onMounted(() => {
  // Use guardFeature for aggressive protection
  if (props.module || props.feature) {
    const options = {
      module: props.module,
      feature: props.feature,
      redirect: '/errors/no-subscription',
      showModal: false // We show our own UI
    }
    
    const allowed = guardFeature(options)
    
    if (!allowed && props.autoRedirect) {
      setupAutoRedirect()
    }
  }
})

onUnmounted(() => {
  cleanupRedirect()
})
</script>

<style scoped>
.feature-locked {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2.5rem;
  text-align: center;
  background: #f9fafb;
}

.lock-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.locked-message {
  color: #4b5563;
  font-size: 0.875rem;
}

.redirect-message {
  margin-top: 1rem;
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
