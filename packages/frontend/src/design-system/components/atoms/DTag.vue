<script setup>
/**
 * DTag — Tag/chip component, removable and clickable, with color categories.
 *
 * Props:
 * - label: string — tag text
 * - color: string — color key (gym, restaurant, vip, etc. or hex)
 * - removable: boolean — show X to remove
 * - clickable: boolean — emit click event
 * - size: xs | sm | md | lg
 * - icon: string — Tabler icon name prefix
 * - outline: boolean — outlined variant
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  label: { type: String, default: '' },
  color: { type: String, default: 'neutral' },
  removable: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v),
  },
  icon: { type: String, default: '' },
  outline: { type: Boolean, default: false },
})

const emit = defineEmits(['click', 'remove'])

const sizeClasses = {
  xs: 'text-[0.6rem] px-1.5 py-0.5 gap-0.5',
  sm: 'text-[0.7rem] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1',
  lg: 'text-sm px-3 py-1.5 gap-1.5',
}

const colorMap = {
  gym: 'bg-steel-100 text-steel-700 border-steel-300 dark:bg-steel-900 dark:text-steel-200 dark:border-steel-700',
  restaurant: 'bg-coral-100 text-coral-700 border-coral-300 dark:bg-coral-900 dark:text-coral-200 dark:border-coral-700',
  vip: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
  bronze: 'bg-amber-100 text-amber-800 border-amber-300',
  silver: 'bg-slate-100 text-slate-700 border-slate-300',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  platinum: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  active: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  expired: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
  pending: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
  neutral: 'bg-base-200 text-base-content/70 border-base-300',
  primary: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-error/10 text-error border-error/30',
  info: 'bg-info/10 text-info border-info/30',
}

const tagColor = colorMap[props.color] || colorMap.neutral
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-lg border font-medium transition-colors',
      tagColor,
      sizeClasses[size],
      outline ? 'bg-transparent' : '',
      clickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : '',
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    v-bind="$attrs"
    @click="clickable && emit('click', $event)"
    @keydown.enter="clickable && emit('click', $event)"
  >
    <span v-if="icon" :class="[icon, size === 'xs' ? 'size-3' : size === 'lg' ? 'size-4' : 'size-3.5']" />
    <span><slot>{{ label }}</slot></span>
    <button
      v-if="removable"
      type="button"
      class="opacity-50 hover:opacity-100 transition-opacity shrink-0 -mr-0.5"
      :class="size === 'xs' ? 'text-[0.55rem]' : ''"
      @click.stop="emit('remove')"
      aria-label="Hapus"
    >
      &times;
    </button>
  </span>
</template>
