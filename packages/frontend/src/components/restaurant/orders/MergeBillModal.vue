<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconGitMerge,
  IconReceipt,
  IconCheck,
  IconAlertTriangle,
  IconSearch,
  IconX
} from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  orders: {
    type: Array,
    default: () => []
  },
  currentOrderId: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// State
const selectedOrderIds = ref([])
const searchQuery = ref('')

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}

// Mergeable orders (same table, pending/confirmed status, not current order)
const mergeableOrders = computed(() => {
  return props.orders.filter(order => {
    // Exclude current order from list
    if (order.id === props.currentOrderId) return false
    
    // Only show pending/confirmed orders
    if (!['pending', 'confirmed', 'preparing'].includes(order.status)) return false
    
    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const orderNum = order.orderNumber || order.id?.slice(-6) || ''
      const customerName = order.customerName || order.customer?.name || ''
      const tableNum = order.table?.tableNumber || order.tableNumber || ''
      
      return orderNum.toLowerCase().includes(query) ||
             customerName.toLowerCase().includes(query) ||
             tableNum.toString().includes(query)
    }
    
    return true
  })
})

// Calculate merged total
const mergedTotal = computed(() => {
  const currentOrder = props.orders.find(o => o.id === props.currentOrderId)
  const selectedOrders = props.orders.filter(o => selectedOrderIds.value.includes(o.id))
  
  const allOrders = currentOrder ? [currentOrder, ...selectedOrders] : selectedOrders
  
  return {
    itemCount: allOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0),
    subtotal: allOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
    tax: allOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0),
    total: allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  }
})

// Validation
const isValid = computed(() => {
  return selectedOrderIds.value.length >= 1 // At least 1 order to merge with current
})

// Toggle order selection
const toggleOrderSelection = (orderId) => {
  const idx = selectedOrderIds.value.indexOf(orderId)
  if (idx > -1) {
    selectedOrderIds.value.splice(idx, 1)
  } else {
    selectedOrderIds.value.push(orderId)
  }
}

// Check if order is selected
const isSelected = (orderId) => {
  return selectedOrderIds.value.includes(orderId)
}

// Get status badge class
const getStatusClass = (status) => {
  switch (status) {
    case 'pending': return 'badge-warning'
    case 'confirmed': return 'badge-info'
    case 'preparing': return 'badge-secondary'
    default: return 'badge-ghost'
  }
}

// Reset form
const resetForm = () => {
  selectedOrderIds.value = []
  searchQuery.value = ''
}

// Handle submit
const handleSubmit = () => {
  if (!isValid.value) return
  
  const allOrderIds = props.currentOrderId 
    ? [props.currentOrderId, ...selectedOrderIds.value]
    : selectedOrderIds.value
  
  emit('submit', allOrderIds)
}

// Close modal
const closeModal = () => {
  emit('close')
  setTimeout(resetForm, 300)
}

// Watch for modal open
watch(() => props.show, (val) => {
  if (val) {
    resetForm()
  }
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-3xl">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <IconGitMerge class="w-5 h-5" />
        Merge Bills
      </h3>

      <!-- Current Order Info -->
      <div v-if="currentOrderId" class="alert alert-info mb-4">
        <IconReceipt class="w-5 h-5" />
        <div>
          <span class="font-medium">Merging with Order #{{ orders.find(o => o.id === currentOrderId)?.orderNumber || currentOrderId.slice(-6) }}</span>
          <span class="text-sm ml-2">
            ({{ formatCurrency(orders.find(o => o.id === currentOrderId)?.totalAmount) }})
          </span>
        </div>
      </div>

      <!-- Search -->
      <div class="form-control mb-4">
        <div class="input-group">
          <span class="bg-base-200">
            <IconSearch class="w-5 h-5" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            class="input input-bordered flex-1"
            placeholder="Search by order #, customer, or table..."
          />
          <button
            v-if="searchQuery"
            class="btn btn-ghost"
            @click="searchQuery = ''"
          >
            <IconX class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Orders List -->
      <div class="space-y-2 max-h-80 overflow-y-auto mb-4">
        <template v-if="mergeableOrders.length > 0">
          <div
            v-for="order in mergeableOrders"
            :key="order.id"
            class="card bg-base-200 cursor-pointer transition-all"
            :class="{ 'ring-2 ring-primary bg-primary/10': isSelected(order.id) }"
            @click="toggleOrderSelection(order.id)"
          >
            <div class="card-body p-4">
              <div class="flex items-start gap-4">
                <!-- Checkbox -->
                <div class="pt-1">
                  <div
                    class="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors"
                    :class="isSelected(order.id) 
                      ? 'bg-primary border-primary text-primary-content' 
                      : 'border-base-content/30'"
                  >
                    <IconCheck v-if="isSelected(order.id)" class="w-4 h-4" />
                  </div>
                </div>

                <!-- Order Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-bold">
                      #{{ order.orderNumber || order.id?.slice(-6) }}
                    </span>
                    <span :class="['badge badge-sm', getStatusClass(order.status)]">
                      {{ order.status }}
                    </span>
                    <span v-if="order.table" class="badge badge-outline badge-sm">
                      Table {{ order.table.tableNumber || order.tableNumber }}
                    </span>
                  </div>

                  <div class="text-sm text-base-content/60 mb-2">
                    {{ formatDate(order.createdAt) }}
                    <span v-if="order.customerName || order.customer?.name" class="ml-2">
                      • {{ order.customerName || order.customer?.name }}
                    </span>
                  </div>

                  <!-- Items Preview -->
                  <div class="text-sm">
                    <span class="text-base-content/60">{{ order.items?.length || 0 }} items:</span>
                    <span class="ml-1">
                      {{ order.items?.slice(0, 3).map(i => i.product?.name || i.name).join(', ') }}
                      <span v-if="order.items?.length > 3" class="text-base-content/60">
                        +{{ order.items.length - 3 }} more
                      </span>
                    </span>
                  </div>
                </div>

                <!-- Amount -->
                <div class="text-right">
                  <div class="text-lg font-bold">
                    {{ formatCurrency(order.totalAmount) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="text-center py-8 text-base-content/60">
          <IconReceipt class="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No orders available to merge</p>
          <p class="text-sm mt-1">Only pending, confirmed, or preparing orders can be merged</p>
        </div>
      </div>

      <!-- Merge Preview -->
      <div v-if="selectedOrderIds.length > 0" class="card bg-success/10 border border-success/30 mb-4">
        <div class="card-body py-4">
          <h4 class="font-semibold text-success mb-2">Merge Preview</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-base-content/60">Orders</span>
              <div class="font-bold">{{ selectedOrderIds.length + (currentOrderId ? 1 : 0) }}</div>
            </div>
            <div>
              <span class="text-base-content/60">Total Items</span>
              <div class="font-bold">{{ mergedTotal.itemCount }}</div>
            </div>
            <div>
              <span class="text-base-content/60">Subtotal</span>
              <div class="font-bold">{{ formatCurrency(mergedTotal.subtotal) }}</div>
            </div>
            <div>
              <span class="text-base-content/60">Grand Total</span>
              <div class="font-bold text-lg text-success">{{ formatCurrency(mergedTotal.total) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Warning -->
      <div v-if="selectedOrderIds.length > 0" class="alert alert-warning mb-4">
        <IconAlertTriangle class="w-5 h-5" />
        <span class="text-sm">
          Merging bills will combine all items into a single order. Original orders will be marked as merged.
        </span>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          @click="closeModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary gap-2"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <template v-else>
            <IconGitMerge class="w-4 h-4" />
            Merge {{ selectedOrderIds.length + (currentOrderId ? 1 : 0) }} Orders
          </template>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
