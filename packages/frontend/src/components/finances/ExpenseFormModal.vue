<template>
  <Teleport to="body">
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Expense' : 'Create New Expense' }}
      </h3>
      
      <div class="space-y-4">
        <!-- Title -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Title <span class="text-error">*</span></span>
          </label>
          <input
            v-model="formData.title"
            type="text"
            placeholder="Enter expense title"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.title }"
          />
          <label v-if="errors.title" class="label">
            <span class="label-text-alt text-error">{{ errors.title }}</span>
          </label>
        </div>

        <!-- Category and Location -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Category <span class="text-error">*</span></span>
            </label>
            <select
              v-model="formData.categoryId"
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.categoryId }"
            >
              <option value="">Select category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <label v-if="errors.categoryId" class="label">
              <span class="label-text-alt text-error">{{ errors.categoryId }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Location</span>
            </label>
            <select v-model="formData.locationId" class="select select-bordered w-full">
              <option value="">Select location (optional)</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Amount and Tax -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Amount <span class="text-error">*</span></span>
            </label>
            <CurrencyInput
              v-model="formData.amount"
              :min="0"
              placeholder="0"
              :input-class="errors.amount ? 'input input-bordered w-full input-error' : 'input input-bordered w-full'"
            />
            <label v-if="errors.amount" class="label">
              <span class="label-text-alt text-error">{{ errors.amount }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tax Amount</span>
            </label>
            <CurrencyInput
              v-model="formData.taxAmount"
              :min="0"
              placeholder="0"
              input-class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Total Amount (calculated) -->
        <div class="alert alert-info">
          <div>
            <span class="font-semibold">Total Amount:</span> 
            {{ formatCurrency(totalAmount) }}
          </div>
        </div>

        <!-- Expense Date and Due Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Expense Date <span class="text-error">*</span></span>
            </label>
            <input
              v-model="formData.expenseDate"
              type="date"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.expenseDate }"
            />
            <label v-if="errors.expenseDate" class="label">
              <span class="label-text-alt text-error">{{ errors.expenseDate }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Due Date</span>
            </label>
            <input
              v-model="formData.dueDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Vendor and Reference Number -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Vendor / Supplier</span>
              <span class="label-text-alt">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  @click="toggleVendorMode"
                >
                  {{ vendorMode === 'select' ? 'Input Manual' : 'Pilih dari Supplier' }}
                </button>
              </span>
            </label>
            <!-- Dropdown from suppliers data -->
            <select
              v-if="vendorMode === 'select'"
              class="select select-bordered w-full"
              :value="formData.supplierId"
              @change="onSupplierSelect"
            >
              <option value="">— Pilih Supplier —</option>
              <option
                v-for="s in supplierList"
                :key="s.id"
                :value="s.id"
              >
                {{ s.name }}<template v-if="s.code"> ({{ s.code }})</template>
              </option>
            </select>
            <!-- Manual text input -->
            <input
              v-else
              v-model="formData.vendor"
              type="text"
              placeholder="Nama vendor / supplier"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Reference Number</span>
            </label>
            <input
              v-model="formData.referenceNumber"
              type="text"
              placeholder="Invoice/reference number"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Payment Method and Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Sumber Dana</span>
            </label>
            <select v-model="formData.paymentOption" class="select select-bordered w-full">
              <option value="">Pilih sumber dana</option>
              <option v-for="option in paymentOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <label v-if="formData.paymentOption === 'cash_drawer_cash'" class="label">
              <span class="label-text-alt" :class="currentSession ? 'text-base-content/60' : 'text-warning'">
                {{ currentSession
                  ? `Kas tersedia di laci: ${formatCurrency(drawerExpectedCash ?? 0)}`
                  : 'Tidak ada shift kasir yang aktif' }}
              </span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="formData.status" class="select select-bordered w-full">
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <!-- Account selector (only when paying from finance account) -->
        <div v-if="formData.paymentOption === 'from_account'" class="form-control">
          <label class="label">
            <span class="label-text font-medium">Akun Sumber Dana <span class="text-error">*</span></span>
          </label>
          <div v-if="financeAccountsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
            <span class="loading loading-spinner loading-xs"></span> Memuat akun...
          </div>
          <select
            v-else
            v-model="formData.accountId"
            class="select select-bordered w-full"
            :class="{ 'select-error': errors.accountId }"
          >
            <option value="">Pilih akun (Tunai / Brankas / Bank)</option>
            <option v-for="account in expenseAccounts" :key="account.id" :value="String(account.id)">
              {{ account.name }}{{ account.bankName ? ` (${account.bankName})` : '' }} — {{ formatCurrency(account.balance) }}
            </option>
          </select>
          <label v-if="!expenseAccounts.length && !financeAccountsLoading" class="label">
            <span class="label-text-alt text-warning">Belum ada akun Tunai atau Bank. Buat di menu Finances → Akun.</span>
          </label>
          <label v-if="errors.accountId" class="label">
            <span class="label-text-alt text-error">{{ errors.accountId }}</span>
          </label>
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Description</span>
          </label>
          <textarea
            v-model="formData.description"
            placeholder="Enter expense description"
            class="textarea textarea-bordered w-full h-24"
          ></textarea>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            placeholder="Additional notes"
            class="textarea textarea-bordered w-full h-20"
          ></textarea>
        </div>

        <!-- Recurring Expense -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              v-model="formData.isRecurring"
              type="checkbox"
              class="checkbox checkbox-primary"
            />
            <span class="label-text font-medium">Recurring Expense</span>
          </label>
        </div>

        <!-- Recurring Options (shown if isRecurring is true) -->
        <div v-if="formData.isRecurring" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Frequency <span class="text-error">*</span></span>
            </label>
            <select
              v-model="formData.recurringFrequency"
              class="select select-bordered w-full"
              :class="{ 'select-error': errors.recurringFrequency }"
            >
              <option value="">Select frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <label v-if="errors.recurringFrequency" class="label">
              <span class="label-text-alt text-error">{{ errors.recurringFrequency }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">End Date</span>
            </label>
            <input
              v-model="formData.recurringEndDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Tags -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Tags</span>
          </label>
          <input
            v-model="tagsInput"
            type="text"
            placeholder="Enter tags separated by comma"
            class="input input-bordered w-full"
            @blur="updateTags"
          />
          <label class="label">
            <span class="label-text-alt">Separate multiple tags with commas</span>
          </label>
          <div v-if="formData.tags && formData.tags.length" class="flex flex-wrap gap-2 mt-2">
            <div
              v-for="(tag, index) in formData.tags"
              :key="index"
              class="badge badge-primary gap-1"
            >
              {{ tag }}
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-circle"
                @click="removeTag(index)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost" :disabled="loading">Cancel</button>
        </form>
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>{{ isEdit ? 'Update' : 'Create' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { useSuppliers, useAccounts } from '@/composables/finances'
import { useCashRegister } from '@/composables/gym/cash-register/useCashRegister'
import {
  EXPENSE_PAYMENT_OPTION_MAP,
  getExpensePaymentOptionsWithDrawer,
  resolveExpensePaymentOption,
  paymentMethodFromAccount,
  filterExpenseAccounts,
} from '@/utils/expensePayment'

const props = defineProps({
  expense: {
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
  },
  isCashier: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const modalRef = ref(null)
const errors = ref({})
const tagsInput = ref('')

const { suppliers: supplierList, fetchSuppliers } = useSuppliers()
const { accounts: financeAccounts, fetchAccounts: fetchFinanceAccounts, loading: financeAccountsLoading } = useAccounts()
const { currentSession, liveSummary, getCurrentSession } = useCashRegister()
const vendorMode = ref('select') // 'select' | 'manual'

const PAYMENT_OPTION_MAP = EXPENSE_PAYMENT_OPTION_MAP

const drawerExpectedCash = computed(() => {
  const value = liveSummary.value?.expectedCash
  return value == null ? null : Number(value)
})

const paymentOptions = computed(() => getExpensePaymentOptionsWithDrawer({
  isCashier: props.isCashier,
  hasSession: !!currentSession.value,
  expectedCash: drawerExpectedCash.value,
}))

const expenseAccounts = computed(() => filterExpenseAccounts(financeAccounts.value))

const resolvePaymentOption = (expense = null) =>
  resolveExpensePaymentOption(expense, { isCashier: props.isCashier })

const formData = ref({
  title: '',
  description: '',
  categoryId: '',
  locationId: '',
  amount: 0,
  taxAmount: 0,
  expenseDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  vendor: '',
  supplierId: '',
  referenceNumber: '',
  paymentOption: '',
  bankName: '',
  paymentNotes: '',
  vaultAccountId: '',
  accountId: '',
  status: 'draft',
  notes: '',
  isRecurring: false,
  recurringFrequency: '',
  recurringEndDate: '',
  tags: []
})

const isEdit = computed(() => !!props.expense)

const totalAmount = computed(() => {
  const amount = parseFloat(formData.value.amount) || 0
  const taxAmount = parseFloat(formData.value.taxAmount) || 0
  return amount + taxAmount
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const updateTags = () => {
  if (tagsInput.value) {
    formData.value.tags = tagsInput.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }
}

const removeTag = (index) => {
  formData.value.tags.splice(index, 1)
  tagsInput.value = formData.value.tags.join(', ')
}

const validate = () => {
  errors.value = {}
  
  if (!formData.value.title) {
    errors.value.title = 'Title is required'
  }
  
  if (!formData.value.categoryId) {
    errors.value.categoryId = 'Category is required'
  }
  
  if (!formData.value.amount || formData.value.amount <= 0) {
    errors.value.amount = 'Amount must be greater than 0'
  }
  
  if (!formData.value.expenseDate) {
    errors.value.expenseDate = 'Expense date is required'
  }
  
  if (formData.value.isRecurring && !formData.value.recurringFrequency) {
    errors.value.recurringFrequency = 'Frequency is required for recurring expenses'
  }

  if (formData.value.paymentOption === 'from_account' && !formData.value.accountId) {
    errors.value.accountId = 'Pilih akun sumber dana'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }
  
  const submitData = {
    ...formData.value,
    amount: parseFloat(formData.value.amount) || 0,
    taxAmount: parseFloat(formData.value.taxAmount) || 0
  }

  const paymentConfig = PAYMENT_OPTION_MAP[submitData.paymentOption]
  if (paymentConfig) {
    if (submitData.paymentOption === 'from_account') {
      const selectedAccount = expenseAccounts.value.find(a => String(a.id) === String(submitData.accountId))
      submitData.paymentMethod = paymentMethodFromAccount(selectedAccount)
      submitData.fundSource = 'account'
      if (selectedAccount?.bankName) submitData.bankName = selectedAccount.bankName
      delete submitData.vaultAccountId
    } else {
      // cash_drawer_cash (cashier)
      submitData.paymentMethod = paymentConfig.paymentMethod
      submitData.fundSource = paymentConfig.fundSource
      delete submitData.accountId
      delete submitData.vaultAccountId
      delete submitData.bankName
    }
  }

  delete submitData.paymentOption
  // Strip associations / read-only fields that may come from edit spread
  ;['id', 'expenseNumber', 'category', 'location', 'creator', 'approver', 'account', 'vaultAccount', 'tenant', 'createdAt', 'updatedAt', 'approvedAt', 'approvedBy', 'createdBy', 'totalAmount', 'version'].forEach((key) => {
    delete submitData[key]
  })

  // Remove empty fields
  Object.keys(submitData).forEach(key => {
    if (submitData[key] === '' || submitData[key] === null) {
      delete submitData[key]
    }
  })
  
  emit('submit', submitData)
}

const toggleVendorMode = () => {
  vendorMode.value = vendorMode.value === 'select' ? 'manual' : 'select'
  // Clear supplier linkage when switching to manual
  if (vendorMode.value === 'manual') {
    formData.value.supplierId = ''
  } else {
    formData.value.vendor = ''
    formData.value.supplierId = ''
  }
}

const onSupplierSelect = (event) => {
  const id = event.target.value
  formData.value.supplierId = id
  if (id) {
    const found = supplierList.value.find(s => String(s.id) === String(id))
    formData.value.vendor = found ? found.name : ''
  } else {
    formData.value.vendor = ''
  }
}

const open = (expense = null) => {
  // Fetch active suppliers for dropdown
  fetchSuppliers({ isActive: 'true', limit: 200, sortBy: 'name', sortOrder: 'ASC' })
  fetchFinanceAccounts({ isActive: 'true' })
  getCurrentSession().catch(() => null)

  if (expense) {
    formData.value = {
      title: expense.title || '',
      description: expense.description || '',
      categoryId: expense.categoryId || '',
      locationId: expense.locationId || '',
      amount: expense.amount ?? 0,
      taxAmount: expense.taxAmount ?? 0,
      expenseDate: expense.expenseDate?.split?.('T')?.[0] || expense.expenseDate || '',
      dueDate: expense.dueDate?.split?.('T')?.[0] || expense.dueDate || '',
      vendor: expense.vendor || '',
      supplierId: expense.supplierId || '',
      referenceNumber: expense.referenceNumber || '',
      paymentOption: resolvePaymentOption(expense),
      bankName: expense.bankName || '',
      paymentNotes: expense.paymentNotes || '',
      vaultAccountId: '',
      accountId: expense.accountId ? String(expense.accountId) : '',
      status: ['draft', 'pending'].includes(expense.status) ? expense.status : 'pending',
      notes: expense.notes || '',
      isRecurring: !!expense.isRecurring,
      recurringFrequency: expense.recurringFrequency || '',
      recurringEndDate: expense.recurringEndDate?.split?.('T')?.[0] || expense.recurringEndDate || '',
      tags: expense.tags || [],
    }
    tagsInput.value = expense.tags ? expense.tags.join(', ') : ''
    // If editing: if has supplierId → use select mode, else manual
    vendorMode.value = expense.supplierId ? 'select' : (expense.vendor ? 'manual' : 'select')
  } else {
    formData.value = {
      title: '',
      description: '',
      categoryId: '',
      locationId: '',
      amount: 0,
      taxAmount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      vendor: '',
      supplierId: '',
      referenceNumber: '',
      paymentOption: resolvePaymentOption(),
      bankName: '',
      paymentNotes: '',
      vaultAccountId: '',
      accountId: '',
      status: 'draft',
      notes: '',
      isRecurring: false,
      recurringFrequency: '',
      recurringEndDate: '',
      tags: []
    }
    tagsInput.value = ''
    vendorMode.value = 'select'
  }
  
  errors.value = {}
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
}

watch(() => formData.value.isRecurring, (newVal) => {
  if (!newVal) {
    formData.value.recurringFrequency = ''
    formData.value.recurringEndDate = ''
  }
})

watch(() => props.isCashier, (newVal) => {
  formData.value.paymentOption = newVal ? 'cash_drawer_cash' : 'from_account'
})

defineExpose({
  open,
  close
})
</script>
