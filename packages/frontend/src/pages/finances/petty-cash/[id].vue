<route lang="yaml">
meta:
  title: Detail Dana Modal
  layout: default
</route>

<template>
  <div>
    <!-- Back -->
    <div class="mb-4">
      <button class="btn btn-ghost btn-sm gap-2" @click="router.push('/finances/petty-cash')">
        <IconArrowLeft class="w-4 h-4" />
        Kembali ke Petty Cash
      </button>
    </div>

    <!-- Loading full page -->
    <div v-if="loading && !fund" class="flex justify-center items-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="fund">
      <!-- Fund Header -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <!-- Info -->
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold">{{ fund.name }}</h1>
                <span class="badge" :class="getStatusBadgeClass(fund.status)">
                  {{ getStatusLabel(fund.status) }}
                </span>
              </div>
              <p v-if="fund.description" class="text-base-content/60 text-sm">{{ fund.description }}</p>
              <div v-if="fund.location" class="flex items-center gap-1 text-xs text-base-content/40 mt-1">
                <IconMapPin class="w-3 h-3" />
                {{ fund.location.name }}
              </div>
            </div>

            <!-- Saldo besar -->
            <div class="text-right">
              <div class="text-sm text-base-content/60">Saldo Saat Ini</div>
              <div class="text-4xl font-bold" :class="parseFloat(fund.balance) > 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(fund.balance) }}
              </div>
              <div class="text-xs text-base-content/40 mt-0.5">
                Modal Awal: {{ formatCurrency(fund.initialAmount) }}
              </div>
              <div class="text-xs mt-0.5">
                <span class="text-base-content/40">Terpakai: </span>
                <span :class="parseFloat(fund.initialAmount) - parseFloat(fund.balance) > 0 ? 'text-error' : 'text-success'">
                  {{ formatCurrency(Math.abs(parseFloat(fund.initialAmount) - parseFloat(fund.balance))) }}
                  <span v-if="parseFloat(fund.balance) > parseFloat(fund.initialAmount)" class="text-base-content/40"> (lebih)</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div v-if="fund.status === 'active'" class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-base-300">
            <button class="btn btn-sm btn-success gap-2" @click="openTxModal('top_up')">
              <IconPlus class="w-4 h-4" />
              Top Up
            </button>
            <button class="btn btn-sm btn-error gap-2" @click="openTxModal('expense')">
              <IconMinus class="w-4 h-4" />
              Catat Pengeluaran
            </button>
            <button class="btn btn-sm btn-info gap-2" @click="openTxModal('sales_return')">
              <IconRefresh class="w-4 h-4" />
              Sales Return
            </button>
            <button class="btn btn-sm btn-warning gap-2" @click="openTxModal('adjustment')">
              <IconAdjustments class="w-4 h-4" />
              Adjustment
            </button>
            <button class="btn btn-sm btn-ghost gap-2" @click="openTxModal('withdrawal')">
              <IconArrowUp class="w-4 h-4" />
              Tarik Dana
            </button>
            <div class="flex-1"></div>
            <button class="btn btn-sm btn-ghost gap-2" @click="openEditModal">
              <IconEdit class="w-4 h-4" />
              Edit
            </button>
          </div>
          <div v-else class="flex gap-2 mt-4 pt-4 border-t border-base-300">
            <button class="btn btn-sm btn-ghost gap-2" @click="openEditModal">
              <IconEdit class="w-4 h-4" />
              Edit Info
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 class="card-title">Riwayat Transaksi</h2>
            <button class="btn btn-sm btn-ghost gap-1" @click="loadTransactions">
              <IconRefresh class="w-3 h-3" />
              Refresh
            </button>
          </div>

          <!-- Transaction Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs">Tipe</span></label>
              <select v-model="txFilters.type" class="select select-bordered select-sm w-full" @change="handleTxSearch">
                <option value="">Semua Tipe</option>
                <option value="initial">Modal Awal</option>
                <option value="top_up">Top Up</option>
                <option value="expense">Pengeluaran</option>
                <option value="sales_return">Hasil Penjualan</option>
                <option value="adjustment">Penyesuaian</option>
                <option value="withdrawal">Penarikan</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs">Sumber Dana</span></label>
              <select v-model="txFilters.fundSource" class="select select-bordered select-sm w-full" @change="handleTxSearch">
                <option value="">Semua Sumber</option>
                <option value="owner_cash">Uang Tunai Owner</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="revenue">Revenue</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs">Dari Tanggal</span></label>
              <input v-model="txFilters.startDate" type="date" class="input input-bordered input-sm w-full" @change="handleTxSearch" />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs">Sampai Tanggal</span></label>
              <input v-model="txFilters.endDate" type="date" class="input input-bordered input-sm w-full" @change="handleTxSearch" />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs">Tampilkan</span></label>
              <select v-model="txFilters.limit" class="select select-bordered select-sm w-full" @change="handleTxSearch">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>

          <!-- Table loading -->
          <div v-if="txLoading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <!-- Empty transactions -->
          <div v-else-if="!transactions.length" class="text-center py-10 text-base-content/40">
            <IconReceipt class="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Belum ada riwayat transaksi</p>
          </div>

          <!-- Transactions Table -->
          <div v-else class="overflow-x-auto">
            <table class="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>No. Transaksi</th>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th class="text-right">Jumlah</th>
                  <th class="text-right">Saldo Sebelum</th>
                  <th class="text-right">Saldo Sesudah</th>
                  <th>Keterangan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in transactions" :key="tx.id">
                  <td>
                    <span class="font-mono text-xs">{{ tx.transactionNumber }}</span>
                  </td>
                  <td class="text-sm">{{ formatDate(tx.transactionDate) }}</td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <span class="badge badge-xs" :class="getTxTypeBadgeClass(tx.type)">
                        {{ getTxTypeLabel(tx.type) }}
                      </span>
                      <span v-if="tx.fundSource" class="badge badge-xs badge-ghost opacity-70">
                        {{ tx.fundSource }}
                      </span>
                    </div>
                  </td>
                  <td class="text-right font-semibold" :class="parseFloat(tx.amount) >= 0 ? 'text-success' : 'text-error'">
                    {{ parseFloat(tx.amount) >= 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}
                  </td>
                  <td class="text-right text-sm text-base-content/60">{{ formatCurrency(tx.balanceBefore) }}</td>
                  <td class="text-right text-sm font-medium">{{ formatCurrency(tx.balanceAfter) }}</td>
                  <td class="max-w-xs">
                    <div class="text-xs truncate">{{ tx.description || '-' }}</div>
                    <div v-if="tx.referenceType" class="text-xs text-base-content/40">
                      {{ tx.referenceType }} #{{ tx.referenceId?.slice(0, 8) }}...
                    </div>
                  </td>
                  <td class="text-xs text-base-content/60">
                    {{ tx.performer ? `${tx.performer.firstName} ${tx.performer.lastName}` : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Tx Pagination -->
          <div v-if="txPagination.totalPages > 1" class="flex justify-center mt-4">
            <div class="join">
              <button
                v-for="page in txPagination.totalPages"
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': page === txPagination.page }"
                @click="changeTxPage(page)"
              >
                {{ page }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="text-center py-16 text-base-content/40">
      <p class="text-lg">Dana tidak ditemukan.</p>
      <button class="btn btn-primary btn-sm mt-4" @click="router.push('/finances/petty-cash')">
        Kembali
      </button>
    </div>
  </div>

  <!-- Modals -->
  <PettyCashFormModal ref="formModal" :loading="actionLoading" @submit="handleFormSubmit" />
  <PettyCashTransactionModal ref="txModal" :loading="actionLoading" @submit="handleTxSubmit" />
  <DialogConfirm ref="confirmDialog" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePettyCash } from '@/composables/finances'
import PettyCashFormModal from '@/components/finances/PettyCashFormModal.vue'
import PettyCashTransactionModal from '@/components/finances/PettyCashTransactionModal.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconArrowLeft,
  IconArrowUp,
  IconPlus,
  IconMinus,
  IconEdit,
  IconRefresh,
  IconAdjustments,
  IconMapPin,
  IconReceipt,
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()

const {
  fund,
  transactions,
  loading,
  actionLoading,
  txPagination,
  fetchFund,
  fetchTransactions,
  updateFund,
  topUp,
  payExpense,
  salesReturn,
  adjustment,
  withdrawal,
} = usePettyCash()

const txLoading = ref(false)
const formModal = ref(null)
const txModal = ref(null)
const confirmDialog = ref(null)

const txFilters = ref({
  type: '',
  fundSource: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 20,
  sortBy: 'transactionDate',
  sortOrder: 'DESC',
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0)

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getStatusLabel = (s) => ({ active: 'Aktif', inactive: 'Nonaktif', closed: 'Tutup' }[s] || s)
const getStatusBadgeClass = (s) => ({ active: 'badge-success', inactive: 'badge-warning', closed: 'badge-ghost' }[s] || '')

const TX_TYPE_MAP = {
  initial:      { label: 'Modal Awal',      badge: 'badge-info' },
  top_up:       { label: 'Top Up',          badge: 'badge-success' },
  expense:      { label: 'Pengeluaran',     badge: 'badge-error' },
  sales_return: { label: 'Hasil Penjualan', badge: 'badge-success' },
  adjustment:   { label: 'Penyesuaian',     badge: 'badge-warning' },
  withdrawal:   { label: 'Penarikan',       badge: 'badge-error' },
}
const getTxTypeLabel = (type) => TX_TYPE_MAP[type]?.label || type
const getTxTypeBadgeClass = (type) => TX_TYPE_MAP[type]?.badge || ''

// ─── LOAD ─────────────────────────────────────────────────────────────────────

const loadTransactions = async () => {
  txLoading.value = true
  try {
    await fetchTransactions(route.params.id, txFilters.value)
  } finally {
    txLoading.value = false
  }
}

const handleTxSearch = () => {
  txFilters.value.page = 1
  loadTransactions()
}

const changeTxPage = (page) => {
  txFilters.value.page = page
  loadTransactions()
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const openEditModal = () => {
  formModal.value?.open(fund.value)
}

const handleFormSubmit = async (data) => {
  try {
    await updateFund(route.params.id, data)
    formModal.value?.close()
    await fetchFund(route.params.id)
  } catch (e) {}
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

const openTxModal = (type) => {
  txModal.value?.open(type, parseFloat(fund.value?.balance) || 0)
}

const handleTxSubmit = async ({ type, payload }) => {
  const id = route.params.id
  try {
    if (type === 'top_up') await topUp(id, payload)
    else if (type === 'expense') await payExpense(id, payload)
    else if (type === 'sales_return') await salesReturn(id, payload)
    else if (type === 'adjustment') await adjustment(id, payload)
    else if (type === 'withdrawal') await withdrawal(id, payload)

    txModal.value?.close()
    await Promise.all([fetchFund(id), loadTransactions()])
  } catch (e) {}
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  const id = route.params.id
  await fetchFund(id)
  await loadTransactions()
})
</script>
