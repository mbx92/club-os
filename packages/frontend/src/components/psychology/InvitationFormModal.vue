<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Undangan' : 'Buat Undangan Baru' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Invitation Type Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tipe Undangan <span class="text-error">*</span></span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label class="label cursor-pointer gap-2 px-4 py-2 border rounded-lg" :class="{ 'border-primary bg-primary/10': form.invitationType === 'open_registration' }">
                <input 
                  v-model="form.invitationType" 
                  type="radio" 
                  name="invitationType" 
                  value="open_registration" 
                  class="radio radio-primary radio-sm"
                  :disabled="isEdit"
                />
                <span class="label-text">Registrasi Terbuka</span>
              </label>
              <label class="label cursor-pointer gap-2 px-4 py-2 border rounded-lg" :class="{ 'border-primary bg-primary/10': form.invitationType === 'single_patient' }">
                <input 
                  v-model="form.invitationType" 
                  type="radio" 
                  name="invitationType" 
                  value="single_patient" 
                  class="radio radio-primary radio-sm"
                  :disabled="isEdit"
                />
                <span class="label-text">Pasien Tunggal</span>
              </label>
            </div>
          </div>

          <!-- Invitation Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Undangan</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Rekrutmen Batch Desember 2025"
              class="input input-bordered w-full"
            />
            <label class="label">
              <span class="label-text-alt">Opsional - untuk identifikasi undangan</span>
            </label>
          </div>

          <!-- Description -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Deskripsi</span>
            </label>
            <textarea
              v-model="form.description"
              placeholder="Deskripsi singkat tentang undangan ini"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Welcome Message -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Pesan Selamat Datang</span>
            </label>
            <textarea
              v-model="form.welcomeMessage"
              placeholder="Pesan yang akan ditampilkan kepada peserta saat membuka undangan"
              class="textarea textarea-bordered w-full"
              rows="3"
            ></textarea>
          </div>

          <!-- Package Selection (for open_registration type) -->
          <div v-if="form.invitationType === 'open_registration'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Paket Tes <span class="text-error">*</span></span>
            </label>
            <div class="flex gap-2 mb-2">
              <label class="label cursor-pointer gap-2">
                <input 
                  v-model="form.packageTypeFilter" 
                  type="radio" 
                  value="bundle" 
                  class="radio radio-sm"
                />
                <span class="label-text">Paket Bundle</span>
              </label>
              <label class="label cursor-pointer gap-2">
                <input 
                  v-model="form.packageTypeFilter" 
                  type="radio" 
                  value="single" 
                  class="radio radio-sm"
                />
                <span class="label-text">Paket Single Test</span>
              </label>
            </div>
            <select 
              v-model="form.packageId" 
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.packageId }"
              :disabled="isEdit"
            >
              <option value="">Pilih paket tes</option>
              <option 
                v-for="pkg in filteredPackages" 
                :key="pkg.id" 
                :value="pkg.id"
              >
                {{ pkg.name }} - {{ formatPrice(pkg.finalPrice) }}
              </option>
            </select>
            <label v-if="errors.packageId" class="label">
              <span class="label-text-alt text-error">{{ errors.packageId }}</span>
            </label>
          </div>

          <!-- Patient Selection (for single_patient type) -->
          <div v-if="form.invitationType === 'single_patient'" class="space-y-4">
            <!-- Patient Search/Select -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Pasien <span class="text-error">*</span></span>
              </label>
              <div class="relative">
                <input 
                  v-model="patientSearch"
                  type="text" 
                  placeholder="Cari nama atau email pasien..."
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.patientId }"
                  :disabled="isEdit"
                  @input="searchPatient"
                  @focus="showPatientDropdown = true"
                />
                <!-- Patient Dropdown -->
                <div 
                  v-if="showPatientDropdown && filteredPatients.length > 0" 
                  class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  <button
                    v-for="p in filteredPatients"
                    :key="p.id"
                    type="button"
                    class="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                    @click="selectPatient(p)"
                  >
                    <div class="font-medium">{{ p.name }}</div>
                    <div class="text-sm text-base-content/60">{{ p.email }} • {{ p.phone }}</div>
                  </button>
                </div>
              </div>
              <!-- Selected Patient Display -->
              <div v-if="selectedPatient" class="mt-2 p-3 bg-base-200 rounded-lg flex items-center justify-between">
                <div>
                  <div class="font-medium">{{ selectedPatient.name }}</div>
                  <div class="text-sm text-base-content/60">{{ selectedPatient.email }}</div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm btn-circle" @click="clearPatient">
                  ✕
                </button>
              </div>
              <label v-if="errors.patientId" class="label">
                <span class="label-text-alt text-error">{{ errors.patientId }}</span>
              </label>
            </div>

            <!-- Test/Package for Patient -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Pilih Tes/Paket <span class="text-error">*</span></span>
              </label>
              <div class="flex gap-2 mb-2">
                <label class="label cursor-pointer gap-2">
                  <input 
                    v-model="form.patientTestType" 
                    type="radio" 
                    value="bundle" 
                    class="radio radio-sm"
                    :disabled="isEdit"
                  />
                  <span class="label-text">Paket Bundle</span>
                </label>
                <label class="label cursor-pointer gap-2">
                  <input 
                    v-model="form.patientTestType" 
                    type="radio" 
                    value="single" 
                    class="radio radio-sm"
                    :disabled="isEdit"
                  />
                  <span class="label-text">Paket Single Test</span>
                </label>
              </div>
              <select 
                v-if="form.patientTestType === 'bundle'"
                v-model="form.packageId" 
                class="select select-bordered w-full"
                :class="{ 'select-error': errors.packageId }"
                :disabled="isEdit"
              >
                <option value="">Pilih paket bundle</option>
                <option 
                  v-for="pkg in bundlePackages" 
                  :key="pkg.id" 
                  :value="pkg.id"
                >
                  {{ pkg.name }} - {{ formatPrice(pkg.finalPrice) }}
                </option>
              </select>
              <select 
                v-else
                v-model="form.packageId" 
                class="select select-bordered w-full"
                :class="{ 'select-error': errors.packageId }"
                :disabled="isEdit"
              >
                <option value="">Pilih paket single test</option>
                <option 
                  v-for="pkg in singlePackages" 
                  :key="pkg.id" 
                  :value="pkg.id"
                >
                  {{ pkg.name }} - {{ formatPrice(pkg.finalPrice) }}
                </option>
              </select>
              <label v-if="errors.packageId" class="label">
                <span class="label-text-alt text-error">{{ errors.packageId }}</span>
              </label>
            </div>
          </div>

          <!-- Max Uses -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Maksimal Penggunaan</span>
              <span v-if="form.invitationType !== 'single_patient'" class="label-text-alt">Kosongkan untuk unlimited</span>
              <span v-else class="label-text-alt">1 penggunaan untuk pasien tunggal</span>
            </label>
            <input
              v-model.number="form.maxUses"
              type="number"
              min="1"
              placeholder="50"
              class="input input-bordered w-full"
              :disabled="form.invitationType === 'single_patient'"
            />
          </div>

          <!-- Expires At -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Kadaluarsa <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.expiresAt"
              type="datetime-local"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.expiresAt }"
            />
            <label v-if="errors.expiresAt" class="label">
              <span class="label-text-alt text-error">{{ errors.expiresAt }}</span>
            </label>
          </div>

          <!-- Test Expiry Hours -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Batas Waktu Pengerjaan (Jam)</span>
              <span class="label-text-alt">Setelah registrasi</span>
            </label>
            <input
              v-model.number="form.testExpiryHours"
              type="number"
              min="1"
              placeholder="48"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Notes -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Catatan</span>
            </label>
            <textarea
              v-model="form.notes"
              placeholder="Contoh: Recruitment batch Desember 2025"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Info Box -->
          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm">
                Setelah undangan dibuat, Anda akan mendapatkan link yang dapat dibagikan ke peserta.
                Peserta dapat mendaftar sendiri menggunakan link tersebut.
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            {{ isEdit ? 'Simpan Perubahan' : 'Buat Undangan' }}
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
import { ref, computed, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { usePackages, useTestTypes, usePatients } from '@/composables/psychology'

const props = defineProps({
  invitation: {
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

// Composables
const { packages, fetchPackages, formatPrice } = usePackages()
const { testTypes, getTestTypes } = useTestTypes()
const { searchPatients } = usePatients()

// Patient search
const patientSearch = ref('')
const filteredPatients = ref([])
const selectedPatient = ref(null)
const showPatientDropdown = ref(false)

// Computed filtered packages
const bundlePackages = computed(() => {
  return packages.value.filter(pkg => pkg.packageType === 'bundle')
})

const singlePackages = computed(() => {
  return packages.value.filter(pkg => pkg.packageType === 'single')
})

const filteredPackages = computed(() => {
  if (form.value.packageTypeFilter === 'bundle') {
    return bundlePackages.value
  } else {
    return singlePackages.value
  }
})

// Default expiry: 30 days from now
const getDefaultExpiry = () => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 16)
}

const initialForm = {
  invitationType: 'open_registration', // 'open_registration', 'single_patient'
  packageTypeFilter: 'bundle', // 'bundle' or 'single' for open_registration
  name: '',
  description: '',
  welcomeMessage: '',
  packageId: '',
  testTypeId: '',
  patientId: '',
  patientTestType: 'bundle', // for single_patient: 'bundle' or 'single'
  maxUses: null,
  expiresAt: getDefaultExpiry(),
  testExpiryHours: 48,
  notes: ''
}

const form = ref({ ...initialForm })
const errors = ref({})

const isEdit = computed(() => !!props.invitation)

const resetForm = () => {
  form.value = { ...initialForm, expiresAt: getDefaultExpiry() }
  errors.value = {}
  patientSearch.value = ''
  selectedPatient.value = null
  filteredPatients.value = []
  showPatientDropdown.value = false
}

// Search patient with debounce
const searchPatient = useDebounceFn(async () => {
  if (patientSearch.value.length < 2) {
    filteredPatients.value = []
    return
  }
  
  try {
    filteredPatients.value = await searchPatients(patientSearch.value)
    showPatientDropdown.value = true
  } catch (err) {
    console.error('Error searching patients:', err)
    filteredPatients.value = []
  }
}, 300)

const selectPatient = (patient) => {
  selectedPatient.value = patient
  form.value.patientId = patient.id
  patientSearch.value = ''
  showPatientDropdown.value = false
  filteredPatients.value = []
}

const clearPatient = () => {
  selectedPatient.value = null
  form.value.patientId = ''
  patientSearch.value = ''
}

// Watch for invitation changes
watch(() => props.invitation, (newInvitation) => {
  if (newInvitation) {
    // Determine invitation type from existing data
    let invitationType = 'open_registration'
    let patientTestType = 'bundle'
    let packageTypeFilter = 'bundle'
    
    if (newInvitation.patientId) {
      invitationType = 'single_patient'
      // Determine if it's bundle or single based on package type
      if (newInvitation.package?.packageType === 'single') {
        patientTestType = 'single'
      }
    } else {
      // For open_registration, determine filter from package type
      if (newInvitation.package?.packageType === 'single') {
        packageTypeFilter = 'single'
      }
    }

    form.value = {
      invitationType,
      packageTypeFilter,
      name: newInvitation.name || '',
      description: newInvitation.description || '',
      welcomeMessage: newInvitation.welcomeMessage || '',
      packageId: newInvitation.packageId || newInvitation.package?.id || '',
      testTypeId: '',
      patientId: newInvitation.patientId || '',
      patientTestType,
      maxUses: newInvitation.maxUses || null,
      expiresAt: newInvitation.expiresAt ? new Date(newInvitation.expiresAt).toISOString().slice(0, 16) : '',
      testExpiryHours: newInvitation.testExpiryHours || 48,
      notes: newInvitation.notes || ''
    }

    // Set selected patient if exists
    if (newInvitation.patient) {
      selectedPatient.value = newInvitation.patient
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Clear dependent fields when invitation type changes
watch(() => form.value.invitationType, (newType, oldType) => {
  if (oldType && newType !== oldType) {
    if (newType === 'open_registration') {
      form.value.patientId = ''
      form.value.maxUses = null // Reset to unlimited
      clearPatient()
    } else if (newType === 'single_patient') {
      form.value.maxUses = 1 // Set to 1 for single patient
    }
  }
})

// Clear package/test when patientTestType changes
watch(() => form.value.patientTestType, (newType, oldType) => {
  if (oldType && newType !== oldType) {
    form.value.packageId = ''
    form.value.testTypeId = ''
  }
})

const validate = () => {
  errors.value = {}

  // Validate based on invitation type
  if (form.value.invitationType === 'open_registration') {
    if (!form.value.packageId) {
      errors.value.packageId = 'Pilih paket tes'
    }
  } else if (form.value.invitationType === 'single_patient') {
    if (!form.value.patientId) {
      errors.value.patientId = 'Pilih pasien'
    }
    if (!form.value.packageId) {
      errors.value.packageId = 'Pilih paket tes'
    }
  }

  if (!form.value.expiresAt) {
    errors.value.expiresAt = 'Tanggal kadaluarsa wajib diisi'
  } else if (new Date(form.value.expiresAt) <= new Date()) {
    errors.value.expiresAt = 'Tanggal kadaluarsa harus di masa depan'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return
  
  const data = {
    invitationType: form.value.invitationType,
    name: form.value.name || null,
    description: form.value.description || null,
    welcomeMessage: form.value.welcomeMessage || null,
    packageId: form.value.packageId || null,
    maxUses: form.value.maxUses,
    expiresAt: new Date(form.value.expiresAt).toISOString(),
    testExpiryHours: form.value.testExpiryHours,
    notes: form.value.notes
  }

  // Add patientId for single_patient type
  if (form.value.invitationType === 'single_patient') {
    data.patientId = form.value.patientId
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

// Load packages and test types on mount
onMounted(async () => {
  await Promise.all([
    fetchPackages({ isActive: true }),
    getTestTypes({ status: 'active' })
  ])
})

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showPatientDropdown.value = false
  }
}

defineExpose({
  openModal,
  closeModal,
  resetForm
})
</script>
