<script setup>
/**
 * DToggle — Switch/toggle with label and size variants.
 *
 * Props:
 * - modelValue: boolean — v-model value
 * - label: string — label text beside toggle
 * - disabled: boolean
 * - size: sm | md | lg
 * - color: primary | secondary | accent | success | warning | error
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'success', 'warning', 'error'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const sizeClass = {
  sm: 'toggle-sm',
  md: '',
  lg: 'toggle-lg',
}

const colorClass = {
  primary: 'toggle-primary',
  secondary: 'toggle-secondary',
  accent: 'toggle-accent',
  success: 'toggle-success',
  warning: 'toggle-warning',
  error: 'toggle-error',
}

function onToggle(e) {
  emit('update:modelValue', e.target.checked)
  emit('change', e.target.checked)
}
</script>

<template>
  <div class="form-control">
    <label :class="['flex items-center gap-3 cursor-pointer select-none', disabled ? 'opacity-50 pointer-events-none' : '']">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :class="['toggle', sizeClass[size], colorClass[color]]"
        @change="onToggle"
      />
      <span v-if="label" class="text-sm">{{ label }}</span>
    </label>
  </div>
</template>
