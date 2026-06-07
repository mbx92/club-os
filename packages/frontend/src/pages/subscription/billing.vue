<route lang="yaml">
meta:
  title: Billing & Invoices
  layout: default
  requiresRole: super-admin
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Billing & Invoices</h1>
        <p class="text-base-content/60 mt-1">Manage invoices and record payments</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Search</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search invoice number..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Tenant Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tenant</span>
            </label>
            <select v-model="filters.tenantId" class="select select-bordered w-full" @change="handleSearch">
              <option value="">All Tenants</option>
              <option 
                v-for="tenant in tenants" 
                :key="tenant.id" 
                :value="tenant.id"
              >
                {{ tenant.name }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Sort By</span>
            </label>
            <select v-model="filters.sortBy" class="select select-bordered w-full" @change="handleSearch">
              <option value="dueDate">Due Date</option>
              <option value="issueDate">Issue Date</option>
              <option value="amount">Amount</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Invoices Table -->
    <div v-else-if="filteredInvoices.length > 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Tenant</th>
                <th>Subscription</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Total</th>
                <th class="text-center">Issue Date</th>
                <th class="text-center">Due Date</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="invoice in filteredInvoices"
                :key="invoice.id"
                :class="{ 'bg-error/10': isOverdue(invoice) }"
              >
                <!-- Invoice Number -->
                <td>
                  <div class="font-mono font-semibold">{{ invoice.invoiceNumber }}</div>
                </td>

                <!-- Tenant -->
                <td>
                  <div class="font-semibold">{{ getTenantName(invoice.tenantId) }}</div>
                </td>

                <!-- Subscription -->
                <td>
                  <div v-if="invoice.subscription" class="text-sm">
                    <div class="font-semibold">{{ invoice.subscription.plan?.name }}</div>
                    <div class="text-base-content/60">{{ invoice.subscription.plan?.duration }} days</div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Amount -->
                <td class="text-right">{{ formatCurrency(invoice.amount) }}</td>

                <!-- Tax -->
                <td class="text-right">{{ formatCurrency(invoice.tax || 0) }}</td>

                <!-- Total -->
                <td class="text-right">
                  <div class="font-bold text-primary">{{ formatCurrency(invoice.total) }}</div>
                </td>

                <!-- Issue Date -->
                <td class="text-center">
                  <div class="text-sm">{{ formatDate(invoice.issueDate) }}</div>
                </td>

                <!-- Due Date -->
                <td class="text-center">
                  <div class="text-sm" :class="isOverdue(invoice) ? 'text-error font-semibold' : ''">
                    {{ formatDate(invoice.dueDate) }}
                  </div>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div class="badge badge-sm" :class="getInvoiceStatusBadgeClass(invoice.status)">
                    {{ invoice.status }}
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div v-if="isSuperAdmin()" class="flex items-center justify-center gap-1">
                    <!-- Record Payment button for unpaid invoices -->
                    <button
                      v-if="invoice.status !== 'paid' && invoice.status !== 'cancelled'"
                      class="btn btn-xs btn-success tooltip"
                      data-tip="Record Payment"
                      @click="openPaymentModal(invoice)"
                      :disabled="actionLoading"
                    >
                      <IconCash class="w-4 h-4" />
                    </button>
                    <!-- View Details -->
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                      @click="viewInvoiceDetails(invoice)"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Invoices Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search || filters.status ? 'Try adjusting your filters.' : 'Invoices will appear here after subscriptions are created.' }}
        </p>
      </div>
    </div>

    <!-- Record Payment Modal -->
    <RecordPaymentModal
      ref="paymentModal"
      :invoice="selectedInvoice"
      :loading="modalLoading"
      @submit="handlePaymentSubmit"
      @close="handleModalClose"
    />

    <!-- Invoice Details Modal -->
    <dialog ref="detailsModal" class="modal">
      <div class="modal-box max-w-3xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>

        <h3 class="font-bold text-lg mb-4">Invoice Details</h3>

        <div v-if="selectedInvoice" class="space-y-4">
          <!-- Invoice Header -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-base-content/60">Invoice Number</div>
              <div class="font-mono font-semibold">{{ selectedInvoice.invoiceNumber }}</div>
            </div>
            <div>
              <div class="text-sm text-base-content/60">Status</div>
              <div class="badge" :class="getInvoiceStatusBadgeClass(selectedInvoice.status)">
                {{ selectedInvoice.status }}
              </div>
            </div>
            <div>
              <div class="text-sm text-base-content/60">Issue Date</div>
              <div>{{ formatDate(selectedInvoice.issueDate) }}</div>
            </div>
            <div>
              <div class="text-sm text-base-content/60">Due Date</div>
              <div>{{ formatDate(selectedInvoice.dueDate) }}</div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Items -->
          <div v-if="selectedInvoice.items && selectedInvoice.items.length > 0">
            <div class="text-sm font-semibold mb-2">Items</div>
            <div class="space-y-2">
              <div 
                v-for="(item, index) in selectedInvoice.items" 
                :key="index"
                class="flex justify-between items-center p-2 bg-base-200 rounded"
              >
                <div>
                  <div class="font-semibold">{{ item.description }}</div>
                  <div class="text-xs text-base-content/60">
                    {{ item.quantity }} × {{ formatCurrency(item.price) }}
                  </div>
                </div>
                <div class="font-semibold">{{ formatCurrency(item.total) }}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Totals -->
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-base-content/60">Subtotal</span>
              <span>{{ formatCurrency(selectedInvoice.amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-base-content/60">Tax</span>
              <span>{{ formatCurrency(selectedInvoice.tax || 0) }}</span>
            </div>
            <div class="divider my-2"></div>
            <div class="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span class="text-primary">{{ formatCurrency(selectedInvoice.total) }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedInvoice.notes" class="pt-4">
            <div class="text-sm font-semibold mb-2">Notes</div>
            <div class="p-3 bg-base-200 rounded text-sm">{{ selectedInvoice.notes }}</div>
          </div>

          <!-- Payments -->
          <div v-if="selectedInvoice.payments && selectedInvoice.payments.length > 0" class="pt-4">
            <div class="text-sm font-semibold mb-2">Payment History</div>
            <div class="space-y-2">
              <div 
                v-for="payment in selectedInvoice.payments" 
                :key="payment.id"
                class="flex justify-between items-center p-2 bg-base-200 rounded text-sm"
              >
                <div>
                  <div class="font-semibold">{{ formatPaymentMethod(payment.paymentMethod) }}</div>
                  <div class="text-xs text-base-content/60">{{ formatDate(payment.paymentDate) }}</div>
                </div>
                <div class="font-semibold">{{ formatCurrency(payment.amount) }}</div>
              </div>
            </div>
          </div>
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
import {
  IconCash,
  IconEye,
  IconFileOff
} from '@tabler/icons-vue'
import { useInvoices } from '@/composables/subscription/useInvoices'
import { usePayments } from '@/composables/subscription/usePayments'
import { useTenants } from '@/composables/admin/useTenants'
import RecordPaymentModal from '@/components/subscription/RecordPaymentModal.vue'

// Composables
const {
  invoices,
  loading,
  actionLoading,
  isSuperAdmin,
  fetchInvoices,
  getInvoiceStatusBadgeClass,
  isOverdue,
  formatCurrency,
  formatDate
} = useInvoices()

const {
  formatPaymentMethod
} = usePayments()

const {
  tenants,
  fetchTenants
} = useTenants()

// Local state
const filters = ref({
  search: '',
  tenantId: '',
  status: '',
  sortBy: 'dueDate'
})

const selectedInvoice = ref(null)
const modalLoading = ref(false)
const paymentModal = ref(null)
const detailsModal = ref(null)
let searchTimeout = null

// Computed
const filteredInvoices = computed(() => {
  let result = [...invoices.value]

  // Filter by search
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(invoice => 
      invoice.invoiceNumber?.toLowerCase().includes(search)
    )
  }

  // Filter by tenant
  if (filters.value.tenantId) {
    result = result.filter(invoice => invoice.tenantId === filters.value.tenantId)
  }

  // Filter by status
  if (filters.value.status) {
    result = result.filter(invoice => invoice.status === filters.value.status)
  }

  // Sort
  result.sort((a, b) => {
    if (filters.value.sortBy === 'dueDate') {
      return new Date(a.dueDate) - new Date(b.dueDate)
    } else if (filters.value.sortBy === 'issueDate') {
      return new Date(b.issueDate) - new Date(a.issueDate)
    } else if (filters.value.sortBy === 'amount') {
      return parseFloat(b.total) - parseFloat(a.total)
    }
    return 0
  })

  return result
})

// Methods
const handleSearch = async () => {
  await loadInvoices()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 300)
}

const loadInvoices = async () => {
  await fetchInvoices({ tenantId: filters.value.tenantId || undefined })
}

const getTenantName = (tenantId) => {
  const tenant = tenants.value.find(t => t.id === tenantId)
  return tenant?.name || 'Unknown'
}

const openPaymentModal = (invoice) => {
  selectedInvoice.value = invoice
  paymentModal.value?.openModal()
}

const viewInvoiceDetails = (invoice) => {
  selectedInvoice.value = invoice
  detailsModal.value?.showModal()
}

const handleModalClose = () => {
  selectedInvoice.value = null
}

const handlePaymentSubmit = async (paymentData) => {
  modalLoading.value = true
  try {
    // Payment will be processed in the modal
    // Reload invoices after payment
    await loadInvoices()
  } catch (error) {
    console.error('Error processing payment:', error)
  } finally {
    modalLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadInvoices(),
    fetchTenants()
  ])
})
</script>
