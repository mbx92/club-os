<route lang="yaml">
meta:
  title: Revenue Report
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGymReports } from '@/composables/gym/reports'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconDownload,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconTrendingUp
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getRevenueReport, 
  revenueReport,
  formatCurrency, 
  exportToCSV,
  loading 
} = useGymReports()

// Filters
const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('daily')
const serviceType = ref('')

// Summary stats
const summary = computed(() => revenueReport.value?.summary || {})
const revenueByPeriod = computed(() => revenueReport.value?.revenueByPeriod || [])
const revenueByType = computed(() => revenueReport.value?.revenueByType || [])
const forecast = computed(() => revenueReport.value?.forecast || [])

const loadData = async () => {
  try {
    await getRevenueReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      groupBy: groupBy.value,
      serviceType: serviceType.value || undefined
    })
  } catch (err) {
    console.error('Failed to load revenue report:', err)
  }
}

// Export data
const handleExport = () => {
  if (!revenueByPeriod.value.length) return
  
  const exportData = revenueByPeriod.value.map(p => ({
    Period: new Date(p.period).toLocaleDateString('id-ID'),
    Transactions: parseInt(p.count || 0),
    Revenue: parseFloat(p.revenue || 0)
  }))
  
  exportToCSV(exportData, `gym-revenue-${groupBy.value}`)
}

watch([dateRange, groupBy, serviceType], () => {
  loadData()
}, { deep: true })

onMounted(() => {
  loadData()
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
        <h1 class="text-3xl font-bold">Revenue Report</h1>
        <p class="text-base-content/60 mt-1">Revenue trends and payment analysis</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!revenueByPeriod.length">
        <IconDownload class="w-4 h-4 mr-1" />
        Export
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-2 mb-4">
          <IconFilter class="w-5 h-5" />
          <h3 class="font-semibold">Filters</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Date Range -->
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>

          <!-- Group By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Group By</span>
            </label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <!-- Service Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Service Type</span>
            </label>
            <select v-model="serviceType" class="select select-bordered w-full mt-2">
              <option value="">All Types</option>
              <option value="membership">Membership</option>
              <option value="personal_training">Personal Training</option>
              <option value="class">Class</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconCash class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.totalRevenue) }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconReceipt class="w-8 h-8" />
        </div>
        <div class="stat-title">Transactions</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.totalTransactions || 0 }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconChartBar class="w-8 h-8" />
        </div>
        <div class="stat-title">Avg Transaction</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.avgTransactionValue) }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconTrendingUp class="w-8 h-8" />
        </div>
        <div class="stat-title">Revenue Types</div>
        <div class="stat-value text-warning text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ revenueByType.length }}</span>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Revenue by Type -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Revenue by Type</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="!revenueByType.length" class="text-center py-12 text-base-content/60">
            No type data available
          </div>
          
          <div v-else class="space-y-3">
            <div v-for="item in revenueByType" :key="item.transactionType" class="flex items-center justify-between">
              <div class="flex-1">
                <div class="text-sm font-medium capitalize">{{ (item.transactionType || '').replace(/_/g, ' ') }}</div>
              </div>
              <div class="text-right">
                <div class="font-bold">{{ formatCurrency(parseFloat(item.revenue || 0)) }}</div>
                <div class="text-xs text-base-content/60">
                  {{ summary.totalRevenue ? ((parseFloat(item.revenue || 0) / summary.totalRevenue) * 100).toFixed(1) : 0 }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Revenue Forecast -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Forecast</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="!forecast.length" class="text-center py-12 text-base-content/60">
            No forecast data available
          </div>
          
          <div v-else class="space-y-3">
            <div v-for="f in forecast" :key="f.period" class="flex items-center justify-between">
              <div class="flex-1">
                <div class="text-sm font-medium">{{ new Date(f.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) }}</div>
                <div class="badge badge-ghost badge-sm">{{ f.type }}</div>
              </div>
              <div class="text-right">
                <div class="font-bold">{{ formatCurrency(f.value) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue by Period Table -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Revenue Breakdown</h3>
        
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="!revenueByPeriod.length" class="text-center py-8 text-base-content/60">
          No revenue data available
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Transactions</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in revenueByPeriod" :key="period.period" class="hover">
                <td class="font-medium">{{ new Date(period.period).toLocaleDateString('id-ID') }}</td>
                <td class="text-right">{{ parseInt(period.count || 0) }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(parseFloat(period.revenue || 0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
