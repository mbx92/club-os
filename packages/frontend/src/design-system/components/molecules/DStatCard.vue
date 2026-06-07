<script setup>
/**
 * DStatCard — Dashboard stat card with animated counter value, icon, and trend indicator.
 *
 * Props:
 * - label: string — metric label
 * - value: number|string — displayed value
 * - prefix / suffix: string — value decoration
 * - icon: string — Tabler icon name
 * - trend: number — percentage change (positive = up, negative = down)
 * - trendLabel: string — secondary trend text
 * - color: gym | restaurant | primary | success | warning | gold
 * - animate: boolean — animate value on mount
 */
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  icon: { type: String, default: '' },
  trend: { type: Number, default: null },
  trendLabel: { type: String, default: '' },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['gym', 'restaurant', 'primary', 'success', 'warning', 'gold', 'error', 'info'].includes(v),
  },
  animate: { type: Boolean, default: false },
})

import { computed } from 'vue'

const accentColors = {
  gym: 'from-steel-500/10 to-steel-500/5 border-steel-200 dark:border-steel-800',
  restaurant: 'from-coral-500/10 to-coral-500/5 border-coral-200 dark:border-coral-800',
  primary: 'from-primary/10 to-primary/5 border-primary/20',
  success: 'from-success/10 to-success/5 border-success/20',
  warning: 'from-warning/10 to-warning/5 border-warning/20',
  gold: 'from-amber-400/10 to-amber-400/5 border-amber-300/30',
  error: 'from-error/10 to-error/5 border-error/20',
  info: 'from-info/10 to-info/5 border-info/20',
}

const iconBgColors = {
  gym: 'bg-steel-500/15 text-steel-600 dark:text-steel-400',
  restaurant: 'bg-coral-500/15 text-coral-600 dark:text-coral-400',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  gold: 'bg-amber-400/15 text-amber-600',
  error: 'bg-error/15 text-error',
  info: 'bg-info/15 text-info',
}

const trendDirection = computed(() => {
  if (props.trend == null) return ''
  return props.trend >= 0 ? 'up' : 'down'
})
</script>

<template>
  <div
    :class="[
      'dashboard-metric relative overflow-hidden rounded-2xl border p-5 cursor-default',
      'bg-gradient-to-br',
      accentColors[color],
    ]"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="text-xs font-medium text-base-content/50 uppercase tracking-wider">{{ label }}</p>
        <div class="mt-1.5 flex items-baseline gap-0.5">
          <span v-if="prefix" class="text-sm text-base-content/40">{{ prefix }}</span>
          <span class="text-2xl font-bold font-mono tracking-tight">
            {{ value }}
          </span>
          <span v-if="suffix" class="text-sm text-base-content/40">{{ suffix }}</span>
        </div>
      </div>

      <!-- Icon -->
      <div
        v-if="icon"
        :class="['rounded-xl p-2.5 shrink-0', iconBgColors[color]]"
      >
        <span :class="[icon, 'size-5']" />
      </div>
    </div>

    <!-- Trend -->
    <div v-if="trend != null" class="flex items-center gap-1 mt-3">
      <span
        :class="[
          'text-xs font-semibold flex items-center gap-0.5',
          trend >= 0 ? 'text-success' : 'text-error',
        ]"
      >
        <span :class="trend >= 0 ? 'i-tabler-trending-up size-3.5' : 'i-tabler-trending-down size-3.5'" />
        {{ Math.abs(trend) }}%
      </span>
      <span v-if="trendLabel" class="text-[0.65rem] text-base-content/40">{{ trendLabel }}</span>
    </div>
  </div>
</template>
