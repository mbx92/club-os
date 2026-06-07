<script setup>
import { computed } from 'vue'

const props = defineProps({
  tables: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  height: {
    type: String,
    default: '300px'
  }
})

// Find max revenue for scaling
const maxRevenue = computed(() => {
  if (!props.tables.length) return 0
  return Math.max(...props.tables.map(t => t.totalRevenue || 0))
})

// Calculate bar width as percentage
const getBarWidth = (value) => {
  if (!maxRevenue.value) return 0
  return (value / maxRevenue.value) * 100
}

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0)
}

// Get color based on performance
const getBarColor = (table) => {
  if (!maxRevenue.value) return 'bg-base-300'
  const ratio = table.totalRevenue / maxRevenue.value
  if (ratio > 0.8) return 'bg-success'
  if (ratio > 0.5) return 'bg-primary'
  if (ratio > 0.3) return 'bg-warning'
  return 'bg-base-300'
}

// Sort tables by revenue
const sortedTables = computed(() => {
  return [...props.tables].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
})

// Calculate totals
const totals = computed(() => ({
  revenue: props.tables.reduce((sum, t) => sum + (t.totalRevenue || 0), 0),
  orders: props.tables.reduce((sum, t) => sum + (t.orderCount || 0), 0),
  avgDuration: props.tables.reduce((sum, t) => sum + (t.avgDurationMinutes || 0), 0) / (props.tables.length || 1)
}))
</script>

<template>
  <div class="w-full">
    <!-- Summary Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="text-center p-3 bg-base-200 rounded-lg">
        <div class="text-sm text-base-content/60">Total Revenue</div>
        <div class="text-lg font-bold">{{ formatCurrency(totals.revenue) }}</div>
      </div>
      <div class="text-center p-3 bg-base-200 rounded-lg">
        <div class="text-sm text-base-content/60">Total Orders</div>
        <div class="text-lg font-bold">{{ totals.orders }}</div>
      </div>
      <div class="text-center p-3 bg-base-200 rounded-lg">
        <div class="text-sm text-base-content/60">Avg Duration</div>
        <div class="text-lg font-bold">{{ Math.round(totals.avgDuration) }}m</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!tables.length" class="text-center py-12 text-base-content/60">
      No table data available
    </div>

    <!-- Horizontal Bar Chart -->
    <div v-else class="space-y-3">
      <div 
        v-for="table in sortedTables" 
        :key="table.id"
        class="group"
      >
        <div class="flex items-center gap-4">
          <!-- Table Name -->
          <div class="w-24 text-sm font-medium truncate">
            {{ table.tableName || table.tableNumber }}
          </div>
          
          <!-- Bar -->
          <div class="flex-1 h-8 bg-base-200 rounded-lg overflow-hidden relative">
            <div 
              class="h-full rounded-lg transition-all duration-500"
              :class="getBarColor(table)"
              :style="{ width: `${getBarWidth(table.totalRevenue)}%` }"
            >
            </div>
            
            <!-- Value Label Inside Bar -->
            <div class="absolute inset-0 flex items-center px-3">
              <span 
                class="text-sm font-medium"
                :class="getBarWidth(table.totalRevenue) > 50 ? 'text-base-100' : 'text-base-content'"
              >
                {{ formatCurrency(table.totalRevenue) }}
              </span>
            </div>
          </div>
          
          <!-- Stats -->
          <div class="w-32 text-right">
            <div class="text-sm font-medium">{{ table.orderCount || 0 }} orders</div>
            <div class="text-xs text-base-content/60">{{ table.avgDurationMinutes || 0 }}m avg</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-base-200">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-success"></div>
        <span class="text-xs">Top Performer</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-primary"></div>
        <span class="text-xs">Good</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-warning"></div>
        <span class="text-xs">Average</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-base-300"></div>
        <span class="text-xs">Low</span>
      </div>
    </div>
  </div>
</template>
