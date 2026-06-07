<route lang="yaml">
meta:
  title: Queue Display
  layout: minimal
  requiresAuth: false
</route>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRestaurantQueue } from '@/composables/restaurant/useRestaurantQueue'
import QueueDisplayBoard from '@/components/queue/QueueDisplayBoard.vue'

const route = useRoute()
const { queueDisplay, loading, getQueueDisplay } = useRestaurantQueue()

const tenantId = computed(() => route.query.tenantId || route.query.tenant)
const locationId = computed(() => route.query.locationId || route.query.location)
const tenantName = computed(() => route.query.name || 'Queue Display')
const locationName = computed(() => route.query.locationName || '')

const error = ref(null)
const lastUpdated = ref(null)

const isDev = import.meta.env.DEV
const eventSource = ref(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 10
let reconnectTimeout = null

const connectStream = () => {
  if (!tenantId.value) {
    error.value = 'Tenant ID is required. Please add ?tenantId=xxx to the URL.'
    return
  }

   // Build stream URL (public, token not required).
   // Use VITE_API_URL when available; fallback to backend on localhost:8000
   const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
   const params = new URLSearchParams()
   params.append('tenantId', tenantId.value)
   if (locationId.value) params.append('locationId', locationId.value)
   const streamUrl = `${apiBase.replace(/\/$/, '')}/restaurant/orders/queue/display?${params.toString()}`

  try {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }

    eventSource.value = new EventSource(streamUrl)

    eventSource.value.onopen = () => {
      reconnectAttempts.value = 0
      error.value = null
      if (isDev) console.log('Queue display SSE connected:', streamUrl)
    }

    // Listen for public display events (no auth)
    eventSource.value.addEventListener('display', (e) => {
      try {
        const data = JSON.parse(e.data)
        // Expecting structure: { nowServing, preparing: [], ready: [], lastCalled? }
        queueDisplay.value = {
          preparing: data.preparing || [],
          ready: data.ready || [],
          lastCalled: data.lastCalled || (data.lastCalled || []),
          currentServing: data.nowServing || null
        }
        lastUpdated.value = new Date()
        error.value = null
      } catch (parseErr) {
        console.error('Failed to parse SSE display event:', parseErr)
      }
    })

    // Keep-alive if server emits heartbeat
    eventSource.value.addEventListener('heartbeat', (e) => {
      if (isDev) console.log('Heartbeat:', e.data)
    })

    eventSource.value.onerror = (err) => {
      console.error('SSE error:', err)
      error.value = 'Connection lost. Reconnecting...'
      // Close and attempt reconnect
      if (eventSource.value) {
        try { eventSource.value.close() } catch (e) {}
        eventSource.value = null
      }

      reconnectAttempts.value++
      if (reconnectAttempts.value <= maxReconnectAttempts) {
        const delay = Math.min(30000, 2000 * reconnectAttempts.value)
        reconnectTimeout = setTimeout(() => connectStream(), delay)
      } else {
        error.value = 'Unable to reconnect to queue stream.'
      }
    }
  } catch (err) {
    console.error('Failed to connect SSE:', err)
    error.value = 'Failed to connect to queue stream.'
  }
}

onMounted(async () => {
  // Load initial snapshot then open SSE for real-time updates
  await loadQueueDisplay()
  connectStream()
})

onUnmounted(() => {
  if (reconnectTimeout) clearTimeout(reconnectTimeout)
  if (eventSource.value) {
    try { eventSource.value.close() } catch (e) {}
    eventSource.value = null
  }
})

// Load initial snapshot (kept as function for Retry button)
async function loadQueueDisplay() {
  if (!tenantId.value) {
    error.value = 'Tenant ID is required. Please add ?tenantId=xxx to the URL.'
    return
  }

  try {
    error.value = null
    await getQueueDisplay(tenantId.value, locationId.value)
    lastUpdated.value = new Date()
  } catch (err) {
    console.error('Failed to load queue display:', err)
    error.value = 'Failed to load queue display. Retrying...'
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Error State -->
    <div
      v-if="error && !queueDisplay.preparing?.length && !queueDisplay.ready?.length"
      class="min-h-screen bg-slate-900 flex items-center justify-center"
    >
      <div class="text-center text-white p-8">
        <div class="text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold mb-4">{{ error }}</h2>
        <p class="text-white/60 mb-6">
          Example URL: /queue?tenantId=your-tenant-id
        </p>
        <button class="btn btn-primary" @click="loadQueueDisplay">
          Retry
        </button>
      </div>
    </div>

    <!-- Queue Display -->
    <QueueDisplayBoard
      v-else
      :preparing-orders="queueDisplay.preparing || []"
      :ready-orders="queueDisplay.ready || []"
      :last-called="queueDisplay.lastCalled || []"
      :loading="loading"
      :tenant-name="tenantName"
      :location-name="locationName"
    />
  </div>
</template>

<style scoped>
/* Disable scrollbar for clean display */
:deep(body) {
  overflow: hidden;
}
</style>
