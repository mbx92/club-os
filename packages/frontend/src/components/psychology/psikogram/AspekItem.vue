<template>
  <div class="border border-base-300 rounded-lg p-4">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="font-semibold">{{ title }}</h4>
        <p class="text-sm text-base-content/60 mt-1">{{ description }}</p>
      </div>
      <div class="flex gap-1">
        <button
          v-for="r in ratings"
          :key="r.value"
          type="button"
          class="w-8 h-8 rounded flex items-center justify-center text-sm font-medium border transition-all"
          :class="getRatingClass(r.value)"
          @click="selectRating(r.value)"
        >
          {{ r.label }}
        </button>
      </div>
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
  description: {
    type: String,
    default: ''
  },
  rating: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:rating'])

// R = Rendah, K = Kurang, C = Cukup, B = Baik, T = Tinggi
const ratings = [
  { value: 'R', label: 'R', color: 'error' },
  { value: 'K', label: 'K', color: 'warning' },
  { value: 'C', label: 'C', color: 'secondary' },
  { value: 'B', label: 'B', color: 'primary' },
  { value: 'T', label: 'T', color: 'success' }
]

const getRatingClass = (value) => {
  const isSelected = props.rating === value
  const rating = ratings.find(r => r.value === value)
  
  if (isSelected) {
    switch (rating.color) {
      case 'error': return 'bg-error text-error-content border-error'
      case 'warning': return 'bg-warning text-warning-content border-warning'
      case 'secondary': return 'bg-secondary text-secondary-content border-secondary'
      case 'success': return 'bg-success text-success-content border-success'
      case 'primary': return 'bg-primary text-primary-content border-primary'
    }
  }
  
  return 'bg-base-100 border-base-300 hover:bg-base-200'
}

const selectRating = (value) => {
  emit('update:rating', value)
}
</script>
