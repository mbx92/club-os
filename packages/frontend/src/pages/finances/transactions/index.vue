<route lang="yaml">
meta:
  title: Transaksi
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTransactions } from '@/composables/finances/useTransactions'
import {
  IconRefresh,
  IconSearch,
  IconCalendar,
  IconReceipt,
  IconShoppingCart,
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-vue'

const { transactions, pagination, loading, fetchTransactions } = useTransactions()

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function firstOfMonth() {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
function lastOfMonth() {
  const d = new Date()
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)

const formatDateTime = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Filters ───────────────────────────────────────────────────────────────────
const selectedPeriod = ref('month')
const filters = ref({
  page: 1,
  limit: 10,
  transactionType: '',   // '' = semua, 'restaurant', 'gym_services'
  status: '',
  sortBy: 'transactionDate',
  sortOrder: 'DESC',
  startDate: firstOfMonth(),
  endDate: lastOfMonth(),
  search: '',
})

const setPeriod = (p) => {
  selectedPeriod.value = p
  const now = new Date()
  if (p === 'today') {
    const t = formatLocalDate(now)
    filters.value.startDate = t; filters.value.endDate = t
  } else if (p === 'week') {
    const s = new Date(now)
    const day = now.getDay()
    s.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
    filters.value.startDate = formatLocalDate(s); filters.value.endDate = formatLocalDate(now)
  } else if (p === 'month') {
    filters.value.startDate = firstOfMonth(); filters.value.endDate = lastOfMonth()
  } else if (p === 'year') {
    filters.value.startDate = `${now.getFullYear()}-01-01`
    filters.value.endDate   = `${now.getFullYear()}-12-31`
  }
  filters.value.page = 1
  load()
}

const toggleSort = (col) => {
  if (filters.value.sortBy === col) {
    filters.value.sortOrder = filters.value.sortOrder === 'DESC' ? 'ASC' : 'DESC'
  } else {
    filters.value.sortBy = col
    filters.value.sortOrder = 'DESC'
  }
  filters.value.page = 1
  load()
}

// ── Load ──────────────────────────────────────────────────────────────────────
const load = () => {
  const p = { ...filters.value }
  if (!p.transactionType) delete p.transactionType
  if (!p.status) delete p.status
  if (!p.search) delete p.search
  fetchTransactions(p)
}

let searchTimer
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { filters.value.page = 1; load() }, 400)
}

const goPage = (p) => { filters.value.page = p; load() }

onMounted(load)

// ── Computed ──────────────────────────────────────────────────────────────────
const currentPage  = computed(() => pagination.value.currentPage || pagination.value.page || filters.value.page || 1)
const currentLimit = computed(() => pagination.value.itemsPerPage || pagination.value.limit || pagination.value.perPage || filters.value.limit || 10)
const totalItems   = computed(() => pagination.value.totalItems || pagination.value.total || 0)
const totalPages   = computed(() => pagination.value.totalPages || pagination.value.lastPage || Math.ceil(totalItems.value / currentLimit.value) || 1)
const pageRange = computed(() => {
  const cur = currentPage.value
  const last = totalPages.value
  const pages = []
  const delta = 2
  for (let i = Math.max(1, cur - delta); i <= Math.min(last, cur + delta); i++) pages.push(i)
  return pages
})

// ── UI helpers ────────────────────────────────────────────────────────────────
const typeLabel = (t) => {
  const map = { restaurant: 'Restoran', gym_services: 'Gym/Membership', pos: 'POS' }
  return map[t] || t || '-'
}
const typeBadgeClass = (t) => {
  if (t === 'restaurant') return 'badge-primary'
  if (t === 'gym_services') return 'badge-secondary'
  return 'badge-ghost'
}
const statusBadgeClass = (s) => {
  if (s === 'completed' || s === 'paid') return 'badge-success'
  if (s === 'pending') return 'badge-warning'
  if (s === 'cancelled' || s === 'failed') return 'badge-error'
  return 'badge-ghost'
}
const statusLabel = (s) => {
  const map = { completed: 'Selesai', paid: 'Dibayar', pending: 'Proses', cancelled: 'Batal', failed: 'Gagal' }
  return map[s] || s || '-'
}
const paymentMethodLabel = (m) => {
  const map = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu', credit_card: 'Kartu', debit_card: 'Kartu Debit', bank_transfer: 'Transfer Bank', debit: 'Debit', credit: 'Kredit', e_wallet: 'E-Wallet', compliment: 'Komplemen', voucher: 'Voucher' }
  return map[m] || m || '-'
}
const itemsSummary = (tx) => {
  const items = tx.transactionItems || []
  if (!items.length) return '-'
  const first = items[0].itemName
  return items.length > 1 ? `${first} +${items.length - 1}` : first
}
const orderTypeLabel = (t) => {
  const map = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' }
  return map[t] || t || ''
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Transaksi</h1>
        <p class="text-base-content/60 mt-1">Riwayat semua transaksi — restoran, gym, dan layanan</p>
      </div>
      <button class="btn btn-ghost btn-sm" :disabled="loading" @click="load">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        Perbarui
      </button>
    </div>

    <!-- Filter Card -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body py-3 px-4 space-y-3">

        <!-- Period -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-base-content/50 shrink-0">Periode:</span>
          <div class="join">
            <button v-for="[k,v] in [['today','Hari Ini'],['week','Minggu'],['month','Bulan'],['year','Tahun']]"
              :key="k" class="join-item btn btn-xs"
              :class="selectedPeriod === k ? 'btn-primary' : 'btn-ghost'"
              @click="setPeriod(k)">{{ v }}</button>
          </div>
          <div class="flex items-center gap-1 ml-1">
            <IconCalendar class="w-4 h-4 text-base-content/30" />
            <input type="date" class="input input-xs input-bordered" v-model="filters.startDate"
              @change="selectedPeriod='custom'; filters.page=1; load()" />
            <span class="text-base-content/30">–</span>
            <input type="date" class="input input-xs input-bordered" v-model="filters.endDate"
              @change="selectedPeriod='custom'; filters.page=1; load()" />
          </div>
        </div>

        <!-- Second row -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search -->
          <label class="input input-sm input-bordered flex items-center gap-2 flex-1 min-w-48">
            <IconSearch class="w-3.5 h-3.5 text-base-content/40" />
            <input type="text" placeholder="Cari transaksi..." class="grow text-sm bg-transparent"
              v-model="filters.search" @input="onSearch" />
          </label>

          <!-- Tipe -->
          <select v-model="filters.transactionType" class="select select-sm select-bordered"
            @change="filters.page=1; load()">
            <option value="">Semua Tipe</option>
            <option value="restaurant">Restoran</option>
            <option value="gym_services">Gym / Membership</option>
          </select>

          <!-- Status -->
          <select v-model="filters.status" class="select select-sm select-bordered"
            @change="filters.page=1; load()">
            <option value="">Semua Status</option>
            <option value="completed">Selesai</option>
            <option value="paid">Dibayar</option>
            <option value="pending">Proses</option>
            <option value="cancelled">Batal</option>
          </select>

          <!-- Limit -->
          <select v-model.number="filters.limit" class="select select-sm select-bordered"
            @change="filters.page=1; load()">
            <option :value="10">10 / hal</option>
            <option :value="25">25 / hal</option>
            <option :value="50">50 / hal</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary strip -->
    <div v-if="!loading && totalItems" class="text-xs text-base-content/50 mb-3 px-1">
      Menampilkan {{ ((currentPage - 1) * currentLimit) + 1 }}–{{ Math.min(currentPage * currentLimit, totalItems) }}
      dari <span class="font-semibold text-base-content">{{ totalItems }}</span> transaksi
    </div>

    <!-- Table -->
    <div class="card bg-base-100 shadow-xl overflow-hidden">
      <!-- Skeleton -->
      <div v-if="loading" class="p-4 space-y-2">
        <div v-for="i in filters.limit" :key="i" class="skeleton h-10 w-full"></div>
      </div>

      <div v-else-if="transactions.length === 0" class="text-center py-16 text-base-content/40">
        <IconReceipt class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="font-medium">Tidak ada transaksi</p>
        <p class="text-xs mt-1">Coba ubah filter atau rentang tanggal</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="text-base-content/50 text-xs">
              <th>#</th>
              <th>
                <button class="flex items-center gap-1 hover:text-base-content transition-colors"
                  @click="toggleSort('transactionDate')">
                  Tanggal
                  <span v-if="filters.sortBy === 'transactionDate'">
                    <IconArrowUp v-if="filters.sortOrder === 'ASC'" class="w-3 h-3" />
                    <IconArrowDown v-else class="w-3 h-3" />
                  </span>
                </button>
              </th>
              <th>No. Order</th>
              <th>Tipe</th>
              <th>Pelanggan</th>
              <th>Item</th>
              <th>Pembayaran</th>
              <th>Status</th>
              <th>
                <button class="flex items-center gap-1 hover:text-base-content transition-colors"
                  @click="toggleSort('totalAmount')">
                  Total
                  <span v-if="filters.sortBy === 'totalAmount'">
                    <IconArrowUp v-if="filters.sortOrder === 'ASC'" class="w-3 h-3" />
                    <IconArrowDown v-else class="w-3 h-3" />
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tx, i) in transactions" :key="tx.id || i" class="hover">
              <td class="text-base-content/30 text-xs">
                {{ ((currentPage - 1) * currentLimit) + i + 1 }}
              </td>
              <td class="text-xs">
                {{ formatDateTime(tx.transactionDate || tx.createdAt) }}
              </td>
              <td>
                <router-link
                  :to="`/finances/transactions/${tx.id}`"
                  class="font-mono text-xs font-medium link link-primary hover:link-hover"
                >{{ tx.transactionNumber || tx.id?.slice(0,8) || '-' }}</router-link>
                <div v-if="tx.orderType" class="text-xs text-base-content/40">{{ orderTypeLabel(tx.orderType) }}</div>
              </td>
              <td>
                <span class="badge badge-xs" :class="typeBadgeClass(tx.transactionType)">
                  {{ typeLabel(tx.transactionType) }}
                </span>
              </td>
              <td class="text-xs">
                <span v-if="tx.customerName || tx.memberName" class="font-medium">
                  {{ tx.customerName || tx.memberName }}
                </span>
                <span v-else class="text-base-content/40 italic">Walk-in</span>
                <div v-if="tx.customerPhone" class="text-base-content/40">{{ tx.customerPhone }}</div>
              </td>
              <td class="text-xs max-w-40">
                <div class="truncate" :title="(tx.transactionItems || []).map(i => i.itemName).join(', ')">{{ itemsSummary(tx) }}</div>
              </td>
              <td class="text-xs">
                <template v-if="tx.payments && tx.payments.length">
                  <div class="font-medium capitalize">{{ paymentMethodLabel(tx.payments[0].paymentMethod) }}</div>
                  <div v-if="tx.payments.length > 1" class="text-base-content/40">+{{ tx.payments.length - 1 }} lainnya</div>
                </template>
                <span v-else class="text-base-content/30">-</span>
              </td>
              <td>
                <span class="badge badge-xs" :class="statusBadgeClass(tx.status)">
                  {{ statusLabel(tx.status) }}
                </span>
              </td>
              <td class="font-semibold text-sm text-right">
                {{ formatCurrency(tx.totalAmount || tx.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && totalPages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-base-200">
        <span class="text-xs text-base-content/50">
          Halaman {{ currentPage }} dari {{ totalPages }}
        </span>
        <div class="join">
          <button class="join-item btn btn-xs btn-ghost"
            :disabled="currentPage <= 1"
            @click="goPage(currentPage - 1)">
            <IconChevronLeft class="w-3.5 h-3.5" />
          </button>
          <button v-if="pageRange[0] > 1" class="join-item btn btn-xs btn-ghost" @click="goPage(1)">1</button>
          <span v-if="pageRange[0] > 2" class="join-item btn btn-xs btn-disabled">…</span>
          <button v-for="p in pageRange" :key="p"
            class="join-item btn btn-xs"
            :class="p === currentPage ? 'btn-primary' : 'btn-ghost'"
            @click="goPage(p)">{{ p }}</button>
          <span v-if="pageRange[pageRange.length-1] < totalPages - 1" class="join-item btn btn-xs btn-disabled">…</span>
          <button v-if="pageRange[pageRange.length-1] < totalPages" class="join-item btn btn-xs btn-ghost" @click="goPage(totalPages)">{{ totalPages }}</button>
          <button class="join-item btn btn-xs btn-ghost"
            :disabled="currentPage >= totalPages"
            @click="goPage(currentPage + 1)">
            <IconChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
