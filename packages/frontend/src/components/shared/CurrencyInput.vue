<script setup>
/**
 * CurrencyInput – renders a text input that displays nominal values
 * with Indonesian thousand-separator (`.`), e.g. 55000 → "55.000".
 *
 * Props:
 *   modelValue  – Number (v-model)
 *   placeholder – String  (default '0')
 *   min         – Number  (default 0)
 *   disabled    – Boolean (default false)
 *   required    – Boolean (default false)
 *   inputClass  – String  extra classes for the <input>
 *
 * Usage:
 *   <CurrencyInput v-model="formData.price" input-class="input input-bordered w-full" />
 */
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  placeholder: { type: String, default: '0' },
  min: { type: [Number, String], default: 0 },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  inputClass: { type: String, default: 'input input-bordered w-full' }
})

const emit = defineEmits(['update:modelValue'])

// ── helpers ────────────────────────────────────────────────────────────────
const toRaw = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val)
  const str = String(val ?? '').trim()
  if (!str) return 0

  const dotCount = (str.match(/\./g) || []).length

  // Multiple dots → all are thousand separators (e.g. "1.234.567") → strip all
  if (dotCount > 1) {
    return Math.round(parseFloat(str.replace(/\./g, '')) || 0)
  }

  // Comma present → IDR format (dot = thousands, comma = decimal) e.g. "55.000,50"
  if (str.includes(',')) {
    return Math.round(parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0)
  }

  // Single dot: distinguish thousand separator vs decimal point
  if (dotCount === 1) {
    const afterDot = str.split('.')[1]
    // Exactly 3 digits after dot → thousand separator: "55.000" → 55000
    if (afterDot.length === 3) {
      return parseInt(str.replace('.', ''), 10) || 0
    }
    // Otherwise decimal number: "55000.00" → 55000
    return Math.round(parseFloat(str)) || 0
  }

  // No dot, no comma → plain integer string: "55000" → 55000
  return parseInt(str, 10) || 0
}

const formatThousand = (num) => {
  if (!num && num !== 0) return ''
  // Math.round handles floating point noise
  return Math.round(num).toLocaleString('id-ID')
}

// ── state ───────────────────────────────────────────────────────────────────
const isFocused = ref(false)
const displayValue = ref(formatThousand(toRaw(props.modelValue)))

// When parent changes modelValue externally, re-format (but not while typing)
watch(
  () => props.modelValue,
  (newVal) => {
    if (!isFocused.value) {
      displayValue.value = formatThousand(toRaw(newVal))
    }
  }
)

// ── handlers ─────────────────────────────────────────────────────────────────
const handleFocus = () => {
  isFocused.value = true
  // Show plain digits so the user can edit easily
  const raw = toRaw(props.modelValue)
  displayValue.value = raw === 0 ? '' : String(raw)
}

const handleInput = (e) => {
  // Strip every `.` (thousand sep) and any non-digit
  const raw = e.target.value.replace(/[^\d]/g, '')
  if (raw === '') {
    displayValue.value = ''
    emit('update:modelValue', 0)
    return
  }
  const num = parseInt(raw, 10)
  // Format while typing
  displayValue.value = num.toLocaleString('id-ID')
  // Move cursor to end (native behaviour is fine here)
  emit('update:modelValue', num)
}

const handleBlur = () => {
  isFocused.value = false
  displayValue.value = formatThousand(toRaw(props.modelValue))
}
</script>

<template>
  <input
    :value="displayValue"
    type="text"
    inputmode="numeric"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :class="inputClass"
    @focus="handleFocus"
    @input="handleInput"
    @blur="handleBlur"
  />
</template>
