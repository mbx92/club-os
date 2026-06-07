<route lang="yaml">
meta:
  title: Stock Overview
  layout: default
</route>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import StockOverviewCard from '@/components/restaurant/stock/StockOverviewCard.vue'
import StockMovementList from '@/components/restaurant/stock/StockMovementList.vue'
import StockInModal from '@/components/restaurant/stock/StockInModal.vue'
import StockOutModal from '@/components/restaurant/stock/StockOutModal.vue'
import BulkStockInModal from '@/components/restaurant/stock/BulkStockInModal.vue'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import { 
  IconPackage, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconAlertTriangle,
  IconFileText,
  IconHistory,
  IconPlus,
  IconMinus,
  IconPackages,
  IconTransfer
} from '@tabler/icons-vue'

const router = useRouter()

const { 
  getStockMovements, 
  stockMovements, 
  getStockSummary,
  recordStockIn,
  recordStockOut,
  bulkStockIn,
  loading: stockLoading 
} = useRestaurantStock()
const { fetchProducts, products, getLowStockProducts, lowStockProducts, loading: productsLoading } = useRestaurantProducts()
const { fetchLocations, locations, loading: locationsLoading } = useRestaurantLocations()

// Modals
const showStockInModal = ref(false)
const showStockOutModal = ref(false)
const showBulkStockInModal = ref(false)

const stats = ref({
  totalMovements: 0,
  stockIn: 0,
  stockOut: 0,
  lowStockCount: 0,
  totalValue: 0,
  totalProducts: 0
})

// default to last 30 days
const makeDefaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

const dateRange = ref(makeDefaultRange())

const loadData = async () => {
  await Promise.all([
    // use canonical `limit` query param (composable accepts `perPage` too)
    getStockMovements({ limit: 10 }),
    getLowStockProducts(),
    // load full product list for selection in modals
    fetchProducts({ isActive: true, limit: 200 }),
    // load locations for selection
    fetchLocations(),
    loadSummary()
  ])

  // Calculate stats from movements
  if (stockMovements.value && Array.isArray(stockMovements.value)) {
    const movements = stockMovements.value
    stats.value = {
      ...stats.value,
      totalMovements: movements.length,
      stockIn: movements.filter(m => m.type === 'in').length,
      stockOut: movements.filter(m => m.type === 'out').length,
      lowStockCount: lowStockProducts.value?.length || 0
    }
  }
}

const loadSummary = async () => {
  try {
    const summary = await getStockSummary(dateRange.value.start, dateRange.value.end)
    if (summary) {
      stats.value.totalValue = summary.totalValue || 0
      stats.value.totalProducts = summary.totalProducts || 0
    }
  } catch (error) {
    console.error('Failed to load stock summary:', error)
  }
}

// reload summary when date range changes
watch(dateRange, () => {
  loadSummary()
}, { deep: true })

const recentMovements = computed(() => {
  if (!stockMovements.value) return []
  if (Array.isArray(stockMovements.value)) return stockMovements.value.slice(0, 10)
  if (stockMovements.value.data) return stockMovements.value.data.slice(0, 10)
  return []
})

// Modal handlers: call composable methods and reload data
const handleStockInSubmit = async (payload) => {
  console.log('[index] handleStockInSubmit payload:', payload)
  try {
    await recordStockIn(payload)
    // refresh UI
    await loadData()
  } catch (err) {
    console.error('recordStockIn error:', err)
  } finally {
    showStockInModal.value = false
  }
}

const handleStockOutSubmit = async (payload) => {
  console.log('[index] handleStockOutSubmit payload:', payload)
  try {
    await recordStockOut(payload)
    await loadData()
  } catch (err) {
    console.error('recordStockOut error:', err)
  } finally {
    showStockOutModal.value = false
  }
}

const handleBulkStockInSubmit = async (payload) => {
  console.log('[index] handleBulkStockInSubmit payload:', payload)
  try {
    await bulkStockIn(payload)
    await loadData()
  } catch (err) {
    console.error('bulkStockIn error:', err)
  } finally {
    showBulkStockInModal.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Stock Overview</h1>
        <p class="text-base-content/60 mt-1">Monitor your inventory and stock movements</p>
      </div>
      
      <div class="flex gap-2">
        <!-- Stock Action Dropdown -->
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-sm btn-primary">
            <IconPlus class="w-4 h-4 mr-2" />
            Stock Actions
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </label>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-56">
            <li>
              <a @click="showStockInModal = true">
                <IconTrendingUp class="w-4 h-4 text-success" />
                Stock In (Purchase)
              </a>
            </li>
            <li>
              <a @click="showBulkStockInModal = true">
                <IconPackages class="w-4 h-4 text-primary" />
                Bulk Stock In
              </a>
            </li>
            <li>
              <a @click="showStockOutModal = true">
                <IconTrendingDown class="w-4 h-4 text-error" />
                Stock Out (Wastage)
              </a>
            </li>
            <li class="border-t mt-1 pt-1">
              <router-link to="/restaurant/stock/transfers">
                <IconTransfer class="w-4 h-4 text-info" />
                Stock Transfers
              </router-link>
            </li>
          </ul>
        </div>
        
        <router-link to="/restaurant/stock/movements" class="btn btn-secondary btn-sm">
          <IconHistory class="w-4 h-4 mr-2" />
          View All Movements
        </router-link>
        <router-link to="/restaurant/stock/alerts" class="btn btn-error btn-sm btn-outline">
          <IconAlertTriangle class="w-4 h-4 mr-2" />
          Stock Alerts
        </router-link>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StockOverviewCard
        title="Total Movements"
        :value="stats.totalMovements"
        description="Last 30 days"
        :icon="IconPackage"
        icon-color="text-primary"
        :loading="stockLoading"
      />
      
      <StockOverviewCard
        title="Stock In"
        :value="stats.stockIn"
        description="Items received"
        :icon="IconTrendingUp"
        icon-color="text-success"
        trend="up"
        trend-value="+12%"
        :loading="stockLoading"
      />
      
      <StockOverviewCard
        title="Stock Out"
        :value="stats.stockOut"
        description="Items issued"
        :icon="IconTrendingDown"
        icon-color="text-info"
        trend="down"
        trend-value="-5%"
        :loading="stockLoading"
      />
      
      <StockOverviewCard
        title="Low Stock Alerts"
        :value="stats.lowStockCount"
        :description="stats.lowStockCount > 0 ? 'Requires attention' : 'All good'"
        :icon="IconAlertTriangle"
        :icon-color="stats.lowStockCount > 0 ? 'text-error' : 'text-success'"
        :alert="stats.lowStockCount > 0"
        :loading="productsLoading"
      />
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Movements -->
      <div class="lg:col-span-2">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h3 class="card-title">Recent Stock Movements</h3>
              <router-link to="/restaurant/stock/movements" class="btn btn-sm btn-ghost">
                View All →
              </router-link>
            </div>
            
            <StockMovementList
              :movements="recentMovements"
              :loading="stockLoading"
            />
          </div>
        </div>
      </div>

      <!-- Quick Actions & Low Stock -->
      <div class="space-y-6">
        <!-- Quick Actions -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title mb-4">Quick Actions</h3>
            
            <div class="flex flex-col gap-2">
              <button class="btn btn-success btn-block" @click="showStockInModal = true">
                <IconTrendingUp class="w-5 h-5 mr-2" />
                Record Stock In
              </button>
              
              <button class="btn btn-primary btn-outline btn-block" @click="showBulkStockInModal = true">
                <IconPackages class="w-5 h-5 mr-2" />
                Bulk Stock In
              </button>
              
              <button class="btn btn-error btn-outline btn-block" @click="showStockOutModal = true">
                <IconMinus class="w-5 h-5 mr-2" />
                Record Stock Out
              </button>
              
              <router-link to="/restaurant/stock/transfers" class="btn btn-info btn-outline btn-block">
                <IconTransfer class="w-5 h-5 mr-2" />
                Stock Transfers
              </router-link>
              
              <div class="divider my-1"></div>
              
              <router-link to="/restaurant/stock/movements" class="btn btn-secondary btn-outline btn-block">
                <IconHistory class="w-5 h-5 mr-2" />
                View Stock History
              </router-link>
              
              <router-link to="/restaurant/stock/alerts" class="btn btn-warning btn-outline btn-block">
                <IconAlertTriangle class="w-5 h-5 mr-2" />
                Low Stock Alerts
              </router-link>
              
              <button class="btn btn-ghost btn-block" @click="router.push('/restaurant/products')">
                <IconPackage class="w-5 h-5 mr-2" />
                Manage Products
              </button>
            </div>
          </div>
        </div>

        <!-- Low Stock Summary -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h3 class="card-title">Low Stock Items</h3>
              <router-link to="/restaurant/stock/alerts" class="btn btn-sm btn-ghost">
                View All →
              </router-link>
            </div>
            
            <div v-if="productsLoading" class="flex justify-center py-4">
              <div class="loading loading-spinner loading-md"></div>
            </div>
            
            <div v-else-if="!lowStockProducts || lowStockProducts.length === 0" class="text-center py-6 text-success">
              <IconAlertTriangle class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p class="text-sm">All stock levels are good!</p>
            </div>
            
            <div v-else class="space-y-2">
              <div 
                v-for="product in lowStockProducts.slice(0, 5)" 
                :key="product.id"
                class="flex items-center justify-between p-2 bg-base-200 rounded hover:bg-base-300 transition-colors cursor-pointer"
                @click="router.push(`/restaurant/products/${product.id}`)"
              >
                <div class="flex-1 min-w-0">
                  <div class="font-semibold truncate text-sm">{{ product.name }}</div>
                  <div class="text-xs text-base-content/60">
                    {{ product.stockQuantity }} {{ product.unit || 'pcs' }} remaining
                  </div>
                </div>
                <div class="badge badge-error badge-sm">Low</div>
              </div>
              
              <div v-if="lowStockProducts.length > 5" class="text-center text-xs text-base-content/60 pt-2">
                + {{ lowStockProducts.length - 5 }} more items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <StockInModal
      v-model:show="showStockInModal"
      :products="products"
      :locations="locations"
      :loading="productsLoading || locationsLoading || stockLoading"
      @success="handleStockInSubmit"
    />
    
    <StockOutModal
      v-model:show="showStockOutModal"
      :products="products"
      :locations="locations"
      :loading="productsLoading || locationsLoading || stockLoading"
      @success="handleStockOutSubmit"
    />
    
    <BulkStockInModal
      v-model:show="showBulkStockInModal"
      :products="products"
      :locations="locations"
      :loading="productsLoading || locationsLoading || stockLoading"
      @success="handleBulkStockInSubmit"
    />
  </div>
</template>
