<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Pasien' : 'Tambah Pasien Baru' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Nama Lengkap <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.fullName"
              type="text"
              placeholder="Masukkan nama lengkap"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.fullName }"
              required
            />
            <label v-if="errors.fullName" class="label">
              <span class="label-text-alt text-error">{{ errors.fullName }}</span>
            </label>
          </div>

          <!-- Email -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Email</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="email@example.com"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.email }"
            />
            <label v-if="errors.email" class="label">
              <span class="label-text-alt text-error">{{ errors.email }}</span>
            </label>
          </div>

          <!-- Phone -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">No. Telepon</span>
            </label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="08xxxxxxxxxx"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.phone }"
            />
            <label v-if="errors.phone" class="label">
              <span class="label-text-alt text-error">{{ errors.phone }}</span>
            </label>
          </div>

          <!-- Birth Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Lahir</span>
            </label>
            <input
              v-model="form.birthDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Sex -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Jenis Kelamin</span>
            </label>
            <select v-model="form.sex" class="select select-bordered w-full">
              <option value="">Pilih jenis kelamin</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>

          <!-- Education -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Pendidikan</span>
            </label>
            <select v-model="form.education" class="select select-bordered w-full">
              <option value="">Pilih pendidikan</option>
              <option value="SMA">SMA/SMK</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="D3">D3</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
            </select>
          </div>

          <!-- Occupation -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Pekerjaan</span>
            </label>
            <input
              v-model="form.occupation"
              type="text"
              placeholder="Masukkan pekerjaan"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Corporate -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Perusahaan/Instansi</span>
            </label>
            <input
              v-model="form.corporate"
              type="text"
              placeholder="Masukkan nama perusahaan/instansi"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Address -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Alamat</span>
            </label>
            <textarea
              v-model="form.address"
              placeholder="Masukkan alamat lengkap"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Notes -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Catatan</span>
            </label>
            <textarea
              v-model="form.notes"
              placeholder="Catatan tambahan (opsional)"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            {{ isEdit ? 'Simpan Perubahan' : 'Tambah Pasien' }}
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

const props = defineProps({
  patient: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

const modalRef = ref(null)

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  sex: '',
  address: '',
  education: '',
  occupation: '',
  corporate: '',
  notes: ''
}

const form = ref({ ...initialForm })
const errors = ref({})

const isEdit = computed(() => !!props.patient)

const resetForm = () => {
  form.value = { ...initialForm }
  errors.value = {}
}

// Watch for patient changes
watch(() => props.patient, (newPatient) => {
  if (newPatient) {
    form.value = {
      fullName: newPatient.fullName || newPatient.name || '',
      email: newPatient.email || '',
      phone: newPatient.phone || '',
      birthDate: newPatient.birthDate ? newPatient.birthDate.split('T')[0] : '',
      sex: newPatient.sex || '',
      address: newPatient.address || '',
      education: newPatient.personalData?.education || newPatient.education || '',
      occupation: newPatient.personalData?.occupation || newPatient.occupation || '',
      corporate: newPatient.personalData?.corporate || newPatient.corporate || '',
      notes: newPatient.personalData?.notes || newPatient.notes || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const validate = () => {
  errors.value = {}

  if (!form.value.fullName?.trim()) {
    errors.value.fullName = 'Nama wajib diisi'
  }

  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Format email tidak valid'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return
  
  // Build payload sesuai format backend
  const payload = {
    fullName: form.value.fullName,
    email: form.value.email || null,
    phone: form.value.phone || null,
    birthDate: form.value.birthDate || null,
    sex: form.value.sex || null,
    address: form.value.address || null,
    personalData: {
      education: form.value.education || '',
      occupation: form.value.occupation || '',
      corporate: form.value.corporate || '',
      notes: form.value.notes || ''
    }
  }
  
  emit('submit', payload)
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
