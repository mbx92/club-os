<script setup>
import { computed } from 'vue'
import {
  IconPhone,
  IconCheck,
  IconClock,
  IconX,
  IconRefresh
} from '@tabler/icons-vue'
import QueueNumberCard from '@/components/queue/QueueNumberCard.vue'

const props = defineProps({
  orders: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['status-update', 'call-queue', 'refresh'])

const ordersByStatus = computed(() => {
  return {
    paid: props.orders.filter(o => o.status === 'paid'),
    preparing: props.orders.filter(o => o.status === 'preparing'),
    ready: props.orders.filter(o => o.status === 'ready')
  }
})

const formatTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const getTimeSince = (dateString) => {
  if (!dateString) return '-'
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ${diffMins % 60}m ago`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Tab Navigation -->
    <div role="tablist" class="tabs tabs-boxed bg-base-200 p-1">
      <a role="tab" class="tab tab-active">
        All Orders
        <span class="badge badge-sm ml-2">{{ orders.length }}</span>
      </a>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orders.length === 0"
      class="text-center py-16"
    >
      <IconClock class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No queue orders</h3>
      <p class="text-base-content/60">
        Queue orders will appear here when customers place takeaway orders
      </p>
    </div>

    <!-- Orders Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Paid Column -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-info"></div>
          <h3 class="font-semibold">Paid</h3>
          <span class="badge badge-info badge-sm">{{ ordersByStatus.paid.length }}</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="order in ordersByStatus.paid"
            :key="order.id"
            class="card bg-base-100 shadow-sm border-l-4 border-info"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between">
                <QueueNumberCard
                  :queue-number="order.queueNumber"
                  status="paid"
                  size="sm"
                  :show-status="false"
                />
                <span class="text-xs text-base-content/60">
                  {{ formatTime(order.createdAt) }}
                </span>
              </div>

              <div class="mt-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Items</span>
                  <span>{{ order.items?.length || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Total</span>
                  <span class="font-medium">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>

              <div class="card-actions mt-3">
                <button
                  class="btn btn-warning btn-sm flex-1"
                  @click="$emit('status-update', order.id, 'preparing')"
                >
                  <IconClock class="w-4 h-4" />
                  Start Preparing
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="ordersByStatus.paid.length === 0"
            class="text-center py-8 text-base-content/40"
          >
            No paid orders
          </div>
        </div>
      </div>

      <!-- Preparing Column -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-warning"></div>
          <h3 class="font-semibold">Preparing</h3>
          <span class="badge badge-warning badge-sm">{{ ordersByStatus.preparing.length }}</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="order in ordersByStatus.preparing"
            :key="order.id"
            class="card bg-base-100 shadow-sm border-l-4 border-warning"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between">
                <QueueNumberCard
                  :queue-number="order.queueNumber"
                  status="preparing"
                  size="sm"
                  :show-status="false"
                />
                <div class="text-right">
                  <span class="text-xs text-base-content/60">
                    {{ getTimeSince(order.updatedAt) }}
                  </span>
                </div>
              </div>

              <!-- Order Items -->
              <div class="mt-3 space-y-1">
                <div
                  v-for="item in (order.items || []).slice(0, 3)"
                  :key="item.id"
                  class="text-sm flex justify-between"
                >
                  <span>{{ item.quantity }}x {{ item.product?.name || item.name }}</span>
                </div>
                <div
                  v-if="(order.items || []).length > 3"
                  class="text-xs text-base-content/60"
                >
                  +{{ order.items.length - 3 }} more items
                </div>
              </div>

              <div class="card-actions mt-3">
                <button
                  class="btn btn-success btn-sm flex-1"
                  @click="$emit('status-update', order.id, 'ready')"
                >
                  <IconCheck class="w-4 h-4" />
                  Mark Ready
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="ordersByStatus.preparing.length === 0"
            class="text-center py-8 text-base-content/40"
          >
            No orders preparing
          </div>
        </div>
      </div>

      <!-- Ready Column -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-success animate-pulse"></div>
          <h3 class="font-semibold">Ready for Pickup</h3>
          <span class="badge badge-success badge-sm">{{ ordersByStatus.ready.length }}</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="order in ordersByStatus.ready"
            :key="order.id"
            class="card bg-base-100 shadow-sm border-l-4 border-success"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between">
                <QueueNumberCard
                  :queue-number="order.queueNumber"
                  status="ready"
                  size="sm"
                  :show-status="false"
                />
                <div class="text-right">
                  <span class="text-xs text-base-content/60">
                    Ready {{ getTimeSince(order.updatedAt) }}
                  </span>
                </div>
              </div>

              <div class="mt-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Customer</span>
                  <span>{{ order.customerName || 'Walk-in' }}</span>
                </div>
              </div>

              <div class="card-actions mt-3 gap-2">
                <button
                  class="btn btn-primary btn-sm flex-1"
                  @click="$emit('call-queue', order.id)"
                >
                  <IconPhone class="w-4 h-4" />
                  Call
                </button>
                <button
                  class="btn btn-success btn-sm flex-1"
                  @click="$emit('status-update', order.id, 'completed')"
                >
                  <IconCheck class="w-4 h-4" />
                  Complete
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="ordersByStatus.ready.length === 0"
            class="text-center py-8 text-base-content/40"
          >
            No orders ready
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
