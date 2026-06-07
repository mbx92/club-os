<script setup>
/**
 * DTooltip — Directional tooltip with configurable delay and max-width.
 *
 * Props:
 * - text: string — tooltip content
 * - position: top | bottom | left | right
 * - delay: number — show delay in ms
 * - maxWidth: string — max-width of tooltip (e.g., '16rem')
 * - disabled: boolean — disable tooltip
 */
const props = defineProps({
  text: { type: String, default: '' },
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v),
  },
  delay: { type: Number, default: 200 },
  maxWidth: { type: String, default: '16rem' },
  disabled: { type: Boolean, default: false },
})

import { ref, computed } from 'vue'

const show = ref(false)
let timeout = null

const tooltipClass = computed(() => {
  const base = `tooltip tooltip-${props.position}`
  return base
})

function onMouseEnter() {
  if (props.disabled) return
  if (props.delay > 0) {
    timeout = setTimeout(() => { show.value = true }, props.delay)
  } else {
    show.value = true
  }
}

function onMouseLeave() {
  clearTimeout(timeout)
  show.value = false
}

function onFocus() {
  if (props.disabled) return
  show.value = true
}

function onBlur() {
  show.value = false
}
</script>

<template>
  <div
    :class="[tooltipClass]"
    :data-tip="text"
  >
    <slot />
  </div>
</template>

<style scoped>
.tooltip::before {
  max-width: v-bind(maxWidth);
  white-space: normal;
  word-wrap: break-word;
}
</style>
