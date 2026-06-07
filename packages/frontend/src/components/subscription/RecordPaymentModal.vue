<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Record Payment</h3>

      <!-- Invoice Info -->
      <div v-if="invoice" class="bg-base-200 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-base-content/60">Invoice Number</div>
            <div class="font-mono font-semibold">{{ invoice.invoiceNumber }}</div>
          </div>
          <div>
            <div class="text-sm text-base-content/60">Total Amount</div>
            <div class="text-xl font-bold text-primary">{{ formatCurrency(invoice.total) }}</div>
          </div>
          <div>
            <div class="text-sm text-base-content/60">Due Date</div>
            <div :class="isOverdue(invoice) ? 'text-error font-semibold' : ''">
              {{ formatDate(invoice.dueDate) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-base-content/60">Status</div>
            <div class="badge" :class="getInvoiceStatusBadgeClass(invoice.status)">
              {{ invoice.status }}
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Form -->
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Amount -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Amount <span class="text-error">*</span></span>
            </label>
            <CurrencyInput
              v-model="form.amount"
              :min="0"
              placeholder="Enter payment amount"
              :input-class="errors.amount ? 'input input-bordered w-full input-error' : 'input input-bordered w-full'"
              required
            />
            <label v-if="errors.amount" class="label">
              <span class="label-text-alt text-error">{{ errors.amount }}</span>
            </label>
          </div>

          <!-- Payment Method -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Payment Method <span class="text-error">*</span></span>
            </label>
            <select
              v-model="form.paymentMethod"
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.paymentMethod }"
              required
            >
              <option value="">Select payment method</option>
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="credit_card">Kartu</option>
              <option value="debit_card">Kartu Debit</option>
              <option value="qris">QRIS</option>
              <option value="e_wallet">E-Wallet (OVO, GoPay, Dana)</option>
              <option value="compliment">Gratis (Compliment)</option>
            </select>
            <label v-if="errors.paymentMethod" class="label">
              <span class="label-text-alt text-error">{{ errors.paymentMethod }}</span>
            </label>
          </div>

          <!-- Bank Name (credit_card / debit_card) -->
          <div v-if="['credit_card', 'debit_card'].includes(form.paymentMethod)" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Bank</span>
            </label>
            <input
              v-model="form.bankName"
              type="text"
              placeholder="Contoh: BCA, Mandiri, BRI, BNI"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Transaction ID / Reference -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Transaction ID / Reference</span>
            </label>
            <input
              v-model="form.transactionId"
              type="text"
              placeholder="Enter transaction ID or reference number"
              class="input input-bordered w-full"
            />
            <label class="label">
              <span class="label-text-alt text-base-content/60">
                Optional: For bank transfers, checks, or card payments
              </span>
            </label>
          </div>

          <!-- Payment Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Payment Date <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.paymentDate"
              type="date"
              :max="today"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.paymentDate }"
              required
            />
            <label v-if="errors.paymentDate" class="label">
              <span class="label-text-alt text-error">{{ errors.paymentDate }}</span>
            </label>
          </div>

          <!-- Notes -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
            </label>
            <textarea
              v-model="form.notes"
              placeholder="Add any additional notes about this payment..."
              class="textarea textarea-bordered w-full h-24"
              rows="3"
            ></textarea>
          </div>

          <!-- Auto-activation Notice -->
          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <div class="text-sm">
              <div class="font-semibold">Auto-Activation Enabled</div>
              <div class="text-base-content/70">
                The subscription will be automatically activated once this payment is recorded and the invoice is marked as paid.
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal" :disabled="loading">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Record Payment</span>
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IconInfoCircle } from '@tabler/icons-vue'
import { usePayments } from '@/composables/subscription/usePayments'
import { useInvoices } from '@/composables/subscription/useInvoices'
import { useSubscriptions } from '@/composables/subscription/useSubscriptions'
import { useNotification } from '@/composables/core/useNotification'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

// Props
const props = defineProps({
  invoice: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['submit', 'close'])

// Composables
const { processPayment, formatCurrency } = usePayments()
const { updateInvoiceStatus, isOverdue, getInvoiceStatusBadgeClass, formatDate } = useInvoices()
const { activateSubscription } = useSubscriptions()
const { showSuccess, showError } = useNotification()

// Local state
const modalRef = ref(null)
const loading = ref(false)
const form = ref({
  amount: 0,
  paymentMethod: '',
  bankName: '',
  transactionId: '',
  paymentDate: '',
  notes: ''
})
const errors = ref({})

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

// Watchers
watch(
  () => props.invoice,
  (newInvoice) => {
    if (newInvoice) {
      // Pre-fill form with invoice data
      form.value = {
        amount: parseFloat(newInvoice.total) || 0,
        paymentMethod: '',
        bankName: '',
        transactionId: '',
        paymentDate: today.value,
        notes: ''
      }
      errors.value = {}
    }
  },
  { immediate: true }
)

// Methods
const openModal = () => {
  modalRef.value?.showModal()
}

const closeModal = () => {
  modalRef.value?.close()
  resetForm()
  emit('close')
}

const resetForm = () => {
  form.value = {
    amount: 0,
    paymentMethod: '',
    bankName: '',
    transactionId: '',
    paymentDate: '',
    notes: ''
  }
  errors.value = {}
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.amount || form.value.amount <= 0) {
    errors.value.amount = 'Please enter a valid amount'
  }

  if (form.value.amount > props.invoice?.total) {
    errors.value.amount = 'Amount cannot exceed invoice total'
  }

  if (!form.value.paymentMethod) {
    errors.value.paymentMethod = 'Please select a payment method'
  }

  if (!form.value.paymentDate) {
    errors.value.paymentDate = 'Please select a payment date'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    // 1. Record the payment
    const paymentData = {
      invoiceId: props.invoice.id,
      subscriptionId: props.invoice.subscriptionId,
      tenantId: props.invoice.tenantId,
      amount: form.value.amount,
      paymentMethod: form.value.paymentMethod,
      ...(['credit_card', 'debit_card'].includes(form.value.paymentMethod) && form.value.bankName ? { paymentDetails: { bank: form.value.bankName } } : {}),
      transactionId: form.value.transactionId || null,
      paymentDate: form.value.paymentDate,
      notes: form.value.notes || null
    }

    await processPayment(paymentData)

    // 2. Update invoice status to 'paid' if full payment
    if (form.value.amount >= parseFloat(props.invoice.total)) {
      await updateInvoiceStatus(props.invoice.id, 'paid')

      // 3. Auto-activate the subscription
      if (props.invoice.subscriptionId) {
        await activateSubscription(props.invoice.subscriptionId)
        showSuccess('Payment recorded and subscription activated successfully!')
      } else {
        showSuccess('Payment recorded and invoice marked as paid!')
      }
    } else {
      // Partial payment
      showSuccess('Partial payment recorded successfully!')
    }

    emit('submit', paymentData)
    closeModal()
  } catch (error) {
    console.error('Error recording payment:', error)
    showError(error.response?.data?.message || 'Failed to record payment. Please try again.')
  } finally {
    loading.value = false
  }
}

// Expose methods to parent
defineExpose({
  openModal,
  closeModal
})
</script>
