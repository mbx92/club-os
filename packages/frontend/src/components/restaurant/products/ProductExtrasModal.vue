<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconPlus, IconMinus, IconToolsKitchen2 } from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    required: true
  },
  extras: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])

// Variants from product.productDetails
const variants = computed(() => {
  return props.product?.productDetails?.variants || []
})

const hasVariants = computed(() => {
  return props.product?.productDetails?.hasVariants === true && variants.value.length > 1
})

// Selected state
const selectedVariant = ref(null)
const selectedExtras = ref([])

// Reset when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedExtras.value = []
    // Default variant to first one
    selectedVariant.value = hasVariants.value ? variants.value[0] : null
    
    // Auto-select first option for required radio groups
    Object.entries(props.extras).forEach(([groupName, extras]) => {
      const firstExtra = extras[0]
      if (firstExtra?.isRequired && firstExtra?.inputType === 'radio') {
        handleExtraToggle(firstExtra, groupName, 'radio')
      }
    })
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount))
}

const handleExtraToggle = (extra, groupName, inputType) => {
  if (inputType === 'radio') {
    // Radio: replace selection in same group
    selectedExtras.value = [
      ...selectedExtras.value.filter(e => e.groupName !== groupName),
      { 
        id: extra.id, 
        quantity: 1, 
        groupName,
        name: extra.name,
        price: parseFloat(extra.price) || 0
      }
    ]
  } else if (inputType === 'checkbox') {
    // Checkbox: toggle
    const exists = selectedExtras.value.find(e => e.id === extra.id)
    if (exists) {
      selectedExtras.value = selectedExtras.value.filter(e => e.id !== extra.id)
    } else {
      selectedExtras.value.push({ 
        id: extra.id, 
        quantity: 1, 
        groupName,
        name: extra.name,
        price: parseFloat(extra.price) || 0
      })
    }
  }
}

const isExtraSelected = (extraId) => {
  return selectedExtras.value.some(e => e.id === extraId)
}

const getExtraQuantity = (extraId) => {
  const extra = selectedExtras.value.find(e => e.id === extraId)
  return extra?.quantity || 1
}

const updateQuantity = (extraId, delta) => {
  const extra = selectedExtras.value.find(e => e.id === extraId)
  if (extra) {
    const newQty = extra.quantity + delta
    if (newQty >= 1 && newQty <= 10) {
      extra.quantity = newQty
    }
  }
}

// Price calculation: Variant Price (or base price) + Extras Total
const basePrice = computed(() => {
  if (selectedVariant.value) {
    return parseFloat(selectedVariant.value.price) || 0
  }
  return parseFloat(props.product.price) || 0
})

const extrasTotal = computed(() => {
  const total = selectedExtras.value.reduce((sum, sel) => {
    const price = parseFloat(sel.price) || 0
    const qty = parseInt(sel.quantity) || 1
    return sum + (price * qty)
  }, 0)
  return Math.round(total)
})

const calculateTotal = computed(() => {
  return Math.round(basePrice.value + extrasTotal.value)
})

// Validation
const missingRequiredGroups = computed(() => {
  const missing = []
  Object.entries(props.extras).forEach(([groupName, extras]) => {
    const hasRequired = extras.some(e => e.isRequired)
    if (hasRequired) {
      const hasSelection = extras.some(e => 
        selectedExtras.value.some(s => s.id === e.id)
      )
      if (!hasSelection) {
        missing.push(groupName)
      }
    }
  })
  return missing
})

const isValid = computed(() => {
  return missingRequiredGroups.value.length === 0
})

const handleConfirm = () => {
  if (!isValid.value) {
    return
  }
  
  emit('confirm', {
    productId: props.product.id,
    selectedVariant: selectedVariant.value,
    selectedExtras: selectedExtras.value,
    total: calculateTotal.value,
    extrasTotal: extrasTotal.value,
    variantPrice: basePrice.value
  })
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box max-w-3xl max-h-[85vh] p-0 flex flex-col">
        <!-- Header - Fixed -->
        <div class="sticky top-0 z-10 bg-base-100 border-b px-6 py-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-bold text-xl">Customize {{ product.name }}</h3>
              <p class="text-sm text-base-content/60 mt-1">
                Base price: {{ formatCurrency(product.price) }}
              </p>
            </div>
            <button @click="handleClose" class="btn btn-sm btn-circle btn-ghost">
              <IconX class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-16 px-6">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Content - Scrollable -->
        <div v-else class="flex-1 overflow-y-auto px-6 py-4">
          <div class="space-y-6">
            
            <!-- Variant Selection (if product has multiple variants) -->
            <div v-if="hasVariants">
              <div class="flex items-center gap-2 sticky top-0 bg-base-100 py-2 z-[5]">
                <h4 class="font-semibold text-base">Select Size</h4>
                <span class="badge badge-error badge-sm">Required</span>
              </div>
              <div class="space-y-2">
                <label 
                  v-for="variant in variants" 
                  :key="variant.sku"
                  class="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-all"
                  :class="{ 
                    'bg-primary/10 border-primary ring-1 ring-primary': selectedVariant?.sku === variant.sku,
                    'border-base-300': selectedVariant?.sku !== variant.sku
                  }"
                >
                  <input
                    type="radio"
                    name="variant"
                    :checked="selectedVariant?.sku === variant.sku"
                    @change="selectedVariant = variant"
                    class="radio radio-primary mt-0.5 flex-shrink-0"
                  />
                  <div class="flex-1 flex items-center justify-between gap-3">
                    <span class="font-medium">{{ variant.name }}</span>
                    <span class="font-bold text-primary whitespace-nowrap">
                      {{ formatCurrency(variant.price) }}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Extras Groups -->
            <div 
              v-for="([groupName, groupExtras], index) in Object.entries(extras)" 
              :key="index"
              class="space-y-3"
            >
              <!-- Group Header -->
              <div class="flex items-center gap-2 sticky top-0 bg-base-100 py-2 z-[5]">
                <h4 class="font-semibold text-base">{{ groupName }}</h4>
                <span 
                  v-if="groupExtras[0]?.isRequired" 
                  class="badge badge-error badge-sm"
                >
                  Required
                </span>
                <span 
                  v-else 
                  class="badge badge-ghost badge-sm"
                >
                  Optional
                </span>
              </div>

              <!-- Error for missing required -->
              <div 
                v-if="missingRequiredGroups.includes(groupName)"
                class="alert alert-error py-2 px-3 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Please select at least one option from {{ groupName }}</span>
              </div>

              <!-- Options -->
              <div class="space-y-2">
                <label 
                  v-for="extra in groupExtras" 
                  :key="extra.id"
                  class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-all"
                  :class="{ 
                    'bg-primary/10 border-primary ring-1 ring-primary': isExtraSelected(extra.id),
                    'border-base-300': !isExtraSelected(extra.id)
                  }"
                >
                  <!-- Radio/Checkbox -->
                  <input
                    :type="extra.inputType === 'radio' ? 'radio' : 'checkbox'"
                    :name="groupName"
                    :checked="isExtraSelected(extra.id)"
                    @change="handleExtraToggle(extra, groupName, extra.inputType)"
                    class="mt-1 flex-shrink-0"
                    :class="extra.inputType === 'radio' ? 'radio radio-primary' : 'checkbox checkbox-primary'"
                  />

                  <!-- Extra Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3">
                      <span class="font-medium">{{ extra.name }}</span>
                      <span class="font-semibold text-primary whitespace-nowrap">
                        {{ extra.price > 0 ? `+${formatCurrency(extra.price)}` : 'Free' }}
                      </span>
                    </div>

                    <!-- Quantity Controls (for checkbox only) -->
                    <div 
                      v-if="extra.inputType === 'checkbox' && isExtraSelected(extra.id)"
                      class="flex items-center gap-2 mt-3"
                    >
                      <span class="text-sm text-base-content/60">Qty:</span>
                      <div class="join">
                        <button 
                          type="button"
                          @click.stop.prevent="updateQuantity(extra.id, -1)"
                          class="btn btn-xs join-item"
                          :disabled="getExtraQuantity(extra.id) <= 1"
                        >
                          <IconMinus class="w-3 h-3" />
                        </button>
                        <div class="btn btn-xs join-item no-animation pointer-events-none">
                          {{ getExtraQuantity(extra.id) }}
                        </div>
                        <button 
                          type="button"
                          @click.stop.prevent="updateQuantity(extra.id, 1)"
                          class="btn btn-xs join-item"
                          :disabled="getExtraQuantity(extra.id) >= 10"
                        >
                          <IconPlus class="w-3 h-3" />
                        </button>
                      </div>
                      <span class="text-xs text-base-content/60">
                        ({{ formatCurrency(extra.price * getExtraQuantity(extra.id)) }})
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- No extras message (only if no variants either) -->
            <div v-if="Object.keys(extras).length === 0 && !hasVariants" class="text-center py-12 text-base-content/60">
              <IconToolsKitchen2 class="w-16 h-16 mx-auto mb-4 text-base-content/30" stroke="1.5" />
              <p class="font-medium">No customization options available</p>
              <p class="text-sm mt-1">This product has no extras</p>
            </div>
          </div>
        </div>

        <!-- Footer - Fixed -->
        <div class="sticky bottom-0 z-10 bg-base-100 border-t px-6 py-4">
          <!-- Price Summary -->
          <div class="bg-base-200 rounded-lg p-4 mb-4">
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-base-content/70">
                  {{ selectedVariant ? `${selectedVariant.name}` : 'Base Price' }}
                </span>
                <span class="font-medium">{{ formatCurrency(basePrice) }}</span>
              </div>
              <div v-if="extrasTotal > 0" class="flex justify-between text-sm">
                <span class="text-base-content/70">
                  Extras 
                  <span class="badge badge-primary badge-xs ml-1">{{ selectedExtras.length }}</span>
                </span>
                <span class="font-medium text-primary">+{{ formatCurrency(extrasTotal) }}</span>
              </div>
              <div class="divider my-1"></div>
              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary">{{ formatCurrency(calculateTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button 
              @click="handleClose" 
              class="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button 
              @click="handleConfirm" 
              class="btn btn-primary flex-1"
              :disabled="!isValid"
            >
              <IconPlus class="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop bg-black/50">
        <button type="button" @click="handleClose">close</button>
      </form>
    </dialog>
  </teleport>
</template>
