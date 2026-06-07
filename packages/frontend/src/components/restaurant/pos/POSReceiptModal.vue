<script setup>
import { computed, ref, watch } from 'vue'
import { IconX, IconNote } from '@tabler/icons-vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'print'])

const authStore = useAuthStore()
const tenant = computed(() => authStore.user?.tenant || {})
const restaurantName = computed(() => tenant.value.name || 'Restaurant')
const restaurantAddress = computed(() => tenant.value.address || '')
const restaurantPhone = computed(() => tenant.value.phone || '')

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// Local state to hold order data even if prop is cleared
const localOrder = ref(null)

// Update local order when prop changes, but only if new value is truthy
watch(() => props.order, (newVal) => {
  if (newVal) {
    const orderData = newVal.data ? newVal.data : newVal
    if (orderData) {
      localOrder.value = orderData
    }
  }
}, { immediate: true })

const displayOrder = computed(() => {
  return localOrder.value
})
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box max-w-md">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Order Receipt</h3>
        <button class="btn btn-ghost btn-sm btn-circle" @click="$emit('close')">
          <IconX class="w-5 h-5" />
        </button>
      </div>

      <div v-if="displayOrder" id="receipt-content" class="space-y-4">
        <!-- Header -->
        <div class="text-center border-b pb-4">
          <h2 class="text-xl font-bold">{{ restaurantName }}</h2>
          <p v-if="restaurantAddress" class="text-sm text-base-content/60">{{ restaurantAddress }}</p>
          <p v-if="restaurantPhone" class="text-sm text-base-content/60">Phone: {{ restaurantPhone }}</p>
        </div>

        <!-- Order Info -->
        <div class="text-sm space-y-1">
          <div class="flex justify-between">
            <span class="font-semibold">Order #:</span>
            <span>{{ displayOrder.transactionNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-semibold">Date:</span>
            <span>{{ formatDate(displayOrder.transactionDate || displayOrder.createdAt) }}</span>
          </div>
          <div v-if="displayOrder.table" class="flex justify-between">
            <span class="font-semibold">Table:</span>
            <span>{{ displayOrder.table.tableNumber }} - {{ displayOrder.table.tableName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-semibold">Type:</span>
            <span class="capitalize">{{ displayOrder.orderType }}</span>
          </div>
          <div v-if="displayOrder.customerName" class="flex justify-between">
            <span class="font-semibold">Customer:</span>
            <span>{{ displayOrder.customerName }}</span>
          </div>
        </div>

        <!-- Items -->
        <div class="border-t pt-4">
          <h4 class="font-semibold mb-3">Order Items</h4>
          <div class="space-y-3">
            <div 
              v-for="(item, index) in displayOrder.items" 
              :key="item.id || index"
              class="text-sm pb-2 border-b border-dashed last:border-0"
            >
              <div class="flex justify-between items-start mb-1">
                <div class="flex-1">
                  <div class="font-medium">
                    {{ item.quantity }}x {{ item.itemName || item.productName || item.product?.name }}
                  </div>
                  
                  <!-- Show extras/additional items if available -->
                  <!-- Try different field names: extras, orderExtras, customizations, orderItemExtras -->
                  <div v-if="(item.extras || item.orderExtras || item.customizations || item.orderItemExtras)?.length > 0" class="ml-4 mt-1 space-y-0.5">
                    <div 
                      v-for="extra in (item.extras || item.orderExtras || item.customizations || item.orderItemExtras)" 
                      :key="extra.id || extra.extraId"
                      class="text-xs text-base-content/70"
                    >
                      <span>• {{ extra.name || extra.extraName }}</span>
                      <span v-if="(extra.quantity || 1) > 1"> (x{{ extra.quantity }})</span>
                      <span v-if="(extra.price || extra.extraPrice || 0) > 0" class="text-primary">
                        +{{ formatCurrency(parseFloat(extra.price || extra.extraPrice || 0) * (extra.quantity || 1)) }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="text-xs text-base-content/60">
                    @ {{ formatCurrency(parseFloat(item.price || item.unitPrice || 0)) }}
                  </div>
                </div>
                <div class="font-semibold">
                  {{ formatCurrency(parseFloat(item.total || item.subtotal || (item.quantity * (item.price || item.unitPrice || 0)))) }}
                </div>
              </div>
              <div v-if="item.notes" class="text-xs text-base-content/60 ml-4 italic flex items-center gap-1">
                <IconNote class="w-3 h-3" />
                <span>{{ item.notes }}</span>
              </div>
            </div>
          </div>
          
          <!-- Empty state -->
          <div v-if="!displayOrder.items || displayOrder.items.length === 0" class="text-center text-base-content/60 py-4">
            No items in this order
          </div>
        </div>

        <!-- Totals -->
        <div class="border-t pt-4 space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>{{ formatCurrency(parseFloat(displayOrder.subtotal || 0)) }}</span>
          </div>
          <div v-if="displayOrder.voucherDiscount && parseFloat(displayOrder.voucherDiscount) > 0" class="flex justify-between text-success">
            <span>Discount:</span>
            <span>-{{ formatCurrency(parseFloat(displayOrder.voucherDiscount)) }}</span>
          </div>
          <div v-if="displayOrder.serviceCharge && parseFloat(displayOrder.serviceCharge) > 0" class="flex justify-between">
            <span>Service Charge:</span>
            <span>{{ formatCurrency(parseFloat(displayOrder.serviceCharge || 0)) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax:</span>
            <span>{{ formatCurrency(parseFloat(displayOrder.tax || 0)) }}</span>
          </div>
          <template v-if="displayOrder.roundingAmount && parseFloat(displayOrder.roundingAmount) !== 0">
            <div class="divider my-1"></div>
            <div class="flex justify-between text-base-content/60">
              <span>Sebelum Pembulatan:</span>
              <span>{{ formatCurrency(parseFloat(displayOrder.totalAmount || 0) - parseFloat(displayOrder.roundingAmount || 0)) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Pembulatan:</span>
              <span :class="parseFloat(displayOrder.roundingAmount) >= 0 ? 'text-success' : 'text-error'">
                {{ parseFloat(displayOrder.roundingAmount) >= 0 ? '+' : '' }}{{ formatCurrency(parseFloat(displayOrder.roundingAmount)) }}
              </span>
            </div>
          </template>
          <div class="divider my-2"></div>
          <div class="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{{ formatCurrency(parseFloat(displayOrder.totalAmount || 0)) }}</span>
          </div>
        </div>

        <!-- Payment Info -->
        <div v-if="displayOrder.payments && displayOrder.payments.length > 0" class="border-t pt-4 text-sm">
          <h4 class="font-semibold mb-2">Payment</h4>
          <div v-for="payment in displayOrder.payments" :key="payment.id" class="space-y-1">
            <div class="flex justify-between">
              <span>Method:</span>
              <span class="capitalize">{{ payment.paymentMethod }}</span>
            </div>
            <div class="flex justify-between">
              <span>Paid:</span>
              <span>{{ formatCurrency(parseFloat(payment.amount)) }}</span>
            </div>
            <div v-if="payment.paymentMethod === 'cash'" class="flex justify-between">
              <span>Change:</span>
              <span>{{ formatCurrency(Math.max(0, parseFloat(payment.amount) - parseFloat(displayOrder.totalAmount || 0))) }}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center border-t pt-4 text-sm text-base-content/60">
          <p>Thank you for your order!</p>
          <p class="mt-1">Please come again</p>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="$emit('close')">
          Close
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
    </dialog>
  </teleport>
</template>

<style scoped>
@media print {
  .modal-box {
    box-shadow: none;
    max-width: 80mm;
    padding: 10mm;
  }
  .modal-action {
    display: none;
  }
}
</style>
