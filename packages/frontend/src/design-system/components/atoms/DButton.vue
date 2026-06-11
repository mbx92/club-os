<script setup>
/**
 * DButton — Versatile action button with variants, sizes, icons, and states.
 *
 * Props:
 * - variant: primary | secondary | ghost | danger | gold | outline
 * - size: xs | sm | md | lg
 * - loading: boolean — shows spinner and disables interaction
 * - disabled: boolean
 * - iconLeft / iconRight: Tabler icon component name
 * - iconOnly: boolean — renders icon-only circular button
 * - block: boolean — full-width
 * - pill: boolean — rounded-full shape
 * - type: button | submit | reset
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'danger', 'gold', 'outline'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v),
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  iconLeft: { type: String, default: '' },
  iconRight: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  pill: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'submit', 'reset'].includes(v),
  },
})

const emit = defineEmits(['click'])

import { computed } from 'vue'

const isDisabled = computed(() => props.disabled || props.loading)

const sizeClass = {
  xs: 'btn-xs px-2 text-xs gap-1',
  sm: 'btn-sm px-3 text-sm gap-1.5',
  md: 'px-4 text-sm gap-2',
  lg: 'btn-lg px-6 text-base gap-2.5',
}

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-error',
  gold: '',
  outline: 'btn-outline',
}

const classes = computed(() => [
  'btn',
  variantClass[props.variant] || '',
  props.variant === 'gold' ? 'btn-gold' : '',
  sizeClass[props.size] || '',
  props.pill ? 'rounded-full' : '',
  props.block ? 'btn-block' : '',
  props.iconOnly ? 'btn-circle' : '',
  'font-semibold',
  'transition-all duration-200',
])
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isDisabled"
    v-bind="$attrs"
    @click="emit('click', $event)"
  >
    <!-- Loading spinner -->
    <span v-if="loading" class="loading loading-spinner" :class="size === 'xs' ? 'loading-xs' : size === 'sm' ? 'loading-sm' : ''" />
    <!-- Left icon -->
    <span v-else-if="iconLeft && !iconOnly" class="inline-flex shrink-0">
      <slot name="icon-left">
        <span :class="iconLeft" class="size-[1.15em]" />
      </slot>
    </span>
    <!-- Label -->
    <span v-if="!iconOnly" class="truncate">
      <slot />
    </span>
    <!-- Icon-only mode -->
    <span v-if="iconOnly && !loading" class="inline-flex shrink-0">
      <slot name="icon-only">
        <span :class="iconLeft || iconRight" class="size-[1.15em]" />
      </slot>
    </span>
    <!-- Right icon -->
    <span v-if="iconRight && !iconOnly && !loading" class="inline-flex shrink-0">
      <slot name="icon-right">
        <span :class="iconRight" class="size-[1.15em]" />
      </slot>
    </span>
  </button>
</template>

<style scoped>
.btn-gold {
  background-color: #F4A823 !important;
  border-color: #D4940F !important;
  color: #1A1A2E !important;
}
.btn-gold:hover {
  background-color: #E0990E !important;
  border-color: #C48408 !important;
}
.btn-gold:disabled {
  background-color: #F8D16B !important;
  border-color: #F0C850 !important;
  color: #1A1A2E !important;
  opacity: 0.6;
}
</style>
