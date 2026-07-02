<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconShoppingCart, IconCheck } from '@tabler/icons-vue'
import { getDefaultProductVariant, getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'add-to-cart'])

// Selected variant (default to first variant)
const selectedVariant = ref(null)

// Selected extras (array of extra objects)
const selectedExtras = ref([])

// Item notes
const notes = ref('')

// Quantity
const quantity = ref(1)

// Check if product has variants or extras
const hasVariants = computed(() => {
  return props.product.productDetails?.hasVariants === true
})

const hasExtras = computed(() => {
  return props.product.productDetails?.hasExtras === true
})

const variants = computed(() => {
  return props.product.productDetails?.variants || []
})

const extras = computed(() => {
  return props.product.productDetails?.extras || []
})

// Calculate total price
const itemTotal = computed(() => {
  const basePrice = selectedVariant.value
    ? getVariantEffectivePrice(props.product, selectedVariant.value)
    : getProductBasePrice(props.product)
  
  // Add extras
  const extrasTotal = selectedExtras.value.reduce((sum, extra) => sum + (extra.price || 0), 0)
  
  return (basePrice + extrasTotal) * quantity.value
})

const extrasSubtotal = computed(() => {
  return selectedExtras.value.reduce((sum, extra) => sum + (extra.price || 0), 0)
})

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Toggle extra
const toggleExtra = (extra) => {
  const index = selectedExtras.value.findIndex(e => e.name === extra.name)
  if (index > -1) {
    selectedExtras.value.splice(index, 1)
  } else {
    selectedExtras.value.push(extra)
  }
}

// Check if extra is selected
const isExtraSelected = (extra) => {
  return selectedExtras.value.some(e => e.name === extra.name)
}

// Reset state when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedVariant.value = getDefaultProductVariant(props.product)
    selectedExtras.value = []
    notes.value = ''
    quantity.value = 1
  }
})

// Handle add to cart
const handleAddToCart = () => {
  emit('add-to-cart', {
    product: props.product,
    variant: selectedVariant.value,
    extras: selectedExtras.value,
    notes: notes.value,
    quantity: quantity.value,
    unitPrice: itemTotal.value / quantity.value,
    totalPrice: itemTotal.value
  })
  emit('close')
}

// Increment/decrement quantity
const incrementQuantity = () => {
  quantity.value++
}

const decrementQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box max-w-2xl">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-bold">{{ product.name }}</h3>
            <p v-if="product.description" class="text-sm text-base-content/60 mt-1">
              {{ product.description }}
            </p>
          </div>
          <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-6">
          <!-- Variants Section -->
          <div v-if="hasVariants && variants.length > 1">
            <h4 class="font-semibold mb-3">Select Size <span class="text-error">*</span></h4>
            <div class="space-y-2">
              <label
                v-for="variant in variants"
                :key="variant.sku"
                class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-base-200"
                :class="{
                  'border-primary bg-primary/5': selectedVariant?.name === variant.name,
                  'border-base-300': selectedVariant?.name !== variant.name
                }"
              >
                <input
                  type="radio"
                  :name="`variant-${product.id}`"
                  class="radio radio-primary"
                  :checked="selectedVariant?.name === variant.name"
                  @change="selectedVariant = variant"
                />
                <div class="flex-1">
                  <div class="font-medium">{{ variant.name }}</div>
                </div>
                <div class="font-bold text-primary">
                  {{ formatCurrency(getVariantEffectivePrice(product, variant)) }}
                </div>
              </label>
            </div>
          </div>

          <!-- Extras Section -->
          <div v-if="hasExtras && extras.length > 0">
            <h4 class="font-semibold mb-3">Add Extras (Optional)</h4>
            <div class="space-y-2">
              <label
                v-for="extra in extras"
                :key="extra.name"
                class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-base-200"
                :class="{
                  'border-success bg-success/5': isExtraSelected(extra),
                  'border-base-300': !isExtraSelected(extra)
                }"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-success"
                  :checked="isExtraSelected(extra)"
                  @change="toggleExtra(extra)"
                />
                <div class="flex-1">
                  <div class="font-medium">{{ extra.name }}</div>
                </div>
                <div class="font-semibold text-success">
                  +{{ formatCurrency(extra.price) }}
                </div>
              </label>
            </div>
          </div>

          <!-- Notes Section -->
          <div>
            <h4 class="font-semibold mb-3">Special Instructions (Optional)</h4>
            <textarea
              v-model="notes"
              class="textarea textarea-bordered w-full"
              placeholder="e.g., No ice, Extra spicy, etc."
              rows="3"
            ></textarea>
          </div>

          <!-- Quantity -->
          <div>
            <h4 class="font-semibold mb-3">Quantity</h4>
            <div class="flex items-center gap-3">
              <button
                class="btn btn-circle btn-outline"
                @click="decrementQuantity"
                :disabled="quantity <= 1"
              >
                -
              </button>
              <div class="text-2xl font-bold w-16 text-center">{{ quantity }}</div>
              <button
                class="btn btn-circle btn-outline"
                @click="incrementQuantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Price Summary -->
        <div class="mt-6 p-4 bg-base-200 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span>Base Price:</span>
            <span>{{ formatCurrency(selectedVariant ? getVariantEffectivePrice(product, selectedVariant) : getProductBasePrice(product)) }}</span>
          </div>
          <div v-if="selectedExtras.length > 0" class="flex justify-between text-sm">
            <span>Extras:</span>
            <span class="text-success">+{{ formatCurrency(extrasSubtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Quantity:</span>
            <span>× {{ quantity }}</span>
          </div>
          <div class="divider my-2"></div>
          <div class="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span class="text-primary">{{ formatCurrency(itemTotal) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button class="btn btn-ghost" @click="$emit('close')">
            Cancel
          </button>
          <button
            class="btn btn-primary gap-2"
            @click="handleAddToCart"
            :disabled="hasVariants && !selectedVariant"
          >
            <IconShoppingCart class="w-5 h-5" />
            Add to Cart - {{ formatCurrency(itemTotal) }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="$emit('close')">
        <button>close</button>
      </form>
    </dialog>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  cursor: default;
}
</style>
