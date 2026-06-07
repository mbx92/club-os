<script setup>
import { computed } from 'vue'
import OrderStatusBadge from './OrderStatusBadge.vue'
import { IconClock, IconUser, IconReceipt } from '@tabler/icons-vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['view-detail', 'update-status', 'complete', 'confirm-served'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(parseFloat(amount))
}

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}

const itemsCount = computed(() => {
  return props.order.items?.length || 0
})

const canComplete = computed(() => {
  return props.order.status !== 'completed' && props.order.status !== 'cancelled'
})

const isTakeaway = computed(() => {
  return props.order.orderType === 'takeaway'
})

const orderTypeLabel = computed(() => {
  const t = props.order.orderType
  if (!t) return ''
  if (t === 'takeaway') return 'Takeaway'
  if (t === 'dine-in' || t === 'dine_in' || t === 'dinein') return 'Dine In'
  return t.charAt(0).toUpperCase() + t.slice(1)
})
</script>

<template>
  <div class="card bg-base-100 shadow hover:shadow-xl transition-shadow">
    <div class="card-body">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <h3 class="card-title text-base">{{ order.transactionNumber }}</h3>
          <div class="flex items-center gap-2 mt-1 text-sm text-base-content/60">
            <IconClock class="w-4 h-4" />
            <span>{{ formatTimeAgo(order.createdAt) }}</span>
          </div>
        </div>
        <OrderStatusBadge :status="order.status" />
      </div>

      <!-- Info -->
      <div class="space-y-2 mt-3">
        <div v-if="orderTypeLabel" class="text-xs">
          <span class="badge badge-outline badge-sm">{{ orderTypeLabel }}</span>
        </div>
        <div v-if="order.table" class="flex items-center gap-2 text-sm">
          <IconReceipt class="w-4 h-4 text-base-content/60" />
          <span>{{ order.table.tableNumber }}</span>
          <span v-if="order.table.tableName" class="text-base-content/60">- {{ order.table.tableName }}</span>
        </div>
        
        <div v-if="order.customerName" class="flex items-center gap-2 text-sm">
          <IconUser class="w-4 h-4 text-base-content/60" />
          <span>{{ order.customerName }}</span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-base-content/60">{{ itemsCount }} item{{ itemsCount !== 1 ? 's' : '' }}</span>
          <span class="font-bold text-primary text-base">{{ formatCurrency(order.totalAmount) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="card-actions mt-4 gap-2">
        <button 
          class="btn btn-sm btn-outline flex-1"
          @click="$emit('view-detail', order.id)"
        >
          View Detail
        </button>
        <button 
          v-if="canComplete"
          class="btn btn-sm btn-primary"
          @click="isTakeaway ? $emit('confirm-served', order.id) : $emit('complete', order.id)"
        >
          Complete
        </button>
      </div>
    </div>
  </div>
</template>
