<route lang="yaml">
meta:
  title: Table Analytics
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import TableRevenueChart from '@/components/restaurant/reports/TableRevenueChart.vue'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconArmchair,
  IconCash,
  IconRotate,
  IconClock
} from '@tabler/icons-vue'

const router = useRouter()
const isDev = import.meta.env.DEV
const { 
  getTableReport, 
  tableReport, 
  formatCurrency, 
  exportToCSV,
  loading 
} = useRestaurantReports()
const { locations, fetchLocations } = useRestaurantLocations()

// Filters
const dateRange = ref({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const selectedLocation = ref('')

// Summary stats
const summary = computed(() => {
  if (!tableReport.value) return null
  
  const summaryData = tableReport.value?.summary || {}
  const tables = tableReport.value?.tablePerformance || []
  
  // Find best performing table
  const bestTable = tables.reduce((best, t) => 
    (t.totalRevenue || 0) > (best?.totalRevenue || 0) ? t : best
  , null)
  
  return {
    totalTables: summaryData.totalTables || 0,
    tablesUsed: summaryData.tablesUsed || 0,
    totalRevenue: summaryData.totalRevenue || 0,
    totalOrders: summaryData.totalOrders || 0,
    avgOrderValue: summaryData.averageOrderValue || 0,
    avgTurnover: summaryData.averageTurnoverTime ? (summaryData.averageTurnoverTime / 60).toFixed(1) : '0',
    avgDuration: summaryData.averageTurnoverTime ? Math.round(summaryData.averageTurnoverTime / 60) : 0,
    bestTable: bestTable?.tableName || bestTable?.tableNumber || '-'
  }
})

const loadData = async () => {
  try {
    const result = await getTableReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      locationId: selectedLocation.value || undefined
    })
    if (isDev) {
      console.log('📊 Table Report Result:', result)
      console.log('📊 tableReport.value:', tableReport.value)
      console.log('📊 tableReport.value.data:', tableReport.value?.data)
      console.log('📊 tablePerformance:', tableReport.value?.data?.tablePerformance)
    }
  } catch (err) {
    console.error('Failed to load table data:', err)
  }
}

// Export data
const handleExport = () => {
  const tables = tableReport.value?.tablePerformance || []
  if (!tables.length) return
  
  const exportData = tables.map(t => ({
    Table: t.tableName || t.tableNumber,
    'Table Number': t.tableNumber,
    Capacity: t.capacity || 0,
    Orders: t.orderCount || 0,
    Revenue: t.totalRevenue || 0,
    'Avg Order Value': t.averageOrderValue || 0,
    'Avg Duration (min)': t.avgDurationMinutes || 0
  }))
  
  exportToCSV(exportData, 'table-analytics')
}

watch([dateRange, selectedLocation], () => {
  loadData()
}, { deep: true })

onMounted(async () => {
  await fetchLocations()
  await loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm" @click="router.push('/restaurant/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Table Analytics</h1>
        <p class="text-base-content/60 mt-1">Table performance and utilization metrics</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!tableReport?.tablePerformance?.length">
        Export CSV
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-2">
          <IconFilter class="w-5 h-5" />
          <h3 class="font-semibold">Filters</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <!-- Date Range -->
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>

          <!-- Location -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <select v-model="selectedLocation" class="select select-bordered w-full mt-2">
              <option value="">All Locations</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-primary">
          <IconArmchair class="w-6 h-6" />
        </div>
        <div class="stat-title text-xs">Tables</div>
        <div class="stat-value text-primary text-lg">{{ summary.totalTables }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-success">
          <IconCash class="w-6 h-6" />
        </div>
        <div class="stat-title text-xs">Revenue</div>
        <div class="stat-value text-success text-lg">{{ formatCurrency(summary.totalRevenue) }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-title text-xs">Orders</div>
        <div class="stat-value text-info text-lg">{{ summary.totalOrders }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-warning">
          <IconRotate class="w-6 h-6" />
        </div>
        <div class="stat-title text-xs">Avg Turnover</div>
        <div class="stat-value text-warning text-lg">{{ summary.avgTurnover }}x</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-secondary">
          <IconClock class="w-6 h-6" />
        </div>
        <div class="stat-title text-xs">Avg Duration</div>
        <div class="stat-value text-secondary text-lg">{{ summary.avgDuration }}m</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-title text-xs">Best Table</div>
        <div class="stat-value text-accent text-lg truncate">{{ summary.bestTable }}</div>
      </div>
    </div>

    <!-- Table Performance Chart -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Table Revenue Comparison</h3>
        
        <TableRevenueChart
          :tables="tableReport?.tablePerformance || []"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Detailed Table -->
    <div class="card bg-base-100 shadow mt-6">
      <div class="card-body">
        <h3 class="card-title mb-4">Detailed Performance</h3>
        
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="!tableReport?.tablePerformance?.length" class="text-center py-8 text-base-content/60">
          No table data available
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Table</th>
                <th class="text-center">Capacity</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Avg Duration</th>
                <th class="text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="table in tableReport.tablePerformance" :key="table.tableId" class="hover">
                <td class="font-medium">
                  <div>{{ table.tableName || table.tableNumber }}</div>
                  <div class="text-xs text-base-content/60">{{ table.tableNumber }}</div>
                </td>
                <td class="text-center">{{ table.capacity || '-' }}</td>
                <td class="text-right">{{ table.orderCount || 0 }}</td>
                <td class="text-right font-semibold">{{ formatCurrency(table.totalRevenue) }}</td>
                <td class="text-right">{{ table.avgDurationMinutes || 0 }} min</td>
                <td class="text-right">
                  {{ formatCurrency(table.averageOrderValue || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
