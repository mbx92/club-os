<script setup>
/**
 * DBadge — Status/tier indicator badge with dot option.
 *
 * Props:
 * - variant: gym | restaurant | vip | expired | active | pending | success | warning | error | info | neutral
 * - size: xs | sm | md | lg
 * - dot: boolean — show a dot indicator instead of full badge
 * - outline: boolean — outlined style
 * - closeable: boolean — show dismiss X button
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (v) => ['gym', 'restaurant', 'vip', 'expired', 'active', 'pending', 'success', 'warning', 'error', 'info', 'neutral', 'bronze', 'silver', 'gold', 'platinum'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v),
  },
  dot: { type: Boolean, default: false },
  outline: { type: Boolean, default: false },
  closeable: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

import { computed } from 'vue'

const sizeClasses = {
  xs: 'badge-xs text-[0.625rem]',
  sm: 'badge-sm text-xs',
  md: 'text-xs',
  lg: 'badge-lg text-sm',
}

const variantClasses = {
  gym: 'badge-info',
  restaurant: 'badge-error',
  vip: 'badge-warning',
  expired: 'badge-ghost opacity-60',
  active: 'badge-success',
  pending: 'badge-warning',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-ghost',
  bronze: 'badge-outline',
  silver: 'badge-outline',
  gold: 'badge-outline',
  platinum: 'badge-outline',
}

const dotColors = {
  gym: 'bg-info',
  restaurant: 'bg-error',
  vip: 'bg-warning',
  expired: 'bg-base-300',
  active: 'bg-success',
  pending: 'bg-warning',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-base-400',
  bronze: 'bg-[#CD7F32]',
  silver: 'bg-[#C0C0C0]',
  gold: 'bg-[#FFD700]',
  platinum: 'bg-[#E5E4E2]',
}

const tierBgColors = {
  bronze: 'bg-[#CD7F32] text-white border-[#CD7F32]',
  silver: 'bg-[#C0C0C0] text-gray-800 border-[#C0C0C0]',
  gold: 'bg-[#FFD700] text-gray-900 border-[#D4AF37]',
  platinum: 'bg-[#E5E4E2] text-gray-800 border-[#E5E4E2]',
}

const tierColor = computed(() => tierBgColors[props.variant] || '')
const dotColor = computed(() => dotColors[props.variant] || 'bg-base-400')
</script>

<template>
  <!-- Dot indicator -->
  <span v-if="dot" class="inline-flex items-center gap-1.5">
    <span class="inline-block size-2.5 rounded-full" :class="dotColor" />
    <span :class="sizeClasses[size]"><slot /></span>
  </span>
  <!-- Tier badge with custom color -->
  <span
    v-else-if="['bronze', 'silver', 'gold', 'platinum'].includes(variant)"
    :class="['badge', tierColor, sizeClasses[size], outline ? 'badge-outline' : '']"
    v-bind="$attrs"
  >
    <slot />
    <button v-if="closeable" class="ml-1 hover:opacity-70" @click.stop="emit('close')">&times;</button>
  </span>
  <!-- Standard badge -->
  <span
    v-else
    :class="['badge', variantClasses[variant], sizeClasses[size], outline ? 'badge-outline' : '']"
    v-bind="$attrs"
  >
    <slot />
    <button v-if="closeable" class="ml-1 hover:opacity-70" @click.stop="emit('close')">&times;</button>
  </span>
</template>
