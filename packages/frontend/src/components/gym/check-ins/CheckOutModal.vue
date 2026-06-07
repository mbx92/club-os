<script setup>
import { ref, computed, watch } from 'vue'
import { useCheckins } from '@/composables/gym/checkin-management'
import { IconDoorExit, IconNotes, IconClock } from '@tabler/icons-vue'

const props = defineProps({
  checkin: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const { updateCheckin, loading } = useCheckins()

// Modal ref for dialog API
const modal = ref(null)

// Form data
const formData = ref({
  checkOutTime: '',
  notes: ''
})

// Validation errors
const errors = ref({})

// Computed
const modalTitle = computed(() => 'Check Out Member')

const memberName = computed(() => {
  if (!props.checkin?.member) return ''
  return `${props.checkin.member.firstName} ${props.checkin.member.lastName}`
})

const checkInTime = computed(() => {
  if (!props.checkin?.checkInTime) return ''
  const date = new Date(props.checkin.checkInTime)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Initialize current date/time for checkout
const initializeCheckoutTime = () => {
  const now = new Date()
  // Format to datetime-local input format: YYYY-MM-DDTHH:mm
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  formData.value.checkOutTime = `${year}-${month}-${day}T${hours}:${minutes}`
}

// Validate form
const validateForm = () => {
  errors.value = {}

  if (!formData.value.checkOutTime) {
    errors.value.checkOutTime = 'Check-out time is required'
  } else {
    // Validate checkout time is after check-in time
    const checkoutDate = new Date(formData.value.checkOutTime)
    const checkinDate = new Date(props.checkin.checkInTime)
    
    if (checkoutDate <= checkinDate) {
      errors.value.checkOutTime = 'Check-out time must be after check-in time'
    }
  }

  return Object.keys(errors.value).length === 0
}

// Reset form
const resetForm = () => {
  formData.value = {
    checkOutTime: '',
    notes: props.checkin?.notes || ''
  }
  errors.value = {}
}

// Submit form
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    const payload = {
      checkOutTime: new Date(formData.value.checkOutTime).toISOString(),
      notes: formData.value.notes || undefined
    }

    await updateCheckin(props.checkin.id, payload)
    emit('saved')
    closeModal()
  } catch (error) {
    console.error('Error updating check-in:', error)
  }
}

// Modal controls
const openModal = () => {
  resetForm()
  initializeCheckoutTime()
  modal.value?.showModal()
}

const closeModal = () => {
  modal.value?.close()
  resetForm()
}

// Expose methods
defineExpose({ openModal, closeModal, resetForm })

// Watch checkin prop changes
watch(() => props.checkin, (newCheckin) => {
  if (newCheckin) {
    formData.value.notes = newCheckin.notes || ''
  }
})
</script>

<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold">{{ modalTitle }}</h3>
        <button
          type="button"
          @click="closeModal"
          class="btn btn-sm btn-circle btn-ghost"
        >
          ✕
        </button>
      </div>

      <!-- Member Info Card -->
      <div v-if="checkin" class="card bg-base-200 mb-6">
        <div class="card-body py-4">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-bold text-lg">{{ memberName }}</h4>
              <p class="text-sm text-base-content/60 mt-1">
                <IconClock class="w-4 h-4 inline mr-1" />
                Checked in: {{ checkInTime }}
              </p>
              <div v-if="checkin.activeService" class="mt-2">
                <div class="badge badge-sm badge-info">
                  {{ checkin.activeService.servicePlanName }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Check-Out Time -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              <IconDoorExit class="w-4 h-4 inline mr-1" />
              Check-Out Time <span class="text-error">*</span>
            </span>
          </label>
          <input
            type="datetime-local"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.checkOutTime }"
            v-model="formData.checkOutTime"
          />
          <label v-if="errors.checkOutTime" class="label">
            <span class="label-text-alt text-error">{{ errors.checkOutTime }}</span>
          </label>
          <label class="label">
            <span class="label-text-alt">Set the time when the member checked out</span>
          </label>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              <IconNotes class="w-4 h-4 inline mr-1" />
              Notes
            </span>
          </label>
          <textarea
            class="textarea textarea-bordered w-full h-24"
            placeholder="Add or update notes about this check-in session..."
            v-model="formData.notes"
          ></textarea>
          <label class="label">
            <span class="label-text-alt">Optional notes about the member's session</span>
          </label>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action mt-6">
          <button
            type="button"
            @click="closeModal"
            class="btn btn-ghost"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-success"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>
              <IconDoorExit class="w-5 h-5 inline mr-1" />
              Complete Check-Out
            </span>
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>
