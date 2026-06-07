<template>
  <div>
    <!-- Header with Actions -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">{{ title }}</h1>
        <p class="text-base-content/60 mt-1">{{ subtitle }}</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="showAlertButton"
          class="btn btn-outline btn-sm"
          @click="navigateToAlerts"
        >
          <IconBell class="w-4 h-4 mr-2" />
          View Alerts
        </button>
        <button
          v-if="showCalendarButton"
          class="btn btn-outline btn-sm"
          @click="navigateToCalendar"
        >
          <IconCalendar class="w-4 h-4 mr-2" />
          View Calendar
        </button>
      </div>
    </div>

    <!-- Alert Banner -->
    <div v-if="criticalAlertsCount > 0" class="alert alert-error shadow-lg mb-6">
      <IconAlertTriangle class="w-6 h-6" />
      <div>
        <h3 class="font-bold">Critical Alerts</h3>
        <div class="text-sm">
          You have {{ criticalAlertsCount }} service(s) requiring immediate attention.
        </div>
      </div>
      <button class="btn btn-sm" @click="$router.push('/gym/alerts')">
        View Details
      </button>
    </div>

    <!-- Statistics Cards -->
    <!-- <div v-if="stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Total Active</p>
              <p class="text-2xl font-bold">{{ stats.totalActive || 0 }}</p>
            </div>
            <div class="badge badge-lg badge-primary">
              <IconUserCheck class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Expiring Soon</p>
              <p class="text-2xl font-bold text-warning">{{ stats.expiringSoon || 0 }}</p>
            </div>
            <div class="badge badge-lg badge-warning">
              <IconClock class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Expired</p>
              <p class="text-2xl font-bold text-error">{{ stats.expired || 0 }}</p>
            </div>
            <div class="badge badge-lg badge-error">
              <IconAlertCircle class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Frozen</p>
              <p class="text-2xl font-bold">{{ stats.frozen || 0 }}</p>
            </div>
            <div class="badge badge-lg badge-info">
              <IconSnowflake class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- Filters and Search -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Search Input -->
          <div class="form-control flex-col lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Search</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by member name..."
              class="input input-bordered input-sm w-full"
              @input="debouncedSearch"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control flex-col">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="frozen">Frozen</option>
              <option value="expiring_soon">Expiring Soon</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control flex-col">
            <label class="label">
              <span class="label-text font-medium">Sort By</span>
            </label>
            <select v-model="filters.sortBy" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option value="endDate">End Date</option>
              <option value="startDate">Start Date</option>
            </select>
          </div>

          <!-- Limit -->
          <div class="form-control flex-col">
            <label class="label">
              <span class="label-text font-medium">Show</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
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
              Status: {{ getStatusLabel(filters.status) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
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

    <!-- Active Services Table -->
    <div v-else-if="hasServices" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Member</th>
                <th>Service Plan</th>
                <th>Start Date</th>
                <th>Expires At</th>
                <th>Remaining</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="service in services"
                :key="service.id"
                :class="getRowClass(service)"
              >
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-10" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                        <span class="text-sm">{{ getInitials(getMemberDisplayName(service)) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ getMemberDisplayName(service) }}</div>
                      <div class="text-sm opacity-50">{{ service.member?.email || '—' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="font-semibold">{{ service.servicePlan?.name || 'N/A' }}</div>
                  <div class="text-sm text-base-content/60">
                    {{ formatCurrency(service.servicePlan?.price) }}
                  </div>
                </td>
                <td>
                  <div class="text-sm">{{ formatDate(service.startDate) }}</div>
                </td>
                <td>
                  <div class="text-sm">{{ formatDate(service.expiresAt || service.endDate) }}</div>
                </td>
                <td>
                  <div class="badge badge-sm" :class="getRemainingBadgeClass(service)">
                    {{ getRemainingDays(service) }}
                  </div>
                </td>
                <td class="text-center">
                  <div class="badge badge-sm" :class="getStatusBadgeClass(service.status)">
                    {{ getStatusLabel(service.status) }}
                  </div>
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                      @click="showServiceDetail(service)"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canAssignTrainer(service)"
                      class="btn btn-xs btn-ghost text-info tooltip"
                      :data-tip="service.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer'"
                      @click="showAssignTrainerModal(service)"
                    >
                      <IconUserPlus class="w-4 h-4" />
                    </button>
                    <!-- <button
                      v-if="canFreeze(service)"
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Freeze Service"
                      @click="confirmFreezeService(service)"
                    >
                      <IconSnowflake class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canExtend(service)"
                      class="btn btn-xs btn-ghost text-success tooltip"
                      data-tip="Extend Service"
                      @click="showExtendModal(service)"
                    >
                      <IconRefresh class="w-4 h-4" />
                    </button> -->
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
          <div v-if="totalPages > 1" class="join">
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
        <h3 class="text-xl font-semibold mb-2">{{ emptyStateTitle }}</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search || hasActiveFilters ? 'Try adjusting your search filters.' : emptyStateMessage }}
        </p>
      </div>
    </div>

    <!-- Service Detail Modal -->
    <dialog ref="detailModal" class="modal">
      <div class="modal-box max-w-2xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        
        <h3 class="font-bold text-lg mb-4">Service Details</h3>
        
        <div v-if="selectedService" class="space-y-4">
          <!-- Member Info -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Member Information</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-sm text-base-content/60">Name</p>
                  <p class="font-medium">{{ getMemberDisplayName(selectedService) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Email</p>
                  <p class="font-medium">{{ selectedService.member?.email || '—' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Service Info -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Service Information</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-sm text-base-content/60">Plan Name</p>
                  <p class="font-medium">{{ selectedService.servicePlan?.name }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Price</p>
                  <p class="font-medium">{{ formatCurrency(selectedService.servicePlan?.price) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Start Date</p>
                  <p class="font-medium">{{ formatDate(selectedService.startDate) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Expires At</p>
                  <p class="font-medium">{{ formatDate(selectedService.expiresAt || selectedService.endDate) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Remaining</p>
                  <p class="font-medium">{{ getRemainingDays(selectedService) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Status</p>
                  <div class="badge" :class="getStatusBadgeClass(selectedService.status)">
                    {{ getStatusLabel(selectedService.status) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Usage Info (if applicable) -->
          <div v-if="hasUsageInfo(selectedService)" class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Usage Information</h4>
              <div class="grid grid-cols-2 gap-3">
                <div v-if="selectedService.remainingSessions !== undefined">
                  <p class="text-sm text-base-content/60">Remaining Sessions</p>
                  <p class="font-medium">{{ selectedService.remainingSessions || '-' }}</p>
                </div>
                <div v-if="selectedService.totalSessions !== undefined">
                  <p class="text-sm text-base-content/60">Total Sessions</p>
                  <p class="font-medium">{{ selectedService.totalSessions || '-' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Assign Trainer Modal -->
    <dialog ref="assignTrainerModal" class="modal">
      <div class="modal-box max-w-lg">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeAssignTrainerModal">
            ✕
          </button>
        </form>

        <h3 class="font-bold text-lg mb-2">{{ selectedServiceForTrainer?.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer' }}</h3>
        <p class="text-sm text-base-content/70 mb-6">
          Assign a trainer to this {{ formatServiceType(selectedServiceForTrainer?.serviceType) }}
        </p>
        
        <div v-if="selectedServiceForTrainer" class="space-y-4">
          <!-- Service Info Card -->
          <div class="p-4 bg-base-200 rounded-lg">
            <div class="text-xs font-medium text-base-content/60 mb-1">Service:</div>
            <div class="font-semibold text-base">{{ selectedServiceForTrainer.servicePlan?.name }}</div>
            <div class="text-sm text-base-content/70 mt-1">{{ selectedServiceForTrainer.member?.firstName }} {{ selectedServiceForTrainer.member?.lastName }}</div>
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
import {
  IconBell,
  IconCalendar,
  IconAlertTriangle,
  IconUserCheck,
  IconClock,
  IconAlertCircle,
  IconSnowflake,
  IconEye,
  IconRefresh,
  IconFileOff,
  IconUserPlus
} from '@tabler/icons-vue'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices.js'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useNotification } from '@/composables/core/useNotification.js'

const props = defineProps({
  serviceType: {
    type: String,
    required: true,
    validator: (value) => ['membership', 'class_package', 'pt_package', 'spa_package'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  showAlertButton: {
    type: Boolean,
    default: true
  },
  showCalendarButton: {
    type: Boolean,
    default: false
  },
  emptyStateTitle: {
    type: String,
    default: 'No Active Services Found'
  },
  emptyStateMessage: {
    type: String,
    default: 'Active services will appear here once members subscribe.'
  }
})

// Composables
const {
  services,
  loading,
  statistics: stats,
  fetchServices,
  fetchStats,
  freezeService,
  extendService,
  assignTrainer,
  formatCurrency,
  formatDate,
  getInitials,
  getRemainingDays,
  getStatusLabel,
  getStatusBadgeClass,
  getRemainingBadgeClass,
  getRowClass,
  canFreeze,
  canExtend,
  hasUsageInfo,
  canAssignTrainer
} = useActiveServices()

const { trainers, loading: loadingTrainers, fetchTrainers } = useTrainers()
const { showError } = useNotification()

// Local state
const filters = ref({
  search: '',
  serviceType: props.serviceType,
  status: 'all',
  sortBy: 'endDate',
  sortOrder: 'ASC',
  page: 1,
  limit: 10
})

const totalServices = ref(0)
const totalPages = ref(0)
const selectedService = ref(null)
const detailModal = ref(null)
const assignTrainerModal = ref(null)
const selectedServiceForTrainer = ref(null)
const selectedTrainerId = ref('')
const assigningTrainer = ref(false)
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.status !== 'all'
})

const hasServices = computed(() => {
  return services.value && Array.isArray(services.value) && services.value.length > 0
})

const activeTrainers = computed(() => {
  const filtered = trainers.value.filter(trainer => {
    return trainer.isActive === true || trainer.isActive === undefined
  })
  return filtered
})

// Adapt statistics: support both normalized shape (totalActive, expiringSoon, expired, frozen)
// and raw API shape ({ byStatus: [...], byServiceType: [...], alerts: { expiring, lowSessions } })
const statsComputed = computed(() => {
  const s = stats.value || {}
  // If already normalized, use as-is
  if (s.totalActive !== undefined || s.expiringSoon !== undefined) return s

  // Derive from raw API shape
  const byStatus = Array.isArray(s.byStatus) ? s.byStatus : []
  const alerts = s.alerts || {}

  const findStatus = (status) => {
    const item = byStatus.find(b => b.status === status)
    return item ? parseInt(item.count, 10) || 0 : 0
  }

  return {
    totalActive: findStatus('active'),
    expiringSoon: alerts.expiring ?? alerts.expiringServices ?? 0,
    expired: findStatus('expired'),
    frozen: findStatus('frozen'),
    byStatus: byStatus,
    byServiceType: s.byServiceType || [],
    alerts: alerts
  }
})

const criticalAlertsCount = computed(() => {
  return (statsComputed.value?.expiringSoon || 0) + (statsComputed.value?.expired || 0)
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalServices.value)
  return `Showing ${start}-${end} of ${totalServices.value} services`
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
const handleSearch = async () => {
  filters.value.page = 1
  await loadServices()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

const clearFilter = (filterKey) => {
  if (filterKey === 'status') {
    filters.value[filterKey] = 'all'
  } else {
    filters.value[filterKey] = ''
  }
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.status = 'all'
  handleSearch()
}

const loadServices = async () => {
  try {
    const result = await fetchServices(filters.value)
    
    if (result) {
      if (Array.isArray(result)) {
        totalServices.value = result.length
        totalPages.value = 1
      } else if (result.data) {
        totalServices.value = result.total || result.data.length || 0
        totalPages.value = result.totalPages || 1
      } else {
        totalServices.value = 0
        totalPages.value = 1
      }
    } else {
      totalServices.value = 0
      totalPages.value = 1
    }
  } catch (error) {
    console.error('Error loading services:', error)
    totalServices.value = 0
    totalPages.value = 1
  }
}

const loadStats = async () => {
  try {
    await fetchStats({ serviceType: props.serviceType })
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const changePage = (page) => {
  filters.value.page = page
  loadServices()
}

const getMemberDisplayName = (service) => {
  if (service.member?.firstName || service.member?.lastName) {
    return [service.member.firstName, service.member.lastName].filter(Boolean).join(' ')
  }
  return service.displayName || service.customerName || service.memberName || 'N/A'
}

const showServiceDetail = (service) => {
  selectedService.value = service
  detailModal.value?.showModal()
}

const confirmFreezeService = async (service) => {
  const confirmed = window.confirm(
    `Are you sure you want to freeze the service for "${getMemberDisplayName(service)}"?`
  )

  if (confirmed) {
    try {
      await freezeService(service.id)
      await loadServices()
      await loadStats()
    } catch (error) {
      console.error('Error freezing service:', error)
    }
  }
}

const showExtendModal = (service) => {
  // TODO: Implement extend modal
}

const navigateToCalendar = () => {
  const calendarRoutes = {
    'membership': '/gym/memberships/calendar',
    'class_package': '/gym/classes/calendar',
    'pt_package': '/gym/personal-training/calendar',
    'spa_package': '/gym/spa/calendar'
  }
  
  const route = calendarRoutes[props.serviceType] || '/gym/calendar'
  window.location.href = route
}

const navigateToAlerts = () => {
  const alertRoutes = {
    'membership': '/gym/memberships/alerts',
    'class_package': '/gym/classes/alerts',
    'pt_package': '/gym/personal-training/alerts',
    'spa_package': '/gym/spa/alerts'
  }
  
  const route = alertRoutes[props.serviceType] || '/gym/alerts'
  window.location.href = route
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
  selectedServiceForTrainer.value = service
  selectedTrainerId.value = service.assignedTrainerId || ''
  
  // Always fetch trainers to get latest data
  await fetchTrainers({ limit: 100 })
  
  assignTrainerModal.value?.showModal()
}

const closeAssignTrainerModal = () => {
  assignTrainerModal.value?.close()
  selectedServiceForTrainer.value = null
  selectedTrainerId.value = ''
}

const handleAssignTrainer = async () => {
  if (!selectedServiceForTrainer.value || !selectedTrainerId.value) return
  
  assigningTrainer.value = true
  try {
    await assignTrainer(selectedServiceForTrainer.value.id, selectedTrainerId.value)
    closeAssignTrainerModal()
    await loadServices()
    await loadStats()
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
onMounted(async () => {
  await Promise.all([
    loadServices(),
    loadStats()
  ])
})
</script>
