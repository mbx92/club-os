<route lang="yaml">
meta:
  title: Check-Ins
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Check-Ins</h1>
        <p class="text-base-content/60 mt-1">View and manage member check-ins</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <IconDoorEnter class="w-5 h-5 mr-2" />
        New Check-In
      </button>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Total Check-Ins</div>
            <div class="stat-value text-primary">{{ statistics.total || 0 }}</div>
            <div class="stat-desc">All time</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Today's Check-Ins</div>
            <div class="stat-value text-success">{{ statistics.today || 0 }}</div>
            <div class="stat-desc">{{ statistics.uniqueMembersToday || 0 }} unique members</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">This Week</div>
            <div class="stat-value text-info">{{ statistics.thisWeek || 0 }}</div>
            <div class="stat-desc">Last 7 days</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">This Month</div>
            <div class="stat-value text-warning">{{ statistics.thisMonth || 0 }}</div>
            <div class="stat-desc">Current month</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Card -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <!-- Row 1: Search and Dropdowns -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <!-- Search Input -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search</span>
            </label>
            <input
              type="text"
              placeholder="Search by member name..."
              class="input input-bordered input-sm w-full"
              :value="searchQuery"
              @input="handleSearch"
            />
          </div>

          <!-- Service Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Service Type</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.serviceType"
              @change="loadCheckins"
            >
              <option value="all">All Types</option>
              <option value="membership">General Membership</option>
              <option value="pt_package">PT Package</option>
              <option value="class_package">Class Package</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.sortBy"
              @change="loadCheckins"
            >
              <option value="checkInTime">Check-In Time</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Items Per Page</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="filters.limit"
              @change="loadCheckins"
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
              @change="loadCheckins"
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
              @change="loadCheckins"
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
            <div v-if="filters.serviceType !== 'all'" class="badge badge-primary badge-outline gap-1">
              Service: {{ filters.serviceType }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('serviceType')">✕</button>
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

    <!-- Check-Ins Table -->
    <div v-else-if="hasCheckins" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check-In Time</th>
                <th>Check-Out Time</th>
                <th>Service Type</th>
                <th>Checked By</th>
                <th>Notes</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="checkin in checkins" :key="checkin.id">
                <!-- Member -->
                <td>
                  <div v-if="checkin.member" class="flex flex-col">
                    <div class="font-semibold">{{ checkin.member.firstName }} {{ checkin.member.lastName }}</div>
                    <div class="text-sm text-base-content/60">{{ checkin.member.email }}</div>
                  </div>
                  <div v-else class="text-base-content/60">-</div>
                </td>

                <!-- Check-In Time -->
                <td>
                  <div class="text-sm">{{ formatDateTime(checkin.checkInTime) }}</div>
                </td>

                <!-- Check-Out Time -->
                <td>
                  <div v-if="checkin.checkOutTime" class="text-sm">
                    {{ formatDateTime(checkin.checkOutTime) }}
                  </div>
                  <div v-else>
                    <span class="badge badge-warning badge-sm">Active</span>
                  </div>
                </td>

                <!-- Service Type -->
                <td>
                  <div v-if="checkin.activeService" class="flex flex-col">
                    <div class="badge badge-sm badge-info">{{ formatServiceType(checkin.activeService.serviceType) }}</div>
                    <div class="text-xs text-base-content/60 mt-1">{{ checkin.activeService.servicePlanName }}</div>
                  </div>
                  <div v-else>
                    <span class="badge badge-sm badge-ghost">General</span>
                  </div>
                </td>

                <!-- Checked By -->
                <td>
                  <div v-if="checkin.checkedBy" class="text-sm">
                    {{ checkin.checkedBy.firstName }} {{ checkin.checkedBy.lastName }}
                  </div>
                  <div v-else class="text-base-content/60">-</div>
                </td>

                <!-- Notes -->
                <td>
                  <div v-if="checkin.notes" class="text-sm max-w-xs truncate" :title="checkin.notes">
                    {{ checkin.notes }}
                  </div>
                  <div v-else class="text-base-content/60">-</div>
                </td>

                <!-- Actions -->
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <button
                      v-if="!checkin.checkOutTime"
                      @click="openCheckoutModal(checkin)"
                      class="btn btn-sm btn-success"
                      title="Check Out"
                    >
                      <IconDoorExit class="w-4 h-4" />
                    </button>
                    <button
                      @click="openAddonModal(checkin)"
                      class="btn btn-sm btn-info"
                      title="Add Item"
                    >
                      <IconShoppingBag class="w-4 h-4" />
                    </button>
                    <router-link
                      :to="`/gym/check-ins/${checkin.id}`"
                      class="btn btn-sm btn-ghost"
                      title="View Details"
                    >
                      <IconEye class="w-4 h-4" />
                    </router-link>
                    <button
                      @click="confirmDelete(checkin)"
                      class="btn btn-sm error btn-ghost"
                      title="Delete"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between mt-6 pt-4 border-t border-base-300">
          <div class="text-sm text-base-content/60">
            {{ paginationInfo }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="changePage(1)"
              :disabled="filters.page === 1"
              class="btn btn-sm"
            >
              First
            </button>
            <button
              @click="changePage(filters.page - 1)"
              :disabled="filters.page === 1"
              class="btn btn-sm"
            >
              Previous
            </button>
            <div class="flex gap-1">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="changePage(page)"
                class="btn btn-sm"
                :class="{ 'btn-primary': page === filters.page }"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="changePage(filters.page + 1)"
              :disabled="filters.page === totalPages"
              class="btn btn-sm"
            >
              Next
            </button>
            <button
              @click="changePage(totalPages)"
              :disabled="filters.page === totalPages"
              class="btn btn-sm"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconFileOff class="w-16 h-16 text-base-content/20 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Check-Ins Found</h3>
        <p class="text-base-content/60 mb-6">
          {{ hasActiveFilters ? 'Try adjusting your filters' : 'Create your first check-in to get started' }}
        </p>
        <button v-if="!hasActiveFilters" @click="openCreateModal" class="btn btn-primary">
          <IconDoorEnter class="w-5 h-5 mr-2" />
          New Check-In
        </button>
      </div>
    </div>

    <!-- Check-In Modal -->
    <CheckInFormModal
      ref="checkinModal"
      @saved="handleCheckinSaved"
    />

    <!-- Add-on Modal (opens after successful check-in) -->
    <CheckInAddonModal
      ref="addonModal"
      @saved="handleAddonSaved"
      @close="handleAddonSkipped"
    />

    <!-- Check-Out Modal -->
    <CheckOutModal
      ref="checkoutModal"
      :checkin="selectedCheckin"
      @saved="handleCheckoutSaved"
    />

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Confirm Delete</h3>
        <p class="py-4">
          Are you sure you want to delete this check-in for
          <span v-if="selectedCheckin?.member" class="font-semibold">
            {{ selectedCheckin.member.firstName }} {{ selectedCheckin.member.lastName }}
          </span>?
          This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn">Cancel</button>
          <button @click="handleDelete" class="btn btn-error" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCheckins } from '@/composables/gym/checkin-management'
import CheckInFormModal from '@/components/gym/check-ins/CheckInFormModal.vue'
import CheckOutModal from '@/components/gym/check-ins/CheckOutModal.vue'
import CheckInAddonModal from '@/components/gym/check-ins/CheckInAddonModal.vue'
import {
  IconDoorEnter,
  IconDoorExit,
  IconEye,
  IconTrash,
  IconFileOff,
  IconShoppingBag
} from '@tabler/icons-vue'

const {
  checkins,
  loading,
  statistics,
  statsLoading,
  fetchCheckins,
  getCheckinStatistics,
  deleteCheckin
} = useCheckins()

// Filters
const filters = ref({
  page: 1,
  limit: 10,
  search: '',
  serviceType: 'all',
  startDate: '',
  endDate: '',
  sortBy: 'checkInTime',
  sortOrder: 'DESC'
})

const searchQuery = ref('')
let searchTimeout = null

const totalRecords = ref(0)
const totalPages = ref(1)
const checkinModal = ref(null)
const checkoutModal = ref(null)
const deleteModal = ref(null)
const addonModal = ref(null)
const selectedCheckin = ref(null)

// Computed
const hasCheckins = computed(() => checkins.value && checkins.value.length > 0)

const hasActiveFilters = computed(() => {
  return filters.value.search ||
    filters.value.serviceType !== 'all' ||
    filters.value.startDate ||
    filters.value.endDate
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalRecords.value)
  return `Showing ${start} to ${end} of ${totalRecords.value} check-ins`
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
const loadCheckins = async () => {
  try {
    const params = { ...filters.value }
    
    // Convert dates to ISO format if provided
    if (params.startDate) {
      params.startDate = new Date(params.startDate).toISOString()
    }
    if (params.endDate) {
      params.endDate = new Date(params.endDate).toISOString()
    }
    
    const result = await fetchCheckins(params)
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
    loadCheckins()
  }, 500)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    filters.value.page = page
    loadCheckins()
  }
}

const clearFilter = (filterName) => {
  if (filterName === 'search') {
    filters.value.search = ''
    searchQuery.value = ''
  } else if (filterName === 'serviceType') {
    filters.value.serviceType = 'all'
  } else if (filterName === 'startDate') {
    filters.value.startDate = ''
  } else if (filterName === 'endDate') {
    filters.value.endDate = ''
  }
  
  filters.value.page = 1
  loadCheckins()
}

const clearAllFilters = () => {
  filters.value.search = ''
  searchQuery.value = ''
  filters.value.serviceType = 'all'
  filters.value.startDate = ''
  filters.value.endDate = ''
  filters.value.page = 1
  loadCheckins()
}

const formatDateTime = (dateString) => {
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

const formatServiceType = (type) => {
  const typeMap = {
    'pt_package': 'PT Package',
    'class_package': 'Class Package',
    'membership': 'Membership'
  }
  return typeMap[type] || type
}

const openAddonModal = (checkin) => {
  addonModal.value?.openModal(checkin.member || null)
}

const openCreateModal = () => {
  checkinModal.value?.openModal()
}

const openCheckoutModal = (checkin) => {
  selectedCheckin.value = checkin
  checkoutModal.value?.openModal()
}

const handleCheckinSaved = async ({ checkinResult, member } = {}) => {
  await loadCheckins()
  await loadStatistics()
  // Open add-on modal so cashier can add paid items (e.g. towel rental)
  addonModal.value?.openModal(member || null)
}

const handleAddonSaved = async () => {
  // Reload stats after an add-on transaction is created
  await loadStatistics()
}

const handleAddonSkipped = () => {
  // nothing needed
}

const handleCheckoutSaved = async () => {
  selectedCheckin.value = null
  await loadCheckins()
}

const confirmDelete = (checkin) => {
  selectedCheckin.value = checkin
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
  selectedCheckin.value = null
}

const handleDelete = async () => {
  if (!selectedCheckin.value) return
  
  try {
    await deleteCheckin(selectedCheckin.value.id)
    closeDeleteModal()
    await loadCheckins()
    await loadStatistics()
  } catch (error) {
    console.error('Error deleting check-in:', error)
  }
}

// Watch for filter changes
watch(() => filters.value.sortBy, () => {
  loadCheckins()
})

watch(() => filters.value.sortOrder, () => {
  loadCheckins()
})

// Lifecycle
onMounted(() => {
  loadCheckins()
  loadStatistics()
})
</script>
