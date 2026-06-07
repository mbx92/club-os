<route lang="yaml">
meta:
  title: Queue Management
  layout: default
</route>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRestaurantQueue } from '@/composables/restaurant/useRestaurantQueue'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useAuthStore } from '@/stores/auth'
import QueueManagementPanel from '@/components/restaurant/queue/QueueManagementPanel.vue'
import {
  IconList,
  IconClock,
  IconCheck,
  IconCreditCard,
  IconRefresh,
  IconExternalLink,
  IconWifi,
  IconWifiOff
} from '@tabler/icons-vue'

const {
  queueOrders,
  loading,
  isConnected,
  reconnectAttempts,
  getQueueOrders,
  updateQueueStatus,
  callQueueNumber,
  ordersByStatus,
  connectQueueStream,
  disconnectQueueStream
} = useRestaurantQueue()

const { locations, fetchLocations } = useRestaurantLocations()
const authStore = useAuthStore()

// Filters
const selectedLocation = ref('')
const selectedStatus = ref('')

// Initial load (fallback untuk data awal sebelum SSE connect)
const loadOrders = async () => {
  try {
    const params = {}
    if (selectedLocation.value) params.locationId = selectedLocation.value
    if (selectedStatus.value) params.status = selectedStatus.value

    await getQueueOrders(params)
  } catch (err) {
    console.error('Failed to load queue:', err)
  }
}

// Connect to SSE stream
const connectStream = () => {
  connectQueueStream({
    locationId: selectedLocation.value || undefined,
    onQueueUpdate: (data) => {
      console.log('Queue updated via SSE:', data)
    },
    onConnect: () => {
      console.log('SSE stream connected')
    },
    onError: (err) => {
      console.error('SSE stream error:', err)
    }
  })
}

const handleStatusUpdate = async (orderId, status) => {
  try {
    await updateQueueStatus(orderId, status)
    // SSE akan otomatis update, tidak perlu reload manual
  } catch (err) {
    console.error('Failed to update status:', err)
  }
}

const handleCallQueue = async (orderId) => {
  try {
    await callQueueNumber(orderId)
    // SSE akan otomatis update
  } catch (err) {
    console.error('Failed to call queue:', err)
  }
}

const openPublicDisplay = () => {
  const tenantId = authStore.user?.tenant?.id || 'demo'
  const url = `/queue?tenantId=${tenantId}`
  window.open(url, '_blank', 'width=1920,height=1080')
}

const stats = computed(() => {
  const orders = queueOrders.value
  return {
    paid: orders.filter(o => o.status === 'paid').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    total: orders.length
  }
})

// Watch for location change to reconnect stream
watch(selectedLocation, () => {
  connectStream()
})

onMounted(async () => {
  await fetchLocations()

  // Load initial data then connect to stream
  await loadOrders()
  connectStream()
})

onUnmounted(() => {
  disconnectQueueStream()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          <IconList class="w-8 h-8 text-primary" />
          Queue Management
        </h1>
        <p class="text-base-content/60 mt-1">
          Manage takeaway and prepaid order queue
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <!-- Connection Status -->
        <div class="flex items-center gap-2 px-3 py-1 rounded-lg" :class="isConnected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
          <IconWifi v-if="isConnected" class="w-4 h-4" />
          <IconWifiOff v-else class="w-4 h-4" />
          <span class="text-xs font-medium">
            {{ isConnected ? 'Live' : reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts})` : 'Disconnected' }}
          </span>
        </div>

        <button
          class="btn btn-outline btn-sm gap-2"
          @click="openPublicDisplay"
        >
          <IconExternalLink class="w-4 h-4" />
          Open Display
        </button>
        <button
          class="btn btn-ghost btn-sm gap-2"
          @click="loadOrders"
          :disabled="loading"
        >
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6 bg-base-100">
      <div class="stat">
        <div class="stat-figure text-info">
          <IconCreditCard class="w-8 h-8" />
        </div>
        <div class="stat-title">Paid</div>
        <div class="stat-value text-info">{{ stats.paid }}</div>
        <div class="stat-desc">Waiting to prepare</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-warning">
          <IconClock class="w-8 h-8" />
        </div>
        <div class="stat-title">Preparing</div>
        <div class="stat-value text-warning">{{ stats.preparing }}</div>
        <div class="stat-desc">In kitchen</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-success">
          <IconCheck class="w-8 h-8" />
        </div>
        <div class="stat-title">Ready</div>
        <div class="stat-value text-success">{{ stats.ready }}</div>
        <div class="stat-desc">Waiting for pickup</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 mb-6">
      <div class="form-control">
        <select
          v-model="selectedLocation"
          class="select select-bordered select-sm"
        >
          <option value="">All Locations</option>
          <option
            v-for="location in locations"
            :key="location.id"
            :value="location.id"
          >
            {{ location.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Queue Panel -->
    <div class="bg-base-100 rounded-box shadow-sm p-6">
      <QueueManagementPanel
        :orders="queueOrders"
        :loading="loading"
        @status-update="handleStatusUpdate"
        @call-queue="handleCallQueue"
        @refresh="loadOrders"
      />
    </div>
  </div>
</template>
