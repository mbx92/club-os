<script setup>
/**
 * DIcon — Wrapper for Tabler icons (or any icon component), with size and color options.
 *
 * Props:
 * - icon: string — Tabler icon component name (e.g., 'IconUsers')
 * - size: xs | sm | md | lg | xl | 2xl | 3xl — or number for pixel
 * - color: string — Tailwind text color class
 * - stroke: number — stroke width
 * - filled: boolean — use filled variant of icon
 */
const props = defineProps({
  icon: { type: String, required: true },
  size: { type: [String, Number], default: 'md' },
  color: { type: String, default: '' },
  stroke: { type: Number, default: 2 },
  filled: { type: Boolean, default: false },
})

import { computed } from 'vue'

const sizeRem = computed(() => {
  const map = { xs: '1rem', sm: '1.25rem', md: '1.5rem', lg: '2rem', xl: '2.5rem', '2xl': '3rem', '3xl': '4rem' }
  if (typeof props.size === 'string') return map[props.size] || map.md
  return `${props.size}px`
})

const iconName = computed(() => {
  if (props.filled) {
    return props.icon.replace(/Icon/, 'Icon') + 'Filled'
  }
  return props.icon
})
</script>

<template>
  <span
    :class="['inline-flex shrink-0 items-center justify-center', color]"
    :style="{ width: sizeRem, height: sizeRem }"
  >
    <slot>
      <span class="i-tabler-*" />
    </slot>
  </span>
</template>
