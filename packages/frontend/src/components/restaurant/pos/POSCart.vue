<script setup>
import { ref, computed } from 'vue'
import { useTransactionSettings } from '@/composables/shared/useTransactionSettings'
import { IconTrash, IconPlus, IconMinus, IconPencil, IconX, IconShoppingCart, IconNote } from '@tabler/icons-vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  showCheckout: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:items', 'checkout', 'clear'])

// Track which items have the notes input expanded
const expandedNotes = ref(new Set())

const toggleNotes = (index) => {
  const s = new Set(expandedNotes.value)
  if (s.has(index)) {
    s.delete(index)
  } else {
    s.add(index)
  }
  expandedNotes.value = s
}

const { taxConfig, serviceChargeConfig, isTaxEnabled, isServiceChargeEnabled } = useTransactionSettings()

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const subtotal = computed(() => {
  return props.items.reduce((sum, item) => {
    const itemPrice = item.unitPrice || item.product.price
    return sum + (itemPrice * item.quantity)
  }, 0)
})

const serviceCharge = computed(() => {
  if (!isServiceChargeEnabled.value || !serviceChargeConfig.value) {
    if (import.meta.env.DEV) {
      console.log('[POSCart] Service charge disabled or config null:', {
        isEnabled: isServiceChargeEnabled.value,
        config: serviceChargeConfig.value
      })
    }
    return 0
  }
  
  if (serviceChargeConfig.value.serviceChargeType === 'percentage') {
    const amount = Math.round((subtotal.value * serviceChargeConfig.value.serviceChargePercentage) / 100)
    if (import.meta.env.DEV) {
      console.log('[POSCart] Service charge calculated:', {
        subtotal: subtotal.value,
        rate: serviceChargeConfig.value.serviceChargePercentage,
        amount
      })
    }
    return amount
  }
  
  return Math.round(serviceChargeConfig.value.serviceChargePercentage || 0)
})

const tax = computed(() => {
  if (!isTaxEnabled.value || !taxConfig.value) return 0
  
  // Tax calculated from subtotal only (NOT including service charge)
  if (taxConfig.value.taxType === 'percentage') {
    return Math.round((subtotal.value * taxConfig.value.taxPercentage) / 100)
  }
  
  return Math.round(taxConfig.value.taxPercentage || 0)
})

const total = computed(() => {
  return subtotal.value + serviceCharge.value + tax.value
})

const updateQuantity = (index, delta) => {
  const newItems = [...props.items]
  newItems[index].quantity += delta
  
  if (newItems[index].quantity <= 0) {
    newItems.splice(index, 1)
  }
  
  emit('update:items', newItems)
}

const updateNotes = (index, notes) => {
  const newItems = [...props.items]
  newItems[index].notes = notes
  emit('update:items', newItems)
}

const removeItem = (index) => {
  const newItems = [...props.items]
  newItems.splice(index, 1)
  emit('update:items', newItems)
}


</script>

<template>
  <div class="flex flex-col h-full bg-base-100">
    <!-- Cart Header (compact) - Fixed -->
    <div class="p-4 border-b flex-shrink-0 bg-base-100">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Cart</h2>
        <button 
          v-if="items.length > 0"
          class="btn btn-ghost btn-sm text-error"
          @click="$emit('clear')"
        >
          Clear
        </button>
      </div>
      <div class="mt-1 text-sm text-base-content/60">
        {{ items.length }} item{{ items.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Cart Items - Scrollable (shorter) -->
    <div class="flex-1 p-4 overflow-y-auto min-h-0 bg-base-200">
      <div v-if="items.length === 0" class="flex flex-col items-center justify-center h-full text-base-content/50 opacity-70">
        <IconShoppingCart class="w-16 h-16 mb-4" />
        <p class="mb-2 text-lg font-medium">Cart is empty</p>
        <p class="text-sm border border-transparent">Add items from the menu</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="(item, index) in items" 
          :key="index"
          class="shadow-sm card bg-base-100 border border-base-300"
        >
          <div class="p-4 card-body shrink-0 overflow-visible">
            <!-- Item Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h4 class="text-base font-semibold truncate">{{ item.product.name }}</h4>
                
                <!-- Show variant if available -->
                <div v-if="item.variant && item.variant.name !== 'Regular'" class="mt-1">
                  <span class="badge badge-sm badge-primary">{{ item.variant.name }}</span>
                </div>
                
                <!-- Show extras if available -->
                <div v-if="item.extras && item.extras.length > 0" class="mt-1 space-y-0.5">
                  <div 
                    v-for="(extra, extraIndex) in item.extras" 
                    :key="`extra-${index}-${extraIndex}`"
                    class="text-xs text-base-content/60 flex items-center gap-1"
                  >
                    <span>•</span>
                    <span>{{ extra.name }}</span>
                    <span v-if="extra.price > 0" class="text-success">
                      +{{ formatCurrency(extra.price) }}
                    </span>
                  </div>
                </div>
                
                <!-- Show notes if available -->
                <div v-if="item.notes && !expandedNotes.has(index)" class="mt-1">
                  <span class="text-xs italic text-base-content/50">Note: {{ item.notes }}</span>
                </div>
                
                <div class="mt-1 text-sm text-base-content/60">
                  {{ formatCurrency(item.unitPrice || item.product.price) }} each
                </div>
              </div>
              <button 
                class="btn btn-ghost btn-sm text-error"
                @click="removeItem(index)"
              >
                <IconTrash class="w-5 h-5" />
              </button>
            </div>

            <!-- Quantity Controls + Notes -->
            <div class="flex items-center justify-between mt-3">
              <div class="flex items-center gap-1">
                <div class="join">
                  <button 
                    class="join-item btn btn-xs"
                    @click="updateQuantity(index, -1)"
                  >
                    <IconMinus class="w-3 h-3" />
                  </button>
                  <div class="px-3 join-item btn btn-xs no-animation">
                    {{ item.quantity }}
                  </div>
                  <button 
                    class="join-item btn btn-xs"
                    @click="updateQuantity(index, 1)"
                  >
                    <IconPlus class="w-3 h-3" />
                  </button>
                </div>
                <button 
                  class="btn btn-ghost btn-xs"
                  :class="{ 'text-info': item.notes, 'text-base-content/40': !item.notes }"
                  @click="toggleNotes(index)"
                  title="Add note"
                >
                  <IconNote class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="btn btn-ghost btn-xs"
                  :class="{ 'text-primary': item.notes || expandedNotes.has(index) }"
                  :title="expandedNotes.has(index) ? 'Close notes' : 'Add notes'"
                  @click="toggleNotes(index)"
                >
                  <IconX v-if="expandedNotes.has(index)" class="w-3 h-3" />
                  <IconPencil v-else class="w-3 h-3" />
                </button>
                <div class="text-sm font-semibold text-primary">
                  {{ formatCurrency((item.unitPrice || item.product.price) * item.quantity) }}
                </div>
              </div>
            </div>

            <!-- Notes Input (expanded) -->
            <div v-if="expandedNotes.has(index)" class="mt-2">
              <textarea
                :value="item.notes || ''"
                rows="2"
                class="textarea textarea-bordered textarea-xs w-full text-xs"
                placeholder="Catatan untuk item ini (e.g. pedas level 3, tanpa bawang)"
                @input="updateNotes(index, $event.target.value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Summary (compact) - Fixed -->
    <div v-if="items.length > 0" class="p-4 space-y-3 border-t flex-shrink-0 bg-base-100">
      <!-- Totals -->
      <div class="space-y-2">
        <div class="flex justify-between text-base">
          <span class="text-base-content/60">Subtotal</span>
          <span>{{ formatCurrency(subtotal) }}</span>
        </div>
        <div v-if="serviceCharge > 0" class="flex justify-between text-base">
          <span class="text-base-content/60">Service Charge ({{ serviceChargeConfig?.serviceChargePercentage }}%)</span>
          <span>{{ formatCurrency(serviceCharge) }}</span>
        </div>
        <div v-if="tax > 0" class="flex justify-between text-base">
          <span class="text-base-content/60">Tax ({{ taxConfig?.taxPercentage }}%)</span>
          <span>{{ formatCurrency(tax) }}</span>
        </div>
        <div class="my-2 divider"></div>
        <div class="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span class="text-primary">{{ formatCurrency(total) }}</span>
        </div>
      </div>

      <!-- Checkout Button -->
      <button 
        v-if="showCheckout"
        class="btn btn-primary btn-block"
        @click="$emit('checkout')"
      >
        Checkout
      </button>
    </div>
  </div>
</template>
