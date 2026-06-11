<route lang="yaml">
meta:
  title: Trainer Commission Report
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainerCommissions } from '@/composables/gym/trainer-management/useTrainerCommissions'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import dayjs from 'dayjs'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconDownload,
  IconCash,
  IconUsers,
  IconChartBar,
  IconClock,
  IconCheck,
  IconUserDollar
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  reportData,
  loading,
  error,
  getCommissionReport,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel
} = useTrainerCommissions()

const { trainers, fetchTrainers } = useTrainers()

// Filters
const dateRange = ref({
  start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
  end: dayjs().format('YYYY-MM-DD')
})
const filters = ref({
  status: 'all',
  trainerId: '',
  groupBy: '',
  sortBy: 'date',
  sortOrder: 'desc'
})

// Computed
const summary = computed(() => reportData.value?.summary || {
  totalTrainers: 0,
  totalCommissions: 0,
  totalAmount: 0,
  paidAmount: 0,
  paidCount: 0,
  pendingAmount: 0,
  pendingCount: 0
})

const byTrainer = computed(() => reportData.value?.byTrainer || [])
const timeSeries = computed(() => reportData.value?.timeSeries || null)
const recentCommissions = computed(() => reportData.value?.recentCommissions || [])

// Methods
const loadData = async () => {
  try {
    const result = await getCommissionReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      ...filters.value
    })
  } catch (err) {
    console.error('Failed to load commission report:', err)
  }
}

const loadTrainers = async () => {
  try {
    await fetchTrainers({ limit: 100 })
  } catch (err) {
    console.error('Failed to load trainers:', err)
  }
}

const handleExport = () => {
  if (!byTrainer.value.length) return
  
  const exportData = byTrainer.value.map(item => ({
    Trainer: `${item.trainer.firstName || ''} ${item.trainer.lastName || ''}`.trim() || item.trainer.name || '-',
    Email: item.trainer.email,
    'Total Amount': formatCurrency(item.totalAmount),
    'Paid Amount': formatCurrency(item.paidAmount),
    'Paid Count': item.paidCount,
    'Pending Amount': formatCurrency(item.pendingAmount),
    'Pending Count': item.pendingCount
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
  link.download = `trainer-commissions-${dayjs().format('YYYY-MM-DD')}.csv`
  link.click()
}

const viewTrainerDetails = (trainerId) => {
  router.push(`/gym/trainers/${trainerId}/commissions`)
}

const resetFilters = () => {
  filters.value = {
    status: 'all',
    trainerId: '',
    groupBy: '',
    sortBy: 'date',
    sortOrder: 'desc'
  }
  dateRange.value = {
    start: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  }
  loadData()
}

watch([dateRange, filters], () => {
  loadData()
}, { deep: true })

onMounted(() => {
  loadData()
  loadTrainers()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Trainer Commission Report</h1>
        <p class="text-base-content/60 mt-1">Track and analyze trainer commissions</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!byTrainer.length">
        <IconDownload class="w-4 h-4 mr-1" />
        Export
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body">
        <div class="flex items-center gap-2 mb-4">
          <IconFilter class="w-5 h-5 text-base-content/60" />
          <h2 class="text-lg font-semibold">Filters</h2>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

          <!-- Trainer Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Trainer</span>
            </label>
            <select class="select select-bordered select-sm" v-model="filters.trainerId">
              <option value="">All Trainers</option>
              <option 
                v-for="trainer in trainers" 
                :key="trainer.id" 
                :value="trainer.id"
              >
                {{ trainer.firstName }} {{ trainer.lastName }}
              </option>
            </select>
          </div>

          <!-- Group By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Group By</span>
            </label>
            <select class="select select-bordered select-sm" v-model="filters.groupBy">
              <option value="">No Grouping</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
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

    <!-- Content -->
    <div v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Total Trainers -->
        <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-blue-100 text-sm mb-1">Total Trainers</p>
                <h3 class="text-3xl font-bold">{{ summary.totalTrainers }}</h3>
                <p class="text-blue-100 text-xs mt-1">
                  {{ summary.totalCommissions }} commissions
                </p>
              </div>
              <IconUsers class="w-12 h-12 opacity-50" />
            </div>
          </div>
        </div>

        <!-- Total Amount -->
        <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-purple-100 text-sm mb-1">Total Commission</p>
                <h3 class="text-2xl font-bold">{{ formatCurrency(summary.totalAmount) }}</h3>
                <p class="text-purple-100 text-xs mt-1">All time</p>
              </div>
              <IconCash class="w-12 h-12 opacity-50" />
            </div>
          </div>
        </div>

        <!-- Paid Amount -->
        <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-green-100 text-sm mb-1">Paid</p>
                <h3 class="text-2xl font-bold">{{ formatCurrency(summary.paidAmount) }}</h3>
                <p class="text-green-100 text-xs mt-1">
                  {{ summary.paidCount }} commissions
                </p>
              </div>
              <IconCheck class="w-12 h-12 opacity-50" />
            </div>
          </div>
        </div>

        <!-- Pending Amount -->
        <div class="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-orange-100 text-sm mb-1">Pending</p>
                <h3 class="text-2xl font-bold">{{ formatCurrency(summary.pendingAmount) }}</h3>
                <p class="text-orange-100 text-xs mt-1">
                  {{ summary.pendingCount }} commissions
                </p>
              </div>
              <IconClock class="w-12 h-12 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      <!-- Commission by Trainer -->
      <div class="card bg-base-100 shadow-sm mb-6">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <IconUserDollar class="w-5 h-5 text-base-content/60" />
              <h2 class="text-lg font-semibold">Commission by Trainer</h2>
            </div>
            <div class="badge badge-ghost">{{ byTrainer.length }} trainers</div>
          </div>

          <div v-if="byTrainer.length === 0" class="text-center py-12 text-base-content/60">
            <IconChartBar class="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No commission data available for selected period</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Trainer</th>
                  <th class="text-center">Commission Type</th>
                  <th class="text-right">Total Amount</th>
                  <th class="text-right">Paid</th>
                  <th class="text-right">Pending</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in byTrainer" :key="item.trainer.id" class="hover">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="avatar placeholder">
                        <div class="bg-primary text-primary-content w-10 rounded-full" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                          <span class="text-sm">{{ (item.trainer.firstName || item.trainer.name || '?').charAt(0) }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="font-semibold">{{ item.trainer.firstName ? `${item.trainer.firstName} ${item.trainer.lastName || ''}`.trim() : item.trainer.name }}</div>
                        <div class="text-xs text-base-content/60">{{ item.trainer.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <div 
                      class="badge badge-sm" 
                      :class="{
                        'badge-success': item.trainer.commissionType === 'percentage',
                        'badge-info': item.trainer.commissionType === 'fixed'
                      }"
                    >
                      {{ item.trainer.commissionType === 'percentage' 
                        ? `${item.trainer.commissionValue}%` 
                        : formatCurrency(item.trainer.commissionValue) 
                      }}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="font-semibold text-purple-600">
                      {{ formatCurrency(item.totalAmount) }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      {{ item.totalCount }} commissions
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="font-semibold text-green-600">
                      {{ formatCurrency(item.paidAmount) }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      {{ item.paidCount }} items
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="font-semibold text-orange-600">
                      {{ formatCurrency(item.pendingAmount) }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      {{ item.pendingCount }} items
                    </div>
                  </td>
                  <td class="text-center">
                    <button 
                      class="btn btn-ghost btn-xs"
                      @click="viewTrainerDetails(item.trainer.id)"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Recent Commissions -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <IconClock class="w-5 h-5 text-base-content/60" />
              <h2 class="text-lg font-semibold">Recent Commissions</h2>
            </div>
            <div class="badge badge-ghost">Last 100</div>
          </div>

          <div v-if="recentCommissions.length === 0" class="text-center py-12 text-base-content/60">
            <IconClock class="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No recent commissions</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trainer</th>
                  <th>Transaction</th>
                  <th class="text-right">Commission</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="commission in recentCommissions" :key="commission.id" class="hover">
                  <td>
                    <div class="text-sm">{{ formatDateTime(commission.createdAt) }}</div>
                  </td>
                  <td>
                    <div class="font-medium">{{ commission.trainer.firstName ? `${commission.trainer.firstName} ${commission.trainer.lastName || ''}`.trim() : commission.trainer.name }}</div>
                  </td>
                  <td>
                    <div class="text-sm">{{ commission.transaction?.transactionNumber || '-' }}</div>
                    <div class="text-xs text-base-content/60">
                      Total: {{ formatCurrency(commission.transaction?.totalAmount || 0) }}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="font-semibold">{{ formatCurrency(commission.commissionAmount) }}</div>
                    <div v-if="commission.notes" class="text-xs text-base-content/60">
                      {{ commission.notes }}
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
                </tr>
              </tbody>
            </table>
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
