<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import KitchenOrderCard from './KitchenOrderCard.vue'
import {
  IconClock,
  IconChefHat,
  IconCheck,
  IconInbox
} from '@tabler/icons-vue'

const props = defineProps({
  orders: {
    type: Array,
    default: () => []
  },
  showCompleted: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'kanban', // kanban or grid
    validator: (v) => ['kanban', 'grid'].includes(v)
  }
})

const emit = defineEmits(['status-change', 'item-ready', 'clear-order'])

// Force re-compute every second to update visibility
const tick = ref(0)
let interval = null

onMounted(() => {
  // Update every 5 seconds to check if orders should be hidden
  interval = setInterval(() => {
    tick.value++
  }, 5000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

// Helper: Check if order should be hidden (served/completed > 1 minute ago)
const shouldHideOrder = (order) => {
  // Force re-compute by using tick
  tick.value
  
  if (!['served', 'completed'].includes(order.status)) {
    return false
  }
  
  // Get the status update timestamp
  const statusDate = order.servedAt || order.completedAt || order.updatedAt
  if (!statusDate) return false
  
  const updateTime = new Date(statusDate).getTime()
  const now = Date.now()
  const oneMinute = 60 * 1000
  
  // Hide if more than 1 minute has passed
  return (now - updateTime) > oneMinute
}

// Group orders by status
const newOrders = computed(() => {
  return props.orders.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status))
})

const preparingOrders = computed(() => {
  return props.orders.filter(o => o.status === 'preparing')
})

const readyOrders = computed(() => {
  return props.orders.filter(o => o.status === 'ready')
})

const servedOrders = computed(() => {
  const filtered = props.orders.filter(o => {
    if (o.status !== 'served') return false
    // Hide if more than 1 minute has passed
    return !shouldHideOrder(o)
  })
  return filtered
})

const completedOrders = computed(() => {
  const filtered = props.orders.filter(o => {
    if (o.status !== 'completed') return false
    // Hide if more than 1 minute has passed
    return !shouldHideOrder(o)
  })
  return filtered
})

// Kanban columns
const columns = computed(() => {
  const cols = [
    {
      key: 'new',
      title: 'New Orders',
      icon: IconClock,
      orders: newOrders.value,
      headerClass: 'bg-info/20 text-info',
      badgeClass: 'badge-info'
    },
    {
      key: 'preparing',
      title: 'Preparing',
      icon: IconChefHat,
      orders: preparingOrders.value,
      headerClass: 'bg-warning/20 text-warning',
      badgeClass: 'badge-warning'
    },
    {
      key: 'ready',
      title: 'Ready',
      icon: IconCheck,
      orders: readyOrders.value,
      headerClass: 'bg-success/20 text-success',
      badgeClass: 'badge-success'
    },
    {
      key: 'served',
      title: 'Served',
      icon: IconCheck,
      orders: servedOrders.value,
      headerClass: 'bg-accent/20 text-accent',
      badgeClass: 'badge-accent'
    }
  ]

  if (props.showCompleted) {
    cols.push({
      key: 'completed',
      title: 'Completed',
      icon: IconCheck,
      orders: completedOrders.value,
      headerClass: 'bg-base-200 text-base-content',
      badgeClass: 'badge-ghost'
    })
  }

  return cols
})

// All visible orders for grid view
const allVisibleOrders = computed(() => {
  const all = [...newOrders.value, ...preparingOrders.value, ...readyOrders.value, ...servedOrders.value]
  if (props.showCompleted) {
    all.push(...completedOrders.value)
  }
  return all
})
</script>

<template>
  <!-- Kanban View -->
  <div v-if="viewMode === 'kanban'" class="flex gap-4 h-full overflow-x-auto">
    <div
      v-for="column in columns"
      :key="column.key"
      class="flex-1 min-w-[300px] max-w-[400px] flex flex-col bg-base-200/50 rounded-xl"
    >
      <!-- Column Header -->
      <div
        class="p-4 rounded-t-xl flex items-center justify-between"
        :class="column.headerClass"
      >
        <div class="flex items-center gap-2 font-semibold">
          <component :is="column.icon" class="w-5 h-5" />
          {{ column.title }}
        </div>
        <span :class="['badge', column.badgeClass]">
          {{ column.orders.length }}
        </span>
      </div>

      <!-- Column Content -->
      <div class="flex-1 p-3 space-y-3 overflow-y-auto">
        <TransitionGroup name="list">
          <KitchenOrderCard
            v-for="order in column.orders"
            :key="order.id"
            :order="order"
            @status-change="(id, status) => emit('status-change', id, status)"
            @item-ready="(orderId, itemId) => emit('item-ready', orderId, itemId)"
            @clear-order="(orderId) => emit('clear-order', orderId)"
          />
        </TransitionGroup>

        <!-- Empty State -->
        <div
          v-if="column.orders.length === 0"
          class="flex flex-col items-center justify-center py-8 text-base-content/40"
        >
          <IconInbox class="w-12 h-12 mb-2" />
          <p class="text-sm">No orders</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Grid View -->
  <div v-else class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <TransitionGroup name="list">
      <KitchenOrderCard
        v-for="order in allVisibleOrders"
        :key="order.id"
        :order="order"
        @status-change="(id, status) => emit('status-change', id, status)"
        @item-ready="(orderId, itemId) => emit('item-ready', orderId, itemId)"
        @clear-order="(orderId) => emit('clear-order', orderId)"
      />
    </TransitionGroup>

    <!-- Empty State -->
    <div
      v-if="allVisibleOrders.length === 0"
      class="col-span-full flex flex-col items-center justify-center py-16 text-base-content/40"
    >
      <IconInbox class="w-16 h-16 mb-4" />
      <p class="text-lg font-medium">No orders in kitchen</p>
      <p class="text-sm">New orders will appear here automatically</p>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-move {
  transition: transform 0.4s ease;
}
</style>
