<script setup>
import { ref, computed, watch } from 'vue'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useVouchers } from '@/composables/gym/voucher-management'
import { IconTicket, IconX, IconCheck, IconAlertCircle, IconAlertTriangle } from '@tabler/icons-vue'

const props = defineProps({
  subtotal: {
    type: Number,
    default: 0
  },
  initialVoucher: {
    type: Object,
    default: null
  },
  customerId: {
    type: String,
    default: null
  },
  itemTypes: {
    type: Array,
    default: () => ['membership', 'product']
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['voucher-applied', 'voucher-cleared', 'update:discount', 'open-voucher-modal', 'voucher-clicked'])

const { formatCurrency } = useRestaurantBilling()
const { validateVoucher, fetchVouchers, vouchers, loading: vouchersLoading } = useVouchers()

const voucherCode = ref('')
const appliedVoucher = ref(null)
const validationError = ref('')
const isValidating = ref(false)
const showVoucherModal = ref(false)
const voucherSearch = ref('')
const errorVoucherId = ref(null)
const voucherError = ref('')

const availableVouchers = computed(() => {
  // handle both ref and plain arrays returned by the composable
  if (!vouchers) return []
  if (Array.isArray(vouchers)) return vouchers
  return vouchers.value || []
})

// Helper to get discount type (normalize 'type' field)
const getDiscountType = (voucher) => {
  return voucher.discountType || voucher.type || 'fixed'
}

// Helper to get discount value
const getDiscountValue = (voucher) => {
  return parseFloat(voucher.discountValue || voucher.value || 0)
}

// Helper to get max discount amount
const getMaxDiscount = (voucher) => {
  const maxDiscount = voucher.maxDiscount || voucher.maxDiscountAmount
  return maxDiscount ? parseFloat(maxDiscount) : null
}

// Helper to get min purchase amount
const getMinPurchase = (voucher) => {
  const minPurchase = voucher.minPurchase || voucher.minPurchaseAmount
  return minPurchase ? parseFloat(minPurchase) : 0
}

// Accept initial voucher from parent (e.g., when selected via modal)
watch(
  () => props.initialVoucher,
  (nv) => {
    if (nv) {
      const normalized = {
        ...nv,
        discountType: getDiscountType(nv),
        discountValue: getDiscountValue(nv),
        maxDiscount: getMaxDiscount(nv),
        minPurchaseAmount: getMinPurchase(nv)
      }
      appliedVoucher.value = normalized
      voucherCode.value = nv.code || ''
      const discount = computeDiscount(normalized)
      emit('voucher-applied', { ...normalized, discountAmount: discount })
      emit('update:discount', discount)
      validationError.value = ''
    }
  },
  { immediate: true }
)

// Compute discount metadata (amount, rawAmount, capped, capAmount)
const discountMeta = computed(() => {
  if (!appliedVoucher.value) return { amount: 0, rawAmount: 0, capped: false, capAmount: 0 }

  const voucher = appliedVoucher.value
  const type = getDiscountType(voucher)
  const value = getDiscountValue(voucher)

  // raw amount before caps
  let rawAmount = 0
  if (type === 'percentage') {
    rawAmount = (props.subtotal * value) / 100
  } else {
    rawAmount = value
  }

  // compute final capped amount
  const finalAmount = computeDiscount(appliedVoucher.value)

  // determine cap amount
  let capAmount = 0
  if (type === 'percentage') {
    const maxDiscount = getMaxDiscount(voucher)
    if (maxDiscount) capAmount = maxDiscount
  } else {
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
  if (!appliedVoucher.value) return ''
  const voucher = appliedVoucher.value
  const type = getDiscountType(voucher)
  const value = getDiscountValue(voucher)
  
  if (type === 'percentage') {
    return `${value}%`
  }
  return formatCurrency(value)
})

// Validate and apply voucher
const applyVoucher = async () => {
  if (!voucherCode.value.trim()) {
    validationError.value = 'Please enter a voucher code'
    return
  }
  
  isValidating.value = true
  validationError.value = ''
  
  try {
    const response = await validateVoucher(voucherCode.value.trim().toUpperCase(), {
      amount: props.subtotal,
      customerId: props.customerId,
      itemTypes: props.itemTypes
    })

    const validation = response?.data?.validation || response?.data || response
    if (validation?.isValid) {
      // Check minimum purchase before applying
      const minPurchase = getMinPurchase(validation)
      if (minPurchase > 0 && props.subtotal < minPurchase) {
        validationError.value = `Minimum purchase ${formatCurrency(minPurchase)} required. Current subtotal: ${formatCurrency(props.subtotal)}`
        isValidating.value = false
        return
      }
      
      // Prefer validation payload for computed discountAmount if available
      const discountAmountFromResp = validation.discountAmount ?? validation.discount ?? null
      const normalized = {
        code: voucherCode.value.trim().toUpperCase(),
        discountType: getDiscountType(validation),
        discountValue: getDiscountValue(validation),
        maxDiscount: getMaxDiscount(validation),
        minPurchaseAmount: getMinPurchase(validation),
        description: validation.description || validation.message || null,
        // keep raw discountAmount from server if provided
        discountAmount: discountAmountFromResp != null ? discountAmountFromResp : null
      }

      appliedVoucher.value = normalized

      // If server didn't provide final amount, compute locally
      if (appliedVoucher.value.discountAmount == null) {
        appliedVoucher.value.discountAmount = computeDiscount(appliedVoucher.value)
      }

      // Emit applied voucher and also update parent discount binding
      emit('voucher-applied', { ...appliedVoucher.value, discountAmount: appliedVoucher.value.discountAmount })
      emit('update:discount', appliedVoucher.value.discountAmount)
      validationError.value = ''
    } else {
      validationError.value = validation?.message || response?.data?.message || 'Invalid voucher code'
    }
  } catch (err) {
    validationError.value = err.response?.data?.message || err.message || 'Failed to validate voucher'
  } finally {
    isValidating.value = false
  }
}

// Open internal voucher modal (also emits event for parent if they want to handle it)
const openVoucherModal = async () => {
  // emit so parent can react if desired
  emit('open-voucher-modal')
  showVoucherModal.value = true
  try {
    await fetchVouchers()
  } catch (e) {
    // ignore — useVouchers manages loading/errors
  }
}

// Apply voucher selected from modal
const applySelectedVoucher = (v) => {
  if (!v) return
  
  const normalized = {
    ...v,
    discountType: getDiscountType(v),
    discountValue: getDiscountValue(v),
    maxDiscount: getMaxDiscount(v),
    minPurchaseAmount: getMinPurchase(v)
  }
  
  // Validate minimum purchase
  const minPurchase = normalized.minPurchaseAmount || 0
  if (minPurchase > 0 && props.subtotal < minPurchase) {
    validationError.value = `Minimum purchase ${formatCurrency(minPurchase)} required. Current subtotal: ${formatCurrency(props.subtotal)}`
    return
  }
  
  appliedVoucher.value = normalized
  voucherCode.value = v.code || ''
  const discount = computeDiscount(normalized)
  appliedVoucher.value.discountAmount = discount
  validationError.value = ''
  emit('voucher-applied', { ...appliedVoucher.value, discountAmount: discount })
  emit('update:discount', discount)
  showVoucherModal.value = false
}

// Close voucher modal
const closeVoucherModal = () => {
  showVoucherModal.value = false
  voucherSearch.value = ''
  errorVoucherId.value = null
  voucherError.value = ''
}

// Called on search input to fetch filtered vouchers
const onVoucherSearchInput = async () => {
  try {
    await fetchVouchers({ search: voucherSearch.value, status: 'active', limit: 20 })
  } catch (e) {
    // ignore - composable exposes loading/error state
  }
}

// Handler when a voucher is clicked in the list
const selectVoucher = (voucher) => {
  // Validate minimum purchase
  const minPurchase = getMinPurchase(voucher)
  if (minPurchase > 0 && props.subtotal < minPurchase) {
    voucherError.value = `Minimum purchase ${formatCurrency(minPurchase)} required. Current subtotal: ${formatCurrency(props.subtotal)}`
    errorVoucherId.value = voucher.id
    return
  }
  
  // Clear any previous errors
  voucherError.value = ''
  errorVoucherId.value = null
  
  applySelectedVoucher(voucher)
}

// Clear applied voucher
const clearVoucher = () => {
  voucherCode.value = ''
  appliedVoucher.value = null
  validationError.value = ''
  emit('voucher-cleared')
  emit('update:discount', 0)
}

// Re-validate when subtotal changes
// Re-validate / recalc when subtotal changes
watch(
  () => props.subtotal,
  () => {
    if (!appliedVoucher.value) return

    const newAmount = computeDiscount(appliedVoucher.value)

    // Avoid emitting if the discount amount didn't actually change to prevent recursive update loops
    const prev = Number(appliedVoucher.value.discountAmount || 0)
    const cur = Number(newAmount || 0)
    // round to integer (currency) for comparison
    if (Math.round(prev) === Math.round(cur)) return

    appliedVoucher.value = { ...appliedVoucher.value, discountAmount: newAmount }
    emit('voucher-applied', { ...appliedVoucher.value, discountAmount: newAmount })
    emit('update:discount', newAmount)
  }
)

// Helper to compute discount (copied from POSVoucherInput for parity)
function computeDiscount(voucher) {
  if (!voucher) return 0
  const type = getDiscountType(voucher)
  const value = getDiscountValue(voucher)

  if (type === 'percentage') {
    let discount = (props.subtotal * value) / 100
    const maxDiscount = getMaxDiscount(voucher)
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount
    }
    return discount
  } else {
    return Math.min(value, props.subtotal)
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <IconTicket class="w-5 h-5 text-base-content/60" />
      <span class="font-medium">Voucher</span>
    </div>

    <!-- Applied Voucher Display -->
    <div v-if="appliedVoucher" class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-success/10 border-success/20" role="button" tabindex="0" @click="$emit('voucher-clicked', appliedVoucher)" @keydown.enter.prevent="$emit('voucher-clicked', appliedVoucher)">
      <div class="p-2 rounded-full bg-success/20">
        <IconCheck class="w-4 h-4 text-success" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-success">{{ appliedVoucher.code }}</span>
          <span class="badge badge-success badge-sm">{{ discountDisplay }}</span>
        </div>
        <div class="text-sm text-base-content/70">
          Discount: <span class="font-medium">{{ formatCurrency(discountMeta.amount) }}</span>
          <span v-if="discountMeta.capped" class="text-xs text-base-content/60"> (max {{ formatCurrency(discountMeta.capAmount) }})</span>
        </div>
        <p v-if="appliedVoucher.description" class="text-xs text-base-content/60 mt-0.5 truncate">{{ appliedVoucher.description }}</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click.stop="clearVoucher" :disabled="disabled" title="Remove voucher">
        <IconX class="w-4 h-4" />
      </button>
    </div>

    <!-- Voucher Input (select modal for billing) -->
    <div v-else class="w-full join">
      <button
        type="button"
        class="flex-1 text-left btn btn-outline join-item"
        @click.prevent="openVoucherModal"
        :disabled="disabled"
      >
        <IconTicket class="w-4 h-4 mr-2" />
        <span>Select Voucher...</span>
      </button>
    </div>

    <!-- Voucher Selection Modal (page-level style) -->
    <Teleport to="body">
      <div ref="voucherModal" class="modal" :class="{ 'modal-open': showVoucherModal }" v-if="showVoucherModal">
        <div class="w-11/12 max-w-3xl modal-box">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Select Voucher</h3>
          <button type="button" @click="closeVoucherModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="mb-4 form-control">
          <input
            type="text"
            placeholder="Search voucher by code or name..."
            class="w-full input input-bordered"
            v-model="voucherSearch"
            @input="onVoucherSearchInput"
            autocomplete="off"
          />
        </div>

        <div class="overflow-y-auto max-h-96">
          <div v-if="vouchersLoading" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="!availableVouchers || availableVouchers.length === 0" class="py-12 text-center text-base-content/60">
            No vouchers found
          </div>
          <div v-else class="space-y-2">
            <div v-for="voucher in availableVouchers" :key="voucher.id || voucher.code">
              <div 
                @click="selectVoucher(voucher)" 
                class="transition-all border-2 cursor-pointer card bg-base-100" 
                :class="[
                  errorVoucherId === voucher.id ? 'border-error' : 'border-base-300 hover:border-primary hover:bg-base-200',
                  getMinPurchase(voucher) > props.subtotal ? 'opacity-50 cursor-not-allowed' : ''
                ]"
              >
                <div class="p-4 card-body">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold">{{ voucher.code }}</div>
                        <div class="badge badge-sm" :class="voucher.isActive ? 'badge-success' : 'badge-error'">{{ voucher.isActive ? 'Active' : 'Inactive' }}</div>
                        <div v-if="getMinPurchase(voucher) > props.subtotal" class="badge badge-sm badge-warning">Min. not met</div>
                      </div>
                      <div class="mt-1 text-sm text-base-content/60">{{ voucher.name }}</div>
                      <div class="mt-2 text-xs font-semibold text-success">
                        <span v-if="getDiscountType(voucher) === 'percentage'">
                          {{ getDiscountValue(voucher) }}% OFF
                          <span v-if="getMaxDiscount(voucher)" class="text-base-content/60">(max {{ formatCurrency(getMaxDiscount(voucher)) }})</span>
                        </span>
                        <span v-else>
                          {{ formatCurrency(getDiscountValue(voucher)) }} OFF
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-base-content/50">
                        <span v-if="getMinPurchase(voucher) > 0">Min. purchase: {{ formatCurrency(getMinPurchase(voucher)) }}</span>
                        <span v-if="getMinPurchase(voucher) > 0 && voucher.applicableTo"> • </span>
                        <span v-if="voucher.applicableTo">
                          {{ voucher.applicableTo === 'all' ? 'All items' : voucher.applicableTo === 'membership' ? 'Membership only' : voucher.applicableTo === 'product' ? 'Products only' : voucher.applicableTo }}
                        </span>
                      </div>
                      <div v-if="voucher.usageLimit" class="mt-1 text-xs text-base-content/50">
                        Used: {{ voucher.usageCount || 0 }} / {{ voucher.usageLimit }}
                      </div>
                    </div>
                    <IconTicket class="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div v-if="errorVoucherId === voucher.id && voucherError" class="mt-2 alert alert-error">
                <IconAlertTriangle class="w-5 h-5" />
                <span class="text-sm">{{ voucherError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeVoucherModal" class="btn">Cancel</button>
        </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" @click="closeVoucherModal">close</button>
        </form>
      </div>
    </Teleport>

    <!-- Validation Error -->
    <div v-if="validationError" class="py-2 alert alert-error">
      <IconAlertCircle class="w-5 h-5" />
      <span class="text-sm">{{ validationError }}</span>
    </div>

    <!-- no duplicate discount block; discount shown in applied voucher card -->
  </div>
</template>
