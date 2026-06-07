<route lang="yaml">
meta:
  title: Transaction Detail
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Transaction Details</h1>
        <p class="text-base-content/60 mt-1">View transaction information</p>
      </div>
      <router-link to="/gym/transactions" class="btn btn-ghost">
        <IconArrowLeft class="w-5 h-5 mr-2" />
        Back to Transactions
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Transaction Content -->
    <div v-else-if="transaction" class="space-y-6">
      <!-- Transaction Header Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold font-mono">{{ transaction.transactionNumber }}</h2>
                <div 
                  class="badge badge-lg"
                  :class="{
                    'badge-success': transaction.status === 'completed',
                    'badge-error': transaction.status === 'refunded'
                  }"
                >
                  {{ transaction.status }}
                </div>
              </div>
              <p class="text-sm text-base-content/60 mt-1">
                {{ formatDate(transaction.transactionDate) }}
              </p>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                v-if="transaction.status !== 'refunded' && refundableItems.length > 0"
                class="btn btn-warning btn-sm"
                @click="openPartialRefundModal"
              >
                <IconRefresh class="w-4 h-4 mr-1" />
                Refund Items
              </button>
              <button
                v-if="transaction.status !== 'refunded'"
                class="btn btn-error btn-sm btn-outline"
                @click="confirmRefund"
              >
                <IconRefresh class="w-4 h-4 mr-1" />
                Full Refund
              </button>
              <button class="btn btn-ghost btn-sm" @click="printTransaction">
                <IconPrinter class="w-4 h-4 mr-1" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <!-- Invoice Header -->
          <div class="flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b border-base-300 gap-6">
            <div class="flex-1">
              <h3 class="text-2xl font-bold">INVOICE</h3>
              <p class="text-xs text-base-content/50 mt-1">Receipt #{{ transaction.transactionNumber }}</p>
            </div>
            
            <!-- Customer Information -->
            <div class="flex-1 bg-base-200 rounded-lg p-4">
              <p class="text-xs font-semibold text-base-content/60 mb-2">BILL TO</p>
              <div class="space-y-1">
                <p class="font-bold text-base">{{ transaction.member?.firstName }} {{ transaction.member?.lastName || 'N/A' }}</p>
                <p class="text-sm text-base-content/70">{{ transaction.member?.email || '' }}</p>
                <p class="text-sm text-base-content/70">{{ transaction.member?.phone || '' }}</p>
                <div v-if="transaction.member" class="mt-2 pt-2 border-t border-base-300">
                  <div class="badge badge-info mt-1">{{ transaction.customerType }}</div>
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <p class="text-sm text-base-content/60">Invoice Date</p>
              <p class="font-semibold">{{ formatDate(transaction.transactionDate, true) }}</p>
              <div 
                class="badge badge-sm mt-2"
                :class="{
                  'badge-success': transaction.status === 'completed',
                  'badge-warning': transaction.status === 'pending' || transaction.status === 'partial_refund' || transaction.status === 'partially_refunded',
                  'badge-error': transaction.status === 'refunded'
                }"
              >
                {{ transaction.status }}
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto mb-6">
            <table class="table">
              <thead>
                <tr>
                  <th class="w-5/12">Description</th>
                  <th class="w-2/12">Service Period</th>
                  <th class="text-center w-1/12">Qty</th>
                  <th class="text-right w-2/12">Unit Price</th>
                  <th class="text-right w-2/12">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in transaction.transactionItems" :key="item.id" class="border-b border-base-200">
                  <td>
                    <div class="font-semibold text-base">{{ item.itemName }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="badge badge-sm badge-ghost">{{ item.itemType }}</span>
                      <span 
                        class="badge badge-sm"
                        :class="{
                          'badge-success': item.serviceStatus === 'active',
                          'badge-warning': item.serviceStatus === 'pending',
                          'badge-error': item.serviceStatus === 'expired',
                          'badge-ghost': item.serviceStatus === 'completed'
                        }"
                      >
                        {{ item.serviceStatus || '-' }}
                      </span>
                    </div>
                    <div v-if="item.totalSessions" class="text-xs text-base-content/60 mt-1">
                      {{ item.totalSessions }} sessions
                      <span v-if="item.remainingSessions !== null"> ({{ item.remainingSessions }} remaining)</span>
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">
                      <div>{{ formatDate(item.startDate, true) }}</div>
                      <div class="text-base-content/60">to</div>
                      <div>{{ formatDate(item.endDate, true) }}</div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="font-medium">{{ item.quantity }}</span>
                  </td>
                  <td class="text-right">
                    <span class="text-sm">{{ formatCurrency(item.unitPrice) }}</span>
                  </td>
                  <td class="text-right">
                    <div class="font-semibold">{{ formatCurrency(item.total) }}</div>
                    <div v-if="parseFloat(item.discount) > 0" class="text-xs text-success">
                      -{{ formatCurrency(item.discount) }} discount
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Calculation Summary -->
          <div class="flex justify-end">
            <div class="w-full md:w-1/2 lg:w-1/3">
              <div class="space-y-2 text-sm">
                <!-- Subtotal -->
                <div class="flex justify-between py-2">
                  <span class="text-base-content/70">Subtotal</span>
                  <span class="font-medium">{{ formatCurrency(transaction.subtotal) }}</span>
                </div>
                
                <!-- Tax -->
                <div v-if="parseFloat(transaction.tax) > 0" class="flex justify-between py-2">
                  <span class="text-base-content/70">Tax</span>
                  <span class="font-medium">{{ formatCurrency(transaction.tax) }}</span>
                </div>
                
                <!-- Voucher Discount -->
                <div v-if="parseFloat(transaction.voucherDiscount) > 0" class="flex justify-between py-2 text-success">
                  <span>Voucher Discount</span>
                  <span class="font-medium">-{{ formatCurrency(transaction.voucherDiscount) }}</span>
                </div>
                
                <!-- Total -->
                <div class="flex justify-between py-3 border-t-2 border-base-300 text-lg font-bold">
                  <span>Total Amount</span>
                  <span class="text-primary">{{ formatCurrency(transaction.totalAmount) }}</span>
                </div>
              </div>

              <!-- Payment Information -->
              <div class="mt-6 pt-4 border-t border-base-200">
                <p class="text-sm font-semibold mb-3">Payment Details</p>
                <div class="space-y-2">
                  <div v-for="payment in transaction.payments" :key="payment.id" 
                       class="flex justify-between items-center text-sm py-2 px-3 bg-base-200 rounded-lg">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="badge badge-sm badge-outline capitalize">{{ payment.paymentMethod }}</span>
                        <span 
                          class="badge badge-sm"
                          :class="{
                            'badge-success': payment.status === 'completed',
                            'badge-warning': payment.status === 'pending',
                            'badge-error': payment.status === 'failed'
                          }"
                        >
                          {{ payment.status }}
                        </span>
                      </div>
                      <p class="text-xs text-base-content/60 mt-1">{{ formatDate(payment.paymentDate) }}</p>
                    </div>
                    <span class="font-semibold">{{ formatCurrency(payment.amount) }}</span>
                  </div>
                </div>
                
                <!-- Total Paid -->
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-base-300">
                  <span class="font-semibold">Total Paid</span>
                  <span class="text-lg font-bold text-success">{{ formatCurrency(calculateTotalPaid()) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="transaction.notes" class="alert mt-6">
            <IconNote class="w-5 h-5" />
            <div>
              <p class="text-sm font-semibold">Notes:</p>
              <p class="text-sm">{{ transaction.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Transaction Not Found</h3>
        <p class="text-base-content/60 mb-4">
          The transaction you're looking for doesn't exist or has been deleted.
        </p>
        <router-link to="/gym/transactions" class="btn btn-primary">
          Back to Transactions
        </router-link>
      </div>
    </div>

    <!-- Full Refund Confirmation Modal -->
    <dialog ref="refundModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Full Refund</h3>
        <p class="py-4">Refund the entire transaction? This will deactivate <span class="font-semibold">all</span> services.</p>
        
        <div class="alert alert-error mb-4">
          <IconAlertTriangle class="w-5 h-5" />
          <span class="text-sm">All associated services will be deactivated and cannot be undone.</span>
        </div>

        <div class="form-control flex-col">
          <label class="label">
            <span class="label-text">Refund Reason/Notes *</span>
          </label>
          <textarea
            class="textarea textarea-bordered w-full resize-none"
            placeholder="Enter reason for refund..."
            rows="3"
            v-model="refundNotes"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeRefundModal">Cancel</button>
          <button 
            class="btn btn-error" 
            @click="handleRefund"
            :disabled="!refundNotes.trim() || refundLoading"
          >
            <span v-if="refundLoading" class="loading loading-spinner loading-sm"></span>
            Confirm Full Refund
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Partial Refund Modal (per item) -->
    <dialog ref="partialRefundModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-1">Refund Selected Items</h3>
        <p class="text-sm text-base-content/60 mb-4">Pilih service yang ingin di-refund. Hanya service yang dipilih yang akan dinonaktifkan.</p>

        <!-- Item Selection -->
        <div class="space-y-2 mb-4 max-h-72 overflow-y-auto">
          <!-- Refundable items -->
          <label
            v-for="item in refundableItems"
            :key="item.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-base-300 cursor-pointer hover:bg-base-200 transition-colors"
            :class="{ 'border-primary bg-primary/5': selectedRefundItems.includes(item.id) }"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-primary checkbox-sm"
              :value="item.id"
              v-model="selectedRefundItems"
            />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm truncate">{{ item.itemName }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="badge badge-xs badge-ghost">{{ item.itemType }}</span>
                <span 
                  class="badge badge-xs"
                  :class="{
                    'badge-success': item.serviceStatus === 'active',
                    'badge-error': item.serviceStatus === 'expired',
                    'badge-ghost': !item.serviceStatus || item.serviceStatus === 'completed'
                  }"
                >
                  {{ item.serviceStatus || '-' }}
                </span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-semibold text-sm">{{ formatCurrency(item.total) }}</div>
              <div v-if="parseFloat(item.discount) > 0" class="text-xs text-success">
                -{{ formatCurrency(item.discount) }}
              </div>
            </div>
          </label>
          <!-- Non-refundable items (sessions already used or already refunded) -->
          <div
            v-for="item in nonRefundableItems"
            :key="item.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-base-200 opacity-50 cursor-not-allowed bg-base-200/40"
          >
            <input type="checkbox" class="checkbox checkbox-sm" disabled />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm truncate">{{ item.itemName }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="badge badge-xs badge-ghost">{{ item.itemType }}</span>
                <span v-if="item.isRefunded || item.serviceStatus === 'refunded'" class="badge badge-xs badge-error">refunded</span>
                <span v-else class="badge badge-xs badge-warning">sessions used</span>
              </div>
            </div>
            <div class="text-right shrink-0 text-xs text-base-content/50">
              <div v-if="item.isRefunded || item.serviceStatus === 'refunded'">Already refunded</div>
              <div v-else>{{ (item.totalSessions ?? 0) - (item.remainingSessions ?? item.totalSessions) }} of {{ item.totalSessions }} used</div>
            </div>
          </div>
        </div>

        <!-- Selected Summary -->
        <div v-if="selectedRefundItems.length > 0" class="alert alert-info mb-4 py-2">
          <span class="text-sm">
            {{ selectedRefundItems.length }} item(s) selected · 
            Refund total: <span class="font-bold">{{ formatCurrency(selectedRefundTotal) }}</span>
          </span>
        </div>

        <div class="form-control flex-col mb-4">
          <label class="label">
            <span class="label-text">Refund Reason/Notes *</span>
          </label>
          <textarea
            class="textarea textarea-bordered w-full resize-none"
            placeholder="Enter reason for refund..."
            rows="2"
            v-model="partialRefundNotes"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="closePartialRefundModal">Cancel</button>
          <button
            class="btn btn-warning"
            @click="handlePartialRefund"
            :disabled="!selectedRefundItems.length || !partialRefundNotes.trim() || partialRefundLoading"
          >
            <span v-if="partialRefundLoading" class="loading loading-spinner loading-sm"></span>
            Refund {{ selectedRefundItems.length }} Item(s)
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactions } from '@/composables/gym/transactions'
import { useCurrency } from '@/composables/core/useCurrency'
import {
  IconArrowLeft,
  IconUser,
  IconReceipt,
  IconPackage,
  IconCash,
  IconRefresh,
  IconPrinter,
  IconNote,
  IconAlertTriangle
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { 
  transaction, 
  loading, 
  getTransactionById, 
  refundTransaction,
  refundTransactionItems
} = useTransactions()
const { formatCurrency } = useCurrency()

// Full refund
const refundModal = ref(null)
const refundNotes = ref('')
const refundLoading = ref(false)

// Partial refund
const partialRefundModal = ref(null)
const partialRefundNotes = ref('')
const partialRefundLoading = ref(false)
const selectedRefundItems = ref([])

// Items eligible for refund:
// - Not already refunded
// - No sessions have been used yet (remainingSessions === totalSessions, or no session tracking)
const refundableItems = computed(() => {
  if (!transaction.value?.transactionItems) return []
  return transaction.value.transactionItems.filter(item => {
    if (item.isRefunded || item.serviceStatus === 'refunded') return false
    // If item tracks sessions, only allow refund if zero sessions consumed
    if (item.totalSessions != null) {
      const used = (item.totalSessions ?? 0) - (item.remainingSessions ?? item.totalSessions)
      return used === 0
    }
    return true
  })
})

const selectedRefundTotal = computed(() => {
  if (!transaction.value?.transactionItems) return 0
  return transaction.value.transactionItems
    .filter(item => selectedRefundItems.value.includes(item.id))
    .reduce((sum, item) => sum + (parseFloat(item.total) - parseFloat(item.discount || 0)), 0)
})

// Items that cannot be refunded (sessions used or already refunded)
const nonRefundableItems = computed(() => {
  if (!transaction.value?.transactionItems) return []
  return transaction.value.transactionItems.filter(item => {
    if (item.isRefunded || item.serviceStatus === 'refunded') return true
    if (item.totalSessions != null) {
      const used = (item.totalSessions ?? 0) - (item.remainingSessions ?? item.totalSessions)
      return used > 0
    }
    return false
  })
})

// Methods
const formatDate = (dateString, dateOnly = false) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  
  if (dateOnly) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const calculateTotalPaid = () => {
  if (!transaction.value || !transaction.value.payments) return 0
  return transaction.value.payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
}

const confirmRefund = () => {
  refundNotes.value = ''
  refundModal.value?.showModal()
}

const closeRefundModal = () => {
  refundModal.value?.close()
  refundNotes.value = ''
}

const openPartialRefundModal = () => {
  partialRefundNotes.value = ''
  selectedRefundItems.value = []
  partialRefundModal.value?.showModal()
}

const closePartialRefundModal = () => {
  partialRefundModal.value?.close()
  partialRefundNotes.value = ''
  selectedRefundItems.value = []
}

const handleRefund = async () => {
  if (!transaction.value || !refundNotes.value.trim()) return
  
  refundLoading.value = true
  try {
    await refundTransaction(transaction.value.id, {
      notes: refundNotes.value
    })
    closeRefundModal()
    await getTransactionById(route.params.id)
  } catch (error) {
    console.error('Error refunding transaction:', error)
  } finally {
    refundLoading.value = false
  }
}

const handlePartialRefund = async () => {
  if (!transaction.value || !selectedRefundItems.value.length || !partialRefundNotes.value.trim()) return

  partialRefundLoading.value = true
  try {
    await refundTransactionItems(transaction.value.id, {
      itemIds: selectedRefundItems.value,
      notes: partialRefundNotes.value
    })
    closePartialRefundModal()
    await getTransactionById(route.params.id)
  } catch (error) {
    console.error('Error partially refunding transaction:', error)
  } finally {
    partialRefundLoading.value = false
  }
}

const printTransaction = () => {
  // TODO: Implement print receipt functionality
  window.print()
}

// Lifecycle
onMounted(async () => {
  const transactionId = route.params.id
  if (transactionId) {
    try {
      await getTransactionById(transactionId)
    } catch (error) {
      console.error('Error loading transaction:', error)
    }
  }
})
</script>

<style scoped>
@media print {
  .btn, .card-actions, nav, header, footer {
    display: none !important;
  }
  
  .card {
    box-shadow: none !important;
    border: 1px solid #e5e7eb;
  }
}
</style>
