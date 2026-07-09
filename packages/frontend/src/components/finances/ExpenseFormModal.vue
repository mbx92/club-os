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
              <span class="label-text font-medium">Payment Method</span>
            </label>
            <select v-model="formData.paymentOption" class="select select-bordered w-full">
              <option value="">Select payment method</option>
              <option v-for="option in paymentOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
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

        <!-- Bank Name + Payment Notes + Vault Account -->
        <div v-if="formData.paymentOption" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="formData.paymentOption === 'vault_cash'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Vault Account <span class="text-error">*</span></span>
            </label>
            <div v-if="vaultAccountsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
              <span class="loading loading-spinner loading-xs"></span> Memuat vault account...
            </div>
            <select v-else-if="vaultAccounts.length" v-model="formData.vaultAccountId" class="select select-bordered w-full">
              <option value="">Pilih vault account</option>
              <option v-for="account in vaultAccounts" :key="account.id" :value="account.id">
                {{ account.name }} — {{ formatCurrency(account.balance) }}
              </option>
            </select>
            <div v-else class="text-sm text-warning py-2">
              ⚠️ Belum ada vault account. Lakukan collect dari cash drawer untuk auto-create akun "Kas".
            </div>
          </div>
          <div v-if="formData.paymentOption === 'bank_transfer'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Bank</span>
            </label>
            <input
              v-model="formData.bankName"
              type="text"
              class="input input-bordered w-full"
              placeholder="Contoh: BCA, Mandiri, BRI"
            />
          </div>
          <div v-if="formData.paymentOption === 'bank_transfer'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Catatan Pembayaran</span>
            </label>
            <input
              v-model="formData.paymentNotes"
              type="text"
              class="input input-bordered w-full"
              placeholder="Contoh: Transfer dari rek 123456789"
            />
          </div>
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
import { useSuppliers, useVault } from '@/composables/finances'

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
const { vaultAccounts, fetchVaultAccounts, accountsLoading: vaultAccountsLoading } = useVault()
const vendorMode = ref('select') // 'select' | 'manual'

const PAYMENT_OPTION_MAP = {
  cash_drawer_cash: { paymentMethod: 'cash', fundSource: 'cash_drawer' },
  vault_cash: { paymentMethod: 'cash', fundSource: 'vault' },
  petty_cash: { paymentMethod: 'petty_cash' },
  bank_transfer: { paymentMethod: 'bank_transfer', fundSource: 'bank' },
}

const paymentOptions = computed(() => {
  if (props.isCashier) {
    return [{ value: 'cash_drawer_cash', label: 'Tunai' }]
  }

  return [
    { value: 'cash_drawer_cash', label: 'Tunai / Laci Kasir' },
    { value: 'vault_cash', label: 'Vault / Brankas' },
    { value: 'petty_cash', label: 'Petty Cash (Modal Awal)' },
    { value: 'bank_transfer', label: 'Transfer Bank' },
  ]
})

const resolvePaymentOption = (expense = null) => {
  if (!expense?.paymentMethod) {
    return props.isCashier ? 'cash_drawer_cash' : 'vault_cash'
  }

  if (expense.paymentMethod === 'petty_cash') return 'petty_cash'
  if (expense.paymentMethod === 'bank_transfer') return 'bank_transfer'
  if (expense.paymentMethod === 'cash' && expense.fundSource === 'vault') return 'vault_cash'
  return 'cash_drawer_cash'
}

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

  if (formData.value.paymentOption === 'vault_cash' && !formData.value.vaultAccountId) {
    errors.value.vaultAccountId = 'Pilih vault account sumber dana'
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
    submitData.paymentMethod = paymentConfig.paymentMethod
    if (paymentConfig.fundSource) {
      submitData.fundSource = paymentConfig.fundSource
    } else {
      delete submitData.fundSource
    }
  }

  delete submitData.paymentOption
  
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
  fetchVaultAccounts({ isActive: 'true' })

  if (expense) {
    formData.value = {
      ...expense,
      supplierId: expense.supplierId || '',
      paymentOption: resolvePaymentOption(expense),
      vaultAccountId: expense.vaultAccountId || '',
      expenseDate: expense.expenseDate?.split('T')[0] || '',
      dueDate: expense.dueDate?.split('T')[0] || '',
      recurringEndDate: expense.recurringEndDate?.split('T')[0] || '',
      tags: expense.tags || []
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
  if (newVal) {
    formData.value.paymentOption = 'cash_drawer_cash'
  }
})

defineExpose({
  open,
  close
})
</script>
