<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-lg">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-1">{{ modalTitle }}</h3>
      <p class="text-base-content/60 text-sm mb-4">{{ modalSubtitle }}</p>

      <!-- Saldo saat ini -->
      <div class="alert mb-4" :class="balanceAlertClass">
        <span class="font-medium">Saldo Saat Ini:</span>
        <span class="font-bold ml-1">{{ formatCurrency(currentBalance) }}</span>
      </div>

      <div class="space-y-4">

        <!-- ── EXPENSE INFO (v1.2.0: tracking-only, no status update) ────── -->
        <template v-if="type === 'expense'">
          <div class="alert alert-info py-2 px-3 text-sm">
            <span>Pengeluaran hanya mengurangi saldo petty cash. Status Expense di sistem utama <strong>tidak diubah</strong>. Expense yang dipilih hanya sebagai referensi link.</span>
          </div>

          <!-- Expense terpilih -->
          <div v-if="selectedExpense" class="rounded-lg border border-success bg-success/5 p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-xs text-base-content/50">{{ selectedExpense.expenseNumber }}</span>
                  <span class="badge badge-xs" :class="getExpenseStatusBadge(selectedExpense.status)">
                    {{ selectedExpense.status }}
                  </span>
                </div>
                <div class="font-semibold text-sm mt-0.5 truncate">{{ selectedExpense.title }}</div>
                <div class="text-xs text-base-content/60 mt-0.5">
                  {{ selectedExpense.category?.name || '-' }}
                  <span v-if="selectedExpense.vendor"> · {{ selectedExpense.vendor }}</span>
                </div>
                <div class="text-success font-bold mt-1">{{ formatCurrency(selectedExpense.totalAmount) }}</div>
              </div>
              <button class="btn btn-xs btn-ghost text-error shrink-0" @click="clearSelectedExpense">
                ✕ Batal
              </button>
            </div>
          </div>

          <!-- Pencarian expense (tampil jika belum ada yang dipilih) -->
          <div v-else class="form-control">
            <label class="label">
              <span class="label-text font-medium">Cari Expense (Referensi)</span>
              <span class="label-text-alt text-base-content/50">Opsional</span>
            </label>
            <div class="relative">
              <input
                v-model="expenseSearch"
                type="text"
                placeholder="Cari judul, nomor, atau vendor..."
                class="input input-bordered w-full pr-10"
                @input="onExpenseSearchInput"
                @focus="showExpenseDropdown = true"
              />
              <span v-if="expenseSearchLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                <span class="loading loading-spinner loading-xs"></span>
              </span>
              <button
                v-else-if="expenseSearch"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                @click="expenseSearch = ''; expenseResults = []; showExpenseDropdown = false"
              >✕</button>
            </div>

            <!-- Dropdown hasil -->
            <div
              v-if="showExpenseDropdown && (expenseResults.length || expenseSearchLoading || expenseSearch.length >= 2)"
              class="relative z-50"
            >
              <ul class="absolute top-1 left-0 right-0 max-h-56 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-xl">
                <li v-if="expenseSearchLoading" class="p-3 text-center text-sm text-base-content/50">
                  <span class="loading loading-spinner loading-xs mr-2"></span>Mencari...
                </li>
                <li v-else-if="!expenseResults.length && expenseSearch.length >= 2" class="p-3 text-center text-sm text-base-content/40">
                  Tidak ada expense ditemukan
                </li>
                <li v-else-if="expenseSearch.length < 2 && !expenseResults.length" class="p-3 text-center text-sm text-base-content/40">
                  Ketik minimal 2 karakter untuk mencari
                </li>
                <li
                  v-for="exp in expenseResults"
                  :key="exp.id"
                  class="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-base-200 border-b border-base-200 last:border-0"
                  @mousedown.prevent="selectExpense(exp)"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono text-xs text-base-content/50">{{ exp.expenseNumber }}</span>
                      <span class="badge badge-xs" :class="getExpenseStatusBadge(exp.status)">{{ exp.status }}</span>
                    </div>
                    <div class="font-medium text-sm truncate">{{ exp.title }}</div>
                    <div class="text-xs text-base-content/50 truncate">
                      {{ exp.category?.name || '-' }}<span v-if="exp.vendor"> · {{ exp.vendor }}</span>
                    </div>
                  </div>
                  <span class="text-sm font-bold text-error shrink-0">{{ formatCurrency(exp.totalAmount) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Separator -->
          <div class="divider text-xs text-base-content/40 my-0">atau isi jumlah manual</div>
        </template>

        <!-- ── JUMLAH ──────────────────────────────────────────────────────── -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">
              Jumlah <span class="text-error">*</span>
              <span v-if="type === 'adjustment'" class="text-xs text-base-content/60 ml-1">(positif = tambah, negatif = kurang)</span>
            </span>
          </label>
          <input
            v-model.number="formData.amount"
            type="number"
            :min="type === 'adjustment' ? undefined : 1"
            placeholder="0"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.amount }"
          />
          <label v-if="errors.amount" class="label">
            <span class="label-text-alt text-error">{{ errors.amount }}</span>
          </label>
          <!-- Preview saldo setelah -->
          <label v-if="formData.amount !== '' && formData.amount !== null" class="label">
            <span class="label-text-alt text-base-content/60">
              Saldo setelah: <strong>{{ formatCurrency(balanceAfter) }}</strong>
            </span>
          </label>
        </div>

        <!-- ── FUND SOURCE (top_up & adjustment positif) ──────────────────── -->
        <div v-if="showFundSource" class="form-control">
          <label class="label">
            <span class="label-text font-medium">Sumber Dana</span>
          </label>
          <select v-model="formData.fundSource" class="select select-bordered w-full">
            <option value="owner_cash">Uang Tunai Owner / Kas Fisik</option>
            <option value="bank_transfer">Transfer Bank</option>
            <option value="revenue">Dari Pendapatan (Revenue)</option>
            <option value="other">Lainnya</option>
          </select>
          <label class="label">
            <span v-if="formData.fundSource === 'revenue'" class="label-text-alt text-warning">
              Akan otomatis membuat Expense "Modal Petty Cash" dan mengurangi cashflow operasional
            </span>
            <span v-else class="label-text-alt text-base-content/50">
              owner_cash / bank_transfer tidak mempengaruhi cashflow
            </span>
          </label>
        </div>

        <!-- ── SALES RETURN: fund source info ──────────────────────────────── -->
        <div v-if="type === 'sales_return'" class="alert alert-warning py-2 px-3 text-sm">
          <span>Sumber dana otomatis <strong>revenue</strong> — pengembalian penjualan ini akan dicatat sebagai cashflow outflow.</span>
        </div>

        <!-- Reference ID (opsional, hanya untuk sales-return) -->
        <template v-if="type === 'sales_return'">

          <!-- Open shifts loader -->
          <div class="form-control">
            <div class="flex items-center justify-between mb-2">
              <span class="label-text font-medium">Shift Yang Sedang Open</span>
              <button class="btn btn-xs btn-ghost gap-1" :class="{ loading: shiftsLoading }" @click="loadOpenShifts">
                <span v-if="!shiftsLoading">↻ Refresh</span>
                <span v-else>Loading...</span>
              </button>
            </div>

            <!-- Loading state -->
            <div v-if="shiftsLoading" class="flex justify-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>

            <!-- Error state -->
            <div v-else-if="shiftsError" class="rounded-lg bg-error/10 border border-error/30 p-3 text-center text-sm text-error">
              {{ shiftsError }}
            </div>

            <!-- No open shifts -->
            <div v-else-if="!openShifts.length" class="rounded-lg bg-base-200 p-3 text-center text-sm text-base-content/50">
              Tidak ada shift yang sedang open
            </div>

            <!-- List open shifts -->
            <div v-else class="space-y-2">
              <div
                v-for="shift in openShifts"
                :key="shift.id"
                class="rounded-lg border p-3 cursor-pointer transition-all"
                :class="selectedShift?.id === shift.id
                  ? 'border-success bg-success/5'
                  : 'border-base-300 bg-base-100 hover:border-success/50 hover:bg-base-200'"
                @click="selectShift(shift)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-sm">{{ shift.shiftName || shift.name || 'Shift' }}</span>
                      <span class="badge badge-xs badge-success">Open</span>
                    </div>
                    <div class="text-xs text-base-content/50 mt-0.5">
                      Dibuka: {{ formatShiftTime(shift.openedAt || shift.createdAt) }}
                      <span v-if="shift.openedBy || shift.opener">
                        · oleh {{ shift.openedBy?.firstName || shift.opener?.firstName || '' }} {{ shift.openedBy?.lastName || shift.opener?.lastName || '' }}
                      </span>
                    </div>
                    <div v-if="shift.location" class="text-xs text-base-content/40">📍 {{ shift.location.name }}</div>
                  </div>
                  <!-- Summary kanan -->
                  <div class="text-right shrink-0">
                    <div class="text-xs text-base-content/50">Net Cash</div>
                    <div class="font-bold text-success text-sm">
                      {{ formatCurrency(getShiftNetCash(shift)) }}
                    </div>
                    <div class="text-xs text-base-content/40 mt-0.5">
                      Penjualan: {{ formatCurrency(getShiftCashIn(shift)) }}
                    </div>
                  </div>
                </div>

                <!-- Expanded summary jika dipilih -->
                <div v-if="selectedShift?.id === shift.id" class="mt-2 pt-2 border-t border-success/20 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div class="text-xs text-base-content/50">Total Penjualan</div>
                    <div class="text-sm font-semibold text-success">{{ formatCurrency(getShiftTotalSales(shift)) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/50">Kas Masuk</div>
                    <div class="text-sm font-semibold text-success">{{ formatCurrency(getShiftCashIn(shift)) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/50">Pengeluaran</div>
                    <div class="text-sm font-semibold text-error">{{ formatCurrency(getShiftCashOut(shift)) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/50">Net Cash</div>
                    <div class="text-sm font-semibold text-info">{{ formatCurrency(getShiftNetCash(shift)) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Separator -->
          <div class="divider text-xs text-base-content/40 my-0">isi jumlah yang disetor</div>
        </template>

        <!-- Tanggal Transaksi -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Tanggal Transaksi</span>
          </label>
          <input
            v-model="formData.transactionDate"
            type="date"
            class="input input-bordered w-full"
          />
        </div>

        <!-- Deskripsi -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">
              Keterangan
              <span v-if="type === 'adjustment'" class="text-error">*</span>
            </span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            rows="2"
            :placeholder="descriptionPlaceholder"
            :class="{ 'textarea-error': errors.description }"
          ></textarea>
          <label v-if="errors.description" class="label">
            <span class="label-text-alt text-error">{{ errors.description }}</span>
          </label>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="close">Batal</button>
        <button
          class="btn"
          :class="confirmBtnClass"
          :disabled="loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          {{ confirmBtnLabel }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps({
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const api = useApi()
const modalRef = ref(null)
const errors = ref({})
const type = ref('top_up')
const currentBalance = ref(0)

const formData = ref({
  amount: null,
  description: '',
  transactionDate: new Date().toISOString().split('T')[0],
  expenseId: '',
  referenceId: '',
  fundSource: 'owner_cash',
})

// ── Expense search state ───────────────────────────────────────────────────────
const expenseSearch = ref('')
const expenseResults = ref([])
const expenseSearchLoading = ref(false)
const showExpenseDropdown = ref(false)
const selectedExpense = ref(null)

// ── Open shifts state (sales_return) ──────────────────────────────────────────
const openShifts = ref([])
const shiftsLoading = ref(false)
const selectedShift = ref(null)

const shiftsError = ref(null)

const loadOpenShifts = async () => {
  shiftsLoading.value = true
  shiftsError.value = null
  try {
    const queryParams = new URLSearchParams()
    queryParams.append('status', 'open')
    queryParams.append('limit', '20')
    const response = await api.get(`/gym/cash-register?${queryParams.toString()}`)
    // salesSummary already included in list response
    const payload = response?.data ?? response
    if (Array.isArray(payload)) {
      openShifts.value = payload
    } else if (payload?.data) {
      openShifts.value = Array.isArray(payload.data) ? payload.data : []
    } else {
      openShifts.value = []
    }
  } catch (err) {
    console.error('[PettyCash] loadOpenShifts error:', err)
    shiftsError.value = err?.data?.message || err?.message || 'Gagal memuat daftar shift'
    openShifts.value = []
  } finally {
    shiftsLoading.value = false
  }
}

const selectShift = (shift) => {
  if (selectedShift.value?.id === shift.id) {
    // deselect
    selectedShift.value = null
    formData.value.referenceId = ''
    return
  }
  selectedShift.value = shift
  formData.value.referenceId = shift.id
  // Auto-fill amount with netCash (hasil bersih) if not yet filled
  const netCash = getShiftNetCash(shift)
  if (!formData.value.amount && netCash > 0) {
    formData.value.amount = netCash
  }
  if (!formData.value.description) {
    const name = shift.shiftName || shift.name || 'Shift'
    formData.value.description = `Setor hasil penjualan ${name}`
  }
}

const getShiftCashIn = (shift) =>
  parseFloat(shift.salesSummary?.cashIn ?? shift.liveSummary?.cashIn ?? shift.summary?.cashIn ?? 0)

const getShiftCashOut = (shift) =>
  parseFloat(shift.salesSummary?.totalExpenses ?? shift.liveSummary?.cashOut ?? shift.summary?.cashOut ?? 0)

const getShiftNetCash = (shift) =>
  parseFloat(shift.salesSummary?.netCash ?? shift.liveSummary?.expectedCash ?? shift.summary?.netCash ?? 0)

const getShiftTotalSales = (shift) =>
  parseFloat(shift.salesSummary?.totalSales ?? shift.salesSummary?.cashIn ?? 0)

const formatShiftTime = (val) => {
  if (!val) return '-'
  return new Date(val).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const searchExpenses = async (query) => {
  if (query.length < 2) {
    expenseResults.value = []
    return
  }
  expenseSearchLoading.value = true
  try {
    const params = new URLSearchParams({
      search: query,
      limit: '10',
      sortBy: 'expenseDate',
      sortOrder: 'DESC',
    })
    const response = await api.get(`/finance/expenses?${params.toString()}`)
    expenseResults.value = response.data?.expenses || response.data || []
  } catch {
    expenseResults.value = []
  } finally {
    expenseSearchLoading.value = false
  }
}

const debouncedSearchExpenses = useDebounceFn((q) => searchExpenses(q), 350)

const onExpenseSearchInput = () => {
  showExpenseDropdown.value = true
  debouncedSearchExpenses(expenseSearch.value)
}

const selectExpense = (exp) => {
  selectedExpense.value = exp
  formData.value.expenseId = exp.id
  // Auto-fill amount & description from selected expense
  if (!formData.value.amount) {
    formData.value.amount = parseFloat(exp.totalAmount) || null
  }
  if (!formData.value.description) {
    formData.value.description = exp.title || ''
  }
  showExpenseDropdown.value = false
  expenseSearch.value = ''
  expenseResults.value = []
}

const clearSelectedExpense = () => {
  selectedExpense.value = null
  formData.value.expenseId = ''
}

const getExpenseStatusBadge = (status) => ({
  draft: 'badge-ghost',
  pending: 'badge-warning',
  approved: 'badge-info',
  paid: 'badge-success',
  cancelled: 'badge-error',
}[status] || 'badge-ghost')

// ── Type config ────────────────────────────────────────────────────────────────
const typeConfig = {
  top_up: {
    title: 'Top Up Dana',
    subtitle: 'Tambahkan dana ke modal',
    btnLabel: 'Top Up',
    btnClass: 'btn-success',
    alertClass: 'alert-info',
    placeholder: 'Contoh: Tambahan modal sore hari',
  },
  expense: {
    title: 'Bayar Expense dari Modal',
    subtitle: 'Gunakan modal untuk membayar expense',
    btnLabel: 'Bayar',
    btnClass: 'btn-error',
    alertClass: 'alert-warning',
    placeholder: 'Contoh: Beli sabun dan tisu',
  },
  sales_return: {
    title: 'Pengembalian dari Penjualan',
    subtitle: 'Kembalikan hasil penjualan ke modal',
    btnLabel: 'Catat Pengembalian',
    btnClass: 'btn-success',
    alertClass: 'alert-info',
    placeholder: 'Contoh: Pengembalian shift pagi',
  },
  adjustment: {
    title: 'Penyesuaian Saldo',
    subtitle: 'Koreksi saldo jika ada selisih (positif = tambah, negatif = kurang)',
    btnLabel: 'Simpan Penyesuaian',
    btnClass: 'btn-warning',
    alertClass: 'alert-warning',
    placeholder: 'Wajib: alasan penyesuaian saldo',
    defaultFundSource: 'other',
  },
  withdrawal: {
    title: 'Tarik Dana',
    subtitle: 'Tarik sebagian dana dari modal',
    btnLabel: 'Tarik Dana',
    btnClass: 'btn-error',
    alertClass: 'alert-warning',
    placeholder: 'Contoh: Penarikan akhir shift',
  },
}

const modalTitle = computed(() => typeConfig[type.value]?.title || '')
const modalSubtitle = computed(() => typeConfig[type.value]?.subtitle || '')
const confirmBtnLabel = computed(() => typeConfig[type.value]?.btnLabel || 'Simpan')
const confirmBtnClass = computed(() => typeConfig[type.value]?.btnClass || 'btn-primary')
const balanceAlertClass = computed(() => typeConfig[type.value]?.alertClass || 'alert-info')
const descriptionPlaceholder = computed(() => typeConfig[type.value]?.placeholder || '')

// Show fundSource field for top_up and for adjustment when amount is positive
const showFundSource = computed(() => {
  if (type.value === 'top_up') return true
  if (type.value === 'adjustment') {
    const amt = parseFloat(formData.value.amount)
    return !isNaN(amt) && amt > 0
  }
  return false
})

const balanceAfter = computed(() => {
  const amount = parseFloat(formData.value.amount) || 0
  const balance = parseFloat(currentBalance.value) || 0
  if (['top_up', 'sales_return'].includes(type.value)) return balance + amount
  if (['expense', 'withdrawal'].includes(type.value)) return balance - amount
  if (type.value === 'adjustment') return balance + amount
  return balance
})

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0)

// ── Validate & submit ──────────────────────────────────────────────────────────
const validate = () => {
  errors.value = {}
  const amount = parseFloat(formData.value.amount)

  if (type.value === 'adjustment') {
    if (formData.value.amount === null || formData.value.amount === '' || amount === 0) {
      errors.value.amount = 'Jumlah tidak boleh 0'
    }
    if (!formData.value.description?.trim()) {
      errors.value.description = 'Keterangan wajib diisi untuk penyesuaian'
    }
  } else {
    if (!formData.value.amount || amount <= 0) {
      errors.value.amount = 'Jumlah harus lebih dari 0'
    }
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) return

  const payload = {
    amount: parseFloat(formData.value.amount),
    transactionDate: formData.value.transactionDate || undefined,
  }

  if (formData.value.description?.trim()) {
    payload.description = formData.value.description.trim()
  }
  if (type.value === 'expense' && formData.value.expenseId?.trim()) {
    payload.expenseId = formData.value.expenseId.trim()
  }
  if (type.value === 'sales_return' && formData.value.referenceId?.trim()) {
    payload.referenceId = formData.value.referenceId.trim()
  }
  // Include fundSource for inflow operations
  if (type.value === 'top_up' && formData.value.fundSource) {
    payload.fundSource = formData.value.fundSource
  }
  if (type.value === 'adjustment') {
    const amt = parseFloat(formData.value.amount)
    if (!isNaN(amt) && amt > 0 && formData.value.fundSource) {
      payload.fundSource = formData.value.fundSource
    }
  }

  emit('submit', { type: type.value, payload })
}

// ── Open / close ───────────────────────────────────────────────────────────────
const open = (transactionType, balance = 0) => {
  type.value = transactionType
  currentBalance.value = balance
  errors.value = {}
  const defaultFundSource = typeConfig[transactionType]?.defaultFundSource ?? 'owner_cash'
  formData.value = {
    amount: null,
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    expenseId: '',
    referenceId: '',
    fundSource: defaultFundSource || 'owner_cash',
  }
  // Reset expense search
  expenseSearch.value = ''
  expenseResults.value = []
  showExpenseDropdown.value = false
  selectedExpense.value = null
  // Reset shift
  selectedShift.value = null
  openShifts.value = []
  shiftsError.value = null
  // Auto-load open shifts for sales_return
  if (transactionType === 'sales_return') {
    loadOpenShifts()
  }
  modalRef.value?.showModal()
}

const close = () => {
  showExpenseDropdown.value = false
  modalRef.value?.close()
}

defineExpose({ open, close })
</script>
