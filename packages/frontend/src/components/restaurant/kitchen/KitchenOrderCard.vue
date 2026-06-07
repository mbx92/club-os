<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  IconClock,
  IconCheck,
  IconChefHat,
  IconUser,
  IconNote,
  IconAlertTriangle
} from '@tabler/icons-vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['status-change', 'item-ready', 'clear-order'])

// Modal state
const showModal = ref(false)
const openModal = () => { showModal.value = true }
const closeModal = () => { showModal.value = false }

// Timer
const elapsedTime = ref(0)
const timerInterval = ref(null)

const startTime = computed(() => {
  return new Date(props.order.createdAt || props.order.confirmedAt)
})

const formattedTime = computed(() => {
  const mins = Math.floor(elapsedTime.value / 60)
  const secs = elapsedTime.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const urgencyLevel = computed(() => {
  const mins = Math.floor(elapsedTime.value / 60)
  if (mins >= 20) return 'critical'
  if (mins >= 15) return 'warning'
  if (mins >= 10) return 'normal'
  return 'fresh'
})

const urgencyClass = computed(() => {
  switch (urgencyLevel.value) {
    case 'critical':
      return 'border-error bg-error/5'
    case 'warning':
      return 'border-warning bg-warning/5'
    case 'normal':
      return 'border-info bg-info/5'
    default:
      return 'border-base-300 bg-base-100'
  }
})

const timerClass = computed(() => {
  switch (urgencyLevel.value) {
    case 'critical':
      return 'text-error animate-pulse'
    case 'warning':
      return 'text-warning'
    default:
      return 'text-base-content'
  }
})

const statusConfig = computed(() => {
  switch (props.order.status) {
    case 'confirmed':
    case 'paid':
      return { label: 'New', class: 'badge-info', icon: IconClock }
    case 'preparing':
      return { label: 'Preparing', class: 'badge-warning', icon: IconChefHat }
    case 'ready':
      return { label: 'Ready', class: 'badge-success', icon: IconCheck }
    case 'served':
      return { label: 'Served', class: 'badge-accent', icon: IconCheck }
    default:
      return { label: props.order.status, class: 'badge-ghost', icon: IconClock }
  }
})

const orderTypeLabel = computed(() => {
  switch (props.order.orderType) {
    case 'dine-in':
      return `Table ${props.order.table?.tableNumber || props.order.tableNumber || '-'}`
    case 'takeaway':
      return `Queue ${props.order.queueNumber || '-'}`
    case 'delivery':
      return 'Delivery'
    default:
      return props.order.orderType
  }
})

const updateTimer = () => {
  // Stop timer if order is served or completed
  if (props.order.status === 'served' || props.order.status === 'completed') {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
    return
  }
  
  const now = new Date()
  const start = startTime.value
  elapsedTime.value = Math.floor((now - start) / 1000)
}

onMounted(() => {
  updateTimer()
  // Only start interval if order is not served/completed
  if (props.order.status !== 'served' && props.order.status !== 'completed') {
    timerInterval.value = setInterval(updateTimer, 1000)
  }
})

// Watch for status changes to stop timer when served/completed
watch(() => props.order.status, (newStatus) => {
  if (newStatus === 'served' || newStatus === 'completed') {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  } else if (!timerInterval.value) {
    // Restart timer if status changes back to active
    timerInterval.value = setInterval(updateTimer, 1000)
  }
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})
</script>

<template>
  <div
    class="transition-all duration-300 border-2 shadow-lg card hover:shadow-xl"
    :class="urgencyClass"
    @click="openModal"
  >
    <div class="p-4 card-body">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-2xl font-bold">
              #{{ order.orderNumber || order.id?.slice(-6) }}
            </span>
            <span :class="['badge', statusConfig.class]">
              {{ statusConfig.label }}
            </span>
          </div>
          <div class="mt-1 text-sm text-base-content/60">
            {{ orderTypeLabel }}
          </div>
        </div>

        <!-- Timer -->
        <div class="text-right">
          <div class="font-mono text-2xl font-bold" :class="timerClass">
            {{ formattedTime }}
          </div>
          <div v-if="urgencyLevel === 'critical'" class="flex items-center gap-1 text-xs text-error">
            <IconAlertTriangle class="w-3 h-3" />
            Urgent!
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="my-2 divider"></div>

      <!-- Order Items -->
      <div class="space-y-2 overflow-y-auto max-h-48">
        <div
          v-for="item in order.items"
          :key="item.id"
          class="flex items-start gap-3 p-2 rounded-lg bg-base-200/50"
        >
          <div class="font-bold badge badge-lg">
            {{ item.quantity }}x
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ item.product?.name || item.name }}
            </div>
            <div v-if="item.variants?.length" class="text-xs text-base-content/60">
              {{ item.variants.map(v => v.name || v).join(', ') }}
            </div>
            <div v-if="item.notes" class="flex items-center gap-1 mt-1 text-xs text-warning">
              <IconNote class="w-3 h-3" />
              {{ item.notes }}
            </div>
          </div>
          <button
            v-if="order.status === 'preparing' && !item.isReady"
            class="btn btn-xs btn-success btn-outline"
            @click.stop="$emit('item-ready', order.id, item.id)"
          >
            <IconCheck class="w-3 h-3" />
          </button>
          <IconCheck
            v-else-if="item.isReady"
            class="w-5 h-5 text-success"
          />
        </div>
      </div>

      <!-- Notes -->
      <div
        v-if="order.notes"
        class="p-2 mt-3 text-sm rounded-lg bg-warning/10"
      >
        <div class="flex items-start gap-2">
          <IconNote class="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <span>{{ order.notes }}</span>
        </div>
      </div>

      <!-- Customer Info -->
      <div
        v-if="order.customerName || order.customer"
        class="flex items-center gap-2 mt-3 text-sm text-base-content/60"
      >
        <IconUser class="w-4 h-4" />
        {{ order.customerName || order.customer?.name || 'Walk-in' }}
      </div>

      <!-- Actions -->
      <div class="mt-4 card-actions">
        <button
          v-if="order.status === 'confirmed' || order.status === 'pending'"
          class="flex-1 btn btn-warning"
          @click.stop="$emit('status-change', order.id, 'preparing')"
        >
          <IconChefHat class="w-5 h-5" />
          Start Preparing
        </button>

        <button
          v-else-if="order.status === 'preparing'"
          class="flex-1 btn btn-success"
          @click.stop="$emit('status-change', order.id, 'ready')"
        >
          <IconCheck class="w-5 h-5" />
          Mark Ready
        </button>

        <button
          v-else-if="order.status === 'ready'"
          class="flex-1 btn btn-accent"
          @click.stop="$emit('status-change', order.id, 'served')"
        >
          <IconCheck class="w-5 h-5" />
          Mark Served
        </button>

        <button
          v-else-if="order.status === 'served' || order.status === 'completed'"
          class="flex-1 btn btn-ghost btn-sm"
          @click.stop="$emit('clear-order', order.id)"
        >
          Clear
        </button>
      </div>
    </div>
  </div>

  <!-- Order Detail Modal -->
  <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
    <div class="bg-base-100 p-4 rounded-lg shadow-lg w-full max-w-2xl z-10">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-lg font-bold">Order #{{ order.orderNumber || order.id?.slice(-6) }}</h3>
          <div class="text-sm text-base-content/60">Status: <span :class="['badge', statusConfig.class]">{{ statusConfig.label }}</span></div>
        </div>
        <button class="btn btn-sm btn-ghost" @click="closeModal">Close</button>
      </div>

      <div class="space-y-3">
        <div class="text-sm text-base-content/60">Type: {{ order.orderType }}</div>
        <div v-if="order.table" class="text-sm">Table: {{ order.table.tableNumber }}</div>
        <div class="divider"></div>
        <div>
          <h4 class="font-medium">Items</h4>
          <ul class="list-disc pl-5 mt-2">
            <li v-for="item in order.items" :key="item.id" class="py-1">
              <strong>{{ item.quantity }}x</strong> {{ item.product?.name || item.name }}
            </li>
          </ul>
        </div>

        <div v-if="order.notes" class="p-2 rounded bg-warning/10">
          <h4 class="font-medium">Notes</h4>
          <div class="text-sm">{{ order.notes }}</div>
        </div>

        <div class="text-xs text-base-content/60">
          Created: {{ new Date(order.createdAt).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>
