<route lang="yaml">
meta:
  title: Akun Keuangan
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccounts } from '@/composables/finances'
import { useNotification } from '@/composables/core/useNotification'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import { usePaymentBanks } from '@/composables/shared/usePaymentBanks'
import {
  IconBuildingBank,
  IconPlus,
  IconRefresh,
  IconWallet,
  IconCreditCard,
  IconCash,
  IconPencil,
  IconTrash,
  IconChevronRight,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-vue'

const router = useRouter()
const confirmDialog = ref(null)
const { showWarning } = useNotification()

const {
  accounts,
  loading, actionLoading,
  fetchAccounts, createAccount, updateAccount, deleteAccount,
} = useAccounts()

const { bankOptions, loadBanks } = usePaymentBanks()

// ─── Hide / show balance ──────────────────────────────────────────────────────

const HIDDEN_BALANCES_KEY = 'accounts_hidden_balances'
const hiddenBalances = ref(new Set())

const loadHiddenBalances = () => {
  try {
    const raw = localStorage.getItem(HIDDEN_BALANCES_KEY)
    const ids = raw ? JSON.parse(raw) : []
    hiddenBalances.value = new Set(Array.isArray(ids) ? ids : [])
  } catch {
    hiddenBalances.value = new Set()
  }
}

const persistHiddenBalances = () => {
  localStorage.setItem(HIDDEN_BALANCES_KEY, JSON.stringify([...hiddenBalances.value]))
}

const isBalanceHidden = (id) => hiddenBalances.value.has(id)

const toggleBalanceVisibility = (id) => {
  const next = new Set(hiddenBalances.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  hiddenBalances.value = next
  persistHiddenBalances()
}

const displayBalance = (acc) =>
  isBalanceHidden(acc.id) ? '••••••••' : formatCurrency(acc.balance)

const displayOpening = (acc) =>
  isBalanceHidden(acc.id) ? '••••' : formatCurrency(acc.openingBalance)

// ─── Form State ───────────────────────────────────────────────────────────────

const showForm = ref(false)
const editingAccount = ref(null)

const emptyForm = () => ({
  accountKind: 'bank', // cash | bank | e_wallet | payment_gateway | petty_cash | custom
  bankName: '',
  name: '',
  openingBalance: 0,
  openingDate: new Date().toLocaleDateString('en-CA'),
  settlementDays: 0,
  description: '',
})

const form = ref(emptyForm())

const accountKindOptions = [
  { value: 'cash', label: 'Tunai / Cash', hint: 'Akun kas tunai — bisa dipilih sebagai sumber dana di expenses' },
  { value: 'bank', label: 'Bank (BCA / Mandiri / ...)', hint: 'Semua QRIS, transfer, kartu dengan bank details masuk ke akun ini' },
  { value: 'e_wallet', label: 'E-Wallet', hint: 'GoPay, OVO, DANA tanpa bank details' },
  { value: 'payment_gateway', label: 'Payment Gateway', hint: 'Midtrans, Stripe, dll' },
  { value: 'petty_cash', label: 'Petty Cash / Modal', hint: 'Dana kas kecil / modal' },
  { value: 'custom', label: 'Lainnya', hint: 'Akun custom tanpa auto-match' },
]

const formName = computed(() => {
  if (editingAccount.value) return form.value.name || editingAccount.value.name
  if (form.value.accountKind === 'bank' && form.value.bankName) {
    return `Bank ${String(form.value.bankName).toUpperCase()}`
  }
  if (form.value.accountKind === 'cash') return 'Tunai'
  return form.value.name || accountKindOptions.find(o => o.value === form.value.accountKind)?.label || ''
})

const selectedKindHint = computed(() =>
  accountKindOptions.find(o => o.value === form.value.accountKind)?.hint || ''
)

// ─── Computed ─────────────────────────────────────────────────────────────────

const grouped = computed(() => {
  const groups = {}
  for (const acc of accounts.value) {
    const g = acc.type || 'custom'
    if (!groups[g]) groups[g] = []
    groups[g].push(acc)
  }
  return groups
})

const typeLabel = (type) => {
  const map = {
    cash: 'Tunai',
    bank: 'Bank',
    e_wallet: 'E-Wallet',
    payment_gateway: 'Payment Gateway',
    petty_cash: 'Petty Cash',
    custom: 'Lainnya',
  }
  return map[type] || type
}

const typeIcon = (type) => {
  const map = {
    cash: IconCash,
    bank: IconBuildingBank,
    e_wallet: IconWallet,
    payment_gateway: IconCreditCard,
    petty_cash: IconCash,
    custom: IconBuildingBank,
  }
  return map[type] || IconBuildingBank
}

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val ?? 0)

const settlementLabel = (days) => days === 0 ? 'Langsung (T+0)' : `T+${days}`

// ─── Actions ─────────────────────────────────────────────────────────────────

const openCreate = () => {
  editingAccount.value = null
  form.value = emptyForm()
  showForm.value = true
}

const openEdit = (acc) => {
  editingAccount.value = acc
  form.value = {
    accountKind: acc.type || 'bank',
    bankName: acc.bankName || '',
    name: acc.name,
    openingBalance: parseFloat(acc.openingBalance),
    openingDate: acc.openingDate,
    settlementDays: acc.settlementDays || 0,
    description: acc.description || '',
  }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editingAccount.value = null
}

const submitForm = async () => {
  if (!form.value.openingDate) {
    showWarning('Tanggal awal wajib diisi')
    return
  }

  if (form.value.accountKind === 'bank' && !form.value.bankName) {
    showWarning('Pilih bank (BCA / Mandiri)')
    return
  }

  if (!['bank', 'cash'].includes(form.value.accountKind) && !form.value.name?.trim() && !editingAccount.value) {
    showWarning('Nama akun wajib diisi')
    return
  }

  const name = editingAccount.value
    ? (form.value.name || editingAccount.value.name)
    : formName.value

  const payload = {
    name,
    type: form.value.accountKind,
    paymentMethod: form.value.accountKind === 'bank'
      ? null
      : form.value.accountKind === 'cash'
        ? 'cash'
        : (['e_wallet', 'payment_gateway'].includes(form.value.accountKind) ? form.value.accountKind : null),
    bankName: form.value.accountKind === 'bank' ? form.value.bankName : null,
    openingBalance: parseFloat(form.value.openingBalance) || 0,
    openingDate: form.value.openingDate,
    settlementDays: parseInt(form.value.settlementDays) || 0,
    description: form.value.description,
  }

  if (editingAccount.value) {
    await updateAccount(editingAccount.value.id, {
      name: payload.name,
      description: payload.description,
      settlementDays: payload.settlementDays,
      bankName: payload.bankName,
    })
  } else {
    await createAccount(payload)
  }
  closeForm()
}

const confirmDelete = async (acc) => {
  const confirmed = await confirmDialog.value?.open({
    title: 'Hapus Akun',
    message: `Hapus akun "${acc.name}"? Aksi ini tidak bisa dibatalkan.`,
    confirmText: 'Hapus',
    type: 'error',
  })
  if (!confirmed) return
  await deleteAccount(acc.id)
}

const goToDetail = (acc) => {
  router.push(`/finances/accounts/${acc.id}`)
}

onMounted(async () => {
  loadHiddenBalances()
  await Promise.all([loadBanks(), fetchAccounts()])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Akun Keuangan</h1>
        <p class="text-base-content/60 mt-1">
          Satu akun per bank. Semua QRIS, transfer, dan kartu dengan bank details otomatis masuk ke akun bank tersebut.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="fetchAccounts()">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
        <button class="btn btn-primary btn-sm" @click="openCreate">
          <IconPlus class="w-4 h-4" />
          Tambah Akun
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !accounts.length" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty -->
    <div v-else-if="!accounts.length" class="card bg-base-100 shadow">
      <div class="card-body items-center text-center py-16 gap-3">
        <IconBuildingBank class="w-12 h-12 text-base-content/30" />
        <h3 class="font-semibold text-lg">Belum ada akun</h3>
        <p class="text-base-content/60 text-sm max-w-xs">
          Tambahkan akun Bank BCA dan Bank Mandiri. Semua payment method dengan bank details akan masuk ke akun bank yang sesuai.
        </p>
        <button class="btn btn-primary btn-sm mt-2" @click="openCreate">
          <IconPlus class="w-4 h-4" />
          Tambah Akun Pertama
        </button>
      </div>
    </div>

    <!-- Account groups -->
    <div v-for="(items, type) in grouped" :key="type" class="space-y-3">
      <div class="flex items-center gap-2">
        <component :is="typeIcon(type)" class="w-5 h-5 text-base-content/50" />
        <h2 class="font-semibold text-base-content/70">{{ typeLabel(type) }}</h2>
        <div class="badge badge-sm badge-ghost">{{ items.length }}</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="acc in items"
          :key="acc.id"
          class="card bg-base-100 shadow cursor-pointer hover:shadow-md transition-shadow border border-base-300"
          @click="goToDetail(acc)"
        >
          <div class="card-body gap-2 p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-semibold truncate">{{ acc.name }}</h3>
                  <span v-if="!acc.isActive" class="badge badge-sm badge-warning">Non-aktif</span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-xs text-base-content/50 flex-wrap">
                  <span v-if="acc.bankName" class="badge badge-xs badge-primary badge-outline">{{ acc.bankName }}</span>
                  <span v-else-if="acc.paymentMethod" class="badge badge-xs badge-ghost">{{ acc.paymentMethod }}</span>
                  <span v-if="acc.bankName" class="badge badge-xs badge-ghost">Semua metode → bank ini</span>
                  <span v-if="acc.settlementDays > 0" class="badge badge-xs badge-info badge-outline">{{ settlementLabel(acc.settlementDays) }}</span>
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <button
                  class="btn btn-ghost btn-xs"
                  title="Edit"
                  @click.stop="openEdit(acc)"
                >
                  <IconPencil class="w-3.5 h-3.5" />
                </button>
                <button
                  class="btn btn-ghost btn-xs text-error"
                  title="Hapus"
                  @click.stop="confirmDelete(acc)"
                >
                  <IconTrash class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div class="divider my-0.5"></div>

            <div class="flex items-end justify-between">
              <div>
                <div class="flex items-center gap-1.5">
                  <div class="text-xs text-base-content/50">Saldo</div>
                  <button
                    class="btn btn-ghost btn-xs btn-circle"
                    :title="isBalanceHidden(acc.id) ? 'Tampilkan saldo' : 'Sembunyikan saldo'"
                    @click.stop="toggleBalanceVisibility(acc.id)"
                  >
                    <IconEyeOff v-if="isBalanceHidden(acc.id)" class="w-3.5 h-3.5" />
                    <IconEye v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div
                  class="text-xl font-bold"
                  :class="isBalanceHidden(acc.id) ? 'text-base-content/40 tracking-widest' : (parseFloat(acc.balance) < 0 ? 'text-error' : 'text-success')"
                >
                  {{ displayBalance(acc) }}
                </div>
              </div>
              <button class="btn btn-ghost btn-xs gap-1" @click.stop="goToDetail(acc)">
                Mutasi
                <IconChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="text-xs text-base-content/40">
              Saldo awal {{ displayOpening(acc) }} per {{ acc.openingDate }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <dialog class="modal" :class="{ 'modal-open': showForm }">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">
          {{ editingAccount ? 'Edit Akun' : 'Tambah Akun Baru' }}
        </h3>

        <div class="space-y-3">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Jenis Akun <span class="text-error">*</span></span></label>
            <select
              v-model="form.accountKind"
              class="select select-bordered w-full"
              :disabled="!!editingAccount"
            >
              <option v-for="opt in accountKindOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <label class="label">
              <span class="label-text-alt text-base-content/50">{{ selectedKindHint }}</span>
            </label>
          </div>

          <div v-if="form.accountKind === 'bank'" class="form-control">
            <label class="label"><span class="label-text font-medium">Bank <span class="text-error">*</span></span></label>
            <select
              v-model="form.bankName"
              class="select select-bordered w-full"
              :disabled="!!editingAccount"
            >
              <option value="">— Pilih bank —</option>
              <option v-for="bank in bankOptions" :key="bank.value" :value="bank.value">
                {{ bank.label }}
              </option>
            </select>
            <label class="label">
              <span class="label-text-alt text-info">QRIS / Transfer / Kartu dengan bank ini → masuk ke akun ini</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Akun</span>
              <span v-if="!editingAccount && ['bank', 'cash'].includes(form.accountKind)" class="label-text-alt text-base-content/50">
                Auto: "{{ formName }}"
              </span>
            </label>
            <input
              v-if="editingAccount || !['bank', 'cash'].includes(form.accountKind)"
              v-model="form.name"
              type="text"
              class="input input-bordered w-full"
              :placeholder="form.accountKind === 'bank' ? 'Bank BCA' : 'Nama akun'"
            />
            <div v-else class="input input-bordered w-full bg-base-200 flex items-center text-base-content/60 text-sm">
              {{ formName || '(otomatis)' }}
            </div>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Hari Settlement</span></label>
            <select v-model="form.settlementDays" class="select select-bordered w-full">
              <option :value="0">Langsung (T+0) — masuk saldo hari yang sama</option>
              <option :value="1">T+1 — masuk saldo keesokan harinya</option>
              <option :value="2">T+2</option>
              <option :value="3">T+3</option>
              <option :value="7">T+7</option>
            </select>
          </div>

          <div class="divider text-sm text-base-content/50 my-1">Saldo Awal</div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label"><span class="label-text font-medium">Saldo Awal <span class="text-error">*</span></span></label>
              <CurrencyInput v-model="form.openingBalance" input-class="input input-bordered w-full" placeholder="0" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-medium">Per Tanggal <span class="text-error">*</span></span></label>
              <input v-model="form.openingDate" type="date" class="input input-bordered w-full" />
            </div>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Deskripsi</span></label>
            <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="2" placeholder="Catatan tambahan..."></textarea>
          </div>
        </div>

        <div class="modal-action mt-4">
          <button class="btn btn-ghost" @click="closeForm">Batal</button>
          <button class="btn btn-primary" :disabled="actionLoading" @click="submitForm">
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>{{ editingAccount ? 'Simpan Perubahan' : 'Buat Akun' }}</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeForm"></div>
    </dialog>

    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
