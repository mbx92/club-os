<script setup>
import { computed } from 'vue'
import ExportButton from '@/components/restaurant/shared/ExportButton.vue'

const props = defineProps({
  reportData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['export'])

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const products = computed(() => {
  return props.reportData.products || []
})

const summary = computed(() => {
  return props.reportData.summary || {
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  }
})

const exportColumns = [
  { key: 'name', label: 'Product Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category' },
  { key: 'stockQuantity', label: 'Current Stock' },
  { key: 'unit', label: 'Unit' },
  { key: 'minStockLevel', label: 'Min Level' },
  { key: 'maxStockLevel', label: 'Max Level' },
  { key: 'value', label: 'Stock Value' },
  { key: 'location', label: 'Location' }
]

const prepareExportData = () => {
  return products.value.map(product => ({
    name: product.name,
    sku: product.sku || '-',
    category: product.category || '-',
    stockQuantity: product.stockQuantity || 0,
    unit: product.unit || 'pcs',
    minStockLevel: product.minStockLevel || 0,
    maxStockLevel: product.maxStockLevel || 0,
    value: product.stockQuantity * (product.cost || product.price || 0),
    location: product.location?.name || '-'
  }))
}

const getStockStatusClass = (product) => {
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return 'text-error font-bold'
  if (quantity <= minLevel) return 'text-warning font-bold'
  return ''
}

const getStockStatusBadge = (product) => {
  const quantity = product.stockQuantity || 0
  const minLevel = product.minStockLevel || 0
  
  if (quantity === 0) return { class: 'badge-error', label: 'Out of Stock' }
  if (quantity <= minLevel) return { class: 'badge-warning', label: 'Low Stock' }
  return { class: 'badge-success', label: 'In Stock' }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat bg-base-100 shadow">
        <div class="stat-title">Total Products</div>
        <div class="stat-value text-primary">{{ summary.totalProducts }}</div>
      </div>
      
      <div class="stat bg-base-100 shadow">
        <div class="stat-title">Total Stock Value</div>
        <div class="stat-value text-success text-2xl">{{ formatCurrency(summary.totalValue) }}</div>
      </div>
      
      <div class="stat bg-base-100 shadow">
        <div class="stat-title">Low Stock Items</div>
        <div class="stat-value text-warning">{{ summary.lowStockCount }}</div>
      </div>
      
      <div class="stat bg-base-100 shadow">
        <div class="stat-title">Out of Stock</div>
        <div class="stat-value text-error">{{ summary.outOfStockCount }}</div>
      </div>
    </div>

    <!-- Table Header with Export -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Stock Report Details</h3>
      <ExportButton 
        :data="prepareExportData()"
        :columns="exportColumns"
        filename="stock-report"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="text-center py-12 text-base-content/60">
      <p>No products found in stock report</p>
    </div>

    <!-- Stock Report Table -->
    <div v-else class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th class="text-right">Current Stock</th>
            <th class="text-right">Min Level</th>
            <th class="text-right">Max Level</th>
            <th class="text-right">Stock Value</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="flex items-center gap-3">
                <div class="avatar">
                  <div class="w-10 h-10 rounded">
                    <img 
                      :src="product.imageUrl || 'https://via.placeholder.com/100'" 
                      :alt="product.name"
                    />
                  </div>
                </div>
                <div>
                  <div class="font-semibold">{{ product.name }}</div>
                  <div class="text-xs text-base-content/60">{{ product.sku }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="badge badge-ghost">{{ product.category || '-' }}</div>
            </td>
            <td class="text-right" :class="getStockStatusClass(product)">
              {{ product.stockQuantity || 0 }} {{ product.unit || 'pcs' }}
            </td>
            <td class="text-right text-base-content/60">
              {{ product.minStockLevel || 0 }} {{ product.unit || 'pcs' }}
            </td>
            <td class="text-right text-base-content/60">
              {{ product.maxStockLevel || 0 }} {{ product.unit || 'pcs' }}
            </td>
            <td class="text-right font-semibold">
              {{ formatCurrency((product.stockQuantity || 0) * (product.cost || product.price || 0)) }}
            </td>
            <td>{{ product.location?.name || '-' }}</td>
            <td>
              <div :class="['badge badge-sm', getStockStatusBadge(product).class]">
                {{ getStockStatusBadge(product).label }}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-bold">
            <td colspan="5" class="text-right">Total Stock Value:</td>
            <td class="text-right text-success">{{ formatCurrency(summary.totalValue) }}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
