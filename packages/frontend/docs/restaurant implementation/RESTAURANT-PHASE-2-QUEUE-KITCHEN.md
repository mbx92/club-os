# 🎯 Phase 2: Queue & Kitchen Systems

**Duration:** Week 3  
**Effort:** ~35 hours  
**Priority:** CRITICAL  
**Dependencies:** Phase 1 complete  
**Status:** 📋 Ready to Start

---

## 📊 Overview

Implement complete queue management system for takeaway/prepaid orders and real-time kitchen display system for order tracking.

### Goals
1. ✅ Public queue display (customer-facing monitor)
2. ✅ Queue management interface (staff)
3. ✅ Kitchen display system (real-time orders)
4. ✅ Audio/visual alerts for new orders
5. ✅ Queue number generation in direct orders

### Success Criteria
- Prepaid orders generate queue numbers (e.g., A-001, B-015)
- Public display accessible without authentication
- Kitchen display updates in real-time
- Staff can call queue numbers
- Audio alerts play for new orders
- Status transitions work smoothly (paid → preparing → ready)

---

## 🗂️ Files to Create

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantQueue.js            ✨ NEW (~3 hours)
```

### Pages (3 files)
```
src/pages/
└── queue/
    └── index.vue                    ✨ NEW (~5 hours) - PUBLIC PAGE

src/pages/restaurant/
├── queue/
│   └── manage.vue                   ✨ NEW (~4 hours)
└── kitchen/
    └── display.vue                  ✨ NEW (~5 hours)
```

### Components (10 files)
```
src/components/queue/                ✨ NEW (Global - no auth)
├── QueueDisplayBoard.vue            ✨ NEW (~4 hours)
└── QueueNumberCard.vue              ✨ NEW (~2 hours)

src/components/restaurant/
├── queue/
│   ├── QueueManagementPanel.vue     ✨ NEW (~3 hours)
│   ├── QueueCallButton.vue          ✨ NEW (~1 hour)
│   └── QueueStatusBadge.vue         ✨ NEW (~1 hour)
└── kitchen/
    ├── KitchenOrderCard.vue         ✨ NEW (~3 hours)
    ├── KitchenOrderGrid.vue         ✨ NEW (~2 hours)
    ├── KitchenStatusButtons.vue     ✨ NEW (~2 hours)
    ├── KitchenTimer.vue             ✨ NEW (~2 hours)
    └── KitchenAlertSound.vue        ✨ NEW (~2 hours)
```

---

## 📝 Files to Modify

### Composables (1 file)
```
src/composables/restaurant/
└── useRestaurantOrders.js           📝 UPDATE (~2 hours)
```

### Pages (1 file)
```
src/pages/restaurant/
└── pos/index.vue                    📝 UPDATE (~1 hour)
```

### Router (1 file)
```
src/router/
└── index.js                         📝 UPDATE (~0.5 hours)
```

---

## 🔧 Implementation Details

### 1. Create useRestaurantQueue Composable

**File:** `src/composables/restaurant/useRestaurantQueue.js`

**API Endpoints:**
- GET `/restaurant/queue-display?tenantId=&locationId=` (PUBLIC - No auth)
- PUT `/restaurant/orders/queue/:id/status`
- POST `/restaurant/orders/queue/:id/call`

**Code Structure:**
```javascript
import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useRestaurantQueue() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  // State
  const queueDisplay = ref({
    preparing: [],
    ready: [],
    lastCalled: []
  })
  const loading = ref(false)
  const error = ref(null)

  // Get queue display (PUBLIC endpoint - no auth required)
  const getQueueDisplay = async (tenantId, locationId = null) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ tenantId })
      if (locationId) params.append('locationId', locationId)

      // Note: This is a public endpoint
      const response = await api.get(`/restaurant/queue-display?${params.toString()}`, {
        skipAuth: true // Special flag for public endpoint
      })

      queueDisplay.value = response.data || {
        preparing: [],
        ready: [],
        lastCalled: []
      }
      return queueDisplay.value
    } catch (err) {
      if (isDev) console.error('Get queue display error:', err)
      error.value = err.message
      // Don't show error notification for public display
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update queue status (staff only)
  const updateQueueStatus = async (orderId, status) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/restaurant/orders/queue/${orderId}/status`, { status })
      showSuccess(`Order status updated to ${status}`)
      return response.data
    } catch (err) {
      if (isDev) console.error('Update queue status error:', err)
      error.value = err.message
      handleError(err, 'Failed to update queue status')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Call queue number (staff only)
  const callQueueNumber = async (orderId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post(`/restaurant/orders/queue/${orderId}/call`)
      showSuccess('Queue number called')
      return response.data
    } catch (err) {
      if (isDev) console.error('Call queue number error:', err)
      error.value = err.message
      handleError(err, 'Failed to call queue number')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    queueDisplay,
    loading,
    error,

    // Methods
    getQueueDisplay,
    updateQueueStatus,
    callQueueNumber
  }
}
```

**Time Estimate:** 3 hours

---

### 2. Update useRestaurantOrders Composable

**File:** `src/composables/restaurant/useRestaurantOrders.js`

**Add Missing Methods:**

```javascript
// Add these methods to existing composable

// Get kitchen orders (confirmed/preparing status)
const getKitchenOrders = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/restaurant/orders/kitchen')
    return response.data || []
  } catch (err) {
    if (isDev) console.error('Get kitchen orders error:', err)
    error.value = err.message
    handleError(err, 'Failed to get kitchen orders')
    throw err
  } finally {
    loading.value = false
  }
}

// Get queue list (active queue orders)
const getQueueList = async (params = {}) => {
  loading.value = true
  error.value = null
  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `/restaurant/orders/queue${queryString ? `?${queryString}` : ''}`
    const response = await api.get(url)
    return response.data || []
  } catch (err) {
    if (isDev) console.error('Get queue list error:', err)
    error.value = err.message
    handleError(err, 'Failed to get queue list')
    throw err
  } finally {
    loading.value = false
  }
}

// Create direct order (prepaid - generates queue number)
const createDirectOrder = async (orderData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/orders/direct', orderData)
    showSuccess(`Order created! Queue number: ${response.data.queueNumber}`)
    return response.data
  } catch (err) {
    if (isDev) console.error('Create direct order error:', err)
    error.value = err.message
    handleError(err, 'Failed to create direct order')
    throw err
  } finally {
    loading.value = false
  }
}

// Validate voucher
const validateVoucher = async (voucherData) => {
  loading.value = true
  error.value = null
  try {
    const response = await api.post('/restaurant/orders/validate-voucher', voucherData)
    return response.data
  } catch (err) {
    if (isDev) console.error('Validate voucher error:', err)
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}

// Add to return object
return {
  // ... existing exports
  getKitchenOrders,
  getQueueList,
  createDirectOrder,
  validateVoucher
}
```

**Time Estimate:** 2 hours

---

### 3. Create Public Queue Display Page

**File:** `src/pages/queue/index.vue`

**Features:**
- No authentication required (public page)
- Full-screen display for customer monitor
- Auto-refresh every 5 seconds
- Show preparing orders
- Show ready orders (highlighted)
- Show last called numbers
- Responsive for various monitor sizes

**Code Structure:**
```vue
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
import QueueNumberCard from '@/components/queue/QueueNumberCard.vue'

const route = useRoute()
const { queueDisplay, getQueueDisplay } = useRestaurantQueue()

const tenantId = computed(() => route.query.tenantId)
const locationId = computed(() => route.query.locationId)
const refreshInterval = ref(null)

const loadQueueDisplay = async () => {
  if (!tenantId.value) {
    console.error('Tenant ID required')
    return
  }

  try {
    await getQueueDisplay(tenantId.value, locationId.value)
  } catch (err) {
    console.error('Failed to load queue display:', err)
  }
}

onMounted(async () => {
  await loadQueueDisplay()
  
  // Auto-refresh every 5 seconds
  refreshInterval.value = setInterval(() => {
    loadQueueDisplay()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary to-secondary p-8">
    <div class="container mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-6xl font-bold text-white mb-4">Queue Display</h1>
        <p class="text-2xl text-white/80">Please wait for your number to be called</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Preparing Orders -->
        <div class="card bg-white shadow-2xl">
          <div class="card-body">
            <h2 class="card-title text-3xl text-warning mb-4">
              ⏳ Preparing
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <QueueNumberCard
                v-for="order in queueDisplay.preparing"
                :key="order.id"
                :queue-number="order.queueNumber"
                status="preparing"
              />
            </div>
            <div v-if="queueDisplay.preparing.length === 0" class="text-center py-8 text-base-content/40">
              No orders in preparation
            </div>
          </div>
        </div>

        <!-- Ready Orders -->
        <div class="card bg-white shadow-2xl">
          <div class="card-body">
            <h2 class="card-title text-3xl text-success mb-4 animate-pulse">
              ✅ Ready for Pickup
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <QueueNumberCard
                v-for="order in queueDisplay.ready"
                :key="order.id"
                :queue-number="order.queueNumber"
                status="ready"
                class="animate-bounce"
              />
            </div>
            <div v-if="queueDisplay.ready.length === 0" class="text-center py-8 text-base-content/40">
              No orders ready
            </div>
          </div>
        </div>
      </div>

      <!-- Last Called -->
      <div v-if="queueDisplay.lastCalled.length > 0" class="card bg-white shadow-2xl mt-8">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Recently Called</h2>
          <div class="flex gap-4 justify-center">
            <div
              v-for="queueNum in queueDisplay.lastCalled"
              :key="queueNum"
              class="badge badge-lg badge-ghost text-xl p-6"
            >
              {{ queueNum }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-8 text-white/60 text-sm">
        Auto-refreshing every 5 seconds
      </div>
    </div>
  </div>
</template>
```

**Time Estimate:** 5 hours

---

### 4. Create Queue Management Page

**File:** `src/pages/restaurant/queue/manage.vue`

**Features:**
- Staff interface for queue management
- List all queue orders (paid, preparing, ready)
- Call queue number button
- Update status buttons
- Filter by location

**Code Structure:**
```vue
<route lang="yaml">
meta:
  title: Queue Management
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { useRestaurantQueue } from '@/composables/restaurant/queue/useRestaurantQueue'
import QueueManagementPanel from '@/components/restaurant/queue/QueueManagementPanel.vue'
import { IconList, IconClock, IconCheck } from '@tabler/icons-vue'

const { getQueueList, loading } = useRestaurantOrders()
const { updateQueueStatus, callQueueNumber } = useRestaurantQueue()

const orders = ref([])
const filters = ref({
  status: '',
  locationId: ''
})

const loadOrders = async () => {
  try {
    orders.value = await getQueueList(filters.value)
  } catch (err) {
    console.error('Failed to load queue:', err)
  }
}

const handleStatusUpdate = async (orderId, status) => {
  try {
    await updateQueueStatus(orderId, status)
    await loadOrders()
  } catch (err) {
    console.error('Failed to update status:', err)
  }
}

const handleCallQueue = async (orderId) => {
  try {
    await callQueueNumber(orderId)
    await loadOrders()
  } catch (err) {
    console.error('Failed to call queue:', err)
  }
}

const ordersByStatus = computed(() => {
  return {
    paid: orders.value.filter(o => o.status === 'paid'),
    preparing: orders.value.filter(o => o.status === 'preparing'),
    ready: orders.value.filter(o => o.status === 'ready')
  }
})

onMounted(async () => {
  await loadOrders()
  
  // Auto-refresh every 10 seconds
  setInterval(loadOrders, 10000)
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Queue Management</h1>
        <p class="text-base-content/60">Manage takeaway and prepaid orders</p>
      </div>
      <button class="btn btn-ghost" @click="loadOrders">
        <IconList class="w-5 h-5 mr-2" />
        Refresh
      </button>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-info">
          <IconClock class="w-8 h-8" />
        </div>
        <div class="stat-title">Paid</div>
        <div class="stat-value text-info">{{ ordersByStatus.paid.length }}</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-warning">
          <IconClock class="w-8 h-8" />
        </div>
        <div class="stat-title">Preparing</div>
        <div class="stat-value text-warning">{{ ordersByStatus.preparing.length }}</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-success">
          <IconCheck class="w-8 h-8" />
        </div>
        <div class="stat-title">Ready</div>
        <div class="stat-value text-success">{{ ordersByStatus.ready.length }}</div>
      </div>
    </div>

    <!-- Queue Management Panel -->
    <QueueManagementPanel
      :orders="orders"
      :loading="loading"
      @status-update="handleStatusUpdate"
      @call-queue="handleCallQueue"
    />
  </div>
</template>
```

**Time Estimate:** 4 hours

---

### 5. Create Kitchen Display Page

**File:** `src/pages/restaurant/kitchen/display.vue`

**Features:**
- Real-time order display
- Color-coded by status and urgency
- Order preparation timer
- Quick status change buttons
- Audio alert for new orders
- Full-screen mode for kitchen monitors

**Code Structure:**
```vue
<route lang="yaml">
meta:
  title: Kitchen Display
  layout: minimal
</route>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import KitchenOrderGrid from '@/components/restaurant/kitchen/KitchenOrderGrid.vue'
import KitchenAlertSound from '@/components/restaurant/kitchen/KitchenAlertSound.vue'

const { getKitchenOrders, updateOrderStatus, loading } = useRestaurantOrders()

const orders = ref([])
const previousOrderIds = ref(new Set())
const hasNewOrders = ref(false)
const refreshInterval = ref(null)

const loadOrders = async () => {
  try {
    const newOrders = await getKitchenOrders()
    
    // Check for new orders
    const newOrderIds = new Set(newOrders.map(o => o.id))
    hasNewOrders.value = Array.from(newOrderIds).some(id => !previousOrderIds.value.has(id))
    
    orders.value = newOrders
    previousOrderIds.value = newOrderIds
  } catch (err) {
    console.error('Failed to load kitchen orders:', err)
  }
}

const handleStatusChange = async (orderId, status) => {
  try {
    await updateOrderStatus(orderId, { status })
    await loadOrders()
  } catch (err) {
    console.error('Failed to update status:', err)
  }
}

onMounted(async () => {
  await loadOrders()
  
  // Auto-refresh every 10 seconds
  refreshInterval.value = setInterval(loadOrders, 10000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-200 p-4">
    <!-- Header -->
    <div class="bg-base-100 rounded-lg shadow-lg p-4 mb-4">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold">Kitchen Display</h1>
        <div class="text-right">
          <div class="text-2xl font-mono">{{ new Date().toLocaleTimeString() }}</div>
          <div class="text-sm text-base-content/60">{{ orders.length }} active orders</div>
        </div>
      </div>
    </div>

    <!-- Orders Grid -->
    <KitchenOrderGrid
      :orders="orders"
      :loading="loading"
      @status-change="handleStatusChange"
    />

    <!-- Audio Alert -->
    <KitchenAlertSound :play="hasNewOrders" @played="hasNewOrders = false" />
  </div>
</template>
```

**Time Estimate:** 5 hours

---

### 6. Create QueueDisplayBoard Component

**File:** `src/components/queue/QueueDisplayBoard.vue`

**Features:**
- Large, readable queue numbers
- Color-coded status
- Smooth animations

**Time Estimate:** 4 hours

---

### 7. Create KitchenOrderCard Component

**File:** `src/components/restaurant/kitchen/KitchenOrderCard.vue`

**Features:**
- Order details (items, table, notes)
- Preparation timer
- Status change buttons
- Color-coded urgency

**Time Estimate:** 3 hours

---

### 8. Create KitchenAlertSound Component

**File:** `src/components/restaurant/kitchen/KitchenAlertSound.vue`

**Features:**
- Play alert sound for new orders
- Volume control
- Sound toggle on/off

**Code Structure:**
```vue
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  play: Boolean,
  volume: {
    type: Number,
    default: 0.5
  }
})

const emit = defineEmits(['played'])

const audio = ref(null)

const playSound = () => {
  if (audio.value) {
    audio.value.volume = props.volume
    audio.value.play()
    emit('played')
  }
}

watch(() => props.play, (val) => {
  if (val) {
    playSound()
  }
})
</script>

<template>
  <audio ref="audio" src="/sounds/kitchen-alert.mp3" preload="auto"></audio>
</template>
```

**Time Estimate:** 2 hours

---

### 9. Update Router for Public Queue Page

**File:** `src/router/index.js`

**Add public route:**

```javascript
{
  path: '/queue',
  name: 'queue-display',
  component: () => import('@/pages/queue/index.vue'),
  meta: {
    requiresAuth: false, // PUBLIC PAGE
    layout: 'minimal'
  }
}
```

**Time Estimate:** 0.5 hours

---

## ✅ Testing Checklist

### Queue Display (Public)
- [ ] Access queue display without authentication
- [ ] Queue display shows preparing orders
- [ ] Queue display shows ready orders
- [ ] Display auto-refreshes every 5 seconds
- [ ] Display works on large monitors
- [ ] Queue numbers are clearly visible

### Queue Management (Staff)
- [ ] Staff can view all queue orders
- [ ] Filter by status works
- [ ] Update status buttons work
- [ ] Call queue number button works
- [ ] Auto-refresh every 10 seconds

### Kitchen Display
- [ ] Kitchen display shows confirmed/preparing orders
- [ ] Order cards show all relevant information
- [ ] Status change buttons work
- [ ] Preparation timer displays correctly
- [ ] Audio alert plays for new orders
- [ ] Display auto-refreshes

### Direct Orders (Prepaid)
- [ ] Create direct order generates queue number
- [ ] Queue number format correct (A-001)
- [ ] Order appears in queue immediately
- [ ] Receipt shows queue number

---

## 📊 Progress Tracking

- [ ] useRestaurantQueue composable created
- [ ] useRestaurantOrders updated (4 methods)
- [ ] Public queue display page created
- [ ] Queue management page created
- [ ] Kitchen display page created
- [ ] QueueDisplayBoard component created
- [ ] QueueNumberCard component created
- [ ] QueueManagementPanel component created
- [ ] KitchenOrderCard component created
- [ ] KitchenOrderGrid component created
- [ ] KitchenStatusButtons component created
- [ ] KitchenTimer component created
- [ ] KitchenAlertSound component created
- [ ] Router updated for public route
- [ ] POS updated for direct orders
- [ ] All tests passing

**Estimated Completion:** End of Week 3

---

## 🚀 Next Steps

After completing Phase 2, proceed to:
- **Phase 3:** Advanced Order Features (Split/Merge Bills)
- Review `RESTAURANT-PHASE-3-ADVANCED-ORDERS.md`

---

**Created:** December 1, 2025  
**Status:** 📋 Ready to Start
