<route lang="yaml">
meta:
  title: Sales Report
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import SalesChart from '@/components/restaurant/reports/SalesChart.vue'
import PaymentMethodPieChart from '@/components/restaurant/reports/PaymentMethodPieChart.vue'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import ExportButton from '@/components/restaurant/shared/ExportButton.vue'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconTrendingUp
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getSalesReport, 
  getPaymentMethodBreakdown,
  salesReport, 
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
const groupBy = ref('day')
const orderType = ref('')

const paymentData = ref([])

const groupByOptions = [
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' }
]

const orderTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' }
]

// Summary stats
const summary = computed(() => {
  if (!salesReport.value?.summary) return null
  
  return {
    totalRevenue: salesReport.value.summary.totalRevenue || 0,
    totalOrders: salesReport.value.summary.totalOrders || 0,
    avgOrderValue: salesReport.value.summary.averageOrderValue || 0,
    totalTax: salesReport.value.summary.totalTax || 0,
    totalDiscount: salesReport.value.summary.totalDiscount || 0,
    periodCount: salesReport.value.salesByPeriod?.length || 0
  }
})

const loadData = async () => {
  try {
    await getSalesReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      groupBy: groupBy.value,
      locationId: selectedLocation.value || undefined,
      orderType: orderType.value || undefined
    })
    // Update payment data from report
    loadPaymentData()
  } catch (err) {
    console.error('Failed to load sales data:', err)
  }
}

const loadPaymentData = async () => {
  // Payment data is now included in sales report
  if (salesReport.value?.paymentBreakdown) {
    const paymentLabelMap = {
      cash: 'Tunai',
      credit_card: 'Kartu',
      debit_card: 'Kartu Debit',
      bank_transfer: 'Transfer Bank',
      qris: 'QRIS',
      e_wallet: 'E-Wallet',
      compliment: 'Gratis/Komplemen'
    }
    paymentData.value = salesReport.value.paymentBreakdown.map(p => ({
      label: paymentLabelMap[p.method] || (p.method || '').replace(/_/g, ' '),
      value: p.total
    }))
  } else {
    paymentData.value = []
  }
}

// Export data
const handleExport = () => {
  if (!salesReport.value?.salesByPeriod) return
  
  const exportData = salesReport.value.salesByPeriod.map(d => ({
    Period: d.period,
    'Order Count': d.orderCount,
    Subtotal: d.subtotal,
    Tax: d.taxTotal,
    Discount: d.discountTotal,
    'Total Revenue': d.totalRevenue,
    'Avg Order Value': d.averageOrderValue
  }))
  
  exportToCSV(exportData, `sales-report-${groupBy.value}`)
}

watch([dateRange, selectedLocation, groupBy, orderType], () => {
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
        <h1 class="text-3xl font-bold">Sales Report</h1>
        <p class="text-base-content/60 mt-1">Revenue trends and payment analysis</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!salesReport?.salesByPeriod?.length">
        Export CSV
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-2 mb-4">
          <IconFilter class="w-5 h-5" />
          <h3 class="font-semibold">Filters</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Group By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Group By</span>
            </label>
            <select v-model="groupBy" class="select select-bordered">
              <option v-for="opt in groupByOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Location -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <select v-model="selectedLocation" class="select select-bordered">
              <option value="">All Locations</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>

          <!-- Order Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Order Type</span>
            </label>
            <select v-model="orderType" class="select select-bordered">
              <option v-for="opt in orderTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Date Range -->
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconCash class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-primary text-xl">{{ formatCurrency(summary.totalRevenue) }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconReceipt class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Orders</div>
        <div class="stat-value text-success text-xl">{{ summary.totalOrders }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconChartBar class="w-8 h-8" />
        </div>
        <div class="stat-title">Avg Order Value</div>
        <div class="stat-value text-info text-xl">{{ formatCurrency(summary.avgOrderValue) }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconTrendingUp class="w-8 h-8" />
        </div>
        <div class="stat-title">Periods</div>
        <div class="stat-value text-warning text-xl">{{ summary.periodCount }}</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sales Trend Chart -->
      <div class="lg:col-span-2 card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Sales Trend</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <SalesChart 
            v-else
            :data="salesReport?.salesByPeriod || []"
            :group-by="groupBy"
            height="350px"
          />
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Payment Methods</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <PaymentMethodPieChart 
            v-else
            :data="paymentData"
            height="250px"
          />
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="card bg-base-100 shadow mt-6">
      <div class="card-body">
        <h3 class="card-title mb-4">Detailed Data</h3>
        
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else-if="!salesReport?.salesByPeriod?.length" class="text-center py-8 text-base-content/60">
          No data available for the selected period
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Total Revenue</th>
                <th class="text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in salesReport.salesByPeriod" :key="index" class="hover">
                <td class="font-medium">{{ row.period }}</td>
                <td class="text-right">{{ row.orderCount }}</td>
                <td class="text-right">{{ formatCurrency(row.subtotal) }}</td>
                <td class="text-right">{{ formatCurrency(row.taxTotal) }}</td>
                <td class="text-right">{{ formatCurrency(row.discountTotal) }}</td>
                <td class="text-right">{{ formatCurrency(row.totalRevenue) }}</td>
                <td class="text-right">{{ formatCurrency(row.averageOrderValue) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold">
                <td>Total</td>
                <td class="text-right">{{ summary?.totalOrders }}</td>
                <td class="text-right">-</td>
                <td class="text-right">{{ formatCurrency(summary?.totalTax) }}</td>
                <td class="text-right">{{ formatCurrency(summary?.totalDiscount) }}</td>
                <td class="text-right">{{ formatCurrency(summary?.totalRevenue) }}</td>
                <td class="text-right">{{ formatCurrency(summary?.avgOrderValue) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
