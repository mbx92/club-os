<script setup>
import { ref, computed, watch } from 'vue'
import { useServicePlans } from '@/composables/gym/service-management'
import { useTransactions } from '@/composables/gym/transactions'
import { useCurrency } from '@/composables/core/useCurrency'
import { usePaymentMethods } from '@/composables/shared/usePaymentMethods'
import { useTransactionSettings } from '@/composables/shared/useTransactionSettings'
import { buildPaymentBankPayload } from '@/utils/paymentBanks'
import { usePaymentBanks } from '@/composables/shared/usePaymentBanks'
import {
  IconShoppingBag,
  IconCash,
  IconPlus,
  IconMinus,
  IconX,
  IconCheck
} from '@tabler/icons-vue'

const emit = defineEmits(['close', 'saved'])

const { fetchPlans } = useServicePlans()
const { createAddonTransaction, loading } = useTransactions()
const { formatCurrency } = useCurrency()
const { availableMethods: availablePaymentMethods, getMethodLabel, methodRequiresBank } = usePaymentMethods()
const { bankOptions } = usePaymentBanks()
const { calculateTax, isTaxEnabled, taxConfig } = useTransactionSettings()

const selectedMethodRequiresBank = computed(() =>
  methodRequiresBank(selectedPaymentMethod.value)
)

// Data from parent (filled via openModal)
const member = ref(null) // { id, firstName, lastName } — null for walk-in

// Add-on plans
const addonPlans = ref([])
const plansLoading = ref(false)

// Cart: map of planId -> { plan, qty }
const cart = ref({})

const formatPaymentLabel = (method) => getMethodLabel(method)

const modal = ref(null)
const selectedPaymentMethod = ref('cash')
const paymentBankName = ref('')
const paymentNotes = ref('')

const error = ref(null)

// Computed
const cartItems = computed(() =>
  Object.values(cart.value).filter(entry => entry.qty > 0)
)

const subtotal = computed(() =>
  cartItems.value.reduce((sum, entry) => sum + entry.plan.price * entry.qty, 0)
)

const taxAmount = computed(() => calculateTax(subtotal.value))

const total = computed(() => Math.max(0, subtotal.value + taxAmount.value))

const taxLabel = computed(() => {
  if (!isTaxEnabled.value) return 'Tax'
  const cfg = taxConfig.value || {}
  if (cfg.taxType === 'fixed') return 'Tax'
  return `Tax (${cfg.taxPercentage || 0}%)`
})

const hasItems = computed(() => cartItems.value.length > 0)

const canSubmit = computed(() =>
  hasItems.value &&
  selectedPaymentMethod.value &&
  !loading.value &&
  (!selectedMethodRequiresBank.value || !!paymentBankName.value)
)

const memberName = computed(() => {
  if (!member.value) return 'Tamu'
  return `${member.value.firstName} ${member.value.lastName}`
})

// Methods
const loadAddonPlans = async () => {
  plansLoading.value = true
  try {
    const result = await fetchPlans({ serviceType: 'custom', isActive: 'true', limit: 100 })
    addonPlans.value = result?.data || []
  } catch (err) {
    addonPlans.value = []
  } finally {
    plansLoading.value = false
  }
}

const getQty = (planId) => cart.value[planId]?.qty || 0

const increment = (plan) => {
  if (!cart.value[plan.id]) {
    cart.value[plan.id] = { plan, qty: 0 }
  }
  cart.value[plan.id].qty++
}

const decrement = (plan) => {
  if (!cart.value[plan.id] || cart.value[plan.id].qty === 0) return
  cart.value[plan.id].qty--
  if (cart.value[plan.id].qty === 0) {
    delete cart.value[plan.id]
  }
}

const resetCart = () => {
  cart.value = {}
  selectedPaymentMethod.value = 'cash'
  paymentBankName.value = ''
  paymentNotes.value = ''
  error.value = null
}

watch(selectedPaymentMethod, () => {
  if (!selectedMethodRequiresBank.value) {
    paymentBankName.value = ''
  }
})

const handleSubmit = async () => {
  if (!canSubmit.value) return
  error.value = null

  try {
    const payload = {
      customerType: member.value ? 'member' : 'non-member',
      items: cartItems.value.map(entry => ({
        itemType: 'service_plan',
        itemId: entry.plan.id,
        itemName: entry.plan.name,
        quantity: entry.qty
      })),
      payments: [{
        paymentMethod: selectedPaymentMethod.value,
        amount: total.value,
        ...buildPaymentBankPayload(selectedPaymentMethod.value, paymentBankName.value),
        ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
      }],
      notes: 'Add-on check-in'
    }

    if (member.value) {
      payload.customerId = member.value.id
    }

    await createAddonTransaction(payload)
    emit('saved')
    closeModal()
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || 'Terjadi kesalahan'
  }
}

const closeModal = () => {
  modal.value?.close()
  resetCart()
  member.value = null
}

const skip = () => {
  emit('close')
  closeModal()
}

// Expose
const openModal = (memberData = null) => {
  member.value = memberData
  resetCart()
  modal.value?.showModal()
  loadAddonPlans()
}

defineExpose({ openModal })
</script>

<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-xl font-bold">Tambah Item Berbayar?</h3>
          <p class="text-sm text-base-content/60 mt-0.5">Check-in untuk <span class="font-semibold">{{ memberName }}</span></p>
        </div>
        <button type="button" @click="skip" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </div>

      <!-- Add-on Plans -->
      <div v-if="plansLoading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else-if="addonPlans.length === 0" class="alert alert-info mb-4">
        <span>Belum ada item add-on yang tersedia. Tambahkan ServicePlan dengan tipe <strong>custom</strong> di menu Service Plans.</span>
      </div>

      <div v-else class="space-y-2 mb-4">
        <div
          v-for="plan in addonPlans"
          :key="plan.id"
          class="flex items-center justify-between p-3 rounded-lg border border-base-300 hover:bg-base-100 transition-colors"
          :class="{ 'border-primary bg-primary/5': getQty(plan.id) > 0 }"
        >
          <div class="flex-1">
            <div class="font-semibold flex items-center gap-2">
              <IconShoppingBag class="w-4 h-4 text-primary" />
              {{ plan.name }}
              <span v-if="getQty(plan.id) > 0" class="badge badge-primary badge-sm">×{{ getQty(plan.id) }}</span>
            </div>
            <div class="text-sm text-base-content/60">{{ formatCurrency(plan.price) }} / sesi</div>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-if="getQty(plan.id) > 0"
              type="button"
              class="btn btn-xs btn-circle btn-outline"
              @click="decrement(plan)"
            >
              <IconMinus class="w-3 h-3" />
            </button>
            <span v-if="getQty(plan.id) > 0" class="w-6 text-center font-bold text-sm">{{ getQty(plan.id) }}</span>
            <button
              type="button"
              class="btn btn-xs btn-circle btn-primary"
              @click="increment(plan)"
            >
              <IconPlus class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Summary -->
      <div v-if="hasItems" class="bg-base-200 rounded-lg p-3 mb-4 space-y-1">
        <div
          v-for="entry in cartItems"
          :key="entry.plan.id"
          class="flex justify-between text-sm"
        >
          <span>{{ entry.plan.name }} ×{{ entry.qty }}</span>
          <span class="font-semibold">{{ formatCurrency(entry.plan.price * entry.qty) }}</span>
        </div>
        <div class="divider my-1"></div>
        <div class="flex justify-between text-sm">
          <span>Subtotal</span>
          <span class="font-semibold">{{ formatCurrency(subtotal) }}</span>
        </div>
        <div v-if="taxAmount > 0" class="flex justify-between text-sm">
          <span>{{ taxLabel }}</span>
          <span class="font-semibold">{{ formatCurrency(taxAmount) }}</span>
        </div>
        <div class="flex justify-between font-bold">
          <span>Total</span>
          <span class="text-primary">{{ formatCurrency(total) }}</span>
        </div>
      </div>

      <!-- Payment Method -->
      <div v-if="hasItems" class="form-control mb-4">
        <label class="label py-1">
          <span class="label-text font-semibold">
            <IconCash class="w-4 h-4 inline mr-1" />
            Metode Pembayaran
          </span>
        </label>
        <select v-model="selectedPaymentMethod" class="select select-bordered select-sm w-full">
          <option v-for="method in availablePaymentMethods" :key="method" :value="method">
            {{ formatPaymentLabel(method) }}
          </option>
        </select>
      </div>

      <!-- Bank detail (credit_card / debit_card) -->
      <div v-if="selectedMethodRequiresBank" class="form-control mb-2">
        <label class="label py-1">
          <span class="label-text">Nama Bank</span>
        </label>
        <select
          class="select select-bordered select-sm w-full"
          v-model="paymentBankName"
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
      </div>

      <div v-if="['credit_card', 'debit_card', 'bank_transfer'].includes(selectedPaymentMethod)" class="form-control mb-4">
        <label class="label py-1">
          <span class="label-text">Catatan Pembayaran</span>
        </label>
        <input
          type="text"
          class="input input-bordered input-sm w-full"
          :placeholder="selectedPaymentMethod === 'debit_card' ? 'Contoh: Debit BCA *4821 a.n. John' : selectedPaymentMethod === 'credit_card' ? 'Contoh: CC Mandiri *9912 a.n. Jane' : 'Contoh: Transfer dari rek 123456789'"
          v-model="paymentNotes"
        />
      </div>

      <!-- Error -->
      <div v-if="error" class="alert alert-error mb-4 text-sm">
        <IconX class="w-4 h-4" />
        <span>{{ error }}</span>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button type="button" @click="skip" class="btn btn-ghost flex-1">Lewati</button>
        <button
          type="button"
          :disabled="!canSubmit"
          @click="handleSubmit"
          class="btn btn-primary flex-1"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <IconCheck v-else class="w-4 h-4 mr-1" />
          Bayar {{ hasItems ? formatCurrency(total) : '' }}
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="skip">close</button>
    </form>
  </dialog>
</template>
