<script setup>
/**
 * DSearchBar — Search input with filter button and category pills.
 *
 * Props:
 * - modelValue: string — v-model for search query
 * - placeholder: string
 * - filters: Array<{ key, label, active }> — category filter pills
 * - showFilterButton: boolean — toggle filter icon button
 * - loading: boolean
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Cari...' },
  filters: { type: Array, default: () => [] },
  showFilterButton: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'search', 'filter-click', 'filter-toggle'])

import { ref } from 'vue'

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onKeyEnter(e) {
  if (e.key === 'Enter') {
    emit('search', props.modelValue)
  }
}
</script>

<template>
  <div class="space-y-2.5">
    <!-- Search row -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30 pointer-events-none">
          <span v-if="loading" class="loading loading-spinner loading-xs" />
          <span v-else class="i-tabler-search size-4" />
        </span>
        <input
          type="text"
          :value="modelValue"
          :placeholder="placeholder"
          class="input input-bordered w-full pl-10 pr-4 text-sm"
          @input="onInput"
          @keydown="onKeyEnter"
        />
        <button
          v-if="modelValue"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60"
          @click="emit('update:modelValue', ''); emit('search', '')"
        >
          <span class="i-tabler-x size-4" />
        </button>
      </div>

      <DButton
        v-if="showFilterButton"
        variant="ghost"
        size="sm"
        icon-only
        :icon-left="'i-tabler-filter'"
        @click="emit('filter-click')"
      />
    </div>

    <!-- Category pills -->
    <div v-if="filters.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="filter in filters"
        :key="filter.key"
        type="button"
        :class="[
          'btn btn-xs rounded-full px-3 text-xs font-medium transition-colors',
          filter.active
            ? 'btn-primary'
            : 'btn-ghost border-base-300',
        ]"
        @click="emit('filter-toggle', filter.key)"
      >
        {{ filter.label }}
      </button>
    </div>
  </div>
</template>
