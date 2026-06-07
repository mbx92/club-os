<route lang="yaml">
meta:
  title: Product Performance
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantReports } from '@/composables/restaurant/useRestaurantReports'
import { useRestaurantCategories } from '@/composables/restaurant/useRestaurantCategories'
import ProductPerformanceTable from '@/components/restaurant/reports/ProductPerformanceTable.vue'
import PaymentMethodPieChart from '@/components/restaurant/reports/PaymentMethodPieChart.vue'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconShoppingCart,
  IconCash,
  IconTrophy,
  IconCategory
} from '@tabler/icons-vue'

const router = useRouter()
const isDev = import.meta.env.DEV
const { 
  getProductReport, 
  productReport, 
  formatCurrency, 
  exportToCSV,
  loading 
} = useRestaurantReports()
const { categories, fetchCategories } = useRestaurantCategories()

// Filters
const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})
const selectedCategory = ref('')
const sortBy = ref('quantity')
const limit = ref(20)

const categoryData = ref([])

// Summary stats
const summary = computed(() => {
  if (!productReport.value) return null
  
  const summaryData = productReport.value?.summary || {}
  const products = productReport.value?.topProducts || []
  const topProduct = products[0]
  
  return {
    totalProducts: summaryData.uniqueProducts || 0,
    totalQuantity: summaryData.totalProductsSold || 0,
    totalRevenue: summaryData.totalRevenue || 0,
    topProduct: topProduct?.productName || '-'
  }
})

const loadData = async () => {
  try {
    const result = await getProductReport({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      categoryId: selectedCategory.value || undefined,
      sortBy: sortBy.value,
      limit: limit.value
    })
    if (isDev) {
      console.log('📦 Product Report Result:', result)
      console.log('📦 productReport.value:', productReport.value)
    }
    await loadCategoryData()
  } catch (err) {
    console.error('Failed to load product data:', err)
  }
}

const loadCategoryData = async () => {
  try {
    const categoryBreakdown = productReport.value?.categoryBreakdown || []
    
    categoryData.value = categoryBreakdown.map(cb => {
      const category = categories.value.find(c => c.id === cb.categoryId)
      return {
        label: category?.name || 'Uncategorized',
        value: cb.totalRevenue || 0,
        count: cb.totalQuantity || 0
      }
    }).sort((a, b) => b.value - a.value)
  } catch (err) {
    console.error('Failed to load category data:', err)
  }
}

// Handle sort change
const handleSortChange = (newSortBy) => {
  sortBy.value = newSortBy
}

// Export data
const handleExport = () => {
  const products = productReport.value?.topProducts || []
  if (!products.length) return
  
  const exportData = products.map((p, index) => ({
    Rank: index + 1,
    Product: p.productName,
    SKU: p.sku,
    Category: categories.value.find(c => c.id === p.categoryId)?.name || '-',
    Quantity: p.totalQuantity,
    Revenue: p.totalRevenue,
    'Order Count': p.orderCount,
    'Avg Price': p.averagePrice
  }))
  
  exportToCSV(exportData, 'product-performance')
}

// sortBy changes are handled client-side in ProductPerformanceTable (no re-fetch needed)
watch([dateRange, selectedCategory, limit], () => {
  loadData()
}, { deep: true })

onMounted(async () => {
  await fetchCategories()
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
        <h1 class="text-3xl font-bold">Product Performance</h1>
        <p class="text-base-content/60 mt-1">Top selling products and category analysis</p>
      </div>
      <button class="btn btn-ghost btn-sm" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
      <button class="btn btn-primary btn-sm" @click="handleExport" :disabled="!productReport?.topProducts?.length">
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
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <!-- Date Range -->
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>

          <!-- Category -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Category</span>
            </label>
            <select v-model="selectedCategory" class="select select-bordered w-full mt-2">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Limit -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Show Top</span>
            </label>
            <select v-model="limit" class="select select-bordered w-full mt-2">
              <option :value="10">Top 10</option>
              <option :value="20">Top 20</option>
              <option :value="50">Top 50</option>
              <option :value="100">Top 100</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-primary">
          <IconShoppingCart class="w-8 h-8" />
        </div>
        <div class="stat-title">Products</div>
        <div class="stat-value text-primary text-xl">{{ summary.totalProducts }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-success">
          <IconCategory class="w-8 h-8" />
        </div>
        <div class="stat-title">Items Sold</div>
        <div class="stat-value text-success text-xl">{{ summary.totalQuantity }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-info">
          <IconCash class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Revenue</div>
        <div class="stat-value text-info text-xl">{{ formatCurrency(summary.totalRevenue) }}</div>
      </div>
      
      <div class="stat bg-base-100 rounded-box shadow">
        <div class="stat-figure text-warning">
          <IconTrophy class="w-8 h-8" />
        </div>
        <div class="stat-title">#1 Product</div>
        <div class="stat-value text-warning text-sm truncate">{{ summary.topProduct }}</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Product Performance Table -->
      <div class="lg:col-span-2 card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Top Products</h3>
          
          <ProductPerformanceTable
            :products="(productReport?.topProducts || []).map(p => ({
              id: p.productId,
              name: p.productName,
              quantity: p.totalQuantity,
              revenue: p.totalRevenue,
              categoryName: categories.find(c => c.id === p.categoryId)?.name
            }))"
            :loading="loading"
            :sort-by="sortBy"
            @sort="handleSortChange"
          />
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">By Category</h3>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <PaymentMethodPieChart 
            v-else
            :data="categoryData"
            height="300px"
          />
        </div>
      </div>
    </div>
  </div>
</template>
