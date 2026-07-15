<route lang="yaml">
meta:
  title: Detail Akun
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccounts } from '@/composables/finances'
import { useNotification } from '@/composables/core/useNotification'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import {
  IconArrowLeft,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconTransfer,
  IconAdjustments,
  IconRefresh,
  IconClock,
  IconCheck,
  IconPlus,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const confirmDialog = ref(null)
const { showWarning } = useNotification()

const {
  account, entries, balance, pagination, accounts,
  loading, actionLoading,
  fetchAccount, fetchAccounts, fetchEntries, fetchBalance, createAdjustment, transferBetweenAccounts,
} = useAccounts()

const accountId = route.params.id

// ─── Filters ─────────────────────────────────────────────────────────────────

const now = new Date()
const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
const today = now.toLocaleDateString('en-CA')

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: today,
  type: '',
  status: '',
  page: 1,
  limit: 50,
})

// ─── Adjustment Form ─────────────────────────────────────────────────────────

const showAdjForm = ref(false)
const adjForm = ref({ type: 'adjustment_credit', amount: 0, description: '' })
const hideBalance = ref(false)

// ─── Transfer Form (Tunai → Brankas Utama) ────────────────────────────────────

const showTransferForm = ref(false)
const transferForm = ref({
  toAccountId: '',
  amount: 0,
  entryDate: today,
  notes: '',
})

const isCashAccount = computed(() => account.value?.type === 'cash')
const mainVaultAccounts = computed(() =>
  (accounts.value || []).filter(a => a.type === 'main_vault' && a.isActive !== false)
)
const canTransferToVault = computed(() => isCashAccount.value && mainVaultAccounts.value.length > 0)

const HIDDEN_BALANCES_KEY = 'accounts_hidden_balances'
const syncHideFromStorage = () => {
  try {
    const raw = localStorage.getItem(HIDDEN_BALANCES_KEY)
    const ids = raw ? JSON.parse(raw) : []
    hideBalance.value = Array.isArray(ids) && ids.includes(accountId)
  } catch {
    hideBalance.value = false
  }
}

const toggleHideBalance = () => {
  hideBalance.value = !hideBalance.value
  try {
    const raw = localStorage.getItem(HIDDEN_BALANCES_KEY)
    const ids = new Set(raw ? JSON.parse(raw) : [])
    if (hideBalance.value) ids.add(accountId)
    else ids.delete(accountId)
    localStorage.setItem(HIDDEN_BALANCES_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val ?? 0)

const entryTypeLabel = (type) => {
  const map = {
    opening: 'Saldo Awal',
    inflow: 'Masuk',
    outflow: 'Keluar',
    transfer_in: 'Transfer Masuk',
    transfer_out: 'Transfer Keluar',
    settlement: 'Settlement',
    adjustment_credit: 'Koreksi (+)',
    adjustment_debit: 'Koreksi (-)',
  }
  return map[type] || type
}

const entryTypeClass = (type) => {
  const inflows = ['opening', 'inflow', 'transfer_in', 'settlement', 'adjustment_credit']
  return inflows.includes(type) ? 'text-success' : 'text-error'
}

const hasMdrFee = (entry) => /fee mdr/i.test(entry?.description || '')

const entryIcon = (type) => {
  const map = {
    opening: IconPlus,
    inflow: IconArrowDownLeft,
    outflow: IconArrowUpRight,
    transfer_in: IconTransfer,
    transfer_out: IconTransfer,
    settlement: IconClock,
    adjustment_credit: IconAdjustments,
    adjustment_debit: IconAdjustments,
  }
  return map[type] || IconPlus
}

const isInflowType = (type) =>
  ['opening', 'inflow', 'transfer_in', 'settlement', 'adjustment_credit'].includes(type)

const entryAmountSign = (type) => isInflowType(type) ? '+' : '-'

const entrySummary = computed(() => {
  const inflow = entries.value
    .filter(e => isInflowType(e.type) && e.status === 'completed')
    .reduce((s, e) => s + parseFloat(e.amount), 0)
  const outflow = entries.value
    .filter(e => !isInflowType(e.type) && e.status === 'completed')
    .reduce((s, e) => s + parseFloat(e.amount), 0)
  const pending = entries.value
    .filter(e => e.status === 'pending_settlement')
    .reduce((s, e) => s + parseFloat(e.amount), 0)
  return { inflow, outflow, pending }
})

// ─── Actions ─────────────────────────────────────────────────────────────────

const loadAll = async () => {
  await Promise.all([
    fetchAccount(accountId),
    loadEntries(),
    fetchBalance(accountId, {
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
    }),
  ])
}

const loadEntries = async () => {
  await fetchEntries(accountId, {
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    type: filters.value.type || undefined,
    status: filters.value.status || undefined,
    page: filters.value.page,
    limit: filters.value.limit,
  })
}

const applyFilters = async () => {
  filters.value.page = 1
  await Promise.all([
    loadEntries(),
    fetchBalance(accountId, {
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
    }),
  ])
}

const submitAdjustment = async () => {
  if (!adjForm.value.amount || parseFloat(adjForm.value.amount) <= 0) {
    showWarning('Jumlah harus lebih dari 0')
    return
  }
  await createAdjustment(accountId, {
    type: adjForm.value.type,
    amount: parseFloat(adjForm.value.amount),
    description: adjForm.value.description,
  })
  showAdjForm.value = false
  adjForm.value = { type: 'adjustment_credit', amount: 0, description: '' }
  await loadAll()
}

const openTransferForm = () => {
  transferForm.value = {
    toAccountId: mainVaultAccounts.value[0]?.id || '',
    amount: 0,
    entryDate: today,
    notes: '',
  }
  showTransferForm.value = true
}

const fillAllBalance = () => {
  transferForm.value.amount = Math.max(0, parseFloat(account.value?.balance || 0))
}

const submitTransfer = async () => {
  if (!transferForm.value.toAccountId) {
    showWarning('Pilih Brankas Utama tujuan')
    return
  }
  if (!transferForm.value.amount || parseFloat(transferForm.value.amount) <= 0) {
    showWarning('Jumlah harus lebih dari 0')
    return
  }
  if (parseFloat(transferForm.value.amount) > parseFloat(account.value?.balance || 0)) {
    showWarning('Jumlah melebihi saldo Tunai')
    return
  }

  await transferBetweenAccounts({
    fromAccountId: accountId,
    toAccountId: transferForm.value.toAccountId,
    amount: parseFloat(transferForm.value.amount),
    entryDate: transferForm.value.entryDate || undefined,
    notes: transferForm.value.notes || undefined,
  })

  showTransferForm.value = false
  await loadAll()
}

onMounted(async () => {
  syncHideFromStorage()
  await Promise.all([
    loadAll(),
    fetchAccounts({ isActive: 'true' }).catch(() => null),
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl space-y-6">

    <!-- Back + Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <IconArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h1 class="text-2xl font-bold">{{ account?.name || '...' }}</h1>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap text-sm text-base-content/60">
            <span v-if="account?.type" class="badge badge-sm badge-outline">
              {{ account.type === 'cash' ? 'Tunai' : account.type === 'main_vault' ? 'Brankas Utama' : account.type }}
            </span>
            <span v-if="account?.paymentMethod" class="badge badge-sm badge-ghost">{{ account.paymentMethod }}</span>
            <span v-if="account?.bankName" class="badge badge-sm badge-ghost">{{ account.bankName }}</span>
            <span v-if="account?.settlementDays > 0" class="badge badge-sm badge-info badge-outline">T+{{ account.settlementDays }}</span>
            <span v-if="account && !account.isActive" class="badge badge-sm badge-warning">Non-aktif</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="canTransferToVault"
          class="btn btn-primary btn-sm"
          @click="openTransferForm"
        >
          <IconTransfer class="w-4 h-4" />
          Mutasi ke Brankas
        </button>
        <button
          v-else-if="isCashAccount && !mainVaultAccounts.length"
          class="btn btn-outline btn-sm"
          @click="router.push('/finances/accounts')"
        >
          Buat Brankas Utama dulu
        </button>
        <button class="btn btn-outline btn-sm" @click="showAdjForm = true">
          <IconAdjustments class="w-4 h-4" />
          Koreksi Saldo
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="loadAll">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Balance Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title flex items-center gap-2">
          Saldo Sekarang
          <button class="btn btn-ghost btn-xs btn-circle" @click="toggleHideBalance">
            <IconEyeOff v-if="hideBalance" class="w-3.5 h-3.5" />
            <IconEye v-else class="w-3.5 h-3.5" />
          </button>
        </div>
        <div
          class="stat-value text-2xl"
          :class="hideBalance ? 'text-base-content/40 tracking-widest' : (parseFloat(balance?.balance ?? account?.balance) < 0 ? 'text-error' : 'text-success')"
        >
          {{ hideBalance ? '••••••••' : formatCurrency(balance?.balance ?? account?.balance) }}
        </div>
        <div class="stat-desc">Live balance</div>
      </div>
      <div v-if="balance?.pendingSettlement > 0" class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Pending Settlement</div>
        <div class="stat-value text-2xl text-warning">{{ formatCurrency(balance?.pendingSettlement) }}</div>
        <div class="stat-desc">Belum terkonfirmasi</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Masuk (periode)</div>
        <div class="stat-value text-2xl text-success">{{ formatCurrency(entrySummary.inflow) }}</div>
        <div class="stat-desc">{{ filters.startDate }} s/d {{ filters.endDate }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Keluar (periode)</div>
        <div class="stat-value text-2xl text-error">{{ formatCurrency(entrySummary.outflow) }}</div>
        <div class="stat-desc">{{ filters.startDate }} s/d {{ filters.endDate }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-box">
        <div class="stat-title">Total MDR Fee</div>
        <div class="stat-value text-2xl text-warning">{{ formatCurrency(balance?.mdrFeeTotal || 0) }}</div>
        <div class="stat-desc">Potongan fee (periode)</div>
      </div>
    </div>

    <!-- Ledger / Entries -->
    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="card-title">Riwayat Mutasi</h2>
        </div>

        <!-- Filters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="form-control">
            <label class="label py-0.5"><span class="label-text text-xs">Dari</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered input-sm w-full" @change="applyFilters" />
          </div>
          <div class="form-control">
            <label class="label py-0.5"><span class="label-text text-xs">Sampai</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered input-sm w-full" @change="applyFilters" />
          </div>
          <div class="form-control">
            <label class="label py-0.5"><span class="label-text text-xs">Tipe</span></label>
            <select v-model="filters.type" class="select select-bordered select-sm w-full" @change="applyFilters">
              <option value="">Semua</option>
              <option value="inflow">Masuk</option>
              <option value="outflow">Keluar</option>
              <option value="transfer_in">Transfer Masuk</option>
              <option value="transfer_out">Transfer Keluar</option>
              <option value="settlement">Settlement</option>
              <option value="opening">Saldo Awal</option>
              <option value="adjustment_credit">Koreksi (+)</option>
              <option value="adjustment_debit">Koreksi (-)</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-0.5"><span class="label-text text-xs">Status</span></label>
            <select v-model="filters.status" class="select select-bordered select-sm w-full" @change="applyFilters">
              <option value="">Semua</option>
              <option value="completed">Selesai</option>
              <option value="pending_settlement">Pending</option>
            </select>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-md"></span>
        </div>

        <!-- Empty -->
        <div v-else-if="!entries.length" class="text-center py-10 text-base-content/50">
          Tidak ada mutasi pada periode ini.
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>No. Entri</th>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Keterangan</th>
                <th>Status</th>
                <th class="text-right">Jumlah</th>
                <th class="text-right">Saldo Setelah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in entries" :key="entry.id" class="hover">
                <td class="font-mono text-xs">{{ entry.entryNumber || '-' }}</td>
                <td>
                  <div>{{ entry.entryDate }}</div>
                  <div v-if="entry.settlementDate" class="text-xs text-base-content/50">
                    settle: {{ entry.settlementDate }}
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-1.5">
                    <component :is="entryIcon(entry.type)" class="w-3.5 h-3.5" :class="entryTypeClass(entry.type)" />
                    <span class="text-xs">{{ entryTypeLabel(entry.type) }}</span>
                  </div>
                </td>
                <td class="max-w-xs">
                  <div class="truncate text-sm">{{ entry.description || '-' }}</div>
                  <div class="flex flex-wrap items-center gap-1 mt-0.5">
                    <span v-if="hasMdrFee(entry)" class="badge badge-xs badge-warning badge-outline">Fee MDR</span>
                    <span v-if="entry.referenceType" class="text-xs text-base-content/40">
                      {{ entry.referenceType }}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    class="badge badge-sm"
                    :class="entry.status === 'completed' ? 'badge-success badge-outline' : 'badge-warning badge-outline'"
                  >
                    <component :is="entry.status === 'completed' ? IconCheck : IconClock" class="w-3 h-3 mr-0.5" />
                    {{ entry.status === 'completed' ? 'Selesai' : 'Pending' }}
                  </span>
                </td>
                <td class="text-right font-semibold" :class="entryTypeClass(entry.type)">
                  {{ entryAmountSign(entry.type) }}{{ formatCurrency(entry.amount) }}
                </td>
                <td class="text-right text-sm">
                  <span v-if="entry.status === 'completed'">{{ formatCurrency(entry.balanceAfter) }}</span>
                  <span v-else class="text-base-content/40">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex justify-center">
          <div class="join">
            <button
              v-for="p in pagination.pages"
              :key="p"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': p === pagination.page }"
              @click="filters.page = p; loadEntries()"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div class="text-xs text-base-content/40 text-right">
          Total {{ pagination.total }} entri
        </div>
      </div>
    </div>

    <!-- Adjustment Modal -->
    <dialog class="modal" :class="{ 'modal-open': showAdjForm }">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4">Koreksi Saldo</h3>
        <div class="space-y-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Jenis Koreksi</span></label>
            <select v-model="adjForm.type" class="select select-bordered w-full">
              <option value="adjustment_credit">Tambah saldo (+)</option>
              <option value="adjustment_debit">Kurangi saldo (-)</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Jumlah</span></label>
            <CurrencyInput v-model="adjForm.amount" input-class="input input-bordered w-full" placeholder="0" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Keterangan</span></label>
            <input v-model="adjForm.description" type="text" class="input input-bordered w-full" placeholder="Alasan koreksi..." />
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showAdjForm = false">Batal</button>
          <button class="btn btn-primary" :disabled="actionLoading" @click="submitAdjustment">
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Simpan</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showAdjForm = false"></div>
    </dialog>

    <!-- Transfer Modal: Tunai → Brankas Utama -->
    <dialog class="modal" :class="{ 'modal-open': showTransferForm }">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-1">Mutasi ke Brankas Utama</h3>
        <p class="text-sm text-base-content/60 mb-4">
          Pindahkan dana dari Tunai ke Brankas. Saldo Tunai: {{ formatCurrency(account?.balance) }}
        </p>
        <div class="space-y-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tujuan</span></label>
            <select v-model="transferForm.toAccountId" class="select select-bordered w-full">
              <option v-for="vault in mainVaultAccounts" :key="vault.id" :value="vault.id">
                {{ vault.name }} — {{ formatCurrency(vault.balance) }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Jumlah</span></label>
            <div class="join w-full items-stretch">
              <CurrencyInput
                v-model="transferForm.amount"
                input-class="input input-bordered join-item w-full !h-12 min-h-12"
                placeholder="0"
              />
              <button
                type="button"
                class="btn btn-outline join-item shrink-0 !h-12 min-h-12"
                :disabled="!(parseFloat(account?.balance) > 0)"
                @click="fillAllBalance"
              >
                Semua Saldo
              </button>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tanggal</span></label>
            <input v-model="transferForm.entryDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Catatan</span></label>
            <input v-model="transferForm.notes" type="text" class="input input-bordered w-full" placeholder="Contoh: Setor kas sore" />
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showTransferForm = false">Batal</button>
          <button class="btn btn-primary" :disabled="actionLoading" @click="submitTransfer">
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Simpan Mutasi</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showTransferForm = false"></div>
    </dialog>

    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
