<route lang="yaml">
meta:
  title: Active Services
  layout: default
</route>

<template>
  <div class="container px-4 py-8 mx-auto">
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-bold">Active Services</h1>
        <p class="mt-1 text-base-content/60">Manage and monitor all active service plans</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/gym/active-services/alerts" class="btn btn-warning btn-outline">
          <IconBell class="w-5 h-5 mr-2" />
          Alerts
          <span v-if="statistics?.alerts?.expiring || statistics?.alerts?.lowSessions" 
                class="ml-1 badge badge-error badge-sm">
            {{ (statistics.alerts.expiring || 0) + (statistics.alerts.lowSessions || 0) }}
          </span>
        </router-link>
        <router-link to="/gym/active-services/calendar" class="btn btn-primary btn-outline">
          <IconCalendar class="w-5 h-5 mr-2" />
          Calendar View
        </router-link>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="mb-6">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <!-- Total Active Services -->
        <div class="shadow card bg-base-100">
          <div class="p-4 card-body">
            <div class="text-xs font-medium text-base-content/60">Total Active Services</div>
            <div class="text-2xl font-bold text-primary">
              {{ getTotalActiveCount() }}
            </div>
            <div class="text-xs text-base-content/50">Currently active</div>
          </div>
        </div>

        <!-- By Service Type Cards -->
        <div v-for="typeStat in statistics.byServiceType" 
             :key="typeStat.serviceType"
             class="shadow card bg-base-100">
          <div class="p-4 card-body">
            <div class="text-xs font-medium text-base-content/60">{{ formatServiceType(typeStat.serviceType) }}</div>
            <div class="text-2xl font-bold text-info">{{ typeStat.count }}</div>
            <div class="text-xs text-base-content/50">Active services</div>
          </div>
        </div>

        <!-- Alerts Card -->
        <div class="shadow card bg-base-100">
          <div class="p-4 card-body">
            <div class="text-xs font-medium text-base-content/60">Alerts</div>
            <div class="text-2xl font-bold text-warning">
              {{ (statistics.alerts?.expiring || 0) + (statistics.alerts?.lowSessions || 0) }}
            </div>
            <div class="text-xs text-base-content/50">
              {{ statistics.alerts?.expiring || 0 }} expiring, {{ statistics.alerts?.lowSessions || 0 }} low sessions
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Card -->
    <div class="mb-6 shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <!-- Search Input -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search Member</span>
            </label>
            <input
              type="text"
              placeholder="Search by member name..."
              class="input input-bordered input-sm"
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
              class="select select-bordered select-sm"
              v-model="filters.status"
              @change="loadServices"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="depleted">Depleted</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <!-- Service Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Service Type</span>
            </label>
            <select
              class="select select-bordered select-sm"
              v-model="filters.serviceType"
              @change="loadServices"
            >
              <option value="all">All Types</option>
              <option value="membership">Membership</option>
              <option value="class_package">Class Package</option>
              <option value="pt_package">PT Package</option>
              <option value="spa_package">Spa Package</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select
              class="select select-bordered select-sm"
              v-model="filters.sortBy"
              @change="loadServices"
            >
              <option value="endDate">End Date</option>
              <option value="startDate">Start Date</option>
            </select>
          </div>

          <!-- Items Per Page -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Items Per Page</span>
            </label>
            <select
              class="select select-bordered select-sm"
              v-model="filters.limit"
              @change="loadServices"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Active Filters Info -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 pt-4 mt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Active filters:</span>
          <div class="flex flex-wrap gap-2">
            <div v-if="filters.search" class="gap-1 badge badge-primary badge-outline">
              Search: "{{ filters.search }}"
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('search')">✕</button>
            </div>
            <div v-if="filters.status !== 'all'" class="gap-1 badge badge-primary badge-outline">
              Status: {{ filters.status }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
            </div>
            <div v-if="filters.serviceType !== 'all'" class="gap-1 badge badge-primary badge-outline">
              Type: {{ formatServiceType(filters.serviceType) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('serviceType')">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Clear All</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Services Table -->
    <div v-else-if="hasServices" class="shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Member</th>
                <th>Service Plan</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th class="text-center">Sessions</th>
                <th class="text-center">Status</th>
                <th class="text-center">Alerts</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in services" :key="service.id">
                <!-- Member -->
                <td>
                  <div class="flex flex-col">
                    <div class="font-semibold">
                      <template v-if="service.member">
                        {{ service.member.firstName }} {{ service.member.lastName }}
                      </template>
                      <template v-else>
                        {{ service.displayName || service.customerName }}
                      </template>
                    </div>
                    <template v-if="service.member">
                      <div class="text-sm text-base-content/60">{{ service.member.email }}</div>
                      <div class="text-xs text-base-content/50">{{ service.member.phone }}</div>
                    </template>
                    <template v-else>
                      <div class="mt-1 badge badge-xs badge-ghost">Walk-in</div>
                    </template>
                  </div>
                </td>

                <!-- Service Plan -->
                <td>
                  <div class="flex flex-col">
                    <div class="font-semibold">{{ service.servicePlan?.name }}</div>
                    <div class="text-sm text-base-content/60">
                      {{ formatCurrency(service.pricePaid) }}
                      <span v-if="parseFloat(service.voucherDiscount) > 0" class="ml-1 text-success">
                        (-{{ formatCurrency(service.voucherDiscount) }})
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Service Type -->
                <td>
                  <div class="flex flex-col gap-1">
                    <div class="badge badge-sm badge-info">
                      {{ formatServiceType(service.serviceType) }}
                    </div>
                    <div v-if="!service.memberId" class="badge badge-sm badge-ghost">
                      Walk-in
                    </div>
                  </div>
                </td>

                <!-- Start Date -->
                <td>
                  <div class="text-sm">{{ formatDate(service.startDate) }}</div>
                </td>

                <!-- End Date -->
                <td>
                  <div class="text-sm">{{ formatDate(service.endDate) }}</div>
                  <div v-if="service.daysUntilExpiry !== null" class="text-xs text-base-content/60">
                    {{ service.daysUntilExpiry }} days left
                  </div>
                </td>

                <!-- Sessions -->
                <td class="text-center">
                  <div v-if="service.totalSessions">
                    <div class="font-semibold">{{ service.remainingSessions || 0 }} / {{ service.totalSessions }}</div>
                    <div class="text-xs text-base-content/60">
                      {{ service.usagePercentage }}% used
                    </div>
                  </div>
                  <div v-else class="text-base-content/40">-</div>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div 
                    class="badge badge-sm" 
                    :class="{
                      'badge-success': service.status === 'active',
                      'badge-error': service.status === 'expired',
                      'badge-warning': service.status === 'depleted',
                      'badge-ghost': service.status === 'suspended'
                    }"
                  >
                    {{ service.status }}
                  </div>
                </td>

                <!-- Alerts -->
                <td class="text-center">
                  <div class="flex flex-col gap-1">
                    <div v-if="service.isExpiringSoon" class="badge badge-warning badge-xs">
                      Expiring Soon
                    </div>
                    <div v-if="service.isExpired" class="badge badge-error badge-xs">
                      Expired
                    </div>
                    <div v-if="service.isLowSessions" class="badge badge-warning badge-xs">
                      Low Sessions
                    </div>
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <router-link
                      :to="`/gym/active-services/member/${service.memberId}`"
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Member Services"
                    >
                      <IconEye class="w-4 h-4" />
                    </router-link>
                    <button
                      v-if="canAssignTrainer(service)"
                      class="btn btn-xs btn-ghost text-info tooltip"
                      :data-tip="service.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer'"
                      @click="showAssignTrainerModal(service)"
                    >
                      <IconUserPlus class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col items-center justify-between gap-4 pt-4 mt-6 border-t sm:flex-row border-base-300">
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
    <div v-else class="shadow-xl card bg-base-100">
      <div class="py-12 text-center card-body">
        <IconFileOff class="w-16 h-16 mx-auto mb-4 text-base-content/30" />
        <h3 class="mb-2 text-xl font-semibold">No Active Services Found</h3>
        <p class="mb-4 text-base-content/60">
          {{ filters.search ? 'Try adjusting your search filters.' : 'No active services available at the moment.' }}
        </p>
      </div>
    </div>

    <!-- Assign Trainer Modal -->
    <dialog ref="assignTrainerModal" class="modal">
      <div class="modal-box max-w-lg">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeAssignTrainerModal">
            ✕
          </button>
        </form>

        <h3 class="font-bold text-lg mb-2">{{ selectedService?.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer' }}</h3>
        <p class="text-sm text-base-content/70 mb-6">
          Assign a trainer to this {{ formatServiceType(selectedService?.serviceType) }}
        </p>
        
        <div v-if="selectedService" class="space-y-4">
          <!-- Service Info Card -->
          <div class="p-4 bg-base-200 rounded-lg">
            <div class="text-xs font-medium text-base-content/60 mb-1">Service:</div>
            <div class="font-semibold text-base">{{ selectedService.servicePlan?.name }}</div>
            <div class="text-sm text-base-content/70 mt-1">{{ selectedService.member?.firstName }} {{ selectedService.member?.lastName }}</div>
          </div>

          <!-- Trainer Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Select Trainer</span>
              <span v-if="loadingTrainers" class="label-text-alt text-info">
                <span class="loading loading-spinner loading-xs"></span>
                Loading...
              </span>
            </label>
            <select 
              class="select select-bordered w-full" 
              v-model="selectedTrainerId"
              :disabled="loadingTrainers"
            >
              <option value="" disabled>Select a trainer...</option>
              <option 
                v-for="trainer in activeTrainers" 
                :key="trainer.id" 
                :value="trainer.id"
              >
                {{ trainer.firstName }} {{ trainer.lastName }}
                <template v-if="trainer.specialization"> - {{ formatSpecialization(trainer.specialization) }}</template>
              </option>
            </select>
            <label class="label" v-if="!loadingTrainers && activeTrainers.length === 0">
              <span class="label-text-alt text-warning">No active trainers available</span>
            </label>
          </div>
        </div>

        <div class="modal-action mt-6">
          <button class="btn btn-ghost" @click="closeAssignTrainerModal">Cancel</button>
          <button 
            class="btn btn-primary" 
            @click="handleAssignTrainer"
            :disabled="!selectedTrainerId || assigningTrainer"
          >
            <span v-if="assigningTrainer" class="loading loading-spinner loading-sm"></span>
            <span v-else>Assign Trainer</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeAssignTrainerModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActiveServices } from '@/composables/gym/service-management'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useCurrency } from '@/composables/core/useCurrency'
import { 
  IconBell,
  IconCalendar,
  IconEye,
  IconUserPlus,
  IconFileOff
} from '@tabler/icons-vue'

const { 
  services, 
  loading,
  statistics,
  statsLoading,
  fetchActiveServices,
  getServiceStatistics,
  assignTrainer,
  canAssignTrainer
} = useActiveServices()

const { trainers, loading: loadingTrainers, fetchTrainers } = useTrainers()
const { formatCurrency } = useCurrency()

// Filters
const filters = ref({
  page: 1,
  limit: 20,
  search: '',
  status: 'active',
  serviceType: 'all',
  sortBy: 'endDate',
  sortOrder: 'ASC'
})

const searchQuery = ref('')
let searchTimeout = null

const totalRecords = ref(0)
const totalPages = ref(1)
const assignTrainerModal = ref(null)
const selectedService = ref(null)
const selectedTrainerId = ref('')
const assigningTrainer = ref(false)

// Computed
const hasServices = computed(() => services.value && services.value.length > 0)

const activeTrainers = computed(() => {
  const filtered = trainers.value.filter(trainer => {
    return trainer.isActive === true || trainer.isActive === undefined
  })
  return filtered
})

const hasActiveFilters = computed(() => {
  return filters.value.search ||
    filters.value.status !== 'active' ||
    filters.value.serviceType !== 'all'
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalRecords.value)
  return `Showing ${start} to ${end} of ${totalRecords.value} services`
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
const loadServices = async () => {
  try {
    const result = await fetchActiveServices(filters.value)
    totalRecords.value = result.total
    totalPages.value = result.totalPages
  } catch (error) {
    console.error('Error loading services:', error)
  }
}

const loadStatistics = async () => {
  try {
    await getServiceStatistics()
  } catch (error) {
    console.error('Error loading statistics:', error)
  }
}

const getTotalActiveCount = () => {
  if (!statistics.value?.byStatus) return 0
  const activeStatus = statistics.value.byStatus.find(s => s.status === 'active')
  return activeStatus ? parseInt(activeStatus.count) : 0
}

const handleSearch = (event) => {
  searchQuery.value = event.target.value
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    filters.value.search = searchQuery.value
    filters.value.page = 1
    loadServices()
  }, 500)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    filters.value.page = page
    loadServices()
  }
}

const clearFilter = (filterName) => {
  if (filterName === 'search') {
    filters.value.search = ''
    searchQuery.value = ''
  } else if (filterName === 'status') {
    filters.value.status = 'active'
  } else if (filterName === 'serviceType') {
    filters.value.serviceType = 'all'
  }
  
  filters.value.page = 1
  loadServices()
}

const clearAllFilters = () => {
  filters.value.search = ''
  searchQuery.value = ''
  filters.value.status = 'active'
  filters.value.serviceType = 'all'
  filters.value.page = 1
  loadServices()
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatServiceType = (type) => {
  const typeMap = {
    'membership': 'Membership',
    'class_package': 'Class Package',
    'pt_package': 'PT Package',
    'spa_package': 'Spa Package'
  }
  return typeMap[type] || type
}

const showAssignTrainerModal = async (service) => {
  selectedService.value = service
  selectedTrainerId.value = service.assignedTrainerId || ''
  
  // Always fetch trainers to get latest data
  await fetchTrainers({ limit: 100 })
  
  assignTrainerModal.value?.showModal()
}

const closeAssignTrainerModal = () => {
  assignTrainerModal.value?.close()
  selectedService.value = null
  selectedTrainerId.value = ''
}

const handleAssignTrainer = async () => {
  if (!selectedService.value || !selectedTrainerId.value) return
  
  assigningTrainer.value = true
  try {
    await assignTrainer(selectedService.value.id, selectedTrainerId.value)
    closeAssignTrainerModal()
    await loadServices()
  } catch (error) {
    console.error('Error assigning trainer:', error)
  } finally {
    assigningTrainer.value = false
  }
}

const formatSpecialization = (spec) => {
  const specMap = {
    'yoga': 'Yoga',
    'personal_training': 'Personal Training',
    'spinning': 'Spinning',
    'boxing': 'Boxing',
    'pilates': 'Pilates',
    'crossfit': 'CrossFit',
    'zumba': 'Zumba'
  }
  return specMap[spec] || spec
}

// Lifecycle
onMounted(() => {
  loadServices()
  loadStatistics()
})
</script>
