<route lang="yaml">
meta:
  title: Pengeluaran
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Pengeluaran</h1>
        <p class="text-base-content/60 mt-1">Lacak dan kelola semua pengeluaran Anda</p>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-outline"
          @click="router.push('/finances/categories')"
        >
          <IconTag class="w-4 h-4 mr-2" />
          Kelola Kategori
        </button>
        <button
          class="btn btn-outline"
          @click="router.push('/finances/suppliers')"
        >
          <IconTruck class="w-4 h-4 mr-2" />
          Kelola Supplier
        </button>
        <button
          class="btn btn-primary"
          @click="openCreateModal"
        >
          <IconPlus class="w-4 h-4 mr-2" />
          Tambah Pengeluaran
        </button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Pencarian</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari pengeluaran..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="pending">Tertunda</option>
              <option value="approved">Disetujui</option>
              <option value="paid">Dibayar</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <!-- Category Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Kategori</span>
            </label>
            <select v-model="filters.categoryId" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Start Date -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Tanggal Mulai</span>
            </label>
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered w-full"
              @change="handleSearch"
            />
          </div>

          <!-- End Date -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Tanggal Akhir</span>
            </label>
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered w-full"
              @change="handleSearch"
            />
          </div>

          <!-- Limit -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Tampilkan</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered w-full" @change="handleSearch">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- Active Filters -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Filter aktif:</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="filters.search"
              class="badge badge-primary badge-outline gap-1"
              @click="clearFilter('search')"
            >
              Pencarian: "{{ filters.search }}" ✕
            </button>
            <button
              v-if="filters.status"
              class="badge badge-primary badge-outline gap-1"
              @click="clearFilter('status')"
            >
              Status: {{ filters.status }} ✕
            </button>
            <button
              v-if="filters.categoryId"
              class="badge badge-primary badge-outline gap-1"
              @click="clearFilter('categoryId')"
            >
              Kategori ✕
            </button>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Hapus Semua</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Expenses Table -->
    <div v-else-if="hasExpenses" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Nomor Pengeluaran</th>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Vendor</th>
                <th class="text-right">Jumlah</th>
                <th class="text-center">Status</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="expense in expenses" :key="expense.id">
                <td>
                  <span class="font-mono text-sm">{{ expense.expenseNumber }}</span>
                </td>
                <td>
                  <div class="font-semibold">{{ expense.title }}</div>
                  <div v-if="expense.description" class="text-sm text-base-content/60 truncate max-w-xs">
                    {{ expense.description }}
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <div
                      v-if="expense.category?.color"
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: expense.category.color }"
                    ></div>
                    <span>{{ expense.category?.name || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div>{{ formatDate(expense.expenseDate) }}</div>
                  <div v-if="expense.dueDate" class="text-xs text-base-content/60">
                    Due: {{ formatDate(expense.dueDate) }}
                  </div>
                </td>
                <td>{{ expense.vendor || '-' }}</td>
                <td class="text-right">
                  <div class="font-semibold">{{ formatCurrency(expense.totalAmount) }}</div>
                  <div v-if="expense.taxAmount > 0" class="text-xs text-base-content/60">
                    Tax: {{ formatCurrency(expense.taxAmount) }}
                  </div>
                </td>
                <td class="text-center">
                  <div :class="getStatusBadgeClass(expense.status)">
                    {{ formatStatus(expense.status) }}
                  </div>
                </td>
                <td class="text-center">
                  <div class="flex justify-center gap-2">
                    <!-- Approve Button (only for pending) -->
                    <button
                      v-if="expense.status === 'pending'"
                      class="btn btn-success btn-sm"
                      @click="handleApprove(expense)"
                      :disabled="actionLoading"
                    >
                      <IconCheck class="w-4 h-4" />
                    </button>
                    
                    <!-- Mark as Paid Button (only for approved) -->
                    <button
                      v-if="expense.status === 'approved'"
                      class="btn btn-info btn-sm"
                      @click="handleMarkAsPaid(expense)"
                      :disabled="actionLoading"
                    >
                      <IconCreditCard class="w-4 h-4" />
                    </button>
                    
                    <!-- Edit Button (not for paid) -->
                    <button
                      v-if="expense.status !== 'paid'"
                      class="btn btn-ghost btn-sm"
                      @click="openEditModal(expense)"
                      :disabled="actionLoading"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    
                    <!-- Delete Button (not for paid) -->
                    <button
                      v-if="expense.status !== 'paid'"
                      class="btn btn-error btn-sm"
                      @click="handleDelete(expense)"
                      :disabled="actionLoading"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>

                    <!-- Reopen Button (admin only, for paid/cancelled/approved) -->
                    <!-- <button
                      v-if="isAdmin && ['paid', 'approved', 'cancelled'].includes(expense.status)"
                      class="btn btn-warning btn-sm"
                      @click="handleReopen(expense)"
                      :disabled="actionLoading"
                    >
                      <IconRefresh class="w-4 h-4" />
                    </button> -->

                    <!-- View Button -->
                    <button
                      class="btn btn-ghost btn-sm"
                      @click="viewExpense(expense)"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
          <div class="join">
            <button
              class="join-item btn"
              :disabled="pagination.page === 1"
              @click="changePage(pagination.page - 1)"
            >
              «
            </button>
            <button class="join-item btn">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </button>
            <button
              class="join-item btn"
              :disabled="pagination.page === pagination.totalPages"
              @click="changePage(pagination.page + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconFileInvoice class="w-16 h-16 text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Tidak Ada Pengeluaran Ditemukan</h3>
        <p class="text-base-content/60 mb-6">Mulai melacak pengeluaran Anda dengan membuat pengeluaran baru</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Tambah Pengeluaran
        </button>
      </div>
    </div>

    <!-- Expense Form Modal -->
    <ExpenseFormModal
      ref="expenseFormModal"
      :expense="selectedExpense"
      :categories="categories"
      :locations="locations"
      :is-cashier="isCashier"
      :loading="actionLoading"
      @submit="handleSubmit"
    />

    <!-- Confirm Dialog -->
    <DialogConfirm ref="confirmDialog" />

    <!-- Processing Modal -->
    <Teleport to="body">
      <dialog :class="['modal', { 'modal-open': showProcessingModal }]">
        <div class="modal-box max-w-sm flex flex-col items-center text-center gap-4 py-10">
          <!-- Error State -->
          <template v-if="processingError">
            <div class="text-error">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 class="font-bold text-lg text-error">Transaksi Gagal</h3>
            <p class="text-base-content/60 text-sm">{{ processingError }}</p>
            <button class="btn btn-error btn-sm" @click="showProcessingModal = false; processingError = null">Tutup</button>
          </template>
          <!-- Loading State -->
          <template v-else>
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <h3 class="font-bold text-lg">Mohon Tunggu</h3>
            <p class="text-base-content/60">{{ processingMessage }}</p>
          </template>
        </div>
      </dialog>
    </Teleport>

    <!-- Mark as Paid Modal -->
    <Teleport to="body">
    <dialog :class="['modal', { 'modal-open': showPayModal }]">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">Mark as Paid</h3>
        <div class="space-y-4">
          <!-- Payment Method -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Sumber Dana</span>
            </label>
            <select v-model="payForm.paymentOption" class="select select-bordered w-full">
              <option v-for="option in paymentOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <!-- Finance Account Selection -->
          <div v-if="payForm.paymentOption === 'from_account'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Akun Sumber Dana <span class="text-error">*</span></span>
            </label>
            <div v-if="financeAccountsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
              <span class="loading loading-spinner loading-xs"></span> Memuat akun...
            </div>
            <select
              v-else
              v-model="payForm.accountId"
              class="select select-bordered w-full"
              :class="{ 'select-error': !payForm.accountId }"
            >
              <option value="">-- Pilih Akun (Tunai / Bank) --</option>
              <option v-for="account in expenseAccounts" :key="account.id" :value="String(account.id)">
                {{ account.name }}{{ account.bankName ? ` (${account.bankName})` : '' }} — Saldo: {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(account.balance) }}
              </option>
            </select>
            <label v-if="!expenseAccounts.length && !financeAccountsLoading" class="label">
              <span class="label-text-alt text-warning">Belum ada akun Tunai atau Bank. Buat di menu Finances → Akun.</span>
            </label>
          </div>
          <!-- Paid Date -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tanggal Bayar</span>
            </label>
            <input
              v-model="payForm.paidDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showPayModal = false">Batal</button>
          <button
            class="btn btn-info"
            :disabled="actionLoading"
            @click="submitMarkAsPaid"
          >
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Mark as Paid</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showPayModal = false"></div>
    </dialog>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenses, useExpenseCategories, useAccounts } from '@/composables/finances'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/composables/core/useApi'
import { useDebounceFn } from '@vueuse/core'
import ExpenseFormModal from '@/components/finances/ExpenseFormModal.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  EXPENSE_PAYMENT_OPTION_MAP,
  getExpensePaymentOptions,
  resolveExpensePaymentOption,
  paymentMethodFromAccount,
  filterExpenseAccounts,
} from '@/utils/expensePayment'
import {
  IconPlus,
  IconTag,
  IconTruck,
  IconEdit,
  IconTrash,
  IconEye,
  IconCheck,
  IconCreditCard,
  IconFileInvoice,
  IconRefresh,
} from '@tabler/icons-vue'

const {
  expenses,
  loading,
  actionLoading,
  pagination,
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  markAsPaid,
  reopenExpense,
} = useExpenses()

const router = useRouter()
const authStore = useAuthStore()
const getRoleName = (role) => {
  if (!role) return ''
  if (typeof role === 'string') return role.toLowerCase()
  return String(role.name || role.label || '').toLowerCase()
}

const roleName = computed(() => getRoleName(authStore.user?.role))
const isCashier = computed(() => ['cashier', 'kasir'].includes(roleName.value))
const isAdmin = computed(() => {
  return authStore.user?.isSuperAdmin === true || ['admin', 'manager', 'owner'].includes(roleName.value)
})

const PAYMENT_OPTION_MAP = EXPENSE_PAYMENT_OPTION_MAP

const paymentOptions = computed(() => getExpensePaymentOptions({ isCashier: isCashier.value }))

const expenseAccounts = computed(() => filterExpenseAccounts(financeAccounts.value))

const resolvePaymentOption = (expense = null) =>
  resolveExpensePaymentOption(expense, { isCashier: isCashier.value }) || (isCashier.value ? 'cash_drawer_cash' : 'from_account')

const { categories, fetchCategories } = useExpenseCategories()
const { accounts: financeAccounts, fetchAccounts: fetchFinanceAccounts, loading: financeAccountsLoading } = useAccounts()

const dialog = useDialog()
const expenseFormModal = ref(null)
const confirmDialog = ref(null)
const selectedExpense = ref(null)
const showPayModal = ref(false)
const payForm = ref({
  paymentOption: 'from_account',
  paymentNotes: '',
  paidDate: new Date().toISOString().split('T')[0],
  accountId: '',
})
const payTarget = ref(null)
const showProcessingModal = ref(false)
const processingMessage = ref('Transaksi Anda sedang diproses, harap tunggu...')
const processingError = ref(null)

// Temporary locations data (should be fetched from API)
const locations = ref([])

const filters = ref({
  search: '',
  status: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 20,
  sortBy: 'expenseDate',
  sortOrder: 'DESC'
})

const hasExpenses = computed(() => expenses.value.length > 0)

const hasActiveFilters = computed(() => {
  return filters.value.search || 
         filters.value.status || 
         filters.value.categoryId ||
         filters.value.startDate ||
         filters.value.endDate
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatStatus = (status) => {
  const statusMap = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status) => {
  const classes = {
    draft: 'badge badge-ghost',
    pending: 'badge badge-warning',
    approved: 'badge badge-info',
    paid: 'badge badge-success',
    cancelled: 'badge badge-error'
  }
  return classes[status] || 'badge'
}

const handleSearch = () => {
  filters.value.page = 1
  loadExpenses()
}

const debouncedSearch = useDebounceFn(() => {
  handleSearch()
}, 500)

const clearFilter = (filterName) => {
  filters.value[filterName] = ''
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.status = ''
  filters.value.categoryId = ''
  filters.value.startDate = ''
  filters.value.endDate = ''
  handleSearch()
}

const changePage = (page) => {
  filters.value.page = page
  loadExpenses()
}

const loadExpenses = async () => {
  await fetchExpenses(filters.value)
}

const openCreateModal = () => {
  selectedExpense.value = null
  expenseFormModal.value?.open()
}

const openEditModal = (expense) => {
  selectedExpense.value = expense
  expenseFormModal.value?.open(expense)
}

const viewExpense = (expense) => {
  router.push(`/finances/expenses/${expense.id}`)
}

const handleSubmit = async (expenseData) => {
  processingError.value = null
  processingMessage.value = 'Transaksi Anda sedang diproses, harap tunggu...'
  showProcessingModal.value = true
  try {
    if (selectedExpense.value) {
      await updateExpense(selectedExpense.value.id, expenseData)
    } else {
      await createExpense(expenseData)
    }
    expenseFormModal.value?.close()
    await loadExpenses()
    showProcessingModal.value = false
  } catch (error) {
    console.error('Failed to submit expense:', error)
    processingError.value = error?.response?.data?.message || error?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

const handleApprove = async (expense) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Approve Expense',
    message: `Are you sure you want to approve expense "${expense.title}"?`,
    confirmText: 'Approve',
    type: 'info'
  })

  if (confirmed) {
    processingError.value = null
    processingMessage.value = 'Pengeluaran sedang disetujui, harap tunggu...'
    showProcessingModal.value = true
    try {
      await approveExpense(expense.id)
      await loadExpenses()
      showProcessingModal.value = false
    } catch (error) {
      console.error('Failed to approve expense:', error)
      processingError.value = error?.response?.data?.message || error?.message || 'Terjadi kesalahan, silakan coba lagi.'
    }
  }
}

watch(() => payForm.value.paymentOption, (val) => {
  if (val === 'from_account' && !financeAccounts.value.length) {
    fetchFinanceAccounts({ isActive: 'true' })
  }
})

const handleMarkAsPaid = (expense) => {
  payTarget.value = expense
  payForm.value = {
    paymentOption: resolvePaymentOption(expense),
    paymentNotes: expense?.paymentNotes || '',
    paidDate: new Date().toISOString().split('T')[0],
    accountId: expense?.accountId ? String(expense.accountId) : '',
  }
  if (payForm.value.paymentOption === 'from_account') {
    fetchFinanceAccounts({ isActive: 'true' })
  }
  showPayModal.value = true
}

const submitMarkAsPaid = async () => {
  if (payForm.value.paymentOption === 'from_account' && !payForm.value.accountId) {
    processingError.value = 'Pilih akun sumber dana.'
    showProcessingModal.value = true
    return
  }

  processingError.value = null
  processingMessage.value = 'Sedang memproses pembayaran, harap tunggu...'
  showProcessingModal.value = true
  try {
    const paymentConfig = PAYMENT_OPTION_MAP[payForm.value.paymentOption] || PAYMENT_OPTION_MAP.from_account
    const selectedAccount = expenseAccounts.value.find(a => String(a.id) === String(payForm.value.accountId))
    const payload = {
      paymentMethod: payForm.value.paymentOption === 'from_account'
        ? paymentMethodFromAccount(selectedAccount)
        : paymentConfig.paymentMethod,
      paidDate: payForm.value.paidDate,
    }
    if (paymentConfig.fundSource) {
      payload.fundSource = paymentConfig.fundSource
    }
    if (payForm.value.paymentOption === 'from_account' && payForm.value.accountId) {
      payload.accountId = payForm.value.accountId
      if (selectedAccount?.bankName) payload.bankName = selectedAccount.bankName
    }
    if (payForm.value.paymentNotes) {
      payload.paymentNotes = payForm.value.paymentNotes
    }
    await markAsPaid(payTarget.value.id, payload)
    showPayModal.value = false
    await loadExpenses()
    showProcessingModal.value = false
  } catch (error) {
    console.error('Failed to mark expense as paid:', error)
    processingError.value = error?.response?.data?.message || error?.data?.message || error?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

const handleReopen = async (expense) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Reopen Expense',
    message: `Reopen expense "${expense.title}" back to draft?`,
    confirmText: 'Reopen',
    type: 'info',
  })
  if (confirmed) {
    try {
      await reopenExpense(expense.id)
      await loadExpenses()
    } catch (error) {
      console.error('Failed to reopen expense:', error)
    }
  }
}

const handleDelete = async (expense) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Delete Expense',
    message: `Are you sure you want to delete expense "${expense.title}"? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger'
  })

  if (confirmed) {
    try {
      processingMessage.value = 'Sedang menghapus data, harap tunggu...'
      showProcessingModal.value = true
      await deleteExpense(expense.id)
      await loadExpenses()
    } catch (error) {
      console.error('Failed to delete expense:', error)
    } finally {
      showProcessingModal.value = false
    }
  }
}

onMounted(async () => {
  await Promise.all([
    loadExpenses(),
    fetchCategories({ isActive: true }),
    fetchFinanceAccounts({ isActive: 'true' }).catch(() => null),
  ])
})
</script>
