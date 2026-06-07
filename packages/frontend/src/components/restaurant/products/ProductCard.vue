<script setup>
import { computed } from 'vue'
import { IconAdjustments, IconMapPin } from '@tabler/icons-vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['viewDetail', 'adjustStock'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStockBadgeClass = computed(() => {
  if (!props.product.trackStock) return 'badge-ghost'
  
  const quantity = props.product.stockQuantity || 0
  const minLevel = props.product.minStockLevel || 0
  
  if (quantity === 0) return 'badge-error'
  if (quantity <= minLevel) return 'badge-warning'
  return 'badge-success'
})

const getStockStatus = computed(() => {
  if (!props.product.trackStock) return 'Not tracked'
  
  const quantity = props.product.stockQuantity || 0
  const minLevel = props.product.minStockLevel || 0
  
  if (quantity === 0) return 'Out of stock'
  if (quantity <= minLevel) return 'Low stock'
  return 'In stock'
})

const getAvailabilityBadge = computed(() => {
  return props.product.isAvailable ? 'badge-success' : 'badge-ghost'
})
const getProductImage = computed(() => {
  const product = props.product
  if (product.imageUrl) return product.imageUrl
  if (product.image) {
    if (product.image.startsWith('http')) return product.image
    
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl) {
      try {
        const url = new URL(apiUrl)
        const imagePath = product.image.startsWith('/') ? product.image.slice(1) : product.image
        return `${url.origin}/${imagePath}`
      } catch (e) {
        console.error('Error constructing image URL:', e)
      }
    }
    return product.image
  }
  return null
})
</script>

<template>
  <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer h-full flex flex-col" @click="$emit('viewDetail', product.id)">
    <figure class="px-4 pt-4 flex-shrink-0">
      <img 
        :src="getProductImage || 'https://via.placeholder.com/300x200?text=No+Image'" 
        :alt="product.name"
        class="rounded-xl h-40 w-full object-cover"
      />
    </figure>
    
    <div class="card-body p-4 flex-1 flex flex-col">
      <div class="flex items-start justify-between flex-shrink-0">
        <h3 class="card-title text-base flex-1">{{ product.name }}</h3>
        <div class="flex flex-col gap-1 items-end">
          <div :class="['badge badge-sm', getAvailabilityBadge]">
            {{ product.isAvailable ? 'Available' : 'Unavailable' }}
          </div>
          <div v-if="product.isCustomized" class="badge badge-sm badge-info">
            Customizable
          </div>
        </div>
      </div>
      
      <p v-if="product.description" class="text-sm text-base-content/60 line-clamp-2 flex-shrink-0">
        {{ product.description }}
      </p>
      
      <div class="flex items-center justify-between mt-2 flex-shrink-0">
        <div class="text-lg font-bold text-primary">{{ formatCurrency(product.price) }}</div>
        <div v-if="product.category" class="badge badge-ghost badge-sm">{{ product.category }}</div>
      </div>

      <div class="flex items-center justify-between mt-2 text-sm flex-shrink-0">
        <span class="text-base-content/60">Stock:</span>
        <div :class="['badge badge-sm', getStockBadgeClass]">
          {{ getStockStatus }}
          <span v-if="product.trackStock"> ({{ product.stockQuantity }} {{ product.unit || 'pcs' }})</span>
        </div>
      </div>

      <div v-if="product.location" class="text-xs text-base-content/60 mt-2 flex-shrink-0 flex items-center gap-1">
        <IconMapPin class="w-3 h-3" />
        <span>{{ product.location.name }}</span>
      </div>

      <div class="card-actions mt-auto pt-4 gap-2 flex-shrink-0">
        <button 
          class="btn btn-sm btn-primary flex-1" 
          @click.stop="$emit('viewDetail', product.id)"
        >
          View
        </button>
        <button 
          v-if="product.trackStock"
          class="btn btn-sm btn-outline btn-secondary"
          @click.stop="$emit('adjustStock', product)"
          title="Adjust Stock"
        >
          <IconAdjustments class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
