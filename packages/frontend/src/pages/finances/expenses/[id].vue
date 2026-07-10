<route lang="yaml">
meta:
  title: Detail Pengeluaran
  layout: default
</route>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExpenses, usePettyCash, useVault, useAccounts } from '@/composables/finances'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/core/useNotification'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import ExpenseFormModal from '@/components/finances/ExpenseFormModal.vue'
import {
  EXPENSE_PAYMENT_OPTION_MAP,
  EXPENSE_PAYMENT_OPTIONS,
  resolveExpensePaymentOption,
  paymentMethodFromAccount,
  formatExpenseFundSource,
  formatExpensePaymentMethod,
} from '@/utils/expensePayment'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconCheck,
  IconCreditCard,
  IconFileInvoice,
  IconCalendar,
  IconTag,
  IconUser,
  IconMapPin,
  IconNotes,
  IconClock,
  IconRefresh,
} from '@tabler/icons-vue'

defineOptions({ inheritAttrs: false })

const route  = useRoute()
const router = useRouter()
const {
  expense,
  loading,
  actionLoading,
  fetchExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  markAsPaid,
  reopenExpense,
} = useExpenses()

const authStore = useAuthStore()
const { showInfo } = useNotification()
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

const paymentOptions = computed(() => {
  if (isCashier.value) {
    return [{ value: 'cash_drawer_cash', label: 'Tunai' }]
  }
  return EXPENSE_PAYMENT_OPTIONS
})

const resolvePaymentOption = (currentExpense = null) =>
  resolveExpensePaymentOption(currentExpense, { isCashier: isCashier.value }) || (isCashier.value ? 'cash_drawer_cash' : 'from_account')

const { fetchFunds: fetchPettyCashFunds } = usePettyCash()
const { vaultAccounts, fetchVaultAccounts, accountsLoading: vaultAccountsLoading } = useVault()
const { accounts: financeAccounts, fetchAccounts: fetchFinanceAccounts, loading: financeAccountsLoading } = useAccounts()

const id = route.params.id
onMounted(() => {
  fetchExpense(id)
  fetchVaultAccounts({ isActive: 'true' })
  fetchFinanceAccounts({ isActive: 'true' })
})

const confirmDialog    = ref(null)
const expenseFormModal = ref(null)
const showPayModal = ref(false)
const payForm = ref({
  paymentOption: 'from_account',
  bankName: '',
  paymentNotes: '',
  paidDate: new Date().toISOString().split('T')[0],
  pettyCashId: '',
  vaultAccountId: '',
  accountId: '',
})
const pettyCashFunds = ref([])
const pettyCashFundsLoading = ref(false)

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/finances/expenses')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v) || 0)

const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const fmtDT = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusBadgeClass = (s) => {
  const map = {
    draft: 'badge-ghost', pending: 'badge-warning',
    approved: 'badge-info', paid: 'badge-success', cancelled: 'badge-error',
  }
  return map[s] || 'badge-ghost'
}

const statusLabel = (s) => {
  const map = { draft: 'Draft', pending: 'Menunggu', approved: 'Disetujui', paid: 'Dibayar', cancelled: 'Dibatalkan' }
  return map[s] || s || '-'
}

const exp = expense

// ── Actions ───────────────────────────────────────────────────────────────────
const handleApprove = async () => {
  const ok = await confirmDialog.value?.open({
    title: 'Setujui Pengeluaran',
    message: `Setujui pengeluaran "${exp.value?.title}"?`,
    confirmText: 'Setujui', type: 'info',
  })
  if (ok) { await approveExpense(id); await fetchExpense(id) }
}

const handleMarkAsPaid = () => {
  payForm.value = {
    paymentOption: resolvePaymentOption(exp.value),
    bankName: exp.value?.bankName || '',
    paymentNotes: exp.value?.paymentNotes || '',
    paidDate: new Date().toISOString().split('T')[0],
    pettyCashId: '',
    vaultAccountId: exp.value?.vaultAccountId || '',
    accountId: exp.value?.accountId ? String(exp.value.accountId) : '',
  }
  if (payForm.value.paymentOption === 'petty_cash') {
    loadPettyCashFunds()
  } else if (payForm.value.paymentOption === 'vault_cash') {
    fetchVaultAccounts({ isActive: 'true' })
  } else if (payForm.value.paymentOption === 'from_account') {
    fetchFinanceAccounts({ isActive: 'true' })
  }
  showPayModal.value = true
}

const loadPettyCashFunds = async () => {
  pettyCashFundsLoading.value = true
  try {
    const response = await fetchPettyCashFunds({ status: 'active', limit: 50 })
    pettyCashFunds.value = response.data || []
  } catch {
    pettyCashFunds.value = []
  } finally {
    pettyCashFundsLoading.value = false
  }
}

watch(() => payForm.value.paymentOption, (value) => {
  if (value === 'petty_cash' && !pettyCashFunds.value.length) {
    loadPettyCashFunds()
  }
  if (value === 'from_account' && !financeAccounts.value.length) {
    fetchFinanceAccounts({ isActive: 'true' })
  }
})

const submitMarkAsPaid = async () => {
  if (payForm.value.paymentOption === 'petty_cash' && !payForm.value.pettyCashId) {
    return
  }

  if (payForm.value.paymentOption === 'vault_cash' && !payForm.value.vaultAccountId) {
    return
  }

  if (payForm.value.paymentOption === 'from_account' && !payForm.value.accountId) {
    return
  }

  const paymentConfig = PAYMENT_OPTION_MAP[payForm.value.paymentOption] || PAYMENT_OPTION_MAP.from_account
  const selectedAccount = financeAccounts.value.find(a => String(a.id) === String(payForm.value.accountId))
  const payload = {
    paymentMethod: payForm.value.paymentOption === 'from_account'
      ? paymentMethodFromAccount(selectedAccount)
      : paymentConfig.paymentMethod,
    paidDate: payForm.value.paidDate,
  }
  if (paymentConfig.fundSource) {
    payload.fundSource = paymentConfig.fundSource
  }
  if (payForm.value.paymentOption === 'petty_cash') {
    payload.pettyCashId = payForm.value.pettyCashId
  }
  if (payForm.value.paymentOption === 'vault_cash' && payForm.value.vaultAccountId) {
    payload.vaultAccountId = payForm.value.vaultAccountId
  }
  if (payForm.value.paymentOption === 'from_account' && payForm.value.accountId) {
    payload.accountId = payForm.value.accountId
    if (selectedAccount?.bankName) payload.bankName = selectedAccount.bankName
  }
  if (payForm.value.paymentOption === 'bank_transfer' && payForm.value.bankName) {
    payload.bankName = payForm.value.bankName
  }
  if (payForm.value.paymentNotes) {
    payload.paymentNotes = payForm.value.paymentNotes
  }
  const result = await markAsPaid(id, payload)
  if (result?.pettyCash) {
    showInfo(`Petty Cash: ${fmt(result.pettyCash.balanceBefore)} → ${fmt(result.pettyCash.balanceAfter)} (${result.pettyCash.transactionNumber})`, 5000)
  }
  showPayModal.value = false
  await fetchExpense(id)
}

const handleEdit = () => {
  expenseFormModal.value?.open(exp.value)
}

const handleSubmit = async (data) => {
  await updateExpense(id, data)
  expenseFormModal.value?.close()
  await fetchExpense(id)
}

const handleDelete = async () => {
  const ok = await confirmDialog.value?.open({
    title: 'Hapus Pengeluaran',
    message: `Hapus pengeluaran "${exp.value?.title}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmText: 'Hapus', type: 'danger',
  })
  if (ok) {
    await deleteExpense(id)
    router.push('/finances/expenses')
  }
}

const handleReopen = async () => {
  const ok = await confirmDialog.value?.open({
    title: 'Buka Kembali',
    message: `Buka kembali pengeluaran "${exp.value?.title}" ke status draft?`,
    confirmText: 'Buka Kembali', type: 'info',
  })
  if (ok) { await reopenExpense(id); await fetchExpense(id) }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">

    <!-- Back -->
    <div class="mb-6">
      <button class="btn btn-ghost btn-sm" @click="goBack">
        <IconArrowLeft class="w-4 h-4" />
        Kembali
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-4">
      <div class="skeleton h-10 w-64"></div>
      <div class="skeleton h-40 w-full"></div>
      <div class="skeleton h-48 w-full"></div>
    </div>

    <template v-else-if="exp">

      <!-- Title row -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-sm text-base-content/50">{{ exp.expenseNumber }}</span>
          </div>
          <h1 class="text-2xl font-bold">{{ exp.title }}</h1>
          <p v-if="exp.description" class="text-base-content/60 mt-1 text-sm">{{ exp.description }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <span class="badge badge-md" :class="statusBadgeClass(exp.status)">
            {{ statusLabel(exp.status) }}
          </span>

          <!-- Approve -->
          <button v-if="exp.status === 'pending'" class="btn btn-success btn-sm"
            :disabled="actionLoading" @click="handleApprove">
            <IconCheck class="w-4 h-4" /> Setujui
          </button>

          <!-- Mark as Paid -->
          <button v-if="exp.status === 'approved'" class="btn btn-info btn-sm"
            :disabled="actionLoading" @click="handleMarkAsPaid">
            <IconCreditCard class="w-4 h-4" /> Tandai Dibayar
          </button>

          <!-- Edit -->
          <button v-if="exp.status !== 'paid'" class="btn btn-ghost btn-sm"
            :disabled="actionLoading" @click="handleEdit">
            <IconEdit class="w-4 h-4" /> Edit
          </button>

          <!-- Delete -->
          <button v-if="exp.status !== 'paid'" class="btn btn-error btn-sm btn-outline"
            :disabled="actionLoading" @click="handleDelete">
            <IconTrash class="w-4 h-4" />
          </button>

          <!-- Reopen (admin only) -->
          <button
            v-if="isAdmin && ['paid', 'approved', 'cancelled'].includes(exp.status)"
            class="btn btn-warning btn-sm"
            :disabled="actionLoading"
            @click="handleReopen"
          >
            <IconRefresh class="w-4 h-4" /> Buka Kembali
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: main info -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Amounts -->
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h2 class="font-semibold mb-3 flex items-center gap-2">
                <IconFileInvoice class="w-4 h-4 text-primary" />
                Rincian Biaya
              </h2>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/50">Subtotal</span>
                  <span>{{ fmt(exp.amount) }}</span>
                </div>
                <div v-if="Number(exp.taxAmount) > 0" class="flex justify-between">
                  <span class="text-base-content/50">Pajak</span>
                  <span>{{ fmt(exp.taxAmount) }}</span>
                </div>
                <div class="divider my-1"></div>
                <div class="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span class="text-primary">{{ fmt(exp.totalAmount) }}</span>
                </div>
                <div v-if="exp.paymentMethod || exp.fundSource || exp.accountId" class="flex justify-between pt-1">
                  <span class="text-base-content/50">Sumber Dana</span>
                  <span class="text-right">{{ formatExpenseFundSource(exp) }}</span>
                </div>
                <div v-if="exp.paymentMethod" class="flex justify-between pt-1">
                  <span class="text-base-content/50">Metode Bayar</span>
                  <span>{{ formatExpensePaymentMethod(exp.paymentMethod) }}</span>
                </div>
                <div v-if="exp.paidDate" class="flex justify-between">
                  <span class="text-base-content/50">Tanggal Bayar</span>
                  <span>{{ fmtDate(exp.paidDate) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="exp.notes" class="card bg-base-100 shadow">
            <div class="card-body">
              <h2 class="font-semibold mb-2 flex items-center gap-2">
                <IconNotes class="w-4 h-4 text-primary" />
                Catatan
              </h2>
              <p class="text-sm text-base-content/70 whitespace-pre-line">{{ exp.notes }}</p>
            </div>
          </div>

        </div>

        <!-- Right: metadata -->
        <div class="space-y-4">

          <!-- Details card -->
          <div class="card bg-base-100 shadow">
            <div class="card-body gap-3">

              <div>
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconCalendar class="w-3.5 h-3.5" /> Tanggal Pengeluaran
                </div>
                <div class="text-sm font-medium">{{ fmtDate(exp.expenseDate) }}</div>
              </div>

              <div v-if="exp.dueDate">
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconClock class="w-3.5 h-3.5" /> Jatuh Tempo
                </div>
                <div class="text-sm font-medium">{{ fmtDate(exp.dueDate) }}</div>
              </div>

              <div v-if="exp.category">
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconTag class="w-3.5 h-3.5" /> Kategori
                </div>
                <div class="flex items-center gap-2">
                  <div v-if="exp.category.color" class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: exp.category.color }"></div>
                  <span class="text-sm font-medium">{{ exp.category.name }}</span>
                </div>
              </div>

              <div v-if="exp.vendor">
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconUser class="w-3.5 h-3.5" /> Vendor
                </div>
                <div class="text-sm font-medium">{{ exp.vendor }}</div>
              </div>

              <div v-if="exp.location?.name">
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconMapPin class="w-3.5 h-3.5" /> Lokasi
                </div>
                <div class="text-sm font-medium">{{ exp.location.name }}</div>
              </div>

              <div class="divider my-0"></div>

              <div>
                <div class="text-xs text-base-content/50 mb-1 flex items-center gap-1">
                  <IconClock class="w-3.5 h-3.5" /> Dibuat
                </div>
                <div class="text-xs">{{ fmtDT(exp.createdAt) }}</div>
              </div>
              <div v-if="exp.updatedAt !== exp.createdAt">
                <div class="text-xs text-base-content/50 mb-1">Diperbarui</div>
                <div class="text-xs">{{ fmtDT(exp.updatedAt) }}</div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </template>

    <!-- Not found -->
    <div v-else class="text-center py-24 text-base-content/40">
      <IconFileInvoice class="w-16 h-16 mx-auto mb-4 opacity-20" />
      <p class="text-lg font-medium">Pengeluaran tidak ditemukan</p>
    </div>

    <DialogConfirm ref="confirmDialog" />
    <Teleport to="body">
      <ExpenseFormModal
        ref="expenseFormModal"
        :expense="exp"
        :categories="[]"
        :locations="[]"
        :is-cashier="isCashier"
        :loading="actionLoading"
        @submit="handleSubmit"
      />
    </Teleport>

    <!-- Mark as Paid Modal -->
    <Teleport to="body">
    <dialog :class="['modal', { 'modal-open': showPayModal }]">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">Tandai Dibayar</h3>
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
          <div v-if="payForm.paymentOption === 'from_account'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Akun Sumber Dana <span class="text-error">*</span></span>
            </label>
            <div v-if="financeAccountsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
              <span class="loading loading-spinner loading-xs"></span> Memuat akun...
            </div>
            <select v-else v-model="payForm.accountId" class="select select-bordered w-full">
              <option value="">-- Pilih Akun --</option>
              <option v-for="account in financeAccounts" :key="account.id" :value="String(account.id)">
                {{ account.name }}{{ account.bankName ? ` (${account.bankName})` : '' }} — Saldo: {{ fmt(account.balance) }}
              </option>
            </select>
          </div>
          <div v-if="payForm.paymentOption === 'petty_cash'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Dana Petty Cash <span class="text-error">*</span></span>
            </label>
            <div v-if="pettyCashFundsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
              <span class="loading loading-spinner loading-xs"></span> Memuat daftar fund...
            </div>
            <select v-else v-model="payForm.pettyCashId" class="select select-bordered w-full">
              <option value="">-- Pilih Dana --</option>
              <option v-for="fund in pettyCashFunds" :key="fund.id" :value="fund.id">
                {{ fund.name }} — Saldo: {{ fmt(fund.balance) }}
              </option>
            </select>
          </div>
          <!-- Vault Account (only for vault_cash) -->
          <div v-if="payForm.paymentOption === 'vault_cash'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Vault Account <span class="text-error">*</span></span>
            </label>
            <div v-if="vaultAccountsLoading" class="flex items-center gap-2 text-sm text-base-content/60 py-2">
              <span class="loading loading-spinner loading-xs"></span> Memuat vault account...
            </div>
            <select v-else-if="vaultAccounts.length" v-model="payForm.vaultAccountId" class="select select-bordered w-full">
              <option value="">-- Pilih Vault Account --</option>
              <option v-for="account in vaultAccounts" :key="account.id" :value="account.id">
                {{ account.name }} — Saldo: {{ fmt(account.balance) }}
              </option>
            </select>
            <div v-else class="text-sm text-base-content/60 py-2">
              ⚠️ Belum ada vault account. Silakan buat vault account terlebih dahulu, atau lakukan collect dari cash drawer untuk auto-create akun "Kas".
            </div>
          </div>
          <!-- Bank Name (only for bank_transfer) -->
          <div v-if="payForm.paymentOption === 'bank_transfer'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Bank</span>
            </label>
            <input
              v-model="payForm.bankName"
              type="text"
              class="input input-bordered w-full"
              placeholder="Contoh: BCA, Mandiri, BRI"
            />
          </div>
          <!-- Payment Notes -->
          <div v-if="payForm.paymentOption === 'bank_transfer'" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Catatan Pembayaran</span>
            </label>
            <input
              v-model="payForm.paymentNotes"
              type="text"
              class="input input-bordered w-full"
              placeholder="Contoh: Transfer dari rek 123456789"
            />
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
            <span v-else>Tandai Dibayar</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showPayModal = false"></div>
    </dialog>
    </Teleport>

  </div>
</template>
