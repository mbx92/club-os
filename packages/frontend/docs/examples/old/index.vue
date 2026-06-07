<route lang="yaml">
meta:
  title: Check-ins
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Check-ins</h1>
        <p class="text-base-content/60 mt-1">Manage member check-ins and track attendance</p>
      </div>
      <button @click="openNewCheckinModal" class="btn btn-primary">
        <IconLogin class="w-5 h-5 mr-2" />
        New Check-in
      </button>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="mb-6">
      <!-- Main Stats (3 Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Total Check-ins</div>
            <div class="stat-value text-primary">{{ statistics.total || 0 }}</div>
            <div class="stat-desc">All time check-ins</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Today</div>
            <div class="stat-value text-success">{{ statistics.today || 0 }}</div>
            <div class="stat-desc">Check-ins today</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">This Week</div>
            <div class="stat-value text-info">{{ statistics.thisWeek || 0 }}</div>
            <div class="stat-desc">Check-ins this week</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Unique Members Today</div>
            <div class="stat-value text-warning">{{ statistics.uniqueMembersToday || 0 }}</div>
            <div class="stat-desc">Different members</div>
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
                <div class="text-xs text-base-content/60">{{ stat.count }} Check-in(s)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Products -->
        <div v-if="statistics.topProducts && statistics.topProducts.length > 0" class="card bg-base-100 shadow-xl">
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
                  <tr v-for="(product, index) in statistics.topProducts" :key="index">
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Search Input -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search</span>
            </label>
            <input
              type="text"
              placeholder="Search by Check-in number, customer name..."
              class="input input-bordered input-sm"
              :value="searchQuery"
              @input="handleSearch"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select
              class="select select-bordered select-sm"
              v-model="filters.sortBy"
              @change="loadCheckIns"
            >
              <option value="checkInTime">Date</option>
              <option value="memberId">Member</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Items Per Page</span>
            </label>
            <select
              class="select select-bordered select-sm"
              v-model="filters.limit"
              @change="loadCheckIns"
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
              class="input input-bordered input-sm"
              v-model="filters.startDate"
              @change="loadCheckIns"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input
              type="date"
              class="input input-bordered input-sm"
              v-model="filters.endDate"
              @change="loadCheckIns"
            />
          </div>
          
        </div>

        <!-- Active Filters Info -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Active filters:</span>
          <div class="flex flex-wrap gap-2">
            <div v-if="filters.search" class="badge badge-primary badge-outline gap-1">
              Search: "{{ filters.search }}"
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('search')">âœ•</button>
            </div>
            <div v-if="filters.startDate" class="badge badge-primary badge-outline gap-1">
              From: {{ filters.startDate }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('startDate')">âœ•</button>
            </div>
            <div v-if="filters.endDate" class="badge badge-primary badge-outline gap-1">
              To: {{ filters.endDate }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('endDate')">âœ•</button>
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

    <!-- Check-ins Table -->
    <div v-else-if="hasCheckIns" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Check-in #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Service</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="checkIn in checkins" :key="checkIn.id">
                <!-- Check-in Number -->
                <td>
                  <div class="font-mono font-semibold">#{{ checkIn.id.substring(0, 8) }}</div>
                </td>

                <!-- Date -->
                <td>
                  <div class="text-sm">{{ formatDate(checkIn.checkInTime) }}</div>
                </td>

                <!-- Customer -->
                <td>
                  <div v-if="checkIn.member" class="flex flex-col">
                    <div class="font-semibold">{{ checkIn.member.firstName }} {{ checkIn.member.lastName }}</div>
                    <div class="text-sm text-base-content/60">{{ checkIn.member.email }}</div>
                  </div>
                  <div v-else class="text-base-content/60">-</div>
                </td>

                <!-- Customer Type -->
                <td>
                  <div class="badge badge-sm" :class="checkIn.customerType === 'member' ? 'badge-info' : 'badge-ghost'">
                    {{ checkIn.customerType }}
                  </div>
                </td>

                <!-- Items Count -->
                <td>
                  <div class="text-sm">
                    {{ checkIn.activeServiceId ? '1 service' : '-' }}
                  </div>
                </td>

                <!-- Total Amount -->
                <td class="text-right">
                  <div class="font-bold text-primary">-</div>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div 
                    class="badge badge-sm" 
                    :class="{
                      'badge-success': checkIn.checkOutTime,
                      'badge-info': !checkIn.checkOutTime
                    }"
                  >
                    {{ checkIn.checkOutTime ? 'Checked Out' : 'Active' }}
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <router-link
                      :to="`/gym/check-ins/${checkIn.id}`"
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                    >
                      <IconEye class="w-4 h-4" />
                    </router-link>
                    <button
                      v-if="!checkIn.checkOutTime"
                      class="btn btn-xs btn-ghost text-success tooltip"
                      data-tip="Check Out"
                      @click="confirmCheckout(checkIn)"
                    >
                      <IconRefresh class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-base-300">
          <div class="text-sm text-base-content/60">
            Showing {{ (filters.page - 1) * filters.limit + 1 }} to {{ Math.min(filters.page * filters.limit, totalRecords) }} of {{ totalRecords }} check-ins
          </div>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page === 1"
              @click="changePage(filters.page - 1)"
            >
              Â«
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
              Â»
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Check-ins Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search ? 'Try adjusting your search filters.' : 'Get started by creating your first Check-in.' }}
        </p>
        <router-link
          v-if="!filters.search"
          to="/gym/check-ins/pos"
          class="btn btn-primary"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Create First Check-in
        </router-link>
      </div>
    </div>

    <!-- Checkout Confirmation Modal -->
    <dialog ref="refundModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Check-out</h3>
        <p class="py-4">Are you sure you want to check out this member?</p>
        
        <div class="form-control flex-col">
          <label class="label">
            <span class="label-text">Check-out Notes (Optional)</span>
          </label>
          <textarea
            class="textarea textarea-bordered"
            placeholder="Enter any notes..."
            rows="3"
            v-model="refundNotes"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeRefundModal">Cancel</button>
          <button 
            class="btn btn-success" 
            @click="handleRefund"
          >
            Confirm Check-out
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
import { useCheckins } from '@/composables/gym/checkin-management'
import { useCurrency } from '@/composables/core/useCurrency'
import { 
  IconShoppingCart, 
  IconEye, 
  IconRefresh, 
  IconFileOff, 
  IconPlus,
  IconLogin
} from '@tabler/icons-vue'

const { 
  checkins, 
  loading, 
  statistics,
  statsLoading,
  fetchCheckins, 
  getCheckinStatistics,
  updateCheckin
} = useCheckins()

const { formatCurrency } = useCurrency()

// Filters
const filters = ref({
  page: 1,
  limit: 10,
  search: '',
  startDate: '',
  endDate: '',
  sortBy: 'checkInTime',
  sortOrder: 'DESC'
})

const searchQuery = ref('')
let searchTimeout = null

const totalRecords = ref(0)
const totalPages = ref(1)
const refundModal = ref(null)
const refundNotes = ref('')
const selectedCheckIn = ref(null)

// Computed
const hasCheckIns = computed(() => checkins.value && checkins.value.length > 0)

const hasActiveFilters = computed(() => {
  return filters.value.search ||
    filters.value.startDate ||
    filters.value.endDate
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
const loadCheckIns = async () => {
  try {
    const result = await fetchCheckins(filters.value)
    totalRecords.value = result.total
    totalPages.value = result.totalPages
  } catch (error) {
    console.error('Error loading check-ins:', error)
  }
}

const loadStatistics = async () => {
  try {
    await getCheckinStatistics()
  } catch (error) {
    console.error('Error loading statistics:', error)
  }
}

const handleSearch = (event) => {
  searchQuery.value = event.target.value
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    filters.value.search = searchQuery.value
    filters.value.page = 1
    loadCheckIns()
  }, 500)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    filters.value.page = page
    loadCheckIns()
  }
}

const clearFilter = (filterName) => {
  if (filterName === 'search') {
    filters.value.search = ''
    searchQuery.value = ''
  } else if (filterName === 'startDate') {
    filters.value.startDate = ''
  } else if (filterName === 'endDate') {
    filters.value.endDate = ''
  }
  
  filters.value.page = 1
  loadCheckIns()
}

const clearAllFilters = () => {
  filters.value.search = ''
  searchQuery.value = ''
  filters.value.startDate = ''
  filters.value.endDate = ''
  filters.value.page = 1
  loadCheckIns()
}

const openNewCheckinModal = () => {
  // Navigate to check-in creation page or open modal
  window.location.href = '/gym/check-ins/pos'
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

const confirmCheckout = (checkIn) => {
  selectedCheckIn.value = checkIn
  refundNotes.value = ''
  refundModal.value?.showModal()
}

const closeRefundModal = () => {
  refundModal.value?.close()
  selectedCheckIn.value = null
  refundNotes.value = ''
}

const handleRefund = async () => {
  if (!selectedCheckIn.value) return
  
  try {
    // Update check-in with checkout time
    await updateCheckin(selectedCheckIn.value.id, {
      checkOutTime: new Date().toISOString(),
      notes: refundNotes.value || selectedCheckIn.value.notes
    })
    
    closeRefundModal()
    await loadCheckIns()
    await loadStatistics()
  } catch (error) {
    console.error('Error checking out:', error)
  }
}

// Watch for filter changes
watch(() => filters.value.sortBy, () => {
  loadCheckIns()
})

watch(() => filters.value.sortOrder, () => {
  loadCheckIns()
})

// Lifecycle
onMounted(() => {
  loadCheckIns()
  loadStatistics()
})
</script>

