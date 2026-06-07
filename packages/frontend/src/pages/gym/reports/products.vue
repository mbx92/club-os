<route lang="yaml">
meta:
  title: Product Reports
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReports } from '@/composables/shared/useReports'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import {
  IconArrowLeft,
  IconRefresh,
  IconDownload,
  IconPackage,
  IconChartBar,
  IconTrophy,
  IconTag,
  IconCurrencyDollar
} from '@tabler/icons-vue'

const router = useRouter()
const {
  getProductsPerformance,
  getProductsTopSelling,
  getProductsByCategory,
  productsPerformance,
  productsTopSelling,
  productsByCategory,
  loading,
  formatCurrency,
  formatNumber,
  exportToCSV
} = useReports()

const dateRange = ref({
  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const groupBy = ref('monthly')
const sortBy = ref('revenue')
const limit = ref(20)

// Computed — Performance (no summary object, derive from salesByPeriod)
const salesByPeriod = computed(() => productsPerformance.value?.salesByPeriod ?? [])
const byProductType = computed(() => productsPerformance.value?.byServiceType ?? [])
const forecastData = computed(() => productsPerformance.value?.forecast?.forecast ?? [])
const forecastMeta = computed(() => productsPerformance.value?.forecast ?? {})

const totalRevenue = computed(() =>
  salesByPeriod.value.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0)
)
const totalQty = computed(() =>
  salesByPeriod.value.reduce((s, r) => s + parseInt(r.totalQuantity || 0), 0)
)
const totalOrders = computed(() =>
  salesByPeriod.value.reduce((s, r) => s + parseInt(r.transactionCount || 0), 0)
)
const avgOrderValue = computed(() =>
  totalOrders.value ? totalRevenue.value / totalOrders.value : 0
)

// Top selling
const topProducts = computed(() => productsTopSelling.value?.topProducts ?? [])

// By category
const categories = computed(() => productsByCategory.value?.byCategory ?? [])
const maxCatRevenue = computed(() => Math.max(...categories.value.map(c => parseFloat(c.totalRevenue || 0)), 1))

const loadData = async () => {
  const params = {
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    groupBy: groupBy.value,
    sortBy: sortBy.value,
    limit: limit.value
  }
  await Promise.allSettled([
    getProductsPerformance(params),
    getProductsTopSelling(params),
    getProductsByCategory({ startDate: params.startDate, endDate: params.endDate })
  ])
}

const handleExport = () => {
  exportToCSV(
    topProducts.value.map(p => ({
      Rank: p.rank,
      Product: p.itemName,
      Quantity: parseInt(p.totalQuantity || 0),
      Orders: parseInt(p.orderCount || 0),
      AvgPrice: parseFloat(p.avgPrice || 0),
      Revenue: parseFloat(p.totalRevenue || 0)
    })),
    'product_reports'
  )
}

onMounted(loadData)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Product Reports</h1>
        <p class="text-base-content/60 mt-1">Product sales performance, top sellers, and category breakdown</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="handleExport">
        <IconDownload class="w-4 h-4" />
      </button>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DateRangeFilter v-model="dateRange" @update:modelValue="loadData" />
          <div class="form-control">
            <label class="label"><span class="label-text">Group By</span></label>
            <select v-model="groupBy" class="select select-bordered w-full mt-2" @change="loadData">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Sort Top Selling By</span></label>
            <select v-model="sortBy" class="select select-bordered w-full mt-2" @change="loadData">
              <option value="revenue">Revenue</option>
              <option value="quantity">Quantity</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary"><IconCurrencyDollar class="w-8 h-8" /></div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-primary text-lg">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(totalRevenue) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success"><IconPackage class="w-8 h-8" /></div>
        <div class="stat-title">Items Sold</div>
        <div class="stat-value text-success text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalQty) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info"><IconChartBar class="w-8 h-8" /></div>
        <div class="stat-title">Total Orders</div>
        <div class="stat-value text-info text-xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatNumber(totalOrders) }}</span>
        </div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning"><IconTag class="w-8 h-8" /></div>
        <div class="stat-title">Avg Order Value</div>
        <div class="stat-value text-warning text-lg">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(avgOrderValue) }}</span>
        </div>
      </div>
    </div>

    <!-- Top Selling + By Category -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Top Selling Products -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconTrophy class="w-5 h-5 text-warning" />
            Top Selling Products
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!topProducts.length" class="text-center py-10 text-base-content/60">No product data available</div>
          <div v-else class="overflow-x-auto">
            <table class="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Orders</th>
                  <th class="text-right">Avg Price</th>
                  <th class="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in topProducts" :key="p.itemId" class="hover">
                  <td class="font-bold text-base-content/40">{{ p.rank }}</td>
                  <td class="font-medium">{{ p.itemName }}</td>
                  <td class="text-right">{{ formatNumber(parseInt(p.totalQuantity || 0)) }}</td>
                  <td class="text-right">{{ formatNumber(parseInt(p.orderCount || 0)) }}</td>
                  <td class="text-right text-base-content/60">{{ formatCurrency(parseFloat(p.avgPrice || 0)) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(parseFloat(p.totalRevenue || 0)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- By Category -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconTag class="w-5 h-5" />
            Revenue by Category
          </h3>
          <div v-if="loading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!categories.length" class="text-center py-10 text-base-content/60">No category data available</div>
          <div v-else class="space-y-3">
            <div v-for="cat in categories" :key="cat.categoryId" class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium">{{ cat.categoryName }}</span>
                  <span class="font-semibold">{{ formatCurrency(parseFloat(cat.totalRevenue || 0)) }}</span>
                </div>
                <progress
                  class="progress progress-primary w-full"
                  :value="parseFloat(cat.totalRevenue || 0)"
                  :max="maxCatRevenue"
                ></progress>
                <div class="flex justify-between text-xs text-base-content/50">
                  <span>{{ parseInt(cat.orderCount || 0) }} orders</span>
                  <span>{{ parseInt(cat.totalQuantity || 0) }} sold</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Over Time + Forecast -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">
            <IconChartBar class="w-5 h-5" />
            Sales Over Time
          </h3>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!salesByPeriod.length" class="text-center py-8 text-base-content/60">No period data available</div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Transaksi</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in salesByPeriod" :key="row.period" class="hover">
                  <td class="font-medium">{{ new Date(row.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) }}</td>
                  <td class="text-right">{{ formatNumber(parseInt(row.transactionCount || 0)) }}</td>
                  <td class="text-right">{{ formatNumber(parseInt(row.totalQuantity || 0)) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(parseFloat(row.totalRevenue || 0)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Revenue Forecast</h3>
            <div class="flex gap-2">
              <span v-if="forecastMeta.trend" class="badge" :class="forecastMeta.trend === 'growing' ? 'badge-success' : 'badge-error'">
                {{ forecastMeta.trend }}
              </span>
              <span v-if="forecastMeta.confidence" class="badge badge-ghost">{{ forecastMeta.confidence }} confidence</span>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!forecastData.length" class="text-center py-8 text-base-content/60">No forecast data</div>
          <div v-else class="space-y-3">
            <div v-for="(f, idx) in forecastData" :key="f.periodIndex" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div class="text-sm font-medium text-base-content/70">Prediksi {{ idx + 1 }}</div>
              <div class="font-bold text-success">{{ formatCurrency(f.predictedValue) }}</div>
            </div>
            <div v-if="forecastMeta.avgGrowthRate" class="text-xs text-base-content/60 pt-1">
              Avg growth rate: {{ forecastMeta.avgGrowthRate }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- By Product Type -->
    <div v-if="byProductType.length" class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title mb-4">
          <IconPackage class="w-5 h-5" />
          By Product Type
        </h3>
        <div class="space-y-3">
          <div v-for="t in byProductType" :key="t.itemType" class="flex-1">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium capitalize">{{ t.itemType?.replace(/_/g, ' ') }}</span>
              <span>{{ parseInt(t.totalQuantity || 0) }} items &middot; {{ formatCurrency(parseFloat(t.totalRevenue || 0)) }}</span>
            </div>
            <progress
              class="progress progress-secondary w-full"
              :value="parseInt(t.totalQuantity || 0)"
              :max="byProductType.reduce((a, b) => a + parseInt(b.totalQuantity || 0), 0) || 1"
            ></progress>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
