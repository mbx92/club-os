<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-4">
        <component :is="iconComponent" class="w-5 h-5" />
        {{ title }}
      </h2>

      <div class="space-y-3">
        <div 
          v-for="(item, index) in items" 
          :key="index"
          class="border border-base-300 rounded-lg p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-semibold">{{ item.title }}</h4>
              <p class="text-sm text-base-content/60 mt-1">{{ item.description }}</p>
            </div>
            <div class="flex gap-1">
              <span
                v-for="r in ratings"
                :key="r.value"
                class="w-7 h-7 rounded flex items-center justify-center text-xs font-medium border"
                :class="getRatingClass(r.value, item.rating)"
              >
                {{ r.label }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Kesimpulan -->
      <div v-if="conclusion" class="mt-4 p-4 bg-base-200 rounded-lg">
        <span class="font-semibold text-sm">Kesimpulan:</span>
        <p class="text-sm mt-1">{{ conclusion }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  IconBrain,
  IconBriefcase,
  IconHeart,
  IconSchool
} from '@tabler/icons-vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'brain'
  },
  items: {
    type: Array,
    default: () => []
  },
  conclusion: {
    type: String,
    default: ''
  }
})

const iconComponent = computed(() => {
  const icons = {
    brain: IconBrain,
    briefcase: IconBriefcase,
    heart: IconHeart,
    school: IconSchool
  }
  return icons[props.icon] || IconBrain
})

const ratings = [
  { value: 'R', label: 'R' },
  { value: 'K', label: 'K' },
  { value: 'C', label: 'C' },
  { value: 'B', label: 'B' },
  { value: 'T', label: 'T' }
]

const getRatingClass = (value, selectedRating) => {
  const isSelected = selectedRating === value
  
  if (isSelected) {
    switch (value) {
      case 'R': return 'bg-error text-error-content border-error'
      case 'K': return 'bg-warning text-warning-content border-warning'
      case 'C': return 'bg-info text-info-content border-info'
      case 'B': return 'bg-success text-success-content border-success'
      case 'T': return 'bg-primary text-primary-content border-primary'
    }
  }
  
  return 'bg-base-100 border-base-300 text-base-content/40'
}
</script>
