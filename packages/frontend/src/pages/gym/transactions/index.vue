<route lang="yaml">
meta:
  title: Transactions
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Transactions</h1>
        <p class="text-base-content/60 mt-1">View and manage all transactions</p>
      </div>
      <router-link to="/gym/transactions/pos" class="btn btn-primary">
        <IconShoppingCart class="w-5 h-5 mr-2" />
        New Transaction (POS)
      </router-link>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="mb-6">
      <!-- Main Stats (3 Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Total Transactions</div>
            <div class="stat-value text-primary">{{ statistics.overall?.totalTransactions || 0 }}</div>
            <div class="stat-desc">All time transactions</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Total Revenue</div>
            <div class="stat-value text-success">{{ formatCurrency(statistics.overall?.totalRevenue || 0) }}</div>
            <div class="stat-desc">All time revenue</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Average Amount</div>
            <div class="stat-value text-info">{{ formatCurrency(statistics.overall?.averageAmount || 0) }}</div>
            <div class="stat-desc">Per transaction</div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: By Status & Top Products (2 Cards) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- By Status & Customer Type -->
        <div v-if="statistics.byStatusAndCustomerType && statistics.byStatusAndCustomerType.length > 0" class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="font-semibold text-lg mb-3">By Status & Customer Type</h3>
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="stat in statistics.byStatusAndCustomerType"
                :key="`${stat.status}-${stat.customerType}`"
                class="bg-base-200 p-4 rounded-lg"
              >
                <div class="flex items-center gap-2 mb-2">
                  <div 
                    class="badge badge-sm" 
                    :class="{
                      'badge-success': stat.status === 'completed',
                      'badge-error': stat.status === 'refunded'
                    }"
                  >
                    {{ stat.status }}
                  </div>
                  <div class="badge badge-sm badge-ghost">{{ stat.customerType }}</div>
                </div>
                <div class="text-lg font-bold text-primary">{{ formatCurrency(stat.totalAmount) }}</div>
                <div class="text-xs text-base-content/60">{{ stat.count }} transaction(s)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Products -->
        <div v-if="topProducts && topProducts.length > 0" class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="font-semibold text-lg mb-3">Top Service Plans</h3>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Service Plan</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(product, index) in topProducts" :key="index">
                    <td>
                      <div class="font-semibold">{{ product.itemName }}</div>
                    </td>
                    <td class="text-center">
                      <div class="badge badge-sm badge-primary">{{ product.totalQuantity }}</div>
                    </td>
                    <td class="text-right font-semibold text-success">
                      {{ formatCurrency(product.totalAmount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Card -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <!-- Row 1: Search and Dropdowns -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <!-- Search Input -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search</span>
            </label>
            <input
              type="text"
              placeholder="Search by transaction number, customer name..."
              class="input input-bordered input-sm w-full"
              :value="searchQuery"
              @input="handleSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.status"
              @change="loadTransactions"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <!-- Customer Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Customer Type</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.customerType"
              @change="loadTransactions"
            >
              <option value="all">All Types</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.sortBy"
              @change="loadTransactions"
            >
              <option value="transactionDate">Date</option>
              <option value="totalAmount">Amount</option>
              <option value="transactionNumber">Transaction #</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Items Per Page</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.limit"
              @change="loadTransactions"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Start Date</span>
            </label>
            <input
              type="date"
              class="input input-bordered input-sm w-full"
              v-model="filters.startDate"
              @change="loadTransactions"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input
              type="date"
              class="input input-bordered input-sm w-full"
              v-model="filters.endDate"
              @change="loadTransactions"
            />
          </div>
          
        </div>

        <!-- Active Filters Info -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Active filters:</span>
          <div class="flex flex-wrap gap-2">
            <div v-if="filters.search" class="badge badge-primary badge-outline gap-1">
              Search: "{{ filters.search }}"
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('search')">✕</button>
            </div>
            <div v-if="filters.status !== 'all'" class="badge badge-primary badge-outline gap-1">
              Status: {{ filters.status }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
            </div>
            <div v-if="filters.customerType !== 'all'" class="badge badge-primary badge-outline gap-1">
              Type: {{ filters.customerType }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('customerType')">✕</button>
            </div>
            <div v-if="filters.startDate" class="badge badge-primary badge-outline gap-1">
              From: {{ filters.startDate }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('startDate')">✕</button>
            </div>
            <div v-if="filters.endDate" class="badge badge-primary badge-outline gap-1">
              To: {{ filters.endDate }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('endDate')">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Clear All</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Transactions Table -->
    <div v-else-if="hasTransactions" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Transaction #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Items</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in transactions" :key="transaction.id">
                <!-- Transaction Number -->
                <td>
                  <div class="font-mono font-semibold">{{ transaction.transactionNumber }}</div>
                </td>

                <!-- Date -->
                <td>
                  <div class="text-sm">{{ formatDate(transaction.transactionDate) }}</div>
                </td>

                <!-- Customer -->
                <td>
                  <div v-if="transaction.member" class="flex flex-col">
                    <div class="font-semibold">{{ transaction.member.firstName }} {{ transaction.member.lastName }}</div>
                    <div class="text-sm text-base-content/60">{{ transaction.member.email }}</div>
                  </div>
                  <div v-else class="text-base-content/60">-</div>
                </td>

                <!-- Customer Type -->
                <td>
                  <div class="badge badge-sm" :class="transaction.customerType === 'member' ? 'badge-info' : 'badge-ghost'">
                    {{ transaction.customerType }}
                  </div>
                </td>

                <!-- Items Count -->
                <td>
                  <div class="text-sm">
                    {{ transaction.transactionItems?.length || 0 }} item(s)
                  </div>
                </td>

                <!-- Total Amount -->
                <td class="text-right">
                  <div class="font-bold text-primary">{{ formatCurrency(transaction.totalAmount) }}</div>
                  <div v-if="parseFloat(transaction.voucherDiscount) > 0" class="text-sm text-success">
                    -{{ formatCurrency(transaction.voucherDiscount) }} discounted
                  </div>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div 
                    class="badge badge-sm" 
                    :class="{
                      'badge-success': transaction.status === 'completed',
                      'badge-error': transaction.status === 'refunded'
                    }"
                  >
                    {{ transaction.status }}
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <router-link
                      :to="`/gym/transactions/${transaction.id}`"
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                    >
                      <IconEye class="w-4 h-4" />
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-base-300">
          <div class="text-sm text-base-content/60">
            {{ paginationInfo }}
          </div>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page === 1"
              @click="changePage(filters.page - 1)"
            >
              «
            </button>
            <button
              v-for="page in visiblePages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === filters.page }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page === totalPages"
              @click="changePage(filters.page + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Transactions Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search ? 'Try adjusting your search filters.' : 'Get started by creating your first transaction.' }}
        </p>
        <router-link
          v-if="!filters.search"
          to="/gym/transactions/pos"
          class="btn btn-primary"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Create First Transaction
        </router-link>
      </div>
    </div>

    <!-- Refund Confirmation Modal -->
    <dialog ref="refundModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Refund</h3>
        <p class="py-4">Are you sure you want to refund this transaction?</p>
        
        <div class="form-control flex-col">
          <label class="label">
            <span class="label-text">Refund Reason/Notes</span>
          </label>
          <textarea
            class="textarea textarea-bordered"
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
            :disabled="!refundNotes.trim()"
          >
            Confirm Refund
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
import { ref, computed, onMounted, watch } from 'vue'
import { useTransactions } from '@/composables/gym/transactions'
import { useCurrency } from '@/composables/core/useCurrency'
import { 
  IconShoppingCart, 
  IconEye, 
  IconRefresh, 
  IconFileOff, 
  IconPlus 
} from '@tabler/icons-vue'

const { 
  transactions, 
  loading, 
  statistics,
  statsLoading,
  fetchTransactions, 
  getTransactionStatistics,
  refundTransaction 
} = useTransactions()

const { formatCurrency } = useCurrency()

// Filters
const filters = ref({
  page: 1,
  limit: 10,
  search: '',
  status: 'all',
  customerType: 'all',
  startDate: '',
  endDate: '',
  sortBy: 'transactionDate',
  sortOrder: 'DESC'
})

const searchQuery = ref('')
let searchTimeout = null

const totalRecords = ref(0)
const totalPages = ref(1)
const refundModal = ref(null)
const refundNotes = ref('')
const selectedTransaction = ref(null)

// Computed
const hasTransactions = computed(() => transactions.value && transactions.value.length > 0)

const hasActiveFilters = computed(() => {
  return filters.value.search ||
    filters.value.status !== 'all' ||
    filters.value.customerType !== 'all' ||
    filters.value.startDate ||
    filters.value.endDate
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalRecords.value)
  return `Showing ${start} to ${end} of ${totalRecords.value} transactions`
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, filters.value.page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Methods
const loadTransactions = async () => {
  try {
    const result = await fetchTransactions(filters.value)
    totalRecords.value = result.total
    totalPages.value = result.totalPages
  } catch (error) {
    console.error('Error loading transactions:', error)
  }
}

const loadStatistics = async () => {
  try {
    await getTransactionStatistics()
  } catch (error) {
    console.error('Error loading statistics:', error)
  }
}

// Limit top products shown in UI to 5 items
const topProducts = computed(() => {
  return (statistics.value?.topProducts || []).slice(0, 5)
})

const handleSearch = (event) => {
  searchQuery.value = event.target.value
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    filters.value.search = searchQuery.value
    filters.value.page = 1
    loadTransactions()
  }, 500)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    filters.value.page = page
    loadTransactions()
  }
}

const clearFilter = (filterName) => {
  if (filterName === 'search') {
    filters.value.search = ''
    searchQuery.value = ''
  } else if (filterName === 'status') {
    filters.value.status = 'all'
  } else if (filterName === 'customerType') {
    filters.value.customerType = 'all'
  } else if (filterName === 'startDate') {
    filters.value.startDate = ''
  } else if (filterName === 'endDate') {
    filters.value.endDate = ''
  }
  
  filters.value.page = 1
  loadTransactions()
}

const clearAllFilters = () => {
  filters.value.search = ''
  searchQuery.value = ''
  filters.value.status = 'all'
  filters.value.customerType = 'all'
  filters.value.startDate = ''
  filters.value.endDate = ''
  filters.value.page = 1
  loadTransactions()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const confirmRefund = (transaction) => {
  selectedTransaction.value = transaction
  refundNotes.value = ''
  refundModal.value?.showModal()
}

const closeRefundModal = () => {
  refundModal.value?.close()
  selectedTransaction.value = null
  refundNotes.value = ''
}

const handleRefund = async () => {
  if (!selectedTransaction.value || !refundNotes.value.trim()) return
  
  try {
    await refundTransaction(selectedTransaction.value.id, {
      notes: refundNotes.value
    })
    
    closeRefundModal()
    await loadTransactions()
    await loadStatistics()
  } catch (error) {
    console.error('Error refunding transaction:', error)
  }
}

// Watch for filter changes
watch(() => filters.value.sortBy, () => {
  loadTransactions()
})

watch(() => filters.value.sortOrder, () => {
  loadTransactions()
})

// Lifecycle
onMounted(() => {
  loadTransactions()
  loadStatistics()
})
</script>
