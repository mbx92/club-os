<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-lg">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Dana Modal' : 'Buat Dana Modal Baru' }}
      </h3>

      <div class="space-y-4">
        <!-- Nama Dana -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Nama Dana <span class="text-error">*</span></span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="Contoh: Modal Awal Kasir"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.name }"
          />
          <label v-if="errors.name" class="label">
            <span class="label-text-alt text-error">{{ errors.name }}</span>
          </label>
        </div>

        <!-- Jumlah Awal (hanya saat create) -->
        <div v-if="!isEdit" class="form-control">
          <label class="label">
            <span class="label-text font-medium">Jumlah Modal Awal <span class="text-error">*</span></span>
          </label>
          <CurrencyInput
            v-model="formData.initialAmount"
            placeholder="0"
            :input-class="errors.initialAmount ? 'input input-bordered w-full input-error' : 'input input-bordered w-full'"
          />
          <label v-if="errors.initialAmount" class="label">
            <span class="label-text-alt text-error">{{ errors.initialAmount }}</span>
          </label>
        </div>

        <!-- Fund Source (hanya saat create) -->
        <div v-if="!isEdit" class="form-control">
          <label class="label">
            <span class="label-text font-medium">Sumber Dana</span>
          </label>
          <select v-model="formData.fundSource" class="select select-bordered w-full">
            <option value="owner_cash">Uang Tunai Owner / Kas Fisik</option>
            <option value="bank_transfer">Transfer Bank</option>
            <option value="revenue">Dari Pendapatan (Revenue)</option>
            <option value="other">Lainnya</option>
          </select>
          <label class="label">
            <span v-if="formData.fundSource === 'revenue'" class="label-text-alt text-warning">
              Dana dari revenue akan otomatis membuat Expense "Modal Petty Cash" dan mengurangi cashflow
            </span>
            <span v-else class="label-text-alt text-base-content/50">
              owner_cash / bank_transfer tidak mempengaruhi cashflow operasional
            </span>
          </label>
        </div>

        <!-- Status (hanya saat edit) -->
        <div v-if="isEdit" class="form-control">
          <label class="label">
            <span class="label-text font-medium">Status</span>
          </label>
          <select v-model="formData.status" class="select select-bordered w-full">
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
            <option value="closed">Tutup</option>
          </select>
        </div>

        <!-- Deskripsi -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Deskripsi</span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Keterangan tambahan (opsional)"
          ></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="close">Batal</button>
        <button
          class="btn btn-primary"
          :class="{ loading: loading }"
          :disabled="loading"
          @click="handleSubmit"
        >
          {{ isEdit ? 'Simpan' : 'Buat Dana' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const modalRef = ref(null)
const errors = ref({})
const currentFund = ref(null)

const formData = ref({
  name: '',
  description: '',
  initialAmount: 0,
  fundSource: 'owner_cash',
  status: 'active',
})

const isEdit = computed(() => !!currentFund.value)

const validate = () => {
  errors.value = {}
  if (!formData.value.name?.trim()) {
    errors.value.name = 'Nama dana wajib diisi'
  }
  if (!isEdit.value && (formData.value.initialAmount === '' || formData.value.initialAmount === null || formData.value.initialAmount < 0)) {
    errors.value.initialAmount = 'Jumlah modal awal wajib diisi (minimal 0)'
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return

  const data = { name: formData.value.name.trim() }
  if (formData.value.description) data.description = formData.value.description.trim()

  if (isEdit.value) {
    data.status = formData.value.status
  } else {
    data.initialAmount = formData.value.initialAmount
    if (formData.value.fundSource) data.fundSource = formData.value.fundSource
  }

  emit('submit', data)
}

const open = (fund = null) => {
  currentFund.value = fund
  errors.value = {}
  if (fund) {
    formData.value = {
      name: fund.name || '',
      description: fund.description || '',
      initialAmount: parseFloat(fund.initialAmount) || 0,
      fundSource: 'owner_cash',
      status: fund.status || 'active',
    }
  } else {
    formData.value = { name: '', description: '', initialAmount: 0, fundSource: 'owner_cash', status: 'active' }
  }
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
}

defineExpose({ open, close })
</script>
