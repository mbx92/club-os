<script setup>
/**
 * DDataTable — Full-featured data table with sorting, row selection, pagination, column visibility, and export.
 *
 * Props:
 * - columns: Array<{ key, label, sortable?, width?, align?, hidden? }>
 * - rows: Array<object> — data rows
 * - selectable: boolean — enable row checkbox selection
 * - selectedRows: Array — v-model of selected row IDs
 * - sortBy: string — current sort column key
 * - sortDir: 'asc' | 'desc'
 * - loading: boolean
 * - emptyTitle / emptyDescription: strings for empty state
 * - pagination: { page, perPage, total, perPageOptions }
 * - stickyHeader: boolean
 * - exportFormats: Array<'csv'|'pdf'|'excel'>
 * - showColumnToggle: boolean
 * - rowActions: Array<{ label, icon, action, confirm?, color? }>
 *
 * Events: @sort, @select, @row-action, @page-change, @per-page-change, @export
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  selectable: { type: Boolean, default: false },
  selectedRows: { type: Array, default: () => [] },
  sortBy: { type: String, default: '' },
  sortDir: {
    type: String,
    default: 'asc',
    validator: (v) => ['asc', 'desc'].includes(v),
  },
  loading: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'Tidak ada data' },
  emptyDescription: { type: String, default: 'Belum ada data yang tersedia untuk ditampilkan.' },
  pagination: {
    type: Object,
    default: () => ({ page: 1, perPage: 10, total: 0, perPageOptions: [5, 10, 25, 50, 100] }),
  },
  stickyHeader: { type: Boolean, default: false },
  exportFormats: { type: Array, default: () => ['csv', 'excel'] },
  showColumnToggle: { type: Boolean, default: false },
  rowActions: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'sort',
  'update:selectedRows',
  'row-action',
  'page-change',
  'per-page-change',
  'export',
])

import { ref, computed } from 'vue'

const visibleColumns = ref(props.columns.filter((c) => !c.hidden))
const showColumnMenu = ref(false)

const allSelected = computed(() => {
  return props.rows.length > 0 && props.rows.every((r) => props.selectedRows.includes(r.id))
})

const someSelected = computed(() => {
  return props.selectedRows.length > 0 && !allSelected.value
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil((props.pagination.total || 0) / props.pagination.perPage))
})

const pages = computed(() => {
  const current = props.pagination.page
  const total = totalPages.value
  const pages = []
  const delta = 2
  const left = Math.max(1, current - delta)
  const right = Math.min(total, current + delta)

  if (left > 1) pages.push(1)
  if (left > 2) pages.push('...')

  for (let i = left; i <= right; i++) {
    pages.push(i)
  }

  if (right < total - 1) pages.push('...')
  if (right < total) pages.push(total)

  return pages
})

function toggleSelectAll() {
  if (allSelected.value) {
    emit('update:selectedRows', [])
  } else {
    emit('update:selectedRows', props.rows.map((r) => r.id))
  }
}

function toggleRow(id) {
  const current = [...props.selectedRows]
  const idx = current.indexOf(id)
  if (idx === -1) {
    current.push(id)
  } else {
    current.splice(idx, 1)
  }
  emit('update:selectedRows', current)
}

function onSort(col) {
  if (!col.sortable) return
  const newDir = props.sortBy === col.key && props.sortDir === 'asc' ? 'desc' : 'asc'
  emit('sort', { key: col.key, dir: newDir })
}

function onPageChange(page) {
  if (page === '...' || page < 1 || page > totalPages.value) return
  emit('page-change', page)
}

function toggleColumnVisibility(col) {
  const idx = visibleColumns.value.findIndex((c) => c.key === col.key)
  if (idx === -1) {
    visibleColumns.value = [...visibleColumns.value, col]
  } else {
    visibleColumns.value = visibleColumns.value.filter((c) => c.key !== col.key)
  }
}

const startRow = computed(() => (props.pagination.page - 1) * props.pagination.perPage + 1)
const endRow = computed(() => Math.min(props.pagination.page * props.pagination.perPage, props.pagination.total))
</script>

<template>
  <div class="w-full">
    <!-- Toolbar -->
    <div v-if="showColumnToggle || exportFormats.length || selectable" class="flex items-center gap-2 mb-3">
      <!-- Selected count -->
      <span v-if="selectable && selectedRows.length" class="text-sm text-base-content/60">
        {{ selectedRows.length }} terpilih
      </span>

      <div class="flex-1" />

      <!-- Column visibility -->
      <div v-if="showColumnToggle" class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost btn-sm gap-1.5 text-xs">
          <span class="i-tabler-columns size-3.5" />
          Kolom
        </label>
        <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-xl bg-base-100 rounded-xl border border-base-300 w-48 mt-1">
          <li v-for="col in columns" :key="col.key">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                :checked="visibleColumns.some((c) => c.key === col.key)"
                class="checkbox checkbox-xs checkbox-primary"
                @change="toggleColumnVisibility(col)"
              />
              <span class="text-xs">{{ col.label }}</span>
            </label>
          </li>
        </ul>
      </div>

      <!-- Export -->
      <div v-if="exportFormats.length" class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost btn-sm gap-1.5 text-xs">
          <span class="i-tabler-file-download size-3.5" />
          Export
        </label>
        <ul tabindex="0" class="dropdown-content z-50 menu p-1 shadow-xl bg-base-100 rounded-xl border border-base-300 w-36 mt-1">
          <li v-for="fmt in exportFormats" :key="fmt">
            <button class="text-xs" @click="emit('export', fmt)">
              <span :class="fmt === 'csv' ? 'i-tabler-file-type-csv' : fmt === 'pdf' ? 'i-tabler-file-type-pdf' : 'i-tabler-file-spreadsheet'" class="size-3.5" />
              {{ fmt.toUpperCase() }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Table wrapper -->
    <div class="overflow-x-auto rounded-xl border border-base-300">
      <table class="table table-zebra w-full">
        <!-- Header -->
        <thead :class="stickyHeader ? 'sticky top-0 z-10' : ''">
          <tr>
            <!-- Select all checkbox -->
            <th v-if="selectable" class="w-10">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                class="checkbox checkbox-sm checkbox-primary"
                @change="toggleSelectAll"
              />
            </th>
            <!-- Column headers -->
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              :class="[
                'text-xs font-bold uppercase tracking-wider',
                col.sortable ? 'cursor-pointer select-none hover:text-base-content/80' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
              :style="col.width ? { width: col.width } : {}"
              @click="onSort(col)"
            >
              <div class="flex items-center gap-1" :class="col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''">
                {{ col.label }}
                <span
                  v-if="col.sortable && sortBy === col.key"
                  class="i-tabler-chevron-up size-3 transition-transform duration-200"
                  :class="{ 'rotate-180': sortDir === 'desc' }"
                />
              </div>
            </th>
            <!-- Actions column -->
            <th v-if="rowActions.length" class="w-0 text-xs font-bold uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in pagination.perPage" :key="'skel-' + i">
              <td v-if="selectable"><div class="skeleton size-5 rounded" /></td>
              <td v-for="col in visibleColumns" :key="col.key">
                <div class="skeleton h-4 w-full rounded" />
              </td>
              <td v-if="rowActions.length"><div class="skeleton h-4 w-12 rounded" /></td>
            </tr>
          </template>

          <!-- Empty state -->
          <tr v-else-if="!rows.length">
            <td :colspan="visibleColumns.length + (selectable ? 1 : 0) + (rowActions.length ? 1 : 0)">
              <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div class="size-16 rounded-2xl bg-base-200 flex items-center justify-center text-base-content/20 mb-3">
                  <span class="i-tabler-database-off size-8" />
                </div>
                <h3 class="text-base font-semibold text-base-content/50">{{ emptyTitle }}</h3>
                <p class="text-sm text-base-content/30 mt-1 max-w-xs">{{ emptyDescription }}</p>
              </div>
            </td>
          </tr>

          <!-- Data rows -->
          <tr
            v-for="row in rows"
            v-else
            :key="row.id"
            :class="{ 'bg-primary/5': selectedRows.includes(row.id) }"
          >
            <td v-if="selectable" class="w-10">
              <input
                type="checkbox"
                :checked="selectedRows.includes(row.id)"
                class="checkbox checkbox-sm checkbox-primary"
                @change="toggleRow(row.id)"
              />
            </td>
            <td
              v-for="col in visibleColumns"
              :key="col.key"
              :class="[
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
              ]"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :column="col">
                <span class="text-sm">{{ row[col.key] ?? '—' }}</span>
              </slot>
            </td>
            <!-- Row actions -->
            <td v-if="rowActions.length" class="w-0">
              <div class="flex items-center gap-0.5">
                <button
                  v-for="(action, ai) in rowActions"
                  :key="ai"
                  :class="[
                    'btn btn-ghost btn-xs btn-circle',
                    action.color === 'error' ? 'text-error hover:bg-error/10' : 'text-base-content/40 hover:text-base-content/70',
                  ]"
                  :title="action.label"
                  @click="emit('row-action', { action: action.action, row, confirm: action.confirm })"
                >
                  <span :class="[action.icon, 'size-4']" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.total > 0" class="flex flex-wrap items-center justify-between gap-4 mt-3">
      <!-- Info -->
      <div class="text-xs text-base-content/40">
        Menampilkan <span class="font-semibold text-base-content/60">{{ startRow }}–{{ endRow }}</span>
        dari <span class="font-semibold text-base-content/60">{{ pagination.total.toLocaleString('id-ID') }}</span> data
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <!-- Per page -->
        <div class="flex items-center gap-1.5 text-xs text-base-content/40">
          <span>Tampilkan</span>
          <select
            :value="pagination.perPage"
            class="select select-bordered select-xs w-16 text-xs"
            @change="emit('per-page-change', Number($event.target.value))"
          >
            <option v-for="opt in pagination.perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <!-- Page buttons -->
        <div class="join">
          <button
            class="join-item btn btn-sm btn-ghost px-2"
            :disabled="pagination.page <= 1"
            @click="onPageChange(pagination.page - 1)"
          >
            <span class="i-tabler-chevron-left size-4" />
          </button>
          <button
            v-for="page in pages"
            :key="page"
            :class="[
              'join-item btn btn-sm px-3',
              page === pagination.page ? 'btn-primary' : 'btn-ghost',
              page === '...' ? 'btn-disabled' : '',
            ]"
            @click="onPageChange(page)"
          >
            {{ page }}
          </button>
          <button
            class="join-item btn btn-sm btn-ghost px-2"
            :disabled="pagination.page >= totalPages"
            @click="onPageChange(pagination.page + 1)"
          >
            <span class="i-tabler-chevron-right size-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
