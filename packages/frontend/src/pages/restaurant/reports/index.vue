<route lang="yaml">
meta:
  title: Restaurant Reports
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { 
  IconChartBar, 
  IconShoppingCart, 
  IconArmchair, 
  IconCalendar, 
  IconPackage,
  IconCash,
  IconReceipt,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconArrowRight
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getComprehensiveDashboard, 
  comprehensiveDashboard,
  formatCurrency, 
  loading 
} = useRestaurantReports()
const { locations, fetchLocations } = useRestaurantLocations()

const selectedLocation = ref('')
const dashboard = computed(() => comprehensiveDashboard.value)

const loadSummary = async () => {
  try {
    await getComprehensiveDashboard()
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  }
}

const reports = [
  {
    title: 'Sales Report',
    description: 'Revenue trends, payment analysis, and sales performance',
    icon: IconChartBar,
    route: '/restaurant/reports/sales',
    color: 'bg-primary/10 text-primary',
    stats: 'Daily, Weekly, Monthly'
  },
  {
    title: 'Product Performance',
    description: 'Top selling products, category breakdown, and item analysis',
    icon: IconShoppingCart,
    route: '/restaurant/reports/products',
    color: 'bg-success/10 text-success',
    stats: 'Best Sellers'
  },
  {
    title: 'Table Analytics',
    description: 'Table turnover, revenue per table, and utilization metrics',
    icon: IconArmchair,
    route: '/restaurant/reports/tables',
    color: 'bg-info/10 text-info',
    stats: 'Performance'
  },
  {
    title: 'Daily Summary',
    description: 'Comprehensive daily report with all metrics and insights',
    icon: IconCalendar,
    route: '/restaurant/reports/daily',
    color: 'bg-warning/10 text-warning',
    stats: 'Full Report'
  },
  {
    title: 'Stock Report',
    description: 'Inventory levels, movements, and stock alerts',
    icon: IconPackage,
    route: '/restaurant/stock',
    color: 'bg-secondary/10 text-secondary',
    stats: 'Inventory'
  }
]

onMounted(async () => {
  await fetchLocations()
  await loadSummary()
  // Auto-refresh every 30 seconds
  const interval = setInterval(loadSummary, 30000)
  onBeforeUnmount(() => clearInterval(interval))
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Reports & Analytics</h1>
        <p class="text-base-content/60 mt-1">Business insights and performance metrics</p>
      </div>
      
      <div class="flex items-center gap-3">
        <select v-model="selectedLocation" class="select select-bordered select-sm" @change="loadSummary">
          <option value="">All Locations</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
        
        <button class="btn btn-ghost btn-sm" @click="loadSummary" :disabled="loading">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Today's Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Total Revenue -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconCash class="w-8 h-8" />
        </div>
        <div class="stat-title">Today's Revenue</div>
        <div class="stat-value text-primary text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(dashboard?.revenue?.today?.total || 0) }}</span>
        </div>
        <div class="stat-desc flex items-center gap-1">
          <template v-if="dashboard?.revenue?.today?.change > 0">
            <IconTrendingUp class="w-4 h-4 text-success" />
            <span class="text-success">+{{ dashboard.revenue.today.change.toFixed(1) }}%</span>
          </template>
          <template v-else-if="dashboard?.revenue?.today?.change < 0">
            <IconTrendingDown class="w-4 h-4 text-error" />
            <span class="text-error">{{ dashboard.revenue.today.change.toFixed(1) }}%</span>
          </template>
          <template v-else>
            <span>Same as yesterday</span>
          </template>
        </div>
      </div>

      <!-- Total Orders -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconReceipt class="w-8 h-8" />
        </div>
        <div class="stat-title">Today's Orders</div>
        <div class="stat-value text-success text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ dashboard?.orders?.today?.total || 0 }}</span>
        </div>
        <div class="stat-desc">
          Active: {{ dashboard?.orders?.active?.total || 0 }}
        </div>
      </div>

      <!-- Average Order Value -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconChartBar class="w-8 h-8" />
        </div>
        <div class="stat-title">Avg Order Value</div>
        <div class="stat-value text-info text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ formatCurrency(dashboard?.revenue?.today?.avgOrderValue || 0) }}</span>
        </div>
        <div class="stat-desc">Per transaction</div>
      </div>

      <!-- Table Status -->
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconArmchair class="w-8 h-8" />
        </div>
        <div class="stat-title">Table Occupancy</div>
        <div class="stat-value text-warning text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ (dashboard?.tables?.occupancyRate || 0).toFixed(1) }}%</span>
        </div>
        <div class="stat-desc">{{ dashboard?.tables?.status?.occupied || 0 }}/{{ dashboard?.tables?.status?.total || 0 }} occupied</div>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div v-if="dashboard" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <div 
        v-for="orderType in dashboard.orders?.today?.byType" 
        :key="orderType.type"
        class="bg-base-100 rounded-lg p-4 shadow-sm"
      >
        <div class="text-sm text-base-content/60 capitalize">{{ orderType.type }}</div>
        <div class="font-semibold">{{ orderType.count }} orders</div>
        <div class="text-xs text-base-content/60">{{ formatCurrency(orderType.revenue) }}</div>
      </div>
    </div>

    <!-- Report Cards -->
    <h2 class="text-xl font-semibold mb-4">Available Reports</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="report in reports"
        :key="report.route"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group"
        @click="router.push(report.route)"
      >
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div :class="['p-3 rounded-xl', report.color]">
              <component :is="report.icon" class="w-8 h-8" />
            </div>
            <span class="badge badge-ghost badge-sm">{{ report.stats }}</span>
          </div>
          
          <h2 class="card-title mt-4">{{ report.title }}</h2>
          <p class="text-base-content/60 text-sm">{{ report.description }}</p>
          
          <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost btn-sm group-hover:btn-primary group-hover:gap-2 transition-all">
              View Report
              <IconArrowRight class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity (Optional) -->
    <div v-if="dashboard?.orders?.recent?.length" class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Recent Orders</h2>
      <div class="card bg-base-100 shadow">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th class="text-right">Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in dashboard.orders.recent.slice(0, 5)" :key="order.id" class="hover">
                  <td class="font-mono text-sm">{{ order.transactionNumber }}</td>
                  <td>
                    <span class="badge badge-ghost badge-sm capitalize">{{ order.orderType }}</span>
                  </td>
                  <td class="text-right font-semibold">{{ formatCurrency(order.totalAmount) }}</td>
                  <td class="text-base-content/60 text-sm">{{ new Date(order.completedAt).toLocaleString('id-ID') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
