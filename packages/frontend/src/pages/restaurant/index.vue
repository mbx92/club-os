<route lang="yaml">
meta:
  title: Restaurant Dashboard
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import RestaurantStatCard from '@/components/restaurant/shared/RestaurantStatCard.vue'
import { 
  IconCurrencyDollar, 
  IconShoppingCart, 
  IconArmchair, 
  IconAlertTriangle,
  IconChefHat,
  IconReceipt
} from '@tabler/icons-vue'

const api = useApi()

// Loading states
const loading = ref(true)
const overviewLoading = ref(false)
const salesTrendLoading = ref(false)
const topProductsLoading = ref(false)
const recentOrdersLoading = ref(false)

// Data from API
const overview = ref({
  todaysSales: {
    amount: 0,
    transactions: 0,
    percentageChange: 0
  },
  activeOrders: {
    total: 0,
    cooking: 0,
    ready: 0
  },
  tables: {
    available: 0,
    occupied: 0,
    total: 0,
    occupancyRate: 0
  },
  lowStock: {
    count: 0,
    items: []
  }
})

const salesChartData = ref([])
const topProducts = ref([])
const recentOrders = ref([])

// Fetch overview data
const fetchOverview = async () => {
  try {
    const response = await api.get('/restaurant/dashboard/overview')
    console.log('Raw response:', response)
    const data = response.data?.data || response.data
    console.log('Parsed data:', data)
    
    if (data) {
      // Note: API returns todaySales (lowercase s), not todaysSales
      overview.value.todaysSales.amount = data.todaySales?.amount || 0
      overview.value.todaysSales.transactions = data.todaySales?.transactions || 0
      overview.value.todaysSales.percentageChange = data.todaySales?.percentageChange || 0
      
      overview.value.activeOrders.total = data.activeOrders?.total || 0
      overview.value.activeOrders.cooking = data.activeOrders?.cooking || 0
      overview.value.activeOrders.ready = data.activeOrders?.ready || 0
      
      overview.value.tables.available = data.tables?.available || 0
      overview.value.tables.occupied = data.tables?.occupied || 0
      overview.value.tables.total = data.tables?.total || 0
      overview.value.tables.occupancyRate = parseFloat(data.tables?.occupancyRate || 0)
      
      overview.value.lowStock.count = data.lowStockItems?.count || 0
      overview.value.lowStock.items = data.lowStockItems?.items || []
      
      console.log('Overview after update:', overview.value)
    }
  } catch (error) {
    console.error('Error fetching overview:', error)
  }
}

// Fetch sales trend
const fetchSalesTrend = async () => {
  salesTrendLoading.value = true
  try {
    const response = await api.get('/restaurant/dashboard/sales-trend')
    const data = response.data?.data || response.data
    
    // API returns { trend: [], average, total, days }
    const trendData = data.trend || data
    
    if (Array.isArray(trendData)) {
      salesChartData.value = trendData.map(item => {
        // Format date to readable format (e.g., "4 Dec")
        const dateObj = new Date(item.date)
        const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        
        return {
          date: formattedDate,
          sales: item.sales || 0
        }
      })
      console.log('Sales trend loaded:', salesChartData.value)
    }
  } catch (error) {
    console.error('Error fetching sales trend:', error)
  } finally {
    salesTrendLoading.value = false
  }
}

// Fetch top products
const fetchTopProducts = async () => {
  topProductsLoading.value = true
  try {
    const response = await api.get('/restaurant/dashboard/top-products')
    const data = response.data?.data || response.data
    if (Array.isArray(data)) {
      topProducts.value = data.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity || item.sold || 0,
        revenue: item.revenue || item.amount || 0
      }))
    }
  } catch (error) {
    console.error('Error fetching top products:', error)
  } finally {
    topProductsLoading.value = false
  }
}

// Fetch recent orders
const fetchRecentOrders = async () => {
  recentOrdersLoading.value = true
  try {
    const response = await api.get('/restaurant/dashboard/recent-orders')
    const data = response.data?.data || response.data
    if (Array.isArray(data)) {
      recentOrders.value = data.map(item => ({
        id: item.id || item.orderNumber,
        orderNumber: item.orderNumber || item.id,
        table: item.table || item.table_name || `Table ${item.table_id}`,
        amount: item.amount || item.total,
        status: item.status,
        timeAgo: item.timeAgo || item.time_ago || item.created_at
      }))
    }
  } catch (error) {
    console.error('Error fetching recent orders:', error)
  } finally {
    recentOrdersLoading.value = false
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStatusClass = (status) => {
  const classes = {
    cancelled: 'badge-error',
    pending: 'badge-warning',
    preparing: 'badge-info',
    ready: 'badge-success',
    served: 'badge-accent',
    completed: 'badge-ghost'
  }
  return classes[status] || 'badge-ghost'
}

const getStatusLabel = (status) => {
  const labels = {
    cancelled: 'Cancelled',
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    completed: 'Completed'
  }
  return labels[status] || status
}

const tablesOverview = computed(() => {
  const total = overview.value.tables.total || 0
  const available = overview.value.tables.available || 0
  const occupied = overview.value.tables.occupied || 0
  const percentage = overview.value.tables.occupancyRate || 0
  
  return {
    display: `${occupied}/${total}`,
    description: `${available} available • ${percentage}% occupied`
  }
})

const lowStockCount = computed(() => {
  return overview.value.lowStock.count || 0
})

onMounted(async () => {
  loading.value = true
  try {
    // Fetch all dashboard data in parallel
    await Promise.all([
      fetchOverview(),
      fetchSalesTrend(),
      fetchTopProducts(),
      fetchRecentOrders()
    ])
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Restaurant Dashboard</h1>
        <p class="text-base-content/60 mt-1">Welcome back! Here's what's happening today.</p>
      </div>
      
      <div class="flex gap-2">
        <router-link to="/restaurant/pos/floor-plan-pos" class="btn btn-primary">
          <IconShoppingCart class="w-5 h-5 mr-2" />
          Go to POS
        </router-link>
        <router-link to="/restaurant/kitchen/display" class="btn btn-secondary">
          <IconChefHat class="w-5 h-5 mr-2" />
          Kitchen Display
        </router-link>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="i" class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="skeleton h-4 w-24 mb-2"></div>
          <div class="skeleton h-8 w-32 mb-2"></div>
          <div class="skeleton h-3 w-40"></div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <RestaurantStatCard
        title="Today's Sales"
        :value="formatCurrency(overview.todaysSales.amount)"
        :description="`${overview.todaysSales.transactions} transactions`"
        :icon="IconCurrencyDollar"
        icon-color="text-success"
        :trend="overview.todaysSales.percentageChange >= 0 ? 'up' : 'down'"
        :trend-value="`${overview.todaysSales.percentageChange >= 0 ? '+' : ''}${overview.todaysSales.percentageChange}%`"
      />
      
      <RestaurantStatCard
        title="Active Orders"
        :value="overview.activeOrders.total"
        :description="`${overview.activeOrders.cooking} cooking, ${overview.activeOrders.ready} ready`"
        :icon="IconReceipt"
        icon-color="text-info"
        link="/restaurant/orders"
      />
      
      <RestaurantStatCard
        title="Tables"
        :value="tablesOverview?.display || '-'"
        :description="tablesOverview?.description || 'Loading...'"
        :icon="IconArmchair"
        icon-color="text-warning"
        link="/restaurant/tables"
      />
      
      <RestaurantStatCard
        title="Low Stock Items"
        :value="lowStockCount"
        :description="lowStockCount > 0 ? 'Requires attention' : 'All good'"
        :icon="IconAlertTriangle"
        :icon-color="lowStockCount > 0 ? 'text-error' : 'text-success'"
        link="/restaurant/stock/alerts"
      />
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Sales Chart -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title">Sales Trend (Last 7 Days)</h3>
          
          <div v-if="salesTrendLoading" class="mt-4 space-y-3">
            <div v-for="i in 7" :key="i" class="flex items-center gap-3">
              <div class="skeleton h-8 w-16"></div>
              <div class="skeleton h-8 flex-1"></div>
            </div>
          </div>
          
          <div v-else-if="salesChartData.length > 0" class="mt-4 space-y-3">
            <div 
              v-for="(day, index) in salesChartData" 
              :key="index"
              class="flex items-center gap-3"
            >
              <div class="text-xs font-medium w-16 text-right">{{ day.date }}</div>
              <div class="flex-1 bg-base-200 rounded-full h-8 overflow-hidden">
                <div 
                  class="bg-primary h-full flex items-center justify-end px-2 transition-all"
                  :style="{ width: `${Math.max(5, (day.sales / Math.max(...salesChartData.map(d => d.sales))) * 100)}%` }"
                >
                  <span class="text-xs font-semibold text-primary-content">
                    {{ formatCurrency(day.sales) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="text-sm text-base-content/60 mt-4">
              Average: {{ formatCurrency(salesChartData.reduce((sum, d) => sum + d.sales, 0) / salesChartData.length) }} per day
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-base-content/60">
            No sales data available
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title">Top Products Today</h3>
          
          <div v-if="topProductsLoading" class="mt-4">
            <div v-for="i in 5" :key="i" class="flex items-center gap-3 mb-3">
              <div class="skeleton h-10 flex-1"></div>
            </div>
          </div>
          
          <div v-else-if="topProducts.length > 0" class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in topProducts" :key="product.id">
                  <td>
                    <div class="font-semibold">{{ product.productName }}</div>
                  </td>
                  <td class="text-center">
                    <div class="badge badge-sm badge-primary">{{ product.quantity }}</div>
                  </td>
                  <td class="text-right font-semibold text-success">
                    {{ formatCurrency(product.revenue) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="text-center py-8 text-base-content/60">
            No product data available
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders & Low Stock -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Orders -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Recent Orders</h3>
            <router-link to="/restaurant/orders" class="btn btn-ghost btn-sm">
              View All
            </router-link>
          </div>
          
          <div v-if="recentOrdersLoading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="skeleton h-16 w-full"></div>
          </div>
          
          <div v-else-if="recentOrders.length > 0" class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Table</th>
                  <th class="text-right">Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td class="font-mono font-semibold">{{ order.orderNumber }}</td>
                  <td>{{ order.table }}</td>
                  <td class="text-right">{{ formatCurrency(order.amount) }}</td>
                  <td>
                    <span class="badge badge-sm" :class="getStatusClass(order.status)">
                      {{ getStatusLabel(order.status) }}
                    </span>
                  </td>
                  <td class="text-xs text-base-content/60">{{ order.timeAgo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="text-center py-8 text-base-content/60">
            No recent orders
          </div>
        </div>
      </div>

      <!-- Low Stock Items -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title">Low Stock Alert</h3>
            <router-link to="/restaurant/stock/alerts" class="btn btn-ghost btn-sm">
              View All
            </router-link>
          </div>
          
          <div v-if="overviewLoading" class="space-y-3">
            <div v-for="i in 5" :key="i" class="skeleton h-14 w-full"></div>
          </div>
          
          <div v-else-if="overview.lowStock.items.length > 0" class="space-y-2">
            <div 
              v-for="item in overview.lowStock.items" 
              :key="item.id"
              class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
            >
              <div class="flex-1">
                <div class="font-semibold">{{ item.name || item.product_name }}</div>
                <div class="text-sm text-base-content/60">
                  {{ item.category || item.category_name || 'N/A' }}
                </div>
              </div>
              
              <div class="text-right">
                <div class="badge badge-error badge-sm">
                  {{ item.stock || item.current_stock || 0 }} {{ item.unit || 'pcs' }}
                </div>
                <div class="text-xs text-base-content/60 mt-1">
                  Min: {{ item.minStock || item.min_stock || 0 }}
                </div>
              </div>
            </div>
            
            <div v-if="overview.lowStock.count > 5" class="text-center text-sm text-base-content/60 pt-2">
              + {{ overview.lowStock.count - 5 }} more items need attention
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-base-content/60">
            <IconAlertTriangle class="w-12 h-12 mx-auto mb-2 text-success" />
            <p>All products are well stocked!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
