<route lang="yaml">
meta:
  title: Vouchers
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useVouchers } from '@/composables/gym/voucher-management/useVouchers'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import VoucherFormModal from '@/components/vouchers/VoucherFormModal.vue'
import { IconPlus, IconFilter, IconEdit, IconTrash, IconEye, IconToggleLeft, IconToggleRight, IconTicket, IconPercentage, IconCash, IconCalendar, IconUsers, IconClockCheck } from '@tabler/icons-vue'

const router = useRouter()
const { 
  vouchers, 
  loading, 
  pagination,
  fetchVouchers,
  toggleVoucherStatus,
  deleteVoucher
} = useVouchers()

const confirmDialog = ref(null)

// Filters & Search
const filters = ref({
  search: '',
  status: 'all',
  type: '',
  applicableTo: '',
  sortBy: 'createdAt',
  sortOrder: 'DESC'
})

const currentPage = ref(1)
const itemsPerPage = ref(10)

// Modal state
const showFormModal = ref(false)
const editingVoucher = ref(null)
const voucherFormModal = ref(null)

// Status options
const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
  { value: 'upcoming', label: 'Upcoming' }
]

// Type options
const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' }
]

// Applicable to options
const applicableToOptions = [
  { value: '', label: 'All Applications' },
  { value: 'all', label: 'All Items' },
  { value: 'membership', label: 'Membership' },
  { value: 'product', label: 'Product' }
]

// Load vouchers
const loadVouchers = async () => {
  await fetchVouchers({
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: filters.value.search,
    status: filters.value.status,
    type: filters.value.type,
    applicableTo: filters.value.applicableTo,
    sortBy: filters.value.sortBy,
    sortOrder: filters.value.sortOrder
  })
}

// Search handler with debounce
let searchTimeout = null
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadVouchers()
  }, 500)
}

// Filter change handler
const handleFilterChange = () => {
  currentPage.value = 1
  loadVouchers()
}

// Pagination handlers
const handlePageChange = (page) => {
  currentPage.value = page
  loadVouchers()
}

// Modal handlers
const openCreateModal = () => {
  editingVoucher.value = null
  showFormModal.value = true
  nextTick(() => {
    voucherFormModal.value?.openModal()
  })
}

const openEditModal = (voucher) => {
  editingVoucher.value = voucher
  showFormModal.value = true
  nextTick(() => {
    voucherFormModal.value?.openModal()
  })
}

const handleModalClose = () => {
  showFormModal.value = false
  editingVoucher.value = null
}

const handleVoucherSaved = () => {
  showFormModal.value = false
  editingVoucher.value = null
  loadVouchers()
}

// Toggle status
const handleToggleStatus = async (voucher) => {
  const action = voucher.isActive ? 'deactivate' : 'activate'
  const confirmed = await confirmDialog.value?.open({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Voucher`,
    message: `Are you sure you want to ${action} voucher "${voucher.name}"?`,
    confirmText: 'Yes',
    cancelText: 'Cancel',
    confirmButtonClass: voucher.isActive ? 'btn-warning' : 'btn-success'
  })

  if (confirmed) {
    try {
      await toggleVoucherStatus(voucher.id, !voucher.isActive)
      await loadVouchers()
    } catch (error) {
      console.error('Failed to toggle voucher status:', error)
    }
  }
}

// Delete voucher
const handleDelete = async (voucher) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Delete Voucher',
    message: `Are you sure you want to delete voucher "${voucher.name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-error'
  })

  if (confirmed) {
    try {
      await deleteVoucher(voucher.id)
      if (vouchers.value.length === 1 && currentPage.value > 1) {
        currentPage.value--
      }
      await loadVouchers()
    } catch (error) {
      console.error('Failed to delete voucher:', error)
    }
  }
}

// View details
const viewDetails = (voucherId) => {
  // Navigate to voucher detail page (use top-level /vouchers/:id route)
  router.push(`/vouchers/${voucherId}`)
}

// Format currency
const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format date time
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get voucher status
const getVoucherStatus = (voucher) => {
  const now = new Date()
  const startDate = new Date(voucher.startDate)
  const endDate = new Date(voucher.endDate)

  if (!voucher.isActive) return 'inactive'
  if (now < startDate) return 'upcoming'
  if (now > endDate) return 'expired'
  return 'active'
}

// Get status badge class
const getStatusBadgeClass = (voucher) => {
  const status = getVoucherStatus(voucher)
  switch (status) {
    case 'active':
      return 'badge-success'
    case 'inactive':
      return 'badge-error'
    case 'expired':
      return 'badge-neutral'
    case 'upcoming':
      return 'badge-info'
    default:
      return 'badge-ghost'
  }
}

// Get status label
const getStatusLabel = (voucher) => {
  const status = getVoucherStatus(voucher)
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Get type badge class
const getTypeBadgeClass = (type) => {
  return type === 'percentage' ? 'badge-primary' : 'badge-secondary'
}

// Get applicable to badge
const getApplicableToBadge = (applicableTo) => {
  const badges = {
    all: 'All Items',
    membership: 'Membership',
    product: 'Product'
  }
  return badges[applicableTo] || applicableTo
}

// Check if voucher is expired
const isExpired = (voucher) => {
  return getVoucherStatus(voucher) === 'expired'
}

// Check if voucher is upcoming
const isUpcoming = (voucher) => {
  return getVoucherStatus(voucher) === 'upcoming'
}

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.status !== 'all' || 
         filters.value.type !== '' || 
         filters.value.applicableTo !== '' ||
         filters.value.search !== ''
})

const totalPages = computed(() => pagination.value.totalPages || 0)

onMounted(() => {
  loadVouchers()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Vouchers</h1>
        <p class="text-base-content/60 mt-1">Manage discount vouchers for memberships and products</p>
      </div>
      <button 
        @click="openCreateModal"
        class="btn btn-primary"
      >
        <IconPlus :size="20" />
        Create Voucher
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Total Vouchers</p>
              <p class="text-2xl font-bold">{{ pagination.total }}</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconTicket :size="24" class="text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Active</p>
              <p class="text-2xl font-bold text-success">
                {{ vouchers.filter(v => getVoucherStatus(v) === 'active').length }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <IconClockCheck :size="24" class="text-success" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Upcoming</p>
              <p class="text-2xl font-bold text-info">
                {{ vouchers.filter(v => getVoucherStatus(v) === 'upcoming').length }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
              <IconCalendar :size="24" class="text-info" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">Expired</p>
              <p class="text-2xl font-bold text-neutral">
                {{ vouchers.filter(v => getVoucherStatus(v) === 'expired').length }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-full bg-neutral/10 flex items-center justify-center">
              <IconClockCheck :size="24" class="text-neutral" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Search -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search</span>
            </label>
            <div class="input-group">
              <input
                v-model="filters.search"
                @input="handleSearch"
                type="text"
                placeholder="Search by code or name..."
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select
              v-model="filters.status"
              @change="handleFilterChange"
              class="select select-bordered w-full"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Type</span>
            </label>
            <select
              v-model="filters.type"
              @change="handleFilterChange"
              class="select select-bordered w-full"
            >
              <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Applicable To Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Applicable To</span>
            </label>
            <select
              v-model="filters.applicableTo"
              @change="handleFilterChange"
              class="select select-bordered w-full"
            >
              <option v-for="option in applicableToOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Sort -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select
              v-model="filters.sortBy"
              @change="handleFilterChange"
              class="select select-bordered w-full"
            >
              <option value="createdAt">Created Date</option>
              <option value="startDate">Start Date</option>
              <option value="endDate">End Date</option>
              <option value="name">Name</option>
              <option value="usageCount">Usage Count</option>
            </select>
          </div>
        </div>

        <!-- Active Filters Badge -->
        <div v-if="hasActiveFilters" class="mt-4">
          <div class="flex items-center gap-2">
            <IconFilter :size="16" class="text-base-content/60" />
            <span class="text-sm text-base-content/60">Active filters applied</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vouchers Table -->
    <div class="card bg-base-100 shadow">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Applicable To</th>
                <th>Valid Period</th>
                <th>Usage</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Loading State -->
              <tr v-if="loading">
                <td colspan="9" class="text-center py-8">
                  <span class="loading loading-spinner loading-lg"></span>
                  <p class="mt-2 text-base-content/60">Loading vouchers...</p>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="vouchers.length === 0">
                <td colspan="9" class="text-center py-12">
                  <div class="flex flex-col items-center gap-4">
                    <IconTicket :size="64" class="text-base-content/20" />
                    <div>
                      <p class="text-lg font-semibold">No vouchers found</p>
                      <p class="text-base-content/60 mt-1">
                        {{ hasActiveFilters ? 'Try adjusting your filters' : 'Create your first voucher to get started' }}
                      </p>
                    </div>
                    <button 
                      v-if="!hasActiveFilters"
                      @click="openCreateModal"
                      class="btn btn-primary btn-sm"
                    >
                      <IconPlus :size="16" />
                      Create Voucher
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Voucher Rows -->
              <tr v-else v-for="voucher in vouchers" :key="voucher.id">
                <!-- Code -->
                <td>
                  <div class="font-mono font-bold">{{ voucher.code }}</div>
                  <div v-if="!voucher.isPublic" class="badge badge-xs badge-ghost mt-1">Private</div>
                </td>

                <!-- Name -->
                <td>
                  <div class="font-medium">{{ voucher.name }}</div>
                  <div v-if="voucher.description" class="text-sm text-base-content/60 truncate max-w-xs">
                    {{ voucher.description }}
                  </div>
                </td>

                <!-- Type -->
                <td>
                  <span :class="['badge badge-sm', getTypeBadgeClass(voucher.type)]">
                    <IconPercentage v-if="voucher.type === 'percentage'" :size="14" class="mr-1" />
                    <IconCash v-else :size="14" class="mr-1" />
                    {{ voucher.type === 'percentage' ? 'Percentage' : 'Fixed' }}
                  </span>
                </td>

                <!-- Value -->
                <td>
                  <div class="font-semibold">
                    <span v-if="voucher.type === 'percentage'">{{ voucher.value }}%</span>
                    <span v-else>{{ formatCurrency(voucher.value) }}</span>
                  </div>
                  <div v-if="voucher.maxDiscountAmount" class="text-xs text-base-content/60">
                    Max: {{ formatCurrency(voucher.maxDiscountAmount) }}
                  </div>
                  <div v-if="voucher.minPurchaseAmount > 0" class="text-xs text-base-content/60">
                    Min: {{ formatCurrency(voucher.minPurchaseAmount) }}
                  </div>
                </td>

                <!-- Applicable To -->
                <td>
                  <span class="badge badge-sm badge-outline">
                    {{ getApplicableToBadge(voucher.applicableTo) }}
                  </span>
                </td>

                <!-- Valid Period -->
                <td>
                  <div class="text-sm">
                    <div>{{ formatDate(voucher.startDate) }}</div>
                    <div class="text-base-content/60">to {{ formatDate(voucher.endDate) }}</div>
                  </div>
                </td>

                <!-- Usage -->
                <td>
                  <div class="flex items-center gap-2">
                    <IconUsers :size="16" class="text-base-content/60" />
                    <span>{{ voucher.usageCount || 0 }}</span>
                    <span v-if="voucher.usageLimit" class="text-base-content/60">
                      / {{ voucher.usageLimit }}
                    </span>
                    <span v-else class="text-base-content/60">/ ∞</span>
                  </div>
                  <div v-if="voucher.userUsageLimit" class="text-xs text-base-content/60 mt-1">
                    {{ voucher.userUsageLimit }}x per user
                  </div>
                </td>

                <!-- Status -->
                <td>
                  <span :class="['badge badge-sm', getStatusBadgeClass(voucher)]">
                    {{ getStatusLabel(voucher) }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      @click="viewDetails(voucher.id)"
                      class="btn btn-ghost btn-sm"
                      title="View Details"
                    >
                      <IconEye :size="18" />
                    </button>
                    
                    <button
                      @click="openEditModal(voucher)"
                      class="btn btn-ghost btn-sm"
                      title="Edit"
                      :disabled="isExpired(voucher)"
                    >
                      <IconEdit :size="18" />
                    </button>

                    <button
                      @click="handleToggleStatus(voucher)"
                      class="btn btn-ghost btn-sm"
                      :title="voucher.isActive ? 'Deactivate' : 'Activate'"
                      :disabled="isExpired(voucher)"
                    >
                      <IconToggleRight v-if="voucher.isActive" :size="18" class="text-success" />
                      <IconToggleLeft v-else :size="18" class="text-error" />
                    </button>

                    <button
                      @click="handleDelete(voucher)"
                      class="btn btn-ghost btn-sm text-error"
                      title="Delete"
                    >
                      <IconTrash :size="18" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && vouchers.length > 0" class="flex justify-between items-center p-4 border-t">
          <div class="text-sm text-base-content/60">
            Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to 
            {{ Math.min(currentPage * itemsPerPage, pagination.total) }} of 
            {{ pagination.total }} vouchers
          </div>

          <div class="join">
            <button
              @click="handlePageChange(currentPage - 1)"
              :disabled="currentPage === 1"
              class="join-item btn btn-sm"
            >
              «
            </button>
            
            <template v-for="page in totalPages" :key="page">
              <button
                v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
                @click="handlePageChange(page)"
                :class="['join-item btn btn-sm', { 'btn-active': page === currentPage }]"
              >
                {{ page }}
              </button>
              <button
                v-else-if="page === currentPage - 2 || page === currentPage + 2"
                class="join-item btn btn-sm btn-disabled"
              >
                ...
              </button>
            </template>

            <button
              @click="handlePageChange(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="join-item btn btn-sm"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Voucher Form Modal -->
    <VoucherFormModal
      ref="voucherFormModal"
      v-if="showFormModal"
      :voucher="editingVoucher"
      @close="handleModalClose"
      @saved="handleVoucherSaved"
    />

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
