<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentStatus: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const status = ref('')
const notes = ref('')

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

watch(() => props.show, (newVal) => {
  if (newVal) {
    status.value = props.currentStatus
    notes.value = ''
  }
})

const handleSubmit = () => {
  if (!status.value) return
  
  emit('submit', {
    status: status.value,
    notes: notes.value || undefined
  })
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Update Order Status</h3>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Status *</span>
          </label>
          <select 
            v-model="status" 
            class="select select-bordered w-full"
            required
          >
            <option value="">Select status...</option>
            <option 
              v-for="option in statusOptions" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea 
            v-model="notes"
            class="textarea textarea-bordered w-full" 
            placeholder="Optional notes..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button 
          class="btn btn-ghost" 
          @click="$emit('close')"
          :disabled="loading"
        >
          Cancel
        </button>
        <button 
          class="btn btn-primary"
          :disabled="!status || loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else>Update Status</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>
