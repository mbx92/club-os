<script setup>
import { IconAlertTriangle, IconExternalLink } from '@tabler/icons-vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['adjustStock', 'viewProduct'])

const getStockLevel = (product) => {
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return 'out'
  if (quantity <= minLevel) return 'low'
  if (quantity <= minLevel * 1.5) return 'warning'
  return 'ok'
}

const getStockLevelClass = (level) => {
  const classes = {
    out: 'alert-error',
    low: 'alert-error',
    warning: 'alert-warning',
    ok: 'alert-success'
  }
  return classes[level] || 'alert-info'
}

const getStockLevelLabel = (level) => {
  const labels = {
    out: 'Out of Stock',
    low: 'Critical',
    warning: 'Low Stock',
    ok: 'Good'
  }
  return labels[level] || 'Unknown'
}

const getPriorityBadge = (level) => {
  if (level === 'out') return 'badge-error'
  if (level === 'low') return 'badge-error'
  if (level === 'warning') return 'badge-warning'
  return 'badge-ghost'
}
</script>

<template>
  <div class="space-y-3">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="text-center py-8">
      <div class="text-success mb-4">
        <IconAlertTriangle class="w-16 h-16 mx-auto opacity-50" />
      </div>
      <h3 class="text-lg font-semibold mb-2">All Stock Levels Good!</h3>
      <p class="text-base-content/60">No products require immediate attention</p>
    </div>

    <!-- Alert List -->
    <div v-else class="space-y-3">
      <div 
        v-for="(product, index) in products" 
        :key="product.id"
        :class="['alert', getStockLevelClass(getStockLevel(product))]"
      >
        <div class="flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 flex-1">
              <!-- Priority Badge -->
              <div class="flex-shrink-0 mt-1">
                <div :class="['badge badge-lg', getPriorityBadge(getStockLevel(product))]">
                  {{ index + 1 }}
                </div>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-bold truncate">{{ product.name }}</h4>
                  <div :class="['badge badge-sm', getPriorityBadge(getStockLevel(product))]">
                    {{ getStockLevelLabel(getStockLevel(product)) }}
                  </div>
                </div>
                
                <div class="text-sm opacity-80 mb-2">
                  {{ product.sku || 'No SKU' }} • {{ product.category || 'Uncategorized' }}
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span class="opacity-70">Current:</span>
                    <span class="font-semibold ml-1">{{ product.stockQuantity || 0 }} {{ product.unit || 'pcs' }}</span>
                  </div>
                  <div>
                    <span class="opacity-70">Min Level:</span>
                    <span class="font-semibold ml-1">{{ product.minStockLevel || 0 }} {{ product.unit || 'pcs' }}</span>
                  </div>
                  <div v-if="product.location">
                    <span class="opacity-70">Location:</span>
                    <span class="font-semibold ml-1">{{ product.location.name }}</span>
                  </div>
                  <div v-if="product.stockQuantity <= product.minStockLevel">
                    <span class="opacity-70">Shortage:</span>
                    <span class="font-semibold ml-1 text-error">
                      {{ product.minStockLevel - product.stockQuantity }} {{ product.unit || 'pcs' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 flex-shrink-0">
              <button 
                class="btn btn-sm"
                :class="getStockLevel(product) === 'out' || getStockLevel(product) === 'low' ? 'btn-error' : 'btn-warning'"
                @click="$emit('adjustStock', product)"
              >
                <IconAlertTriangle class="w-4 h-4 mr-1" />
                Restock
              </button>
              <button 
                class="btn btn-sm btn-ghost"
                @click="$emit('viewProduct', product.id)"
              >
                <IconExternalLink class="w-4 h-4 mr-1" />
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
