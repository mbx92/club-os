<script setup>
import { ref, watch, computed } from 'vue'
import { IconDeviceFloppy, IconX } from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  },
  tables: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const selectedTableId = ref('')

const availableTables = computed(() => {
  // Only show available tables in the same location (or all if not filtered)
  // that have actual tableNumber/valid ID
  return props.tables.filter(t => t.status !== 'occupied' && t.isActive !== false)
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedTableId.value = ''
  }
})

const isValid = computed(() => {
  return selectedTableId.value && selectedTableId.value !== props.order?.tableId
})

const handleSubmit = () => {
  if (!isValid.value) return
  emit('submit', selectedTableId.value)
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">Pindah Meja</h3>
          <button class="btn btn-sm btn-circle btn-ghost" @click="handleClose">
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <div class="mb-4 text-sm text-base-content/70">
          <p>Memindahkan pesanan <strong>#{{ order?.transactionNumber || 'Loading...' }}</strong></p>
          <p>Dari meja: <strong>{{ order?.table?.tableNumber || '?' }}</strong></p>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Pilih Meja Tujuan</span>
          </label>
          <select v-model="selectedTableId" class="select select-bordered w-full">
            <option value="" disabled>Pilih Meja Tersedia</option>
            <option v-for="table in availableTables" :key="table.id" :value="table.id">
              {{ table.tableNumber }} (Kapasitas: {{ table.capacity }} pax) - {{ table.location?.name || '' }}
            </option>
          </select>
          <label v-if="availableTables.length === 0" class="label">
            <span class="label-text-alt text-error">Tidak ada meja lain yang tersedia.</span>
          </label>
        </div>

        <div class="modal-action mt-6">
          <button type="button" class="btn btn-ghost" @click="handleClose" :disabled="loading">Batal</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="handleSubmit" 
            :disabled="!isValid || loading"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            <span v-else>Pindah Meja</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="handleClose">
        <button>close</button>
      </form>
    </dialog>
  </teleport>
</template>
