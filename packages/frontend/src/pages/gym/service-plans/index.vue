<route lang="yaml">
meta:
  title: Service Plans
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Service Plans</h1>
        <p class="text-base-content/60 mt-1">Manage gym membership, class packages, PT sessions, and spa services</p>
      </div>
      <button
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Add Service Plan
      </button>
    </div>

    <!-- Statistics Cards -->
    <div v-if="stats && stats.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        v-for="stat in stats"
        :key="stat.serviceType"
        class="card bg-base-100 shadow-xl"
      >
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">{{ getServiceTypeLabel(stat.serviceType) }}</p>
              <p class="text-2xl font-bold">{{ stat.count }}</p>
              <p class="text-xs text-base-content/60 mt-1">
                Avg: {{ formatCurrency(stat.avgPrice) }}
              </p>
            </div>
            <div class="badge badge-lg" :class="getServiceTypeBadge(stat.serviceType)">
              {{ stat.count }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-4">
            <label class="label">
              <span class="label-text font-medium">Search</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by name or description..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- Service Type Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Service Type</span>
            </label>
            <select v-model="filters.serviceType" class="select select-bordered w-full" @change="handleSearch">
              <option value="all">All Types</option>
              <option value="membership">Membership</option>
              <option value="class_package">Class Package</option>
              <option value="pt_package">PT Package</option>
              <option value="spa_package">Spa Package</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.isActive" class="select select-bordered w-full" @change="handleSearch">
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Sort By</span>
            </label>
            <select v-model="filters.sortBy" class="select select-bordered w-full" @change="handleSearch">
              <option value="displayOrder">Display Order</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="serviceType">Service Type</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>

          <!-- Sort Order -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Order</span>
            </label>
            <select v-model="filters.sortOrder" class="select select-bordered w-full" @change="handleSearch">
              <option value="ASC">ASC</option>
              <option value="DESC">DESC</option>
            </select>
          </div>

          <!-- Limit -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Show</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered w-full" @change="handleSearch">
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
            <div v-if="filters.serviceType !== 'all'" class="badge badge-primary badge-outline gap-1">
              Type: {{ getServiceTypeLabel(filters.serviceType) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('serviceType')">✕</button>
            </div>
            <div v-if="filters.isActive !== 'all'" class="badge badge-primary badge-outline gap-1">
              Status: {{ filters.isActive === 'true' ? 'Active' : 'Inactive' }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('isActive')">✕</button>
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

    <!-- Plans Grid/Table -->
    <div v-else-if="hasPlans" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th class="w-16">#</th>
                <th>Service Type</th>
                <th>Plan Name</th>
                <th>Description</th>
                <th class="text-right">Price</th>
                <th class="text-center">Duration/Sessions</th>
                <th class="text-center">Type</th>
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
                <!-- Display Order -->
                <td class="font-mono text-sm">#{{ plan.displayOrder }}</td>

                <!-- Service Type -->
                <td>
                  <div
                    class="badge badge-sm whitespace-nowrap inline-block max-w-xs truncate"
                    :class="getServiceTypeBadge(plan.serviceType)"
                    title="{{ getServiceTypeLabel(plan.serviceType) }}"
                  >
                    {{ getServiceTypeLabel(plan.serviceType) }}
                  </div>
                </td>

                <!-- Plan Name -->
                <td>
                  <div class="font-semibold">{{ plan.name }}</div>
                  <div v-if="requiresTrainer(plan)" class="text-xs text-base-content/60 flex items-center gap-1 mt-1">
                    <IconUser class="w-3 h-3" />
                    Requires Trainer
                  </div>
                </td>

                <!-- Description -->
                <td>
                  <div class="max-w-xs truncate" :title="plan.description">
                    {{ plan.description || '-' }}
                  </div>
                </td>

                <!-- Price -->
                <td class="text-right">
                  <div class="font-bold text-primary">
                    {{ formatCurrency(plan.price, plan.tenantCurrency) }}
                  </div>
                  <div v-if="getPricePerSession(plan)" class="text-xs text-base-content/60">
                    {{ formatCurrency(getPricePerSession(plan), plan.tenantCurrency) }}/session
                  </div>
                </td>

                <!-- Duration/Sessions -->
                <td class="text-center">
                  <div class="badge badge-ghost badge-sm">
                    {{ formatDuration(plan) }}
                  </div>
                  <div v-if="formatValidity(plan)" class="text-xs text-base-content/60 mt-1">
                    {{ formatValidity(plan) }}
                  </div>
                </td>

                <!-- Duration Type -->
                <td class="text-center">
                  <div class="badge badge-outline badge-sm">
                    {{ plan.isTimeBased ? 'Time' : 'Session' }}
                  </div>
                </td>

                <!-- Popular -->
                <td class="text-center">
                  <div v-if="plan.isPopular" >
                    ⭐
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <input 
                    type="checkbox" 
                    class="toggle toggle-success toggle-sm" 
                    :checked="plan.isActive"
                    @change="togglePlanStatus(plan)"
                    :disabled="actionLoading"
                  />
                </td>

                <!-- Actions -->
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
        <h3 class="text-xl font-semibold mb-2">No Service Plans Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search || hasActiveFilters ? 'Try adjusting your search filters.' : 'Get started by creating your first service plan.' }}
        </p>
        <button
          v-if="!hasActiveFilters"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Create First Plan
        </button>
      </div>
    </div>

    <!-- Plan Detail Modal -->
    <dialog ref="detailModal" class="modal">
      <div class="modal-box max-w-3xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        
        <h3 class="font-bold text-lg mb-4">
          {{ selectedPlan?.name }}
        </h3>
        
        <div v-if="selectedPlan" class="space-y-4">
          <!-- Basic Info -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Basic Information</h4>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-sm text-base-content/60">Service Type</p>
                  <p class="font-medium">{{ getServiceTypeLabel(selectedPlan.serviceType) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Price</p>
                  <p class="font-medium">{{ formatCurrency(selectedPlan.price, selectedPlan.tenantCurrency) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Duration Type</p>
                  <p class="font-medium">{{ getDurationTypeLabel(selectedPlan.durationType) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Duration/Sessions</p>
                  <p class="font-medium">{{ formatDuration(selectedPlan) }}</p>
                </div>
                <div v-if="formatValidity(selectedPlan)">
                  <p class="text-sm text-base-content/60">Validity</p>
                  <p class="font-medium">{{ formatValidity(selectedPlan) }}</p>
                </div>
                <div v-if="getPricePerSession(selectedPlan)">
                  <p class="text-sm text-base-content/60">Price Per Session</p>
                  <p class="font-medium">{{ formatCurrency(getPricePerSession(selectedPlan), selectedPlan.tenantCurrency) }}</p>
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
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Facilities</h4>
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
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Applicable Class Types</h4>
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

          <!-- Access Hours -->
          <div v-if="formatAccessHours(selectedPlan.accessControl?.accessHours)" class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Access Hours</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div
                  v-for="schedule in formatAccessHours(selectedPlan.accessControl?.accessHours)"
                  :key="schedule.day"
                  class="flex justify-between text-sm"
                >
                  <span class="font-medium">{{ schedule.day }}:</span>
                  <span class="text-base-content/60">{{ schedule.hours }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-3">Additional Information</h4>
              <div class="flex flex-wrap gap-2">
                <div v-if="requiresTrainer(selectedPlan)" class="badge badge-info">
                  Requires Trainer
                </div>
                <div v-if="selectedPlan.isPopular" class="badge badge-warning">
                  ⭐ Popular
                </div>
                <div v-if="selectedPlan.isBundle" class="badge badge-accent">
                  Bundle Package
                </div>
                <div :class="selectedPlan.isActive ? 'badge badge-success' : 'badge badge-error'">
                  {{ selectedPlan.isActive ? 'Active' : 'Inactive' }}
                </div>
                <div v-if="getMaxCheckIns(selectedPlan)" class="badge badge-outline">
                  Max Check-ins: {{ getMaxCheckIns(selectedPlan) }}
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

    <!-- Plan Form Modal (will be created separately) -->
    <ServicePlanFormModal
      ref="planFormModal"
      :plan="editingPlan"
      :loading="modalLoading"
      @submit="handlePlanSubmit"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUser,
  IconEye,
  IconFileOff
} from '@tabler/icons-vue'
import { useServicePlans } from '@/composables/gym/service-management/useServicePlans.js'
import { useDialog } from '@/composables/core/useApi'
import ServicePlanFormModal from '@/components/gym/services/ServicePlanFormModal.vue'

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
  getServiceTypeLabel,
  getServiceTypeBadge,
  getDurationTypeLabel,
  formatDuration,
  formatValidity,
  getPricePerSession,
  requiresTrainer,
  getFacilities,
  getApplicableClassTypes,
  formatAccessHours,
  getMaxCheckIns
} = useServicePlans()

const dialog = useDialog()

// Local state
const filters = ref({
  search: '',
  serviceType: 'all',
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
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.serviceType !== 'all' || filters.value.isActive !== 'all'
})

const hasPlans = computed(() => {
  return plans.value && Array.isArray(plans.value) && plans.value.length > 0
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
  filters.value.page = 1 // Reset to first page on new search
  await loadPlans()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

const clearFilter = (filterKey) => {
  if (filterKey === 'serviceType' || filterKey === 'isActive') {
    filters.value[filterKey] = 'all'
  } else {
    filters.value[filterKey] = ''
  }
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.serviceType = 'all'
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
    await fetchStats()
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
  const confirmed = await dialog.confirm({
    title: 'Delete Service Plan',
    message: `Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

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

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadPlans(),
    loadStats()
  ])
})
</script>
