<route lang="yaml">
meta:
  title: Cashier Dashboard
  layout: default
</route>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCashRegister } from '@/composables/gym/cash-register'
import { useCurrency } from '@/composables/core/useCurrency'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import dayjs from 'dayjs'
import {
  IconCash,
  IconCashRegister,
  IconClock,
  IconCalendar,
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconRefresh,
  IconPrinter,
  IconChevronDown,
  IconX,
  IconReceipt
} from '@tabler/icons-vue'

const { dashboard, selectedSession, loading, getDashboard, printShiftReport } = useCashRegister()
const { formatCurrency } = useCurrency()
const { locations: locationList, fetchLocations } = useRestaurantLocations()

const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const selectedLocationId = ref('')
const activeSessionId = ref(null)

// Computed helpers
const currentShift = computed(() => dashboard.value?.currentSession || null)
const todaySessions = computed(() => dashboard.value?.todaySessions || [])
const aggregate = computed(() => dashboard.value?.todayAggregate || {})
const totals = computed(() => dashboard.value?.totals || {})
const recentHistory = computed(() => dashboard.value?.recentHistory || [])
const targetDate = computed(() => dashboard.value?.targetDate || selectedDate.value)

const locations = computed(() => locationList.value || [])

const loadDashboard = async (sessionId = null) => {
  try {
    const params = { date: selectedDate.value }
    if (selectedLocationId.value) params.locationId = selectedLocationId.value
    if (sessionId) params.sessionId = sessionId
    await getDashboard(params)
  } catch {
    // handled by composable
  }
}

// Watchers: re-fetch when date or location changes
watch(selectedDate, () => loadDashboard())
watch(selectedLocationId, () => loadDashboard())

const shownSession = computed(() => {
  if (activeSessionId.value && selectedSession.value) return selectedSession.value
  return null
})
const shownTransactions = computed(() => {
  if (shownSession.value) return shownSession.value.transactions || []
  if (currentShift.value) return currentShift.value.transactions || []
  return []
})

const getDiffClass = (diff) => {
  const n = parseFloat(diff)
  if (n === 0 || isNaN(n)) return ''
  return n > 0 ? 'text-info' : 'text-error'
}

const getDiffBadge = (diff) => {
  const n = parseFloat(diff)
  if (n === 0 || isNaN(n)) return 'badge-success'
  return n > 0 ? 'badge-info' : 'badge-error'
}

const viewSession = async (id) => {
  if (activeSessionId.value === id) {
    // Toggle off
    activeSessionId.value = null
    await loadDashboard()
  } else {
    activeSessionId.value = id
    await loadDashboard(id)
  }
}

const handlePrintReport = async (sessionId) => {
  try {
    await printShiftReport(sessionId)
  } catch {
    // handled by composable
  }
}

const getPaymentMethodLabel = (method) => {
  const map = {
    cash: 'Tunai',
    credit_card: 'Kartu Kredit',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet',
    compliment: 'Gratis (Compliment)',
    // legacy aliases
    card: 'Kartu Kredit',
    ewallet: 'E-Wallet',
    transfer: 'Transfer Bank',
  }
  return map[method] || map[method?.toLowerCase()] || method || '-'
}

const getPaymentBadgeClass = (method) => {
  const map = {
    cash: 'badge-success',
    credit_card: 'badge-info',
    debit_card: 'badge-info',
    bank_transfer: 'badge-accent',
    qris: 'badge-warning',
    e_wallet: 'badge-secondary',
    compliment: 'badge-ghost',
    // legacy aliases
    card: 'badge-info',
    ewallet: 'badge-secondary',
    transfer: 'badge-accent',
  }
  return map[method] || map[method?.toLowerCase()] || 'badge-ghost'
}

onMounted(async () => {
  // Fetch locations for filter dropdown
  fetchLocations({ limit: 100 }).catch(() => {})
  await loadDashboard()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <IconCashRegister class="w-7 h-7 text-primary" />
          Dashboard Kasir
        </h1>
        <p class="text-sm text-base-content/60 mt-1">Ringkasan kas harian, riwayat shift, dan semua transaksi</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-if="locations.length > 0"
          v-model="selectedLocationId"
          class="select select-bordered select-sm w-44"
        >
          <option value="">Semua Lokasi</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
        <input type="date" class="input input-bordered input-sm w-36" v-model="selectedDate" />
        <button class="btn btn-ghost btn-sm" @click="loadDashboard()" :disabled="loading">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !dashboard" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else class="space-y-6">

      <!-- â•â•â• Current Active Shift â•â•â• -->
      <div v-if="currentShift" class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 rounded-full p-2 text-primary">
                <IconCashRegister class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-lg font-bold capitalize">Shift Aktif: {{ currentShift.shiftName }}</h2>
                <p class="text-sm text-base-content/60 flex items-center gap-1">
                  <IconClock class="w-3.5 h-3.5" />
                  Dibuka {{ dayjs(currentShift.openedAt).format('HH:mm') }}
                  <span v-if="currentShift.openedBy"> oleh {{ currentShift.openedBy.firstName }} {{ currentShift.openedBy.lastName }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-sm btn-outline gap-1.5" @click="handlePrintReport(currentShift.id)" :disabled="loading">
                <IconPrinter class="w-4 h-4" />
                Cetak Laporan
              </button>
              <div class="badge badge-lg bg-success/10 border-0 text-success">
                <span class="relative flex h-2 w-2 mr-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                OPEN
              </div>
            </div>
          </div>

          <!-- Live Summary -->
          <div v-if="currentShift.liveSummary" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div class="bg-base-200/50 rounded-lg p-3">
              <div class="text-xs text-base-content/50 flex items-center gap-1"><IconWallet class="w-3.5 h-3.5"/>Modal Awal</div>
              <div class="text-lg font-bold">{{ formatCurrency(currentShift.liveSummary.openingBalance) }}</div>
            </div>
            <div class="bg-base-200/50 rounded-lg p-3">
              <div class="text-xs text-base-content/50 flex items-center gap-1"><IconArrowUpRight class="w-3.5 h-3.5"/>Kas Masuk</div>
              <div class="text-lg font-bold text-success">{{ formatCurrency(currentShift.liveSummary.cashIn) }}</div>
            </div>
            <div class="bg-base-200/50 rounded-lg p-3">
              <div class="text-xs text-base-content/50 flex items-center gap-1"><IconArrowDownRight class="w-3.5 h-3.5"/>Kas Keluar</div>
              <div class="text-lg font-bold text-error">{{ formatCurrency(currentShift.liveSummary.cashOut) }}</div>
            </div>
            <div class="bg-primary/5 rounded-lg p-3">
              <div class="text-xs text-primary/70 flex items-center gap-1"><IconCash class="w-3.5 h-3.5"/>Estimasi Kas</div>
              <div class="text-lg font-bold text-primary">{{ formatCurrency(currentShift.liveSummary.expectedCash) }}</div>
            </div>
          </div>

          <!-- Transactions of Current Active Shift -->
          <div class="mt-4">
            <h3 class="font-semibold text-sm mb-2 flex items-center gap-2">
              <IconReceipt class="w-4 h-4" />
              Transaksi Shift Ini
              <span class="badge badge-sm badge-primary">{{ (currentShift.transactions || []).length }}</span>
            </h3>
            <div v-if="!currentShift.transactions || currentShift.transactions.length === 0" class="text-center text-base-content/40 py-6 text-sm bg-base-200/30 rounded-lg">
              Belum ada transaksi di shift ini
            </div>
            <div v-else class="overflow-x-auto">
              <table class="table table-xs">
                <thead>
                  <tr class="bg-base-200/50">
                    <th>No. Order</th>
                    <th>Waktu</th>
                    <th>Kasir</th>
                    <th class="text-right">Total</th>
                    <th>Pembayaran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="trx in currentShift.transactions" :key="trx.id" class="hover">
                    <td class="font-mono text-xs font-semibold">{{ trx.transactionNumber }}</td>
                    <td class="text-xs text-base-content/60">{{ dayjs(trx.createdAt).format('HH:mm') }}</td>
                    <td class="text-xs">
                      <span v-if="trx.createdByUser">{{ trx.createdByUser.firstName }} {{ trx.createdByUser.lastName }}</span>
                      <span v-else class="text-base-content/30">-</span>
                    </td>
                    <td class="text-right font-semibold text-sm">{{ formatCurrency(parseFloat(trx.totalAmount) || 0) }}</td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="p in (trx.payments || [])"
                          :key="p.id || p.method"
                          :class="['badge badge-xs', getPaymentBadgeClass(p.method)]"
                        >
                          {{ getPaymentMethodLabel(p.method) }}
                          <span v-if="p.amount" class="ml-0.5">{{ formatCurrency(parseFloat(p.amount)) }}</span>
                        </span>
                        <span v-if="!trx.payments || trx.payments.length === 0" class="text-base-content/30 text-xs">-</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- No active shift info -->
      <div v-else class="alert alert-info shadow-sm">
        <IconInfoCircle class="w-5 h-5 shrink-0" />
        <span>Tidak ada shift aktif saat ini.</span>
        <router-link to="/cash-register" class="btn btn-sm btn-primary">Buka Shift</router-link>
      </div>

      <!-- ═══════════ Today Aggregate Stats ═══════════ -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Shift Hari Ini</div>
          <div class="stat-value text-2xl">{{ aggregate.totalShifts || 0 }}</div>
          <div class="stat-desc">{{ aggregate.closedShifts || 0 }} closed · {{ aggregate.openShifts || 0 }} open</div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Kas Aktual Hari Ini</div>
          <div class="stat-value text-lg">{{ formatCurrency(aggregate.totalActualCash || 0) }}</div>
          <div class="stat-desc">Estimasi: {{ formatCurrency(aggregate.totalExpectedCash || 0) }}</div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Selisih Hari Ini</div>
          <div class="stat-value text-lg" :class="getDiffClass(aggregate.totalDifference)">
            {{ (aggregate.totalDifference || 0) >= 0 ? '+' : '' }}{{ formatCurrency(aggregate.totalDifference || 0) }}
          </div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Cash Flow Hari Ini</div>
          <div class="stat-value text-lg">
            <span class="text-success">{{ formatCurrency(aggregate.totalCashIn || 0) }}</span>
          </div>
          <div class="stat-desc">Cash out: {{ formatCurrency(aggregate.totalCashOut || 0) }}</div>
        </div>
      </div>

      <!-- ═══════════ Totals (All Days) ═══════════ -->
      <div v-if="totals.totalDays > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Periode</div>
          <div class="stat-value text-2xl">{{ totals.totalDays || 0 }} hari</div>
          <div class="stat-desc">{{ totals.totalShifts || 0 }} shift · {{ totals.totalClosedShifts || 0 }} closed</div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Modal Dibuka</div>
          <div class="stat-value text-lg">{{ formatCurrency(totals.totalOpeningBalance || 0) }}</div>
          <div class="stat-desc">{{ totals.totalOpenShifts || 0 }} shift masih open</div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Kas Aktual</div>
          <div class="stat-value text-lg">{{ formatCurrency(totals.totalActualCash || 0) }}</div>
          <div class="stat-desc">Closing: {{ formatCurrency(totals.totalClosingBalance || 0) }}</div>
        </div>
        <div class="stat bg-base-100 border border-base-200 rounded-box shadow-sm py-3 px-4">
          <div class="stat-title text-xs">Total Selisih</div>
          <div class="stat-value text-lg" :class="getDiffClass(totals.totalDifference)">
            {{ (totals.totalDifference || 0) >= 0 ? '+' : '' }}{{ formatCurrency(totals.totalDifference || 0) }}
          </div>
          <div class="stat-desc">Semua shift di range tanggal</div>
        </div>
      </div>

      <!-- ═══════════ Today Sessions Table ═══════════ -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body">
          <h3 class="font-semibold text-base mb-3 flex items-center gap-2">
            <IconCalendar class="w-4 h-4" />
            Shift Hari Ini ({{ dayjs(selectedDate).format('DD MMM YYYY') }})
          </h3>

          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr class="bg-base-200/50">
                  <th>#</th>
                  <th>Shift</th>
                  <th>Dibuka</th>
                  <th>Ditutup</th>
                  <th class="text-right">Modal</th>
                  <th class="text-right">Kas Aktual</th>
                  <th class="text-right">Selisih</th>
                  <th class="text-right">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="todaySessions.length === 0">
                  <td colspan="9" class="text-center text-base-content/40 py-8">
                    Tidak ada shift untuk tanggal ini
                  </td>
                </tr>
                <template v-for="(s, idx) in todaySessions" :key="s.id">
                  <tr class="hover cursor-pointer" @click="viewSession(s.id)">
                    <td>{{ idx + 1 }}</td>
                    <td><span class="capitalize font-medium">{{ s.shiftName }}</span></td>
                    <td>
                      <div class="text-sm">{{ dayjs(s.openedAt).format('HH:mm') }}</div>
                      <div class="text-xs text-base-content/50">{{ s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : '-' }}</div>
                    </td>
                    <td>
                      <template v-if="s.status === 'closed'">
                        <div class="text-sm">{{ dayjs(s.closedAt).format('HH:mm') }}</div>
                        <div class="text-xs text-base-content/50">{{ s.closedBy ? `${s.closedBy.firstName} ${s.closedBy.lastName}` : '-' }}</div>
                      </template>
                      <span v-else class="badge badge-sm badge-success">Open</span>
                    </td>
                    <td class="text-right text-sm">{{ formatCurrency(s.openingBalance) }}</td>
                    <td class="text-right text-sm">
                      <template v-if="s.actualCash != null">{{ formatCurrency(s.actualCash) }}</template>
                      <span v-else class="text-base-content/30">&mdash;</span>
                    </td>
                    <td class="text-right text-sm font-medium" :class="getDiffClass(s.difference)">
                      <template v-if="s.difference != null">
                        {{ parseFloat(s.difference) >= 0 ? '+' : '' }}{{ formatCurrency(s.difference) }}
                      </template>
                      <span v-else class="text-base-content/30">&mdash;</span>
                    </td>
                    <td class="text-right">
                      <span
                        class="badge badge-sm"
                        :class="s.status === 'open' ? 'badge-success' : (s.difference == null ? 'badge-ghost' : getDiffBadge(s.difference))"
                      >
                        {{ s.status === 'open' ? 'Open' : (parseFloat(s.difference) === 0 ? 'Balance' : (parseFloat(s.difference) > 0 ? 'Surplus' : 'Deficit')) }}
                      </span>
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <button
                          class="btn btn-xs btn-ghost"
                          title="Cetak laporan shift"
                          @click.stop="handlePrintReport(s.id)"
                          :disabled="loading"
                        >
                          <IconPrinter class="w-3.5 h-3.5" />
                        </button>
                        <button class="btn btn-xs btn-ghost" :title="activeSessionId === s.id ? 'Tutup detail' : 'Lihat transaksi'">
                          <IconX v-if="activeSessionId === s.id" class="w-3.5 h-3.5" />
                          <IconChevronDown v-else class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- Inline Transactions Drawer -->
                  <tr v-if="activeSessionId === s.id && shownSession" class="bg-base-200/30">
                    <td colspan="9" class="p-0">
                      <div class="p-4">
                        <div class="flex items-center justify-between mb-3">
                          <h4 class="font-semibold text-sm flex items-center gap-2">
                            <IconReceipt class="w-4 h-4" />
                            Transaksi Shift <span class="capitalize">{{ shownSession.shiftName }}</span>
                            <span class="badge badge-sm badge-primary">{{ (shownSession.transactions || []).length }}</span>
                          </h4>
                          <span class="text-xs text-base-content/40">
                            {{ dayjs(shownSession.openedAt).format('HH:mm') }}
                            <template v-if="shownSession.closedAt"> &ndash; {{ dayjs(shownSession.closedAt).format('HH:mm') }}</template>
                          </span>
                        </div>

                        <div v-if="loading" class="flex justify-center py-6">
                          <span class="loading loading-spinner loading-sm"></span>
                        </div>
                        <div v-else-if="!shownSession.transactions || shownSession.transactions.length === 0" class="text-center text-base-content/40 py-6 text-sm">
                          Tidak ada transaksi di shift ini
                        </div>
                        <div v-else class="overflow-x-auto">
                          <table class="table table-xs bg-base-100 rounded-lg">
                            <thead>
                              <tr class="bg-base-200/50">
                                <th>No. Order</th>
                                <th>Waktu</th>
                                <th>Kasir</th>
                                <th class="text-right">Total</th>
                                <th>Pembayaran</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="trx in shownSession.transactions" :key="trx.id" class="hover">
                                <td class="font-mono text-xs font-semibold">{{ trx.transactionNumber }}</td>
                                <td class="text-xs text-base-content/60">{{ dayjs(trx.createdAt).format('HH:mm') }}</td>
                                <td class="text-xs">
                                  <span v-if="trx.createdByUser">{{ trx.createdByUser.firstName }} {{ trx.createdByUser.lastName }}</span>
                                  <span v-else class="text-base-content/30">-</span>
                                </td>
                                <td class="text-right font-semibold text-sm">{{ formatCurrency(parseFloat(trx.totalAmount) || 0) }}</td>
                                <td>
                                  <div class="flex flex-wrap gap-1">
                                    <span
                                      v-for="p in (trx.payments || [])"
                                      :key="p.id || p.method"
                                      :class="['badge badge-xs', getPaymentBadgeClass(p.method)]"
                                    >
                                      {{ getPaymentMethodLabel(p.method) }}
                                      <span v-if="p.amount" class="ml-0.5">{{ formatCurrency(parseFloat(p.amount)) }}</span>
                                    </span>
                                    <span v-if="!trx.payments || trx.payments.length === 0" class="text-base-content/30 text-xs">-</span>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══════════ 7-Day History ═══════════ -->
      <div v-if="recentHistory.length > 0" class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body">
          <h3 class="font-semibold text-base mb-3 flex items-center gap-2">
            <IconClock class="w-4 h-4" />
            Riwayat 7 Hari Terakhir
          </h3>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr class="bg-base-200/50">
                  <th>Tanggal</th>
                  <th class="text-center">Shift</th>
                  <th class="text-center">Open</th>
                  <th class="text-right">Modal</th>
                  <th class="text-right">Closing</th>
                  <th class="text-right">Kas Aktual</th>
                  <th class="text-right">Selisih</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in recentHistory" :key="day.shiftDate" class="hover">
                  <td class="font-medium">{{ dayjs(day.shiftDate).format('DD MMM YYYY') }}</td>
                  <td class="text-center">{{ day.closedCount || 0 }} / {{ day.shiftCount || 0 }}</td>
                  <td class="text-center">
                    <span v-if="day.openCount > 0" class="badge badge-xs badge-warning">{{ day.openCount }}</span>
                    <span v-else class="text-base-content/30">-</span>
                  </td>
                  <td class="text-right text-sm">{{ formatCurrency(day.totalOpeningBalance) }}</td>
                  <td class="text-right text-sm">{{ formatCurrency(day.totalClosingBalance) }}</td>
                  <td class="text-right text-sm">{{ formatCurrency(day.totalActualCash) }}</td>
                  <td class="text-right text-sm font-medium" :class="getDiffClass(day.totalDifference)">
                    {{ parseFloat(day.totalDifference) >= 0 ? '+' : '' }}{{ formatCurrency(day.totalDifference) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
