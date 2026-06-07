<template>
  <div class="stat bg-base-100 shadow rounded-lg" :class="containerClass">
    <div class="stat-figure" :class="iconClass">
      <slot name="icon">
        <component :is="icon" class="w-8 h-8" />
      </slot>
    </div>
    <div class="stat-title text-xs">{{ title }}</div>
    <div class="stat-value" :class="[valueClass, valueSizeClass]">{{ displayValue }}</div>
    <div v-if="description" class="stat-desc">
      <slot name="description">{{ description }}</slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: [Object, String],
    default: null
  },
  color: {
    type: String,
    default: 'primary',
    validator: (val) => ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'].includes(val)
  },
  format: {
    type: String,
    default: 'number',
    validator: (val) => ['number', 'currency', 'percent', 'raw'].includes(val)
  },
  size: {
    type: String,
    default: 'normal',
    validator: (val) => ['small', 'normal', 'large'].includes(val)
  },
  containerClass: {
    type: String,
    default: ''
  }
})

const iconClass = computed(() => `text-${props.color}`)
const valueClass = computed(() => `text-${props.color}`)

const valueSizeClass = computed(() => {
  const sizes = {
    small: 'text-lg',
    normal: 'text-2xl',
    large: 'text-3xl'
  }
  return sizes[props.size]
})

const displayValue = computed(() => {
  if (props.format === 'raw') return props.value
  
  const num = Number(props.value) || 0
  
  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(num)
    case 'percent':
      return `${num.toFixed(1)}%`
    case 'number':
    default:
      return new Intl.NumberFormat('id-ID').format(num)
  }
})
</script>
