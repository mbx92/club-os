<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconPlus, IconMinus } from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const adjustmentType = ref('add')
const quantity = ref(0)
const reason = ref('')
const notes = ref('')

const adjustmentTypes = [
  { value: 'add', label: 'Stock In', color: 'success', icon: IconPlus },
  { value: 'remove', label: 'Stock Out', color: 'error', icon: IconMinus },
  { value: 'set', label: 'Adjustment', color: 'warning', icon: null }
]

const selectedType = computed(() => {
  return adjustmentTypes.find(t => t.value === adjustmentType.value)
})

const newStockLevel = computed(() => {
  const current = props.product.stockQuantity || 0
  const adj = quantity.value || 0
  
  if (adjustmentType.value === 'add') {
    return current + adj
  } else if (adjustmentType.value === 'remove') {
    return Math.max(0, current - adj)
  } else {
    return adj
  }
})

const stockLevelClass = computed(() => {
  const minLevel = props.product.minStockLevel || 0
  
  if (newStockLevel.value === 0) return 'text-error'
  if (newStockLevel.value <= minLevel) return 'text-warning'
  return 'text-success'
})

const resetForm = () => {
  adjustmentType.value = 'add'
  quantity.value = 0
  reason.value = ''
  notes.value = ''
}

const handleSubmit = () => {
  if (!quantity.value || quantity.value <= 0) {
    alert('Please enter a valid quantity')
    return
  }

  if (!reason.value.trim()) {
    alert('Please provide a reason for this adjustment')
    return
  }

  const adjustmentData = {
    productId: props.product.id,
    type: adjustmentType.value,
    quantity: quantity.value,
    reason: reason.value,
    notes: notes.value,
    previousQuantity: props.product.stockQuantity,
    newQuantity: newStockLevel.value
  }

  emit('submit', adjustmentData)
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
  <Teleport to="body">
    <div class="modal" :class="{ 'modal-open': modelValue }">
      <div class="modal-box max-w-2xl">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">
        <IconX class="w-5 h-5" />
      </button>
      
      <h3 class="font-bold text-lg mb-4">Adjust Stock</h3>
      
      <!-- Product Info -->
      <div class="bg-base-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-3">
          <img 
            :src="product.imageUrl || 'https://via.placeholder.com/80'" 
            :alt="product.name"
            class="w-16 h-16 rounded object-cover"
          />
          <div class="flex-1">
            <h4 class="font-semibold">{{ product.name }}</h4>
            <p class="text-sm text-base-content/60">{{ product.sku }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm text-base-content/60">Current Stock:</span>
              <span class="font-semibold">{{ product.stockQuantity || 0 }} {{ product.unit || 'pcs' }}</span>
            </div>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Adjustment Type -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Adjustment Type <span class="text-error">*</span></span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="type in adjustmentTypes"
              :key="type.value"
              type="button"
              class="btn"
              :class="{
                [`btn-${type.color}`]: adjustmentType === type.value,
                'btn-outline': adjustmentType !== type.value
              }"
              @click="adjustmentType = type.value"
            >
              <component v-if="type.icon" :is="type.icon" class="w-4 h-4 mr-2" />
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Quantity -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              {{ adjustmentType === 'set' ? 'New Quantity' : 'Quantity' }}
              <span class="text-error">*</span>
            </span>
          </label>
          <div class="flex gap-2 items-center">
            <input 
              v-model.number="quantity" 
              type="number" 
              min="0"
              step="1"
              :placeholder="adjustmentType === 'set' ? 'Enter new quantity' : 'Enter quantity to adjust'"
              class="input input-bordered flex-1 w-full"
              required
            />
            <span class="text-base-content/60">{{ product.unit || 'pcs' }}</span>
          </div>
        </div>

        <!-- New Stock Level Preview -->
        <div class="alert">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-semibold">New Stock Level:</span>
              <span :class="['text-xl font-bold', stockLevelClass]">
                {{ newStockLevel }} {{ product.unit || 'pcs' }}
              </span>
            </div>
            <div class="text-sm text-base-content/60 mt-1">
              <span v-if="adjustmentType === 'add'">
                Adding {{ quantity }} {{ product.unit || 'pcs' }} to current stock
              </span>
              <span v-else-if="adjustmentType === 'remove'">
                Removing {{ quantity }} {{ product.unit || 'pcs' }} from current stock
              </span>
              <span v-else>
                Setting stock to {{ quantity }} {{ product.unit || 'pcs' }}
              </span>
            </div>
            
            <!-- Warning if below min level -->
            <div v-if="newStockLevel <= (product.minStockLevel || 0) && newStockLevel > 0" class="text-warning text-sm mt-1">
              ⚠️ Stock will be below minimum level ({{ product.minStockLevel }})
            </div>
            <div v-if="newStockLevel === 0" class="text-error text-sm mt-1">
              ⚠️ Product will be out of stock
            </div>
          </div>
        </div>

        <!-- Reason -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Reason <span class="text-error">*</span></span>
          </label>
          <select v-model="reason" class="select select-bordered w-full" required>
            <option value="">Select reason</option>
            <optgroup v-if="adjustmentType === 'add'" label="Stock In Reasons">
              <option value="purchase">New Purchase</option>
              <option value="return">Customer Return</option>
              <option value="transfer_in">Transfer In</option>
              <option value="production">Production</option>
            </optgroup>
            <optgroup v-if="adjustmentType === 'remove'" label="Stock Out Reasons">
              <option value="sale">Sale</option>
              <option value="damage">Damage/Spoilage</option>
              <option value="waste">Waste</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="sample">Sample/Testing</option>
            </optgroup>
            <optgroup v-if="adjustmentType === 'set'" label="Adjustment Reasons">
              <option value="correction">Stock Count Correction</option>
              <option value="audit">Audit Adjustment</option>
              <option value="system_error">System Error Correction</option>
            </optgroup>
          </select>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Notes (Optional)</span>
          </label>
          <textarea 
            v-model="notes" 
            class="textarea textarea-bordered h-20 w-full" 
            placeholder="Additional notes about this adjustment..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal" :disabled="loading">
            Cancel
          </button>
          <button type="submit" :class="['btn', `btn-${selectedType.color}`]" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            Confirm Adjustment
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
    </div>
  </Teleport>
</template>
