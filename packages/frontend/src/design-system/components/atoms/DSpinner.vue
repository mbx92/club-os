<script setup>
/**
 * DSpinner — Loading spinner with size and color variants.
 *
 * Props:
 * - size: xs | sm | md | lg | xl
 * - color: primary | secondary | accent | gold | success | warning | error | info | neutral
 * - variant: spinner | dots | ring | bars
 * - label: string — accessible loading text
 */
const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'gold', 'success', 'warning', 'error', 'info', 'neutral'].includes(v),
  },
  variant: {
    type: String,
    default: 'spinner',
    validator: (v) => ['spinner', 'dots', 'ring', 'bars'].includes(v),
  },
  label: { type: String, default: 'Memuat...' },
})

const sizeClasses = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
  xl: 'loading-lg scale-150',
}

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  gold: 'text-[#F4A823]',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  neutral: 'text-neutral',
}

const variantClasses = {
  spinner: 'loading-spinner',
  dots: 'loading-dots',
  ring: 'loading-ring',
  bars: 'loading-bars',
}

const loadingSize = props.size === 'xl' ? 'loading-lg' : sizeClasses[props.size]
</script>

<template>
  <div class="inline-flex flex-col items-center gap-2" role="status" :aria-label="label">
    <span
      :class="['loading', variantClasses[variant], loadingSize, colorClasses[color]]"
      :style="size === 'xl' ? 'transform: scale(1.5);' : ''"
    />
    <span v-if="label" class="text-xs text-base-content/50">{{ label }}</span>
  </div>
</template>
