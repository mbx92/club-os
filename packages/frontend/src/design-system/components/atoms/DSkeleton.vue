<script setup>
/**
 * DSkeleton — Loading placeholder with text, avatar, card, and table row variants.
 *
 * Props:
 * - variant: text | avatar | card | table | circle | rect | block
 * - size: xs | sm | md | lg | xl | 2xl (for avatar)
 * - width: string — custom width (e.g., 'w-48', '100%')
 * - height: string — custom height (e.g., 'h-4')
 * - repeat: number — repeat rows (for table variant)
 * - animated: boolean — enable shimmer animation
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'avatar', 'card', 'table', 'circle', 'rect', 'block'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(v),
  },
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  repeat: { type: Number, default: 1 },
  animated: { type: Boolean, default: true },
})

import { computed } from 'vue'

const avatarSizes = {
  xs: 'size-8',
  sm: 'size-10',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-24',
  '2xl': 'size-32',
}

const classes = computed(() => {
  const base = `skeleton ${props.animated ? '' : 'no-animation'} inline-block`
  switch (props.variant) {
    case 'text':
      return `${base} h-4 w-full rounded-md`
    case 'avatar':
      return `${base} ${avatarSizes[props.size]} rounded-full`
    case 'circle':
      return `${base} ${avatarSizes[props.size]} rounded-full`
    case 'card':
      return `${base} h-48 w-full rounded-xl`
    case 'table':
      return `${base} h-8 w-full rounded-md`
    case 'rect':
      return `${base} ${props.width || 'w-full'} ${props.height || 'h-4'} rounded-md`
    case 'block':
      return `${base} h-full w-full rounded-xl`
    default:
      return base
  }
})
</script>

<template>
  <template v-if="variant === 'table' && repeat > 1">
    <div v-for="i in repeat" :key="i" :class="classes" :style="{ width: i === repeat ? '60%' : '100%', marginBottom: '0.5rem' }" />
  </template>
  <template v-else>
    <div v-for="i in Math.max(1, repeat)" :key="i" :class="classes" :style="width || height ? { width: width || undefined, height: height || undefined } : {}" />
  </template>
</template>
