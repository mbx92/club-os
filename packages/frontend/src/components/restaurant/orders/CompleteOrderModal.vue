<script setup>
import { ref, watch, computed } from 'vue'
import { IconReceipt, IconLoader2, IconArrowsRightLeft } from '@tabler/icons-vue'
import POSVoucherInput from '@/components/restaurant/pos/POSVoucherInput.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaymentMethods } from '@/composables/shared/usePaymentMethods'
import { useVouchers } from '@/composables/gym/voucher-management'
import { useTransactionSettings } from '@/composables/shared/useTransactionSettings'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { buildPaymentBankPayload } from '@/utils/paymentBanks'
import { usePaymentBanks } from '@/composables/shared/usePaymentBanks'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  initialVoucher: {
    type: Object,
    default: null
  },
  prePrintLoading: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close', 'submit', 'open-voucher-modal', 'voucher-applied', 'voucher-cleared', 'pre-print', 'move-table'])

const paymentMethod = ref('cash')
const bankName = ref('')
const paymentNotes = ref('')
const paidAmount = ref(0)
const notes = ref('')
const selectedVoucher = ref(null)

// Inline voucher dropdown (shown inside this modal) state
const showVoucherDropdown = ref(false)
const voucherSearch = ref('')
const voucherError = ref(null)
const errorVoucherId = ref(null)
const summaryCollapsed = ref(false)

const { vouchers: localVouchers, loading: vouchersLoading, fetchVouchers, validateVoucher } = useVouchers()

const openVoucherDropdown = async () => {
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
  await fetchVouchers({ status: 'active', limit: 100 })
  showVoucherDropdown.value = true
}

const closeVoucherDropdown = () => {
  showVoucherDropdown.value = false
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
}

const selectVoucherFromDropdown = async (voucher) => {
  voucherError.value = null
  errorVoucherId.value = null
  try {
    const validationData = {
      amount: subtotal.value || 0,
      applicableTo: 'all',
      itemIds: (props.order?.items || []).map(i => i.productId)
    }
    const response = await validateVoucher(voucher.code, validationData)
    if (response?.data?.validation?.isValid) {
      selectedVoucher.value = voucher
      closeVoucherDropdown()
      emit('voucher-applied', { ...voucher, discountAmount: response.data?.validation?.discountAmount ?? response.data?.validation?.discount ?? 0 })
    } else {
      voucherError.value = response?.data?.validation?.reason || 'This voucher cannot be applied'
      errorVoucherId.value = voucher.id
    }
  } catch (err) {
    voucherError.value = err.message || 'Failed to validate voucher'
    errorVoucherId.value = voucher.id
  }
}

const { paymentOptions, defaultPaymentMethod, methodRequiresBank } = usePaymentMethods()
const { bankOptions } = usePaymentBanks()

const selectedMethodRequiresBank = computed(() =>
  methodRequiresBank(paymentMethod.value)
)

// Voucher discount and totals computed locally
const subtotal = computed(() => {
  // Prefer server-provided subtotal if available (string), fallback to summing items
  const s = parseFloat(props.order?.subtotal || 0)
  if (s && s > 0) return s
  if (!props.order || !props.order.items) return 0
  return props.order.items.reduce((sum, it) => {
    const price = parseFloat(it.unitPrice || it.price || 0)
    const qty = parseFloat(it.quantity || 0)
    return sum + (price * qty)
  }, 0)
})

const voucherDiscount = computed(() => {
  const v = selectedVoucher.value || props.initialVoucher
  if (!v) return 0
  const type = v.discountType || v.type || 'fixed'
  const value = parseFloat(v.discountValue || v.value || 0)

  if (type === 'percentage') {
    let discount = (subtotal.value * value) / 100
    if (v.maxDiscount && discount > v.maxDiscount) discount = v.maxDiscount
    if (v.maxDiscountAmount && discount > v.maxDiscountAmount) discount = v.maxDiscountAmount
    return Math.min(discount, subtotal.value)
  }

  return Math.min(value, subtotal.value)
})

// Use transaction settings composable for tax and service charge
const auth = useAuthStore()
const { taxConfig, serviceChargeConfig, roundingConfig, isTaxEnabled, isServiceChargeEnabled, isRoundingEnabled, calculateRounding } = useTransactionSettings()

const tenantTransactionSettings = computed(() => auth.user?.tenant?.settings?.transaction || {})

// Compute tax using tenant settings when enabled; otherwise fall back to server-derived tax
const tenantTaxEnabled = computed(() => isTaxEnabled.value)
const tenantTaxPercentage = computed(() => taxConfig.value?.taxPercentage || 0)
const tenantTaxType = computed(() => taxConfig.value?.taxType || 'percentage')

// Determine tax rate from server-provided order tax (if available): taxRate = order.tax / order.subtotal
const serverTaxRate = computed(() => {
  const origSubtotal = parseFloat(props.order?.subtotal || 0)
  const origTax = parseFloat(props.order?.tax || 0)
  return origSubtotal > 0 ? (origTax / origSubtotal) : 0
})

// Determine service charge rate from server-provided order serviceCharge (if available)
const serverServiceChargeRate = computed(() => {
  const origSubtotal = parseFloat(props.order?.subtotal || 0)
  const origServiceCharge = parseFloat(props.order?.serviceCharge || 0)
  return origSubtotal > 0 ? (origServiceCharge / origSubtotal) : 0
})

// Calculate service charge (for restaurant orders)
const serviceCharge = computed(() => {
  const baseAfterDiscount = Math.max(0, subtotal.value - voucherDiscount.value)

  if (isServiceChargeEnabled.value && serviceChargeConfig.value) {
    if (serviceChargeConfig.value.serviceChargeType === 'percentage') {
      return Math.round((baseAfterDiscount * serviceChargeConfig.value.serviceChargePercentage) / 100)
    }
    return Math.round(serviceChargeConfig.value.serviceChargePercentage || 0)
  }

  // fallback to server-derived service charge rate (from saved order data)
  return Math.round(baseAfterDiscount * (serverServiceChargeRate.value || 0))
})

// Compute tax on the amount after discount (NOT including service charge)
const tax = computed(() => {
  const baseAfterDiscount = Math.max(0, subtotal.value - voucherDiscount.value)

  if (tenantTaxEnabled.value) {
    if (tenantTaxType.value === 'percentage') {
      return Math.round((baseAfterDiscount * tenantTaxPercentage.value) / 100)
    }
    // fixed tax amount per transaction
    return Math.round(tenantTaxPercentage.value || 0)
  }

  // fallback to server-derived tax rate
  return Math.round(baseAfterDiscount * (serverTaxRate.value || 0))
})

// Total after discount, service charge, then tax
// Rounding is recalculated from current tenant settings (NOT the stale props.order.roundingAmount)
const roundingAmount = computed(() => {
  if (!isRoundingEnabled.value) return 0
  const beforeRounding = subtotal.value - voucherDiscount.value + serviceCharge.value + tax.value
  return calculateRounding(beforeRounding).roundingAmount
})

const total = computed(() => {
  const beforeRounding = subtotal.value - voucherDiscount.value + serviceCharge.value + tax.value
  const final = beforeRounding + roundingAmount.value
  return final > 0 ? final : 0
})

const handleVoucherApplied = (v) => {
  selectedVoucher.value = v
  emit('voucher-applied', v)
}

const handleVoucherCleared = () => {
  selectedVoucher.value = null
  emit('voucher-cleared')
}

// Watch initialVoucher prop to sync with parent
watch(
  () => props.initialVoucher,
  (nv) => {
    selectedVoucher.value = nv || null
  },
  { immediate: true }
)

const changeAmount = computed(() => {
  if (paymentMethod.value !== 'cash') return 0
  return Math.max(0, paidAmount.value - total.value)
})

const syncPaidAmountToTotal = () => {
  if (!props.show || paymentMethod.value !== 'cash') return
  paidAmount.value = total.value > 0 ? total.value : 0
}

const requiresBankSelection = computed(() => {
  return selectedMethodRequiresBank.value
})

const isValid = computed(() => {
  if (requiresBankSelection.value && !bankName.value) return false
  if (paymentMethod.value === 'cash' && paidAmount.value < total.value) return false
  return true
})

watch(() => props.show, (newVal) => {
  if (newVal && props.order) {
    // choose default payment method: prefer cash if available, otherwise first enabled option
    paymentMethod.value = defaultPaymentMethod.value
    bankName.value = ''
    paymentNotes.value = ''
    notes.value = ''
    paidAmount.value = 0
    // Reset voucher state on each open
    selectedVoucher.value = props.initialVoucher || null
    syncPaidAmountToTotal()
  }
})

// Update paidAmount when total changes while modal is open
watch(
  () => total.value,
  () => {
    syncPaidAmountToTotal()
  }
)

watch(
  () => paymentMethod.value,
  () => {
    if (!selectedMethodRequiresBank.value) {
      bankName.value = ''
    }
    syncPaidAmountToTotal()
  }
)

const handleSubmit = () => {
  if (!isValid.value) return
  
  emit('submit', {
    paymentMethod: paymentMethod.value,
    paymentAmount: paymentMethod.value === 'cash' ? paidAmount.value : total.value,
    notes: notes.value || undefined,
    voucherCode: selectedVoucher.value?.code || undefined,
    ...buildPaymentBankPayload(paymentMethod.value, bankName.value),
    ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
  })
}

const handlePrePrint = () => {
  if (props.order?.id) {
    const payments = []
    if (paymentMethod.value === 'cash') {
      payments.push({ method: 'cash', amount: paidAmount.value || total.value })
    } else {
      payments.push({
        method: paymentMethod.value,
        amount: total.value,
        ...buildPaymentBankPayload(paymentMethod.value, bankName.value),
        ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
      })
    }

    emit('pre-print', {
      orderId: props.order.id,
      body: {
        voucherCode: selectedVoucher.value?.code || undefined,
        discountAmount: voucherDiscount.value || 0,
        payments
      }
    })
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const quickAmounts = computed(() => {
  const base = Math.ceil(total.value / 1000) * 1000
  return [
    base,
    base + 10000,
    base + 20000,
    base + 50000
  ]
})
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box">
        <h3 class="mb-4 text-lg font-bold">Complete Order</h3>

      <div class="space-y-4">
            <!-- Voucher selection -->
            <div class="relative form-control">
              <POSVoucherInput
                :subtotal="subtotal"
                :initial-voucher="initialVoucher || selectedVoucher"
                @voucher-applied="handleVoucherApplied"
                @voucher-cleared="handleVoucherCleared"
                @open-voucher-modal="openVoucherDropdown"
              />

              <!-- Inline voucher dropdown that expands downward and scrolls when long -->
              <div
                v-if="showVoucherDropdown"
                class="absolute left-0 right-0 z-50 p-2 mt-2 overflow-y-auto border rounded shadow bg-base-100 max-h-96"
                style="min-width: 20rem;"
              >
                <div class="mb-2 form-control">
                  <input
                    type="text"
                    placeholder="Search voucher by code or name..."
                    class="w-full input input-bordered"
                    v-model="voucherSearch"
                    @input="fetchVouchers({ search: voucherSearch, status: 'active', limit: 50 })"
                    autocomplete="off"
                  />
                </div>

                <div v-if="vouchersLoading" class="flex items-center justify-center py-6">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <div v-else-if="!localVouchers || localVouchers.length === 0" class="py-6 text-center text-base-content/60">
                  No vouchers found
                </div>

                <div v-else class="space-y-2">
                  <div v-for="voucher in localVouchers" :key="voucher.id">
                    <div @click="selectVoucherFromDropdown(voucher)" class="transition-all border-2 cursor-pointer card bg-base-100" :class="errorVoucherId === voucher.id ? 'border-error' : 'border-base-300 hover:border-primary hover:bg-base-200'">
                      <div class="p-3 card-body">
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <div class="font-semibold">{{ voucher.code }}</div>
                              <div class="badge badge-sm" :class="voucher.isActive ? 'badge-success' : 'badge-error'">{{ voucher.isActive ? 'Active' : 'Inactive' }}</div>
                            </div>
                            <div class="mt-1 text-sm text-base-content/60">{{ voucher.name }}</div>
                            <div class="mt-2 text-xs font-semibold text-success">
                              <span v-if="voucher.type === 'percentage' || voucher.discountType === 'percentage'">
                                {{ voucher.value || voucher.discountValue }}% OFF
                                <span v-if="voucher.maxDiscountAmount" class="text-base-content/60">(max {{ formatCurrency(voucher.maxDiscountAmount) }})</span>
                              </span>
                              <span v-else>
                                {{ formatCurrency(voucher.value || voucher.discountValue) }} OFF
                              </span>
                            </div>
                            <div class="mt-1 text-xs text-base-content/50">
                              <span v-if="voucher.minPurchaseAmount && parseFloat(voucher.minPurchaseAmount) > 0">Min. purchase: {{ formatCurrency(parseFloat(voucher.minPurchaseAmount)) }} • </span>
                              <span v-if="voucher.applicableTo">{{ voucher.applicableTo === 'all' ? 'All items' : voucher.applicableTo === 'membership' ? 'Membership only' : 'Products only' }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="errorVoucherId === voucher.id && voucherError" class="mt-2 alert alert-error">
                      <span class="text-sm">{{ voucherError }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-2 mt-3">
                  <button type="button" class="btn" @click="closeVoucherDropdown">Cancel</button>
                </div>
              </div>
            </div>
        <!-- Order Summary -->
        <div class="card bg-base-200">
          <div class="p-4 card-body">
            <button
              type="button"
              class="flex w-full items-center justify-between font-semibold"
              @click="summaryCollapsed = !summaryCollapsed"
            >
              <span>Order Summary</span>
              <svg
                class="w-4 h-4 transition-transform duration-200 text-base-content/60"
                :class="{ 'rotate-180': !summaryCollapsed }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>

            <div v-show="!summaryCollapsed" class="mt-2">

            <!-- Items list -->
            <div v-if="order?.items?.length" class="mb-3 space-y-1 text-sm">
              <div v-for="item in order.items" :key="item.id">
                <div class="flex justify-between items-start gap-2">
                  <span class="font-medium leading-tight">{{ item.quantity }}× {{ item.product?.name || item.itemName || item.productName || item.name }}</span>
                  <span class="font-semibold whitespace-nowrap">{{ formatCurrency((item.price || item.unitPrice || 0) * item.quantity) }}</span>
                </div>
                <!-- Extras rows -->
                <div
                  v-for="extra in (item.extras?.length ? item.extras : item.itemDetails?.extras)"
                  :key="extra.id || extra.extraId"
                  class="flex justify-between items-center gap-2 pl-2 mt-0.5"
                >
                  <span class="text-xs text-base-content/50 leading-tight">
                    + {{ extra.extra?.name || extra.name }}<template v-if="(extra.quantity || 1) > 1"> ×{{ extra.quantity }}</template>
                  </span>
                  <span v-if="parseFloat(extra.price || extra.extra?.price || 0) > 0" class="text-xs text-base-content/40 whitespace-nowrap">
                    {{ formatCurrency(parseFloat(extra.price || extra.extra?.price || 0) * (extra.quantity || 1)) }}
                  </span>
                </div>
              </div>
              <div class="my-1 divider"></div>
            </div>

            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span>{{ formatCurrency(subtotal) }}</span>
              </div>

              <div v-if="voucherDiscount > 0" class="flex justify-between text-success">
                <div>
                  <div class="font-medium">Voucher</div>
                  <div class="text-xs text-base-content/60">{{ (selectedVoucher?.code) || props.initialVoucher?.code || (selectedVoucher?.name) || props.initialVoucher?.name }}</div>
                </div>
                <div class="text-right">-{{ formatCurrency(voucherDiscount) }}</div>
              </div>

              <div class="flex justify-between">
                <span>Subtotal after discount</span>
                <span>{{ formatCurrency(Math.max(0, subtotal - voucherDiscount)) }}</span>
              </div>

              <div v-if="serviceCharge > 0" class="flex justify-between">
                <span>Service Charge <small class="text-base-content/60">({{ isServiceChargeEnabled && serviceChargeConfig ? serviceChargeConfig.serviceChargePercentage : (serverServiceChargeRate ? Math.round(serverServiceChargeRate * 100) : '—') }}%)</small></span>
                <span>{{ formatCurrency(serviceCharge) }}</span>
              </div>

              <div class="flex justify-between">
                <span>Tax <small class="text-base-content/60">({{ tenantTaxEnabled ? (tenantTaxType === 'percentage' ? tenantTaxPercentage + '%' : formatCurrency(tenantTaxPercentage)) : (serverTaxRate ? Math.round(serverTaxRate * 100) + '%' : '—') }})</small></span>
                <span>{{ formatCurrency(tax) }}</span>
              </div>

              <template v-if="roundingAmount !== 0">
                <div class="my-1 divider"></div>
                <div class="flex justify-between text-sm text-base-content/60">
                  <span>Sebelum Pembulatan</span>
                  <span>{{ formatCurrency(subtotal - voucherDiscount + serviceCharge + tax) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>
                    Pembulatan
                    <small class="text-base-content/50">(ke kelipatan {{ formatCurrency(roundingConfig?.roundingValue ?? 0) }})</small>
                  </span>
                  <span :class="roundingAmount >= 0 ? 'text-success' : 'text-error'">
                    {{ roundingAmount >= 0 ? '+' : '' }}{{ formatCurrency(roundingAmount) }}
                  </span>
                </div>
              </template>

              <div class="my-1 divider"></div>
              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary">{{ formatCurrency(total) }}</span>
              </div>
            </div>

            </div><!-- end collapsible -->

            <!-- Always-visible total when collapsed -->
            <div v-show="summaryCollapsed" class="flex justify-between text-base font-bold mt-2">
              <span>Total</span>
              <span class="text-primary">{{ formatCurrency(total) }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Method (dropdown) -->
        <div class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Payment Method</span>
          </label>
          <div>
            <select v-model="paymentMethod" class="w-full select select-bordered">
              <option disabled value="">Select payment method</option>
              <option v-for="opt in paymentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="requiresBankSelection" class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Nama Bank <span class="text-error">*</span></span>
          </label>
          <select
            v-model="bankName"
            class="w-full select select-bordered"
            :class="{ 'select-error': requiresBankSelection && !bankName }"
          >
            <option value="">-- Pilih Bank --</option>
            <option
              v-for="bank in bankOptions"
              :key="bank.value"
              :value="bank.value"
            >
              {{ bank.label }}
            </option>
          </select>
          <label v-if="requiresBankSelection && !bankName" class="label">
            <span class="label-text-alt text-error">Pilih bank/kartu terlebih dahulu</span>
          </label>
        </div>

        <!-- Payment Notes (non-cash) -->
        <div v-if="['debit_card', 'credit_card', 'bank_transfer', 'e_wallet', 'qris'].includes(paymentMethod)" class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Catatan Pembayaran</span>
          </label>
          <input
            v-model="paymentNotes"
            type="text"
            class="w-full input input-bordered"
            :placeholder="paymentMethod === 'debit_card' ? 'Contoh: Debit BCA *4821 a.n. John' : paymentMethod === 'credit_card' ? 'Contoh: CC Mandiri *9912 a.n. Jane' : paymentMethod === 'bank_transfer' ? 'Contoh: Transfer dari rek 123456789' : 'Catatan pembayaran'"
          />
        </div>

        <!-- Cash Payment Amount -->
        <div v-if="paymentMethod === 'cash'" class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Amount Paid *</span>
          </label>
          <CurrencyInput 
            v-model="paidAmount"
            :min="total"
            input-class="w-full input input-bordered"
          />
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="amount in quickAmounts"
              :key="amount"
              type="button"
              class="btn btn-sm btn-outline"
              @click="paidAmount = amount"
            >
              {{ formatCurrency(amount) }}
            </button>
          </div>
          <label class="label">
            <span class="font-semibold label-text-alt text-success">
              Change: {{ formatCurrency(changeAmount) }}
            </span>
          </label>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea 
            v-model="notes"
            class="w-full textarea textarea-bordered" 
            placeholder="Payment notes..."
            rows="2"
          ></textarea>
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
          <span v-else>Complete Order</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
    </dialog>
  </teleport>
</template>
