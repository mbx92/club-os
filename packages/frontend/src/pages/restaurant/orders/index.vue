<route lang="yaml">
meta:
  title: Orders
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotification } from '@/composables/core/useNotification'
import OrderStatusBadge from '@/components/restaurant/orders/OrderStatusBadge.vue'
import OrderCard from '@/components/restaurant/orders/OrderCard.vue'
import CompleteOrderModal from '@/components/restaurant/orders/CompleteOrderModal.vue'
import RestaurantProcessingModal from '@/components/restaurant/shared/RestaurantProcessingModal.vue'
import { IconTicket, IconAlertTriangle, IconList, IconGridDots, IconEye, IconCheck, IconLayoutDashboard, IconShoppingCart } from '@tabler/icons-vue'
import { useVouchers } from '@/composables/gym/voucher-management'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'

const router = useRouter()
const { showError, showSuccess } = useNotification()

const { 
  orders, 
  loading, 
  currentPage, 
  totalPages,
  totalItems,
  fetchOrders,
  updateOrderStatus,
  completeOrder
} = useRestaurantOrders()

const {
  tables,
  fetchTables
} = useRestaurantTables()

// Filters
const statusFilter = ref('')
const dateFilter = ref('today')
const tableFilter = ref('')

// Custom date range
const customStartDate = ref('')
const customEndDate = ref('')

const filterParams = computed(() => {
  const params = {
    limit: 20
  }

  if (statusFilter.value) {
    params.status = statusFilter.value
  }

  if (tableFilter.value) {
    params.tableId = tableFilter.value
  }

  if (dateFilter.value && dateFilter.value !== 'custom') {
    params.date = dateFilter.value
  } else if (dateFilter.value === 'custom' && customStartDate.value && customEndDate.value) {
    params.startDate = customStartDate.value
    params.endDate = customEndDate.value
  }

  return params
})

const viewMode = ref('grid')

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
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

const loadOrders = async (page = currentPage.value) => {
  await fetchOrders({ ...filterParams.value, page })
}

const handleViewDetail = (orderId) => {
  if (!orderId) {
    showError('Invalid order selected')
    return
  }
  router.push(`/restaurant/orders/${orderId}`)
}

const handleUpdateStatus = async (order, status) => {
  await updateOrderStatus(order.id, { status })
  loadOrders()
}

const showCompleteModal = ref(false)
const selectedOrder = ref(null)
const loadingComplete = ref(false)
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

const confirmDialog = ref(null)
// Voucher modal state (page-level)
const voucherModal = ref(null)
const voucherSearch = ref('')
const voucherError = ref(null)
const errorVoucherId = ref(null)
const selectedVoucher = ref(null)
const { vouchers: availableVouchers, loading: vouchersLoading, fetchVouchers, validateVoucher } = useVouchers()

const handleComplete = async (orderOrId) => {
  // Accept either an order object or an id
  let orderObj = null
  if (!orderOrId) return
  if (typeof orderOrId === 'string') {
    orderObj = orders.value.find(o => o.id === orderOrId)
  } else {
    orderObj = orderOrId
  }

  if (!orderObj) {
    showError('Order not found')
    return
  }

  selectedOrder.value = orderObj
  showCompleteModal.value = true
}

// For takeaway orders: mark as served (no payment flow)
const handleConfirmServed = async (orderOrId) => {
  let orderObj = null
  if (!orderOrId) return
  if (typeof orderOrId === 'string') {
    orderObj = orders.value.find(o => o.id === orderOrId)
  } else {
    orderObj = orderOrId
  }

  if (!orderObj) {
    showError('Order not found')
    return
  }

  try {
    // Confirm with user before completing takeaway order (use shared dialog)
    const confirmed = await confirmDialog.value?.open({
      title: 'Complete Takeaway Order',
      message: `Complete order ${orderObj.transactionNumber || ''} as takeaway? This will mark it completed.`,
      confirmText: 'Complete',
      cancelText: 'Cancel',
      confirmButtonClass: 'btn-primary'
    })
    if (!confirmed) return

    // For takeaway orders complete directly without payment payload
    await completeOrder(orderObj.id)
    showSuccess('Order completed')
    await loadOrders()
  } catch (err) {
    console.error('Complete takeaway error:', err)
    showError(err?.message || 'Failed to complete order')
  }
}

const openVoucherModal = async () => {
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
  await fetchVouchers({ status: 'active', limit: 100 })
  voucherModal.value?.showModal()
}

const closeVoucherModal = () => {
  voucherModal.value?.close()
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
}

const selectVoucher = async (voucher) => {
  voucherError.value = null
  errorVoucherId.value = null
  try {
    const validationData = {
      amount: selectedOrder.value ? (selectedOrder.value.totalAmount || 0) : 0,
      applicableTo: 'all',
      itemIds: (selectedOrder.value?.items || []).map(i => i.productId)
    }
    const response = await validateVoucher(voucher.code, validationData)
    if (response?.data?.validation?.isValid) {
      selectedVoucher.value = voucher
      closeVoucherModal()
    } else {
      voucherError.value = response?.data?.validation?.reason || 'This voucher cannot be applied'
      errorVoucherId.value = voucher.id
    }
  } catch (err) {
    voucherError.value = err.message || 'Failed to validate voucher'
    errorVoucherId.value = voucher.id
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleCompleteSubmit = async (payload) => {
  if (!selectedOrder.value?.id) return
  processingError.value = null
  showCompleteModal.value = false

  const steps = ['Sedang memproses pembayaran...']
  if (payload.voucherCode) steps.push('Sedang menambahkan voucher diskon...')
  steps.push('Sedang menyelesaikan pesanan...')
  startProcessingSteps(steps)
  showProcessingModal.value = true

  try {
    await completeOrder(selectedOrder.value.id, payload)
    showSuccess('Order completed')
    stopProcessingSteps()
    showProcessingModal.value = false
    selectedOrder.value = null
    // Refresh list
    await loadOrders()
  } catch (err) {
    console.error('Complete order error:', err)
    stopProcessingSteps()
    processingError.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

// Visible page numbers with ellipsis
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

const handlePageChange = (page) => {
  currentPage.value = page
  loadOrders()
}

// Handlers for voucher events from modal/child components
const onVoucherApplied = (v) => {
  selectedVoucher.value = v
}

const onVoucherCleared = () => {
  selectedVoucher.value = null
}

watch(filterParams, () => {
  currentPage.value = 1
  loadOrders(1)
}, { deep: true })

onMounted(async () => {
  await Promise.all([
    loadOrders(),
    fetchTables()
  ])
})
</script>

<template>
  <div class="container px-4 py-6 mx-auto">
    <!-- Header -->
      <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Orders</h1>
        <p class="mt-1 text-base-content/60">Manage restaurant orders</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/restaurant/pos/floor-plan-pos" class="btn btn-sm btn-primary">
          <IconShoppingCart class="w-5 h-5" />
          New Order (POS)
        </router-link>
        <button
          type="button"
          class="btn btn-sm"
          :title="viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'"
          @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
        >
          <IconList v-if="viewMode === 'grid'" class="w-5 h-5" />
          <IconGridDots v-else class="w-5 h-5" />
        </button>
        <router-link to="/restaurant" class="btn btn-sm btn-ghost">
          <IconLayoutDashboard class="w-5 h-5" />
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 shadow-sm card bg-base-100">
      <div class="card-body">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="font-semibold label-text">Status</span>
            </label>
            <select v-model="statusFilter" class="w-full select select-bordered">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Table Filter -->
          <div class="form-control">
            <label class="label">
              <span class="font-semibold label-text">Table</span>
            </label>
            <select v-model="tableFilter" class="w-full select select-bordered">
              <option value="">All Tables</option>
              <option v-for="table in tables" :key="table.id" :value="table.id">
                {{ table.tableNumber }}{{ table.name && table.name !== table.tableNumber ? ' - ' + table.name : '' }}
              </option>
            </select>
          </div>

          <!-- Date Filter -->
          <div class="form-control">
            <label class="label">
              <span class="font-semibold label-text">Date</span>
            </label>
            <select v-model="dateFilter" class="w-full select select-bordered">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">&nbsp;</span>
            </label>
            <button 
              class="w-full btn btn-outline md:w-auto md:mt-5"
              @click="statusFilter = ''; tableFilter = ''; dateFilter = 'today'"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Custom Date Range -->
        <div v-if="dateFilter === 'custom'" class="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
          <div class="form-control">
            <label class="label">
              <span class="font-semibold label-text">Start Date</span>
            </label>
            <input type="date" v-model="customStartDate" class="w-full input input-bordered" />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="font-semibold label-text">End Date</span>
            </label>
            <input type="date" v-model="customEndDate" class="w-full input input-bordered" />
          </div>
        </div>
      </div>
    </div>

    <!-- Orders List -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="orders.length === 0" class="py-12 text-center">
      <div class="text-lg text-base-content/60">No orders found</div>
      <router-link to="/restaurant/pos/floor-plan-pos" class="mt-4 btn btn-primary">
        Create First Order
      </router-link>
    </div>

    <div v-else>
      <!-- Orders Grid or List -->
      <div v-if="viewMode === 'grid'">
        <div class="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-3">
          <OrderCard
            v-for="order in orders"
            :key="order.id"
            :order="order"
            @view-detail="handleViewDetail"
            @update-status="(status) => handleUpdateStatus(order, status)"
            @complete="handleComplete"
            @confirm-served="handleConfirmServed"
          />
        </div>
      </div>
      <div v-else>
        <div class="mb-6 overflow-x-auto">
          <table class="table w-full table-zebra">
            <thead>
              <tr>
                <th>Txn</th>
                <th>When</th>
                <th>Type</th>
                <th>Table</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id" class="hover">
                <td class="font-semibold">{{ order.transactionNumber }}</td>
                <td class="text-sm text-base-content/60">{{ formatTimeAgo(order.createdAt) }}</td>
                <td class="text-sm text-base-content/70">{{ order.orderType === 'takeaway' ? 'Takeaway' : order.orderType === 'dine-in' ? 'Dine In' : (order.orderType || '-') }}</td>
                <td>{{ order.table ? order.table.tableNumber : '-' }}</td>
                <td>{{ order.customerName || '-' }}</td>
                <td>{{ order.items?.length || 0 }}</td>
                <td class="font-semibold">{{ formatCurrency(order.totalAmount) }}</td>
                <td><OrderStatusBadge :status="order.status" /></td>
                <td>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-xs btn-ghost"
                      @click="handleViewDetail(order.id)"
                      :title="'View'
                      "
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                      class="btn btn-xs btn-primary"
                      @click="order.orderType === 'takeaway' ? handleConfirmServed(order.id) : handleComplete(order.id)"
                      :title="'Complete'"
                    >
                      <IconCheck class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex flex-col items-center gap-2">
        <div class="text-xs text-base-content/50">
          Total {{ totalItems }} order
        </div>
        <div class="join">
          <button
            class="join-item btn btn-sm"
            :disabled="currentPage === 1"
            @click="handlePageChange(1)"
          >«</button>
          <button
            class="join-item btn btn-sm"
            :disabled="currentPage === 1"
            @click="handlePageChange(currentPage - 1)"
          >‹</button>
          <template v-for="p in visiblePages" :key="p">
            <button
              v-if="p === '...'"
              class="join-item btn btn-sm btn-disabled"
            >…</button>
            <button
              v-else
              class="join-item btn btn-sm"
              :class="{ 'btn-primary': p === currentPage }"
              @click="handlePageChange(p)"
            >{{ p }}</button>
          </template>
          <button
            class="join-item btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="handlePageChange(currentPage + 1)"
          >›</button>
          <button
            class="join-item btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="handlePageChange(totalPages)"
          >»</button>
        </div>
      </div>
    </div>
    <!-- Complete Order Modal -->
    <CompleteOrderModal
      :show="showCompleteModal"
      :order="selectedOrder"
      :initial-voucher="selectedVoucher"
      :loading="loadingComplete"
      @close="() => { showCompleteModal = false; selectedOrder = null }"
      @submit="handleCompleteSubmit"
      @open-voucher-modal="openVoucherModal"
      @voucher-applied="onVoucherApplied"
      @voucher-cleared="onVoucherCleared"
    />

    <!-- Processing Modal -->
    <RestaurantProcessingModal
      :show="showProcessingModal"
      :steps="processingSteps"
      :current-step="processingCurrentStep"
      :error="processingError"
      @close-error="stopProcessingSteps(); showProcessingModal = false; processingError = null; showCompleteModal = true"
    />

    <!-- Voucher Selection Modal (page-level) -->
    <Teleport to="body">
    <dialog ref="voucherModal" class="modal">
      <div class="w-11/12 max-w-3xl modal-box">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Select Voucher</h3>
          <button type="button" @click="closeVoucherModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="mb-4 form-control">
          <input
            type="text"
            placeholder="Search voucher by code or name..."
            class="w-full input input-bordered"
            v-model="voucherSearch"
            @input="fetchVouchers({ search: voucherSearch, status: 'active', limit: 20 })"
            autocomplete="off"
          />
        </div>

        <div class="overflow-y-auto max-h-96">
          <div v-if="vouchersLoading" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!availableVouchers || availableVouchers.length === 0" class="py-12 text-center text-base-content/60">
            No vouchers found
          </div>
          <div v-else class="space-y-2">
            <div v-for="voucher in availableVouchers" :key="voucher.id">
              <div @click="selectVoucher(voucher)" class="transition-all border-2 cursor-pointer card bg-base-100" :class="errorVoucherId === voucher.id ? 'border-error' : 'border-base-300 hover:border-primary hover:bg-base-200'">
                <div class="p-4 card-body">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold">{{ voucher.code }}</div>
                        <div class="badge badge-sm" :class="voucher.isActive ? 'badge-success' : 'badge-error'">{{ voucher.isActive ? 'Active' : 'Inactive' }}</div>
                      </div>
                      <div class="mt-1 text-sm text-base-content/60">{{ voucher.name }}</div>
                      <div class="mt-2 text-xs font-semibold text-success">
                        <span v-if="voucher.type === 'percentage' || voucher.discountType === 'percentage'">
                          {{ voucher.value || voucher.discountValue }}% OFF
                          <span v-if="voucher.maxDiscountAmount" class="text-base-content/60">(max {{ formatCurrency(voucher.maxDiscountAmount) }})</span>
                        </span>
                        <span v-else>
                          {{ formatCurrency(voucher.value || voucher.discountValue) }} OFF
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-base-content/50">
                        <span v-if="voucher.minPurchaseAmount && parseFloat(voucher.minPurchaseAmount) > 0">Min. purchase: {{ formatCurrency(parseFloat(voucher.minPurchaseAmount)) }} • </span>
                        <span v-if="voucher.applicableTo">{{ voucher.applicableTo === 'all' ? 'All items' : voucher.applicableTo === 'membership' ? 'Membership only' : 'Products only' }}</span>
                      </div>
                    </div>
                    <IconTicket class="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div v-if="errorVoucherId === voucher.id && voucherError" class="mt-2 alert alert-error">
                <IconAlertTriangle class="w-5 h-5" />
                <span class="text-sm">{{ voucherError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeVoucherModal" class="btn">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeVoucherModal">close</button>
      </form>
    </dialog>
    </Teleport>

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
