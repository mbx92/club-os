<template>
  <router-view />
  <ToastNotification />
  
  <!-- Feature Gating Modals -->
  <UpgradeModal />
  <LimitModal />
  <SubscriptionRequiredModal />
</template>

<script setup>
import { onMounted } from 'vue'
import ToastNotification from '@/components/shared/ToastNotification.vue'
import UpgradeModal from '@/components/shared/UpgradeModal.vue'
import LimitModal from '@/components/shared/LimitModal.vue'
import SubscriptionRequiredModal from '@/components/shared/SubscriptionRequiredModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionMonitor } from '@/composables/subscription/useSubscriptionMonitor'
import { api } from '@/plugins/api'

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// Initialize subscription store reference in API client
api.setSubscriptionStore(subscriptionStore)

// DAILY: Start subscription monitoring (checks once per day)
const { startMonitoring } = useSubscriptionMonitor({
  interval: 24 * 60 * 60 * 1000, // Check every 24 hours
  enabled: true,
  autoLogout: true, // Force logout if subscription invalid
  strictMode: true // Immediate logout on subscription loss
})

// Fetch subscription on app mount if authenticated
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await subscriptionStore.fetchSubscription()
    
    // Start monitoring after initial fetch
    startMonitoring()
  }
})
</script>
