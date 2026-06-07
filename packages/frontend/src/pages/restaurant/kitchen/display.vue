<route lang="yaml">
name: kitchen-display
meta:
  layout: minimal
  title: Kitchen Display
  requiresAuth: true
  permissions: ['restaurant.orders.view']
</route>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useKitchenStream } from '@/composables/restaurant/useKitchenStream'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import KitchenOrderGrid from '@/components/restaurant/kitchen/KitchenOrderGrid.vue'
import KitchenAlertSound from '@/components/restaurant/kitchen/KitchenAlertSound.vue'
import {
  IconChefHat,
  IconRefresh,
  IconLayoutGrid,
  IconLayoutColumns,
  IconFilter,
  IconClock,
  IconCheck,
  IconPlayerPlay,
  IconTrash
} from '@tabler/icons-vue'

const kitchenStream = useKitchenStream()
const locationsComposable = useRestaurantLocations()

// Local state
const locations = ref([])
const autoRefresh = ref(true)
const soundEnabled = ref(true)
const viewMode = ref('kanban')
const selectedLocationId = ref('')
const showCompleted = ref(false)

// Destructure from composable
const {
  orders,
  loading,
  error,
  connectionStatus,
  isConnected,
  stats,
  connectionStatusText,
  connectionStatusClass,
  formattedLastRefresh,
  connectToStream,
  disconnectFromStream,
  fetchOrdersFallback,
  updateOrderStatus: updateOrderStatusAPI,
  updateOrderItemStatus: updateOrderItemStatusAPI,
  removeOrder
} = kitchenStream

// Fetch locations
const fetchLocations = async () => {
  try {
    const response = await locationsComposable.fetchLocations()
    if (response?.data) {
      locations.value = response.data
    }
  } catch (err) {
    console.error('Failed to fetch locations:', err)
  }
}

// Stream connection management
const connectToKitchenStream = () => {
  const params = {}
  
  // Only add locationId if it's not empty
  if (selectedLocationId.value) {
    params.locationId = selectedLocationId.value
  }
  
  if (showCompleted.value) {
    params.includeCompleted = showCompleted.value
  }
  
  connectToStream(params)
}

const disconnectFromKitchenStream = () => {
  disconnectFromStream()
}

// Fallback fetch
const manualRefresh = async () => {
  const params = {
    locationId: selectedLocationId.value,
    includeCompleted: showCompleted.value,
    statuses: ['pending', 'preparing', 'ready', 'served'],
    limit: 50
  }
  await fetchOrdersFallback(params)
}

// Actions
const handleStatusChange = async (orderId, newStatus) => {
  try {
    await updateOrderStatusAPI(orderId, newStatus)
    // Optimistic update is handled in composable
  } catch (err) {
    console.error('Failed to update order status:', err)
  }
}

const handleItemReady = async (orderId, itemId) => {
  try {
    await updateOrderItemStatusAPI(orderId, itemId, 'ready')
    // Optimistic update is handled in composable
  } catch (err) {
    console.error('Failed to update item status:', err)
  }
}

const handleClearOrder = (orderId) => {
  removeOrder(orderId)
}

const handleClearAllServed = () => {
  // Remove all served and completed orders
  orders.value = orders.value.filter(o => !['served', 'completed'].includes(o.status))
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    connectToKitchenStream()
  } else {
    disconnectFromKitchenStream()
  }
}

const handleLocationChange = () => {
  if (autoRefresh.value) {
    connectToKitchenStream()
  } else {
    manualRefresh()
  }
}

const handleCompletedToggle = () => {
  if (autoRefresh.value) {
    connectToKitchenStream()
  } else {
    manualRefresh()
  }
}



// Watch for changes that require stream reconnection
watch([selectedLocationId, showCompleted], () => {
  if (autoRefresh.value) {
    connectToKitchenStream()
  }
})

// Lifecycle
onMounted(async () => {
  await locationsComposable.fetchLocations().then(response => {
    if (response?.data) {
      locations.value = response.data
    }
  }).catch(err => {
    console.error('Failed to fetch locations:', err)
  })
  
  if (autoRefresh.value) {
    connectToKitchenStream()
  } else {
    await manualRefresh()
  }
})

onUnmounted(() => {
  disconnectFromKitchenStream()
})
</script>

<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <!-- Header -->
    <header class="bg-base-100 shadow-lg sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <!-- Title -->
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-warning text-warning-content">
              <IconChefHat class="w-8 h-8" />
            </div>
            <div>
              <h1 class="text-2xl font-bold">Kitchen Display</h1>
              <p class="text-sm text-base-content/60">
                Last updated: {{ formattedLastRefresh }} 
                <span class="ml-2" :class="connectionStatusClass">• {{ connectionStatusText }}</span>
              </p>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center gap-3">
            <div class="stats stats-horizontal shadow bg-base-200">
              <div class="stat py-2 px-4">
                <div class="stat-title text-xs">New</div>
                <div class="stat-value text-info text-2xl">{{ stats.new }}</div>
              </div>
              <div class="stat py-2 px-4">
                <div class="stat-title text-xs">Preparing</div>
                <div class="stat-value text-warning text-2xl">{{ stats.preparing }}</div>
              </div>
              <div class="stat py-2 px-4">
                <div class="stat-title text-xs">Ready</div>
                <div class="stat-value text-success text-2xl">{{ stats.ready }}</div>
              </div>
              <div class="stat py-2 px-4">
                <div class="stat-title text-xs">Served</div>
                <div class="stat-value text-accent text-2xl">{{ stats.served }}</div>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Location Filter -->
            <div class="form-control">
              <select
                v-model="selectedLocationId"
                class="select select-bordered select-sm"
                @change="handleLocationChange"
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

            <!-- View Mode Toggle (single button) -->
            <div class="btn-group">
              <button
                class="btn btn-sm btn-ghost"
                @click="viewMode = viewMode === 'kanban' ? 'grid' : 'kanban'"
                :title="viewMode === 'kanban' ? 'Switch to Grid' : 'Switch to Kanban'"
              >
                <IconLayoutColumns v-if="viewMode === 'kanban'" class="w-5 h-5" />
                <IconLayoutGrid v-else class="w-5 h-5" />
              </button>
            </div>

            <!-- Show Completed Toggle -->
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Completed</span>
              <input
                v-model="showCompleted"
                type="checkbox"
                class="toggle toggle-sm"
                @change="handleCompletedToggle"
              />
            </label>

            <!-- Sound Toggle -->
            <KitchenAlertSound
              :enabled="soundEnabled"
              :new-order-count="stats.new"
              @update:enabled="soundEnabled = $event"
            />

            <!-- Auto Refresh Toggle -->
            <button
              class="btn btn-sm btn-ghost"
              :class="{ 'text-success': autoRefresh && connectionStatus === 'connected' }"
              @click="toggleAutoRefresh"
              title="Toggle Live Stream"
            >
              <IconPlayerPlay v-if="autoRefresh" class="w-5 h-5" />
              <IconClock v-else class="w-5 h-5" />
            </button>

            <!-- Manual Refresh -->
            <button
              class="btn btn-sm btn-primary"
              :class="{ 'loading': loading }"
              @click="manualRefresh"
              :disabled="loading"
            >
              <IconRefresh class="w-5 h-5" :class="{ 'animate-spin': loading }" />
              Refresh
            </button>

            <!-- Clear All Served -->
            <button
              v-if="stats.served > 0 || stats.completed > 0"
              class="btn btn-sm btn-ghost btn-outline"
              @click="handleClearAllServed"
              title="Clear all served/completed orders"
            >
              <IconTrash class="w-5 h-5" />
              Clear Served
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto p-4">
      <KitchenOrderGrid
        :orders="orders"
        @clear-order="handleClearOrder"
        :view-mode="viewMode"
        :show-completed="showCompleted"
        @status-change="handleStatusChange"
        @item-ready="handleItemReady"
      />
    </main>

    <!-- Footer -->
    <footer class="bg-base-100 py-2 text-center text-sm text-base-content/60">
      <p v-if="autoRefresh && connectionStatus === 'connected'" class="flex items-center justify-center gap-2">
        <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
        Live stream active
      </p>
      <p v-else-if="autoRefresh && connectionStatus === 'connecting'" class="flex items-center justify-center gap-2">
        <span class="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
        Connecting to live stream...
      </p>
      <p v-else-if="autoRefresh && connectionStatus === 'error'" class="flex items-center justify-center gap-2">
        <span class="w-2 h-2 rounded-full bg-error animate-pulse"></span>
        Stream connection error - auto-reconnecting
      </p>
      <p v-else>
        Live stream paused - using manual refresh
      </p>
    </footer>
  </div>
</template>
