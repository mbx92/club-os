<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const occupiedBy = ref('')

const isValid = computed(() => {
  return occupiedBy.value.trim().length > 0
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    occupiedBy.value = ''
  }
})

const handleSubmit = () => {
  if (!isValid.value) return
  
  emit('submit', {
    status: 'reserved',
    occupiedBy: occupiedBy.value.trim()
  })
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Reserve Table</h3>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Reserved For *</span>
          </label>
          <input 
            type="text" 
            v-model="occupiedBy"
            placeholder="e.g., Reserved for John Doe"
            class="input input-bordered w-full"
            required
          />
          <label class="label">
            <span class="label-text-alt">Enter customer name or reservation details</span>
          </label>
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
          :disabled="!isValid || loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else>Reserve Table</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>
