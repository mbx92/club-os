<script setup>
/**
 * DAlertBanner — Alert/notification banner with icon, type color, message, and dismiss button.
 *
 * Props:
 * - type: success | warning | error | info
 * - message: string — alert message
 * - description: string — optional secondary text
 * - dismissible: boolean — show close button
 * - icon: string — override default icon
 * - visible: boolean — v-model visibility
 */
const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['success', 'warning', 'error', 'info'].includes(v),
  },
  message: { type: String, default: '' },
  description: { type: String, default: '' },
  dismissible: { type: Boolean, default: true },
  icon: { type: String, default: '' },
  visible: { type: Boolean, default: true },
})

const emit = defineEmits(['update:visible', 'dismiss'])

const defaultIcons = {
  success: 'i-tabler-circle-check',
  warning: 'i-tabler-alert-triangle',
  error: 'i-tabler-alert-circle',
  info: 'i-tabler-info-circle',
}

const iconClass = props.icon || defaultIcons[props.type]

function dismiss() {
  emit('update:visible', false)
  emit('dismiss')
}
</script>

<template>
  <Transition name="slide-down" mode="out-in">
    <div
      v-if="visible"
      :class="['alert rounded-xl', `alert-${type}`]"
      role="alert"
    >
      <span :class="[iconClass, 'size-5 shrink-0']" />
      <div class="flex-1">
        <span class="font-semibold text-sm">{{ message }}</span>
        <p v-if="description" class="text-xs opacity-70 mt-0.5">{{ description }}</p>
      </div>
      <button
        v-if="dismissible"
        class="btn btn-ghost btn-xs btn-square shrink-0"
        @click="dismiss"
        aria-label="Tutup"
      >
        <span class="i-tabler-x size-4" />
      </button>
      <slot name="actions" />
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
