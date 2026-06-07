<template>
  <div class="overflow-x-auto">
    <table class="table" :class="tableClass">
      <thead>
        <tr>
          <th 
            v-for="column in columns" 
            :key="column.key"
            :class="column.headerClass"
            :style="column.width ? { width: column.width } : {}"
          >
            {{ column.label }}
          </th>
          <th v-if="hasActions">Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="getRowKey(row, index)">
          <td 
            v-for="column in columns" 
            :key="column.key"
            :class="column.cellClass"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="getValue(row, column.key)" :index="index">
              <template v-if="column.format === 'currency'">
                {{ formatCurrency(getValue(row, column.key)) }}
              </template>
              <template v-else-if="column.format === 'date'">
                {{ formatDate(getValue(row, column.key)) }}
              </template>
              <template v-else-if="column.format === 'number'">
                {{ formatNumber(getValue(row, column.key)) }}
              </template>
              <template v-else>
                {{ getValue(row, column.key) || column.default || '-' }}
              </template>
            </slot>
          </td>
          <td v-if="hasActions">
            <slot name="actions" :row="row" :index="index">
              <div class="flex gap-1">
                <button 
                  v-if="showView"
                  class="btn btn-ghost btn-xs"
                  @click="$emit('view', row)"
                >
                  <IconEye class="w-4 h-4" />
                </button>
                <button 
                  v-if="showEdit"
                  class="btn btn-ghost btn-xs"
                  @click="$emit('edit', row)"
                >
                  <IconEdit class="w-4 h-4" />
                </button>
                <button 
                  v-if="showDelete"
                  class="btn btn-ghost btn-xs text-error"
                  @click="$emit('delete', row)"
                >
                  <IconTrash class="w-4 h-4" />
                </button>
              </div>
            </slot>
          </td>
        </tr>
        <tr v-if="data.length === 0">
          <td :colspan="columns.length + (hasActions ? 1 : 0)" class="text-center py-8 text-base-content/60">
            <slot name="empty">
              {{ emptyText }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div v-if="showPagination && pagination.totalPages > 1" class="flex justify-center mt-4">
    <div class="join">
      <button 
        class="join-item btn btn-sm"
        :disabled="pagination.page <= 1"
        @click="$emit('page-change', pagination.page - 1)"
      >
        «
      </button>
      <button class="join-item btn btn-sm">
        Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
      </button>
      <button 
        class="join-item btn btn-sm"
        :disabled="pagination.page >= pagination.totalPages"
        @click="$emit('page-change', pagination.page + 1)"
      >
        »
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IconEye, IconEdit, IconTrash } from '@tabler/icons-vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
    // { key: string, label: string, format?: string, width?: string, headerClass?: string, cellClass?: string, default?: string }
  },
  data: {
    type: Array,
    default: () => []
  },
  rowKey: {
    type: String,
    default: 'id'
  },
  tableClass: {
    type: String,
    default: 'table-zebra'
  },
  emptyText: {
    type: String,
    default: 'Tidak ada data'
  },
  pagination: {
    type: Object,
    default: () => ({ page: 1, totalPages: 1 })
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  showView: {
    type: Boolean,
    default: true
  },
  showEdit: {
    type: Boolean,
    default: true
  },
  showDelete: {
    type: Boolean,
    default: true
  }
})

defineEmits(['view', 'edit', 'delete', 'page-change'])

const hasActions = computed(() => {
  return props.showView || props.showEdit || props.showDelete
})

const getRowKey = (row, index) => {
  return row[props.rowKey] || index
}

const getValue = (row, key) => {
  // Support nested keys like 'category.name'
  return key.split('.').reduce((obj, k) => obj?.[k], row)
}

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('id-ID').format(num)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>
