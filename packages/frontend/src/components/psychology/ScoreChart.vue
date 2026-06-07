<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title flex items-center gap-2">
        <component :is="icon" class="w-5 h-5" />
        {{ title }}
      </h2>
      
      <!-- Score Chart -->
      <div class="space-y-4 mt-4">
        <div
          v-for="item in sortedScores"
          :key="item.scale"
          class="space-y-1"
        >
          <div class="flex justify-between text-sm">
            <span class="font-medium">{{ item.label || item.scale }}</span>
            <span :class="getScoreClass(item.score, item.maxScore)">
              {{ item.score }}/{{ item.maxScore || 9 }}
            </span>
          </div>
          <progress
            class="progress w-full"
            :class="getProgressClass(item.score, item.maxScore)"
            :value="item.score"
            :max="item.maxScore || 9"
          ></progress>
          <p v-if="item.description" class="text-xs text-base-content/60">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IconChartBar } from '@tabler/icons-vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Skor'
  },
  scores: {
    type: Array,
    default: () => []
    // Expected format: [{ scale: 'G', score: 7, label: 'Hard Working', description: '...', maxScore: 9 }]
  },
  icon: {
    type: Object,
    default: () => IconChartBar
  },
  sortBy: {
    type: String,
    default: 'score' // 'score' or 'label'
  },
  sortOrder: {
    type: String,
    default: 'desc' // 'asc' or 'desc'
  }
})

const sortedScores = computed(() => {
  const sorted = [...props.scores]
  
  if (props.sortBy === 'score') {
    sorted.sort((a, b) => props.sortOrder === 'desc' ? b.score - a.score : a.score - b.score)
  } else if (props.sortBy === 'label') {
    sorted.sort((a, b) => {
      const labelA = (a.label || a.scale).toLowerCase()
      const labelB = (b.label || b.scale).toLowerCase()
      return props.sortOrder === 'desc' ? labelB.localeCompare(labelA) : labelA.localeCompare(labelB)
    })
  }
  
  return sorted
})

const getScoreClass = (score, maxScore = 9) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 70) return 'text-success font-bold'
  if (percentage >= 40) return 'text-warning font-bold'
  return 'text-error font-bold'
}

const getProgressClass = (score, maxScore = 9) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 70) return 'progress-success'
  if (percentage >= 40) return 'progress-warning'
  return 'progress-error'
}
</script>
