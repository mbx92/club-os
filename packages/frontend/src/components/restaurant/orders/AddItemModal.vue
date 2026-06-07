<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const productId = ref('')
const quantity = ref(1)
const notes = ref('')

const selectedProduct = computed(() => {
  return props.products.find(p => p.id === productId.value)
})

const isValid = computed(() => {
  return productId.value && quantity.value > 0
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    productId.value = ''
    quantity.value = 1
    notes.value = ''
  }
})

const handleSubmit = () => {
  if (!isValid.value || !selectedProduct.value) return
  
  emit('submit', {
    productId: productId.value,
    quantity: quantity.value,
    price: selectedProduct.value.price,
    notes: notes.value || undefined
  })
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>

<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Add Item to Order</h3>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Product *</span>
          </label>
          <select 
            v-model="productId" 
            class="select select-bordered w-full"
            required
          >
            <option value="">Select product...</option>
            <option 
              v-for="product in products" 
              :key="product.id" 
              :value="product.id"
            >
              {{ product.name }} - {{ formatCurrency(product.price) }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Quantity *</span>
          </label>
          <input 
            type="number" 
            v-model.number="quantity"
            min="1"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea 
            v-model="notes"
            class="textarea textarea-bordered w-full" 
            placeholder="Special instructions..."
            rows="2"
          ></textarea>
        </div>

        <div v-if="selectedProduct" class="alert alert-info">
          <div class="text-sm">
            <div>Price: {{ formatCurrency(selectedProduct.price) }}</div>
            <div class="font-bold mt-1">Total: {{ formatCurrency(selectedProduct.price * quantity) }}</div>
          </div>
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
          <span v-else>Add Item</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>
