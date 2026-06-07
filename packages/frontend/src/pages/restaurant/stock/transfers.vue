<route lang="yaml">
name: restaurant-stock-transfers
meta:
  layout: default
  title: Stock Transfers
  requiresAuth: true
  permissions: ['restaurant.stock.view']
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import StockTransferModal from '@/components/restaurant/stock/StockTransferModal.vue'
import {
  IconTransfer,
  IconPlus,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconArrowRight,
  IconCalendar,
  IconBox,
  IconMapPin
} from '@tabler/icons-vue'

const stockComposable = useRestaurantStock()
const productsComposable = useRestaurantProducts()
const locationsComposable = useRestaurantLocations()

// State
const transfers = ref([])
const products = ref([])
const locations = ref([])
const loading = ref(false)
const showTransferModal = ref(false)

// Filters
const filters = ref({
  locationId: '',
  productId: '',
  startDate: '',
  endDate: ''
})

// Pagination
const currentPage = ref(1)
const totalPages = ref(1)
const itemsPerPage = 20

// Stats
const stats = computed(() => {
  const today = transfers.value.filter(t => {
    const transferDate = new Date(t.createdAt).toDateString()
    return transferDate === new Date().toDateString()
  })

  return {
    totalTransfers: transfers.value.length,
    todayTransfers: today.length,
    totalQuantity: transfers.value.reduce((sum, t) => sum + (t.quantity || 0), 0)
  }
})

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// Get location name
const getLocationName = (locationId) => {
  return locations.value.find(l => l.id === locationId)?.name || '-'
}

// Get product name
const getProductName = (productId) => {
  return products.value.find(p => p.id === productId)?.name || '-'
}

// Fetch data
const fetchTransfers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage
    }
    
    if (filters.value.locationId) params.locationId = filters.value.locationId
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate

    const response = await stockComposable.getTransferHistory(params)
    
    if (Array.isArray(response)) {
      transfers.value = response
    } else if (response?.data) {
      transfers.value = response.data
      totalPages.value = response.totalPages || 1
    }
  } catch (err) {
    console.error('Failed to fetch transfers:', err)
  } finally {
    loading.value = false
  }
}

const fetchProducts = async () => {
  try {
    const response = await productsComposable.fetchProducts({ isActive: true, limit: 200 })
    products.value = response?.data || []
  } catch (err) {
    console.error('Failed to fetch products:', err)
  }
}

const fetchLocations = async () => {
  try {
    const response = await locationsComposable.fetchLocations()
    locations.value = response?.data || []
  } catch (err) {
    console.error('Failed to fetch locations:', err)
  }
}

// Handle transfer submit
const handleTransferSubmit = async (data) => {
  try {
    await stockComposable.transferStock(data)
    showTransferModal.value = false
    await fetchTransfers()
  } catch (err) {
    console.error('Transfer failed:', err)
  }
}

// Reset filters
const resetFilters = () => {
  filters.value = {
    locationId: '',
    productId: '',
    startDate: '',
    endDate: ''
  }
  currentPage.value = 1
  fetchTransfers()
}

// Apply filters
const applyFilters = () => {
  currentPage.value = 1
  fetchTransfers()
}

// Page change
const changePage = (page) => {
  currentPage.value = page
  fetchTransfers()
}

// Init
onMounted(async () => {
  await Promise.all([
    fetchTransfers(),
    fetchProducts(),
    fetchLocations()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <IconTransfer class="w-7 h-7 text-info" />
          Stock Transfers
        </h1>
        <p class="text-base-content/60 text-sm mt-1">
          Transfer stock between locations
        </p>
      </div>

      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-sm"
          @click="fetchTransfers"
          :disabled="loading"
        >
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
        <button
          class="btn btn-info gap-2"
          @click="showTransferModal = true"
        >
          <IconPlus class="w-4 h-4" />
          New Transfer
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats stats-vertical md:stats-horizontal shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-info">
          <IconTransfer class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Transfers</div>
        <div class="stat-value text-info">{{ stats.totalTransfers }}</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-success">
          <IconCalendar class="w-8 h-8" />
        </div>
        <div class="stat-title">Today</div>
        <div class="stat-value text-success">{{ stats.todayTransfers }}</div>
      </div>
      <div class="stat">
        <div class="stat-figure text-primary">
          <IconBox class="w-8 h-8" />
        </div>
        <div class="stat-title">Items Transferred</div>
        <div class="stat-value text-primary">{{ stats.totalQuantity }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body py-4">
        <div class="flex flex-wrap items-end gap-3">
          <!-- Location Filter -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs">Location</span>
            </label>
            <select
              v-model="filters.locationId"
              class="select select-bordered select-sm"
            >
              <option value="">All Locations</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
              >
                {{ location.name }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs">From Date</span>
            </label>
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered input-sm"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs">To Date</span>
            </label>
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered input-sm"
            />
          </div>

          <button class="btn btn-primary btn-sm" @click="applyFilters">
            <IconFilter class="w-4 h-4" />
            Apply
          </button>

          <button class="btn btn-ghost btn-sm" @click="resetFilters">
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Transfers Table -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-0">
        <div v-if="loading" class="flex justify-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="transfers.length === 0" class="text-center py-12">
          <IconTransfer class="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p class="text-lg font-medium">No transfers found</p>
          <p class="text-sm text-base-content/60 mb-4">
            Start by creating a new stock transfer
          </p>
          <button
            class="btn btn-info btn-sm"
            @click="showTransferModal = true"
          >
            <IconPlus class="w-4 h-4 mr-1" />
            New Transfer
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>From</th>
                <th></th>
                <th>To</th>
                <th class="text-right">Quantity</th>
                <th>Notes</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transfer in transfers" :key="transfer.id">
                <td class="whitespace-nowrap">
                  {{ formatDate(transfer.createdAt) }}
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <IconBox class="w-4 h-4 text-base-content/60" />
                    <span class="font-medium">
                      {{ transfer.product?.name || getProductName(transfer.productId) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <IconMapPin class="w-4 h-4 text-error" />
                    {{ transfer.fromLocation?.name || getLocationName(transfer.fromLocationId) }}
                  </div>
                </td>
                <td>
                  <IconArrowRight class="w-5 h-5 text-info" />
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <IconMapPin class="w-4 h-4 text-success" />
                    {{ transfer.toLocation?.name || getLocationName(transfer.toLocationId) }}
                  </div>
                </td>
                <td class="text-right font-bold">
                  {{ transfer.quantity }}
                </td>
                <td>
                  <span v-if="transfer.notes" class="text-sm text-base-content/60">
                    {{ transfer.notes }}
                  </span>
                  <span v-else class="text-sm text-base-content/40">-</span>
                </td>
                <td>
                  {{ transfer.createdBy?.name || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center py-4 border-t border-base-200">
          <div class="btn-group">
            <button
              class="btn btn-sm"
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
            >
              «
            </button>
            <button class="btn btn-sm">
              Page {{ currentPage }} of {{ totalPages }}
            </button>
            <button
              class="btn btn-sm"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Transfer Modal -->
    <StockTransferModal
      :show="showTransferModal"
      :products="products"
      :locations="locations"
      :loading="stockComposable.loading.value"
      @close="showTransferModal = false"
      @submit="handleTransferSubmit"
    />
  </div>
</template>
