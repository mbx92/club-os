<script setup>
import { computed } from 'vue'
import { 
  IconSearch, 
  IconPlus, 
  IconFilter,
  IconGridDots,
  IconList,
  IconAdjustments,
  IconEdit,
  IconEye,
  IconTrash
} from '@tabler/icons-vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedCategory: {
    type: String,
    default: ''
  },
  selectedLocation: {
    type: String,
    default: ''
  },
  categories: {
    type: Array,
    default: () => []
  },
  locations: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:searchQuery',
  'update:selectedCategory',
  'update:selectedLocation',
  'update:viewMode',
  'create',
  'edit',
  'delete',
  'viewDetail',
  'adjustStock'
])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

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

const getStockBadgeClass = (product) => {
  if (!product.trackInventory) return 'badge-ghost'
  
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return 'badge-error'
  if (quantity <= minLevel) return 'badge-warning'
  return 'badge-success'
}

const getStockStatus = (product) => {
  if (!product.trackInventory) return 'Not tracked'
  
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return 'Out of stock'
  if (quantity <= minLevel) return 'Low stock'
  return 'In stock'
}

const getAvailabilityBadge = (isAvailable) => {
  return isAvailable ? 'badge-success' : 'badge-ghost'
}

const getProductImage = (product) => {
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
        return product.image
      }
    }
    return product.image
  }
  return null
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <!-- Search -->
      <div class="flex-1 w-full sm:max-w-md">
        <label class="flex items-center gap-2 input input-bordered">
          <IconSearch class="w-5 h-5 opacity-70" />
          <input 
            type="text" 
            placeholder="Search products by name or SKU..." 
            class="grow"
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
          />
        </label>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <!-- View Mode Toggle (single button) -->
        <div>
          <button
            class="btn btn-sm"
            :title="viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'"
            @click="$emit('update:viewMode', viewMode === 'grid' ? 'list' : 'grid')"
          >
            <IconList v-if="viewMode === 'grid'" class="w-4 h-4" />
            <IconGridDots v-else class="w-4 h-4" />
          </button>
        </div>

        <!-- Create Button -->
        <button class="btn btn-primary btn-sm" @click="$emit('create')">
          <IconPlus class="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <select 
        class="w-full select select-bordered select-sm sm:w-auto"
        :value="selectedCategory"
        @change="$emit('update:selectedCategory', $event.target.value)"
      >
        <option value="">All Categories</option>
        <option 
          v-for="category in categories" 
          :key="category.id || category" 
          :value="category.id || category"
        >
          {{ category.name || category.displayName || category }}
        </option>
      </select>

      <select 
        class="w-full select select-bordered select-sm sm:w-auto"
        :value="selectedLocation"
        @change="$emit('update:selectedLocation', $event.target.value)"
      >
        <option value="">All Locations</option>
        <option v-for="location in locations" :key="location.id" :value="location.id">
          {{ location.name }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="py-12 text-center">
      <IconFilter class="w-16 h-16 mx-auto mb-4 text-base-content/30" />
      <h3 class="mb-2 text-lg font-semibold">No products found</h3>
      <p class="mb-4 text-base-content/60">
        {{ searchQuery || selectedCategory || selectedLocation ? 'Try adjusting your filters' : 'Get started by adding your first product' }}
      </p>
      <button v-if="!searchQuery && !selectedCategory && !selectedLocation" class="btn btn-primary" @click="$emit('create')">
        <IconPlus class="w-5 h-5 mr-2" />
        Add Your First Product
      </button>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <slot name="grid" :products="products">
        <div v-for="product in products" :key="product.id" class="transition-shadow shadow-xl card bg-base-100 hover:shadow-2xl h-full flex flex-col">
          <figure class="px-4 pt-4 flex-shrink-0">
            <div class="flex items-center justify-center w-full h-40 overflow-hidden rounded-xl bg-base-200">
              <img
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.name || 'Product image'"
                class="object-cover w-full h-full"
                loading="lazy"
              />
              <div v-else class="flex flex-col items-center justify-center w-full h-full gap-2 text-white" :style="{ backgroundColor: stringToColor(product.name) }">
                <svg class="w-10 h-10 opacity-90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 3h18v14H3z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 15l3-4 2 2 3-4 4 6" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="text-sm font-semibold text-center w-full">{{ getInitials(product.name) }}</div>
              </div>
            </div>
          </figure>
          <div class="p-4 card-body flex-1 flex flex-col">
            <h3 class="text-base card-title flex-shrink-0">{{ product.name }}</h3>
            
            <div class="flex items-center justify-between mt-2 flex-shrink-0">
              <div class="text-lg font-bold text-primary">{{ formatCurrency(product.price) }}</div>
              <div :class="['badge badge-sm', getAvailabilityBadge(product.isActive)]">
                {{ product.isActive ? 'Available' : 'Unavailable' }}
              </div>
            </div>

            <div class="flex items-center justify-between mt-2 text-sm flex-shrink-0">
              <span class="text-base-content/60">Stock:</span>
              <div :class="['badge badge-sm', getStockBadgeClass(product)]">
                {{ getStockStatus(product) }}
                <span v-if="product.trackInventory"> ({{ product.stockQuantity }})</span>
              </div>
            </div>

            <div v-if="product.productType" class="flex items-center justify-between mt-2 text-sm flex-shrink-0">
              <span class="text-base-content/60">Type:</span>
              <div :class="['badge badge-sm', product.productType === 'beverage' ? 'badge-info' : 'badge-warning']">{{ product.productType === 'beverage' ? 'Beverage' : 'Food' }}</div>
            </div>

            <div class="gap-2 mt-auto pt-4 card-actions flex-shrink-0">
              <button class="flex-1 btn btn-sm btn-primary" @click="$emit('viewDetail', product.id)">
                View
              </button>
              <button class="btn btn-sm btn-ghost" @click="$emit('edit', product)" title="Edit">
                <IconEdit class="w-4 h-4" />
              </button>
              <button 
                v-if="product.trackInventory"
                class="btn btn-sm btn-outline btn-secondary"
                @click="$emit('adjustStock', product)"
                title="Adjust Stock"
              >
                <IconAdjustments class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </slot>
    </div>

    <!-- List View -->
    <div v-else class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Type</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Location</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="hover">
            <td>
              <div class="flex items-center gap-3">
                <div class="avatar">
                  <div class="flex items-center justify-center w-12 h-12 overflow-hidden rounded" :style="getProductImage(product) ? '' : { backgroundColor: stringToColor(product.name) }">
                    <img v-if="getProductImage(product)" :src="getProductImage(product)" :alt="product.name || 'Product image'" class="object-cover w-full h-full" loading="lazy" />
                    <div v-else class="font-semibold text-white w-full text-center">{{ getInitials(product.name) }}</div>
                  </div>
                </div>
                <div>
                  <div class="font-semibold">{{ product.name }}</div>
                  <div class="text-xs text-base-content/60">{{ product.sku }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="badge badge-ghost">{{ product.productCategory.name || 'Uncategorized' }}</div>
            </td>
            <td>
              <div v-if="product.productType" :class="['badge badge-sm', product.productType === 'beverage' ? 'badge-info' : 'badge-warning']">{{ product.productType === 'beverage' ? 'Beverage' : 'Food' }}</div>
              <span v-else class="text-base-content/40">-</span>
            </td>
            <td class="font-semibold">{{ formatCurrency(product.price) }}</td>
            <td>
              <div :class="['badge badge-sm', getStockBadgeClass(product)]">
                {{ getStockStatus(product) }}
                <span v-if="product.trackInventory"> ({{ product.stockQuantity }})</span>
              </div>
            </td>
            <td>{{ product.location?.name || 'N/A' }}</td>
            <td>
              <div :class="['badge badge-sm', getAvailabilityBadge(product.isActive)]">
                {{ product.isActive ? 'Available' : 'Unavailable' }}
              </div>
            </td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-xs btn-ghost" :title="'View'" @click="$emit('viewDetail', product.id)">
                  <IconEye class="w-4 h-4" />
                </button>
                <button class="btn btn-xs btn-ghost" @click="$emit('edit', product)" title="Edit">
                  <IconEdit class="w-4 h-4" />
                </button>
                <button 
                  v-if="product.trackInventory"
                  class="btn btn-xs btn-ghost"
                  @click="$emit('adjustStock', product)"
                  title="Adjust Stock"
                >
                  <IconAdjustments class="w-4 h-4" />
                </button>
                <button class="btn btn-xs btn-ghost text-error" @click="$emit('delete', product.id)" :title="'Delete'">
                  <IconTrash class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
