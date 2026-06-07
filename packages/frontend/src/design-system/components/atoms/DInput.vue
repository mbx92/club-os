<script setup>
/**
 * DInput — Form input with type variants, prefix/suffix icons, and error state.
 *
 * Props:
 * - modelValue: string|number — v-model value
 * - type: text | email | password | number | search
 * - placeholder: string
 * - disabled: boolean
 * - readonly: boolean
 * - error: string — error message text
 * - label: string — floating/stacked label
 * - helper: string — helper text below input
 * - prefixIcon / suffixIcon: Tabler icon name string
 * - size: sm | md | lg
 * - showPasswordToggle: boolean — for type=password, shows eye toggle
 * - clearable: boolean — shows X clear button when value exists
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'email', 'password', 'number', 'search'].includes(v),
  },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  error: { type: String, default: '' },
  label: { type: String, default: '' },
  helper: { type: String, default: '' },
  prefixIcon: { type: String, default: '' },
  suffixIcon: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  showPasswordToggle: { type: Boolean, default: true },
  clearable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'clear'])

import { ref, computed } from 'vue'

const showPassword = ref(false)
const isFocused = ref(false)

const effectiveType = computed(() => {
  if (props.type === 'password' && showPassword.value) return 'text'
  return props.type
})

const hasValue = computed(() => {
  return props.modelValue !== '' && props.modelValue != null
})

const sizeClasses = {
  sm: 'input-sm text-xs',
  md: 'text-sm',
  lg: 'input-lg text-base',
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onClear() {
  emit('update:modelValue', '')
  emit('clear')
}

function onFocus(e) {
  isFocused.value = true
  emit('focus', e)
}

function onBlur(e) {
  isFocused.value = false
  emit('blur', e)
}
</script>

<template>
  <div class="form-control w-full">
    <!-- Label -->
    <label v-if="label" class="label py-1" :class="{ 'text-error': !!error }">
      <span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">{{ label }}</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative">
      <!-- Prefix icon -->
      <span
        v-if="prefixIcon"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none"
        :class="[prefixIcon, size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4']"
      />

      <input
        :type="effectiveType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'input input-bordered w-full',
          sizeClasses[size] || '',
          error ? 'input-error' : '',
          prefixIcon ? 'pl-9' : '',
          (suffixIcon || type === 'password' || clearable) ? 'pr-9' : '',
        ]"
        v-bind="$attrs"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />

      <!-- Password toggle -->
      <button
        v-if="type === 'password' && showPasswordToggle && !suffixIcon"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors"
        @click="showPassword = !showPassword"
        :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
      >
        <span :class="showPassword ? 'i-tabler-eye-off' : 'i-tabler-eye'" :class="size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'" />
      </button>

      <!-- Suffix icon -->
      <span
        v-else-if="suffixIcon && type !== 'password'"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none"
        :class="[suffixIcon, size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4']"
      />

      <!-- Clear button -->
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors"
        @click="onClear"
        aria-label="Hapus input"
      >
        <span :class="size === 'sm' ? 'size-3' : size === 'lg' ? 'size-4.5' : 'size-3.5'" class="i-tabler-x" />
      </button>
    </div>

    <!-- Error message -->
    <label v-if="error" class="label py-0.5">
      <span class="label-text-alt text-error">{{ error }}</span>
    </label>

    <!-- Helper text -->
    <label v-else-if="helper" class="label py-0.5">
      <span class="label-text-alt opacity-50">{{ helper }}</span>
    </label>
  </div>
</template>
