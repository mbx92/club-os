<route lang="yaml">
meta:
  title: Profit & Loss
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
  IconTrendingUp,
  IconDiscount,
  IconChartPie
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getProfitLossReport, 
  profitLossReport,
  formatCurrency, 
  exportToCSV,
  loading 
} = useGymReports()

// Filters
const dateRange = ref({
  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('monthly')

// New API: { byPeriod: [{period, totalRevenue, totalExpenses, netProfit, profitMargin}], summary: {totalRevenue, totalExpenses, netProfit, profitMargin} }
const summary   = computed(() => profitLossReport.value?.summary || {})
const profitLoss = computed(() => profitLossReport.value?.byPeriod || [])

const loadData = async () => {
  try {
    await getProfitLossReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      groupBy: groupBy.value
    })
  } catch (err) {
    console.error('Failed to load profit & loss report:', err)
  }
}

// Export data
const handleExport = () => {
  if (!profitLoss.value.length) return
  
  const exportData = profitLoss.value.map(p => ({
    Period: new Date(p.period).toLocaleDateString('id-ID'),
    Revenue: p.totalRevenue,
    Expenses: p.totalExpenses,
    'Net Profit': p.netProfit,
    'Profit Margin (%)': p.profitMargin
  }))
  
  exportToCSV(exportData, `gym-profit-loss-${groupBy.value}`)
}

watch([dateRange, groupBy], () => {
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
      <button class="btn btn-ghost btn-sm" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Profit & Loss Report</h1>
        <p class="text-base-content/60 mt-1">Financial performance and profit margins</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!profitLoss.length">
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
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <IconTrendingUp class="w-8 h-8" />
        </div>
        <div class="stat-title">Net Profit</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.netProfit) }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconChartPie class="w-8 h-8" />
        </div>
        <div class="stat-title">Profit Margin</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ (summary.profitMargin || 0).toFixed(2) }}%</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-error">
          <IconDiscount class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Expenses</div>
        <div class="stat-value text-error text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(summary.totalExpenses) }}</span>
        </div>
      </div>
    </div>

    <!-- P&L Table -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Profit & Loss Breakdown</h3>
        
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="!profitLoss.length" class="text-center py-8 text-base-content/60">
          No profit & loss data available
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Net Profit</th>
                <th class="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in profitLoss" :key="period.period" class="hover">
                <td class="font-medium">{{ new Date(period.period).toLocaleDateString('id-ID') }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(parseFloat(period.totalRevenue)) }}</td>
                <td class="text-right text-error">{{ formatCurrency(parseFloat(period.totalExpenses)) }}</td>
                <td class="text-right text-success font-bold">{{ formatCurrency(period.netProfit) }}</td>
                <td class="text-right">
                  <span class="badge badge-success">{{ parseFloat(period.profitMargin).toFixed(2) }}%</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold bg-base-200">
                <td>TOTAL</td>
                <td class="text-right">{{ formatCurrency(summary.totalRevenue) }}</td>
                <td class="text-right text-error">{{ formatCurrency(summary.totalExpenses) }}</td>
                <td class="text-right text-success">{{ formatCurrency(summary.netProfit) }}</td>
                <td class="text-right">
                  <span class="badge badge-success">{{ (summary.profitMargin || 0).toFixed(2) }}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
