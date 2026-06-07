<script setup>
/**
 * DDivider — Horizontal or vertical separator, optionally with label.
 *
 * Props:
 * - direction: horizontal | vertical
 * - label: string — text centered in the divider
 * - color: string — custom color (Tailwind border class)
 * - thickness: thin | normal | thick
 * - dashed: boolean
 */
const props = defineProps({
  direction: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  label: { type: String, default: '' },
  color: { type: String, default: '' },
  thickness: {
    type: String,
    default: 'normal',
    validator: (v) => ['thin', 'normal', 'thick'].includes(v),
  },
  dashed: { type: Boolean, default: false },
})

const thicknessClass = {
  thin: 'border-t',
  normal: 'border-t',
  thick: 'border-t-2',
}
</script>

<template>
  <!-- Horizontal with label -->
  <div
    v-if="direction === 'horizontal' && label"
    :class="['flex items-center gap-3 w-full my-4', color || 'text-base-content/30']"
  >
    <span :class="['flex-1', thicknessClass[thickness], dashed ? 'border-dashed' : 'border-solid', color || 'border-base-300']" />
    <span class="text-xs font-semibold uppercase tracking-wider shrink-0 opacity-60">{{ label }}</span>
    <span :class="['flex-1', thicknessClass[thickness], dashed ? 'border-dashed' : 'border-solid', color || 'border-base-300']" />
  </div>

  <!-- Horizontal without label -->
  <hr
    v-else-if="direction === 'horizontal'"
    :class="[
      'my-4 w-full',
      thicknessClass[thickness],
      dashed ? 'border-dashed' : 'border-solid',
      color || 'border-base-300',
    ]"
  />

  <!-- Vertical -->
  <div
    v-else
    :class="[
      'self-stretch',
      dashed ? 'border-l border-dashed' : 'border-l',
      thickness === 'thin' ? 'border-l' : thickness === 'thick' ? 'border-l-2' : 'border-l',
      color || 'border-base-300',
    ]"
  />
</template>
