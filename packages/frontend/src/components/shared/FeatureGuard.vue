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
      Unlock This Feature
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

const props = defineProps({
  module: {
    type: String,
    default: null
  },
  feature: {
    type: String,  // flat key e.g. "vouchers" or "transactions.vouchers"
    default: null
  },
  showUpgradePrompt: {
    type: Boolean,
    default: true
  }
})

const subscriptionStore = useSubscriptionStore()

const hasAccess = computed(() => {
  if (props.module) {
    return subscriptionStore.hasModule(props.module)
  }
  if (props.feature) {
    return subscriptionStore.hasFeature(props.feature)
  }
  return false
})

const lockedMessage = computed(() => {
  if (props.module) return `Module ${props.module} tidak tersedia di plan Anda`
  if (props.feature) return `Fitur ini tidak tersedia di plan Anda`
  return 'Fitur ini dikunci'
})

function showUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: props.module ? 'module' : 'feature',
    module: props.module,
    feature: props.feature || null,
    message: lockedMessage.value,
    currentPlan: subscriptionStore.currentPlan
  })
}
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
</style>
