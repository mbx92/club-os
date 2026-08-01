<route lang="yaml">
meta:
  title: Daily Summary
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import DailySummaryCards from '@/components/restaurant/reports/DailySummaryCards.vue'
import HourlySalesChart from '@/components/restaurant/reports/HourlySalesChart.vue'
import ProductPerformanceTable from '@/components/restaurant/reports/ProductPerformanceTable.vue'
import { 
  IconArrowLeft, 
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconRefresh,
  IconPrinter,
  IconDownload
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getDailySummary, 
  dailySummary,
  formatCurrency, 
  exportToCSV,
  loading 
} = useRestaurantReports()
const { locations, fetchLocations } = useRestaurantLocations()

// State
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedLocation = ref('')
const previousSummary = ref(null)
const hourlySalesData = ref([])
const topProducts = ref([])
const paymentData = ref([])
const orderTypeData = ref([])

const normalizeSummary = (response) => {
  const payload = response?.data || response || {}
  const summary = payload?.summary || {}
  const hourly = payload?.hourlyBreakdown || []

  let peakHour = null
  if (Array.isArray(hourly) && hourly.length) {
    const peak = hourly.reduce((best, item) => {
      const revenue = Number(item?.revenue || 0)
      if (!best) return { hour: item?.hour, revenue }
      return revenue > best.revenue ? { hour: item?.hour, revenue } : best
    }, null)
    peakHour = peak?.revenue > 0 ? peak?.hour : null
  }

  return {
    totalOrders: summary?.totalOrders || 0,
    totalRevenue: summary?.totalRevenue || 0,
    totalTax: summary?.totalTax || 0,
    totalDiscount: summary?.totalDiscount || 0,
    netRevenue: summary?.netRevenue || 0,
    itemsSold: summary?.totalItemsSold ?? summary?.itemsSold ?? 0,
    avgOrderValue: summary?.averageOrderValue ?? summary?.avgOrderValue ?? 0,
    peakHour: peakHour ?? '-',
    customersServed: summary?.customersServed || summary?.totalOrders || 0
  }
}

// Navigate date
const goToPreviousDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

const goToNextDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  if (date <= new Date()) {
    selectedDate.value = date.toISOString().split('T')[0]
  }
}

const goToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0]
}

// Check if can go next
const canGoNext = computed(() => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  return date <= new Date()
})

// Is today
const isToday = computed(() => {
  return selectedDate.value === new Date().toISOString().split('T')[0]
})

// Format display date
const displayDate = computed(() => {
  const date = new Date(selectedDate.value)
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Previous day for comparison
const previousDate = computed(() => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
})

const topProductsSortBy = ref('quantity')

const loadData = async () => {
  const locationId = selectedLocation.value || undefined
  
  try {
    // Load current and previous day; backend response contains all breakdowns and topProducts
    const [currentResp, previousResp] = await Promise.all([
      getDailySummary(selectedDate.value, locationId),
      getDailySummary(previousDate.value, locationId)
    ])

    previousSummary.value = normalizeSummary(previousResp)

    const payload = currentResp?.data || currentResp || {}

    hourlySalesData.value = (payload?.hourlyBreakdown || []).map(h => ({
      hour: h?.hour,
      revenue: h?.revenue || 0,
      orders: h?.orderCount ?? h?.orders ?? 0
    }))

    topProducts.value = (payload?.topProducts || []).map(p => ({
      id: p?.productId,
      name: p?.productName,
      categoryName: p?.categoryName || p?.category || '',
      quantity: p?.quantity || 0,
      revenue: p?.revenue || 0
    }))

    const paymentLabelMap = {
      cash: 'Tunai',
      credit_card: 'Kartu Kredit',
      debit_card: 'Kartu Debit',
      bank_transfer: 'Transfer Bank',
      qris: 'QRIS',
      e_wallet: 'E-Wallet',
      compliment: 'Gratis/Komplemen'
    }
    paymentData.value = (payload?.paymentBreakdown || []).map(p => ({
      label: paymentLabelMap[p?.method] || (p?.method || '').replace(/_/g, ' '),
      value: p?.total || 0,
      count: p?.count || 0
    }))

    orderTypeData.value = (payload?.orderTypeBreakdown || []).map(o => ({
      label: o?.type,
      value: o?.count || 0,
      total: o?.total || 0
    }))
  } catch (err) {
    console.error('Failed to load daily summary:', err)
  }
}

// Export report
const handleExport = () => {
  const summary = normalizeSummary(dailySummary.value)
  const data = [{
    Date: selectedDate.value,
    'Total Revenue': summary?.totalRevenue || 0,
    'Total Orders': summary?.totalOrders || 0,
    'Avg Order Value': summary?.avgOrderValue || 0,
    'Items Sold': summary?.itemsSold || 0,
    'Peak Hour': summary?.peakHour || '-'
  }]
  
  exportToCSV(data, `daily-summary-${selectedDate.value}`)
}

// Print report
const handlePrint = () => {
  window.print()
}

watch([selectedDate, selectedLocation], () => {
  loadData()
})

onMounted(async () => {
  await fetchLocations()
  await loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/restaurant/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Daily Summary</h1>
        <p class="text-base-content/60 mt-1">Comprehensive daily performance report</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-ghost btn-sm print:hidden" @click="handlePrint">
        <IconPrinter class="w-4 h-4" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport">
        <IconDownload class="w-4 h-4 mr-1" />
        Export
      </button>
    </div>

    <!-- Date Navigation -->
    <div class="card bg-base-100 shadow mb-6 print:shadow-none">
      <div class="card-body p-4">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Date Picker -->
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm btn-circle" @click="goToPreviousDay">
              <IconChevronLeft class="w-5 h-5" />
            </button>
            
            <div class="flex items-center gap-2">
              <IconCalendar class="w-5 h-5 text-base-content/60" />
              <input 
                type="date" 
                v-model="selectedDate"
                :max="new Date().toISOString().split('T')[0]"
                class="input input-bordered input-sm"
              />
            </div>
            
            <button 
              class="btn btn-ghost btn-sm btn-circle" 
              @click="goToNextDay"
              :disabled="!canGoNext"
            >
              <IconChevronRight class="w-5 h-5" />
            </button>
            
            <button 
              v-if="!isToday"
              class="btn btn-ghost btn-sm"
              @click="goToToday"
            >
              Today
            </button>
          </div>
          
          <!-- Display Date -->
          <div class="text-lg font-semibold">
            {{ displayDate }}
          </div>
          
          <!-- Location Filter -->
          <div class="form-control print:hidden">
            <select v-model="selectedLocation" class="select select-bordered select-sm">
              <option value="">All Locations</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="mb-6">
      <DailySummaryCards 
        :summary="normalizeSummary(dailySummary)"
        :previous-summary="previousSummary || {}"
        :loading="loading"
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Hourly Sales -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Hourly Sales Distribution</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <HourlySalesChart 
            v-else
            :data="hourlySalesData"
            height="250px"
          />
        </div>
      </div>

      <!-- Payment Methods & Order Types -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Payment Methods -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title text-sm mb-4">Payment Methods</h3>
            
            <div v-if="loading" class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md"></span>
            </div>
            
            <div v-else-if="!paymentData.length" class="text-center py-8 text-base-content/60 text-sm">
              No payment data
            </div>
            
            <div v-else class="space-y-2">
              <div 
                v-for="(payment, index) in paymentData" 
                :key="index"
                class="flex items-center justify-between"
              >
                <span class="text-sm">{{ payment.label }}</span>
                <span class="font-semibold text-sm">{{ formatCurrency(payment.value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Types -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title text-sm mb-4">Order Types</h3>
            
            <div v-if="loading" class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md"></span>
            </div>
            
            <div v-else-if="!orderTypeData.length" class="text-center py-8 text-base-content/60 text-sm">
              No order data
            </div>
            
            <div v-else class="space-y-2">
              <div 
                v-for="(orderType, index) in orderTypeData" 
                :key="index"
                class="flex items-center justify-between"
              >
                <span class="text-sm capitalize">{{ orderType.label?.replace('_', ' ') }}</span>
                <span class="badge badge-ghost">{{ orderType.value }} orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">Top Products Today</h3>
        
        <ProductPerformanceTable
          :products="topProducts"
          :loading="loading"
          :sort-by="topProductsSortBy"
          @sort="topProductsSortBy = $event"
        />
      </div>
    </div>

    <!-- Print Footer -->
    <div class="hidden print:block mt-8 pt-4 border-t text-center text-sm text-base-content/60">
      <p>Generated on {{ new Date().toLocaleString('id-ID') }}</p>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .container {
    max-width: 100%;
    padding: 0;
  }
  
  .card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #e5e7eb;
  }
}
</style>
