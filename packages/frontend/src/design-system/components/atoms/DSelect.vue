<script setup>
/**
 * DSelect — Single select dropdown with search and option groups.
 *
 * Props:
 * - modelValue: any — v-model value
 * - options: Array<{ value, label, group? }> — option list
 * - placeholder: string
 * - disabled: boolean
 * - error: string
 * - label: string
 * - size: sm | md | lg
 * - searchable: boolean — enables search filter input
 * - clearable: boolean — show clear button
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number, Object], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pilih...' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  label: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  searchable: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

import { ref, computed } from 'vue'

const sizeClasses = {
  sm: 'select-sm text-xs',
  md: 'text-sm',
  lg: 'select-lg text-base',
}

const searchQuery = ref('')
const isOpen = ref(false)

const groupedOptions = computed(() => {
  const filtered = props.searchable && searchQuery.value
    ? props.options.filter((opt) => {
        const label = typeof opt === 'string' ? opt : (opt.label || opt.value || '')
        return label.toLowerCase().includes(searchQuery.value.toLowerCase())
      })
    : props.options

  // Group by `group` property
  const hasGroups = filtered.some((o) => typeof o === 'object' && o.group)
  if (!hasGroups) return [{ items: filtered }]

  const groups = {}
  for (const opt of filtered) {
    const g = opt.group || 'Ungrouped'
    if (!groups[g]) groups[g] = []
    groups[g].push(opt)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
})

const displayValue = computed(() => {
  if (props.modelValue == null || props.modelValue === '') return ''
  const selected = props.options.find((o) => {
    const val = typeof o === 'string' ? o : o.value
    return val === props.modelValue
  })
  if (!selected) return ''
  return typeof selected === 'string' ? selected : (selected.label || selected.value)
})

function select(value) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
  searchQuery.value = ''
}

function toggleOpen() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) searchQuery.value = ''
  }
}

function clear(e) {
  e.stopPropagation()
  emit('update:modelValue', '')
  emit('change', null)
}
</script>

<template>
  <div class="form-control w-full relative">
    <label v-if="label" class="label py-1" :class="{ 'text-error': !!error }">
      <span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">{{ label }}</span>
    </label>

    <div class="relative">
      <!-- Trigger -->
      <button
        type="button"
        :class="[
          'select select-bordered w-full flex items-center justify-between pr-10 text-left',
          sizeClasses[size] || '',
          error ? 'select-error' : '',
          'cursor-pointer',
        ]"
        :disabled="disabled"
        @click="toggleOpen"
        @blur="() => { setTimeout(() => isOpen = false, 150) }"
      >
        <span v-if="!displayValue" class="opacity-40">{{ placeholder }}</span>
        <span v-else class="truncate">{{ displayValue }}</span>
      </button>

      <!-- Clear button -->
      <button
        v-if="clearable && displayValue && !disabled"
        type="button"
        class="absolute right-8 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 z-10"
        @click="clear"
        aria-label="Hapus pilihan"
      >
        <span class="i-tabler-x size-3.5" />
      </button>

      <!-- Chevron -->
      <span
        class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      >
        <span class="i-tabler-chevron-down size-4" />
      </span>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        class="absolute z-[60] mt-1 w-full rounded-xl border border-base-300 bg-base-100 shadow-lg overflow-hidden animate-scale-in origin-top"
      >
        <!-- Search input -->
        <div v-if="searchable" class="p-2">
          <input
            v-model="searchQuery"
            type="text"
            class="input input-sm input-bordered w-full text-xs"
            placeholder="Cari..."
            @click.stop
          />
        </div>

        <!-- Options -->
        <div class="max-h-60 overflow-y-auto">
          <template v-for="(group, gi) in groupedOptions" :key="gi">
            <!-- Group label -->
            <div
              v-if="group.label"
              class="px-3 pt-2 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-base-content/40"
            >
              {{ group.label }}
            </div>
            <!-- Options -->
            <button
              v-for="(opt, oi) in group.items"
              :key="oi"
              type="button"
              :class="[
                'w-full text-left px-3 py-2 text-sm hover:bg-base-200 transition-colors flex items-center gap-2',
                (typeof opt === 'string' ? opt : opt.value) === modelValue ? 'bg-primary/10 text-primary font-semibold' : '',
              ]"
              @mousedown.prevent="select(typeof opt === 'string' ? opt : opt.value)"
            >
              <span v-if="opt.icon" :class="[opt.icon, 'size-4 shrink-0']" />
              <span class="truncate">{{ typeof opt === 'string' ? opt : (opt.label || opt.value) }}</span>
              <span
                v-if="(typeof opt === 'string' ? opt : opt.value) === modelValue"
                class="ml-auto text-primary size-4 i-tabler-check"
              />
            </button>
          </template>
          <div
            v-if="!groupedOptions.length || (searchable && searchQuery && !groupedOptions.some(g => g.items.length))"
            class="px-3 py-6 text-center text-sm text-base-content/40"
          >
            Tidak ada pilihan
          </div>
        </div>
      </div>
    </div>

    <label v-if="error" class="label py-0.5">
      <span class="label-text-alt text-error">{{ error }}</span>
    </label>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
