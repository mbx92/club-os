<script setup>
import { ref, computed, watch } from 'vue'
import { IconX } from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  location: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const isEdit = computed(() => !!props.location)

const formData = ref({
  name: '',
  type: 'branch',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Indonesia',
  phone: '',
  email: '',
  isActive: true,
  notes: ''
})

const locationTypes = [
  { value: 'branch', label: 'Branch/Outlet' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'kitchen', label: 'Central Kitchen' },
  { value: 'office', label: 'Office' }
]

const resetForm = () => {
  if (props.location) {
    formData.value = {
      name: props.location.name || '',
      type: props.location.type || 'branch',
      address: props.location.address || '',
      city: props.location.city || '',
      state: props.location.state || '',
      postalCode: props.location.postalCode || '',
      country: props.location.country || 'Indonesia',
      phone: props.location.phone || '',
      email: props.location.email || '',
      isActive: props.location.isActive ?? true,
      notes: props.location.notes || ''
    }
  } else {
    formData.value = {
      name: '',
      type: 'branch',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Indonesia',
      phone: '',
      email: '',
      isActive: true,
      notes: ''
    }
  }
}

const handleSubmit = () => {
  if (!formData.value.name || !formData.value.address) {
    alert('Please fill all required fields')
    return
  }

  emit('submit', { ...formData.value })
}

const closeModal = () => {
  emit('update:modelValue', false)
  setTimeout(resetForm, 300)
}

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>

<template>
  <div class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box max-w-2xl">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">
        <IconX class="w-5 h-5" />
      </button>
      
      <h3 class="font-bold text-lg mb-4">{{ isEdit ? 'Edit Location' : 'Create New Location' }}</h3>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Basic Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Basic Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Location Name <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.name" 
                type="text" 
                placeholder="e.g., Main Branch Jakarta" 
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Location Type</span>
              </label>
              <select v-model="formData.type" class="select select-bordered w-full">
                <option v-for="type in locationTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Address</h4>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Street Address <span class="text-error">*</span></span>
            </label>
            <textarea 
              v-model="formData.address" 
              class="textarea textarea-bordered h-20 w-full" 
              placeholder="Full street address..."
              required
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">City</span>
              </label>
              <input 
                v-model="formData.city" 
                type="text" 
                placeholder="e.g., Jakarta" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">State/Province</span>
              </label>
              <input 
                v-model="formData.state" 
                type="text" 
                placeholder="e.g., DKI Jakarta" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Postal Code</span>
              </label>
              <input 
                v-model="formData.postalCode" 
                type="text" 
                placeholder="e.g., 12345" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Country</span>
              </label>
              <input 
                v-model="formData.country" 
                type="text" 
                placeholder="e.g., Indonesia" 
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Contact Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone</span>
              </label>
              <input 
                v-model="formData.phone" 
                type="tel" 
                placeholder="+62 xxx-xxxx-xxxx" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input 
                v-model="formData.email" 
                type="email" 
                placeholder="location@example.com" 
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Additional Information</h4>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Notes</span>
            </label>
            <textarea 
              v-model="formData.notes" 
              class="textarea textarea-bordered h-20 w-full" 
              placeholder="Additional notes about this location..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input v-model="formData.isActive" type="checkbox" class="toggle toggle-success" />
              <span class="label-text">Location is active and operational</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal" :disabled="loading">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ isEdit ? 'Update Location' : 'Create Location' }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>
</template>
