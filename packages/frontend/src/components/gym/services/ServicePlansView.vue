<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-bold">{{ title }}</h1>
        <p class="mt-1 text-base-content/60">{{ subtitle }}</p>
      </div>
      <button
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        {{ addButtonText }}
      </button>
    </div>

    <!-- Statistics Cards -->
    <div v-if="stats && stats.length > 0" class="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Total Plans</p>
              <p class="text-2xl font-bold">{{ stats[0]?.count || 0 }}</p>
            </div>
            <div class="badge badge-lg badge-info">
              {{ stats[0]?.count || 0 }}
            </div>
          </div>
        </div>
      </div>
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Average Price</p>
              <p class="text-2xl font-bold">{{ formatCurrency(stats[0]?.avgPrice || 0) }}</p>
            </div>
            <div class="badge badge-lg badge-success">
              Avg
            </div>
          </div>
        </div>
      </div>
      <div class="shadow-xl card bg-base-100">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Active Plans</p>
              <p class="text-2xl font-bold">{{ activePlansCount }}</p>
            </div>
            <div class="badge badge-lg badge-primary">
              Active
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="mb-6 shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <!-- Search Input -->
          <div class="flex-col form-control lg:col-span-2">
            <label class="label">
              <span class="font-medium label-text">Search</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by name or description..."
              class="w-full input input-bordered input-sm"
              @input="debouncedSearch"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Status</span>
            </label>
            <select v-model="filters.isActive" class="w-full select select-bordered select-sm" @change="handleSearch">
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Sort By</span>
            </label>
            <select v-model="filters.sortBy" class="w-full select select-bordered select-sm" @change="handleSearch">
              <option value="displayOrder">Display Order</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>

          <!-- Limit -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Show</span>
            </label>
            <select v-model="filters.limit" class="w-full select select-bordered select-sm" @change="handleSearch">
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
            <div v-if="filters.isActive !== 'all'" class="gap-1 badge badge-primary badge-outline">
              Status: {{ filters.isActive === 'true' ? 'Active' : 'Inactive' }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('isActive')">✕</button>
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

    <!-- Plans Table -->
    <div v-else-if="hasPlans" class="shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th class="w-16">#</th>
                <th>Plan Name</th>
                <th>Description</th>
                <th class="text-right">Price</th>
                <th class="text-center">Duration</th>
                <th class="text-center">Requires Trainer</th>
                <th class="text-center">Popular</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in plans"
                :key="plan.id"
                :class="{ 'opacity-50': !plan.isActive }"
              >
                <td class="font-mono text-sm">#{{ plan.displayOrder }}</td>
                <td>
                  <div class="font-semibold">{{ plan.name }}</div>
                </td>
                <td>
                  <div class="max-w-xs truncate" :title="plan.description">
                    {{ plan.description || '-' }}
                  </div>
                </td>
                <td class="text-right">
                  <div class="font-bold text-primary">
                    {{ formatCurrency(plan.price) }}
                  </div>
                </td>
                <td class="text-center">
                  <div class="badge badge-ghost badge-sm">
                    {{ formatDuration(plan) }}
                  </div>
                </td>
                <td class="text-center">
                  <div v-if="requiresTrainer(plan)">
                    <div class="badge badge-info badge-sm">
                      <IconUserCheck class="w-3 h-3 mr-1" />
                      Required
                    </div>
                    <div v-if="plan.defaultTrainerId" class="mt-1 text-xs text-base-content/60">
                      Default: {{ plan.defaultTrainer?.firstName || 'Trainer' }}
                    </div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td class="text-center">
                  <div v-if="plan.isPopular">⭐</div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
                <td class="text-center">
                  <input 
                    type="checkbox" 
                    class="toggle toggle-success toggle-sm" 
                    :checked="plan.isActive"
                    @change="togglePlanStatus(plan)"
                    :disabled="actionLoading"
                  />
                </td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                      @click="showPlanDetail(plan)"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      v-if="requiresTrainer(plan)"
                      class="btn btn-xs btn-ghost text-info tooltip"
                      :data-tip="plan.defaultTrainerId ? 'Change Default Trainer' : 'Assign Default Trainer'"
                      @click="showAssignTrainerModal(plan)"
                      :disabled="actionLoading"
                    >
                      <IconUserPlus class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Edit"
                      @click="openEditModal(plan)"
                      :disabled="actionLoading"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error tooltip"
                      data-tip="Delete"
                      @click="confirmDeletePlan(plan)"
                      :disabled="actionLoading"
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
        <div class="flex flex-col items-center justify-between gap-4 pt-4 mt-6 border-t sm:flex-row border-base-300">
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
    <div v-else class="shadow-xl card bg-base-100">
      <div class="py-12 text-center card-body">
        <IconFileOff class="w-16 h-16 mx-auto mb-4 text-base-content/30" />
        <h3 class="mb-2 text-xl font-semibold">{{ emptyStateTitle }}</h3>
        <p class="mb-4 text-base-content/60">
          {{ filters.search || hasActiveFilters ? 'Try adjusting your search filters.' : emptyStateMessage }}
        </p>
        <button
          v-if="!hasActiveFilters"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          {{ emptyStateButton }}
        </button>
      </div>
    </div>

    <!-- Plan Detail Modal -->
    <dialog ref="detailModal" class="modal">
      <div class="max-w-3xl modal-box">
        <form method="dialog">
          <button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">✕</button>
        </form>
        
        <h3 class="mb-4 text-lg font-bold">
          {{ selectedPlan?.name }}
        </h3>
        
        <div v-if="selectedPlan" class="space-y-4">
          <!-- Basic Info -->
          <div class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Basic Information</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-sm text-base-content/60">Price</p>
                  <p class="font-medium">{{ formatCurrency(selectedPlan.price) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Duration</p>
                  <p class="font-medium">{{ formatDuration(selectedPlan) }}</p>
                </div>
                <div v-if="formatValidity(selectedPlan)">
                  <p class="text-sm text-base-content/60">Validity</p>
                  <p class="font-medium">{{ formatValidity(selectedPlan) }}</p>
                </div>
              </div>
              <div v-if="selectedPlan.description" class="mt-3">
                <p class="text-sm text-base-content/60">Description</p>
                <p class="font-medium">{{ selectedPlan.description }}</p>
              </div>
            </div>
          </div>

          <!-- Facilities (for membership) -->
          <div v-if="getFacilities(selectedPlan).length > 0" class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Facilities</h4>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="facility in getFacilities(selectedPlan)"
                  :key="facility"
                  class="badge badge-primary badge-lg"
                >
                  {{ facility }}
                </div>
              </div>
            </div>
          </div>

          <!-- Class Types (for class packages) -->
          <div v-if="getApplicableClassTypes(selectedPlan).length > 0" class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Applicable Class Types</h4>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="classType in getApplicableClassTypes(selectedPlan)"
                  :key="classType"
                  class="badge badge-secondary badge-lg"
                >
                  {{ classType }}
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Additional Information</h4>
              <div class="flex flex-wrap gap-2">
                <div v-if="requiresTrainer(selectedPlan)" class="badge badge-info">
                  Requires Trainer
                </div>
                <div v-if="selectedPlan.isPopular" class="badge badge-warning">
                  ⭐ Popular
                </div>
                <div :class="selectedPlan.isActive ? 'badge badge-success' : 'badge badge-error'">
                  {{ selectedPlan.isActive ? 'Active' : 'Inactive' }}
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

    <!-- Plan Form Modal -->
    <ServicePlanFormModal
      ref="planFormModal"
      :plan="editingPlan"
      :loading="modalLoading"
      :default-service-type="serviceType"
      @submit="handlePlanSubmit"
      @close="handleModalClose"
    />

    <!-- Assign Trainer Modal -->
    <dialog ref="assignTrainerModal" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Assign Default Trainer</h3>
        <p class="py-2">Set a default trainer for this {{ formatServiceType(selectedPlanForTrainer?.serviceType) }}</p>
        
        <div v-if="selectedPlanForTrainer" class="mb-4">
          <div class="text-sm text-base-content/60">Service Package:</div>
          <div class="font-semibold">{{ selectedPlanForTrainer.name }}</div>
          <div class="mt-2 text-sm text-base-content/60">
            When members purchase this package, this trainer will be automatically assigned.
          </div>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Select Default Trainer</span>
          </label>
          <select class="w-full select select-bordered" v-model="selectedTrainerId" :disabled="trainersLoading">
            <option value="">No default trainer (assign manually later)</option>
            <option 
              v-for="trainer in trainers" 
              :key="trainer.id" 
              :value="trainer.id"
            >
              {{ trainer.firstName }} {{ trainer.lastName }}
              <span v-if="trainer.specialization"> - {{ trainer.specialization }}</span>
            </option>
          </select>
          <label v-if="trainersLoading" class="label">
            <span class="label-text-alt text-info">Loading trainers...</span>
          </label>
          <label v-else-if="trainers.length === 0" class="label">
            <span class="label-text-alt text-warning">No active trainers found</span>
          </label>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeAssignTrainerModal">Cancel</button>
          <button
            class="btn btn-primary"
            @click="handleAssignDefaultTrainer"
          >
            Save Default Trainer
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
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconFileOff,
  IconUserCheck,
  IconUserPlus
} from '@tabler/icons-vue'
import { useServicePlans } from '@/composables/gym/service-management/useServicePlans.js'
import { useNotification } from '@/composables/core/useNotification.js'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers.js'
import ServicePlanFormModal from '@/components/gym/services/ServicePlanFormModal.vue'

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
  addButtonText: {
    type: String,
    default: 'Add Plan'
  },
  emptyStateTitle: {
    type: String,
    default: 'No Plans Found'
  },
  emptyStateMessage: {
    type: String,
    default: 'Get started by creating your first plan.'
  },
  emptyStateButton: {
    type: String,
    default: 'Create First Plan'
  }
})

// Composables
const {
  plans,
  loading,
  stats,
  fetchPlans,
  fetchStats,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  formatCurrency,
  formatDuration,
  formatValidity,
  requiresTrainer,
  getFacilities,
  getApplicableClassTypes,
  formatAccessHours,
  getMaxCheckIns
} = useServicePlans()

const { showError } = useNotification()

const { 
  trainers, 
  loading: trainersLoading,
  fetchTrainers 
} = useTrainers()

// Local state
const filters = ref({
  search: '',
  serviceType: props.serviceType,
  isActive: 'all',
  sortBy: 'displayOrder',
  sortOrder: 'ASC',
  page: 1,
  limit: 10
})

const totalPlans = ref(0)
const totalPages = ref(0)
const editingPlan = ref(null)
const selectedPlan = ref(null)
const modalLoading = ref(false)
const actionLoading = ref(false)
const planFormModal = ref(null)
const detailModal = ref(null)
const assignTrainerModal = ref(null)
const selectedPlanForTrainer = ref(null)
const selectedTrainerId = ref('')
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.isActive !== 'all'
})

const hasPlans = computed(() => {
  return plans.value && Array.isArray(plans.value) && plans.value.length > 0
})

const activePlansCount = computed(() => {
  return plans.value ? plans.value.filter(p => p.isActive).length : 0
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalPlans.value)
  return `Showing ${start}-${end} of ${totalPlans.value} plans`
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
  await loadPlans()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

const clearFilter = (filterKey) => {
  if (filterKey === 'isActive') {
    filters.value[filterKey] = 'all'
  } else {
    filters.value[filterKey] = ''
  }
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.isActive = 'all'
  handleSearch()
}

const loadPlans = async () => {
  try {
    const result = await fetchPlans(filters.value)
    
    if (result) {
      if (Array.isArray(result)) {
        totalPlans.value = result.length
        totalPages.value = 1
      } else if (result.data) {
        totalPlans.value = result.total || result.data.length || 0
        totalPages.value = result.totalPages || 1
      } else {
        totalPlans.value = 0
        totalPages.value = 1
      }
    } else {
      totalPlans.value = 0
      totalPages.value = 1
    }
  } catch (error) {
    console.error('Error loading plans:', error)
    totalPlans.value = 0
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
  loadPlans()
}

const openCreateModal = () => {
  editingPlan.value = null
  planFormModal.value?.resetForm()
  planFormModal.value?.openModal()
}

const openEditModal = (plan) => {
  editingPlan.value = plan
  planFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingPlan.value = null
}

const handlePlanSubmit = async (planData) => {
  modalLoading.value = true
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.id, planData)
    } else {
      await createPlan(planData)
    }
    planFormModal.value?.closeModal()
    editingPlan.value = null
    await loadPlans()
    await loadStats()
  } catch (error) {
    console.error('Error saving plan:', error)
  } finally {
    modalLoading.value = false
  }
}

const togglePlanStatus = async (plan) => {
  const newStatus = !plan.isActive
  
  actionLoading.value = true
  try {
    await togglePlanActive(plan.id, newStatus)
    await loadPlans()
    await loadStats()
  } catch (error) {
    console.error('Error toggling plan status:', error)
  } finally {
    actionLoading.value = false
  }
}

const confirmDeletePlan = async (plan) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`
  )

  if (confirmed) {
    actionLoading.value = true
    try {
      await deletePlan(plan.id)
      await loadPlans()
      await loadStats()
    } catch (error) {
      console.error('Error deleting plan:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

const showPlanDetail = (plan) => {
  selectedPlan.value = plan
  detailModal.value?.showModal()
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

const showAssignTrainerModal = async (plan) => {
  selectedPlanForTrainer.value = plan
  // Load current default trainer if exists
  selectedTrainerId.value = plan.defaultTrainerId || ''
  
  // Load active trainers
  try {
    await fetchTrainers({ 
      status: 'all', // Get all trainers to include active ones
      page: 1,
      limit: 100 // Get sufficient trainers
    })
  } catch (error) {
    console.error('Error loading trainers:', error)
  }
  
  assignTrainerModal.value?.showModal()
}

const closeAssignTrainerModal = () => {
  assignTrainerModal.value?.close()
  selectedPlanForTrainer.value = null
  selectedTrainerId.value = ''
}

const handleAssignDefaultTrainer = async () => {
  if (!selectedPlanForTrainer.value) return
  
  actionLoading.value = true
  try {
    // Update plan with default trainer
    await updatePlan(selectedPlanForTrainer.value.id, {
      defaultTrainerId: selectedTrainerId.value || null
    })
    
    closeAssignTrainerModal()
    await loadPlans()
  } catch (error) {
    console.error('Error assigning default trainer:', error)
    showError('Failed to assign default trainer')
  } finally {
    actionLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadPlans(),
    loadStats()
  ])
})
</script>
