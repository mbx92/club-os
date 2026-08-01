<route lang="yaml">
meta:
  title: Transaksi Akun
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFinancialReports, useAccounts } from '@/composables/finances'
import { useCurrency } from '@/composables/core/useCurrency'
import { getTenantTimezone, todayInTz, firstDayOfMonth } from '@/utils/tenantDate'
import {
  IconListDetails,
  IconRefresh,
  IconArrowDownLeft,
  IconArrowUpRight,
} from '@tabler/icons-vue'

const authStore = useAuthStore()
const tenantTz = getTenantTimezone(authStore)
const today = todayInTz(tenantTz)
const { formatCurrency } = useCurrency()
const { accounts, fetchAccounts } = useAccounts()
const {
  accountTransactionsReport,
  accountTransactionsMeta,
  loading,
  fetchAccountTransactionsReport,
} = useFinancialReports()

const filters = ref({
  startDate: firstDayOfMonth(today),
  endDate: today,
  accountId: '',
  type: '',
  status: '',
  page: 1,
  limit: 50,
})

const generated = ref(false)

const INFLOW_TYPES = new Set(['opening', 'inflow', 'transfer_in', 'settlement', 'adjustment_credit'])

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

const isInflow = (type) => INFLOW_TYPES.has(type)

const summary = computed(() => accountTransactionsReport.value?.summary || null)
const entries = computed(() => accountTransactionsReport.value?.entries || [])
const meta = computed(() => accountTransactionsMeta.value || { page: 1, limit: 50, total: 0, pages: 0 })

const handleGenerate = async (resetPage = true) => {
  if (resetPage) filters.value.page = 1
  await fetchAccountTransactionsReport({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    accountId: filters.value.accountId || undefined,
    type: filters.value.type || undefined,
    status: filters.value.status || undefined,
    page: filters.value.page,
    limit: filters.value.limit,
  })
  generated.value = true
}

const goPage = async (page) => {
  if (page < 1 || page > (meta.value.pages || 1)) return
  filters.value.page = page
  await handleGenerate(false)
}

onMounted(async () => {
  await fetchAccounts({ isActive: 'true' }).catch(() => null)
  await handleGenerate().catch(() => {})
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl space-y-6">
    <div>
      <h1 class="text-3xl font-bold">Transaksi Akun</h1>
      <p class="text-base-content/60 mt-1">
        Riwayat mutasi ledger akun keuangan per periode
      </p>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <h2 class="card-title text-base">Filter</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Dari</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Sampai</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Akun</span></label>
            <select v-model="filters.accountId" class="select select-bordered w-full">
              <option value="">Semua akun</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.name }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Tipe</span></label>
            <select v-model="filters.type" class="select select-bordered w-full">
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
            <label class="label py-1"><span class="label-text text-sm">Status</span></label>
            <select v-model="filters.status" class="select select-bordered w-full">
              <option value="">Semua</option>
              <option value="completed">Selesai</option>
              <option value="pending_settlement">Pending</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost btn-sm" :disabled="loading" @click="handleGenerate()">
            <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            Muat Ulang
          </button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="loading || !filters.startDate || !filters.endDate"
            @click="handleGenerate()"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Generate Report</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading && !generated" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="summary">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Total Entri</div>
          <div class="stat-value text-2xl">{{ summary.totalEntries }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Masuk</div>
          <div class="stat-value text-2xl text-success">{{ formatCurrency(summary.periodInflow) }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Keluar</div>
          <div class="stat-value text-2xl text-error">{{ formatCurrency(summary.periodOutflow) }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Net</div>
          <div
            class="stat-value text-2xl"
            :class="summary.periodNet >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatCurrency(summary.periodNet) }}
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base mb-2 flex items-center gap-2">
            <IconListDetails class="w-5 h-5" />
            Daftar Mutasi
          </h2>

          <div v-if="!entries.length" class="text-center py-10 text-base-content/50">
            Tidak ada transaksi untuk filter ini
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Akun</th>
                  <th>Tipe</th>
                  <th>Keterangan</th>
                  <th class="text-right">Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in entries" :key="entry.id">
                  <td class="whitespace-nowrap text-sm">{{ entry.entryDate }}</td>
                  <td>
                    <div class="font-medium">{{ entry.account?.name || '—' }}</div>
                    <div v-if="entry.account?.bankName" class="text-xs text-base-content/50">
                      {{ entry.account.bankName }}
                    </div>
                  </td>
                  <td>
                    <span class="inline-flex items-center gap-1 text-sm">
                      <IconArrowDownLeft v-if="isInflow(entry.type)" class="w-3.5 h-3.5 text-success" />
                      <IconArrowUpRight v-else class="w-3.5 h-3.5 text-error" />
                      {{ entryTypeLabel(entry.type) }}
                    </span>
                  </td>
                  <td class="max-w-xs">
                    <div class="truncate text-sm" :title="entry.description">
                      {{ entry.description || '—' }}
                    </div>
                    <div v-if="entry.entryNumber" class="text-xs text-base-content/40 font-mono">
                      {{ entry.entryNumber }}
                    </div>
                  </td>
                  <td
                    class="text-right font-semibold whitespace-nowrap"
                    :class="isInflow(entry.type) ? 'text-success' : 'text-error'"
                  >
                    {{ isInflow(entry.type) ? '+' : '-' }}{{ formatCurrency(entry.amount) }}
                  </td>
                  <td>
                    <span
                      class="badge badge-sm"
                      :class="entry.status === 'completed' ? 'badge-success badge-outline' : 'badge-warning badge-outline'"
                    >
                      {{ entry.status === 'completed' ? 'Selesai' : 'Pending' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="meta.pages > 1" class="flex items-center justify-between pt-3">
            <div class="text-sm text-base-content/50">
              Halaman {{ meta.page }} / {{ meta.pages }} · {{ meta.total }} entri
            </div>
            <div class="join">
              <button class="btn btn-sm join-item" :disabled="meta.page <= 1 || loading" @click="goPage(meta.page - 1)">
                Prev
              </button>
              <button class="btn btn-sm join-item" :disabled="meta.page >= meta.pages || loading" @click="goPage(meta.page + 1)">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
