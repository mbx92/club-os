<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconTransfer,
  IconBox,
  IconMapPin,
  IconArrowRight,
  IconNote,
  IconAlertTriangle
} from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  },
  locations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit', 'success', 'update:show'])

// Form data
const formData = ref({
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: 1,
  notes: ''
})

// Selected product
const selectedProduct = computed(() => {
  return props.products?.find(p => p.id === formData.value.productId)
})

// Source location
const fromLocation = computed(() => {
  return props.locations?.find(l => l.id === formData.value.fromLocationId)
})

// Destination location
const toLocation = computed(() => {
  return props.locations?.find(l => l.id === formData.value.toLocationId)
})

// Available locations for "To" (exclude "From" location)
const availableToLocations = computed(() => {
  return props.locations?.filter(l => l.id !== formData.value.fromLocationId) || []
})

// Available locations for "From" (exclude "To" location)
const availableFromLocations = computed(() => {
  return props.locations?.filter(l => l.id !== formData.value.toLocationId) || []
})

// Stock at source location (mock - in real app, fetch from API)
const stockAtSource = computed(() => {
  if (!selectedProduct.value || !formData.value.fromLocationId) return 0
  // In real implementation, get stock for specific location
  return selectedProduct.value.stockQuantity || 0
})

// Stock at destination (mock)
const stockAtDestination = computed(() => {
  if (!selectedProduct.value || !formData.value.toLocationId) return 0
  // In real implementation, get stock for specific location
  return 0
})

// Check if sufficient stock
const hasSufficientStock = computed(() => {
  return formData.value.quantity <= stockAtSource.value
})

// Check if same location
const isSameLocation = computed(() => {
  return formData.value.fromLocationId && 
         formData.value.fromLocationId === formData.value.toLocationId
})

// Form validation
const isValid = computed(() => {
  return formData.value.productId &&
         formData.value.fromLocationId &&
         formData.value.toLocationId &&
         !isSameLocation.value &&
         formData.value.quantity > 0 &&
         hasSufficientStock.value
})

// Reset form
const resetForm = () => {
  formData.value = {
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 1,
    notes: ''
  }
}

// Swap locations
const swapLocations = () => {
  const temp = formData.value.fromLocationId
  formData.value.fromLocationId = formData.value.toLocationId
  formData.value.toLocationId = temp
}

// Handle submit
const handleSubmit = () => {
  if (!isValid.value) return
  const payload = { ...formData.value }
  emit('submit', payload)
  // emit success so parent shortcuts or handlers can close and reload
  emit('success', payload)
  // support v-model on `show`
  emit('update:show', false)
}

// Close modal
const closeModal = () => {
  emit('close')
  // support v-model on `show` so parent boolean updates
  emit('update:show', false)
  setTimeout(resetForm, 300)
}

// Watch for modal open
watch(() => props.show, (val) => {
  if (val) {
    resetForm()
  }
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-3xl">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <IconTransfer class="w-5 h-5 text-info" />
        Transfer Stock Between Locations
      </h3>

      <div class="space-y-4">
        <!-- Product Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconBox class="w-4 h-4" />
              Product *
            </span>
          </label>
          <select
            v-model="formData.productId"
            class="select select-bordered w-full"
          >
            <option value="">Select product...</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }}
              <template v-if="product.sku"> ({{ product.sku }})</template>
            </option>
          </select>
        </div>

        <!-- Location Transfer Section -->
        <div class="card bg-base-200">
          <div class="card-body py-4">
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
              <!-- From Location -->
              <div class="lg:col-span-2 form-control">
                <label class="label">
                  <span class="label-text flex items-center gap-1">
                    <IconMapPin class="w-4 h-4" />
                    From Location *
                  </span>
                </label>
                <select
                  v-model="formData.fromLocationId"
                  class="select select-bordered w-full"
                >
                  <option value="">Select source...</option>
                  <option
                    v-for="location in availableFromLocations"
                    :key="location.id"
                    :value="location.id"
                  >
                    {{ location.name }}
                  </option>
                </select>
                <label v-if="selectedProduct && formData.fromLocationId" class="label">
                  <span class="label-text-alt text-info">
                    Stock: {{ stockAtSource }} {{ selectedProduct.unit || 'pcs' }}
                  </span>
                </label>
              </div>

              <!-- Arrow / Swap Button -->
              <div class="flex justify-center">
                <button
                  class="btn btn-circle btn-ghost"
                  @click="swapLocations"
                  :disabled="!formData.fromLocationId && !formData.toLocationId"
                  title="Swap locations"
                >
                  <IconArrowRight class="w-8 h-8 text-primary" />
                </button>
              </div>

              <!-- To Location -->
              <div class="lg:col-span-2 form-control">
                <label class="label">
                  <span class="label-text flex items-center gap-1">
                    <IconMapPin class="w-4 h-4" />
                    To Location *
                  </span>
                </label>
                <select
                  v-model="formData.toLocationId"
                  class="select select-bordered w-full"
                >
                  <option value="">Select destination...</option>
                  <option
                    v-for="location in availableToLocations"
                    :key="location.id"
                    :value="location.id"
                  >
                    {{ location.name }}
                  </option>
                </select>
                <label v-if="selectedProduct && formData.toLocationId" class="label">
                  <span class="label-text-alt text-base-content/60">
                    Current stock: {{ stockAtDestination }} {{ selectedProduct.unit || 'pcs' }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Warning for same location -->
        <div v-if="isSameLocation" class="alert alert-error">
          <IconAlertTriangle class="w-5 h-5" />
          <span>Source and destination locations cannot be the same</span>
        </div>

        <!-- Quantity -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Quantity to Transfer *</span>
          </label>
          <input
            v-model.number="formData.quantity"
            type="number"
            class="input input-bordered w-full"
            :class="{ 'input-error': !hasSufficientStock && formData.quantity > 0 }"
            min="1"
            :max="stockAtSource"
            step="1"
            placeholder="Enter quantity"
          />
          <label v-if="!hasSufficientStock && formData.quantity > 0" class="label">
            <span class="label-text-alt text-error">
              Insufficient stock at source (available: {{ stockAtSource }})
            </span>
          </label>
        </div>

        <!-- Transfer Preview -->
        <div v-if="isValid" class="card bg-info/10 border border-info/30">
          <div class="card-body py-4">
            <h4 class="font-semibold text-info mb-2">Transfer Preview</h4>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-sm text-base-content/60 mb-1">{{ fromLocation?.name }}</div>
                <div class="text-lg font-bold">
                  {{ stockAtSource }} → {{ stockAtSource - formData.quantity }}
                </div>
                <div class="text-xs text-error">-{{ formData.quantity }}</div>
              </div>
              <div class="flex items-center justify-center">
                <IconArrowRight class="w-6 h-6 text-info" />
              </div>
              <div>
                <div class="text-sm text-base-content/60 mb-1">{{ toLocation?.name }}</div>
                <div class="text-lg font-bold">
                  {{ stockAtDestination }} → {{ stockAtDestination + formData.quantity }}
                </div>
                <div class="text-xs text-success">+{{ formData.quantity }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconNote class="w-4 h-4" />
              Notes
            </span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Optional notes about this transfer..."
            rows="2"
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          @click="closeModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-info gap-2"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <template v-else>
            <IconTransfer class="w-4 h-4" />
            Transfer Stock
          </template>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
