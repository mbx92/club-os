<script setup>
import { ref, computed, watch } from 'vue'
import { IconTag, IconCheck, IconX } from '@tabler/icons-vue'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'

const props = defineProps({
  subtotal: {
    type: Number,
    required: true
  },
  initialVoucher: {
    type: Object,
    default: null
  },
  customerId: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['voucher-applied', 'voucher-cleared', 'update:discount', 'voucher-clicked', 'open-voucher-modal'])

const { validateVoucher, loading } = useRestaurantOrders()
const voucherCode = ref('')
const validatedVoucher = ref(null)
const error = ref(null)
const isValidating = ref(false)

const hasVoucher = computed(() => !!validatedVoucher.value)

// Compute discount amount and whether it was capped by voucher limits
const discountMeta = computed(() => {
  if (!validatedVoucher.value) return { amount: 0, rawAmount: 0, capped: false, capAmount: 0 }

  const voucher = validatedVoucher.value
  const type = voucher.discountType || voucher.type || 'fixed'
  const value = voucher.discountValue || voucher.value || 0

  // raw amount before applying voucher caps or subtotal limits
  let rawAmount = 0
  if (type === 'percentage') {
    rawAmount = (props.subtotal * value) / 100
  } else {
    rawAmount = value
  }

  // compute final capped amount using existing helper for consistency
  const finalAmount = computeDiscount(voucher)

  // determine cap source (prefer explicit voucher caps)
  let capAmount = 0
  if (type === 'percentage') {
    if (voucher.maxDiscount) capAmount = voucher.maxDiscount
    else if (voucher.maxDiscountAmount) capAmount = voucher.maxDiscountAmount
  } else {
    // for fixed discounts, cap is effectively the subtotal
    capAmount = Math.min(value, props.subtotal)
  }

  const capped = finalAmount < rawAmount && capAmount > 0

  return {
    amount: finalAmount,
    rawAmount,
    capped,
    capAmount: capped ? capAmount : 0
  }
})

const discountDisplay = computed(() => {
  if (!validatedVoucher.value) return ''

  const voucher = validatedVoucher.value
  if (voucher.discountType === 'percentage') {
    return `${voucher.discountValue}%`
  }
  return formatCurrency(voucher.discountValue)
})

// applySelectedVoucher handled by page-level modal; keep simple validate by code if needed

const handleClear = () => {
  voucherCode.value = ''
  validatedVoucher.value = null
  error.value = null
  emit('voucher-cleared')
  emit('update:discount', 0)
}

const handleClickAppliedVoucher = () => {
  if (!validatedVoucher.value) return
  emit('voucher-clicked', validatedVoucher.value)
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Re-validate when subtotal changes (in case percentage discount)
watch(
  () => props.subtotal,
  () => {
    if (validatedVoucher.value) {
      emit('update:discount', discountMeta.value.amount)
    }
  }
)

// Accept initial voucher from parent (e.g., when selected via modal)
watch(
  () => props.initialVoucher,
  (nv) => {
    if (!nv) {
      // Parent cleared the voucher — reset internal state
      validatedVoucher.value = null
      voucherCode.value = ''
      error.value = null
      return
    }

    // When parent provides an initial voucher (e.g. selected from a page-level modal),
    // apply it once and avoid re-emitting if it's the same voucher already applied.
    if (nv) {
      // If the same voucher is already applied, do nothing.
      if (validatedVoucher.value && validatedVoucher.value.code === (nv.code || nv.code)) {
        return
      }

      const normalized = {
        ...nv,
        discountType: nv.discountType || nv.type || 'fixed',
        discountValue: nv.discountValue || nv.value || 0
      }

      // Set validated voucher first, then compute and emit a single applied event.
      validatedVoucher.value = normalized
      voucherCode.value = nv.code || ''

      const discount = computeDiscount(normalized)
      emit('voucher-applied', { ...normalized, discountAmount: discount })
      emit('update:discount', discount)
      error.value = null
    }
  },
  { immediate: true }
)

// Helper function to compute discount
function computeDiscount(voucher) {
  if (!voucher) return 0
  const type = voucher.discountType || voucher.type || 'fixed'
  const value = voucher.discountValue || voucher.value || 0
  
  if (type === 'percentage') {
    let discount = (props.subtotal * value) / 100
    if (voucher.maxDiscount && discount > voucher.maxDiscount) {
      discount = voucher.maxDiscount
    }
    if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
      discount = voucher.maxDiscountAmount
    }
    return discount
  } else {
    return Math.min(value, props.subtotal)
  }
}

// No onMounted fetch here — voucher modal is handled at page level
</script>

<template>
  <div class="space-y-2">
    <label class="py-1 label">
      <span class="font-medium label-text">Voucher (Optional)</span>
    </label>

    <!-- Open modal to select voucher (page-level modal) -->
    <div v-if="!hasVoucher" class="w-full join">
      <button
        type="button"
        class="flex-1 text-left btn btn-outline join-item"
        @click="$emit('open-voucher-modal')"
        :disabled="disabled"
      >
        <IconTag class="w-4 h-4 mr-2" />
        <span>Select Voucher...</span>
      </button>
    </div>

    <!-- Applied voucher display -->
    <div
      v-else
      class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-success/10 border-success/20"
      role="button"
      tabindex="0"
      @click="handleClickAppliedVoucher"
      @keydown.enter.prevent="handleClickAppliedVoucher"
    >
      <div class="p-2 rounded-full bg-success/20">
        <IconCheck class="w-4 h-4 text-success" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-success">{{ validatedVoucher.code }}</span>
          <span class="badge badge-success badge-sm">{{ discountDisplay }}</span>
        </div>
        <div class="text-sm text-base-content/70">
          Discount: <span class="font-medium">{{ formatCurrency(discountMeta.amount) }}</span>
          <span v-if="discountMeta.capped" class="text-xs text-base-content/60"> (max {{ formatCurrency(discountMeta.capAmount) }})</span>
        </div>
        <p v-if="validatedVoucher.description" class="text-xs text-base-content/60 mt-0.5 truncate">
          {{ validatedVoucher.description }}
        </p>
      </div>
      <button
        class="btn btn-ghost btn-sm btn-circle"
        @click.stop="handleClear"
        :disabled="disabled"
        title="Remove voucher"
      >
        <IconX class="w-4 h-4" />
      </button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="flex items-center gap-2 text-sm text-error">
      <IconX class="w-4 h-4" />
      {{ error }}
    </div>

    <!-- Voucher info hint -->
    <p v-if="!hasVoucher && !error" class="text-xs text-base-content/50">
      Enter a voucher code to get a discount
    </p>
  </div>
</template>
