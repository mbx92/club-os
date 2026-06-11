<route lang="yaml">
meta:
  title: Orders
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNotification } from '@/composables/core/useNotification'
import { useRouter, useRoute } from 'vue-router'
import OrderStatusBadge from '@/components/restaurant/orders/OrderStatusBadge.vue'
import { IconReceipt, IconPlus, IconEdit, IconCheck, IconPrinter, IconArrowLeft, IconCut, IconGitMerge, IconCashRegister, IconRotateClockwise } from '@tabler/icons-vue'
import OrderItemsList from '@/components/restaurant/orders/OrderItemsList.vue'
import OrderStatusUpdateModal from '@/components/restaurant/orders/OrderStatusUpdateModal.vue'
import AddItemModal from '@/components/restaurant/orders/AddItemModal.vue'
import CompleteOrderModal from '@/components/restaurant/orders/CompleteOrderModal.vue'
import RestaurantProcessingModal from '@/components/restaurant/shared/RestaurantProcessingModal.vue'
import SplitBillModal from '@/components/restaurant/orders/SplitBillModal.vue'
import MergeBillModal from '@/components/restaurant/orders/MergeBillModal.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import AdminVerifyModal from '@/components/shared/AdminVerifyModal.vue'
import PrintButton from '@/components/restaurant/orders/PrintButton.vue'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const { showSuccess, showError } = useNotification()
const authStore = useAuthStore()

const {
  order: currentOrder,
  loading,
  getOrderById,
  updateOrderStatus,
  addItemToOrder,
  completeOrder,
  splitBillEqual,
  splitBillByItems,
  splitBill,
  mergeBills,
  printOrderReceipt,
  openCashDrawer,
  fetchOrders
} = useRestaurantOrders()

const {
  products,
  fetchProducts
} = useRestaurantProducts()

const orderId = computed(() => route.params.id)

// Modals
const showStatusModal = ref(false)
const showAddItemModal = ref(false)
const showCompleteModal = ref(false)
const showSplitBillModal = ref(false)
const showProcessingModal = ref(false)
const processingError = ref(null)
const processingSteps = ref([])
const processingCurrentStep = ref(0)
const stepTimer = ref(null)

const startProcessingSteps = (steps) => {
  processingSteps.value = steps
  processingCurrentStep.value = 0
  stepTimer.value = setInterval(() => {
    if (processingCurrentStep.value < steps.length - 1) {
      processingCurrentStep.value++
    }
  }, 900)
}

const stopProcessingSteps = () => {
  if (stepTimer.value) {
    clearInterval(stepTimer.value)
    stepTimer.value = null
  }
}

const showMergeBillModal = ref(false)
const confirmDialog = ref(null)
const adminVerifyModal = ref(null)

const ADMIN_ROLES = ['admin', 'Admin', 'ADMIN', 'manager', 'Manager', 'MANAGER', 'superadmin']
const isCurrentUserAdmin = () => ADMIN_ROLES.includes(authStore.user?.role || '')

// Orders for merge (need to fetch)
const allOrders = ref([])

const canAddItems = computed(() => {
  return currentOrder.value && 
    !['completed', 'cancelled'].includes(currentOrder.value.status)
})

const canComplete = computed(() => {
  return currentOrder.value && 
    !['completed', 'cancelled'].includes(currentOrder.value.status)
})

const canSplitOrMerge = computed(() => {
  return currentOrder.value && 
    !['completed', 'cancelled', 'ready'].includes(currentOrder.value.status)
})

const canReopen = computed(() => {
  return currentOrder.value?.status === 'completed'
})

const loadOrder = async () => {
  await getOrderById(orderId.value)
}

const handleUpdateStatus = async (data) => {
  await updateOrderStatus(orderId.value, data)
  showStatusModal.value = false
  loadOrder()
}

const handleAddItem = async (itemData) => {
  try {
    const response = await addItemToOrder(orderId.value, {
      items: [itemData],
      printToKitchen: true
    })
    showAddItemModal.value = false
    loadOrder()

    // Show kitchen/bar print feedback
    const print = response?.print
    if (print?.kitchenTicket?.success || print?.barTicket?.success) {
      const parts = []
      if (print.kitchenTicket?.success) parts.push('kitchen')
      if (print.barTicket?.success) parts.push('bar')
      showSuccess(`Item ditambahkan & dicetak ke ${parts.join(' + ')}`)
    } else if (print?.kitchenTicket?.skipped || print?.barTicket?.skipped) {
      showSuccess('Item ditambahkan (printer belum dikonfigurasi)')
    } else {
      showSuccess(response?.message || 'Item berhasil ditambahkan')
    }
  } catch (err) {
    showError(err.message || 'Gagal menambahkan item')
  }
}

const handleComplete = async (paymentData) => {
  processingError.value = null
  showCompleteModal.value = false

  const steps = ['Sedang memproses pembayaran...']
  if (paymentData?.voucherCode) steps.push('Sedang menambahkan voucher diskon...')
  steps.push('Sedang menyelesaikan pesanan...')
  startProcessingSteps(steps)
  showProcessingModal.value = true

  try {
    await completeOrder(orderId.value, paymentData)
    stopProcessingSteps()
    showProcessingModal.value = false
    loadOrder()
  } catch (err) {
    console.error('Complete order error:', err)
    stopProcessingSteps()
    processingError.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

// Handler for Complete button: for takeaway confirm & complete directly, otherwise open modal
const onCompleteClick = async () => {
  if (!currentOrder.value) return

  const isTakeaway = currentOrder.value.orderType === 'takeaway'
  if (isTakeaway) {
    const confirmed = await confirmDialog.value?.open({
      title: 'Complete Takeaway Order',
      message: `Complete order ${currentOrder.value.transactionNumber || ''} as takeaway? This will mark it completed`,
      confirmText: 'Complete',
      cancelText: 'Cancel',
      confirmButtonClass: 'btn-primary'
    })
    if (!confirmed) return

    try {
      await completeOrder(orderId.value)
      showSuccess('Order completed')
      await loadOrder()
    } catch (err) {
      console.error('Complete takeaway error:', err)
      showError(err?.message || 'Failed to complete order')
    }
    return
  }

  // Non-takeaway: open modal for payment
  showCompleteModal.value = true
}

const handleSplitBill = async (splitData) => {
  try {
    if (splitData.type === 'equal') {
      await splitBillEqual(orderId.value, splitData.splits)
    } else {
      // Use new endpoint: POST /transactions/:id/split-bill
      await splitBill(orderId.value, splitData.splits)
    }
    showSplitBillModal.value = false
    // Redirect to orders list after split
    router.push('/restaurant/orders')
  } catch (err) {
    console.error('Split bill error:', err)
  }
}

const handleMergeBills = async (orderIds) => {
  try {
    await mergeBills(orderIds)
    showMergeBillModal.value = false
    // Redirect to orders list after merge
    router.push('/restaurant/orders')
  } catch (err) {
    console.error('Merge bills error:', err)
  }
}

const handlePrint = async (type = 'receipt') => {
  await printOrderReceipt(orderId.value, type)
}

const handleReopen = async () => {
  // Non-admin roles require admin verification
  if (!isCurrentUserAdmin()) {
    const verified = await adminVerifyModal.value?.open()
    if (!verified) return
  } else {
    const confirmed = await confirmDialog.value?.open({
      title: 'Reopen Order',
      message: `Reopen order ${currentOrder.value?.transactionNumber || ''}? Status will change back to Preparing.`,
      confirmText: 'Reopen',
      cancelText: 'Cancel',
      confirmButtonClass: 'btn-warning'
    })
    if (!confirmed) return
  }

  try {
    await updateOrderStatus(orderId.value, { status: 'preparing' })
    showSuccess('Order reopened — status set to Preparing')
    await loadOrder()
  } catch (err) {
    console.error('Reopen order error:', err)
    showError(err?.message || 'Failed to reopen order')
  }
}

const handleOpenCashDrawer = async () => {
  await openCashDrawer()
}

const loadOrdersForMerge = async () => {
  try {
    const response = await fetchOrders({ 
      status: 'pending,confirmed,preparing', 
      limit: 50 
    })
    allOrders.value = response?.data || []
  } catch (err) {
    console.error('Failed to load orders for merge:', err)
  }
}

const openMergeBillModal = async () => {
  await loadOrdersForMerge()
  showMergeBillModal.value = true
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

onMounted(async () => {
  await Promise.all([
    loadOrder(),
    fetchProducts({ isActive: true, limit: 200 })
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Loading State -->
    <div v-if="loading && !currentOrder" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Order Not Found -->
    <div v-else-if="!currentOrder" class="text-center py-12">
      <div class="text-base-content/60 text-lg mb-4">Order not found</div>
      <router-link to="/restaurant/orders" class="btn btn-primary">
        Back to Orders
      </router-link>
    </div>

    <!-- Order Detail -->
    <div v-else>
      <!-- Header -->
      <div class="flex justify-between items-start mb-6 no-print">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <IconReceipt class="w-6 h-6 text-info" />
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-3xl font-bold">{{ currentOrder.transactionNumber }}</h1>
                <OrderStatusBadge :status="currentOrder.status" />
              </div>
              <div class="text-sm text-base-content/60">
                <span>{{ formatDate(currentOrder.createdAt) }}</span>
                <span v-if="currentOrder.table"> · {{ currentOrder.table.tableNumber }} - {{ currentOrder.table.tableName || currentOrder.table.tableNumber }}</span>
                <span v-if="currentOrder.orderType"> · {{ currentOrder.orderType }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            v-if="canReopen"
            class="btn btn-warning btn-sm"
            @click="handleReopen"
          >
            <IconRotateClockwise class="w-4 h-4 mr-2" />
            Reopen Order
          </button>
          <button 
            v-if="canAddItems"
            class="btn btn-outline btn-sm"
            @click="showAddItemModal = true"
          >
            <IconPlus class="w-4 h-4 mr-2" />
            Add Item
          </button>
          <button 
            v-if="canComplete"
            class="btn btn-outline btn-sm"
            @click="showStatusModal = true"
          >
            <IconEdit class="w-4 h-4 mr-2" />
            Update Status
          </button>
                  <button 
                    v-if="canComplete"
                    class="btn btn-primary btn-sm"
                    @click="onCompleteClick"
                  >
                    <IconCheck class="w-4 h-4 mr-2" />
                    Complete Order
                  </button>
          <button 
            v-if="canSplitOrMerge"
            class="btn btn-outline btn-sm"
            @click="showSplitBillModal = true"
          >
            <IconCut class="w-4 h-4 mr-2" />
            Split Bill
          </button>
          <button 
            v-if="canSplitOrMerge"
            class="btn btn-outline btn-sm"
            @click="openMergeBillModal"
          >
            <IconGitMerge class="w-4 h-4 mr-2" />
            Merge Bills
          </button>
          <PrintButton
            :order="currentOrder"
            variant="dropdown"
            size="sm"
            @print="handlePrint"
          />
          <button 
            class="btn btn-ghost btn-sm"
            @click="handleOpenCashDrawer"
            title="Open Cash Drawer"
          >
            <IconCashRegister class="w-5 h-5" />
          </button>
          <router-link to="/restaurant/orders" class="btn btn-ghost btn-sm btn-circle">
            <IconArrowLeft class="w-4 h-4 mr-2" />
            Back
          </router-link>
        </div>
      </div>

      <!-- Print Header (only visible on print) -->
      <div class="hidden print:block text-center mb-6">
        <h1 class="text-2xl font-bold">RESTAURANT RECEIPT</h1>
        <p class="text-sm">{{ currentOrder.transactionNumber }}</p>
        <p class="text-sm">{{ formatDate(currentOrder.createdAt) }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Order Info Card -->
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title">Order Information</h2>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-base-content/60">Table</div>
                  <div class="font-semibold">
                    {{ currentOrder.table?.number }} - {{ currentOrder.table?.name }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Order Type</div>
                  <div class="font-semibold capitalize">{{ currentOrder.orderType }}</div>
                </div>
                <div v-if="currentOrder.customerName">
                  <div class="text-sm text-base-content/60">Customer</div>
                  <div class="font-semibold">{{ currentOrder.customerName }}</div>
                </div>
                <div v-if="currentOrder.customerPhone">
                  <div class="text-sm text-base-content/60">Phone</div>
                  <div class="font-semibold">{{ currentOrder.customerPhone }}</div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Created By</div>
                  <div class="font-semibold">{{ currentOrder.createdBy?.name || currentOrder.createdBy?.email || currentOrder.staff?.name || currentOrder.staffName || currentOrder.user?.name || 'System' }}</div>
                </div>
              </div>
              <div v-if="currentOrder.notes" class="mt-4">
                <div class="text-sm text-base-content/60">Notes</div>
                <div class="mt-1">{{ currentOrder.notes }}</div>
              </div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title">Order Items</h2>
              <OrderItemsList :items="currentOrder.items || []" />
            </div>
          </div>

          <!-- Payments (if completed) -->
          <div v-if="currentOrder.payments?.length > 0" class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title">Payments</h2>
              <div class="space-y-2">
                <div 
                  v-for="payment in currentOrder.payments" 
                  :key="payment.id"
                  class="flex justify-between items-center p-3 bg-base-200 rounded-lg"
                >
                  <div>
                    <div class="font-semibold capitalize">{{ payment.paymentMethod }}</div>
                    <div class="text-sm text-base-content/60">{{ formatDate(payment.createdAt) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold">{{ formatCurrency(payment.amount) }}</div>
                    <div v-if="payment.changeAmount > 0" class="text-sm text-success">
                      Change: {{ formatCurrency(payment.changeAmount) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Order Summary -->
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title">Order Summary</h2>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(currentOrder.subtotal || 0) }}</span>
                </div>
                
                <div v-if="currentOrder.voucherDiscount > 0 || currentOrder.discountAmount > 0" class="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{{ formatCurrency(currentOrder.voucherDiscount || currentOrder.discountAmount || 0) }}</span>
                </div>

                <div v-if="currentOrder.serviceCharge > 0" class="flex justify-between">
                  <span>Service Charge</span>
                  <span>{{ formatCurrency(currentOrder.serviceCharge || 0) }}</span>
                </div>
                
                <div class="flex justify-between">
                  <span>Tax</span>
                  <span>{{ formatCurrency(currentOrder.tax || currentOrder.taxAmount || 0) }}</span>
                </div>
                
                <div class="divider my-2"></div>
                <div class="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>{{ formatCurrency(currentOrder.totalAmount || 0) }}</span>
                </div>
                <div v-if="currentOrder.paidAmount" class="flex justify-between text-success">
                  <span>Paid</span>
                  <span>{{ formatCurrency(currentOrder.paidAmount) }}</span>
                </div>
                <div v-if="currentOrder.changeAmount" class="flex justify-between text-info">
                  <span>Change</span>
                  <span>{{ formatCurrency(currentOrder.changeAmount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <OrderStatusUpdateModal
      :show="showStatusModal"
      :current-status="currentOrder?.status"
      :loading="loading"
      @close="showStatusModal = false"
      @submit="handleUpdateStatus"
    />

    <AddItemModal
      :show="showAddItemModal"
      :products="products"
      :loading="loading"
      @close="showAddItemModal = false"
      @submit="handleAddItem"
    />

    <CompleteOrderModal
      :show="showCompleteModal"
      :order="currentOrder"
      :loading="loading"
      @close="showCompleteModal = false"
      @submit="handleComplete"
    />

    <SplitBillModal
      :show="showSplitBillModal"
      :order="currentOrder"
      :loading="loading"
      @close="showSplitBillModal = false"
      @submit="handleSplitBill"
    />

    <MergeBillModal
      :show="showMergeBillModal"
      :orders="allOrders"
      :current-order-id="orderId"
      :loading="loading"
      @close="showMergeBillModal = false"
      @submit="handleMergeBills"
    />
    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
    <AdminVerifyModal ref="adminVerifyModal" />

    <!-- Processing Modal -->
    <RestaurantProcessingModal
      :show="showProcessingModal"
      :steps="processingSteps"
      :current-step="processingCurrentStep"
      :error="processingError"
      @close-error="stopProcessingSteps(); showProcessingModal = false; processingError = null; showCompleteModal = true"
    />
  </div>
</template>

<style scoped>
.hidden.print\:block {
  display: none;
}

@media print {
  /* Show print-only content */
  .hidden.print\:block {
    display: block !important;
  }
  
  /* Hide action buttons and navigation */
  .btn, 
  .no-print,
  [class*="btn-"]:not(.print-show) {
    display: none !important;
  }
  
  /* Show only main content */
  .container {
    max-width: 100% !important;
    padding: 0 !important;
  }
  
  /* Receipt styling */
  .card {
    box-shadow: none !important;
    border: none !important;
    break-inside: avoid;
  }
  
  .grid {
    display: block !important;
  }
  
  .lg\:col-span-2 {
    width: 100% !important;
  }
  
  /* Hide sidebar on print */
  .space-y-6:last-child {
    display: none !important;
  }
  
  /* Page breaks */
  .card-body {
    page-break-inside: avoid;
  }
  
  /* Make text smaller for print */
  body {
    font-size: 12pt;
  }
  
  h1 {
    font-size: 18pt;
  }
  
  h2 {
    font-size: 14pt;
  }
}
</style>
