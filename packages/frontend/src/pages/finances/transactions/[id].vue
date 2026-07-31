<route lang="yaml">
meta:
  title: Detail Transaksi
  layout: default
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactions } from '@/composables/finances/useTransactions'
import {
  IconArrowLeft,
  IconReceipt,
  IconUser,
  IconShoppingCart,
  IconCreditCard,
  IconCalendar,
  IconHash,
  IconCheck,
  IconX,
  IconClock,
  IconRefresh,
  IconAlertTriangle,
} from '@tabler/icons-vue'

defineOptions({ inheritAttrs: false })

const route  = useRoute()
const router = useRouter()
const { transaction, detailLoading, loading, fetchTransactionById, cancelTransaction, refundTransaction, refundTransactionItems } = useTransactions()

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/finances/transactions')
}

// ── Refund modal state ────────────────────────────────────────────────────────
const cancelModal   = ref(false)
const cancelNotes   = ref('')
const refundModal   = ref(false)
const refundMode    = ref('full')   // 'full' | 'partial'
const refundNotes   = ref('')
const selectedItems = ref([])       // item IDs selected for partial refund

const refundableItems = computed(() =>
  (tx.value?.transactionItems || []).filter(i => !i.isRefunded)
)

const refundAmount = computed(() => {
  if (refundMode.value === 'full') return totalAmount.value
  return (tx.value?.transactionItems || [])
    .filter(i => selectedItems.value.includes(i.id))
    .reduce((sum, i) => sum + Number(i.subtotal || i.total || 0), 0)
})

const canRefund = computed(() => {
  const s = tx.value?.status
  return s === 'completed' || s === 'paid'
})

const canCancel = computed(() => {
  const status = String(tx.value?.status || '').toLowerCase()
  return Boolean(tx.value?.id) && !['cancelled', 'canceled', 'refunded', 'partially_refunded'].includes(status)
})

const openCancelModal = () => {
  cancelNotes.value = ''
  cancelModal.value = true
}

const submitCancel = async () => {
  await cancelTransaction(id, cancelNotes.value.trim())
  cancelModal.value = false
}

const openRefundModal = () => {
  refundMode.value    = 'full'
  refundNotes.value   = ''
  selectedItems.value = []
  refundModal.value   = true
}

const toggleItem = (itemId) => {
  const idx = selectedItems.value.indexOf(itemId)
  if (idx === -1) selectedItems.value.push(itemId)
  else selectedItems.value.splice(idx, 1)
}

const submitRefund = async () => {
  if (refundMode.value === 'full') {
    await refundTransaction(id, refundNotes.value)
  } else {
    if (!selectedItems.value.length) return
    await refundTransactionItems(id, selectedItems.value, refundNotes.value)
  }
  refundModal.value = false
}

const id = route.params.id
onMounted(() => fetchTransactionById(id))

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v) || 0)

const fmtDT = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusBadgeClass = (s) => {
  if (s === 'completed' || s === 'paid')         return 'badge-success'
  if (s === 'pending')                            return 'badge-warning'
  if (s === 'cancelled' || s === 'failed')        return 'badge-error'
  if (s === 'refunded')                           return 'badge-ghost'
  if (s === 'partially_refunded')                 return 'badge-warning'
  return 'badge-ghost'
}
const statusLabel = (s) => {
  const map = { completed: 'Selesai', paid: 'Dibayar', pending: 'Proses', cancelled: 'Batal', failed: 'Gagal', refunded: 'Direfund', partially_refunded: 'Partial Refund' }
  return map[s] || s || '-'
}
const typeLabel = (t) => {
  const map = { restaurant: 'Restoran', gym_services: 'Gym / Membership', pos: 'POS' }
  return map[t] || t || '-'
}
const orderTypeLabel = (t) => {
  const map = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
  return map[t] || t || '-'
}
const paymentMethodLabel = (m) => {
  const map = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu', credit_card: 'Kartu Kredit', debit_card: 'Kartu Debit', bank_transfer: 'Transfer Bank', debit: 'Debit', credit: 'Kredit', e_wallet: 'E-Wallet', compliment: 'Komplemen', voucher: 'Voucher' }
  return map[m] || m || '-'
}
const paymentStatusClass = (s) => {
  if (s === 'completed') return 'badge-success'
  if (s === 'pending')   return 'badge-warning'
  if (s === 'failed')    return 'badge-error'
  return 'badge-ghost'
}

const tx = transaction
const items    = computed(() => tx.value?.transactionItems || [])
const payments = computed(() => tx.value?.payments || [])
const subtotal      = computed(() => Number(tx.value?.subtotal)       || 0)
const tax           = computed(() => Number(tx.value?.tax)            || 0)
const serviceCharge = computed(() => Number(tx.value?.serviceCharge)  || 0)
const voucherDiscount = computed(() => Number(tx.value?.voucherDiscount) || 0)
const roundingAmount  = computed(() => Number(tx.value?.roundingAmount)  || 0)
const totalAmount   = computed(() => Number(tx.value?.totalAmount)    || 0)
const paidAmount    = computed(() => Number(tx.value?.paidAmount)     || 0)
const changeAmount  = computed(() => Number(tx.value?.changeAmount)   || 0)
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-5xl">

    <!-- Back + Header -->
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="goBack">
        <IconArrowLeft class="w-4 h-4" />
        Kembali
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="detailLoading" class="space-y-4">
      <div class="skeleton h-10 w-64"></div>
      <div class="skeleton h-40 w-full"></div>
      <div class="skeleton h-64 w-full"></div>
    </div>

    <template v-else-if="tx">

      <!-- Title row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold font-mono">{{ tx.transactionNumber }}</h1>
          <div class="flex items-center gap-2 mt-1 text-sm text-base-content/60">
            <IconCalendar class="w-4 h-4" />
            {{ fmtDT(tx.transactionDate) }}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="badge badge-md">{{ typeLabel(tx.transactionType) }}</span>
          <span v-if="tx.orderType" class="badge badge-md badge-ghost">{{ orderTypeLabel(tx.orderType) }}</span>
          <span class="badge badge-md" :class="statusBadgeClass(tx.status)">{{ statusLabel(tx.status) }}</span>
          <button v-if="canCancel" class="btn btn-warning btn-sm" @click="openCancelModal">
            <IconAlertTriangle class="w-4 h-4" />
            Batal Transaksi
          </button>
          <button v-if="canRefund" class="btn btn-error btn-sm" @click="openRefundModal">
            <IconRefresh class="w-4 h-4" />
            Refund
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left col: Items + Payments -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Items -->
          <div class="card bg-base-100 shadow">
            <div class="card-body p-0">
              <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-base-200">
                <IconShoppingCart class="w-4 h-4 text-primary" />
                <h2 class="font-semibold">Item Pesanan</h2>
                <span class="badge badge-sm badge-ghost ml-auto">{{ items.length }} item</span>
              </div>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs text-base-content/50">
                      <th>#</th>
                      <th>Nama Item</th>
                      <th class="text-right">Harga Satuan</th>
                      <th class="text-center">Qty</th>
                      <th class="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, i) in items" :key="item.id" class="hover">
                      <td class="text-base-content/30 text-xs">{{ i + 1 }}</td>
                      <td>
                        <div class="font-medium text-sm">{{ item.itemName }}</div>
                        <div class="text-xs text-base-content/40 capitalize">{{ item.itemType }}</div>
                      </td>
                      <td class="text-right text-sm">{{ fmt(item.unitPrice) }}</td>
                      <td class="text-center font-semibold">{{ item.quantity }}</td>
                      <td class="text-right font-semibold text-sm">{{ fmt(item.subtotal || item.total) }}</td>
                    </tr>
                    <tr v-if="!items.length">
                      <td colspan="5" class="text-center text-base-content/40 py-4 text-sm">Tidak ada item</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Payments -->
          <div class="card bg-base-100 shadow">
            <div class="card-body p-0">
              <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-base-200">
                <IconCreditCard class="w-4 h-4 text-success" />
                <h2 class="font-semibold">Pembayaran</h2>
                <span class="badge badge-sm badge-ghost ml-auto">{{ payments.length }} transaksi</span>
              </div>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs text-base-content/50">
                      <th>Metode</th>
                      <th>Waktu</th>
                      <th>Diskon Voucher</th>
                      <th>Status</th>
                      <th class="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pay in payments" :key="pay.id" class="hover">
                      <td class="font-medium text-sm">{{ paymentMethodLabel(pay.paymentMethod) }}</td>
                      <td class="text-xs text-base-content/60">{{ fmtDT(pay.paymentDate) }}</td>
                      <td class="text-sm">
                        <span v-if="Number(pay.voucherDiscount) > 0" class="text-error">
                          -{{ fmt(pay.voucherDiscount) }}
                        </span>
                        <span v-else class="text-base-content/30">-</span>
                      </td>
                      <td>
                        <span class="badge badge-xs" :class="paymentStatusClass(pay.status)">
                          {{ statusLabel(pay.status) }}
                        </span>
                      </td>
                      <td class="text-right font-semibold text-sm">{{ fmt(pay.amount) }}</td>
                    </tr>
                    <tr v-if="!payments.length">
                      <td colspan="5" class="text-center text-base-content/40 py-4 text-sm">Belum ada pembayaran</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <!-- Right col: Info + Bill Summary -->
        <div class="space-y-6">

          <!-- Customer Info -->
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <IconUser class="w-4 h-4 text-primary" />
                <h2 class="font-semibold">Pelanggan</h2>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/50">Nama</span>
                  <span class="font-medium">
                    {{ tx.customerName || tx.member?.name || 'Walk-in' }}
                  </span>
                </div>
                <div v-if="tx.customerPhone" class="flex justify-between">
                  <span class="text-base-content/50">Telepon</span>
                  <span>{{ tx.customerPhone }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/50">Tipe</span>
                  <span class="capitalize badge badge-ghost badge-sm">{{ tx.customerType || '-' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bill Summary -->
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <IconReceipt class="w-4 h-4 text-primary" />
                <h2 class="font-semibold">Ringkasan Tagihan</h2>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/50">Subtotal</span>
                  <span>{{ fmt(subtotal) }}</span>
                </div>
                <div v-if="tax > 0" class="flex justify-between">
                  <span class="text-base-content/50">Pajak</span>
                  <span>{{ fmt(tax) }}</span>
                </div>
                <div v-if="serviceCharge > 0" class="flex justify-between">
                  <span class="text-base-content/50">Service Charge</span>
                  <span>{{ fmt(serviceCharge) }}</span>
                </div>
                <div v-if="voucherDiscount > 0" class="flex justify-between text-error">
                  <span>Diskon Voucher</span>
                  <span>-{{ fmt(voucherDiscount) }}</span>
                </div>
                <div v-if="roundingAmount !== 0" class="flex justify-between text-base-content/50">
                  <span>Pembulatan</span>
                  <span>{{ roundingAmount > 0 ? '+' : '' }}{{ fmt(roundingAmount) }}</span>
                </div>
                <div class="divider my-1"></div>
                <div class="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span class="text-primary">{{ fmt(totalAmount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/50">Dibayar</span>
                  <span class="font-medium">{{ fmt(paidAmount) }}</span>
                </div>
                <div v-if="changeAmount > 0" class="flex justify-between">
                  <span class="text-base-content/50">Kembalian</span>
                  <span class="font-medium text-success">{{ fmt(changeAmount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="flex items-center gap-2 mb-3">
                <IconClock class="w-4 h-4 text-primary" />
                <h2 class="font-semibold">Waktu</h2>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/50">Dibuat</span>
                  <span class="text-xs text-right">{{ fmtDT(tx.createdAt) }}</span>
                </div>
                <div v-if="tx.completedAt" class="flex justify-between">
                  <span class="text-base-content/50 flex items-center gap-1">
                    <IconCheck class="w-3.5 h-3.5 text-success" /> Selesai
                  </span>
                  <span class="text-xs text-right">{{ fmtDT(tx.completedAt) }}</span>
                </div>
                <div v-if="tx.cancelledAt" class="flex justify-between">
                  <span class="text-base-content/50 flex items-center gap-1">
                    <IconX class="w-3.5 h-3.5 text-error" /> Dibatalkan
                  </span>
                  <span class="text-xs text-right">{{ fmtDT(tx.cancelledAt) }}</span>
                </div>
                <div v-if="tx.cancelReason || tx.cancellationReason || tx.reason" class="flex justify-between items-start gap-4">
                  <span class="text-base-content/50">Alasan Batal</span>
                  <span class="text-xs text-right max-w-[14rem] break-words">{{ tx.cancelReason || tx.cancellationReason || tx.reason }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>

    <!-- Not found -->
    <div v-else class="text-center py-24 text-base-content/40">
      <IconReceipt class="w-16 h-16 mx-auto mb-4 opacity-20" />
      <p class="text-lg font-medium">Transaksi tidak ditemukan</p>
    </div>

  </div>

  <!-- ── Cancel Modal ─────────────────────────────────────────────────── -->
  <Teleport to="body">
  <dialog :open="cancelModal" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-1">Batalkan Transaksi</h3>
      <p class="text-sm text-base-content/60 mb-4 font-mono">{{ tx?.transactionNumber }}</p>

      <div class="alert alert-warning mb-4">
        <IconAlertTriangle class="w-5 h-5" />
        <span class="text-sm">Aksi ini akan menandai transaksi sebagai dibatalkan. Lanjutkan hanya jika transaksi memang tidak valid.</span>
      </div>

      <div class="form-control mb-4">
        <label class="label pb-1"><span class="label-text font-medium">Catatan Pembatalan</span></label>
        <textarea v-model="cancelNotes" class="textarea textarea-bordered text-sm w-full"
          rows="3" placeholder="Masukkan catatan pembatalan..."></textarea>
      </div>

      <div class="modal-action mt-0 gap-2">
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="cancelModal = false">Tutup</button>
        <button class="btn btn-warning btn-sm" :disabled="loading" @click="submitCancel">
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Konfirmasi Batal
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="cancelModal = false"><button>close</button></form>
  </dialog>
  </Teleport>

  <!-- ── Refund Modal ─────────────────────────────────────────────────── -->
  <Teleport to="body">
  <dialog :open="refundModal" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-1">Refund Transaksi</h3>
      <p class="text-sm text-base-content/60 mb-4 font-mono">{{ tx?.transactionNumber }}</p>

      <!-- Mode toggle -->
      <div class="form-control mb-4">
        <label class="label pb-1"><span class="label-text font-medium">Jenis Refund</span></label>
        <div class="join w-full">
          <button class="join-item btn btn-sm flex-1"
            :class="refundMode === 'full' ? 'btn-error' : 'btn-ghost'"
            @click="refundMode = 'full'; selectedItems.splice(0)">
            Refund Penuh
          </button>          <button class="join-item btn btn-sm flex-1"
            :class="refundMode === 'partial' ? 'btn-warning' : 'btn-ghost'"
            @click="refundMode = 'partial'">
            Refund Sebagian
          </button>
        </div>
      </div>

      <!-- Item selection for partial -->
      <div v-if="refundMode === 'partial'" class="mb-4">
        <label class="label pb-1"><span class="label-text font-medium">Pilih Item</span></label>
        <div class="border border-base-300 rounded-lg divide-y divide-base-200 max-h-52 overflow-y-auto">
          <label v-for="item in tx?.transactionItems || []" :key="item.id"
            class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-base-200 transition-colors"
            :class="{ 'opacity-40 cursor-not-allowed': item.isRefunded }">
            <input type="checkbox"
              class="checkbox checkbox-sm checkbox-error"
              :value="item.id"
              :checked="selectedItems.includes(item.id)"
              :disabled="item.isRefunded"
              @change="toggleItem(item.id)" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ item.itemName }}</div>
              <div class="text-xs text-base-content/50">× {{ item.quantity }}</div>
            </div>
            <div class="text-sm font-semibold shrink-0">
              {{ fmt(item.subtotal || item.total) }}
            </div>
            <span v-if="item.isRefunded" class="badge badge-xs badge-ghost shrink-0">Sudah direfund</span>
          </label>
        </div>
        <p v-if="!refundableItems.length" class="text-xs text-base-content/40 mt-2 text-center">
          Semua item sudah direfund
        </p>
      </div>

      <!-- Notes -->
      <div class="form-control mb-4">
        <label class="label pb-1"><span class="label-text font-medium">Alasan Refund</span></label>
        <textarea v-model="refundNotes" class="textarea textarea-bordered text-sm w-full"
          rows="2" placeholder="Opsional — tulis alasan refund..."></textarea>
      </div>

      <!-- Summary -->
      <div class="bg-base-200 rounded-lg px-4 py-3 mb-5 flex justify-between items-center">
        <span class="text-sm text-base-content/60">Jumlah Refund</span>
        <span class="font-bold text-lg text-error">{{ fmt(refundAmount) }}</span>
      </div>

      <div class="modal-action mt-0 gap-2">
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="refundModal = false">Batal</button>
        <button class="btn btn-error btn-sm"
          :disabled="loading || (refundMode === 'partial' && !selectedItems.length) || refundAmount === 0"
          @click="submitRefund">
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Konfirmasi Refund
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="refundModal = false"><button>close</button></form>
  </dialog>
  </Teleport>

</template>
