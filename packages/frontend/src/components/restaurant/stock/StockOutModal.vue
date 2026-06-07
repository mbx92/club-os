<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconPackageExport,
  IconBox,
  IconMapPin,
  IconAlertTriangle,
  IconNote,
  IconTrash
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

// Reason options
const reasonOptions = [
  { value: 'damage', label: 'Damage', icon: '🔨', description: 'Product damaged during handling or storage' },
  { value: 'wastage', label: 'Wastage', icon: '🗑️', description: 'Product wasted during preparation or use' },
  { value: 'expired', label: 'Expired', icon: '📅', description: 'Product past expiration date' },
  { value: 'theft', label: 'Theft/Loss', icon: '🔒', description: 'Product missing or stolen' },
  { value: 'sample', label: 'Sample/Tasting', icon: '🍴', description: 'Given as sample or tasting' },
  { value: 'other', label: 'Other', icon: 'IconNote', description: 'Other reason (specify in notes)' }
]

// Form data
const formData = ref({
  productId: '',
  locationId: '',
  quantity: 1,
  reason: '',
  notes: ''
})

// Confirmation step
const showConfirmation = ref(false)

// Selected product
const selectedProduct = computed(() => {
  return props.products?.find(p => p.id === formData.value.productId)
})

// Current stock at location
const currentStock = computed(() => {
  if (!selectedProduct.value) return 0
  // In real implementation, get stock for specific location
  return selectedProduct.value.stockQuantity || 0
})

// Check if sufficient stock
const hasSufficientStock = computed(() => {
  return formData.value.quantity <= currentStock.value
})

// Selected reason
const selectedReason = computed(() => {
  return reasonOptions.find(r => r.value === formData.value.reason)
})

// Form validation
const isValid = computed(() => {
  return formData.value.productId &&
         formData.value.locationId &&
         formData.value.quantity > 0 &&
         formData.value.reason &&
         hasSufficientStock.value
})

// Reset form
const resetForm = () => {
  formData.value = {
    productId: '',
    locationId: '',
    quantity: 1,
    reason: '',
    notes: ''
  }
  showConfirmation.value = false
}

// Proceed to confirmation
const proceedToConfirm = () => {
  if (!isValid.value) return
  showConfirmation.value = true
}

// Go back to form
const backToForm = () => {
  showConfirmation.value = false
}

// Handle submit
const handleSubmit = () => {
  if (!isValid.value) return
  const payload = { ...formData.value }
  // debug: log payload so we can trace whether parent/composable receives it
  console.log('[StockOutModal] submit payload:', payload)
  emit('submit', payload)
  emit('success', payload)
  emit('update:show', false)
}

// Close modal
const closeModal = () => {
  emit('close')
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
    <div class="modal-box max-w-2xl">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <IconPackageExport class="w-5 h-5 text-error" />
        Record Stock Out
      </h3>

      <!-- Form View -->
      <div v-if="!showConfirmation" class="space-y-4">
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
          <label v-if="selectedProduct" class="label">
            <span class="label-text-alt">
              Available stock: {{ currentStock }} {{ selectedProduct.unit || 'pcs' }}
            </span>
          </label>
        </div>

        <!-- Location Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconMapPin class="w-4 h-4" />
              Location *
            </span>
          </label>
          <select
            v-model="formData.locationId"
            class="select select-bordered w-full"
          >
            <option value="">Select location...</option>
            <option
              v-for="location in locations"
              :key="location.id"
              :value="location.id"
            >
              {{ location.name }}
            </option>
          </select>
        </div>

        <!-- Quantity -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Quantity to Remove *</span>
          </label>
          <input
            v-model.number="formData.quantity"
            type="number"
            class="input input-bordered w-full"
            :class="{ 'input-error': formData.quantity > currentStock }"
            min="1"
            :max="currentStock"
            step="1"
            placeholder="Enter quantity"
          />
          <label v-if="!hasSufficientStock && formData.quantity > 0" class="label">
            <span class="label-text-alt text-error">
              Insufficient stock (available: {{ currentStock }})
            </span>
          </label>
        </div>

        <!-- Reason Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconAlertTriangle class="w-4 h-4" />
              Reason *
            </span>
          </label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <label
              v-for="reason in reasonOptions"
              :key="reason.value"
              class="cursor-pointer"
            >
              <input
                v-model="formData.reason"
                type="radio"
                :value="reason.value"
                class="hidden peer"
              />
              <div
                class="card bg-base-200 p-3 text-center transition-all peer-checked:bg-error/20 peer-checked:border-2 peer-checked:border-error hover:bg-base-300"
              >
                <div class="text-2xl mb-1">{{ reason.icon }}</div>
                <div class="text-sm font-medium">{{ reason.label }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconNote class="w-4 h-4" />
              Notes
              <span v-if="formData.reason === 'other'" class="text-error">*</span>
            </span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            :placeholder="formData.reason === 'other' ? 'Please specify the reason...' : 'Optional notes...'"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Confirmation View -->
      <div v-else class="space-y-4">
        <div class="alert alert-warning">
          <IconAlertTriangle class="w-6 h-6" />
          <div>
            <h4 class="font-bold">Confirm Stock Out</h4>
            <p class="text-sm">This action will reduce the stock and cannot be easily undone.</p>
          </div>
        </div>

        <div class="card bg-base-200">
          <div class="card-body py-4">
            <h4 class="font-semibold mb-3">Summary</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/60">Product:</span>
                <span class="font-medium">{{ selectedProduct?.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Location:</span>
                <span class="font-medium">
                  {{ locations.find(l => l.id === formData.locationId)?.name }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Quantity:</span>
                <span class="font-bold text-error">-{{ formData.quantity }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Reason:</span>
                <span class="font-medium">{{ selectedReason?.icon }} {{ selectedReason?.label }}</span>
              </div>
              <div v-if="formData.notes" class="pt-2 border-t border-base-300">
                <span class="text-base-content/60">Notes:</span>
                <p class="mt-1">{{ formData.notes }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center text-sm text-base-content/60">
          Stock will be reduced from <strong>{{ currentStock }}</strong> to <strong>{{ currentStock - formData.quantity }}</strong>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <template v-if="!showConfirmation">
          <button
            class="btn btn-ghost"
            @click="closeModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            class="btn btn-error gap-2"
            @click="proceedToConfirm"
            :disabled="loading || !isValid"
          >
            <IconTrash class="w-4 h-4" />
            Continue
          </button>
        </template>
        <template v-else>
          <button
            class="btn btn-ghost"
            @click="backToForm"
            :disabled="loading"
          >
            Back
          </button>
          <button
            class="btn btn-error gap-2"
            @click="handleSubmit"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <template v-else>
              <IconPackageExport class="w-4 h-4" />
              Confirm Stock Out
            </template>
          </button>
        </template>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
