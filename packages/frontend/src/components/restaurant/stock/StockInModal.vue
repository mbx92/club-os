<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconPackageImport,
  IconBox,
  IconMapPin,
  IconCurrencyDollar,
  IconFileText,
  IconNote
} from '@tabler/icons-vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

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
  locationId: '',
  quantity: 1,
  unitCost: 0,
  reference: '',
  notes: ''
})

// Selected product
const selectedProduct = computed(() => {
  return props.products?.find(p => p.id === formData.value.productId)
})

// Total value
const totalValue = computed(() => {
  return formData.value.quantity * formData.value.unitCost
})

// Form validation
const isValid = computed(() => {
  return formData.value.productId &&
         formData.value.locationId &&
         formData.value.quantity > 0 &&
         formData.value.unitCost >= 0
})

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Reset form
const resetForm = () => {
  formData.value = {
    productId: '',
    locationId: '',
    quantity: 1,
    unitCost: 0,
    reference: '',
    notes: ''
  }
}

// Handle submit
const handleSubmit = () => {
  if (!isValid.value) return
  const payload = { ...formData.value }
  // debug: log payload so we can trace whether parent/composable receives it
  console.log('[StockInModal] submit payload:', payload)
  emit('submit', payload)
  // also emit a success event for parent shortcuts and close v-model
  emit('success', payload)
  emit('update:show', false)
}

// Close modal
const closeModal = () => {
  emit('close')
  // support v-model usage: update parent `show` binding
  emit('update:show', false)
  setTimeout(resetForm, 300)
}

// Watch for modal open
watch(() => props.show, (val) => {
  if (val) {
    resetForm()
  }
})

// Auto-fill unit cost from product
watch(() => formData.value.productId, (productId) => {
  if (productId && selectedProduct.value) {
    // Use last purchase price or cost price if available
    formData.value.unitCost = selectedProduct.value.costPrice || selectedProduct.value.price || 0
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
        <IconPackageImport class="w-5 h-5 text-success" />
        Record Stock In
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
          <label v-if="selectedProduct" class="label">
            <span class="label-text-alt">
              Current stock: {{ selectedProduct.stockQuantity || 0 }} {{ selectedProduct.unit || 'pcs' }}
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

        <!-- Quantity and Unit Cost -->
        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Quantity *</span>
            </label>
            <input
              v-model.number="formData.quantity"
              type="number"
              class="input input-bordered w-full"
              min="1"
              step="1"
              placeholder="Enter quantity"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text flex items-center gap-1">
                <IconCurrencyDollar class="w-4 h-4" />
                Unit Cost
              </span>
            </label>
            <CurrencyInput
              v-model="formData.unitCost"
              :min="0"
              placeholder="Enter unit cost"
              input-class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Total Value Display -->
        <div v-if="totalValue > 0" class="alert alert-success">
          <div class="flex justify-between w-full">
            <span>Total Value:</span>
            <span class="font-bold">{{ formatCurrency(totalValue) }}</span>
          </div>
        </div>

        <!-- Reference / PO Number -->
        <div class="form-control">
          <label class="label">
            <span class="label-text flex items-center gap-1">
              <IconFileText class="w-4 h-4" />
              Reference / PO Number
            </span>
          </label>
          <input
            v-model="formData.reference"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g., PO-2024-001"
          />
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
            placeholder="Optional notes about this stock in..."
            rows="3"
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
          class="btn btn-success gap-2"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <template v-else>
            <IconPackageImport class="w-4 h-4" />
            Record Stock In
          </template>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
