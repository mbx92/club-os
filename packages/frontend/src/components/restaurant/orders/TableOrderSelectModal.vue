<script setup>
import { computed } from 'vue'
import OrderStatusBadge from './OrderStatusBadge.vue'
import { IconReceipt, IconArrowRight, IconX, IconLayoutColumns } from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  table: {
    type: Object,
    default: null
  },
  orders: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'select', 'view'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Detect whether a group of orders are split bills from the same parent
const isSplitGroup = computed(() => {
  // Orders are considered a split group when they share a parentOrderId
  // or when more than one order has a parentOrderId field at all
  return props.orders.some(o => !!o.parentOrderId)
})

// Group orders: split children grouped together, standalone orders separate
const groupedOrders = computed(() => {
  const splitChildren = props.orders.filter(o => !!o.parentOrderId)
    .sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0) || new Date(a.createdAt) - new Date(b.createdAt))
  const standalone = props.orders.filter(o => !o.parentOrderId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return { splitChildren, standalone }
})

// Sort: active (non-completed) orders first, then by createdAt desc
const sortedOrders = computed(() => {
  return [...props.orders].sort((a, b) => {
    const aActive = !['completed', 'cancelled'].includes(a.status)
    const bActive = !['completed', 'cancelled'].includes(b.status)
    if (aActive !== bActive) return aActive ? -1 : 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})
</script>

<template>
  <Teleport to="body">
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-lg">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="$emit('close')"
      >
        <IconX class="w-4 h-4" />
      </button>

      <h3 class="font-bold text-lg mb-1 flex items-center gap-2">
        <IconReceipt class="w-5 h-5 text-primary" />
        Orders at {{ table?.tableNumber || table?.name || 'Table' }}
      </h3>
      <p class="text-sm text-base-content/60 mb-5">
        {{ orders.length }} tagihan belum lunas di meja ini. Pilih tagihan yang ingin dibayar.
      </p>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else class="space-y-4">
        <!-- Split Bills Group -->
        <template v-if="groupedOrders.splitChildren.length > 0">
          <div class="flex items-center gap-2 mb-1">
            <IconLayoutColumns class="w-4 h-4 text-warning" />
            <span class="text-sm font-semibold text-warning">Split Bills ({{ groupedOrders.splitChildren.length }} tagihan)</span>
          </div>
          <div class="space-y-2 pl-1 border-l-2 border-warning/40">
            <div
              v-for="(order, idx) in groupedOrders.splitChildren"
              :key="order.id"
              class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
              @click="$emit('select', order)"
            >
              <div class="card-body py-3 px-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="badge badge-warning badge-sm font-semibold">
                        Split {{ order.splitIndex != null ? order.splitIndex + 1 : idx + 1 }}/{{ groupedOrders.splitChildren.length }}
                      </span>
                      <span class="font-bold text-sm">
                        {{ order.customerName || order.transactionNumber || `#${order.id?.slice(-6)}` }}
                      </span>
                      <OrderStatusBadge :status="order.status" />
                    </div>
                    <div class="text-xs text-base-content/60 mt-0.5">
                      {{ formatTime(order.createdAt) }}
                      <span v-if="order.items?.length"> · {{ order.items.length }} item(s)</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0 flex items-center gap-2">
                    <div class="font-bold text-sm">{{ formatCurrency(order.totalAmount) }}</div>
                    <IconArrowRight class="w-4 h-4 text-base-content/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Standalone Orders -->
        <template v-if="groupedOrders.standalone.length > 0">
          <div v-if="groupedOrders.splitChildren.length > 0" class="flex items-center gap-2 mt-2 mb-1">
            <IconReceipt class="w-4 h-4 text-base-content/50" />
            <span class="text-sm font-semibold text-base-content/60">Order Lainnya</span>
          </div>
          <div class="space-y-2">
            <div
              v-for="order in groupedOrders.standalone"
              :key="order.id"
              class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
              @click="$emit('select', order)"
            >
              <div class="card-body py-3 px-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm">
                        {{ order.transactionNumber || `#${order.id?.slice(-6)}` }}
                      </span>
                      <OrderStatusBadge :status="order.status" />
                    </div>
                    <div class="text-xs text-base-content/60 mt-0.5">
                      {{ formatTime(order.createdAt) }}
                      <span v-if="order.customerName"> · {{ order.customerName }}</span>
                      <span v-if="order.items?.length"> · {{ order.items.length }} item(s)</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0 flex items-center gap-2">
                    <div class="font-bold text-sm">{{ formatCurrency(order.totalAmount) }}</div>
                    <IconArrowRight class="w-4 h-4 text-base-content/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>
</template>
