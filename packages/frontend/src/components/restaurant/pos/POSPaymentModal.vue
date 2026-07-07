<script setup>
import { ref, computed, watch } from 'vue'
import { IconCashRegister, IconPrinter, IconReceipt, IconLoader2 } from '@tabler/icons-vue'
import POSVoucherInput from '@/components/restaurant/pos/POSVoucherInput.vue'
import { useVouchers } from '@/composables/gym/voucher-management'
import { useTransactionSettings } from '@/composables/shared/useTransactionSettings'
import { usePaymentMethods } from '@/composables/shared/usePaymentMethods'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { BANK_OPTIONS, buildPaymentBankPayload } from '@/utils/paymentBanks'
import { getProductBasePrice, getVariantEffectivePrice } from '@/utils/restaurantPricing'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  cartItems: {
    type: Array,
    default: () => []
  },
  tables: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  printerSettings: {
    type: Object,
    default: () => ({})
  },
  initialVoucher: {
    type: Object,
    default: null
  },
  initialTable: {
    type: String,
    default: ''
  },
  initialOrderType: {
    type: String,
    default: 'dine-in'
  },
  prePrintLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit', 'open-drawer', 'print-receipt', 'open-voucher-modal', 'voucher-applied', 'voucher-cleared', 'pre-print'])

const selectedTable = ref('')
const orderType = ref('dine-in')
const paymentMethod = ref('cash')
const bankName = ref('')
const paymentNotes = ref('')
const customerName = ref('')
const customerPhone = ref('')
const notes = ref('')
const numberOfGuests = ref(1)
const voucherCode = ref('')
const selectedVoucher = ref(null)
const voucherDiscount = ref(0)
const paidAmount = ref(0)
const openDrawerOnComplete = ref(true)
const printReceiptOnComplete = ref(true)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const subtotal = computed(() => {
  return props.cartItems.reduce((sum, item) => {
    const itemPrice = item.unitPrice || item.product.price
    return sum + (itemPrice * item.quantity)
  }, 0)
})

// Use transaction settings composable
const { taxConfig, serviceChargeConfig, isTaxEnabled, isServiceChargeEnabled } = useTransactionSettings()

// Calculate service charge (for restaurant orders)
const serviceCharge = computed(() => {
  if (!isServiceChargeEnabled.value || !serviceChargeConfig.value) return 0
  
  const baseAfterDiscount = Math.max(0, subtotal.value - (voucherDiscount.value || 0))
  
  if (serviceChargeConfig.value.serviceChargeType === 'percentage') {
    return Math.round((baseAfterDiscount * serviceChargeConfig.value.serviceChargePercentage) / 100)
  }
  
  return Math.round(serviceChargeConfig.value.serviceChargePercentage || 0)
})

// Calculate tax from subtotal after voucher discount (NOT including service charge)
const tax = computed(() => {
  if (!isTaxEnabled.value || !taxConfig.value) return 0
  
  const baseSubtotal = subtotal.value || 0
  if (baseSubtotal <= 0) return 0

  const baseAfterDiscount = Math.max(0, baseSubtotal - (voucherDiscount.value || 0))
  
  if (taxConfig.value.taxType === 'percentage') {
    return Math.round((baseAfterDiscount * taxConfig.value.taxPercentage) / 100)
  }
  
  return Math.round(taxConfig.value.taxPercentage || 0)
})

const total = computed(() => {
  const final = subtotal.value - (voucherDiscount.value || 0) + serviceCharge.value + tax.value
  return final > 0 ? final : 0
})

const changeAmount = computed(() => {
  if (paymentMethod.value !== 'cash') return 0
  return Math.max(0, paidAmount.value - total.value)
})

const syncPaidAmountToTotal = () => {
  if (!props.show || orderType.value === 'dine-in' || paymentMethod.value !== 'cash') return
  paidAmount.value = total.value > 0 ? total.value : 0
}

const resetVoucherState = (shouldEmit = false) => {
  selectedVoucher.value = null
  voucherDiscount.value = 0
  voucherCode.value = ''

  if (shouldEmit) {
    emit('voucher-cleared')
  }
}

const { paymentOptions, defaultPaymentMethod, methodRequiresBank } = usePaymentMethods()

const selectedMethodRequiresBank = computed(() =>
  methodRequiresBank(paymentMethod.value)
)

const requiresBankSelection = computed(() => {
  return orderType.value !== 'dine-in' && selectedMethodRequiresBank.value
})

const isValid = computed(() => {
  // For dine-in (postpaid) we only require table selection
  if (orderType.value === 'dine-in') {
    return !!selectedTable.value
  }

  // For direct orders (takeaway/delivery) require customer info and payment
  if (!customerName.value && !customerPhone.value) return false
  if (requiresBankSelection.value && !bankName.value) return false
  if (paymentMethod.value === 'cash' && paidAmount.value < total.value) return false
  return true
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    // Reset form when modal opens, pre-fill from props
    selectedTable.value = props.initialTable || ''
    orderType.value = props.initialOrderType || 'dine-in'
    // default payment method: prefer cash if available, otherwise first enabled option
    paymentMethod.value = paymentOptions.value.find(p => p.value === 'cash')
      ? 'cash'
      : (defaultPaymentMethod.value || paymentOptions.value[0]?.value || 'cash')
    bankName.value = ''
    paymentNotes.value = ''
    customerName.value = ''
    customerPhone.value = ''
    notes.value = ''
    numberOfGuests.value = 1
    resetVoucherState()
    if (orderType.value !== 'dine-in' && props.initialVoucher) {
      voucherCode.value = props.initialVoucher.code || ''
      selectedVoucher.value = props.initialVoucher
    }
    paidAmount.value = 0
    syncPaidAmountToTotal()
  }
})

const handleSubmit = () => {
  if (!isValid.value) return

  // Build items with variants and extras support
  const items = props.cartItems.map(item => {
    const basePrice = item.variant
      ? getVariantEffectivePrice(item.product, item.variant)
      : getProductBasePrice(item.product)

    const itemData = {
      productId: item.product.id,
      quantity: item.quantity,
      price: basePrice, // Backend expects BASE price; it computes final price from base + extras
      notes: item.notes || ''
    }
    
    // Include variant name if not "Regular" (backend expects variantName)
    if (item.variant && item.variant.name !== 'Regular') {
      itemData.variantName = item.variant.name
    }
    
    // Include extras in backend-expected format: [{ id, quantity }]
    if (item.extras && item.extras.length > 0) {
      itemData.extras = item.extras.map(extra => ({
        id: extra.id,
        quantity: extra.quantity || 1
      }))
      
      if (import.meta.env.DEV) {
        console.log('Item with customization:', {
          product: item.product.name,
          variant: item.variant?.name,
          extras: itemData.extras
        })
      }
    }
    
    return itemData
  })

  let orderData = null

  if (orderType.value === 'dine-in') {
    // Postpaid dine-in order payload
    const selected = props.tables.find(t => t.id === selectedTable.value)
    orderData = {
      tableId: selectedTable.value || null,
      locationId: selected?.locationId || null,
      orderType: 'dine-in',
      numberOfGuests: numberOfGuests.value || 1,
      items,
      notes: notes.value || ''
    }
  } else {
    // Direct prepaid order (takeaway/delivery)
    // Determine locationId from available tables if possible
    const fallbackLocation = props.tables?.[0]?.locationId || null
    const payments = []
    // Build payments array according to allowed methods
    if (paymentMethod.value === 'cash') {
      payments.push({ method: 'cash', amount: paidAmount.value })
    } else if (
      paymentMethod.value === 'credit_card' ||
      paymentMethod.value === 'debit_card' ||
      paymentMethod.value === 'bank_transfer'
    ) {
      payments.push({
        method: paymentMethod.value,
        amount: total.value,
        ...buildPaymentBankPayload(paymentMethod.value, bankName.value),
        ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
      })
    } else {
      // Fallback: push as other with total
      payments.push({
        method: paymentMethod.value || 'other',
        amount: total.value,
        ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
      })
    }

    orderData = {
      locationId: fallbackLocation,
      orderType: orderType.value,
      customerName: customerName.value || null,
      customerPhone: customerPhone.value || null,
      items,
      payments,
      voucherCode: voucherCode.value || '',
      notes: notes.value || ''
    }
  }

  if (import.meta.env.DEV) {
    console.log('Submitting order with data:', orderData)
  }

  emit('submit', orderData)
}

const handleOpenDrawer = () => {
  emit('open-drawer')
}

// When voucher area is clicked, request parent (page) to open the voucher modal
const handleVoucherClicked = () => {
  emit('open-voucher-modal')
}

// Handle voucher applied from POSVoucherInput
const handleVoucherApplied = (v) => {
  selectedVoucher.value = v
  voucherCode.value = v?.code || ''
  // Prefer explicit discountAmount, otherwise compute from voucher data
  if (v?.discountAmount != null) {
    voucherDiscount.value = v.discountAmount || 0
  } else {
    const type = v.discountType || v.type || 'fixed'
    const value = parseFloat(v.discountValue || v.value || 0)
    if (type === 'percentage') {
      let discount = (subtotal.value * value) / 100
      if (v.maxDiscount && discount > v.maxDiscount) discount = v.maxDiscount
      if (v.maxDiscountAmount && discount > v.maxDiscountAmount) discount = v.maxDiscountAmount
      voucherDiscount.value = Math.min(discount, subtotal.value)
    } else {
      voucherDiscount.value = Math.min(value, subtotal.value)
    }
  }
  emit('voucher-applied', v)
}

// Handle voucher cleared from POSVoucherInput
const handleVoucherClearedEvent = () => {
  resetVoucherState(true)
}

// Watch initialVoucher prop to sync with parent
watch(
  () => props.initialVoucher,
  (nv) => {
    if (orderType.value === 'dine-in') {
      resetVoucherState()
      return
    }

    if (nv) {
      selectedVoucher.value = nv
      voucherCode.value = nv.code || ''
      // Calculate discount based on voucher type
      if (nv.discountType === 'percentage' || nv.type === 'percentage') {
        const val = nv.discountValue || nv.value || 0
        let discount = (subtotal.value * val) / 100
        if (nv.maxDiscountAmount && discount > nv.maxDiscountAmount) {
          discount = nv.maxDiscountAmount
        }
        voucherDiscount.value = discount
      } else {
        voucherDiscount.value = Math.min(nv.discountValue || nv.value || 0, subtotal.value)
      }
    } else {
      resetVoucherState()
    }
  },
  { immediate: true }
)

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

watch(
  () => orderType.value,
  () => {
    if (orderType.value === 'dine-in') {
      resetVoucherState(true)
      paidAmount.value = 0
      return
    }

    syncPaidAmountToTotal()
  }
)

const handleUpdateDiscount = (d) => {
  voucherDiscount.value = d || 0
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

// Pre-receipt print via API
const handlePrintPreReceipt = () => {
  // Build items data matching order structure for backend pre-print
  const items = props.cartItems.map(item => {
    const itemData = {
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.unitPrice || item.product.price,
      subtotal: (item.unitPrice || item.product.price) * item.quantity,
      notes: item.notes || ''
    }
    if (item.variant && item.variant.name !== 'Regular') {
      itemData.variantName = item.variant.name
    }
    if (item.extras && item.extras.length > 0) {
      itemData.extras = item.extras.map(e => ({
        name: e.name,
        price: e.price || 0,
        quantity: e.quantity || 1
      }))
    }
    return itemData
  })

  // Build payments array for pre-print body
  const payments = []
  if (orderType.value !== 'dine-in') {
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
  }

  emit('pre-print', {
    orderType: orderType.value,
    items,
    subtotal: subtotal.value,
    voucherCode: voucherCode.value || undefined,
    voucherDiscount: voucherDiscount.value || 0,
    serviceCharge: serviceCharge.value || 0,
    tax: tax.value || 0,
    total: total.value,
    customerName: customerName.value || undefined,
    tableId: selectedTable.value || undefined,
    notes: notes.value || undefined,
    // body fields for pre-print API
    discountAmount: voucherDiscount.value || 0,
    payments
  })
}
</script>

<template>
  <teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="max-w-2xl modal-box">
      <h3 class="mb-4 text-lg font-bold">Checkout</h3>

      <div class="space-y-4">
        <!-- Order Type -->
        <div class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Order Type</span>
          </label>
          <div class="w-full join join-vertical sm:join-horizontal">
            <input 
              type="radio" 
              name="orderType" 
              aria-label="Dine In" 
              class="join-item btn"
              value="dine-in"
              v-model="orderType"
            />
            <input 
              type="radio" 
              name="orderType" 
              aria-label="Takeaway" 
              class="join-item btn"
              value="takeaway"
              v-model="orderType"
            />
          </div>
        </div>

        <!-- Table Selection (only for dine-in) -->
        <div v-if="orderType === 'dine-in'" class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Select Table *</span>
          </label>
          <select 
            v-model="selectedTable" 
            class="w-full select select-bordered"
            required
          >
            <option value="">Choose a table...</option>
            <option 
              v-for="table in tables" 
              :key="table.id" 
              :value="table.id"
            >
              {{ table.tableNumber }} - {{ table.tableName }} ({{ table.capacity }} seats) - {{ table.status }} 
            </option>
          </select>
        </div>

        <div v-if="orderType === 'dine-in'" class="form-control">
          <label class="label">
            <span class="font-semibold label-text">Number of Guests</span>
          </label>
          <input
            type="number"
            v-model.number="numberOfGuests"
            min="1"
            class="w-full input input-bordered"
          />
        </div>

        <!-- Voucher input (reusable component) -->
        <div v-if="orderType !== 'dine-in'" class="form-control">
          <POSVoucherInput
            :subtotal="subtotal"
            :customerId="null"
            :disabled="loading"
            :initial-voucher="initialVoucher"
            @voucher-applied="handleVoucherApplied"
            @voucher-cleared="handleVoucherClearedEvent"
            @update:discount="handleUpdateDiscount"
            @voucher-clicked="handleVoucherClicked"
            @open-voucher-modal="handleVoucherClicked"
          />
        </div>

        <!-- Customer Info (only for direct/prepaid orders) -->
        <div v-if="orderType !== 'dine-in'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Customer Name</span>
            </label>
            <input 
              type="text" 
              v-model="customerName"
              placeholder="Jhon Doe" 
              class="w-full input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Customer Phone</span>
            </label>
            <input 
              type="tel" 
              v-model="customerPhone"
              placeholder="Optional" 
              class="w-full input input-bordered"
            />
          </div>
        </div>

        <!-- Payment Method (only for direct/prepaid orders) -->
        <div v-if="orderType !== 'dine-in'" class="form-control">
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
              v-for="bank in BANK_OPTIONS"
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
        <div v-if="orderType !== 'dine-in' && ['debit_card', 'credit_card', 'bank_transfer', 'e_wallet', 'qris'].includes(paymentMethod)" class="form-control">
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
        <div v-if="orderType !== 'dine-in' && paymentMethod === 'cash'" class="form-control">
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
            <span class="label-text">Order Notes</span>
          </label>
          <textarea 
            v-model="notes"
            class="w-full textarea textarea-bordered" 
            placeholder="Special instructions..."
            rows="2"
          ></textarea>
        </div>

        <!-- Print Pre-Receipt Button -->
        <div class="flex justify-center">
          <button
            type="button"
            class="btn btn-outline btn-sm gap-2"
            :disabled="prePrintLoading || cartItems.length === 0"
            @click="handlePrintPreReceipt"
          >
            <IconLoader2 v-if="prePrintLoading" class="w-4 h-4 animate-spin" />
            <IconReceipt v-else class="w-4 h-4" />
            {{ prePrintLoading ? 'Printing...' : 'Print Pre-Receipt' }}
          </button>
        </div>

        <!-- Order Summary -->
        <div class="card bg-base-200">
          <div class="p-4 card-body">
            <h4 class="mb-2 font-semibold">Order Summary</h4>
            
            <!-- Items List -->
            <div class="mb-3 space-y-2 text-sm border-b pb-3">
              <div v-for="(item, idx) in cartItems" :key="idx" class="space-y-1">
                <div class="flex justify-between">
                  <span class="font-medium">{{ item.quantity }}x {{ item.product.name }}</span>
                  <span>{{ formatCurrency((item.unitPrice || item.product.price) * item.quantity) }}</span>
                </div>
                <!-- Show variant -->
                <div v-if="item.variant && item.variant.name !== 'Regular'" class="ml-4">
                  <span class="badge badge-sm badge-primary">{{ item.variant.name }}</span>
                </div>
                <!-- Show extras -->
                <div v-if="item.extras && item.extras.length > 0" class="ml-4 space-y-0.5">
                  <div 
                    v-for="extra in item.extras" 
                    :key="extra.id"
                    class="flex justify-between text-xs text-base-content/60"
                  >
                    <span>
                      • {{ extra.name }}
                      <span v-if="extra.quantity > 1">(x{{ extra.quantity }})</span>
                    </span>
                    <span v-if="extra.price > 0">
                      +{{ formatCurrency(extra.price * (extra.quantity || 1)) }}
                    </span>
                  </div>
                </div>
                <!-- Show per-item notes -->
                <div v-if="item.notes" class="ml-4">
                  <span class="text-xs italic text-base-content/50">Note: {{ item.notes }}</span>
                </div>
              </div>
            </div>
            
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span>{{ formatCurrency(subtotal) }}</span>
              </div>
              <div v-if="voucherDiscount > 0" class="flex justify-between text-success">
                <span>Voucher Discount</span>
                <span>-{{ formatCurrency(voucherDiscount) }}</span>
              </div>
              <div v-if="serviceCharge > 0" class="flex justify-between">
                <span>Service Charge ({{ serviceChargeConfig?.serviceChargePercentage }}%)</span>
                <span>{{ formatCurrency(serviceCharge) }}</span>
              </div>
              <div v-if="tax > 0" class="flex justify-between">
                <span>Tax ({{ taxConfig?.taxPercentage }}%)</span>
                <span>{{ formatCurrency(tax) }}</span>
              </div>
              <div class="my-1 divider"></div>
              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary">{{ formatCurrency(total) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- POS Options -->
        <div class="card bg-base-200">
          <div class="p-4 card-body">
            <h4 class="mb-2 font-semibold">Options</h4>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="printReceiptOnComplete"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                />
                <span class="flex items-center gap-2">
                  <IconPrinter class="w-4 h-4" />
                  Print receipt after payment
                </span>
              </label>
              <label v-if="paymentMethod === 'cash'" class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="openDrawerOnComplete"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                />
                <span class="flex items-center gap-2">
                  <IconCashRegister class="w-4 h-4" />
                  Open cash drawer after payment
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button 
          class="btn btn-ghost" 
          @click="handleOpenDrawer"
          title="Open Cash Drawer"
        >
          <IconCashRegister class="w-5 h-5" />
        </button>
        <div class="flex-1"></div>
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
          <span v-else>Confirm Order</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
    </dialog>
  </teleport>
</template>
