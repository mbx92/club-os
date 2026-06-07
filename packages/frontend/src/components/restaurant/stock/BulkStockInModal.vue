<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconPackageImport,
  IconBox,
  IconMapPin,
  IconCurrencyDollar,
  IconFileText,
  IconNote,
  IconPlus,
  IconTrash,
  IconUpload
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
  locationId: '',
  reference: '',
  notes: '',
  items: []
})

// New item for adding
const newItem = ref({
  productId: '',
  quantity: 1,
  unitCost: 0
})

// Get product by ID
const getProduct = (productId) => {
  return props.products?.find(p => p.id === productId)
}

// Get available products (not already added)
const availableProducts = computed(() => {
  const addedIds = formData.value.items.map(i => i.productId)
  return props.products?.filter(p => !addedIds.includes(p.id)) || []
})

// Total items count
const totalItems = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + item.quantity, 0)
})

// Total value
const totalValue = computed(() => {
  return formData.value.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitCost)
  }, 0)
})

// Form validation
const isValid = computed(() => {
  return formData.value.locationId &&
         formData.value.items.length > 0 &&
         formData.value.items.every(item => 
           item.productId && item.quantity > 0 && item.unitCost >= 0
         )
})

// Can add new item
const canAddItem = computed(() => {
  return newItem.value.productId && 
         newItem.value.quantity > 0 &&
         newItem.value.unitCost >= 0
})

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Add item to list
const addItem = () => {
  if (!canAddItem.value) return
  
  const product = getProduct(newItem.value.productId)
  
  formData.value.items.push({
    productId: newItem.value.productId,
    productName: product?.name || '',
    productSku: product?.sku || '',
    quantity: newItem.value.quantity,
    unitCost: newItem.value.unitCost
  })
  
  // Reset new item form
  newItem.value = {
    productId: '',
    quantity: 1,
    unitCost: 0
  }
}

// Remove item from list
const removeItem = (index) => {
  formData.value.items.splice(index, 1)
}

// Update item quantity
const updateItemQuantity = (index, quantity) => {
  if (quantity > 0) {
    formData.value.items[index].quantity = quantity
  }
}

// Update item unit cost
const updateItemUnitCost = (index, unitCost) => {
  if (unitCost >= 0) {
    formData.value.items[index].unitCost = unitCost
  }
}

// Reset form
const resetForm = () => {
  formData.value = {
    locationId: '',
    reference: '',
    notes: '',
    items: []
  }
  newItem.value = {
    productId: '',
    quantity: 1,
    unitCost: 0
  }
}

// Handle submit
const handleSubmit = () => {
  if (!isValid.value) return
  const payload = { ...formData.value }
  // debug: log payload so we can trace whether parent/composable receives it
  console.log('[BulkStockInModal] submit payload:', payload)
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

// Watch for product selection to auto-fill unit cost
watch(() => newItem.value.productId, (productId) => {
  if (productId) {
    const product = getProduct(productId)
    newItem.value.unitCost = product?.costPrice || product?.price || 0
  }
})
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-4xl max-h-[90vh]">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <IconPackageImport class="w-5 h-5 text-success" />
        Bulk Stock In
      </h3>

      <div class="space-y-4">
        <!-- Header Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <!-- Add Item Section -->
        <div class="card bg-base-200">
          <div class="card-body py-4">
            <h4 class="font-semibold mb-3">Add Products</h4>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div class="md:col-span-5 form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Product</span>
                </label>
                <select
                  v-model="newItem.productId"
                  class="select select-bordered select-sm w-full"
                >
                  <option value="">Select product...</option>
                  <option
                    v-for="product in availableProducts"
                    :key="product.id"
                    :value="product.id"
                  >
                    {{ product.name }}
                  </option>
                </select>
              </div>
              <div class="md:col-span-2 form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Quantity</span>
                </label>
                <input
                  v-model.number="newItem.quantity"
                  type="number"
                  class="input input-bordered input-sm w-full"
                  min="1"
                  step="1"
                />
              </div>
              <div class="md:col-span-3 form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Unit Cost</span>
                </label>
                <CurrencyInput
                  v-model="newItem.unitCost"
                  :min="0"
                  placeholder="0"
                  input-class="input input-bordered input-sm w-full"
                />
              </div>
              <div class="md:col-span-2">
                <button
                  class="btn btn-success btn-sm w-full gap-1"
                  @click="addItem"
                  :disabled="!canAddItem"
                >
                  <IconPlus class="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Items List -->
        <div v-if="formData.items.length > 0" class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Product</th>
                <th class="w-24">Quantity</th>
                <th class="w-32">Unit Cost</th>
                <th class="w-32">Total</th>
                <th class="w-16"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in formData.items" :key="index">
                <td>
                  <div class="font-medium">{{ item.productName }}</div>
                  <div v-if="item.productSku" class="text-xs text-base-content/60">
                    {{ item.productSku }}
                  </div>
                </td>
                <td>
                  <input
                    :value="item.quantity"
                    @input="updateItemQuantity(index, Number($event.target.value))"
                    type="number"
                    class="input input-bordered input-sm w-20"
                    min="1"
                  />
                </td>
                <td>
                  <input
                    :value="item.unitCost"
                    @input="updateItemUnitCost(index, Number($event.target.value))"
                    type="number"
                    class="input input-bordered input-sm w-28"
                    min="0"
                    step="1000"
                  />
                </td>
                <td class="font-medium">
                  {{ formatCurrency(item.quantity * item.unitCost) }}
                </td>
                <td>
                  <button
                    class="btn btn-ghost btn-sm btn-square text-error"
                    @click="removeItem(index)"
                  >
                    <IconTrash class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8 text-base-content/60">
          <IconBox class="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No products added yet</p>
          <p class="text-sm">Add products using the form above</p>
        </div>

        <!-- Summary -->
        <div v-if="formData.items.length > 0" class="card bg-success/10 border border-success/30">
          <div class="card-body py-4">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-sm text-base-content/60">Products</div>
                <div class="text-2xl font-bold">{{ formData.items.length }}</div>
              </div>
              <div>
                <div class="text-sm text-base-content/60">Total Quantity</div>
                <div class="text-2xl font-bold">{{ totalItems }}</div>
              </div>
              <div>
                <div class="text-sm text-base-content/60">Total Value</div>
                <div class="text-2xl font-bold text-success">{{ formatCurrency(totalValue) }}</div>
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
            placeholder="Optional notes about this bulk stock in..."
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
          class="btn btn-success gap-2"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <template v-else>
            <IconUpload class="w-4 h-4" />
            Record Bulk Stock In
          </template>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
</template>
