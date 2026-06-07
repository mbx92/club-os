<template>
  <div class="flex flex-col items-center">
    <!-- SVG Radar Chart -->
    <svg 
      :width="size" 
      :height="size" 
      :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`"
      class="overflow-visible"
    >
      <!-- Background circles (grid) -->
      <g>
        <circle
          v-for="i in gridLevels"
          :key="`grid-${i}`"
          :cx="center"
          :cy="center"
          :r="(radius / gridLevels) * i"
          fill="none"
          class="stroke-base-300"
          stroke-width="1"
        />
      </g>
      
      <!-- Axis lines -->
      <g>
        <line
          v-for="(scale, idx) in orderedScales"
          :key="`axis-${scale.code}`"
          :x1="center"
          :y1="center"
          :x2="getPointX(idx, radius)"
          :y2="getPointY(idx, radius)"
          class="stroke-base-300"
          stroke-width="1"
        />
      </g>
      
      <!-- Data polygon (filled area) -->
      <polygon
        :points="dataPoints"
        class="fill-primary/20 stroke-primary"
        stroke-width="2.5"
      />
      
      <!-- Data points -->
      <g>
        <circle
          v-for="(scale, idx) in orderedScales"
          :key="`point-${scale.code}`"
          :cx="getDataPointX(idx, scale.score)"
          :cy="getDataPointY(idx, scale.score)"
          r="5"
          class="fill-primary stroke-base-100"
          stroke-width="2"
        />
      </g>
      
      <!-- Labels -->
      <g class="text-xs font-medium">
        <text
          v-for="(scale, idx) in orderedScales"
          :key="`label-${scale.code}`"
          :x="getLabelX(idx)"
          :y="getLabelY(idx)"
          :text-anchor="getLabelAnchor(idx)"
          :dominant-baseline="getLabelBaseline(idx)"
          class="fill-base-content"
        >
          <tspan class="font-bold">{{ scale.code }}</tspan>
          <tspan class="opacity-70 text-[10px]"> ({{ scale.score }})</tspan>
        </text>
      </g>
    </svg>
    
    <!-- Legend (optional) -->
    <div v-if="showLegend" class="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-2 text-xs">
      <div 
        v-for="scale in orderedScales" 
        :key="`legend-${scale.code}`"
        class="flex items-center gap-1"
      >
        <span class="badge badge-xs badge-primary">{{ scale.code }}</span>
        <span class="truncate opacity-70">{{ scale.score }}/{{ maxScore }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PAPI_SCALES, MAX_SCORE_PER_SCALE } from '@/data/papikostick'

const props = defineProps({
  scales: {
    type: Array,
    default: () => []
    // Expected format: [{ code: 'G', score: 7, max: 9, ... }]
  },
  size: {
    type: Number,
    default: 400
  },
  showLegend: {
    type: Boolean,
    default: false
  },
  maxScore: {
    type: Number,
    default: MAX_SCORE_PER_SCALE
  }
})

// Constants
const viewBoxSize = 300
const center = viewBoxSize / 2
const radius = viewBoxSize / 2 - 40 // Leave space for labels
const gridLevels = 5
const labelOffset = 20

// Create a map of scores
const scaleScoreMap = computed(() => {
  const map = new Map()
  for (const s of props.scales) {
    map.set(s.code, s.score || 0)
  }
  return map
})

// Order scales based on PAPI standard order
const orderedScales = computed(() => {
  return PAPI_SCALES.map(code => ({
    code,
    score: scaleScoreMap.value.get(code) || 0
  }))
})

// Number of scales
const numScales = computed(() => orderedScales.value.length)

// Calculate angle for each scale
const getAngle = (index) => {
  return (Math.PI * 2 * index) / numScales.value - Math.PI / 2
}

// Get X coordinate for a point on the radar
const getPointX = (index, r) => {
  return center + r * Math.cos(getAngle(index))
}

// Get Y coordinate for a point on the radar
const getPointY = (index, r) => {
  return center + r * Math.sin(getAngle(index))
}

// Get X coordinate for data point (based on score)
const getDataPointX = (index, score) => {
  const r = (score / props.maxScore) * radius
  return getPointX(index, r)
}

// Get Y coordinate for data point (based on score)
const getDataPointY = (index, score) => {
  const r = (score / props.maxScore) * radius
  return getPointY(index, r)
}

// Get label X position
const getLabelX = (index) => {
  return getPointX(index, radius + labelOffset)
}

// Get label Y position
const getLabelY = (index) => {
  return getPointY(index, radius + labelOffset)
}

// Get text anchor based on position
const getLabelAnchor = (index) => {
  const x = getPointX(index, radius)
  if (Math.abs(x - center) < 5) return 'middle'
  return x < center ? 'end' : 'start'
}

// Get dominant baseline based on position
const getLabelBaseline = (index) => {
  const y = getPointY(index, radius)
  if (Math.abs(y - center) < 5) return 'middle'
  return y < center ? 'auto' : 'hanging'
}

// Generate polygon points string
const dataPoints = computed(() => {
  return orderedScales.value
    .map((scale, idx) => {
      const x = getDataPointX(idx, scale.score)
      const y = getDataPointY(idx, scale.score)
      return `${x},${y}`
    })
    .join(' ')
})
</script>
