<template>
  <span class="badge" :class="[sizeClass, statusClass]">
    {{ label || status }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'sale',
    validator: (val) => ['sale', 'purchase', 'movement', 'product'].includes(val)
  },
  size: {
    type: String,
    default: 'sm',
    validator: (val) => ['xs', 'sm', 'md', 'lg'].includes(val)
  },
  label: {
    type: String,
    default: ''
  }
})

const sizeClass = computed(() => `badge-${props.size}`)

const statusClass = computed(() => {
  const statusMaps = {
    sale: {
      pending: 'badge-warning',
      completed: 'badge-success',
      cancelled: 'badge-error'
    },
    purchase: {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      received: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-error'
    },
    movement: {
      purchase: 'badge-success',
      sale: 'badge-info',
      adjustment: 'badge-warning',
      return: 'badge-secondary',
      transfer: 'badge-primary'
    },
    product: {
      active: 'badge-success',
      inactive: 'badge-ghost',
      out_of_stock: 'badge-error',
      low_stock: 'badge-warning'
    }
  }

  const map = statusMaps[props.type] || {}
  return map[props.status] || 'badge-ghost'
})
</script>
