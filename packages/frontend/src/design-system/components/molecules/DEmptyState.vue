<script setup>
/**
 * DEmptyState — Placeholder for empty content areas with illustration, title, description, and CTA.
 *
 * Props:
 * - icon: string — Tabler icon name
 * - title: string — main heading
 * - description: string — secondary text
 * - actionLabel: string — CTA button text
 * - actionIcon: string — CTA button icon
 * - size: sm | md | lg
 */
const props = defineProps({
  icon: { type: String, default: 'i-tabler-inbox' },
  title: { type: String, default: 'Tidak ada data' },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  actionIcon: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

const emit = defineEmits(['action'])

const sizeConfig = {
  sm: { icon: 'size-8', title: 'text-sm', desc: 'text-xs', gap: 'gap-2', iconBg: 'p-3' },
  md: { icon: 'size-12', title: 'text-base', desc: 'text-sm', gap: 'gap-3', iconBg: 'p-4' },
  lg: { icon: 'size-16', title: 'text-lg', desc: 'text-base', gap: 'gap-4', iconBg: 'p-5' },
}

const s = sizeConfig[size]
</script>

<template>
  <div :class="['flex flex-col items-center justify-center text-center py-8 px-4', s.gap]">
    <!-- Icon -->
    <div :class="['rounded-2xl bg-base-200 text-base-content/30', s.iconBg]">
      <span :class="[icon, s.icon]" />
    </div>

    <!-- Title -->
    <h3 :class="['font-bold text-base-content/60', s.title]">{{ title }}</h3>

    <!-- Description -->
    <p v-if="description" :class="['text-base-content/40 max-w-xs', s.desc]">
      {{ description }}
    </p>

    <!-- CTA -->
    <DButton
      v-if="actionLabel"
      :variant="'primary'"
      :size="size === 'sm' ? 'sm' : 'md'"
      :icon-left="actionIcon"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </DButton>

    <!-- Slot for custom content -->
    <slot />
  </div>
</template>
