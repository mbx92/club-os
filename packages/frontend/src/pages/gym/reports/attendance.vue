<route lang="yaml">
meta:
  title: Attendance Report
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
  IconCalendarEvent,
  IconUsers,
  IconChartBar,
  IconClock
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getAttendanceReport, 
  attendanceReport,
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

// New API: { trends: [{period, count, uniqueMembers}], forecast: [{period, value, type}] }
const trends   = computed(() => attendanceReport.value?.trends  || [])
const forecast = computed(() => attendanceReport.value?.forecast || [])

// Derived summary from trends
const totalCheckIns   = computed(() => trends.value.reduce((s, t) => s + parseInt(t.count || 0), 0))
const totalUnique     = computed(() => {
  const max = trends.value.reduce((s, t) => Math.max(s, parseInt(t.uniqueMembers || 0)), 0)
  return max
})
const avgPerPeriod    = computed(() => {
  if (!trends.value.length) return 0
  return (totalCheckIns.value / trends.value.length).toFixed(1)
})

const loadData = async () => {
  try {
    await getAttendanceReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      groupBy: groupBy.value
    })
  } catch (err) {
    console.error('Failed to load check-in trends:', err)
  }
}

// Export data
const handleExport = () => {
  if (!trends.value.length) return
  const exportData = trends.value.map(p => ({
    Period: new Date(p.period).toLocaleDateString('id-ID'),
    'Total Check-ins': p.count,
    'Unique Members': p.uniqueMembers
  }))
  exportToCSV(exportData, `gym-checkin-trends-${groupBy.value}`)
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
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Check-in Trends</h1>
        <p class="text-base-content/60 mt-1">Check-in statistics and 3-period forecast</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!trends.length">
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
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Group By</span></label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconCalendarEvent class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Check-ins</div>
        <div class="stat-value text-primary text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ totalCheckIns }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconUsers class="w-8 h-8" />
        </div>
        <div class="stat-title">Peak Unique Members</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ totalUnique }}</span>
        </div>
      </div>

      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconChartBar class="w-8 h-8" />
        </div>
        <div class="stat-title">Avg per Period</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ avgPerPeriod }}</span>
        </div>
      </div>
    </div>

    <!-- Trends Table -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body">
        <h3 class="card-title mb-4">Check-in Trends</h3>
        
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="!trends.length" class="text-center py-8 text-base-content/60">
          No check-in data available for the selected period
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Check-ins</th>
                <th class="text-right">Unique Members</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in trends" :key="row.period" class="hover">
                <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID') }}</td>
                <td class="text-right font-semibold text-primary">{{ row.count }}</td>
                <td class="text-right">{{ row.uniqueMembers }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Forecast Table -->
    <div v-if="forecast.length" class="card bg-base-100 shadow border border-info/20">
      <div class="card-body">
        <h3 class="card-title mb-4 text-info">📈 Forecast (Next {{ forecast.length }} Periods)</h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period (Predicted)</th>
                <th class="text-right">Estimated Check-ins</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in forecast" :key="f.period" class="hover opacity-75">
                <td class="font-medium italic">{{ new Date(f.period).toLocaleDateString('id-ID') }}</td>
                <td class="text-right font-semibold text-info">{{ Math.round(f.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
