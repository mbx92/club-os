<script setup>
/**
 * DAvatar — User/entity avatar with fallback initials, online indicator, and tier crown.
 *
 * Props:
 * - src: string — image URL
 * - alt: string — alt text for image
 * - name: string — used for generating initials fallback
 * - size: xs | sm | md | lg | xl | 2xl
 * - online: boolean — show green online dot
 * - tier: string — show tier crown overlay (bronze/silver/gold/platinum/vip)
 * - rounded: boolean — if false, renders as rounded-rect shape (default: true = circular)
 */
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  name: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(v),
  },
  online: { type: Boolean, default: false },
  tier: { type: String, default: '' },
  rounded: { type: Boolean, default: true },
})

import { computed } from 'vue'

const sizeClasses = {
  xs: 'size-7 text-[0.6rem]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-lg',
  '2xl': 'size-28 text-xl',
}

const onlineDotSize = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
  lg: 'size-3.5',
  xl: 'size-4',
  '2xl': 'size-5',
}

const tierCrownSize = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
  '2xl': 'size-7',
}

const tierColors = {
  bronze: 'text-[#CD7F32]',
  silver: 'text-[#C0C0C0]',
  gold: 'text-[#FFD700]',
  platinum: 'text-[#E5E4E2]',
  vip: 'text-[#B026FF]',
}

const initials = computed(() => {
  if (!props.name) return '?'
  const parts = props.name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
})

const tierLabel = computed(() => props.tier ? props.tier.toLowerCase() : '')
</script>

<template>
  <div class="avatar inline-flex relative shrink-0" :class="{ 'placeholder': !src }">
    <!-- Image avatar -->
    <div v-if="src" :class="['relative', sizeClasses[size], rounded ? 'rounded-full' : 'rounded-xl']">
      <img :src="src" :alt="alt || name || 'Avatar'" :class="['w-full h-full object-cover', rounded ? 'rounded-full' : 'rounded-xl']" />
    </div>
    <!-- Fallback with initials -->
    <div v-else :class="['bg-neutral text-neutral-content flex items-center justify-center font-bold uppercase', sizeClasses[size], rounded ? 'rounded-full' : 'rounded-xl']">
      <span>{{ initials }}</span>
    </div>
    <!-- Online indicator -->
    <span
      v-if="online"
      :class="['absolute bottom-0 right-0 rounded-full bg-success border-2 border-base-100', onlineDotSize[size]]"
    />
    <!-- Tier crown overlay -->
    <span
      v-if="tier"
      :class="['absolute -top-0.5 -right-0.5', tierCrownSize[size], tierColors[tierLabel] || 'text-warning']"
      :title="`${tier} tier`"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full drop-shadow-sm">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 2v2H5v-2h14z" />
      </svg>
    </span>
  </div>
</template>
