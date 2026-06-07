<script setup>
import { computed } from 'vue'
import { IconPackage, IconTrendingUp, IconTrendingDown, IconAlertTriangle } from '@tabler/icons-vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: Object,
    default: () => IconPackage
  },
  iconColor: {
    type: String,
    default: 'text-primary'
  },
  trend: {
    type: String,
    default: null,
    validator: (value) => !value || ['up', 'down', 'neutral'].includes(value)
  },
  trendValue: {
    type: String,
    default: ''
  },
  alert: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const trendIcon = computed(() => {
  if (props.trend === 'up') return IconTrendingUp
  if (props.trend === 'down') return IconTrendingDown
  return null
})

const trendColor = computed(() => {
  if (props.trend === 'up') return 'text-success'
  if (props.trend === 'down') return 'text-error'
  return 'text-base-content/60'
})
</script>

<template>
  <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
    <div class="card-body">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-base-content/60 text-sm mb-2">{{ title }}</h3>
          
          <div v-if="loading" class="flex items-center gap-2">
            <div class="loading loading-spinner loading-md"></div>
            <span class="text-base-content/40">Loading...</span>
          </div>
          
          <div v-else>
            <div class="text-3xl font-bold mb-1" :class="{ 'text-error': alert }">
              {{ value }}
            </div>
            
            <div class="flex items-center gap-2 text-sm">
              <span class="text-base-content/60">{{ description }}</span>
              
              <div v-if="trend && trendIcon" class="flex items-center gap-1" :class="trendColor">
                <component :is="trendIcon" class="w-4 h-4" />
                <span class="font-semibold">{{ trendValue }}</span>
              </div>
            </div>

            <div v-if="alert" class="flex items-center gap-1 text-error text-xs mt-2">
              <IconAlertTriangle class="w-4 h-4" />
              <span>Requires attention</span>
            </div>
          </div>
        </div>
        
        <div class="flex-shrink-0">
          <component :is="icon" class="w-10 h-10" :class="alert ? 'text-error' : iconColor" />
        </div>
      </div>
    </div>
  </div>
</template>
