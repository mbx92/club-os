<template>
  <Teleport to="body">
  <dialog ref="modalRef" class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ mode === 'create' ? 'Add New Income' : 'Edit Income' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <!-- Category & Location -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Category <span class="text-error">*</span></span>
            </label>
            <select
              v-model="formData.categoryId"
              class="select select-bordered w-full"
              required
            >
              <option value="">Select Category</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <select v-model="formData.locationId" class="select select-bordered w-full">
              <option value="">All Locations</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
              >
                {{ location.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Title -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Title <span class="text-error">*</span></span>
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g., Corporate Sponsorship Q1 2025"
            required
          />
        </div>

        <!-- Description -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Description</span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Additional details about this income"
          ></textarea>
        </div>

        <!-- Amount & Tax -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Amount <span class="text-error">*</span></span>
            </label>
            <CurrencyInput
              v-model="formData.amount"
              :min="0"
              placeholder="0"
              input-class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Tax Amount</span>
            </label>
            <CurrencyInput
              v-model="formData.taxAmount"
              :min="0"
              placeholder="0"
              input-class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Total Amount (Read-only) -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Total Amount</span>
          </label>
          <input
            :value="totalAmount"
            type="text"
            class="input input-bordered w-full"
            readonly
            disabled
          />
        </div>

        <!-- Income Date & Received Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Income Date <span class="text-error">*</span></span>
            </label>
            <input
              v-model="formData.incomeDate"
              type="date"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Received Date</span>
            </label>
            <input
              v-model="formData.receivedDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Payment Method & Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Payment Method</span>
            </label>
            <select v-model="formData.paymentMethod" class="select select-bordered w-full">
              <option value="">Select Method</option>
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="credit_card">Kartu Kredit</option>
              <option value="debit_card">Kartu Debit</option>
              <option value="qris">QRIS</option>
              <option value="e_wallet">E-Wallet (OVO, GoPay, Dana)</option>
              <option value="compliment">Gratis (Compliment)</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Status</span>
            </label>
            <select v-model="formData.status" class="select select-bordered w-full">
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <!-- Reference Number & Source -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Reference Number</span>
            </label>
            <input
              v-model="formData.referenceNumber"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g., SPON-2025-001"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Source</span>
            </label>
            <input
              v-model="formData.source"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g., PT ABC Corporation"
            />
          </div>
        </div>

        <!-- Recurring Options -->
        <div class="form-control mb-4">
          <label class="label cursor-pointer justify-start gap-2">
            <input
              v-model="formData.isRecurring"
              type="checkbox"
              class="checkbox checkbox-primary"
            />
            <span class="label-text">Recurring Income</span>
          </label>
        </div>

        <div v-if="formData.isRecurring" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Frequency <span class="text-error">*</span></span>
            </label>
            <select
              v-model="formData.recurringFrequency"
              class="select select-bordered w-full"
              :required="formData.isRecurring"
            >
              <option value="">Select Frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">End Date</span>
            </label>
            <input
              v-model="formData.recurringEndDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Notes -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            rows="2"
            placeholder="Additional notes or remarks"
          ></textarea>
        </div>

        <!-- Tags -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Tags</span>
          </label>
          <input
            v-model="tagsInput"
            type="text"
            class="input input-bordered w-full"
            placeholder="Type and press Enter to add tags"
            @keydown.enter.prevent="addTag"
          />
          <div v-if="formData.tags.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(tag, index) in formData.tags"
              :key="index"
              class="badge badge-primary gap-2"
            >
              {{ tag }}
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                @click="removeTag(index)"
              >
                ✕
              </button>
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ mode === 'create' ? 'Create Income' : 'Update Income' }}
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="handleClose">close</button>
    </form>
  </dialog>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create', // 'create' or 'edit'
    validator: (value) => ['create', 'edit'].includes(value)
  },
  income: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  },
  locations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const modalRef = ref(null)
const tagsInput = ref('')

const formData = ref({
  categoryId: '',
  locationId: '',
  title: '',
  description: '',
  amount: 0,
  taxAmount: 0,
  incomeDate: new Date().toISOString().split('T')[0],
  receivedDate: '',
  paymentMethod: '',
  referenceNumber: '',
  source: '',
  status: 'pending',
  isRecurring: false,
  recurringFrequency: '',
  recurringEndDate: '',
  notes: '',
  tags: []
})

const totalAmount = computed(() => {
  const amount = Number(formData.value.amount) || 0
  const tax = Number(formData.value.taxAmount) || 0
  return (amount + tax).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR'
  })
})

// Watch for income prop changes (edit mode)
watch(() => props.income, (newIncome) => {
  if (newIncome && props.mode === 'edit') {
    formData.value = {
      ...newIncome,
      incomeDate: newIncome.incomeDate?.split('T')[0] || '',
      receivedDate: newIncome.receivedDate?.split('T')[0] || '',
      recurringEndDate: newIncome.recurringEndDate?.split('T')[0] || '',
      tags: newIncome.tags || []
    }
  }
}, { immediate: true })

// Reset form when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen && props.mode === 'create') {
    resetForm()
  }
})

const addTag = () => {
  const tag = tagsInput.value.trim()
  if (tag && !formData.value.tags.includes(tag)) {
    formData.value.tags.push(tag)
    tagsInput.value = ''
  }
}

const removeTag = (index) => {
  formData.value.tags.splice(index, 1)
}

const resetForm = () => {
  formData.value = {
    categoryId: '',
    locationId: '',
    title: '',
    description: '',
    amount: 0,
    taxAmount: 0,
    incomeDate: new Date().toISOString().split('T')[0],
    receivedDate: '',
    paymentMethod: '',
    referenceNumber: '',
    source: '',
    status: 'pending',
    isRecurring: false,
    recurringFrequency: '',
    recurringEndDate: '',
    notes: '',
    tags: []
  }
  tagsInput.value = ''
}

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>
