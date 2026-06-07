<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-5xl max-h-[90vh]">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        {{ isEditMode ? 'Edit Instructor' : 'Add New Instructor' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] px-2">
          <!-- Personal Information -->
          <div>
            <h4 class="font-semibold text-base mb-3">Personal Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- First Name -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">
                    First Name <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  v-model="formData.firstName"
                  type="text"
                  placeholder="John"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.firstName }"
                  required
                />
                <label v-if="errors.firstName" class="label">
                  <span class="label-text-alt text-error">{{ errors.firstName }}</span>
                </label>
              </div>

              <!-- Last Name -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">
                    Last Name <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  v-model="formData.lastName"
                  type="text"
                  placeholder="Smith"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.lastName }"
                  required
                />
                <label v-if="errors.lastName" class="label">
                  <span class="label-text-alt text-error">{{ errors.lastName }}</span>
                </label>
              </div>

              <!-- Email -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Email</span>
                  <span class="label-text-alt text-base-content/60">
                    {{ !formData.phone ? '(Required if no phone)' : '(Optional)' }}
                  </span>
                </label>
                <input
                  v-model="formData.email"
                  type="email"
                  placeholder="john.trainer@gym.com"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.email }"
                  :required="!formData.phone"
                />
                <label v-if="errors.email" class="label">
                  <span class="label-text-alt text-error">{{ errors.email }}</span>
                </label>
              </div>

              <!-- Phone -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Phone</span>
                  <span class="label-text-alt text-base-content/60">
                    {{ !formData.email ? '(Required if no email)' : '(Optional)' }}
                  </span>
                </label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  placeholder="081234567890"
                  class="input input-bordered w-full"
                  :class="{ 'input-error': errors.phone }"
                  :required="!formData.email"
                />
                <label v-if="errors.phone" class="label">
                  <span class="label-text-alt text-error">{{ errors.phone }}</span>
                </label>
              </div>

              <!-- Date of Birth -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Date of Birth</span>
                </label>
                <input
                  v-model="formData.dateOfBirth"
                  type="date"
                  class="input input-bordered w-full"
                  :max="maxDate"
                />
              </div>

              <!-- Gender -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Gender</span>
                </label>
                <select v-model="formData.gender" class="select select-bordered w-full">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Hire Date -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Hire Date</span>
                </label>
                <input
                  v-model="formData.hireDate"
                  type="date"
                  class="input input-bordered w-full"
                  :max="maxDate"
                />
              </div>

              <!-- Photo URL -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Photo URL</span>
                </label>
                <input
                  v-model="formData.photoUrl"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  class="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          <!-- Bio -->
          <div>
            <h4 class="font-semibold text-base mb-3">Bio</h4>
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Biography</span>
              </label>
              <textarea
                v-model="formData.bio"
                placeholder="Tell us about the instructor's experience and expertise..."
                class="textarea textarea-bordered h-24 w-full resize-none"
              />
            </div>
          </div>

          <!-- Specializations -->
          <div>
            <h4 class="font-semibold text-base mb-3 flex items-center justify-between">
              <span>Specializations</span>
              <button
                type="button"
                class="btn btn-sm btn-ghost gap-1"
                @click="showAddSpecializationInput = !showAddSpecializationInput"
              >
                <IconPlus class="w-4 h-4" />
                Add Custom
              </button>
            </h4>
            
            <!-- Add Custom Specialization Input -->
            <div v-if="showAddSpecializationInput" class="mb-4 p-3 bg-base-200 rounded-lg">
              <div class="flex gap-2">
                <input
                  v-model="newSpecializationName"
                  type="text"
                  placeholder="Enter specialization name (e.g., Kickboxing)"
                  class="input input-sm input-bordered flex-1"
                  @keyup.enter="addCustomSpecialization"
                />
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  @click="addCustomSpecialization"
                  :disabled="!newSpecializationName.trim()"
                >
                  Add
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  @click="showAddSpecializationInput = false; newSpecializationName = ''"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label
                v-for="spec in availableSpecializations"
                :key="spec.value"
                class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3 hover:bg-base-200 transition-colors"
                :class="{ 'bg-primary/10 border-primary': formData.specializations.includes(spec.value) }"
              >
                <input
                  type="checkbox"
                  :value="spec.value"
                  v-model="formData.specializations"
                  class="checkbox checkbox-primary checkbox-sm"
                />
                <span class="label-text flex-1">{{ spec.label }}</span>
                <button
                  v-if="spec.custom"
                  type="button"
                  class="btn btn-xs btn-ghost btn-circle"
                  @click.prevent="removeCustomSpecialization(spec.value)"
                >
                  ✕
                </button>
              </label>
            </div>
          </div>

          <!-- Commission -->
          <div>
            <h4 class="font-semibold text-base mb-3">Commission</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Commission Type -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Commission Type</span>
                </label>
                <select v-model="formData.commissionType" class="select select-bordered w-full">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="per_session">Per Session</option>
                </select>
              </div>

              <!-- Commission Value -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Commission Value</span>
                </label>
                <!-- Percentage: plain number input -->
                <input
                  v-if="formData.commissionType === 'percentage'"
                  v-model.number="formData.commissionValue"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="15"
                  class="input input-bordered w-full"
                />
                <!-- Fixed / Per Session: formatted thousands input -->
                <input
                  v-else
                  :value="formatThousands(formData.commissionValue)"
                  @input="handleCommissionInput"
                  type="text"
                  inputmode="numeric"
                  placeholder="100.000"
                  class="input input-bordered w-full"
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    {{ currencyDisplay }}
                  </span>
                </label>
              </div>

              <!-- Commission Notes -->
              <div class="form-control w-full md:col-span-2">
                <label class="label">
                  <span class="label-text font-medium">Commission Notes</span>
                </label>
                <textarea
                  v-model="formData.commissionNotes"
                  placeholder="Additional notes about the commission structure..."
                  class="textarea textarea-bordered h-20 w-full resize-none"
                />
              </div>

              <!-- Bank/Account Name -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Bank / Account Name</span>
                </label>
                <input
                  v-model="formData.bankName"
                  type="text"
                  placeholder="e.g. BCA, Mandiri, BNI"
                  class="input input-bordered w-full"
                />
              </div>

              <!-- Account Number -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Account Number</span>
                </label>
                <input
                  v-model="formData.bankAccountNumber"
                  type="text"
                  placeholder="e.g. 1234567890"
                  class="input input-bordered w-full"
                />
              </div>

              <!-- Account Holder Name -->
              <div class="form-control w-full md:col-span-2">
                <label class="label">
                  <span class="label-text font-medium">Account Holder Name</span>
                </label>
                <input
                  v-model="formData.bankAccountName"
                  type="text"
                  placeholder="e.g. John Smith"
                  class="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          <!-- Certifications -->
          <div>
            <h4 class="font-semibold text-base mb-3 flex items-center justify-between">
              <span>Certifications</span>
              <button
                type="button"
                class="btn btn-sm btn-ghost gap-1"
                @click="addCertification"
              >
                <IconPlus class="w-4 h-4" />
                Add Certification
              </button>
            </h4>
            <div class="space-y-3">
              <div
                v-for="(cert, index) in formData.certifications"
                :key="index"
                class="card bg-base-200"
              >
                <div class="card-body p-4">
                  <div class="flex items-start justify-between mb-2">
                    <span class="font-medium">Certification {{ index + 1 }}</span>
                    <button
                      type="button"
                      class="btn btn-xs btn-ghost btn-circle"
                      @click="removeCertification(index)"
                    >
                      ✕
                    </button>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="form-control w-full">
                      <input
                        v-model="cert.name"
                        type="text"
                        placeholder="Certification Name"
                        class="input input-sm input-bordered w-full"
                      />
                    </div>
                    <div class="form-control w-full">
                      <input
                        v-model="cert.issuer"
                        type="text"
                        placeholder="Issuing Organization"
                        class="input input-sm input-bordered w-full"
                      />
                    </div>
                    <div class="form-control w-full">
                      <input
                        v-model="cert.date"
                        type="date"
                        placeholder="Issue Date"
                        class="input input-sm input-bordered w-full"
                      />
                    </div>
                    <div class="form-control w-full">
                      <input
                        v-model="cert.expiryDate"
                        type="date"
                        placeholder="Expiry Date"
                        class="input input-sm input-bordered w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="formData.certifications.length === 0" class="text-center py-4 text-base-content/60">
                No certifications added yet. Click "Add Certification" to add one.
              </div>
            </div>
          </div>

          <!-- Availability -->
          <div>
            <h4 class="font-semibold text-base mb-3">Weekly Availability</h4>
            <div class="space-y-3">
              <div
                v-for="day in weekDays"
                :key="day.value"
                class="card bg-base-200"
              >
                <div class="card-body p-4">
                  <div class="flex items-center gap-3">
                    <label class="label cursor-pointer gap-3 flex-shrink-0">
                      <input
                        type="checkbox"
                        :checked="formData.availability[day.value]?.length > 0"
                        @change="toggleDayAvailability(day.value)"
                        class="checkbox checkbox-primary checkbox-sm"
                      />
                      <span class="label-text font-medium w-24">{{ day.label }}</span>
                    </label>
                    <div v-if="formData.availability[day.value]?.length > 0" class="flex-1">
                      <div class="flex flex-wrap gap-2">
                        <div
                          v-for="(slot, index) in formData.availability[day.value]"
                          :key="index"
                          class="flex items-center gap-2"
                        >
                          <input
                            v-model="formData.availability[day.value][index]"
                            type="text"
                            placeholder="09:00-12:00"
                            class="input input-sm input-bordered w-full"
                          />
                          <button
                            type="button"
                            class="btn btn-xs btn-ghost btn-circle"
                            @click="removeTimeSlot(day.value, index)"
                          >
                            ✕
                          </button>
                        </div>
                        <button
                          type="button"
                          class="btn btn-xs btn-ghost"
                          @click="addTimeSlot(day.value)"
                        >
                          + Add Slot
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Status (Edit Mode Only) -->
          <div v-if="isEditMode">
            <h4 class="font-semibold text-base mb-3">Status</h4>
            <div class="form-control w-full">
              <label class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3">
                <input
                  v-model="formData.isActive"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <div>
                  <span class="label-text font-medium">Active Status</span>
                  <p class="text-xs text-base-content/60 mt-1">
                    {{ formData.isActive ? 'Instructor is active and can be assigned to classes' : 'Instructor is inactive' }}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-action mt-6">
          <button
            type="button"
            class="btn btn-ghost"
            @click="closeModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ isEditMode ? 'Update Instructor' : 'Create Instructor' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IconPlus } from '@tabler/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const props = defineProps({
  trainer: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

// Refs
const modal = ref(null)
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bio: '',
  photoUrl: '',
  specializations: [],
  certifications: [],
  commissionType: 'percentage',
  commissionValue: 0,
  commissionNotes: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  availability: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  },
  hireDate: '',
  isActive: true
})

const errors = ref({})
const showAddSpecializationInput = ref(false)
const newSpecializationName = ref('')

// Constants
const availableSpecializations = ref([
  { label: 'Yoga', value: 'yoga', custom: false },
  { label: 'Personal Training', value: 'personal_training', custom: false },
  { label: 'Spinning', value: 'spinning', custom: false },
  { label: 'Boxing', value: 'boxing', custom: false },
  { label: 'Pilates', value: 'pilates', custom: false },
  { label: 'CrossFit', value: 'crossfit', custom: false },
  { label: 'Zumba', value: 'zumba', custom: false },
  { label: 'Aerobics', value: 'aerobics', custom: false },
  { label: 'Strength Training', value: 'strength_training', custom: false }
])

const weekDays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' }
]

// Computed
const isEditMode = computed(() => !!props.trainer)

const currencyConfig = computed(() => {
  return authStore.user?.tenant?.settings?.transaction?.currency || {
    defaultCurrency: 'IDR',
    currencySymbol: 'Rp'
  }
})

const currencyDisplay = computed(() => {
  if (formData.value.commissionType === 'percentage') {
    return 'Percentage (%)'
  }
  return `Amount (${currencyConfig.value.currencySymbol || currencyConfig.value.defaultCurrency})`
})

const formatThousands = (value) => {
  const num = parseFloat(value)
  if (isNaN(num) || num === 0) return ''
  return new Intl.NumberFormat('id-ID').format(num)
}

const parseThousands = (value) => {
  // Remove thousand separators (dots in id-ID) and non-digit chars
  const cleaned = String(value).replace(/\./g, '').replace(/[^0-9]/g, '')
  return parseInt(cleaned, 10) || 0
}

const handleCommissionInput = (event) => {
  formData.value.commissionValue = parseThousands(event.target.value)
}

const maxDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return (
    formData.value.firstName &&
    formData.value.lastName &&
    (formData.value.email || formData.value.phone)
  )
})

// Methods
const openModal = () => {
  if (props.trainer) {
    populateForm(props.trainer)
  }
  modal.value?.showModal()
}

const closeModal = () => {
  modal.value?.close()
  emit('close')
}

const resetForm = () => {
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    photoUrl: '',
    specializations: [],
    certifications: [],
    commissionType: 'percentage',
    commissionValue: 0,
    commissionNotes: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    },
    hireDate: '',
    isActive: true
  }
  errors.value = {}
}

const populateForm = (trainer) => {
  formData.value = {
    firstName: trainer.firstName || '',
    lastName: trainer.lastName || '',
    email: trainer.email || '',
    phone: trainer.phone || '',
    dateOfBirth: trainer.dateOfBirth || '',
    gender: trainer.gender || '',
    bio: trainer.bio || '',
    photoUrl: trainer.photoUrl || '',
    specializations: trainer.specializations || [],
    certifications: trainer.certifications || [],
    commissionType: trainer.commissionType || 'percentage',
    commissionValue: trainer.commissionValue || 0,
    commissionNotes: trainer.commissionNotes || '',
    bankName: trainer.bankName || '',
    bankAccountNumber: trainer.bankAccountNumber || '',
    bankAccountName: trainer.bankAccountName || '',
    availability: trainer.availability || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    },
    hireDate: trainer.hireDate || '',
    isActive: trainer.isActive ?? true
  }
}

const validateForm = () => {
  errors.value = {}

  if (!formData.value.firstName) {
    errors.value.firstName = 'First name is required'
  }

  if (!formData.value.lastName) {
    errors.value.lastName = 'Last name is required'
  }

  if (!formData.value.email && !formData.value.phone) {
    errors.value.email = 'Email or phone is required'
    errors.value.phone = 'Email or phone is required'
  }

  if (formData.value.email && !isValidEmail(formData.value.email)) {
    errors.value.email = 'Invalid email format'
  }

  return Object.keys(errors.value).length === 0
}

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const addCertification = () => {
  formData.value.certifications.push({
    name: '',
    issuer: '',
    date: '',
    expiryDate: ''
  })
}

const removeCertification = (index) => {
  formData.value.certifications.splice(index, 1)
}

const toggleDayAvailability = (day) => {
  if (formData.value.availability[day]?.length > 0) {
    formData.value.availability[day] = []
  } else {
    formData.value.availability[day] = ['09:00-12:00']
  }
}

const addTimeSlot = (day) => {
  if (!formData.value.availability[day]) {
    formData.value.availability[day] = []
  }
  formData.value.availability[day].push('')
}

const removeTimeSlot = (day, index) => {
  formData.value.availability[day].splice(index, 1)
}

const addCustomSpecialization = () => {
  const name = newSpecializationName.value.trim()
  if (!name) return

  // Convert name to value format (lowercase with underscores)
  const value = name.toLowerCase().replace(/\s+/g, '_')

  // Check if already exists
  const exists = availableSpecializations.value.some(spec => spec.value === value)
  if (exists) {
    alert('This specialization already exists')
    return
  }

  // Add new specialization
  availableSpecializations.value.push({
    label: name,
    value: value,
    custom: true
  })

  // Auto-select the new specialization
  formData.value.specializations.push(value)

  // Reset input
  newSpecializationName.value = ''
  showAddSpecializationInput.value = false
}

const removeCustomSpecialization = (value) => {
  // Remove from available list
  const index = availableSpecializations.value.findIndex(spec => spec.value === value)
  if (index > -1) {
    availableSpecializations.value.splice(index, 1)
  }

  // Remove from selected specializations
  const selectedIndex = formData.value.specializations.indexOf(value)
  if (selectedIndex > -1) {
    formData.value.specializations.splice(selectedIndex, 1)
  }
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  // Prepare data for submission
  const submitData = {
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    email: formData.value.email || undefined,
    phone: formData.value.phone || undefined,
    dateOfBirth: formData.value.dateOfBirth || undefined,
    gender: formData.value.gender || undefined,
    bio: formData.value.bio || undefined,
    photoUrl: formData.value.photoUrl || undefined,
    specializations: formData.value.specializations,
    certifications: formData.value.certifications.filter(c => c.name),
    commissionType: formData.value.commissionType,
    commissionValue: parseFloat(formData.value.commissionValue) || 0,
    commissionNotes: formData.value.commissionNotes || undefined,
    bankName: formData.value.bankName || undefined,
    bankAccountNumber: formData.value.bankAccountNumber || undefined,
    bankAccountName: formData.value.bankAccountName || undefined,
    availability: {},
    hireDate: formData.value.hireDate || undefined
  }

  // Filter availability - only include days with time slots
  Object.keys(formData.value.availability).forEach(day => {
    const slots = formData.value.availability[day]?.filter(slot => slot.trim())
    if (slots && slots.length > 0) {
      submitData.availability[day] = slots
    }
  })

  // Add isActive for edit mode
  if (isEditMode.value) {
    submitData.isActive = formData.value.isActive
  }

  emit('submit', submitData)
}

// Watch for trainer changes
watch(() => props.trainer, (newTrainer) => {
  if (newTrainer) {
    populateForm(newTrainer)
  } else {
    resetForm()
  }
})

// Expose methods
defineExpose({
  openModal,
  closeModal,
  resetForm
})
</script>
