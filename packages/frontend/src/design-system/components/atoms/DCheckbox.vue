<script setup>
/**
 * DCheckbox — Custom checkbox with label, indeterminate state, and error support.
 *
 * Props:
 * - modelValue: boolean — v-model value
 * - indeterminate: boolean — shows indeterminate dash state
 * - label: string — label text
 * - disabled: boolean
 * - error: string
 * - size: sm | md | lg
 * - color: primary | secondary | accent | success | warning | error | info
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

import { ref, watch, onMounted } from 'vue'

const checkboxRef = ref(null)

watch(() => props.indeterminate, (val) => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = val
  }
})

onMounted(() => {
  if (checkboxRef.value && props.indeterminate) {
    checkboxRef.value.indeterminate = true
  }
})

const sizeClass = {
  sm: 'checkbox-sm',
  md: '',
  lg: 'checkbox-lg',
}

const colorClass = {
  primary: 'checkbox-primary',
  secondary: 'checkbox-secondary',
  accent: 'checkbox-accent',
  success: 'checkbox-success',
  warning: 'checkbox-warning',
  error: 'checkbox-error',
  info: 'checkbox-info',
}

function onToggle(e) {
  emit('update:modelValue', e.target.checked)
  emit('change', e.target.checked)
}
</script>

<template>
  <div class="form-control">
    <label :class="['flex items-center gap-2.5 cursor-pointer select-none', disabled ? 'opacity-50 pointer-events-none' : '']">
      <input
        ref="checkboxRef"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :class="['checkbox', sizeClass[size], colorClass[color]]"
        @change="onToggle"
      />
      <span v-if="label" :class="['text-sm', error ? 'text-error' : '']">{{ label }}</span>
    </label>
  </div>
</template>
