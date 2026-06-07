<script setup>
/**
 * DProgressBar — Labeled, colored progress bar with animated fill.
 *
 * Props:
 * - value: number — current progress (0-100)
 * - max: number — max value (default 100)
 * - label: string — optional label above
 * - showPercentage: boolean — show percentage text
 * - color: primary | success | warning | error | info | gold | gym | restaurant
 * - size: sm | md | lg
 * - animated: boolean — animate the fill transition
 * - striped: boolean — striped/animated pattern
 */
const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  label: { type: String, default: '' },
  showPercentage: { type: Boolean, default: true },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'success', 'warning', 'error', 'info', 'gold', 'gym', 'restaurant'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  animated: { type: Boolean, default: true },
  striped: { type: Boolean, default: false },
})

import { computed } from 'vue'

const percentage = computed(() => Math.min(100, Math.max(0, Math.round((props.value / props.max) * 100))))

const colorClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  gold: 'bg-[#F4A823]',
  gym: 'bg-[#2D6A9F]',
  restaurant: 'bg-[#E8604C]',
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}
</script>

<template>
  <div :class="['w-full', size === 'sm' ? 'space-y-1' : size === 'lg' ? 'space-y-2' : 'space-y-1.5']">
    <!-- Label + percentage -->
    <div v-if="label || showPercentage" class="flex items-center justify-between">
      <span v-if="label" class="text-xs font-medium text-base-content/60">{{ label }}</span>
      <span v-if="showPercentage" class="text-xs font-mono font-semibold text-base-content/50">
        {{ percentage }}%
      </span>
    </div>

    <!-- Bar -->
    <div :class="['w-full rounded-full bg-base-200 overflow-hidden', sizeClasses[size]]">
      <div
        :class="[
          'h-full rounded-full',
          colorClasses[color],
          striped ? 'bg-stripes' : '',
          animated ? 'transition-all duration-700 ease-out' : '',
        ]"
        :style="{ width: `${percentage}%` }"
        role="progressbar"
        :aria-valuenow="value"
        :aria-valuemin="0"
        :aria-valuemax="max"
      />
    </div>
  </div>
</template>

<style scoped>
.bg-stripes {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: stripes 1s linear infinite;
}
@keyframes stripes {
  0% { background-position: 1rem 0; }
  100% { background-position: 0 0; }
}
</style>
