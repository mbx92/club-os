<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
    // Expected: [{ hour: 0-23, revenue: number, orders: number }]
  },
  height: {
    type: String,
    default: '200px'
  }
})

// Generate all 24 hours with data
const hourlyData = computed(() => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    revenue: 0,
    orders: 0
  }))
  
  // Merge with actual data
  props.data.forEach(item => {
    const hour = parseInt(item.hour)
    if (hour >= 0 && hour < 24) {
      hours[hour] = { 
        hour,
        revenue: item.totalRevenue || item.revenue || 0,
        orders: item.orderCount || item.orders || 0
      }
    }
  })
  
  return hours
})

// Find max values for scaling
const maxRevenue = computed(() => {
  return Math.max(...hourlyData.value.map(h => h.revenue || 0), 1)
})

// Calculate bar height as percentage
const getBarHeight = (value) => {
  return (value / maxRevenue.value) * 100
}

// Format hour
const formatHour = (hour) => {
  if (hour === 0) return '12am'
  if (hour === 12) return '12pm'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
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

// Get intensity color based on value
const getBarColor = (value) => {
  const ratio = value / maxRevenue.value
  if (ratio > 0.8) return 'bg-primary'
  if (ratio > 0.6) return 'bg-primary/80'
  if (ratio > 0.4) return 'bg-primary/60'
  if (ratio > 0.2) return 'bg-primary/40'
  return 'bg-primary/20'
}

// Find peak hour
const peakHour = computed(() => {
  if (!props.data.length) return null
  const peak = hourlyData.value.reduce((max, h) => 
    h.revenue > max.revenue ? h : max
  , hourlyData.value[0])
  return peak.revenue > 0 ? peak.hour : null
})
</script>

<template>
  <div class="w-full">
    <!-- Peak Hour Indicator -->
    <div v-if="peakHour !== null" class="mb-4 flex items-center gap-2">
      <span class="badge badge-primary">Peak Hour</span>
      <span class="font-semibold">{{ formatHour(peakHour) }}</span>
      <span class="text-base-content/60 text-sm">
        ({{ formatCurrency(hourlyData[peakHour]?.revenue) }})
      </span>
    </div>

    <!-- Chart Container -->
    <div class="relative" :style="{ height }">
      <!-- Y-Axis Labels -->
      <div class="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-base-content/60">
        <span>{{ formatCurrency(maxRevenue) }}</span>
        <span>{{ formatCurrency(maxRevenue / 2) }}</span>
        <span>0</span>
      </div>
      
      <!-- Chart Area -->
      <div class="ml-12 h-full flex items-end gap-px pb-6 overflow-x-auto">
        <div 
          v-for="item in hourlyData" 
          :key="item.hour" 
          class="flex-1 min-w-[20px] flex flex-col items-center group relative"
        >
          <!-- Bar -->
          <div class="w-full h-[calc(100%-20px)] flex items-end justify-center">
            <div 
              class="w-full rounded-t transition-all duration-300 hover:opacity-80"
              :class="[
                getBarColor(item.revenue),
                item.hour === peakHour ? 'ring-2 ring-primary ring-offset-1' : ''
              ]"
              :style="{ height: `${getBarHeight(item.revenue)}%`, minHeight: item.revenue > 0 ? '4px' : '0' }"
            >
              <!-- Tooltip -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div class="bg-base-300 text-base-content text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <div class="font-semibold">{{ formatHour(item.hour) }}</div>
                  <div>{{ formatCurrency(item.revenue) }}</div>
                  <div class="text-base-content/60">{{ item.orders || 0 }} orders</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- X-Axis Label (show every 3 hours) -->
          <div 
            class="text-xs text-base-content/60 mt-1"
            :class="{ 'font-semibold text-base-content': item.hour === peakHour }"
          >
            <span v-if="item.hour % 3 === 0">{{ formatHour(item.hour) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Period Indicators -->
    <div class="flex justify-between text-xs text-base-content/60 mt-2 ml-12">
      <span>Morning (6-12)</span>
      <span>Lunch (12-14)</span>
      <span>Afternoon (14-18)</span>
      <span>Dinner (18-22)</span>
    </div>
  </div>
</template>
