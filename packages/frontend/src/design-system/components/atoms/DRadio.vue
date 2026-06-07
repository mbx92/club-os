<script setup>
/**
 * DRadio — Radio button group or single radio with label.
 *
 * Props:
 * - modelValue: any — v-model value
 * - value: any — this radio's option value
 * - label: string — label text
 * - disabled: boolean
 * - name: string — HTML name attribute for radio group
 * - size: sm | md | lg
 * - color: primary | secondary | accent
 */
const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  value: { type: [String, Number, Boolean], default: '' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const sizeClass = {
  sm: 'radio-sm',
  md: '',
  lg: 'radio-lg',
}

const colorClass = {
  primary: 'radio-primary',
  secondary: 'radio-secondary',
  accent: 'radio-accent',
}

const isChecked = computed(() => props.modelValue === props.value)

import { computed } from 'vue'

function onToggle() {
  emit('update:modelValue', props.value)
  emit('change', props.value)
}
</script>

<template>
  <div class="form-control">
    <label :class="['flex items-center gap-2.5 cursor-pointer select-none', disabled ? 'opacity-50 pointer-events-none' : '']">
      <input
        type="radio"
        :name="name"
        :value="value"
        :checked="isChecked"
        :disabled="disabled"
        :class="['radio', sizeClass[size], colorClass[color]]"
        @change="onToggle"
      />
      <span v-if="label" class="text-sm">{{ label }}</span>
    </label>
  </div>
</template>
