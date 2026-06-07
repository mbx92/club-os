<route lang="yaml">
meta:
  title: Members
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Members</h1>
        <p class="text-base-content/60 mt-1">Manage gym members and their information</p>
      </div>
      <button
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Add Member
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

          <!-- Membership Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Membership</span>
            </label>
            <select v-model="filters.membershipStatus" class="select select-bordered w-full" @change="handleSearch">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <!-- Active Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.isActive" class="select select-bordered w-full" @change="handleSearch">
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
              <option value="joinDate">Join Date</option>
              <option value="membershipStatus">Membership Status</option>
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
            <div v-if="filters.membershipStatus !== 'all'" class="badge badge-primary badge-outline gap-1">
              Membership: {{ filters.membershipStatus }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('membershipStatus')">✕</button>
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

    <!-- Members Table -->
    <div v-else-if="hasMembers" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact</th>
                <th>Gender</th>
                <th>Join Date</th>
                <th class="text-center">Membership</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="member in members"
                :key="member.id"
                :class="{ 'opacity-50': !member.isActive }"
              >
                <!-- Member Info -->
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-primary text-primary-content rounded-full w-12" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                        <span v-if="member.photoUrl">
                          <img :src="member.photoUrl" :alt="formatMemberName(member)" />
                        </span>
                        <span v-else class="text-xl">
                          {{ member.firstName?.charAt(0) }}{{ member.lastName?.charAt(0) }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ formatMemberName(member) }}</div>
                      <div class="text-sm text-base-content/60">ID: {{ member.id.substring(0, 8) }}...</div>
                    </div>
                  </div>
                </td>

                <!-- Contact -->
                <td>
                  <div class="space-y-1">
                    <div v-if="member.email" class="text-sm flex items-center gap-1">
                      <IconMail class="w-4 h-4 text-base-content/60" />
                      {{ member.email }}
                    </div>
                    <div v-if="member.phone" class="text-sm flex items-center gap-1">
                      <IconPhone class="w-4 h-4 text-base-content/60" />
                      {{ member.phone }}
                    </div>
                  </div>
                </td>

                <!-- Gender -->
                <td>
                  <div class="badge badge-ghost badge-sm capitalize">
                    {{ member.gender || '-' }}
                  </div>
                </td>

                <!-- Join Date -->
                <td>
                  <div class="text-sm">{{ formatDate(member.joinDate) }}</div>
                  <div class="text-xs text-base-content/60">{{ formatDateRelative(member.joinDate) }}</div>
                </td>

                <!-- Membership Status -->
                <td class="text-center">
                  <div class="badge badge-sm" :class="getMembershipStatusClass(member.membershipStatus)">
                    {{ getMembershipStatusLabel(member.membershipStatus) }}
                  </div>
                </td>

                <!-- Active Status -->
                <td class="text-center">
                  <input 
                    type="checkbox" 
                    class="toggle toggle-success toggle-sm" 
                    :checked="member.isActive"
                    @change="toggleMemberStatus(member)"
                    :disabled="actionLoading"
                  />
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="View Details"
                      @click="viewMemberDetail(member)"
                      :disabled="actionLoading"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Edit"
                      @click="openEditModal(member)"
                      :disabled="actionLoading"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Reset Password"
                      @click="confirmResetPassword(member)"
                      :disabled="actionLoading"
                    >
                      <IconKey class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error tooltip"
                      data-tip="Delete"
                      @click="confirmDeleteMember(member)"
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
        <h3 class="text-xl font-semibold mb-2">No Members Found</h3>
        <p class="text-base-content/60 mb-4">
          {{ filters.search ? 'Try adjusting your search filters.' : 'Get started by adding your first member.' }}
        </p>
        <button
          v-if="!filters.search"
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Add First Member
        </button>
      </div>
    </div>

    <!-- Member Form Modal -->
    <MemberFormModal
      ref="memberFormModal"
      :member="editingMember"
      :loading="modalLoading"
      @submit="handleMemberSubmit"
      @close="handleModalClose"
    />

    <!-- Credentials Modal -->
    <dialog ref="credentialsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Member Created Successfully</h3>
        
        <div v-if="newMemberCredentials" class="space-y-4">
          <div class="alert alert-success">
            <IconCheck class="w-5 h-5" />
            <span>Member has been created successfully!</span>
          </div>
          
          <div class="space-y-2">
            <p class="text-sm text-base-content/60">Share these credentials with the member:</p>
            
            <div class="form-control flex-col w-full">
                <label class="label">
                  <span class="label-text font-medium">Email/Phone</span>
                </label>
                <input
                  type="text"
                  :value="newMemberCredentials.member?.email || newMemberCredentials.member?.phone"
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
                  :value="newMemberCredentials.credentials?.tempPassword"
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
import { useMembers } from '@/composables/gym/member-management/useMembers'
import { useDialog } from '@/composables/core/useApi'
import MemberFormModal from '@/components/members/MemberFormModal.vue'

// Composables
const {
  members,
  loading,
  fetchMembers,
  createMember,
  updateMember,
  toggleMemberStatus: toggleStatus,
  resetMemberPassword,
  deleteMember,
  formatMemberName,
  getMembershipStatusClass,
  getMembershipStatusLabel
} = useMembers()

const dialog = useDialog()
const router = useRouter()

// Local state
const filters = ref({
  search: '',
  membershipStatus: 'all',
  isActive: 'all',
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  page: 1,
  limit: 10
})

const currentPage = ref(1)
const totalPages = ref(1)
const totalRecords = ref(0)
const editingMember = ref(null)
const modalLoading = ref(false)
const actionLoading = ref(false)
const memberFormModal = ref(null)
const credentialsModal = ref(null)
const newMemberCredentials = ref(null)
let searchTimeout = null

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || 
         filters.value.membershipStatus !== 'all' || 
         filters.value.isActive !== 'all'
})

const hasMembers = computed(() => {
  return members.value && Array.isArray(members.value) && members.value.length > 0
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * filters.value.limit + 1
  const end = Math.min(currentPage.value * filters.value.limit, totalRecords.value)
  return `Showing ${start}-${end} of ${totalRecords.value} members`
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
  await loadMembers()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

const clearFilter = (filterKey) => {
  if (filterKey === 'membershipStatus' || filterKey === 'isActive') {
    filters.value[filterKey] = 'all'
  } else {
    filters.value[filterKey] = ''
  }
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.membershipStatus = 'all'
  filters.value.isActive = 'all'
  handleSearch()
}

const loadMembers = async () => {
  try {
    const result = await fetchMembers(filters.value)
    
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
    console.error('Error loading members:', error)
    totalRecords.value = 0
    totalPages.value = 1
    currentPage.value = 1
  }
}

const changePage = (page) => {
  filters.value.page = page
  currentPage.value = page
  loadMembers()
}

const openCreateModal = () => {
  editingMember.value = null
  memberFormModal.value?.resetForm()
  memberFormModal.value?.openModal()
}

const openEditModal = (member) => {
  editingMember.value = member
  memberFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingMember.value = null
}

const handleMemberSubmit = async (memberData) => {
  modalLoading.value = true
  try {
    if (editingMember.value) {
      // Update existing member
      await updateMember(editingMember.value.id, memberData)
      memberFormModal.value?.closeModal()
    } else {
      // Create new member
      const result = await createMember(memberData)
      memberFormModal.value?.closeModal()
      
      // Show credentials if available
      if (result.credentials) {
        newMemberCredentials.value = result
        credentialsModal.value?.showModal()
      }
    }
    
    editingMember.value = null
    await loadMembers()
  } catch (error) {
    console.error('Error saving member:', error)
  } finally {
    modalLoading.value = false
  }
}

const toggleMemberStatus = async (member) => {
  const newStatus = !member.isActive
  
  actionLoading.value = true
  try {
    await toggleStatus(member.id, newStatus)
    await loadMembers()
  } catch (error) {
    console.error('Error toggling member status:', error)
  } finally {
    actionLoading.value = false
  }
}

const confirmResetPassword = async (member) => {
  const confirmed = await dialog.confirm({
    title: 'Reset Password',
    message: `Are you sure you want to reset the password for "${formatMemberName(member)}"? A new temporary password will be generated.`,
    type: 'warning',
    confirmText: 'Reset Password',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    actionLoading.value = true
    try {
      await resetMemberPassword(member.id)
    } catch (error) {
      console.error('Error resetting password:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

const confirmDeleteMember = async (member) => {
  const confirmed = await dialog.confirm({
    title: 'Delete Member',
    message: `Are you sure you want to delete "${formatMemberName(member)}"? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    actionLoading.value = true
    try {
      await deleteMember(member.id)
      await loadMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
    } finally {
      actionLoading.value = false
    }
  }
}

const viewMemberDetail = (member) => {
  router.push(`/gym/members/${member.id}`)
}

const copyPassword = async () => {
  if (newMemberCredentials.value?.credentials?.tempPassword) {
    try {
      await navigator.clipboard.writeText(newMemberCredentials.value.credentials.tempPassword)
      // Could show a toast notification here
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
  await loadMembers()
})
</script>
