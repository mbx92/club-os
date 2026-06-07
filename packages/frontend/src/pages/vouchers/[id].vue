<route lang="yaml">
meta:
  title: Voucher Details
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVouchers } from '@/composables/gym/voucher-management/useVouchers'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import VoucherFormModal from '@/components/vouchers/VoucherFormModal.vue'
import { 
  IconArrowLeft, 
  IconEdit, 
  IconTrash, 
  IconToggleLeft, 
  IconToggleRight,
  IconTicket,
  IconPercentage,
  IconCash,
  IconCalendar,
  IconUsers,
  IconTrendingUp,
  IconClock,
  IconAlertCircle,
  IconCircleCheck,
  IconWorld,
  IconLock,
  IconChartBar,
  IconReceipt
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { 
  voucher,
  voucherStatistics,
  loading,
  getVoucherById,
  getVoucherStatistics,
  toggleVoucherStatus,
  deleteVoucher
} = useVouchers()

const voucherId = route.params.id
const voucherFormModal = ref(null)
const confirmDialog = ref(null)
const usagePage = ref(1)
const usagePerPage = ref(10)

// Load data
const loadVoucherData = async () => {
  try {
    await Promise.all([
      getVoucherById(voucherId),
      getVoucherStatistics(voucherId, { page: usagePage.value, limit: usagePerPage.value })
    ])
  } catch (error) {
    console.error('Failed to load voucher data:', error)
  }
}

// Toggle status
const handleToggleStatus = async () => {
  if (!voucher.value) return

  const action = voucher.value.isActive ? 'deactivate' : 'activate'
  const confirmed = await confirmDialog.value?.open({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Voucher`,
    message: `Are you sure you want to ${action} this voucher?`,
    confirmText: 'Yes',
    cancelText: 'Cancel',
    confirmButtonClass: voucher.value.isActive ? 'btn-warning' : 'btn-success'
  })

  if (confirmed) {
    try {
      await toggleVoucherStatus(voucherId, !voucher.value.isActive)
      await loadVoucherData()
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }
}

// Delete voucher
const handleDelete = async () => {
  if (!voucher.value) return

  const confirmed = await confirmDialog.value?.open({
    title: 'Delete Voucher',
    message: `Are you sure you want to delete voucher "${voucher.value.name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-error'
  })

  if (confirmed) {
    try {
      await deleteVoucher(voucherId)
      router.push('/vouchers')
    } catch (error) {
      console.error('Failed to delete voucher:', error)
    }
  }
}

// Handle edit modal
const handleOpenEditModal = () => {
  voucherFormModal.value?.openModal()
}

const handleEditModalClose = () => {
  voucherFormModal.value?.closeModal()
}

const handleVoucherSaved = () => {
  voucherFormModal.value?.closeModal()
  loadVoucherData()
}

// Load usage history page
const handleUsagePageChange = (page) => {
  usagePage.value = page
  getVoucherStatistics(voucherId, { page, limit: usagePerPage.value })
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
const voucherStatus = computed(() => {
  if (!voucher.value) return 'unknown'
  
  const now = new Date()
  const startDate = new Date(voucher.value.startDate)
  const endDate = new Date(voucher.value.endDate)

  if (!voucher.value.isActive) return 'inactive'
  if (now < startDate) return 'upcoming'
  if (now > endDate) return 'expired'
  return 'active'
})

// Get status badge class
const statusBadgeClass = computed(() => {
  switch (voucherStatus.value) {
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
})

// Get status label
const statusLabel = computed(() => {
  return voucherStatus.value.charAt(0).toUpperCase() + voucherStatus.value.slice(1)
})

// Check if voucher is expired
const isExpired = computed(() => voucherStatus.value === 'expired')

// Get applicable to label
const applicableToLabel = computed(() => {
  if (!voucher.value) return ''
  const labels = {
    all: 'All Items',
    membership: 'Membership',
    product: 'Product'
  }
  return labels[voucher.value.applicableTo] || voucher.value.applicableTo
})

// Computed usage stats
const usagePercentage = computed(() => {
  if (!voucher.value || !voucher.value.usageLimit) return 0
  return Math.min(100, (voucher.value.usageCount / voucher.value.usageLimit) * 100)
})

const remainingUsage = computed(() => {
  if (!voucherStatistics.value?.statistics) return 'N/A'
  return voucherStatistics.value.statistics.remainingUsage
})

onMounted(() => {
  loadVoucherData()
})
</script>

<template>
  <div>
    <!-- Back Button & Actions -->
    <div class="flex justify-between items-center mb-6">
      <button
        @click="router.push('/vouchers')"
        class="btn btn-ghost"
      >
        <IconArrowLeft :size="20" />
        Back to Vouchers
      </button>

      <div v-if="voucher && !loading" class="flex gap-2">
        <button
          @click="handleOpenEditModal"
          class="btn btn-primary"
          :disabled="isExpired"
        >
          <IconEdit :size="20" />
          Edit
        </button>
        <button
          @click="handleToggleStatus"
          :class="['btn', voucher.isActive ? 'btn-warning' : 'btn-success']"
          :disabled="isExpired"
        >
          <IconToggleRight v-if="voucher.isActive" :size="20" />
          <IconToggleLeft v-else :size="20" />
          {{ voucher.isActive ? 'Deactivate' : 'Activate' }}
        </button>
        <button
          @click="handleDelete"
          class="btn btn-error"
        >
          <IconTrash :size="20" />
          Delete
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !voucher" class="flex justify-center items-center py-20 mb-6">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Content -->
    <template v-else-if="voucher">
      <!-- Header Card -->
      <div class="card bg-base-100 shadow mb-6">
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <IconTicket :size="32" class="text-primary" />
              </div>
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <h1 class="text-3xl font-bold">{{ voucher.name }}</h1>
                  <span :class="['badge badge-lg', statusBadgeClass]">
                    {{ statusLabel }}
                  </span>
                  <span v-if="voucher.isPublic" class="badge badge-sm badge-outline">
                    <IconWorld :size="14" class="mr-1" />
                    Public
                  </span>
                  <span v-else class="badge badge-sm badge-outline">
                    <IconLock :size="14" class="mr-1" />
                    Private
                  </span>
                </div>
                <div class="flex items-center gap-2 text-2xl font-mono font-bold text-primary mb-2">
                  <IconTicket :size="24" />
                  {{ voucher.code }}
                </div>
                <p v-if="voucher.description" class="text-base-content/60 mt-2">
                  {{ voucher.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Voucher Type & Value -->
          <div class="divider"></div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <IconPercentage v-if="voucher.type === 'percentage'" :size="24" class="text-primary" />
                <IconCash v-else :size="24" class="text-primary" />
              </div>
              <div>
                <p class="text-sm text-base-content/60">Discount Type</p>
                <p class="text-xl font-bold">
                  {{ voucher.type === 'percentage' ? 'Percentage' : 'Fixed Amount' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <IconTrendingUp :size="24" class="text-success" />
              </div>
              <div>
                <p class="text-sm text-base-content/60">Discount Value</p>
                <p class="text-xl font-bold text-success">
                  <span v-if="voucher.type === 'percentage'">{{ voucher.value }}%</span>
                  <span v-else>{{ formatCurrency(voucher.value) }}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                <IconReceipt :size="24" class="text-info" />
              </div>
              <div>
                <p class="text-sm text-base-content/60">Applicable To</p>
                <p class="text-xl font-bold">{{ applicableToLabel }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Voucher Details -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconAlertCircle :size="24" />
              Voucher Details
            </h2>

            <div class="space-y-4">
              <!-- Max Discount -->
              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Max Discount Amount</span>
                <span class="font-semibold">{{ formatCurrency(voucher.maxDiscountAmount) || 'No Max Amount' }}</span>
              </div>
 
              <!-- Min Purchase -->
              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Minimum Purchase</span>
                <span class="font-semibold">
                  {{ voucher.minPurchaseAmount > 0 ? formatCurrency(voucher.minPurchaseAmount) : 'No minimum' }}
                </span>
              </div>

              <!-- Valid Period -->
              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Valid From</span>
                <span class="font-semibold">{{ formatDateTime(voucher.startDate) }}</span>
              </div>

              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Valid Until</span>
                <span class="font-semibold">{{ formatDateTime(voucher.endDate) }}</span>
              </div>

              <!-- Usage Limits -->
              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Total Usage Limit</span>
                <span class="font-semibold">
                  {{ voucher.usageLimit || 'Unlimited' }}
                </span>
              </div>

              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Per-User Limit</span>
                <span class="font-semibold">
                  {{ voucher.userUsageLimit || 'Unlimited' }}
                </span>
              </div>

              <!-- Created Info -->
              <div class="flex justify-between items-center py-2 border-b">
                <span class="text-base-content/60">Created By</span>
                <span class="font-semibold">
                  {{ voucher.creator ? `${voucher.creator.firstName} ${voucher.creator.lastName}` : '-' }}
                </span>
              </div>

              <div class="flex justify-between items-center py-2">
                <span class="text-base-content/60">Created At</span>
                <span class="font-semibold">{{ formatDateTime(voucher.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconChartBar :size="24" />
              Usage Statistics
            </h2>

            <div v-if="voucherStatistics" class="space-y-4">
              <!-- Total Usage -->
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-figure text-primary">
                  <IconUsers :size="32" />
                </div>
                <div class="stat-title">Total Usage</div>
                <div class="stat-value text-primary">{{ voucherStatistics.statistics.totalUsage }}</div>
                <div class="stat-desc">
                  {{ voucher.usageLimit ? `Out of ${voucher.usageLimit} available` : 'Unlimited usage' }}
                </div>
              </div>

              <!-- Usage Progress -->
              <div v-if="voucher.usageLimit" class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Usage Progress</span>
                  <span>{{ usagePercentage.toFixed(1) }}%</span>
                </div>
                <progress 
                  class="progress progress-primary w-full" 
                  :value="usagePercentage" 
                  max="100"
                ></progress>
              </div>

              <!-- Total Discount Given -->
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-figure text-success">
                  <IconTrendingUp :size="32" />
                </div>
                <div class="stat-title">Total Discount Given</div>
                <div class="stat-value text-success text-2xl">
                  {{ formatCurrency(voucherStatistics.statistics.totalDiscount) }}
                </div>
              </div>

              <!-- Average Discount -->
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-figure text-info">
                  <IconChartBar :size="32" />
                </div>
                <div class="stat-title">Average Discount</div>
                <div class="stat-value text-info text-2xl">
                  {{ formatCurrency(voucherStatistics.statistics.averageDiscount) }}
                </div>
              </div>

              <!-- Remaining Usage -->
              <div class="stat bg-base-200 rounded-lg">
                <div class="stat-figure text-warning">
                  <IconClock :size="32" />
                </div>
                <div class="stat-title">Remaining Usage</div>
                <div class="stat-value text-warning text-2xl">
                  {{ remainingUsage }}
                </div>
              </div>
            </div>

            <div v-else class="flex justify-center py-8">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage History -->
      <div v-if="voucherStatistics?.usages" class="card bg-base-100 shadow mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconReceipt :size="24" />
            Usage History
          </h2>

          <div v-if="voucherStatistics.usages.length > 0" class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Original Amount</th>
                  <th>Discount</th>
                  <th>Final Amount</th>
                  <th>Applied To</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="usage in voucherStatistics.usages" :key="usage.id">
                  <td>{{ formatDateTime(usage.usedAt) }}</td>
                  <td>
                    <div class="font-medium">
                      {{ usage.user ? `${usage.user.firstName} ${usage.user.lastName}` : '-' }}
                    </div>
                    <div v-if="usage.user" class="text-sm text-base-content/60">
                      {{ usage.user.email }}
                    </div>
                  </td>
                  <td>{{ formatCurrency(usage.originalAmount) }}</td>
                  <td class="text-success font-semibold">-{{ formatCurrency(usage.discountAmount) }}</td>
                  <td class="font-semibold">{{ formatCurrency(usage.finalAmount) }}</td>
                  <td>
                    <span class="badge badge-sm badge-outline">
                      {{ usage.applicableTo || 'N/A' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Usage Pagination -->
            <div v-if="voucherStatistics.pagination.totalPages > 1" class="flex justify-center mt-4">
              <div class="join">
                <button
                  @click="handleUsagePageChange(usagePage - 1)"
                  :disabled="usagePage === 1"
                  class="join-item btn btn-sm"
                >
                  «
                </button>
                
                <template v-for="page in voucherStatistics.pagination.totalPages" :key="page">
                  <button
                    v-if="page === 1 || page === voucherStatistics.pagination.totalPages || (page >= usagePage - 1 && page <= usagePage + 1)"
                    @click="handleUsagePageChange(page)"
                    :class="['join-item btn btn-sm', { 'btn-active': page === usagePage }]"
                  >
                    {{ page }}
                  </button>
                </template>

                <button
                  @click="handleUsagePageChange(usagePage + 1)"
                  :disabled="usagePage === voucherStatistics.pagination.totalPages"
                  class="join-item btn btn-sm"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12">
            <IconReceipt :size="64" class="text-base-content/20 mx-auto mb-4" />
            <p class="text-lg font-semibold">No usage history yet</p>
            <p class="text-base-content/60 mt-1">This voucher hasn't been used by anyone</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow">
      <div class="card-body text-center py-12">
        <IconAlertCircle :size="64" class="text-error mx-auto mb-4" />
        <h2 class="text-2xl font-bold">Voucher Not Found</h2>
        <p class="text-base-content/60 mt-2">The voucher you're looking for doesn't exist or has been deleted.</p>
        <button
          @click="router.push('/gym/vouchers')"
          class="btn btn-primary mt-4"
        >
          Back to Vouchers
        </button>
      </div>
    </div>

    <!-- Edit Modal -->
    <VoucherFormModal
      ref="voucherFormModal"
      :voucher="voucher"
      @close="handleEditModalClose"
      @saved="handleVoucherSaved"
    />

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
