<script setup>
/**
 * DWorkoutPlanCard — Exercise/workout plan display card with sets/reps/duration, muscle group, and difficulty.
 *
 * Props:
 * - plan: { name, sets?, reps?, duration?, muscleGroup?, difficulty?, description? }
 * - selected: boolean
 * - compact: boolean
 */
const props = defineProps({
  plan: {
    type: Object,
    required: true,
    // { name: string, sets: number, reps: number, duration: string, muscleGroup: string, difficulty: string, description: string }
  },
  selected: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['click', 'select'])

const difficultyColors = {
  pemula: 'badge-success',
  beginner: 'badge-success',
  menengah: 'badge-warning',
  intermediate: 'badge-warning',
  mahir: 'badge-error',
  advanced: 'badge-error',
}

const difficultyLabels = {
  pemula: 'Pemula',
  beginner: 'Pemula',
  menengah: 'Menengah',
  intermediate: 'Menengah',
  mahir: 'Mahir',
  advanced: 'Mahir',
}

const muscleColors = {
  dada: 'bg-blue-100 text-blue-700',
  punggung: 'bg-teal-100 text-teal-700',
  bahu: 'bg-amber-100 text-amber-700',
  lengan: 'bg-red-100 text-red-700',
  kaki: 'bg-green-100 text-green-700',
  perut: 'bg-purple-100 text-purple-700',
  kardio: 'bg-pink-100 text-pink-700',
}

import { computed } from 'vue'

const difficultyKey = computed(() => (props.plan.difficulty || '').toLowerCase())
const difficultyClass = computed(() => difficultyColors[difficultyKey.value] || 'badge-ghost')
const difficultyLabel = computed(() => difficultyLabels[difficultyKey.value] || props.plan.difficulty || '—')
</script>

<template>
  <div
    :class="[
      'rounded-xl border p-4 transition-all duration-200 cursor-pointer',
      selected
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-base-300 bg-base-100 hover:border-base-400 hover:shadow-sm',
      compact ? 'p-3' : 'p-4',
    ]"
    @click="emit('click'); emit('select')"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <h4 :class="['font-semibold', compact ? 'text-sm' : 'text-base']">
        {{ plan.name }}
      </h4>
      <DBadge :variant="difficultyKey.value === 'pemula' || difficultyKey.value === 'beginner' ? 'success' : difficultyKey.value === 'menengah' || difficultyKey.value === 'intermediate' ? 'warning' : 'error'" size="xs" outline>
        {{ difficultyLabel }}
      </DBadge>
    </div>

    <!-- Specs -->
    <div :class="['flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-base-content/60', compact ? '' : 'mt-3']">
      <span v-if="plan.sets" class="flex items-center gap-1">
        <span class="i-tabler-repeat size-3.5" />
        {{ plan.sets }} set
      </span>
      <span v-if="plan.reps" class="flex items-center gap-1">
        <span class="i-tabler-arrow-up size-3.5" />
        {{ plan.reps }} rep
      </span>
      <span v-if="plan.duration" class="flex items-center gap-1">
        <span class="i-tabler-clock size-3.5" />
        {{ plan.duration }}
      </span>
    </div>

    <!-- Muscle group tag -->
    <div v-if="plan.muscleGroup && !compact" class="mt-3">
      <DTag
        :color="muscleColors[plan.muscleGroup.toLowerCase().replace(/\s/g, '_')] ? 'primary' : 'neutral'"
        size="xs"
        :label="plan.muscleGroup"
        outline
      />
    </div>

    <!-- Description -->
    <p v-if="plan.description && !compact" class="text-xs text-base-content/50 mt-2 line-clamp-2">
      {{ plan.description }}
    </p>
  </div>
</template>
