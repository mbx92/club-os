<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-4xl max-h-[90vh]">
      <form method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="font-bold text-lg mb-4">
        {{ isEditMode ? 'Edit Member' : 'Add New Member' }}
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
                  placeholder="Doe"
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
                  placeholder="john.doe@example.com"
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
                  placeholder="+628123456789"
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
            </div>
          </div>

          <!-- Address Information -->
          <div>
            <h4 class="font-semibold text-base mb-3">Address</h4>
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">Address</span>
              </label>
              <textarea
                v-model="formData.address"
                placeholder="Full address"
                class="textarea textarea-bordered h-20 w-full resize-none"
              />
            </div>
          </div>

          <!-- Photo URL -->
          <div>
            <h4 class="font-semibold text-base mb-3">Profile Photo</h4>
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
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  Enter a URL to the member's photo
                </span>
              </label>
            </div>
          </div>

          <!-- Emergency Contact -->
          <div>
            <h4 class="font-semibold text-base mb-3">Emergency Contact</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Emergency Contact Name -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Contact Name</span>
                </label>
                <input
                  v-model="formData.emergencyContact"
                  type="text"
                  placeholder="Jane Doe"
                  class="input input-bordered w-full"
                />
              </div>

              <!-- Emergency Contact Phone -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Contact Phone</span>
                </label>
                <input
                  v-model="formData.emergencyPhone"
                  type="tel"
                  placeholder="+628123456789"
                  class="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div>
            <h4 class="font-semibold text-base mb-3">Additional Information</h4>
            <div class="space-y-4">
              <!-- Membership Status removed: backend no longer supports this field -->

              <!-- Active Status (Edit Mode Only) -->
              <div class="form-control w-full" v-if="isEditMode">
                <label class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 py-3">
                  <input
                    v-model="formData.isActive"
                    type="checkbox"
                    class="toggle toggle-primary"
                  />
                  <div>
                    <span class="label-text font-medium">Active Status</span>
                    <p class="text-xs text-base-content/60 mt-1">
                      {{ formData.isActive ? 'Member is active' : 'Member is inactive' }}
                    </p>
                  </div>
                </label>
              </div>

              <!-- Notes -->
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-medium">Notes</span>
                </label>
                <textarea
                  v-model="formData.notes"
                  placeholder="Additional notes about the member"
                  class="textarea textarea-bordered h-24 w-full resize-none"
                />
              </div>
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
            {{ isEditMode ? 'Update Member' : 'Create Member' }}
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
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  member: {
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
  address: '',
  photoUrl: '',
  emergencyContact: '',
  emergencyPhone: '',
  isActive: true,
  notes: ''
})

const errors = ref({})

// Computed
const isEditMode = computed(() => !!props.member)

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
  if (props.member) {
    populateForm(props.member)
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
    address: '',
    photoUrl: '',
    emergencyContact: '',
    emergencyPhone: '',
    isActive: true,
    notes: ''
  }
  errors.value = {}
}

const populateForm = (member) => {
  formData.value = {
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    email: member.email || '',
    phone: member.phone || '',
    dateOfBirth: member.dateOfBirth || '',
    gender: member.gender || '',
    address: member.address || '',
    photoUrl: member.photoUrl || '',
    emergencyContact: member.emergencyContactName || '',
    emergencyPhone: member.emergencyContactPhone || '',
    isActive: member.isActive ?? true,
    notes: member.notes || ''
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
    address: formData.value.address || undefined,
    photoUrl: formData.value.photoUrl || undefined,
    emergencyContact: formData.value.emergencyContact || undefined,
    emergencyPhone: formData.value.emergencyPhone || undefined,
    notes: formData.value.notes || undefined
  }

  // Add fields based on mode
  if (isEditMode.value) {
    submitData.isActive = formData.value.isActive
  }

  emit('submit', submitData)
}

// Watch for member changes
watch(() => props.member, (newMember) => {
  if (newMember) {
    populateForm(newMember)
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
