<script setup>
/**
 * DDateRangePicker — Minimal date range picker with preset shortcuts.
 *
 * Props:
 * - modelValue: { start: string, end: string } — date range object (YYYY-MM-DD)
 * - presets: Array<{ label, start, end }> — quick date range presets
 * - label: string — field label
 * - disabled: boolean
 */
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ start: '', end: '' }),
  },
  presets: {
    type: Array,
    default: () => [
      { label: 'Hari ini', start: () => new Date().toISOString().slice(0, 10), end: () => new Date().toISOString().slice(0, 10) },
      { label: '7 hari', start: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }, end: () => new Date().toISOString().slice(0, 10) },
      { label: '30 hari', start: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, end: () => new Date().toISOString().slice(0, 10) },
      { label: 'Bulan ini', start: () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }, end: () => new Date().toISOString().slice(0, 10) },
    ],
  },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

import { ref, computed } from 'vue'

const startDate = ref(props.modelValue?.start || '')
const endDate = ref(props.modelValue?.end || '')

const displayText = computed(() => {
  if (!startDate.value && !endDate.value) return 'Pilih rentang tanggal'
  if (startDate.value && !endDate.value) return startDate.value
  if (startDate.value && endDate.value) return `${startDate.value} — ${endDate.value}`
  return '—'
})

function applyPreset(preset) {
  const start = typeof preset.start === 'function' ? preset.start() : preset.start
  const end = typeof preset.end === 'function' ? preset.end() : preset.end
  startDate.value = start
  endDate.value = end
  emitModel()
}

function emitModel() {
  const range = {
    start: startDate.value,
    end: endDate.value,
  }
  emit('update:modelValue', range)
  emit('change', range)
}

function clearRange() {
  startDate.value = ''
  endDate.value = ''
  emitModel()
}
</script>

<template>
  <div class="form-control w-full">
    <label v-if="label" class="label py-1">
      <span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">{{ label }}</span>
    </label>

    <div class="dropdown dropdown-bottom">
      <!-- Trigger -->
      <div
        tabindex="0"
        role="button"
        :class="[
          'flex items-center gap-2 input input-bordered w-full text-sm cursor-pointer',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ]"
      >
        <span class="i-tabler-calendar size-4 text-base-content/40 shrink-0" />
        <span :class="(startDate && endDate) ? 'text-base-content' : 'text-base-content/40'">
          {{ displayText }}
        </span>
        <button
          v-if="startDate || endDate"
          class="ml-auto text-base-content/30 hover:text-base-content/60 shrink-0"
          @click.stop.prevent="clearRange"
        >
          <span class="i-tabler-x size-3.5" />
        </button>
      </div>

      <!-- Dropdown -->
      <div tabindex="0" class="dropdown-content z-50 mt-2 w-72 rounded-2xl border border-base-300 bg-base-100 shadow-xl p-3">
        <div class="flex gap-2 mb-3">
          <div class="flex-1">
            <label class="text-[0.6rem] font-bold uppercase tracking-wider text-base-content/40 mb-1 block">Mulai</label>
            <input
              v-model="startDate"
              type="date"
              class="input input-bordered input-sm w-full text-xs"
              @change="emitModel"
            />
          </div>
          <div class="flex-1">
            <label class="text-[0.6rem] font-bold uppercase tracking-wider text-base-content/40 mb-1 block">Selesai</label>
            <input
              v-model="endDate"
              type="date"
              class="input input-bordered input-sm w-full text-xs"
              @change="emitModel"
            />
          </div>
        </div>

        <!-- Presets -->
        <div class="border-t border-base-200 pt-2">
          <p class="text-[0.6rem] font-bold uppercase tracking-wider text-base-content/30 mb-1.5">Cepat</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in presets"
              :key="preset.label"
              type="button"
              class="btn btn-xs btn-ghost rounded-full text-xs"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
