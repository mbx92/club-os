<route lang="yaml">
meta:
  title: Stock Alerts
  layout: default
</route>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useNotification } from '@/composables/core/useNotification'
import LowStockAlert from '@/components/restaurant/stock/LowStockAlert.vue'
import StockAdjustmentModal from '@/components/restaurant/products/StockAdjustmentModal.vue'
import { IconArrowLeft, IconAlertTriangle } from '@tabler/icons-vue'

const router = useRouter()
const { showSuccess, showError } = useNotification()

const { 
  getLowStockProducts, 
  lowStockProducts, 
  adjustStock,
  loading 
} = useRestaurantProducts()

const showStockModal = ref(false)
const selectedProduct = ref(null)

const loadLowStockProducts = async () => {
  await getLowStockProducts()
}

const handleAdjustStock = (product) => {
  selectedProduct.value = product
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
    selectedProduct.value = null
    loadLowStockProducts()
  } catch (error) {
    showError('Failed to adjust stock')
  }
}

const handleViewProduct = (productId) => {
  router.push(`/restaurant/products/${productId}`)
}

onMounted(() => {
  loadLowStockProducts()
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
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <IconAlertTriangle class="w-8 h-8 text-error" />
          Stock Alerts
        </h1>
        <p class="text-base-content/60 mt-1">Products that need immediate attention</p>
      </div>
      <button class="btn btn-primary" @click="router.push('/restaurant/products')">
        View All Products
      </button>
    </div>

    <!-- Alert Summary -->
    <div class="alert alert-warning mb-6" v-if="lowStockProducts && lowStockProducts.length > 0">
      <IconAlertTriangle class="w-6 h-6" />
      <div>
        <h3 class="font-bold">{{ lowStockProducts.length }} Product{{ lowStockProducts.length > 1 ? 's' : '' }} Need Attention</h3>
        <div class="text-sm">Stock levels are below minimum threshold. Consider restocking soon.</div>
      </div>
    </div>

    <!-- Low Stock Alerts -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title mb-4">Low Stock Products</h3>
        
        <LowStockAlert
          :products="lowStockProducts || []"
          :loading="loading"
          @adjust-stock="handleAdjustStock"
          @view-product="handleViewProduct"
        />
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <StockAdjustmentModal
      v-if="selectedProduct"
      v-model="showStockModal"
      :product="selectedProduct"
      :loading="loading"
      @submit="handleStockAdjustment"
    />
  </div>
</template>
