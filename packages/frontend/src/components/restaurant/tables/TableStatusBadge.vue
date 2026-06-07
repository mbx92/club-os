<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['available', 'occupied', 'reserved', 'cleaning'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

const badgeClass = computed(() => {
  const statusClasses = {
    available: 'badge-success',
    occupied: 'badge-error',
    reserved: 'badge-warning',
    cleaning: 'badge-info'
  }
  
  const sizeClasses = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg'
  }

  return `badge ${statusClasses[props.status]} ${sizeClasses[props.size]}`
})

const label = computed(() => {
  const labels = {
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    cleaning: 'Cleaning'
  }
  return labels[props.status] || props.status
})
</script>

<template>
  <div :class="badgeClass">
    {{ label }}
  </div>
</template>
