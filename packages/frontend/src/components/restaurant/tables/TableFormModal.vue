<script setup>
import { ref, computed, watch } from 'vue'
import { IconX } from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  table: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  locations: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const isEdit = computed(() => !!props.table)

const formData = ref({
  tableNumber: '',
  capacity: 4,
  status: 'available',
  locationId: '',
  section: '',
  positionX: 0,
  positionY: 0,
  width: 80,
  height: 80,
  shape: 'square',
  isActive: true,
  notes: ''
})

const statuses = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'cleaning', label: 'Cleaning' }
]

const shapes = [
  { value: 'square', label: 'Square' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' }
]

const resetForm = () => {
  if (props.table) {
    formData.value = {
      tableNumber: props.table.tableNumber || '',
      capacity: props.table.capacity || 4,
      status: props.table.status || 'available',
      locationId: props.table.locationId || '',
      section: props.table.section || '',
      positionX: props.table.positionX || 0,
      positionY: props.table.positionY || 0,
      width: props.table.width || 80,
      height: props.table.height || 80,
      shape: props.table.shape || 'square',
      isActive: props.table.isActive ?? true,
      notes: props.table.notes || ''
    }
  } else {
    formData.value = {
      tableNumber: '',
      capacity: 4,
      status: 'available',
      locationId: '',
      section: '',
      positionX: 0,
      positionY: 0,
      width: 80,
      height: 80,
      shape: 'square',
      isActive: true,
      notes: ''
    }
  }
}

const handleSubmit = () => {
  if (!formData.value.tableNumber || !formData.value.locationId) {
    alert('Please fill all required fields')
    return
  }

  // Validate width and height
  if (formData.value.width < 40 || formData.value.height < 40) {
    alert('Table width and height must be at least 40px')
    return
  }

  if (formData.value.width > 300 || formData.value.height > 300) {
    alert('Table width and height must not exceed 300px')
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
      
      <h3 class="font-bold text-lg mb-4">{{ isEdit ? 'Edit Table' : 'Create New Table' }}</h3>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Basic Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Basic Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Table Number <span class="text-error">*</span></span>
              </label>
              <input 
                v-model="formData.tableNumber" 
                type="text" 
                placeholder="e.g., T-01, Table 1" 
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Capacity <span class="text-error">*</span></span>
              </label>
              <input 
                v-model.number="formData.capacity" 
                type="number" 
                min="1"
                max="20"
                placeholder="4" 
                class="input input-bordered w-full"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Location <span class="text-error">*</span></span>
              </label>
              <select v-model="formData.locationId" class="select select-bordered w-full" required>
                <option value="">Select location</option>
                <option v-for="location in locations" :key="location.id" :value="location.id">
                  {{ location.name }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Status</span>
              </label>
              <select v-model="formData.status" class="select select-bordered w-full">
                <option v-for="status in statuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Layout Information -->
        <div class="space-y-3">
          <h4 class="font-semibold text-base">Layout Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Section</span>
              </label>
              <input 
                v-model="formData.section" 
                type="text" 
                placeholder="e.g., VIP, Outdoor, Main Hall" 
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Shape</span>
              </label>
              <select v-model="formData.shape" class="select select-bordered w-full">
                <option v-for="shape in shapes" :key="shape.value" :value="shape.value">
                  {{ shape.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="alert alert-info">
            <div class="text-sm">
              <div class="font-semibold mb-1">Floor Plan Position</div>
              <p>Position coordinates will be set automatically when you arrange tables in the floor plan editor.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Position X</span>
              </label>
              <input
                v-model.number="formData.positionX"
                type="number"
                class="input input-bordered w-full"
                disabled
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Position Y</span>
              </label>
              <input
                v-model.number="formData.positionY"
                type="number"
                class="input input-bordered w-full"
                disabled
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Width (px)</span>
              </label>
              <input
                v-model.number="formData.width"
                type="number"
                min="40"
                max="300"
                class="input input-bordered w-full"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Height (px)</span>
              </label>
              <input
                v-model.number="formData.height"
                type="number"
                min="40"
                max="300"
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
              placeholder="Additional notes about this table..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input v-model="formData.isActive" type="checkbox" class="toggle toggle-success" />
              <span class="label-text">Table is active and available for use</span>
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
            {{ isEdit ? 'Update Table' : 'Create Table' }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>
</template>
