<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useTransactions } from '@/composables/finances/useTransactions'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders'
import { checkPermission } from '@/composables/usePermissions'
import {
  IconSearch,
  IconReceipt,
  IconAlertTriangle,
  IconX,
  IconRefresh,
} from '@tabler/icons-vue'
import { BANK_SELECTION_PAYMENT_METHODS } from '@/utils/paymentBanks'
import { usePaymentBanks } from '@/composables/shared/usePaymentBanks'

const props = defineProps({
  module: {
    type: String,
    required: true,
    validator: (v) => ['gym', 'restaurant'].includes(v),
  },
})

const isGym = computed(() => props.module === 'gym')

const {
  transactions,
  pagination: gymPagination,
  loading: gymLoading,
  fetchTransactions,
  cancelTransaction,
  updatePaymentMethod,
} = useTransactions()

const {
  orders,
  loading: restaurantLoading,
  currentPage,
  totalPages,
  totalItems,
  fetchOrders,
  updateOrderStatus,
  updateOrderPaymentMethod,
} = useRestaurantOrders()

const loading = computed(() => (isGym.value ? gymLoading.value : restaurantLoading.value))

const search = ref('')
const showCancelled = ref(false)
const datePreset = ref('today')
const startDate = ref(formatLocalDate(new Date()))
const endDate = ref(formatLocalDate(new Date()))
const gymPage = ref(1)
const pageLimit = ref(20)

const cancelModal = ref(false)
const cancelNotes = ref('')
const cancelTarget = ref(null)
const cancelling = ref(false)

// ── Payment change modal ──
const paymentModal = ref(false)
const paymentTarget = ref(null)
const selectedPayment = ref('')
const bankName = ref('')
const changingPayment = ref(false)
const { bankOptions } = usePaymentBanks()

const paymentMethodOptions = [
  { value: 'cash', label: 'Tunai' },
  { value: 'credit_card', label: 'Kartu Kredit' },
  { value: 'debit_card', label: 'Kartu Debit' },
  { value: 'bank_transfer', label: 'Transfer Bank' },
  { value: 'qris', label: 'QRIS' },
  { value: 'e_wallet', label: 'E-Wallet' },
  { value: 'compliment', label: 'Gratis' },
]

const requiresBankSelection = computed(() =>
  BANK_SELECTION_PAYMENT_METHODS.includes(selectedPayment.value)
)

function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v) || 0)

const formatDateTime = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const NON_CANCELLABLE_GYM = ['cancelled', 'canceled', 'refunded', 'partially_refunded', 'split', 'merged']
const NON_CANCELLABLE_RESTO = ['cancelled', 'split', 'merged']

// RBAC-08: the backend now requires the dedicated 'cancel' permission (not
// just 'update') to void a transaction/order — mirror that here so the
// "Batal" button never renders for a role that can only ever get a 403.
const canCancelPermission = computed(() => checkPermission('cancel', 'Transaction'))

const canCancelGym = (tx) => {
  const status = String(tx?.status || '').toLowerCase()
  return canCancelPermission.value && Boolean(tx?.id) && !NON_CANCELLABLE_GYM.includes(status)
}

const canCancelRestaurant = (order) => {
  const status = String(order?.status || '').toLowerCase()
  return canCancelPermission.value && Boolean(order?.id) && !NON_CANCELLABLE_RESTO.includes(status)
}

const statusBadgeClass = (s) => {
  const status = String(s || '').toLowerCase()
  if (status === 'completed' || status === 'paid') return 'badge-success'
  if (status === 'pending' || status === 'preparing' || status === 'confirmed') return 'badge-warning'
  if (status === 'cancelled' || status === 'failed') return 'badge-error'
  if (status === 'refunded') return 'badge-ghost'
  return 'badge-ghost'
}

const statusLabel = (s) => {
  const map = {
    completed: 'Selesai',
    paid: 'Dibayar',
    pending: 'Proses',
    confirmed: 'Dikonfirmasi',
    preparing: 'Dimasak',
    ready: 'Siap',
    served: 'Disajikan',
    cancelled: 'Batal',
    refunded: 'Direfund',
  }
  return map[String(s || '').toLowerCase()] || s || '-'
}

const paymentLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu Kredit',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis',
    card: 'Kartu',
    ewallet: 'E-Wallet',
    transfer: 'Transfer Bank',
  }
  return map[String(method || '').toLowerCase()] || (method || '').replace(/_/g, ' ')
}

const paymentMethods = (item) => {
  const payments = item?.payments || []
  if (!payments.length) return '-'
  const methods = [...new Set(payments.map(p => p.paymentMethod).filter(Boolean))]
  return methods.map(m => paymentLabel(m)).join(', ')
}

const applyDatePreset = (preset) => {
  datePreset.value = preset
  const now = new Date()
  if (preset === 'today') {
    const t = formatLocalDate(now)
    startDate.value = t
    endDate.value = t
  } else if (preset === 'week') {
    const s = new Date(now)
    const day = now.getDay()
    s.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
    startDate.value = formatLocalDate(s)
    endDate.value = formatLocalDate(now)
  } else if (preset === 'month') {
    startDate.value = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
    endDate.value = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  }
}

const prevPage = () => {
  if (isGym.value) {
    if (gymPage.value <= 1) return
    gymPage.value -= 1
    loadGym()
    return
  }
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  loadRestaurant()
}

const nextPage = () => {
  if (isGym.value) {
    if (gymPage.value >= (gymPagination.value.totalPages || 1)) return
    gymPage.value += 1
    loadGym()
    return
  }
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  loadRestaurant()
}

const loadGym = async () => {
  await fetchTransactions({
    page: gymPage.value,
    limit: pageLimit.value,
    transactionType: 'gym_services',
    status: showCancelled.value ? '' : undefined,
    startDate: startDate.value,
    endDate: endDate.value,
    search: search.value.trim() || undefined,
    sortBy: 'transactionDate',
    sortOrder: 'DESC',
  })
}

const loadRestaurant = async () => {
  await fetchOrders({
    page: currentPage.value,
    limit: pageLimit.value,
    startDate: startDate.value,
    endDate: endDate.value,
    search: search.value.trim() || undefined,
  })
}

const load = async () => {
  if (isGym.value) await loadGym()
  else await loadRestaurant()
}

const gymRows = computed(() => {
  const rows = transactions.value || []
  if (showCancelled.value) return rows
  return rows.filter((tx) => canCancelGym(tx))
})

const restaurantRows = computed(() => {
  const rows = orders.value || []
  if (showCancelled.value) return rows
  return rows.filter((order) => String(order?.status || '').toLowerCase() !== 'cancelled')
})

const openCancelModal = (item) => {
  cancelTarget.value = item
  cancelNotes.value = ''
  cancelModal.value = true
}

const closeCancelModal = () => {
  cancelModal.value = false
  cancelTarget.value = null
  cancelNotes.value = ''
}

const submitCancel = async () => {
  if (!cancelTarget.value?.id) return
  if (!cancelNotes.value.trim()) return

  cancelling.value = true
  try {
    if (isGym.value) {
      await cancelTransaction(cancelTarget.value.id, cancelNotes.value.trim())
    } else {
      await updateOrderStatus(cancelTarget.value.id, {
        status: 'cancelled',
        notes: cancelNotes.value.trim(),
      })
    }
    closeCancelModal()
    await load()
  } finally {
    cancelling.value = false
  }
}

const currentPaymentMethod = computed(() => {
  const item = paymentTarget.value
  if (!item?.payments?.length) return '-'
  const methods = [...new Set(item.payments.map(p => p.paymentMethod).filter(Boolean))]
  return methods.map(m => paymentLabel(m)).join(', ')
})

const openPaymentModal = (item) => {
  paymentTarget.value = item
  const firstMethod = item?.payments?.[0]?.paymentMethod
  selectedPayment.value = firstMethod || 'cash'
  bankName.value = item?.payments?.[0]?.paymentDetails?.bank || ''
  paymentModal.value = true
}

const closePaymentModal = () => {
  paymentModal.value = false
  paymentTarget.value = null
  selectedPayment.value = ''
  bankName.value = ''
}

const submitPaymentChange = async () => {
  if (!paymentTarget.value?.id) return
  if (!selectedPayment.value) return
  if (requiresBankSelection.value && !bankName.value) return

  changingPayment.value = true
  try {
    if (isGym.value) {
      await updatePaymentMethod(paymentTarget.value.id, selectedPayment.value, bankName.value)
    } else {
      await updateOrderPaymentMethod(paymentTarget.value.id, selectedPayment.value, bankName.value)
    }
    closePaymentModal()
    await load()
  } finally {
    changingPayment.value = false
  }
}

// Reset bankName when switching to a method that doesn't require bank
watch(selectedPayment, (method) => {
  if (!BANK_SELECTION_PAYMENT_METHODS.includes(method)) {
    bankName.value = ''
  }
})

let searchTimer
const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    gymPage.value = 1
    currentPage.value = 1
    load()
  }, 350)
}

watch(() => props.module, () => {
  search.value = ''
  showCancelled.value = false
  applyDatePreset('today')
  gymPage.value = 1
  currentPage.value = 1
  load()
})

watch([startDate, endDate, showCancelled, pageLimit], () => {
  gymPage.value = 1
  currentPage.value = 1
  load()
})

onMounted(() => {
  applyDatePreset('today')
  load()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold">Batal Transaksi</h1>
        <p class="text-sm text-base-content/60 mt-1">
          <template v-if="isGym">
            Batalkan transaksi gym yang salah input. Stok dan layanan terkait akan dikembalikan.
          </template>
          <template v-else>
            Batalkan order restoran yang salah input.
          </template>
        </p>
      </div>
      <button class="btn btn-ghost btn-sm gap-2" :disabled="loading" @click="load">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        Muat ulang
      </button>
    </div>

    <div class="alert alert-info text-sm">
      <IconAlertTriangle class="w-5 h-5 shrink-0" />
      <span>
        Pembatalan membutuhkan catatan. Pastikan transaksi memang tidak valid sebelum melanjutkan.
      </span>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body p-4 gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in ['today', 'week', 'month']"
            :key="preset"
            class="btn btn-xs"
            :class="datePreset === preset ? 'btn-primary' : 'btn-ghost'"
            @click="applyDatePreset(preset)"
          >
            {{ preset === 'today' ? 'Hari ini' : preset === 'week' ? 'Minggu ini' : 'Bulan ini' }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input type="date" v-model="startDate" class="input input-sm input-bordered" />
          <span class="text-base-content/40 text-sm">s/d</span>
          <input type="date" v-model="endDate" class="input input-sm input-bordered" />

          <label class="input input-sm input-bordered flex items-center gap-2 flex-1 min-w-48">
            <IconSearch class="w-3.5 h-3.5 text-base-content/40" />
            <input
              type="text"
              class="grow text-sm bg-transparent"
              :placeholder="isGym ? 'Cari no. transaksi / pelanggan...' : 'Cari no. order / pelanggan...'"
              v-model="search"
              @input="onSearchInput"
            />
          </label>

          <label class="label cursor-pointer gap-2 py-0">
            <input type="checkbox" class="checkbox checkbox-sm" v-model="showCancelled" />
            <span class="label-text text-sm">Tampilkan yang sudah batal</span>
          </label>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow overflow-hidden">
      <div v-if="loading" class="p-4 space-y-2">
        <div v-for="i in 6" :key="i" class="skeleton h-10 w-full" />
      </div>

      <div v-else-if="isGym && gymRows.length === 0" class="text-center py-16 text-base-content/40">
        <IconReceipt class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="font-medium">Tidak ada transaksi gym yang bisa dibatalkan</p>
      </div>

      <div v-else-if="!isGym && restaurantRows.length === 0" class="text-center py-16 text-base-content/40">
        <IconReceipt class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="font-medium">Tidak ada order restoran yang bisa dibatalkan</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="text-xs text-base-content/50">
              <th>Tanggal</th>
              <th>{{ isGym ? 'No. Transaksi' : 'No. Order' }}</th>
              <th>Pelanggan</th>
              <th v-if="!isGym">Meja</th>
              <th>Pembayaran</th>
              <th>Total</th>
              <th>Status</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isGym">
              <tr v-for="tx in gymRows" :key="tx.id" class="hover">
                <td class="text-xs">{{ formatDateTime(tx.transactionDate || tx.createdAt) }}</td>
                <td class="font-mono text-xs">{{ tx.transactionNumber || tx.id?.slice(0, 8) }}</td>
                <td class="text-xs">
                  <span v-if="tx.member?.firstName || tx.customerName || tx.memberName">
                    {{ tx.member ? `${tx.member.firstName} ${tx.member.lastName || ''}`.trim() : (tx.customerName || tx.memberName) }}
                  </span>
                  <span v-else class="italic text-base-content/40">Walk-in</span>
                </td>
                <td class="text-xs">
                  <button
                    v-if="canCancelGym(tx)"
                    class="link link-hover text-xs"
                    @click="openPaymentModal(tx)"
                    title="Klik untuk ubah metode pembayaran"
                  >
                    {{ paymentMethods(tx) }}
                  </button>
                  <span v-else class="text-xs">{{ paymentMethods(tx) }}</span>
                </td>
                <td class="font-semibold text-sm">{{ formatCurrency(tx.totalAmount || tx.amount) }}</td>
                <td>
                  <span class="badge badge-xs" :class="statusBadgeClass(tx.status)">{{ statusLabel(tx.status) }}</span>
                </td>
                <td class="text-right">
                  <button
                    v-if="canCancelGym(tx)"
                    class="btn btn-warning btn-xs btn-square"
                    @click="openCancelModal(tx)"
                    title="Batalkan transaksi"
                  >
                    <IconX class="w-3.5 h-3.5" />
                  </button>
                  <span v-else class="text-xs text-base-content/40">—</span>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr v-for="order in restaurantRows" :key="order.id" class="hover">
                <td class="text-xs">{{ formatDateTime(order.createdAt) }}</td>
                <td class="font-mono text-xs">{{ order.transactionNumber || order.id?.slice(0, 8) }}</td>
                <td class="text-xs">
                  <span v-if="order.member?.firstName || order.customerName">
                    {{ order.member ? `${order.member.firstName} ${order.member.lastName || ''}`.trim() : order.customerName }}
                  </span>
                  <span v-else class="italic text-base-content/40">Walk-in</span>
                </td>
                <td class="text-xs">{{ order.table?.tableNumber || '-' }}</td>
                <td class="text-xs">
                  <button
                    v-if="canCancelRestaurant(order)"
                    class="link link-hover text-xs"
                    @click="openPaymentModal(order)"
                    title="Klik untuk ubah metode pembayaran"
                  >
                    {{ paymentMethods(order) }}
                  </button>
                  <span v-else class="text-xs">{{ paymentMethods(order) }}</span>
                </td>
                <td class="font-semibold text-sm">{{ formatCurrency(order.totalAmount) }}</td>
                <td>
                  <span class="badge badge-xs" :class="statusBadgeClass(order.status)">{{ statusLabel(order.status) }}</span>
                </td>
                <td class="text-right">
                  <button
                    v-if="canCancelRestaurant(order)"
                    class="btn btn-warning btn-xs btn-square"
                    @click="openCancelModal(order)"
                    title="Batalkan order"
                  >
                    <IconX class="w-3.5 h-3.5" />
                  </button>
                  <span v-else class="text-xs text-base-content/40">—</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div
        v-if="isGym ? gymPagination.totalPages > 1 : totalPages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-base-200"
      >
        <span class="text-xs text-base-content/50">
          Halaman {{ isGym ? gymPage : currentPage }} /
          {{ isGym ? gymPagination.totalPages : totalPages }}
        </span>
        <div class="join">
          <button
            class="btn btn-xs join-item"
            :disabled="(isGym ? gymPage : currentPage) <= 1 || loading"
            @click="prevPage"
          >
            Sebelumnya
          </button>
          <button
            class="btn btn-xs join-item"
            :disabled="(isGym ? gymPage : currentPage) >= (isGym ? gymPagination.totalPages : totalPages) || loading"
            @click="nextPage"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <dialog :open="cancelModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-1">
          {{ isGym ? 'Batalkan Transaksi Gym' : 'Batalkan Order Restoran' }}
        </h3>
        <p class="text-sm text-base-content/60 mb-4 font-mono">
          {{ cancelTarget?.transactionNumber || cancelTarget?.id?.slice(0, 8) }}
        </p>

        <div class="alert alert-warning mb-4">
          <IconAlertTriangle class="w-5 h-5" />
          <span class="text-sm">Aksi ini tidak dapat dibatalkan. Lanjutkan hanya jika transaksi memang salah input.</span>
        </div>

        <div class="form-control mb-4">
          <label class="label pb-1">
            <span class="label-text font-medium">Catatan Pembatalan <span class="text-error">*</span></span>
          </label>
          <textarea
            v-model="cancelNotes"
            class="textarea textarea-bordered text-sm w-full"
            rows="3"
            placeholder="Contoh: Salah input member, duplikat transaksi..."
          />
        </div>

        <div class="modal-action mt-0 gap-2">
          <button class="btn btn-ghost btn-sm" :disabled="cancelling" @click="closeCancelModal">Tutup</button>
          <button
            class="btn btn-warning btn-xs btn-labeled min-h-7 h-7 px-3 text-xs"
            :disabled="cancelling || !cancelNotes.trim()"
            @click="submitCancel"
          >
            <span v-if="cancelling" class="loading loading-spinner loading-xs" />
            Konfirmasi Batal
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closeCancelModal"><button>close</button></form>
    </dialog>
  </Teleport>

  <!-- Payment method change modal -->
  <Teleport to="body">
    <dialog :open="paymentModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-1">Ubah Metode Pembayaran</h3>
        <p class="text-sm text-base-content/60 mb-4 font-mono">
          {{ paymentTarget?.transactionNumber || paymentTarget?.id?.slice(0, 8) }}
        </p>

        <div class="alert alert-info mb-4 text-sm">
          <IconAlertTriangle class="w-5 h-5 shrink-0" />
          <span>
            Metode pembayaran saat ini: <strong>{{ currentPaymentMethod }}</strong>
          </span>
        </div>

        <div class="form-control mb-4">
          <label class="label pb-1">
            <span class="label-text font-medium">Metode Pembayaran Baru</span>
          </label>
          <select
            v-model="selectedPayment"
            class="select select-bordered select-sm w-full"
          >
            <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div v-if="requiresBankSelection" class="form-control mb-4">
          <label class="label pb-1">
            <span class="label-text font-medium">Nama Bank <span class="text-error">*</span></span>
          </label>
          <select
            v-model="bankName"
            class="select select-bordered select-sm w-full"
            :class="{ 'select-error': requiresBankSelection && !bankName }"
          >
            <option value="">-- Pilih Bank --</option>
            <option v-for="bank in bankOptions" :key="bank.value" :value="bank.value">
              {{ bank.label }}
            </option>
          </select>
        </div>

        <div class="modal-action mt-0 gap-2">
          <button class="btn btn-ghost btn-sm" :disabled="changingPayment" @click="closePaymentModal">Batal</button>
          <button
            class="btn btn-primary btn-xs btn-labeled min-h-7 h-7 px-3 text-xs"
            :disabled="changingPayment || !selectedPayment || (requiresBankSelection && !bankName)"
            @click="submitPaymentChange"
          >
            <span v-if="changingPayment" class="loading loading-spinner loading-xs" />
            Simpan
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closePaymentModal"><button>close</button></form>
    </dialog>
  </Teleport>
</template>
