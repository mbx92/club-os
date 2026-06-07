<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        Buat Pesanan Baru
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Patient Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Pasien <span class="text-error">*</span></span>
            </label>
            
            <!-- Selected Patient Card -->
            <div 
              v-if="selectedPatient" 
              class="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-10" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                    <span class="text-sm font-medium">{{ getInitials(selectedPatient.fullName) }}</span>
                  </div>
                </div>
                <div>
                  <div class="font-medium">{{ selectedPatient.fullName }}</div>
                  <div class="text-sm text-base-content/60">
                    {{ selectedPatient.email || selectedPatient.phone || '-' }}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                class="btn btn-sm btn-ghost btn-circle"
                @click="clearPatient"
              >
                <IconX class="w-4 h-4" />
              </button>
            </div>
            
            <!-- Search Input -->
            <div v-else class="relative">
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 z-10 pointer-events-none">
                  <IconSearch v-if="!searchingPatients" class="w-5 h-5" />
                  <span v-else class="loading loading-spinner loading-sm"></span>
                </span>
                <input
                  ref="patientSearchInput"
                  v-model="patientSearch"
                  type="text"
                  placeholder="Ketik nama, email, atau no. telepon pasien..."
                  class="input input-bordered w-full pl-10 pr-10"
                  :class="{ 'input-error': errors.patientId }"
                  @input="handlePatientSearch"
                  @focus="handleSearchFocus"
                  @blur="handleSearchBlur"
                  @keydown.down.prevent="navigateResults('down')"
                  @keydown.up.prevent="navigateResults('up')"
                  @keydown.enter.prevent="selectHighlightedPatient"
                  @keydown.escape="closePatientDropdown"
                />
                <button 
                  v-if="patientSearch"
                  type="button" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                  @click="clearSearch"
                >
                  <IconX class="w-4 h-4" />
                </button>
              </div>
              
              <!-- Dropdown Results -->
              <div 
                v-if="showPatientDropdown"
                class="absolute z-50 w-full mt-1 bg-base-100 rounded-lg shadow-xl border border-base-300 overflow-hidden"
              >
                <!-- Loading State -->
                <div v-if="searchingPatients" class="p-4 text-center text-base-content/60">
                  <span class="loading loading-spinner loading-sm mr-2"></span>
                  Mencari pasien...
                </div>
                
                <!-- No Results -->
                <div v-else-if="patientSearch.length >= 2 && searchResults.length === 0 && !showAllPatients" class="p-4 text-center">
                  <IconUserOff class="w-8 h-8 mx-auto text-base-content/30 mb-2" />
                  <p class="text-base-content/60 text-sm">Pasien tidak ditemukan</p>
                  <p class="text-base-content/40 text-xs mt-1">Coba kata kunci lain</p>
                </div>
                
                <!-- Results List (Scrollable) -->
                <ul 
                  v-else-if="displayPatients.length > 0" 
                  ref="patientListRef"
                  class="menu p-1 max-h-60 overflow-y-auto"
                >
                  <li 
                    v-for="(patient, index) in displayPatients" 
                    :key="patient.id"
                  >
                    <a 
                      class="flex items-center gap-3 py-3"
                      :class="{ 'bg-primary/10': highlightedIndex === index }"
                      @mousedown.prevent="selectPatient(patient)"
                      @mouseenter="highlightedIndex = index"
                    >
                      <div class="avatar placeholder">
                        <div class="bg-base-300 text-base-content rounded-full w-10" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                          <span class="text-sm">{{ getInitials(patient.fullName) }}</span>
                        </div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ patient.fullName }}</div>
                        <div class="text-sm text-base-content/60 truncate">
                          {{ patient.email || patient.phone || '-' }}
                        </div>
                      </div>
                      <IconChevronRight class="w-4 h-4 text-base-content/30 flex-shrink-0" />
                    </a>
                  </li>
                </ul>
                
                <!-- Hint when no search query -->
                <div v-else-if="patientSearch.length < 2 && !showAllPatients" class="p-4 text-center text-base-content/50 text-sm">
                  <IconInfoCircle class="w-5 h-5 mx-auto mb-1" />
                  Ketik untuk mencari atau pilih dari daftar
                </div>
              </div>
            </div>
            
            <label v-if="errors.patientId" class="label">
              <span class="label-text-alt text-error">{{ errors.patientId }}</span>
            </label>
          </div>

          <!-- Package Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Paket Tes <span class="text-error">*</span></span>
            </label>
            <select 
              v-model="form.packageId" 
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.packageId }"
              @change="handlePackageChange"
            >
              <option value="">Pilih paket tes</option>
              <option 
                v-for="pkg in packages" 
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

          <!-- Selected Package Info -->
          <div v-if="selectedPackage" class="bg-base-200 rounded-lg p-4">
            <h4 class="font-medium mb-2">{{ selectedPackage.name }}</h4>
            <p class="text-sm text-base-content/60 mb-3">{{ selectedPackage.description }}</p>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="item in selectedPackage.items" 
                :key="item.id"
                class="badge badge-outline"
              >
                {{ item.testType?.name || item.testType?.code }}
              </span>
            </div>
          </div>

          <!-- Promo Code -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Kode Promo</span>
            </label>
            <div class="join w-full">
              <input
                v-model="form.promoCode"
                type="text"
                placeholder="Masukkan kode promo (opsional)"
                class="input input-bordered join-item w-full"
              />
              <button 
                type="button" 
                class="btn join-item"
                @click="validatePromo"
                :disabled="!form.promoCode || validatingPromo"
              >
                <span v-if="validatingPromo" class="loading loading-spinner loading-xs"></span>
                <span v-else>Cek</span>
              </button>
            </div>
            <label v-if="promoValid" class="label">
              <span class="label-text-alt text-success">Kode promo valid!</span>
            </label>
            <label v-if="promoError" class="label">
              <span class="label-text-alt text-error">{{ promoError }}</span>
            </label>
          </div>

          <!-- Expires At -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Kadaluarsa</span>
            </label>
            <input
              v-model="form.expiresAt"
              type="datetime-local"
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
              placeholder="Catatan tambahan (opsional)"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Price Summary -->
          <div v-if="selectedPackage" class="bg-base-200 rounded-lg p-4">
            <h4 class="font-medium mb-2">Ringkasan Harga</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Harga Dasar</span>
                <span>{{ formatPrice(selectedPackage.basePrice) }}</span>
              </div>
              <div v-if="selectedPackage.discountType !== 'none' && parseFloat(selectedPackage.discountValue) > 0" class="flex justify-between text-success">
                <span>
                  Diskon Paket
                  <template v-if="selectedPackage.discountType === 'percentage'">
                    ({{ selectedPackage.discountValue }}%)
                  </template>
                </span>
                <span>-{{ formatPrice(parseFloat(selectedPackage.basePrice) - parseFloat(selectedPackage.finalPrice)) }}</span>
              </div>
              <div v-if="promoValid && promoDiscount" class="flex justify-between text-success">
                <span>Diskon Promo</span>
                <span>-{{ formatPrice(promoDiscount) }}</span>
              </div>
              <div class="divider my-1"></div>
              <div class="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{{ formatPrice(totalPrice) }}</span>
              </div>
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
            Buat Pesanan
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
import { ref, computed, watch, nextTick } from 'vue'
import {
  IconSearch,
  IconX,
  IconUserOff,
  IconChevronRight,
  IconInfoCircle
} from '@tabler/icons-vue'

const props = defineProps({
  packages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close', 'search-patients', 'validate-promo'])

const modalRef = ref(null)
const patientSearchInput = ref(null)

const initialForm = {
  patientId: '',
  packageId: '',
  promoCode: '',
  expiresAt: '',
  notes: ''
}

const form = ref({ ...initialForm })
const errors = ref({})
const patientSearch = ref('')
const searchResults = ref([])
const allPatients = ref([]) // Store all patients for initial display
const showPatientDropdown = ref(false)
const showAllPatients = ref(false) // Flag to show all patients on focus
const selectedPatient = ref(null)
const selectedPackage = ref(null)
const validatingPromo = ref(false)
const promoValid = ref(false)
const promoError = ref('')
const promoDiscount = ref(0)
const searchingPatients = ref(false)
const highlightedIndex = ref(-1)
const patientListRef = ref(null)
const initialLoadRequested = ref(false) // Prevent multiple initial loads
const isLoadingInitial = ref(false) // Flag to track if initial load is in progress

let searchTimeout = null

// Computed to decide which patients to display
const displayPatients = computed(() => {
  if (patientSearch.value.length >= 2) {
    return searchResults.value
  }
  if (showAllPatients.value) {
    return allPatients.value
  }
  return []
})

const totalPrice = computed(() => {
  if (!selectedPackage.value) return 0
  const basePrice = parseFloat(selectedPackage.value.finalPrice) || 0
  return basePrice - (promoDiscount.value || 0)
})

// Watch package selection
watch(() => form.value.packageId, (packageId) => {
  selectedPackage.value = props.packages.find(p => p.id === packageId) || null
})

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  const words = name.trim().split(' ')
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

const handlePatientSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  highlightedIndex.value = -1
  showAllPatients.value = false
  
  if (patientSearch.value.length < 2) {
    searchResults.value = []
    searchingPatients.value = false
    // Show all patients when search is cleared (if available)
    if (allPatients.value.length > 0) {
      showAllPatients.value = true
    }
    return
  }
  
  searchingPatients.value = true
  
  searchTimeout = setTimeout(() => {
    emit('search-patients', patientSearch.value)
  }, 400) // Slightly longer debounce to prevent rapid calls
}

const handleSearchFocus = () => {
  showPatientDropdown.value = true
  highlightedIndex.value = -1
  
  // If no search query and we have all patients, show them
  if (patientSearch.value.length < 2 && allPatients.value.length > 0) {
    showAllPatients.value = true
  } else if (allPatients.value.length === 0 && !initialLoadRequested.value && !isLoadingInitial.value) {
    // Request all patients only on first focus (prevent duplicate calls)
    initialLoadRequested.value = true
    isLoadingInitial.value = true
    searchingPatients.value = true
    emit('search-patients', '') // Empty query to get all
  }
}

const handleSearchBlur = () => {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showPatientDropdown.value = false
  }, 200)
}

const closePatientDropdown = () => {
  showPatientDropdown.value = false
  highlightedIndex.value = -1
}

const clearSearch = () => {
  patientSearch.value = ''
  searchResults.value = []
  highlightedIndex.value = -1
  // Show all patients list when clearing search
  if (allPatients.value.length > 0) {
    showAllPatients.value = true
  }
  nextTick(() => {
    patientSearchInput.value?.focus()
  })
}

const clearPatient = () => {
  selectedPatient.value = null
  form.value.patientId = ''
  patientSearch.value = ''
  searchResults.value = []
  nextTick(() => {
    patientSearchInput.value?.focus()
  })
}

const navigateResults = (direction) => {
  const patients = displayPatients.value
  if (patients.length === 0) return
  
  if (direction === 'down') {
    highlightedIndex.value = (highlightedIndex.value + 1) % patients.length
  } else {
    highlightedIndex.value = highlightedIndex.value <= 0 
      ? patients.length - 1 
      : highlightedIndex.value - 1
  }
  
  // Scroll to highlighted item
  nextTick(() => {
    const listEl = patientListRef.value
    if (listEl) {
      const items = listEl.querySelectorAll('li')
      if (items[highlightedIndex.value]) {
        items[highlightedIndex.value].scrollIntoView({ block: 'nearest' })
      }
    }
  })
}

const selectHighlightedPatient = () => {
  const patients = displayPatients.value
  if (highlightedIndex.value >= 0 && patients[highlightedIndex.value]) {
    selectPatient(patients[highlightedIndex.value])
  }
}

const selectPatient = (patient) => {
  selectedPatient.value = patient
  form.value.patientId = patient.id
  patientSearch.value = ''
  searchResults.value = []
  showPatientDropdown.value = false
  showAllPatients.value = false
  highlightedIndex.value = -1
}

const handlePackageChange = () => {
  // Reset promo when package changes
  promoValid.value = false
  promoError.value = ''
  promoDiscount.value = 0
}

const validatePromo = async () => {
  if (!form.value.promoCode) return
  
  validatingPromo.value = true
  promoError.value = ''
  
  try {
    // Emit event to parent for promo validation
    emit('validate-promo', form.value.promoCode)
  } catch (err) {
    promoError.value = 'Kode promo tidak valid'
    promoValid.value = false
  } finally {
    validatingPromo.value = false
  }
}

// Method to receive search results from parent
const setSearchResults = (results, isAllPatients = false) => {
  if (isAllPatients || patientSearch.value === '') {
    allPatients.value = results
    showAllPatients.value = true
    isLoadingInitial.value = false
  } else {
    searchResults.value = results
  }
  searchingPatients.value = false
  showPatientDropdown.value = true
  highlightedIndex.value = -1
}

// Method to set initial patients list (called by parent on mount)
const setAllPatients = (patients) => {
  allPatients.value = patients
  initialLoadRequested.value = true // Mark as loaded
  isLoadingInitial.value = false
}

// Method to receive promo validation result from parent
const setPromoResult = (result) => {
  if (result.valid) {
    promoValid.value = true
    promoError.value = ''
    promoDiscount.value = result.discount || 0
  } else {
    promoValid.value = false
    promoError.value = result.message || 'Kode promo tidak valid'
    promoDiscount.value = 0
  }
}

const formatPrice = (price) => {
  if (!price && price !== 0) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const validate = () => {
  errors.value = {}

  if (!form.value.patientId) {
    errors.value.patientId = 'Pilih pasien'
  }

  if (!form.value.packageId) {
    errors.value.packageId = 'Pilih paket tes'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', { ...form.value })
}

const resetForm = () => {
  form.value = { ...initialForm }
  errors.value = {}
  patientSearch.value = ''
  searchResults.value = []
  selectedPatient.value = null
  selectedPackage.value = null
  promoValid.value = false
  promoError.value = ''
  promoDiscount.value = 0
  searchingPatients.value = false
  highlightedIndex.value = -1
  showAllPatients.value = false
  // Note: Don't reset allPatients - keep cached list
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
  resetForm,
  setSearchResults,
  setPromoResult,
  setAllPatients
})
</script>
