<route lang="yaml">
meta:
  title: Laporan Akun
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFinancialReports } from '@/composables/finances'
import { useCurrency } from '@/composables/core/useCurrency'
import { getTenantTimezone, todayInTz, firstDayOfMonth } from '@/utils/tenantDate'
import {
  IconBuildingBank,
  IconRefresh,
} from '@tabler/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const tenantTz = getTenantTimezone(authStore)
const today = todayInTz(tenantTz)
const { formatCurrency } = useCurrency()
const {
  accountsReport,
  loading,
  fetchAccountsReport,
} = useFinancialReports()

const filters = ref({
  startDate: firstDayOfMonth(today),
  endDate: today,
  type: '',
  isActive: 'true',
})

const generated = ref(false)

const typeLabel = (type) => {
  const map = {
    cash: 'Tunai',
    main_vault: 'Brankas Utama',
    bank: 'Bank',
    e_wallet: 'E-Wallet',
    payment_gateway: 'Payment Gateway',
    petty_cash: 'Petty Cash',
    custom: 'Lainnya',
  }
  return map[type] || type
}

const summary = computed(() => accountsReport.value?.summary || null)
const rows = computed(() => accountsReport.value?.accounts || [])
const byType = computed(() => accountsReport.value?.byType || [])

const handleGenerate = async () => {
  await fetchAccountsReport({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    type: filters.value.type || undefined,
    isActive: filters.value.isActive || undefined,
  })
  generated.value = true
}

onMounted(() => {
  handleGenerate().catch(() => {})
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl space-y-6">
    <div>
      <h1 class="text-3xl font-bold">Laporan Akun</h1>
      <p class="text-base-content/60 mt-1">
        Ringkasan saldo dan mutasi akun keuangan per periode
      </p>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <h2 class="card-title text-base">Filter</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Dari</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Sampai</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Jenis Akun</span></label>
            <select v-model="filters.type" class="select select-bordered w-full">
              <option value="">Semua</option>
              <option value="cash">Tunai</option>
              <option value="main_vault">Brankas Utama</option>
              <option value="bank">Bank</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="payment_gateway">Payment Gateway</option>
              <option value="petty_cash">Petty Cash</option>
              <option value="custom">Lainnya</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Status</span></label>
            <select v-model="filters.isActive" class="select select-bordered w-full">
              <option value="">Semua</option>
              <option value="true">Aktif</option>
              <option value="false">Non-aktif</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost btn-sm" :disabled="loading" @click="handleGenerate">
            <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            Muat Ulang
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || !filters.startDate || !filters.endDate" @click="handleGenerate">
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
          <div class="stat-title">Jumlah Akun</div>
          <div class="stat-value text-2xl">{{ summary.accountCount }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Total Saldo</div>
          <div class="stat-value text-2xl" :class="summary.totalBalance < 0 ? 'text-error' : 'text-success'">
            {{ formatCurrency(summary.totalBalance) }}
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Masuk (periode)</div>
          <div class="stat-value text-2xl text-success">{{ formatCurrency(summary.totalPeriodInflow) }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box">
          <div class="stat-title">Keluar (periode)</div>
          <div class="stat-value text-2xl text-error">{{ formatCurrency(summary.totalPeriodOutflow) }}</div>
        </div>
      </div>

      <div v-if="byType.length" class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base mb-2">Ringkasan per Jenis</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th class="text-center">Akun</th>
                  <th class="text-right">Saldo</th>
                  <th class="text-right">Masuk</th>
                  <th class="text-right">Keluar</th>
                  <th class="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in byType" :key="g.type">
                  <td class="font-medium">{{ typeLabel(g.type) }}</td>
                  <td class="text-center">{{ g.count }}</td>
                  <td class="text-right">{{ formatCurrency(g.balance) }}</td>
                  <td class="text-right text-success">{{ formatCurrency(g.periodInflow) }}</td>
                  <td class="text-right text-error">{{ formatCurrency(g.periodOutflow) }}</td>
                  <td class="text-right font-semibold" :class="g.periodNet >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(g.periodNet) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base mb-2 flex items-center gap-2">
            <IconBuildingBank class="w-5 h-5" />
            Detail Akun
          </h2>
          <div v-if="!rows.length" class="text-center py-10 text-base-content/50">
            Tidak ada akun untuk filter ini
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Akun</th>
                  <th>Jenis</th>
                  <th class="text-right">Saldo</th>
                  <th class="text-right">Masuk</th>
                  <th class="text-right">Keluar</th>
                  <th class="text-right">Net</th>
                  <th class="text-center">Entri</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="acc in rows" :key="acc.id">
                  <td>
                    <div class="font-semibold">{{ acc.name }}</div>
                    <div class="text-xs text-base-content/50 flex gap-1 flex-wrap mt-0.5">
                      <span v-if="acc.bankName" class="badge badge-xs badge-outline">{{ acc.bankName }}</span>
                      <span v-if="!acc.isActive" class="badge badge-xs badge-warning">Non-aktif</span>
                      <span v-if="acc.pendingSettlement > 0" class="badge badge-xs badge-info">
                        Pending {{ formatCurrency(acc.pendingSettlement) }}
                      </span>
                    </div>
                  </td>
                  <td>{{ typeLabel(acc.type) }}</td>
                  <td class="text-right font-semibold" :class="acc.balance < 0 ? 'text-error' : 'text-success'">
                    {{ formatCurrency(acc.balance) }}
                  </td>
                  <td class="text-right text-success">{{ formatCurrency(acc.periodInflow) }}</td>
                  <td class="text-right text-error">{{ formatCurrency(acc.periodOutflow) }}</td>
                  <td class="text-right font-medium" :class="acc.periodNet >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(acc.periodNet) }}
                  </td>
                  <td class="text-center">{{ acc.entryCount }}</td>
                  <td class="text-right">
                    <button
                      class="btn btn-ghost btn-xs"
                      @click="router.push(`/finances/accounts/${acc.id}`)"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
