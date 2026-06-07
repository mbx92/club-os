<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  height: {
    type: String,
    default: '200px'
  }
})

// Colors for pie slices
const colors = [
  'rgb(59, 130, 246)', // blue
  'rgb(34, 197, 94)',  // green
  'rgb(234, 179, 8)',  // yellow
  'rgb(249, 115, 22)', // orange
  'rgb(168, 85, 247)', // purple
  'rgb(236, 72, 153)', // pink
  'rgb(20, 184, 166)', // teal
  'rgb(107, 114, 128)' // gray
]

// Calculate total for percentages
const total = computed(() => {
  return props.data.reduce((sum, item) => sum + (item.value || 0), 0)
})

// Calculate pie slices
const slices = computed(() => {
  if (!props.data.length || !total.value) return []
  
  let currentAngle = 0
  return props.data.map((item, index) => {
    const percentage = (item.value / total.value) * 100
    const angle = (item.value / total.value) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    
    // Calculate path for SVG arc
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)
    
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)
    
    const largeArc = angle > 180 ? 1 : 0
    
    const path = angle >= 360 
      ? `M 50 10 A 40 40 0 1 1 49.99 10 Z` 
      : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    return {
      ...item,
      path,
      color: colors[index % colors.length],
      percentage: percentage.toFixed(1),
      startAngle,
      endAngle
    }
  })
})

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    notation: 'compact'
  }).format(value || 0)
}
</script>

<template>
  <div class="flex flex-col md:flex-row items-center gap-6">
    <!-- Pie Chart -->
    <div class="relative" :style="{ width: height, height }">
      <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
        <circle 
          v-if="!slices.length"
          cx="50" 
          cy="50" 
          r="40" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="20"
          class="text-base-200"
        />
        <path
          v-for="(slice, index) in slices"
          :key="index"
          :d="slice.path"
          :fill="slice.color"
          class="transition-all duration-300 hover:opacity-80 cursor-pointer"
        >
          <title>{{ slice.label }}: {{ slice.percentage }}%</title>
        </path>
      </svg>
      
      <!-- Center Label -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="text-2xl font-bold">{{ formatCurrency(total) }}</div>
          <div class="text-xs text-base-content/60">Total</div>
        </div>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="flex-1 space-y-2">
      <div 
        v-for="(slice, index) in slices" 
        :key="index"
        class="flex items-center justify-between p-2 rounded hover:bg-base-200 transition-colors"
      >
        <div class="flex items-center gap-2">
          <div 
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: slice.color }"
          ></div>
          <span class="text-sm">{{ slice.label }}</span>
        </div>
        <div class="text-right">
          <div class="font-semibold text-sm">{{ formatCurrency(slice.value) }}</div>
          <div class="text-xs text-base-content/60">{{ slice.percentage }}%</div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="!slices.length" class="text-center py-4 text-base-content/60">
        No data available
      </div>
    </div>
  </div>
</template>
