<route lang="yaml">
meta:
  title: Product Detail
  layout: default
</route>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useNotification } from '@/composables/core/useNotification'
import ProductFormModal from '@/components/restaurant/products/ProductFormModal.vue'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import StockAdjustmentModal from '@/components/restaurant/products/StockAdjustmentModal.vue'
import ProductExtrasManager from '@/components/restaurant/products/ProductExtrasManager.vue'
import ProductVariantsManager from '@/components/restaurant/products/ProductVariantsManager.vue'
import { 
  IconArrowLeft, 
  IconEdit, 
  IconTrash,
  IconAdjustments,
  IconPackage,
  IconCurrencyDollar,
  IconClock,
  IconFlame,
  IconAlertTriangle
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  getProductById, 
  deleteProduct,
  updateProduct,
  adjustStock,
  loading 
} = useRestaurantProducts()

const { locations, fetchLocations } = useRestaurantLocations()
const { getStockMovements, stockMovements, loading: stockLoading } = useRestaurantStock()

const product = ref(null)
const activeTab = ref('info')
const showStockModal = ref(false)
const showEditModal = ref(false)

const tabs = [
  { id: 'info', label: 'Product Info' },
  { id: 'variants', label: 'Variants' },
  { id: 'extras', label: 'Product Extras' },
  { id: 'stock', label: 'Stock Movements' },
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
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

const getStockBadgeClass = computed(() => {
  if (!product.value || !product.value.trackStock) return 'badge-ghost'
  
  const quantity = product.value.stockQuantity || 0
  const minLevel = product.value.minStockLevel || 0
  
  if (quantity === 0) return 'badge-error'
  if (quantity <= minLevel) return 'badge-warning'
  return 'badge-success'
})

const getStockStatus = computed(() => {
  if (!product.value || !product.value.trackStock) return 'Not tracked'
  
  const quantity = product.value.stockQuantity || 0
  const minLevel = product.value.minStockLevel || 0
  
  if (quantity === 0) return 'Out of stock'
  if (quantity <= minLevel) return 'Low stock'
  return 'In stock'
})

const profitMargin = computed(() => {
  if (!product.value || !product.value.price || !product.value.cost) return 0
  return ((product.value.price - product.value.cost) / product.value.price * 100).toFixed(2)
})

const getInitials = (name) => {
  if (!name) return 'N/A'
  return name.split(' ').slice(0,2).map(n => (n && n[0]) ? n[0].toUpperCase() : '').join('')
}

const stringToColor = (str) => {
  if (!str) return '#9CA3AF'
  const palette = ['#F97316','#EF4444','#6366F1','#10B981','#F59E0B','#8B5CF6','#06B6D4','#F43F5E']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}

const loadProduct = async () => {
  const productId = route.params.id
  const result = await getProductById(productId)
  if (result) {
    product.value = result
  } else {
    showError('Product not found')
    router.push('/restaurant/products')
  }
}

const loadStockMovements = async () => {
  if (!product.value) return
  await getStockMovements({
    productId: product.value.id,
    perPage: 20
  })
}

const handleEdit = () => {
  showEditModal.value = true
}

const handleUpdateProduct = async (productData) => {
  try {
    const { imageFile, ...data } = productData
    await updateProduct(product.value.id, data, imageFile)
    showSuccess('Product updated successfully!')
    showEditModal.value = false
    loadProduct()
  } catch (error) {
    showError('Failed to update product')
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this product?')) return

  try {
    await deleteProduct(product.value.id)
    showSuccess('Product deleted successfully!')
    router.push('/restaurant/products')
  } catch (error) {
    showError('Failed to delete product')
  }
}

const handleAdjustStock = () => {
  showStockModal.value = true
}

const handleStockAdjustment = async (adjustmentData) => {
  try {
    await adjustStock(adjustmentData.productId, {
      quantity: adjustmentData.quantity,
      type: adjustmentData.type,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes
    })
    showSuccess('Stock adjusted successfully!')
    showStockModal.value = false
    await loadProduct()
    await loadStockMovements()
  } catch (error) {
    showError('Failed to adjust stock')
  }
}

const getMovementTypeClass = (type) => {
  const classes = {
    add: 'badge-success',
    in: 'badge-success',
    remove: 'badge-error',
    out: 'badge-error',
    set: 'badge-warning',
    adjustment: 'badge-warning',
    transfer: 'badge-info'
  }
  return classes[type] || 'badge-ghost'
}

const getMovementTypeLabel = (type) => {
  const labels = {
    add: 'Stock In',
    in: 'Stock In',
    remove: 'Stock Out',
    out: 'Stock Out',
    set: 'Adjustment',
    adjustment: 'Adjustment',
    transfer: 'Transfer'
  }
  return labels[type] || type
}

onMounted(async () => {
  await Promise.all([
    loadProduct(),
    loadStockMovements(),
    fetchLocations()
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <div v-else-if="product">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/restaurant/products')">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ product.name }}</h1>
          <p class="text-base-content/60 mt-1">{{ product.sku }}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" @click="handleEdit">
            <IconEdit class="w-4 h-4 mr-2" />
            Edit
          </button>
          <button 
            v-if="product.trackStock"
            class="btn btn-secondary btn-sm" 
            @click="handleAdjustStock"
          >
            <IconAdjustments class="w-4 h-4 mr-2" />
            Adjust Stock
          </button>
          <button class="btn btn-error btn-sm btn-outline" @click="handleDelete">
            <IconTrash class="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed mb-6">
        <a 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </a>
      </div>

      <!-- Product Info Tab -->
      <div v-show="activeTab === 'info'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Image & Basic Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex items-center justify-center w-full h-64 overflow-hidden rounded-lg bg-base-200">
                  <img 
                    v-if="product.imageUrl"
                    :src="product.imageUrl" 
                    :alt="product.name"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="flex flex-col items-center justify-center w-full h-full gap-3 text-white" :style="{ backgroundColor: stringToColor(product.name) }">
                    <svg class="w-16 h-16 opacity-90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M3 3h18v14H3z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M7 15l3-4 2 2 3-4 4 6" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="text-2xl font-bold">{{ getInitials(product.name) }}</div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div>
                    <h3 class="text-lg font-semibold mb-2">Description</h3>
                    <p class="text-base-content/70">{{ product.description || 'No description available' }}</p>
                  </div>
                  
                  <div class="flex flex-wrap gap-2">
                    <div :class="['badge', product.isActive ? 'badge-success' : 'badge-ghost']">
                      {{ product.isActive ? 'Available' : 'Unavailable' }}
                    </div>
                    <div v-if="product.category" class="badge badge-primary">
                      {{ product.category }}
                    </div>
                    <div v-for="tag in product.tags" :key="tag" class="badge badge-outline">
                      {{ tag }}
                    </div>
                  </div>

                  <div v-if="product.allergens && product.allergens.length > 0">
                    <h4 class="font-semibold text-sm mb-2">Allergens:</h4>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="allergen in product.allergens" :key="allergen" class="badge badge-error badge-sm">
                        {{ allergen }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Pricing Card -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="flex items-center gap-2 mb-4">
                  <IconCurrencyDollar class="w-5 h-5 text-success" />
                  <h3 class="card-title text-base">Pricing</h3>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Selling Price:</span>
                    <span class="font-semibold text-lg">{{ formatCurrency(product.price) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Cost:</span>
                    <span class="font-semibold">{{ formatCurrency(product.cost || 0) }}</span>
                  </div>
                  <div class="divider my-1"></div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Profit Margin:</span>
                    <span class="font-semibold text-success">{{ profitMargin }}%</span>
                  </div>
                  <!-- Variants summary -->
                  <div v-if="product.productDetails?.hasVariants && product.productDetails?.variants?.length > 1" class="mt-2">
                    <div class="divider my-1"></div>
                    <div class="text-sm font-medium mb-2">Variants ({{ product.productDetails.variants.length }})</div>
                    <div class="space-y-1">
                      <div v-for="variant in product.productDetails.variants" :key="variant.sku" class="flex justify-between text-sm">
                        <span class="text-base-content/60">{{ variant.name }}</span>
                        <span class="font-medium">{{ formatCurrency(variant.price) }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- Extras summary -->
                  <div v-if="product.productDetails?.hasExtras && product.productDetails?.extras?.length > 0" class="mt-2">
                    <div class="divider my-1"></div>
                    <div class="text-sm font-medium mb-2">Extras ({{ product.productDetails.extras.length }})</div>
                    <div class="space-y-1">
                      <div v-for="extra in product.productDetails.extras" :key="extra.name" class="flex justify-between text-sm">
                        <span class="text-base-content/60">{{ extra.name }}</span>
                        <span class="font-medium text-primary">+{{ formatCurrency(extra.price) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Additional Info Card -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="flex items-center gap-2 mb-4">
                  <IconPackage class="w-5 h-5 text-info" />
                  <h3 class="card-title text-base">Additional Info</h3>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Barcode:</span>
                    <span class="font-mono">{{ product.barcode || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Product Type:</span>
                    <span class="badge badge-sm" :class="product.productType === 'beverage' ? 'badge-info' : 'badge-warning'">
                      {{ product.productType === 'beverage' ? 'Beverage' : 'Food' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-base-content/60">Prep Time:</span>
                    <span class="flex items-center gap-1">
                      <IconClock class="w-4 h-4" />
                      {{ product.preparationTime || 0 }} mins
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-base-content/60">Calories:</span>
                    <span class="flex items-center gap-1">
                      <IconFlame class="w-4 h-4" />
                      {{ product.calories || 0 }} kcal
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Location:</span>
                    <span>{{ product.location?.name || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Stock Card -->
          <div v-if="product.trackStock" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base mb-4">Stock Information</h3>
              
              <div class="text-center mb-4">
                <div class="text-4xl font-bold mb-2">{{ product.stockQuantity || 0 }}</div>
                <div class="text-base-content/60">{{ product.unit || 'pcs' }}</div>
                <div :class="['badge badge-lg mt-2', getStockBadgeClass]">
                  {{ getStockStatus }}
                </div>
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Min Level:</span>
                  <span>{{ product.minStockLevel || 0 }} {{ product.unit || 'pcs' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Max Level:</span>
                  <span>{{ product.maxStockLevel || 0 }} {{ product.unit || 'pcs' }}</span>
                </div>
              </div>

              <button class="btn btn-secondary btn-block mt-4" @click="handleAdjustStock">
                <IconAdjustments class="w-4 h-4 mr-2" />
                Adjust Stock
              </button>
            </div>
          </div>

          <!-- Stock Alert -->
          <div v-if="product.trackStock && product.stockQuantity <= (product.minStockLevel || 0)" class="alert alert-warning">
            <IconAlertTriangle class="w-6 h-6" />
            <div>
              <h3 class="font-bold">Low Stock Alert!</h3>
              <div class="text-xs">Stock is below minimum level</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Extras Tab -->
      <div v-show="activeTab === 'extras'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <ProductExtrasManager :product-id="product.id" :product="product" />
        </div>
      </div>

      <!-- Stock Movements Tab -->
      <div v-show="activeTab === 'stock'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title mb-4">Stock Movement History</h3>
          
          <div v-if="stockLoading" class="flex justify-center py-8">
            <div class="loading loading-spinner loading-lg"></div>
          </div>

          <div v-else-if="!stockMovements || stockMovements.length === 0" class="text-center py-8 text-base-content/60">
            No stock movements recorded yet
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="movement in stockMovements" :key="movement.id">
                  <td>{{ formatDate(movement.createdAt) }}</td>
                  <td>
                    <div :class="['badge', getMovementTypeClass(movement.movementType)]">
                      {{ getMovementTypeLabel(movement.movementType) }}
                    </div>
                  </td>
                  <td>
                    <span :class="movement.type === 'in' ? 'text-success' : 'text-error'">
                      {{ movement.type === 'in' ? '+' : '-' }}{{ movement.quantity }} {{ product.unit || 'pcs' }}
                    </span>
                  </td>
                  <td>{{ movement.performer.firstName }} {{ movement.performer.lastName }}</td>
                  <td>{{ movement.notes || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Variants Tab -->
      <div v-show="activeTab === 'variants'" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <ProductVariantsManager :product-id="product.id" />
        </div>
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <StockAdjustmentModal
      v-if="product"
      v-model="showStockModal"
      :product="product"
      :loading="loading"
      @submit="handleStockAdjustment"
    />

    <!-- Edit Modal -->
    <ProductFormModal
      v-if="product"
      v-model="showEditModal"
      :product="product"
      :loading="loading"
      :locations="locations"
      @submit="handleUpdateProduct"
    />
  </div>
</template>
