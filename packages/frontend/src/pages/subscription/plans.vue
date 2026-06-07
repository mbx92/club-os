<route lang="yaml">
meta:
  title: Subscription Plans
  layout: default
  requiresRole: super-admin
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Subscription Plans</h1>
        <p class="text-base-content/60 mt-1">Manage subscription plans for your gym</p>
      </div>
      <button
        v-if="isSuperAdmin()"
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Add Plan
      </button>
    </div>

    <!-- Super Admin Notice -->
    <div v-if="!isSuperAdmin()" class="alert alert-info mb-6">
      <IconInfoCircle class="w-5 h-5" />
      <span>You are viewing subscription plans. Only Super Admins can create, edit, or delete plans.</span>
    </div>

    <!-- Filters and Search -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-5">
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

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.isActive" class="select select-bordered w-full" @change="handleSearch">
              <option value="">All Status</option>
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
              <option value="sortOrder">Sort Order</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="duration">Duration</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>

          <!-- Sort Order -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Order</span>
            </label>
            <select v-model="filters.sortOrder" class="select select-bordered w-full" @change="handleSearch">
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
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
            <div v-if="filters.isActive" class="badge badge-primary badge-outline gap-1">
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

    <!-- Plans Table -->
    <div v-else-if="hasPlans" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th class="w-16">Order</th>
                <th>Plan Name</th>
                <th>Description</th>
                <th class="text-right">Price</th>
                <th class="text-center">Duration</th>
                <th class="text-center">Max Users</th>
                <th class="text-center">Max Members</th>
                <th>Features</th>
                <th class="text-center">Status</th>
                <th v-if="isSuperAdmin()" class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in plans"
                :key="plan.id"
                :class="{ 'opacity-50': !plan.isActive }"
              >
                <!-- Sort Order -->
                <td class="font-mono text-sm">#{{ plan.sortOrder }}</td>

                <!-- Plan Name -->
                <td>
                  <div class="font-semibold">{{ plan.name }}</div>
                </td>

                <!-- Description -->
                <td>
                  <div class="max-w-xs truncate" :title="plan.description">
                    {{ plan.description || '-' }}
                  </div>
                </td>

                <!-- Price -->
                <td class="text-right">
                  <div class="font-bold text-primary">{{ formatCurrency(plan.price) }}</div>
                </td>

                <!-- Duration -->
                <td class="text-center">
                  <div class="badge badge-ghost badge-sm">
                    {{ plan.duration }} days
                  </div>
                </td>

                <!-- Max Users -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <IconUsers class="w-4 h-4 text-base-content/60" />
                    <span class="font-semibold">{{ plan.maxUsers || '∞' }}</span>
                  </div>
                </td>

                <!-- Max Members -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <IconUserPlus class="w-4 h-4 text-base-content/60" />
                    <span class="font-semibold">{{ plan.maxMembers || '∞' }}</span>
                  </div>
                </td>

                <!-- Features -->
                <td>
                  <div v-if="plan.features && Object.keys(plan.features).length > 0">
                    <button
                      class="btn btn-xs btn-ghost gap-1"
                      @click="showFeaturesDetail(plan)"
                    >
                      <span class="font-semibold">{{ getEnabledFeaturesCount(plan.features) }} features</span>
                      <IconChevronRight class="w-3 h-3" />
                    </button>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div v-if="isSuperAdmin()">
                    <input 
                      type="checkbox" 
                      class="toggle toggle-success toggle-sm" 
                      :checked="plan.isActive"
                      @change="togglePlanStatus(plan)"
                      :disabled="actionLoading"
                    />
                  </div>
                  <div v-else class="badge badge-sm" :class="plan.isActive ? 'badge-success' : 'badge-error'">
                    {{ plan.isActive ? 'Active' : 'Inactive' }}
                  </div>
                </td>

                <!-- Actions -->
                <td v-if="isSuperAdmin()" class="text-center">
                  <div class="flex items-center justify-center gap-1">
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
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="filters.page === 1"
              @click="changePage(filters.page - 1)"
            >
              «
            </button>
            <button
              v-for="page in totalPages"
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
        <h3 class="text-xl font-semibold mb-2">No Subscription Plans Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search ? 'Try adjusting your search filters.' : 'Get started by creating your first subscription plan.' }}
        </p>
        <button
          v-if="isSuperAdmin() && !filters.search"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Create First Plan
        </button>
      </div>
    </div>

    <!-- Plan Form Modal -->
    <PlanFormModal
      ref="planFormModal"
      :plan="editingPlan"
      :loading="modalLoading"
      @submit="handlePlanSubmit"
      @close="handleModalClose"
    />

    <!-- Features Detail Modal -->
    <dialog ref="featuresModal" class="modal">
      <div class="modal-box max-w-3xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        
        <h3 class="font-bold text-lg mb-4">
          {{ selectedPlan?.name }} - Features
        </h3>
        
        <div v-if="selectedPlan" class="space-y-4">
          <div v-for="(category, categoryName) in formatFeaturesByCategory(selectedPlan.features)" :key="categoryName" class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold capitalize mb-2">
                {{ getCategoryIcon(categoryName) }} {{ categoryName }} ({{ category.length }})
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div v-for="feature in category" :key="feature.key" class="flex items-center gap-2">
                  <span class="text-success">✓</span>
                  <span class="text-sm">{{ feature.display }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="Object.keys(formatFeaturesByCategory(selectedPlan.features)).length === 0" class="text-center py-8 text-base-content/60">
            No features configured for this plan
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
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconUsers,
  IconUserPlus,
  IconCalendar,
  IconToggleLeft,
  IconToggleRight,
  IconFileOff,
  IconInfoCircle,
  IconChevronRight
} from '@tabler/icons-vue'
import { useSubscriptionPlans } from '@/composables/subscription/useSubscriptionPlans'
import { useDialog } from '@/composables/core/useApi'
import PlanFormModal from '@/components/subscription/PlanFormModal.vue'

const isDev = import.meta.env.DEV

// Composables
const {
  plans,
  loading,
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  isSuperAdmin,
  formatCurrency,
  formatFeatures,
  formatFeaturesByCategory,
  getEnabledFeaturesCount
} = useSubscriptionPlans()

const dialog = useDialog()

// Local state
const filters = ref({
  search: '',
  isActive: '',
  sortBy: 'sortOrder',
  sortOrder: 'ASC',
  page: 1,
  limit: 10
})

const totalPlans = ref(0)
const totalPages = ref(0)
const editingPlan = ref(null)
const modalLoading = ref(false)
const actionLoading = ref(false)
const planFormModal = ref(null)
const featuresModal = ref(null)
const selectedPlan = ref(null)
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.isActive
})

const hasPlans = computed(() => {
  const result = plans.value && Array.isArray(plans.value) && plans.value.length > 0
  if (isDev) {
    console.log('hasPlans computed:', result, 'plans.value:', plans.value)
  }
  return result
})

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalPlans.value)
  return `Showing ${start}-${end} of ${totalPlans.value} plans`
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
  filters.value[filterKey] = ''
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.isActive = ''
  handleSearch()
}

const loadPlans = async () => {
  try {
    if (isDev) {
      console.log('Loading plans with filters:', filters.value)
    }
    const result = await fetchPlans(filters.value)
    if (isDev) {
      console.log('API Result:', result)
      console.log('Plans value after fetch:', plans.value)
    }
    
    if (result) {
      // Handle direct data array
      if (Array.isArray(result)) {
        totalPlans.value = result.length
        totalPages.value = 1
        if (isDev) {
          console.log('Result is array, length:', result.length)
        }
      }
      // Handle object with data property
      else if (result.data) {
        totalPlans.value = result.total || result.data.length || 0
        totalPages.value = result.totalPages || 1
        if (isDev) {
          console.log('Result has data property, total:', totalPlans.value, 'totalPages:', totalPages.value)
        }
      }
      // Handle empty result
      else {
        totalPlans.value = 0
        totalPages.value = 1
        if (isDev) {
          console.log('Result is empty or unexpected structure')
        }
      }
    } else {
      totalPlans.value = 0
      totalPages.value = 1
      if (isDev) {
        console.log('Result is null/undefined')
      }
    }
    
    if (isDev) {
      console.log('Final state - Total plans:', totalPlans.value, 'Plans array length:', plans.value?.length)
    }
  } catch (error) {
    console.error('Error loading plans:', error)
    totalPlans.value = 0
    totalPages.value = 1
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
      // Update existing plan
      await updatePlan(editingPlan.value.id, planData)
    } else {
      // Create new plan
      await createPlan(planData)
    }
    planFormModal.value?.closeModal()
    editingPlan.value = null
    await loadPlans() // Reload plans after save
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
    await loadPlans() // Reload plans after toggle
  } catch (error) {
    console.error('Error toggling plan status:', error)
  } finally {
    actionLoading.value = false
  }
}

const confirmDeletePlan = async (plan) => {
  const confirmed = await dialog.confirm({
    title: 'Delete Subscription Plan',
    message: `Are you sure you want to delete the plan "${plan.name}"? This action will deactivate the plan.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    actionLoading.value = true
    try {
      await deletePlan(plan.id)
      await loadPlans() // Reload plans after delete
    } catch (error) {
      console.error('Error deleting plan:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

// Show features detail modal
const showFeaturesDetail = (plan) => {
  selectedPlan.value = plan
  featuresModal.value?.showModal()
}

// Get category icon
const getCategoryIcon = (category) => {
  const icons = {
    modules: 'package',
    limits: 'ruler',
    transactions: 'cash',
    payments: 'credit-card',
    printing: 'printer',
    restaurant: 'tools-kitchen',
    integrations: 'plug',
    support: 'lifebuoy'
  }
  return icons[category] || 'settings'
}

// Lifecycle
onMounted(async () => {
  await loadPlans()
})
</script>
