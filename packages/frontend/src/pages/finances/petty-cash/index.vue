<route lang="yaml">
meta:
  title: Petty Cash / Modal Awal
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Petty Cash</h1>
        <p class="text-base-content/60 mt-1">Kelola dana modal awal operasional</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Buat Dana Baru
      </button>
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="stat bg-base-100 shadow-xl rounded-xl">
        <div class="stat-figure text-primary">
          <IconWallet class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Dana Aktif</div>
        <div class="stat-value text-primary">{{ summary.totalFunds }}</div>
        <div class="stat-desc">dana terdaftar</div>
      </div>
      <div class="stat bg-base-100 shadow-xl rounded-xl">
        <div class="stat-figure text-success">
          <IconCash class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Saldo</div>
        <div class="stat-value text-success text-2xl">{{ formatCurrency(summary.totalBalance) }}</div>
        <div class="stat-desc">saldo keseluruhan</div>
      </div>
      <div class="stat bg-base-100 shadow-xl rounded-xl">
        <div class="stat-figure text-info">
          <IconCoins class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Modal Awal</div>
        <div class="stat-value text-info text-2xl">{{ formatCurrency(summary.totalInitialAmount) }}</div>
        <div class="stat-desc">jumlah saat dibuat</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Cari</span></label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama dana..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Status</span></label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="closed">Tutup</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Urutkan</span></label>
            <select v-model="filters.sortBy" class="select select-bordered w-full" @change="handleSearch">
              <option value="createdAt">Tanggal Dibuat</option>
              <option value="name">Nama</option>
              <option value="balance">Saldo</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!funds.length" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <IconWallet class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-lg font-semibold text-base-content/60">Belum ada dana modal</h3>
        <p class="text-base-content/40 mb-4">Buat dana pertama untuk mulai mengelola petty cash</p>
        <button class="btn btn-primary btn-sm w-fit mx-auto" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-1" />
          Buat Dana Baru
        </button>
      </div>
    </div>

    <!-- Fund Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="item in funds"
        :key="item.id"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
      >
        <div class="card-body">
          <!-- Card Header -->
          <div class="flex items-start justify-between mb-2">
            <div>
              <h2 class="card-title text-base">{{ item.name }}</h2>
              <p v-if="item.description" class="text-xs text-base-content/60 mt-0.5">{{ item.description }}</p>
            </div>
            <span class="badge" :class="getStatusBadgeClass(item.status)">
              {{ getStatusLabel(item.status) }}
            </span>
          </div>

          <!-- Saldo Info -->
          <div class="bg-base-200 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-base-content/60">Saldo Saat Ini</span>
              <span class="font-bold text-lg" :class="parseFloat(item.balance) > 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(item.balance) }}
              </span>
            </div>
            <div class="flex justify-between items-center mt-1">
              <span class="text-xs text-base-content/40">Modal Awal</span>
              <span class="text-sm text-base-content/60">{{ formatCurrency(item.initialAmount) }}</span>
            </div>
            <div class="flex justify-between items-center mt-0.5">
              <span class="text-xs text-base-content/40">Terpakai</span>
              <span
                class="text-xs font-medium"
                :class="parseFloat(item.initialAmount) - parseFloat(item.balance) > 0 ? 'text-error' : 'text-success'"
              >
                {{ formatCurrency(Math.abs(parseFloat(item.initialAmount) - parseFloat(item.balance))) }}
                <span v-if="parseFloat(item.balance) > parseFloat(item.initialAmount)" class="text-xs text-base-content/40"> (lebih)</span>
              </span>
            </div>
            <!-- Balance progress bar -->
            <div class="mt-2">
              <progress
                class="progress w-full"
                :class="parseFloat(item.balance) >= parseFloat(item.initialAmount) ? 'progress-info' : 'progress-success'"
                :value="parseFloat(item.balance)"
                :max="Math.max(parseFloat(item.initialAmount), parseFloat(item.balance)) || 1"
              ></progress>
            </div>
          </div>

          <!-- Location -->
          <div v-if="item.location" class="flex items-center gap-1 text-xs text-base-content/50 mb-3">
            <IconMapPin class="w-3 h-3" />
            {{ item.location.name }}
          </div>

          <!-- Actions -->
          <div v-if="item.status === 'active'" class="flex flex-wrap gap-2">
            <button class="btn btn-xs btn-success" @click="openTxModal(item, 'top_up')">
              <IconPlus class="w-3 h-3" />
              Top Up
            </button>
            <button class="btn btn-xs btn-error" @click="openTxModal(item, 'expense')">
              <IconMinus class="w-3 h-3" />
              Pengeluaran
            </button>
            <button class="btn btn-xs btn-info" @click="openTxModal(item, 'sales_return')">
              <IconRefresh class="w-3 h-3" />
              Return
            </button>
            <button class="btn btn-xs btn-warning" @click="openTxModal(item, 'adjustment')">
              <IconAdjustments class="w-3 h-3" />
              Adjust
            </button>
            <button class="btn btn-xs btn-ghost" @click="openTxModal(item, 'withdrawal')">
              <IconArrowUp class="w-3 h-3" />
              Tarik
            </button>
          </div>

          <!-- Footer actions -->
          <div class="card-actions justify-between items-center mt-3 pt-3 border-t border-base-300">
            <button class="btn btn-xs btn-ghost" @click="router.push(`/finances/petty-cash/${item.id}`)">
              <IconEye class="w-3 h-3 mr-1" />
              Detail & Riwayat
            </button>
            <div class="flex gap-1">
              <button class="btn btn-xs btn-ghost" @click="openEditModal(item)">
                <IconEdit class="w-3 h-3" />
              </button>
              <button class="btn btn-xs btn-ghost text-error" @click="handleDelete(item)">
                <IconTrash class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center mt-6">
      <div class="join">
        <button
          v-for="page in pagination.totalPages"
          :key="page"
          class="join-item btn btn-sm"
          :class="{ 'btn-active': page === pagination.page }"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modals -->
  <PettyCashFormModal
    ref="formModal"
    :loading="actionLoading"
    @submit="handleFormSubmit"
  />

  <PettyCashTransactionModal
    ref="txModal"
    :loading="actionLoading"
    @submit="handleTxSubmit"
  />

  <DialogConfirm ref="confirmDialog" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePettyCash } from '@/composables/finances'
import { useDialog } from '@/composables/core/useApi'
import { useDebounceFn } from '@vueuse/core'
import PettyCashFormModal from '@/components/finances/PettyCashFormModal.vue'
import PettyCashTransactionModal from '@/components/finances/PettyCashTransactionModal.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconPlus,
  IconMinus,
  IconEdit,
  IconTrash,
  IconEye,
  IconRefresh,
  IconWallet,
  IconCash,
  IconCoins,
  IconMapPin,
  IconAdjustments,
  IconArrowUp,
} from '@tabler/icons-vue'

const router = useRouter()

const {
  funds,
  summary,
  loading,
  actionLoading,
  pagination,
  fetchFunds,
  fetchSummary,
  createFund,
  updateFund,
  deleteFund,
  topUp,
  payExpense,
  salesReturn,
  adjustment,
  withdrawal,
} = usePettyCash()

const formModal = ref(null)
const txModal = ref(null)
const confirmDialog = ref(null)
const selectedFund = ref(null)
const dialog = useDialog()

const filters = ref({
  search: '',
  status: 'active',
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  page: 1,
  limit: 20,
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0)

const getStatusLabel = (status) => ({ active: 'Aktif', inactive: 'Nonaktif', closed: 'Tutup' }[status] || status)

const getStatusBadgeClass = (status) => ({
  active: 'badge-success',
  inactive: 'badge-warning',
  closed: 'badge-ghost',
}[status] || 'badge-ghost')

// ─── LOAD ─────────────────────────────────────────────────────────────────────

const loadFunds = async () => {
  await fetchFunds(filters.value)
}

const handleSearch = () => {
  filters.value.page = 1
  loadFunds()
}

const debouncedSearch = useDebounceFn(() => handleSearch(), 400)

const changePage = (page) => {
  filters.value.page = page
  loadFunds()
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const openCreateModal = () => {
  selectedFund.value = null
  formModal.value?.open()
}

const openEditModal = (fund) => {
  selectedFund.value = fund
  formModal.value?.open(fund)
}

const handleFormSubmit = async (data) => {
  try {
    if (selectedFund.value) {
      await updateFund(selectedFund.value.id, data)
    } else {
      await createFund(data)
    }
    formModal.value?.close()
    await Promise.all([loadFunds(), fetchSummary()])
  } catch (e) {
    // error handled in composable
  }
}

const handleDelete = async (fund) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Hapus Dana Modal',
    message: `Hapus dana "${fund.name}"? Dana hanya bisa dihapus jika saldo = 0.`,
    confirmText: 'Hapus',
    type: 'danger',
  })
  if (!confirmed) return
  try {
    await deleteFund(fund.id)
    await Promise.all([loadFunds(), fetchSummary()])
  } catch (e) {
    // error handled in composable
  }
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

const openTxModal = (fund, type) => {
  selectedFund.value = fund
  txModal.value?.open(type, parseFloat(fund.balance) || 0)
}

const handleTxSubmit = async ({ type, payload }) => {
  if (!selectedFund.value) return
  const id = selectedFund.value.id
  try {
    if (type === 'top_up') await topUp(id, payload)
    else if (type === 'expense') await payExpense(id, payload)
    else if (type === 'sales_return') await salesReturn(id, payload)
    else if (type === 'adjustment') await adjustment(id, payload)
    else if (type === 'withdrawal') await withdrawal(id, payload)

    txModal.value?.close()
    await Promise.all([loadFunds(), fetchSummary()])
  } catch (e) {
    // error handled in composable
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadFunds(), fetchSummary()])
})
</script>
