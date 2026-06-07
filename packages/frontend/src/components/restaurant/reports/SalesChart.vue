<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  groupBy: {
    type: String,
    default: 'day'
  },
  showOrders: {
    type: Boolean,
    default: true
  },
  height: {
    type: String,
    default: '300px'
  }
})

// Find max values for scaling
const maxRevenue = computed(() => {
  const vals = props.data.map(d => d.totalRevenue || d.revenue || 0)
  const max = vals.length ? Math.max(...vals) : 0
  return max || 1
})

const maxOrders = computed(() => {
  const vals = props.data.map(d => d.orderCount || d.orders || 0)
  const max = vals.length ? Math.max(...vals) : 0
  return max || 1
})

// Calculate bar heights as percentages
const getRevenueHeight = (value) => {
  const max = maxRevenue.value || 1
  const pct = (value || 0) / max * 100
  return Math.min(100, Math.max(0, pct))
}

const getOrdersHeight = (value) => {
  const max = maxOrders.value || 1
  const pct = (value || 0) / max * 100
  return Math.min(100, Math.max(0, pct))
}

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    notation: 'compact'
  }).format(value || 0)
}

// Format label based on groupBy
const formatLabel = (item) => {
  if (!item.period) return '-'
  
  if (props.groupBy === 'hour') {
    return `${item.period}:00`
  }
  
  if (props.groupBy === 'day') {
    const date = new Date(item.period)
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }
  
  if (props.groupBy === 'week') {
    return `W${item.period}`
  }
  
  if (props.groupBy === 'month') {
    const [year, month] = item.period.split('-')
    return new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  
  return item.period
}

// Helper to compute tooltip alignment to avoid clipping at chart edges
const tooltipAlign = (index) => {
  const len = props.data?.length || 0
  if (index === 0) return 'left-0 -translate-x-0'
  if (index === len - 1) return 'right-0 translate-x-0'
  return 'left-1/2 -translate-x-1/2'
}
</script>

<template>
  <div class="w-full">
    <!-- Chart Container -->
    <div class="relative" :style="{ height }">
      <!-- Y-Axis Labels -->
      <div class="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-base-content/60">
        <span>{{ formatCurrency(maxRevenue) }}</span>
        <span>{{ formatCurrency(maxRevenue / 2) }}</span>
        <span>0</span>
      </div>
      
      <!-- Chart Area -->
      <div class="ml-16 h-full flex items-end gap-1 pb-6 overflow-x-auto">
        <div 
          v-for="(item, index) in data" 
          :key="index" 
          class="flex-1 min-w-[40px] max-w-[80px] flex flex-col items-center"
        >
          <!-- Bars Container -->
          <div class="w-full flex items-end justify-center gap-1 h-[calc(100%-24px)]">
            <!-- Revenue Bar -->
            <div class="relative w-1/2 flex flex-col justify-end h-full group">
              <div 
                class="w-full bg-primary rounded-t transition-all duration-300 group-hover:bg-primary-focus"
                :style="{ 
                  height: `${getRevenueHeight(item.totalRevenue || item.revenue)}%`,
                  minHeight: (item.totalRevenue || item.revenue) > 0 ? '8px' : '0'
                }"
              >
                <!-- Tooltip -->
                <div :class="['absolute bottom-full mb-2 hidden group-hover:block z-10', tooltipAlign(index)]">
                  <div class="bg-base-300 text-base-content rounded-lg px-4 py-2.5 shadow-xl min-w-[250px]">
                    <div class="text-xs text-base-content/60 mb-0.5">Revenue</div>
                    <div class="font-bold text-base whitespace-nowrap">{{ formatCurrency(item.totalRevenue || item.revenue) }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Orders Bar -->
            <div v-if="showOrders" class="relative w-1/2 flex flex-col justify-end h-full group">
              <div 
                class="w-full bg-success rounded-t transition-all duration-300 group-hover:bg-success-focus"
                :style="{ 
                  height: `${getOrdersHeight(item.orderCount || item.orders)}%`,
                  minHeight: (item.orderCount || item.orders) > 0 ? '8px' : '0'
                }"
              >
                <!-- Tooltip -->
                <div :class="['absolute bottom-full mb-2 hidden group-hover:block z-10', tooltipAlign(index)]">
                  <div class="bg-base-300 text-base-content rounded-lg px-4 py-2.5 shadow-xl min-w-[120px]">
                    <div class="text-xs text-base-content/60 mb-0.5">Orders</div>
                    <div class="font-bold text-base whitespace-nowrap">{{ item.orderCount || item.orders }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- X-Axis Label -->
          <div class="text-xs text-base-content/60 mt-1 text-center truncate w-full">
            {{ formatLabel(item) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="flex items-center justify-center gap-6 mt-4">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-primary"></div>
        <span class="text-sm">Revenue</span>
      </div>
      <div v-if="showOrders" class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-success"></div>
        <span class="text-sm">Orders</span>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-if="!data.length" class="absolute inset-0 flex items-center justify-center">
      <div class="text-center text-base-content/60">
        <p>No data available</p>
      </div>
    </div>
  </div>
</template>
