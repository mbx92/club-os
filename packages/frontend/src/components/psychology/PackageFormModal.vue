<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Paket Tes' : 'Tambah Paket Baru' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Paket -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Paket <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Complete Personality Assessment"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.name }"
              required
            />
            <label v-if="errors.name" class="label">
              <span class="label-text-alt text-error">{{ errors.name }}</span>
            </label>
          </div>

          <!-- Kode Paket -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Kode Paket <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.code"
              type="text"
              placeholder="Contoh: PKT-001"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.code }"
              required
            />
            <label v-if="errors.code" class="label">
              <span class="label-text-alt text-error">{{ errors.code }}</span>
            </label>
          </div>

          <!-- Deskripsi -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Deskripsi</span>
            </label>
            <textarea
              v-model="form.description"
              placeholder="Deskripsi paket tes"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Package Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tipe Paket <span class="text-error">*</span></span>
            </label>
            <select 
              v-model="form.packageType" 
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.packageType }"
            >
              <option value="single">Single Test</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>

          <!-- Validity Days -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Masa Berlaku (Hari)</span>
            </label>
            <input
              v-model.number="form.validityDays"
              type="number"
              min="1"
              placeholder="7"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Base Price -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Harga Dasar <span class="text-error">*</span></span>
            </label>
            <div class="join w-full">
              <span class="btn join-item btn-disabled">Rp</span>
              <CurrencyInput
                v-model="form.basePrice"
                :min="0"
                placeholder="150000"
                :input-class="errors.basePrice ? 'input input-bordered join-item w-full input-error' : 'input input-bordered join-item w-full'"
              />
            </div>
            <label v-if="errors.basePrice" class="label">
              <span class="label-text-alt text-error">{{ errors.basePrice }}</span>
            </label>
          </div>

          <!-- Discount Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tipe Diskon</span>
            </label>
            <select v-model="form.discountType" class="select select-bordered w-full">
              <option value="none">Tanpa Diskon</option>
              <option value="percentage">Persentase (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </div>

          <!-- Discount Value -->
          <div class="form-control" v-if="form.discountType !== 'none'">
            <label class="label">
              <span class="label-text font-medium">
                {{ form.discountType === 'percentage' ? 'Diskon (%)' : 'Diskon (Rp)' }}
              </span>
            </label>
            <div class="join w-full">
              <span v-if="form.discountType === 'fixed'" class="btn join-item btn-disabled">Rp</span>
              <CurrencyInput
                v-if="form.discountType === 'fixed'"
                v-model="form.discountValue"
                :min="0"
                placeholder="50000"
                input-class="input input-bordered join-item w-full"
              />
              <input
                v-else
                v-model.number="form.discountValue"
                type="number"
                min="0"
                max="100"
                placeholder="10"
                class="input input-bordered join-item w-full"
              />
              <span v-if="form.discountType === 'percentage'" class="btn join-item btn-disabled">%</span>
            </div>
            <label v-if="finalPrice > 0" class="label">
              <span class="label-text-alt text-success">
                Harga Akhir: {{ formatPriceLocal(finalPrice) }}
              </span>
            </label>
          </div>

          <!-- Test Types -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">
                Jenis Tes <span class="text-error">*</span>
                <span v-if="form.packageType === 'single'" class="text-sm text-base-content/60 font-normal ml-2">
                  (Pilih 1 tes saja)
                </span>
              </span>
            </label>
            <div class="border border-base-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div v-if="testTypes.length === 0" class="text-center text-base-content/60 py-4">
                Tidak ada jenis tes tersedia
              </div>
              <div v-else class="space-y-2">
                <label 
                  v-for="testType in testTypes" 
                  :key="testType.id"
                  class="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer"
                >
                  <!-- Radio for single test, checkbox for bundle -->
                  <template v-if="form.packageType === 'single'">
                    <input
                      type="radio"
                      :value="testType.id"
                      :checked="form.testTypeIds[0] === testType.id"
                      @change="handleSingleTestSelect(testType.id)"
                      class="radio radio-primary"
                    />
                  </template>
                  <template v-else>
                    <input
                      type="checkbox"
                      :value="testType.id"
                      v-model="form.testTypeIds"
                      class="checkbox checkbox-primary"
                    />
                  </template>
                  <div class="flex-1">
                    <div class="font-medium">{{ testType.name }}</div>
                    <div class="text-sm text-base-content/60">
                      {{ testType.code }} • {{ testType.questionCount }} soal • {{ testType.estimatedDuration }} menit
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <label v-if="errors.testTypeIds" class="label">
              <span class="label-text-alt text-error">{{ errors.testTypeIds }}</span>
            </label>
          </div>

          <!-- Is Active -->
          <div class="form-control md:col-span-2">
            <label class="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                v-model="form.isActive"
                class="toggle toggle-primary"
              />
              <span class="label-text font-medium">Paket Aktif</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            {{ isEdit ? 'Simpan Perubahan' : 'Tambah Paket' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  packageData: {
    type: Object,
    default: null
  },
  testTypes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

const modalRef = ref(null)

const initialForm = {
  name: '',
  code: '',
  description: '',
  packageType: 'single',
  basePrice: null,
  discountType: 'none',
  discountValue: 0,
  testTypeIds: [],
  validityDays: 7,
  isActive: true
}

const form = ref({ ...initialForm })
const errors = ref({})

const isEdit = computed(() => !!props.packageData)

// Calculate final price based on discount
const finalPrice = computed(() => {
  if (!form.value.basePrice) return 0
  if (form.value.discountType === 'none' || !form.value.discountValue) {
    return form.value.basePrice
  }
  if (form.value.discountType === 'percentage') {
    return form.value.basePrice * (1 - form.value.discountValue / 100)
  }
  // fixed discount
  return Math.max(0, form.value.basePrice - form.value.discountValue)
})

const formatPriceLocal = (price) => {
  if (!price && price !== 0) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const resetForm = () => {
  form.value = { ...initialForm, testTypeIds: [] }
  errors.value = {}
}

// Handle single test selection (radio button behavior)
const handleSingleTestSelect = (testTypeId) => {
  form.value.testTypeIds = [testTypeId]
}

// Watch for packageType changes - reset testTypeIds if switching types
watch(() => form.value.packageType, (newType, oldType) => {
  if (oldType && newType !== oldType) {
    // When switching from bundle to single, keep only first test
    if (newType === 'single' && form.value.testTypeIds.length > 1) {
      form.value.testTypeIds = [form.value.testTypeIds[0]]
    }
  }
})

// Watch for package changes
watch(() => props.packageData, (newPackage) => {
  if (newPackage) {
    form.value = {
      name: newPackage.name || '',
      code: newPackage.code || '',
      description: newPackage.description || '',
      packageType: newPackage.packageType || 'single',
      basePrice: parseFloat(newPackage.basePrice) || null,
      discountType: newPackage.discountType || 'none',
      discountValue: parseFloat(newPackage.discountValue) || 0,
      testTypeIds: newPackage.items?.map(item => item.testTypeId) || [],
      validityDays: newPackage.validityDays || 7,
      isActive: newPackage.isActive ?? true
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const validate = () => {
  errors.value = {}

  if (!form.value.name?.trim()) {
    errors.value.name = 'Nama paket wajib diisi'
  }

  if (!form.value.code?.trim()) {
    errors.value.code = 'Kode paket wajib diisi'
  }

  if (!form.value.basePrice || form.value.basePrice <= 0) {
    errors.value.basePrice = 'Harga harus lebih dari 0'
  }

  if (!form.value.testTypeIds?.length) {
    errors.value.testTypeIds = 'Pilih minimal 1 jenis tes'
  } else if (form.value.packageType === 'single' && form.value.testTypeIds.length > 1) {
    errors.value.testTypeIds = 'Single test hanya boleh memilih 1 jenis tes'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return
  
  const data = {
    name: form.value.name,
    code: form.value.code,
    description: form.value.description,
    packageType: form.value.packageType,
    basePrice: form.value.basePrice,
    discountType: form.value.discountType,
    discountValue: form.value.discountValue || 0,
    testTypeIds: form.value.testTypeIds,
    validityDays: form.value.validityDays,
    isActive: form.value.isActive
  }
  
  emit('submit', data)
}

const openModal = () => {
  modalRef.value?.showModal()
}

const closeModal = () => {
  modalRef.value?.close()
  emit('close')
}

defineExpose({
  openModal,
  closeModal,
  resetForm
})
</script>
