<route lang="yaml">
meta:
  title: Stock Movements
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import DateRangeFilter from '@/components/restaurant/shared/DateRangeFilter.vue'
import ExportButton from '@/components/restaurant/shared/ExportButton.vue'
import StockInModal from '@/components/restaurant/stock/StockInModal.vue'
import StockOutModal from '@/components/restaurant/stock/StockOutModal.vue'
import StockTransferModal from '@/components/restaurant/stock/StockTransferModal.vue'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconPackage, 
  IconPlus, 
  IconMinus, 
  IconTransfer,
  IconTrendingUp,
  IconTrendingDown,
  IconEye,
  IconRefresh
} from '@tabler/icons-vue'

const router = useRouter()

const { 
  getStockMovements, 
  stockMovements, 
  getMovementById,
  loading,
  recordStockIn,
  recordStockOut,
  transferStock
} = useRestaurantStock()
const { products, fetchProducts } = useRestaurantProducts()
const { locations, fetchLocations } = useRestaurantLocations()

// Filters
const dateRange = ref({ start: '', end: '' })
const selectedProduct = ref('')
const selectedLocation = ref('')
const selectedType = ref('')

// Modals
const showStockInModal = ref(false)
const showStockOutModal = ref(false)
const showTransferModal = ref(false)
const showDetailModal = ref(false)
const selectedMovement = ref(null)
const detailLoading = ref(false)

const movementTypes = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer', label: 'Transfer' }
]

// Stats
const movementStats = computed(() => {
  const movements = getMovementsArray()
  return {
    total: movements.length,
    stockIn: movements.filter(m => m.type === 'in').length,
    stockOut: movements.filter(m => m.type === 'out').length,
    transfers: movements.filter(m => m.type === 'transfer').length,
    adjustments: movements.filter(m => m.type === 'adjustment').length
  }
})

watch([dateRange, selectedProduct, selectedLocation, selectedType], () => {
  loadMovements()
}, { deep: true })

const loadMovements = async () => {
  const filters = {}
  
  if (dateRange.value.start) {
    filters.startDate = dateRange.value.start
  }
  
  if (dateRange.value.end) {
    filters.endDate = dateRange.value.end
  }
  
  if (selectedProduct.value) {
    filters.productId = selectedProduct.value
  }
  
  if (selectedLocation.value) {
    filters.locationId = selectedLocation.value
  }
  
  if (selectedType.value) {
    filters.type = selectedType.value
  }
  
  await getStockMovements(filters)
}

const getMovementsArray = () => {
  if (!stockMovements.value) return []
  if (Array.isArray(stockMovements.value)) return stockMovements.value
  if (stockMovements.value.data) return stockMovements.value.data
  return []
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMovementTypeClass = (type) => {
  const classes = {
    in: 'badge-success',
    out: 'badge-error',
    adjustment: 'badge-warning',
    transfer: 'badge-info'
  }
  return classes[type] || 'badge-ghost'
}

const getMovementTypeLabel = (type) => {
  const labels = {
    in: 'Stock In',
    out: 'Stock Out',
    adjustment: 'Adjustment',
    transfer: 'Transfer'
  }
  return labels[type] || type
}

const exportColumns = [
  { key: 'date', label: 'Date' },
  { key: 'product', label: 'Product' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'reason', label: 'Reason' },
  { key: 'location', label: 'Location' },
  { key: 'notes', label: 'Notes' }
]

const prepareExportData = () => {
  const movements = getMovementsArray()
  return movements.map(movement => ({
    date: formatDate(movement.createdAt),
    product: movement.product?.name || '-',
    type: getMovementTypeLabel(movement.type),
    quantity: `${movement.type === 'in' ? '+' : '-'}${movement.quantity} ${movement.product?.unit || 'pcs'}`,
    reason: movement.reason || '-',
    location: movement.location?.name || '-',
    notes: movement.notes || '-'
  }))
}

const clearFilters = () => {
  dateRange.value = { start: '', end: '' }
  selectedProduct.value = ''
  selectedLocation.value = ''
  selectedType.value = ''
}

// Modal submit handlers: call composable to perform API action
const handleStockInSuccess = async (payload) => {
  console.log('[movements] handleStockInSuccess payload:', payload)
  try {
    await recordStockIn(payload)
    showStockInModal.value = false
    await loadMovements()
  } catch (err) {
    console.error('Stock in failed:', err)
  }
}

const handleStockOutSuccess = async (payload) => {
  console.log('[movements] handleStockOutSuccess payload:', payload)
  try {
    await recordStockOut(payload)
    showStockOutModal.value = false
    await loadMovements()
  } catch (err) {
    console.error('Stock out failed:', err)
  }
}

const handleTransferSuccess = async (payload) => {
  console.log('[movements] handleTransferSuccess payload:', payload)
  try {
    await transferStock(payload)
    showTransferModal.value = false
    await loadMovements()
  } catch (err) {
    console.error('Transfer failed:', err)
  }
}

const viewMovementDetail = async (movement) => {
  selectedMovement.value = movement
  showDetailModal.value = true
  
  // Fetch full details if needed
  if (movement.id) {
    detailLoading.value = true
    try {
      const detail = await getMovementById(movement.id)
      if (detail) {
        selectedMovement.value = { ...movement, ...detail }
      }
    } catch (error) {
      console.error('Failed to load movement detail:', error)
    } finally {
      detailLoading.value = false
    }
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedMovement.value = null
}

onMounted(async () => {
  await Promise.all([
    loadMovements(),
    fetchProducts(),
    fetchLocations()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm" @click="router.push('/restaurant/stock')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Stock Movements</h1>
        <p class="text-base-content/60 mt-1">View complete stock movement history</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button class="btn btn-success btn-sm" @click="showStockInModal = true">
          <IconTrendingUp class="w-4 h-4 mr-1" />
          Stock In
        </button>
        <button class="btn btn-error btn-sm" @click="showStockOutModal = true">
          <IconTrendingDown class="w-4 h-4 mr-1" />
          Stock Out
        </button>
        <button class="btn btn-info btn-sm" @click="showTransferModal = true">
          <IconTransfer class="w-4 h-4 mr-1" />
          Transfer
        </button>
        <button class="btn btn-ghost btn-sm" @click="loadMovements">
          <IconRefresh class="w-4 h-4" />
        </button>
        <ExportButton 
          :data="prepareExportData()"
          :columns="exportColumns"
          filename="stock-movements"
        />
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div class="stat bg-base-100 rounded-box shadow p-3">
        <div class="stat-title text-xs">Total</div>
        <div class="stat-value text-xl">{{ movementStats.total }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow p-3">
        <div class="stat-title text-xs">Stock In</div>
        <div class="stat-value text-xl text-success">{{ movementStats.stockIn }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow p-3">
        <div class="stat-title text-xs">Stock Out</div>
        <div class="stat-value text-xl text-error">{{ movementStats.stockOut }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow p-3">
        <div class="stat-title text-xs">Transfers</div>
        <div class="stat-value text-xl text-info">{{ movementStats.transfers }}</div>
      </div>
      <div class="stat bg-base-100 rounded-box shadow p-3">
        <div class="stat-title text-xs">Adjustments</div>
        <div class="stat-value text-xl text-warning">{{ movementStats.adjustments }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div class="flex items-center gap-2">
            <IconFilter class="w-5 h-5" />
            <h3 class="font-semibold">Filters</h3>
          </div>
          <button 
            v-if="dateRange.start || selectedProduct || selectedLocation || selectedType"
            class="btn btn-xs btn-ghost w-full sm:w-auto sm:ml-auto"
            @click="clearFilters"
          >
            Clear All
          </button>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Product Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Product</span>
            </label>
            <select v-model="selectedProduct" class="select select-bordered">
              <option value="">All Products</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
          </div>

          <!-- Location Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <select v-model="selectedLocation" class="select select-bordered">
              <option value="">All Locations</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>

          <!-- Type Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Movement Type</span>
            </label>
            <select v-model="selectedType" class="select select-bordered">
              <option value="">All Types</option>
              <option v-for="type in movementTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Date Range -->
          <div class="form-control">
            <DateRangeFilter v-model="dateRange" />
          </div>
        </div>
      </div>
    </div>

    <!-- Movements Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div v-if="loading" class="flex justify-center py-12">
          <div class="loading loading-spinner loading-lg"></div>
        </div>

        <div v-else-if="getMovementsArray().length === 0" class="text-center py-12">
          <IconPackage class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold mb-2">No movements found</h3>
          <p class="text-base-content/60">Try adjusting your filters</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Type</th>
                <th class="text-right">Quantity</th>
                <th>Location</th>
                <th>Notes</th>
                <th class="w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="movement in getMovementsArray()" :key="movement.id" class="hover">
                <td class="whitespace-nowrap">{{ formatDate(movement.createdAt) }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="avatar">
                      <div class="w-8 h-8 rounded">
                        <img 
                          :src="movement.product?.imageUrl || 'https://via.placeholder.com/50'" 
                          :alt="movement.product?.name"
                        />
                      </div>
                    </div>
                    <div>
                      <div class="font-semibold">{{ movement.product?.name || 'Unknown' }}</div>
                      <div class="text-xs text-base-content/60">{{ movement.product?.sku }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div :class="['badge', getMovementTypeClass(movement.movementType)]">
                    {{ getMovementTypeLabel(movement.movementType) }}
                  </div>
                </td>
                <td class="text-right font-semibold" :class="movement.movementType === 'in' ? 'text-success' : 'text-error'">
                  {{ movement.movementType === 'in' ? '+' : '-' }}{{ movement.quantity }} {{ movement.product?.unit || 'pcs' }}
                </td>
                <td>{{ movement.location?.name || '-' }}</td>
                <td>
                  <span class="text-sm text-base-content/60">{{ movement.notes || '-' }}</span>
                </td>
                <td>
                  <button 
                    class="btn btn-ghost btn-xs" 
                    @click="viewMovementDetail(movement)"
                    title="View Details"
                  >
                    <IconEye class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <StockInModal
      v-model:show="showStockInModal"
      :products="products"
      :locations="locations"
      :loading="loading"
      @success="handleStockInSuccess"
    />
    
    <StockOutModal
      v-model:show="showStockOutModal"
      :products="products"
      :locations="locations"
      :loading="loading"
      @success="handleStockOutSuccess"
    />
    
    <StockTransferModal
      v-model:show="showTransferModal"
      :products="products"
      :locations="locations"
      :loading="loading"
      @success="handleTransferSuccess"
    />

    <!-- Movement Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal modal-open">
        <div class="modal-box max-w-lg">
          <h3 class="font-bold text-lg mb-4">Movement Details</h3>
          
          <div v-if="detailLoading" class="flex justify-center py-8">
            <div class="loading loading-spinner loading-md"></div>
          </div>
          
          <div v-else-if="selectedMovement" class="space-y-4">
            <!-- Movement Type Badge -->
            <div class="flex items-center gap-3">
              <div :class="['badge badge-lg', getMovementTypeClass(selectedMovement.type)]">
                {{ getMovementTypeLabel(selectedMovement.type) }}
              </div>
              <span class="text-base-content/60">
                {{ formatDate(selectedMovement.createdAt) }}
              </span>
            </div>
            
            <!-- Product Info -->
            <div class="card bg-base-200">
              <div class="card-body p-4">
                <div class="flex items-center gap-3">
                  <div class="avatar">
                    <div class="w-12 h-12 rounded">
                      <img 
                        :src="selectedMovement.product?.imageUrl || 'https://via.placeholder.com/50'" 
                        :alt="selectedMovement.product?.name"
                      />
                    </div>
                  </div>
                  <div>
                    <div class="font-semibold">{{ selectedMovement.product?.name }}</div>
                    <div class="text-sm text-base-content/60">
                      SKU: {{ selectedMovement.product?.sku || '-' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-base-content/60">Quantity</div>
                <div class="font-semibold" :class="selectedMovement.type === 'in' ? 'text-success' : 'text-error'">
                  {{ selectedMovement.type === 'in' ? '+' : '-' }}{{ selectedMovement.quantity }} 
                  {{ selectedMovement.product?.unit || 'pcs' }}
                </div>
              </div>
              
              <div>
                <div class="text-sm text-base-content/60">Location</div>
                <div class="font-semibold">{{ selectedMovement.location?.name || '-' }}</div>
              </div>
              
              <div v-if="selectedMovement.reason">
                <div class="text-sm text-base-content/60">Reason</div>
                <div class="font-semibold">{{ selectedMovement.reason }}</div>
              </div>
              
              <div v-if="selectedMovement.reference">
                <div class="text-sm text-base-content/60">Reference</div>
                <div class="font-semibold">{{ selectedMovement.reference }}</div>
              </div>
              
              <div v-if="selectedMovement.unitCost">
                <div class="text-sm text-base-content/60">Unit Cost</div>
                <div class="font-semibold">{{ selectedMovement.unitCost }}</div>
              </div>
              
              <div v-if="selectedMovement.totalValue">
                <div class="text-sm text-base-content/60">Total Value</div>
                <div class="font-semibold">{{ selectedMovement.totalValue }}</div>
              </div>
            </div>
            
            <!-- Notes -->
            <div v-if="selectedMovement.notes">
              <div class="text-sm text-base-content/60 mb-1">Notes</div>
              <div class="p-3 bg-base-200 rounded-lg text-sm">
                {{ selectedMovement.notes }}
              </div>
            </div>
            
            <!-- Transfer Details -->
            <div v-if="selectedMovement.type === 'transfer'" class="card bg-info/10 border border-info">
              <div class="card-body p-4">
                <h4 class="font-semibold text-info mb-2">Transfer Details</h4>
                <div class="flex items-center gap-2">
                  <span>{{ selectedMovement.fromLocation?.name || 'From' }}</span>
                  <IconTransfer class="w-4 h-4" />
                  <span>{{ selectedMovement.toLocation?.name || 'To' }}</span>
                </div>
              </div>
            </div>
            
            <!-- Created By -->
            <div v-if="selectedMovement.createdBy" class="text-sm text-base-content/60">
              Created by: {{ selectedMovement.createdBy.name || selectedMovement.createdBy.email }}
            </div>
          </div>
          
          <div class="modal-action">
            <button class="btn" @click="closeDetailModal">Close</button>
          </div>
        </div>
        <div class="modal-backdrop bg-black/50" @click="closeDetailModal"></div>
      </div>
    </Teleport>
  </div>
</template>
