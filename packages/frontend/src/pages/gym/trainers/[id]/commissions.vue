<route lang="yaml">
meta:
  title: Trainer Commissions
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTrainerCommissions } from '@/composables/gym/trainer-management/useTrainerCommissions'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import dayjs from 'dayjs'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconDownload,
  IconCash,
  IconCheck,
  IconClock,
  IconReceipt,
  IconUser,
  IconMail,
  IconPhone
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const trainerId = route.params.id

const { 
  commissions,
  loading,
  error,
  getTrainerCommissions,
  payCommission,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel
} = useTrainerCommissions()

const { trainer, getTrainerById } = useTrainers()

// Filters
const dateRange = ref({
  start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
  end: dayjs().format('YYYY-MM-DD')
})
const filters = ref({
  status: 'all',
  sortBy: 'date',
  sortOrder: 'desc'
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const totalCommissions = ref(0)

// Summary
const summary = computed(() => {
  if (!commissions.value || commissions.value.length === 0) {
    return {
      totalAmount: 0,
      paidAmount: 0,
      paidCount: 0,
      pendingAmount: 0,
      pendingCount: 0
    }
  }

  return {
    totalAmount: commissions.value.reduce((sum, c) => sum + c.commissionAmount, 0),
    paidAmount: commissions.value.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0),
    paidCount: commissions.value.filter(c => c.status === 'paid').length,
    pendingAmount: commissions.value.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0),
    pendingCount: commissions.value.filter(c => c.status === 'pending').length
  }
})

// Methods
const loadTrainer = async () => {
  try {
    await getTrainerById(trainerId)
  } catch (err) {
    console.error('Failed to load trainer:', err)
  }
}

const loadData = async () => {
  try {
    const response = await getTrainerCommissions(trainerId, {
      page: currentPage.value,
      limit: pageSize.value,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      ...filters.value
    })
    
    if (response) {
      totalPages.value = response.pagination.totalPages
      totalCommissions.value = response.pagination.total
    }
  } catch (err) {
    console.error('Failed to load commissions:', err)
  }
}

const handlePageChange = (page) => {
  currentPage.value = page
  loadData()
}

const handlePayCommission = async (commissionId) => {
  if (!confirm('Mark this commission as paid?')) return
  
  try {
    await payCommission(trainerId, commissionId, {
      paymentMethod: 'transfer',
      paymentNote: 'Paid via trainer commission system'
    })
    await loadData() // Reload data
  } catch (err) {
    console.error('Failed to pay commission:', err)
  }
}

const handleExport = () => {
  if (!commissions.value || commissions.value.length === 0) return
  
  const exportData = commissions.value.map(item => ({
    Date: formatDateTime(item.createdAt),
    Transaction: item.transaction?.transactionNumber || '-',
    'Transaction Amount': formatCurrency(item.transaction?.totalAmount || 0),
    'Commission Amount': formatCurrency(item.commissionAmount),
    Notes: item.notes || '-',
    Status: getStatusLabel(item.status),
    'Paid At': item.paidAt ? formatDateTime(item.paidAt) : '-'
  }))
  
  // Convert to CSV
  const headers = Object.keys(exportData[0])
  const csv = [
    headers.join(','),
    ...exportData.map(row => headers.map(h => `"${row[h]}"`).join(','))
  ].join('\n')
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `trainer-${trainerId}-commissions-${dayjs().format('YYYY-MM-DD')}.csv`
  link.click()
}

const resetFilters = () => {
  filters.value = {
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  }
  dateRange.value = {
    start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  }
  currentPage.value = 1
  loadData()
}

const goBack = () => {
  router.push('/gym/reports/trainer-commissions')
}

watch([dateRange, filters], () => {
  currentPage.value = 1
  loadData()
}, { deep: true })

onMounted(() => {
  loadTrainer()
  loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="goBack">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Trainer Commissions</h1>
        <p class="text-base-content/60 mt-1">
          {{ trainer?.name || 'Loading...' }}
        </p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button 
        class="btn btn-primary btn-sm" 
        @click="handleExport" 
        :disabled="!commissions || commissions.length === 0"
      >
        <IconDownload class="w-4 h-4 mr-1" />
        Export
      </button>
    </div>

    <!-- Trainer Info Card -->
    <div v-if="trainer" class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body">
        <div class="flex items-center gap-4">
          <div class="avatar placeholder">
            <div class="bg-primary text-primary-content w-16 rounded-full" style="display: flex !important; align-items: center !important; justify-content: center !important;">
              <span class="text-2xl">{{ trainer.name.charAt(0) }}</span>
            </div>
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold">{{ trainer.name }}</h2>
            <div class="flex gap-4 mt-2 text-sm text-base-content/60">
              <div class="flex items-center gap-1">
                <IconMail class="w-4 h-4" />
                {{ trainer.email }}
              </div>
              <div v-if="trainer.phone" class="flex items-center gap-1">
                <IconPhone class="w-4 h-4" />
                {{ trainer.phone }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Total Commissions -->
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm mb-1">Total Commissions</p>
              <h3 class="text-2xl font-bold">{{ totalCommissions }}</h3>
              <p class="text-blue-100 text-xs mt-1">All time</p>
            </div>
            <IconReceipt class="w-12 h-12 opacity-50" />
          </div>
        </div>
      </div>

      <!-- Total Amount -->
      <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-100 text-sm mb-1">Total Amount</p>
              <h3 class="text-xl font-bold">{{ formatCurrency(summary.totalAmount) }}</h3>
            </div>
            <IconCash class="w-12 h-12 opacity-50" />
          </div>
        </div>
      </div>

      <!-- Paid -->
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm mb-1">Paid</p>
              <h3 class="text-xl font-bold">{{ formatCurrency(summary.paidAmount) }}</h3>
              <p class="text-green-100 text-xs mt-1">{{ summary.paidCount }} items</p>
            </div>
            <IconCheck class="w-12 h-12 opacity-50" />
          </div>
        </div>
      </div>

      <!-- Pending -->
      <div class="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-100 text-sm mb-1">Pending</p>
              <h3 class="text-xl font-bold">{{ formatCurrency(summary.pendingAmount) }}</h3>
              <p class="text-orange-100 text-xs mt-1">{{ summary.pendingCount }} items</p>
            </div>
            <IconClock class="w-12 h-12 opacity-50" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body">
        <div class="flex items-center gap-2 mb-4">
          <IconFilter class="w-5 h-5 text-base-content/60" />
          <h2 class="text-lg font-semibold">Filters</h2>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Date Range -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Start Date</span>
            </label>
            <input 
              type="date" 
              class="input input-bordered input-sm" 
              v-model="dateRange.start"
            />
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input 
              type="date" 
              class="input input-bordered input-sm" 
              v-model="dateRange.end"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select class="select select-bordered select-sm" v-model="filters.status">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Sort By</span>
            </label>
            <select class="select select-bordered select-sm" v-model="filters.sortBy">
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button class="btn btn-ghost btn-sm btn-circle" @click="resetFilters">
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Commissions Table -->
    <div v-else class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Commission History</h2>
          <div class="badge badge-ghost">
            Page {{ currentPage }} of {{ totalPages }}
          </div>
        </div>

        <div v-if="!commissions || commissions.length === 0" class="text-center py-12 text-base-content/60">
          <IconReceipt class="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No commissions found for selected period</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Service Type</th>
                <th class="text-right">Service Amount</th>
                <th class="text-center">Rate</th>
                <th class="text-right">Commission</th>
                <th class="text-center">Status</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="commission in commissions" :key="commission.id" class="hover">
                <td>
                  <div class="text-sm">{{ formatDate(commission.date) }}</div>
                  <div class="text-xs text-base-content/60">
                    {{ formatDateTime(commission.createdAt).split(' ')[1] }}
                  </div>
                </td>
                <td>
                  <div class="font-medium">{{ commission.serviceName }}</div>
                  <div v-if="commission.member" class="text-xs text-base-content/60">
                    {{ commission.member.name }}
                  </div>
                </td>
                <td>
                  <div class="badge badge-outline badge-sm">
                    {{ commission.serviceType }}
                  </div>
                </td>
                <td class="text-right">
                  <div class="font-semibold">{{ formatCurrency(commission.serviceAmount) }}</div>
                </td>
                <td class="text-center">
                  <div class="badge badge-ghost badge-sm">
                    {{ commission.commissionRate }}%
                  </div>
                </td>
                <td class="text-right">
                  <div class="font-bold text-purple-600">
                    {{ formatCurrency(commission.commissionAmount) }}
                  </div>
                </td>
                <td class="text-center">
                  <div 
                    class="badge badge-sm" 
                    :class="{
                      'badge-warning': commission.status === 'pending',
                      'badge-success': commission.status === 'paid'
                    }"
                  >
                    {{ getStatusLabel(commission.status) }}
                  </div>
                </td>
                <td class="text-center">
                  <button 
                    v-if="commission.status === 'pending'"
                    class="btn btn-success btn-xs"
                    @click="handlePayCommission(commission.id)"
                  >
                    <IconCheck class="w-3 h-3 mr-1" />
                    Pay
                  </button>
                  <span v-else class="text-xs text-base-content/60">
                    {{ formatDate(commission.paidAt) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center mt-6">
          <div class="join">
            <button 
              class="join-item btn btn-sm"
              :disabled="currentPage === 1"
              @click="handlePageChange(currentPage - 1)"
            >
              «
            </button>
            <button 
              v-for="page in totalPages" 
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === currentPage }"
              @click="handlePageChange(page)"
            >
              {{ page }}
            </button>
            <button 
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="handlePageChange(currentPage + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table th {
  background-color: var(--color-base-200);
}
</style>
