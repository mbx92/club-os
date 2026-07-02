<script setup>
import { computed } from 'vue'
import { IconSearch, IconFilter } from '@tabler/icons-vue'
import { getDefaultProductVariant, getMinProductPrice, getProductBasePrice, getProductVariants, getVariantEffectivePrice } from '@/utils/restaurantPricing'

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedCategory: {
    type: String,
    default: ''
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:searchQuery', 'update:selectedCategory', 'add-to-cart'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStockBadgeClass = (product) => {
  if (!product.trackInventory) return ''
  
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return 'border-error'
  if (quantity <= minLevel) return 'border-warning'
  return ''
}

const isOutOfStock = (product) => {
  return product.trackInventory && product.stockQuantity === 0
}

const hasExtras = (product) => {
  return product.isCustomized === true || product.productDetails?.hasExtras === true
}

const hasMultipleVariants = (product) => {
  return product.productDetails?.hasVariants === true &&
         getProductVariants(product).length > 1
}

const getMinVariantPrice = (product) => {
  const variants = getProductVariants(product)
  if (variants.length <= 1) return null
  return getMinProductPrice(product)
}

const getProductCardPrice = (product) => {
  const defaultVariant = getDefaultProductVariant(product)
  return defaultVariant
    ? getVariantEffectivePrice(product, defaultVariant)
    : getProductBasePrice(product)
}

const getInitials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
}

const stringToColor = (str) => {
  const palette = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#0ea5e9', // sky-500
    '#60a5fa', // blue-400
    '#818cf8', // indigo-400
    '#a78bfa', // violet-400
    '#f472b6', // pink-400
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}
const getProductImage = (product) => {
  if (product.imageUrl) return product.imageUrl
  if (product.image) {
    // If image is already an absolute URL
    if (product.image.startsWith('http')) return product.image
    
    // Construct from API URL
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl) {
      try {
        const url = new URL(apiUrl)
        // Remove leading slash from image path if present
        const imagePath = product.image.startsWith('/') ? product.image.slice(1) : product.image
        return `${url.origin}/${imagePath}`
      } catch (e) {
        console.error('Error constructing image URL:', e)
      }
    }
    return product.image
  }
  return null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search & Filter -->
    <div class="p-4 bg-base-100 border-b space-y-3">
      <!-- Search -->
      <label class="input input-bordered flex items-center gap-2">
        <IconSearch class="w-5 h-5 opacity-70" />
        <input 
          type="text" 
          placeholder="Search products..." 
          class="grow"
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
      </label>

      <!-- Category Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button 
          class="btn btn-sm"
          :class="{ 'btn-primary': selectedCategory === '' }"
          @click="$emit('update:selectedCategory', '')"
        >
          All
        </button>
        <button 
          v-for="category in categories" 
          :key="category.id"
          class="btn btn-sm whitespace-nowrap"
          :class="{ 'btn-primary': selectedCategory === category.id }"
          @click="$emit('update:selectedCategory', category.id)"
        >
          <span v-if="category.icon">{{ category.icon }}</span>
          {{ category.name }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center flex-1 p-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="flex flex-col justify-center items-center flex-1 p-8 text-center">
      <IconFilter class="w-16 h-16 text-base-content/30 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No products found</h3>
      <p class="text-base-content/60">
        {{ searchQuery || selectedCategory ? 'Try adjusting your filters' : 'No products available' }}
      </p>
    </div>

    <!-- Products Grid -->
    <div v-else class="flex-1 overflow-y-auto p-4 min-h-0 max-h-full bg-base-200/50">
      <!-- Forced max 3 columns to keep them large and legible -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          v-for="product in products"
          :key="product.id"
          class="relative w-full aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group text-left outline-none focus-visible:ring-2 ring-primary ring-offset-2 border border-base-content/10"
          :class="[{ 'opacity-50 grayscale': isOutOfStock(product) }]"
          :disabled="isOutOfStock(product)"
          @click="!isOutOfStock(product) && $emit('add-to-cart', product)"
          title="Add to cart"
        >
          <!-- Background Image / Initials Color Block -->
          <div class="absolute inset-0 z-0">
            <template v-if="getProductImage(product)">
              <img
                :src="getProductImage(product)"
                :alt="product.name"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </template>
            <template v-else>
              <div
                class="w-full h-full flex items-center justify-center text-white text-5xl font-black opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 tracking-tighter"
                :style="{ backgroundColor: stringToColor(product.name || '') }"
              >
                {{ getInitials(product.name) }}
              </div>
            </template>
          </div>
          
          <!-- Top Badges Overlay -->
          <div class="absolute top-2 left-2 right-2 flex justify-between items-start z-10 pointer-events-none">
            <!-- Left Badges (Stock) -->
            <div class="flex flex-col gap-1">
              <div v-if="isOutOfStock(product)" class="badge badge-error badge-sm font-semibold shadow-md border-0">
                Habis
              </div>
              <div v-else-if="product.trackInventory && product.stockQuantity <= (product.minStockLevel || 0)" class="badge badge-warning badge-sm font-semibold shadow-md border-0 text-warning-content">
                Sisa {{ product.stockQuantity }}
              </div>
            </div>
            
            <!-- Right Badges (Extras/Variants) -->
            <div class="flex flex-col items-end gap-1">
              <span v-if="hasExtras(product)" class="badge badge-info badge-sm font-semibold shadow-md border-0 bg-info text-info-content">Custom</span>
              <span v-if="hasMultipleVariants(product)" class="badge badge-accent badge-sm font-semibold shadow-md border-0 bg-accent text-accent-content">Size</span>
            </div>
          </div>
          
          <!-- Bottom Gradient Text Overlay -->
          <div class="absolute bottom-0 left-0 right-0 p-3 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 flex flex-col justify-end">
            <h3 class="font-bold text-sm leading-tight text-white line-clamp-2 drop-shadow-md mb-1">{{ product.name }}</h3>
            
            <div class="text-white/90 font-bold text-sm flex items-end justify-between">
              <template v-if="hasMultipleVariants(product)">
                <div>
                  <span class="text-[9px] text-white/70 font-medium uppercase tracking-wider block leading-none mb-0.5">Mulai dari</span>
                  <span class="text-primary-content drop-shadow">{{ formatCurrency(getMinVariantPrice(product)) }}</span>
                </div>
              </template>
              <template v-else>
                <span class="text-primary-content tracking-wide drop-shadow">{{ formatCurrency(getProductCardPrice(product)) }}</span>
              </template>
              
              <!-- Subtle stock indicator if tracking -->
              <span v-if="product.trackInventory && !isOutOfStock(product) && product.stockQuantity > (product.minStockLevel || 0)" class="text-[10px] text-white/50 font-medium mb-0.5">
                Stok {{ product.stockQuantity }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
