<route lang="yaml">
meta:
  title: Instructors
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Instructors</h1>
        <p class="text-base-content/60 mt-1">Manage gym instructors and trainers</p>
      </div>
      <button
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Add Instructor
      </button>
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
              placeholder="Search by name, email, or phone..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- Specialization Filter -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Specialization</span>
            </label>
            <select v-model="filters.specialization" class="select select-bordered w-full" @change="handleSearch">
              <option value="">All Specializations</option>
              <option value="yoga">Yoga</option>
              <option value="personal_training">Personal Training</option>
              <option value="spinning">Spinning</option>
              <option value="boxing">Boxing</option>
              <option value="pilates">Pilates</option>
              <option value="crossfit">CrossFit</option>
              <option value="zumba">Zumba</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Sort By</span>
            </label>
            <select v-model="filters.sortBy" class="select select-bordered w-full" @change="handleSearch">
              <option value="createdAt">Created Date</option>
              <option value="firstName">First Name</option>
              <option value="lastName">Last Name</option>
              <option value="hireDate">Hire Date</option>
            </select>
          </div>

          <!-- Sort Order -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Order</span>
            </label>
            <select v-model="filters.sortOrder" class="select select-bordered w-full" @change="handleSearch">
              <option value="ASC">↑</option>
              <option value="DESC">↓</option>
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
            <div v-if="filters.specialization" class="badge badge-primary badge-outline gap-1">
              Specialization: {{ filters.specialization.replace('_', ' ') }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('specialization')">✕</button>
            </div>
            <div v-if="filters.status !== 'all'" class="badge badge-outline gap-1" :class="filters.status === 'active' ? 'badge-success' : 'badge-error'">
              Status: {{ filters.status === 'active' ? 'Aktif' : 'Non-Aktif' }}
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

    <!-- Instructors Table -->
    <div v-else-if="hasTrainers" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Contact</th>
                <th>Specializations</th>
                <th>Commission</th>
                <th>Hire Date</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="trainer in trainers"
                :key="trainer.id"
                :class="{ 'opacity-50': !trainer.isActive }"
              >
                <!-- Instructor Info -->
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-primary text-primary-content rounded-full w-12" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                        <span v-if="trainer.photoUrl">
                          <img :src="trainer.photoUrl" :alt="formatTrainerName(trainer)" />
                        </span>
                        <span v-else class="text-xl">
                          {{ trainer.firstName?.charAt(0) }}{{ trainer.lastName?.charAt(0) }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ formatTrainerName(trainer) }}</div>
                      <div class="text-sm text-base-content/60">ID: {{ trainer.id.substring(0, 8) }}...</div>
                    </div>
                  </div>
                </td>

                <!-- Contact -->
                <td>
                  <div class="space-y-1">
                    <div v-if="trainer.email" class="text-sm flex items-center gap-1">
                      <IconMail class="w-4 h-4 text-base-content/60" />
                      {{ trainer.email }}
                    </div>
                    <div v-if="trainer.phone" class="text-sm flex items-center gap-1">
                      <IconPhone class="w-4 h-4 text-base-content/60" />
                      {{ trainer.phone }}
                    </div>
                  </div>
                </td>

                <!-- Specializations -->
                <td>
                  <div class="flex flex-wrap gap-1">
                    <div 
                      v-for="spec in trainer.specializations?.slice(0, 2)" 
                      :key="spec"
                      class="badge badge-sm badge-ghost capitalize"
                    >
                      {{ spec.replace(/_/g, ' ') }}
                    </div>
                    <div 
                      v-if="trainer.specializations?.length > 2"
                      class="badge badge-sm badge-outline"
                    >
                      +{{ trainer.specializations.length - 2 }}
                    </div>
                  </div>
                </td>

                <!-- Commission -->
                <td>
                  <div class="text-sm">
                    <div class="font-medium">{{ formatCommissionValue(trainer.commissionValue, trainer.commissionType) }}</div>
                    <div class="text-xs text-base-content/60 capitalize">{{ trainer.commissionType?.replace(/_/g, ' ') }}</div>
                  </div>
                </td>

                <!-- Hire Date -->
                <td>
                  <div class="text-sm">{{ formatDate(trainer.hireDate) }}</div>
                  <div class="text-xs text-base-content/60">{{ formatDateRelative(trainer.hireDate) }}</div>
                </td>

                <!-- Active Status -->
                <td class="text-center">
                  <input 
                    type="checkbox" 
                    class="toggle toggle-success toggle-sm" 
                    :checked="trainer.isActive"
                    @change="toggleTrainerStatusHandler(trainer)"
                    :disabled="actionLoading"
                  />
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                      @click="viewTrainerDetail(trainer)"
                      :disabled="actionLoading"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Edit"
                      @click="openEditModal(trainer)"
                      :disabled="actionLoading"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Reset Password"
                      @click="confirmResetPassword(trainer)"
                      :disabled="actionLoading"
                    >
                      <IconKey class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error tooltip"
                      data-tip="Delete"
                      @click="confirmDeleteTrainer(trainer)"
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
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              «
            </button>
            <button
              v-for="page in visiblePages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === currentPage }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="changePage(currentPage + 1)"
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
        <IconUserOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Instructors Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search ? 'Try adjusting your search filters.' : 'Get started by adding your first instructor.' }}
        </p>
        <button
          v-if="!filters.search"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Add First Instructor
        </button>
      </div>
    </div>

    <!-- Trainer Form Modal -->
    <TrainerFormModal
      ref="trainerFormModal"
      :trainer="editingTrainer"
      :loading="modalLoading"
      @submit="handleTrainerSubmit"
      @close="handleModalClose"
    />

    <!-- Credentials Modal -->
    <dialog ref="credentialsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Instructor Created Successfully</h3>
        
        <div v-if="newTrainerCredentials" class="space-y-4">
          <div class="alert alert-success">
            <IconCheck class="w-5 h-5" />
            <span>Instructor has been created successfully!</span>
          </div>
          
          <div class="space-y-2">
            <p class="text-sm text-base-content/60">Share these credentials with the instructor:</p>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Email/Phone</span>
              </label>
              <input
                type="text"
                :value="newTrainerCredentials.trainer?.email || newTrainerCredentials.trainer?.phone"
                class="input input-bordered w-full"
                readonly
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Temporary Password</span>
              </label>
              <div class="join w-full">
                <input
                  type="text"
                  :value="newTrainerCredentials.credentials?.tempPassword"
                  class="input input-bordered join-item flex-1"
                  readonly
                />
                <button
                  class="btn join-item"
                  @click="copyPassword"
                >
                  <IconCopy class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div class="alert alert-warning">
            <IconAlertTriangle class="w-5 h-5" />
            <span class="text-sm">Please save these credentials. The password cannot be retrieved later.</span>
          </div>
        </div>
        
        <div class="modal-action">
          <form method="dialog">
            <button class="btn">Close</button>
          </form>
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
import { useRouter } from 'vue-router'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconKey,
  IconMail,
  IconPhone,
  IconUserOff,
  IconCheck,
  IconCopy,
  IconAlertTriangle
} from '@tabler/icons-vue'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useDialog } from '@/composables/core/useApi'
import TrainerFormModal from '@/components/instructors/TrainerFormModal.vue'

// Composables
const {
  trainers,
  loading,
  fetchTrainers,
  createTrainer,
  updateTrainer,
  toggleTrainerStatus,
  resetTrainerPassword,
  deleteTrainer,
  formatTrainerName,
  formatCommissionValue
} = useTrainers()

const dialog = useDialog()
const router = useRouter()

// Local state
const filters = ref({
  search: '',
  specialization: '',
  status: 'all',
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  page: 1,
  limit: 10
})

const currentPage = ref(1)
const totalPages = ref(1)
const totalRecords = ref(0)
const editingTrainer = ref(null)
const modalLoading = ref(false)
const actionLoading = ref(false)
const trainerFormModal = ref(null)
const credentialsModal = ref(null)
const newTrainerCredentials = ref(null)
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || 
         filters.value.specialization || 
         filters.value.status !== 'all'
})

const hasTrainers = computed(() => {
  return trainers.value && Array.isArray(trainers.value) && trainers.value.length > 0
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * filters.value.limit + 1
  const end = Math.min(currentPage.value * filters.value.limit, totalRecords.value)
  return `Showing ${start}-${end} of ${totalRecords.value} instructors`
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages.value, startPage + maxVisible - 1)
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  
  return pages
})

// Methods
const handleSearch = async () => {
  filters.value.page = 1
  currentPage.value = 1
  await loadTrainers()
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
  filters.value.specialization = ''
  filters.value.status = 'all'
  handleSearch()
}

const loadTrainers = async () => {
  try {
    const result = await fetchTrainers(filters.value)
    
    if (result) {
      if (result.pagination) {
        currentPage.value = result.pagination.currentPage
        totalPages.value = result.pagination.totalPages
        totalRecords.value = result.pagination.totalRecords
      } else if (Array.isArray(result)) {
        totalRecords.value = result.length
        totalPages.value = 1
        currentPage.value = 1
      }
    }
  } catch (error) {
    console.error('Error loading trainers:', error)
    totalRecords.value = 0
    totalPages.value = 1
    currentPage.value = 1
  }
}

const changePage = (page) => {
  filters.value.page = page
  currentPage.value = page
  loadTrainers()
}

const openCreateModal = () => {
  editingTrainer.value = null
  trainerFormModal.value?.resetForm()
  trainerFormModal.value?.openModal()
}

const openEditModal = (trainer) => {
  editingTrainer.value = trainer
  trainerFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingTrainer.value = null
}

const handleTrainerSubmit = async (trainerData) => {
  modalLoading.value = true
  try {
    if (editingTrainer.value) {
      // Update existing trainer
      await updateTrainer(editingTrainer.value.id, trainerData)
      trainerFormModal.value?.closeModal()
    } else {
      // Create new trainer
      const result = await createTrainer(trainerData)
      trainerFormModal.value?.closeModal()
      
      // Show credentials if available
      if (result.credentials) {
        newTrainerCredentials.value = result
        credentialsModal.value?.showModal()
      }
    }
    
    editingTrainer.value = null
    await loadTrainers()
  } catch (error) {
    console.error('Error saving trainer:', error)
  } finally {
    modalLoading.value = false
  }
}

const toggleTrainerStatusHandler = async (trainer) => {
  const newStatus = !trainer.isActive
  
  actionLoading.value = true
  try {
    await toggleTrainerStatus(trainer.id, newStatus)
    await loadTrainers()
  } catch (error) {
    console.error('Error toggling trainer status:', error)
  } finally {
    actionLoading.value = false
  }
}

const confirmResetPassword = async (trainer) => {
  const confirmed = await dialog.confirm({
    title: 'Reset Password',
    message: `Are you sure you want to reset the password for "${formatTrainerName(trainer)}"? A new temporary password will be generated.`,
    type: 'warning',
    confirmText: 'Reset Password',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    actionLoading.value = true
    try {
      await resetTrainerPassword(trainer.id)
    } catch (error) {
      console.error('Error resetting password:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

const confirmDeleteTrainer = async (trainer) => {
  const confirmed = await dialog.confirm({
    title: 'Delete Instructor',
    message: `Are you sure you want to delete "${formatTrainerName(trainer)}"? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    actionLoading.value = true
    try {
      await deleteTrainer(trainer.id)
      await loadTrainers()
    } catch (error) {
      console.error('Error deleting trainer:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

const viewTrainerDetail = (trainer) => {
  router.push(`/gym/instructors/${trainer.id}`)
}

const copyPassword = async () => {
  if (newTrainerCredentials.value?.credentials?.tempPassword) {
    try {
      await navigator.clipboard.writeText(newTrainerCredentials.value.credentials.tempPassword)
    } catch (error) {
      console.error('Failed to copy password:', error)
    }
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateRelative = (date) => {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diffTime = Math.abs(now - then)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Lifecycle
onMounted(async () => {
  await loadTrainers()
})
</script>
