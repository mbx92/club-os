<route lang="yaml">
meta:
  title: Detail Transaksi
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFinancialReports } from '@/composables/finances'
import { useCurrency } from '@/composables/core/useCurrency'
import { getPaymentLabel } from '@/utils/paymentMethods'
import { getTenantTimezone, todayInTz, firstDayOfMonth } from '@/utils/tenantDate'
import {
  IconReceipt2,
  IconRefresh,
} from '@tabler/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const tenantTz = getTenantTimezone(authStore)
const today = todayInTz(tenantTz)
const { formatCurrency } = useCurrency()
const {
  transactionDetailsReport,
  transactionDetailsMeta,
  loading,
  fetchTransactionDetailsReport,
} = useFinancialReports()

const filters = ref({
  startDate: firstDayOfMonth(today),
  endDate: today,
  transactionType: '',
  status: '',
  search: '',
  page: 1,
  limit: 50,
})

const generated = ref(false)

const summary = computed(() => transactionDetailsReport.value?.summary || null)
const rows = computed(() => transactionDetailsReport.value?.transactions || [])
const settings = computed(() => transactionDetailsReport.value?.settings || {
  taxEnable: false,
  serviceChargeEnable: false,
})
const meta = computed(() => transactionDetailsMeta.value || { page: 1, limit: 50, total: 0, pages: 0 })

const showTax = computed(() => !!settings.value.taxEnable)
const showServiceCharge = computed(() => !!settings.value.serviceChargeEnable)

const typeLabel = (type) => {
  const map = { gym: 'Gym', restaurant: 'Restaurant', pos: 'POS', psychology: 'Psychology' }
  return map[type] || type
}

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    timeZone: tenantTz,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const paymentSummary = (payments) => {
  if (!payments?.length) return '—'
  return payments
    .map((p) => {
      const label = getPaymentLabel(p.paymentMethod)
      const bank = p.bankName ? ` (${p.bankName})` : ''
      return `${label}${bank}`
    })
    .join(', ')
}

const handleGenerate = async (resetPage = true) => {
  if (resetPage) filters.value.page = 1
  await fetchTransactionDetailsReport({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    transactionType: filters.value.transactionType || undefined,
    status: filters.value.status || undefined,
    search: filters.value.search || undefined,
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

onMounted(() => {
  handleGenerate().catch(() => {})
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl space-y-6">
    <div>
      <h1 class="text-3xl font-bold">Detail Transaksi</h1>
      <p class="text-base-content/60 mt-1">
        Laporan detail transaksi Gym &amp; Restaurant — subtotal, service charge, tax, dan total
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
            <label class="label py-1"><span class="label-text text-sm">Tipe</span></label>
            <select v-model="filters.transactionType" class="select select-bordered w-full">
              <option value="">Gym + Restaurant</option>
              <option value="gym">Gym</option>
              <option value="restaurant">Restaurant</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Status</span></label>
            <select v-model="filters.status" class="select select-bordered w-full">
              <option value="">Semua (recognized)</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="served">Served</option>
              <option value="split">Split</option>
              <option value="merged">Merged</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-sm">Cari</span></label>
            <input
              v-model="filters.search"
              type="text"
              class="input input-bordered w-full"
              placeholder="No. transaksi..."
              @keyup.enter="handleGenerate()"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-2 text-xs">
            <span
              class="badge badge-sm"
              :class="showTax ? 'badge-info' : 'badge-ghost'"
            >
              Tax: {{ showTax ? `ON (${settings.taxPercentage}${settings.taxType === 'percentage' ? '%' : ''})` : 'OFF' }}
            </span>
            <span
              class="badge badge-sm"
              :class="showServiceCharge ? 'badge-secondary' : 'badge-ghost'"
            >
              Service Charge: {{ showServiceCharge ? `ON (${settings.serviceChargePercentage}${settings.serviceChargeType === 'percentage' ? '%' : ''})` : 'OFF' }}
            </span>
          </div>
          <div class="flex gap-2">
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
    </div>

    <div v-if="loading && !generated" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="summary">
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Transaksi</div>
            <div class="stat-value text-2xl">{{ summary.transactionCount }}</div>
          </div>
          <div class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Subtotal</div>
            <div class="stat-value text-2xl">{{ formatCurrency(summary.totalSubtotal) }}</div>
          </div>
          <div class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Discount</div>
            <div class="stat-value text-2xl text-warning">{{ formatCurrency(summary.totalVoucherDiscount) }}</div>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-if="showServiceCharge" class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Service Charge</div>
            <div class="stat-value text-2xl text-secondary">{{ formatCurrency(summary.totalServiceCharge) }}</div>
          </div>
          <div v-if="showTax" class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Tax</div>
            <div class="stat-value text-2xl text-info">{{ formatCurrency(summary.totalTax) }}</div>
          </div>
          <div class="stat bg-base-100 shadow rounded-box">
            <div class="stat-title">Total</div>
            <div class="stat-value text-2xl text-success">{{ formatCurrency(summary.totalAmount) }}</div>
          </div>
        </div>
      </div>

      <div v-if="summary.byType?.length" class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base mb-2">Ringkasan per Tipe</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Subtotal</th>
                  <th class="text-right">Discount</th>
                  <th v-if="showServiceCharge" class="text-right">Service Charge</th>
                  <th v-if="showTax" class="text-right">Tax</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in summary.byType" :key="g.transactionType">
                  <td class="font-medium">{{ typeLabel(g.transactionType) }}</td>
                  <td class="text-center">{{ g.count }}</td>
                  <td class="text-right">{{ formatCurrency(g.subtotal) }}</td>
                  <td class="text-right text-warning">{{ formatCurrency(g.voucherDiscount) }}</td>
                  <td v-if="showServiceCharge" class="text-right text-secondary">{{ formatCurrency(g.serviceCharge) }}</td>
                  <td v-if="showTax" class="text-right text-info">{{ formatCurrency(g.tax) }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(g.totalAmount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-base mb-2 flex items-center gap-2">
            <IconReceipt2 class="w-5 h-5" />
            Daftar Transaksi
          </h2>

          <div v-if="!rows.length" class="text-center py-10 text-base-content/50">
            Tidak ada transaksi untuk filter ini
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. Transaksi</th>
                  <th>Tipe</th>
                  <th class="text-right">Subtotal</th>
                  <th class="text-right">Discount</th>
                  <th v-if="showServiceCharge" class="text-right">SC</th>
                  <th v-if="showTax" class="text-right">Tax</th>
                  <th class="text-right">Total</th>
                  <th>Pembayaran</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in rows" :key="tx.id">
                  <td class="whitespace-nowrap text-xs">
                    {{ formatDateTime(tx.transactionDate) }}
                  </td>
                  <td class="font-mono text-xs">{{ tx.transactionNumber }}</td>
                  <td>
                    <span class="badge badge-sm badge-outline">{{ typeLabel(tx.transactionType) }}</span>
                  </td>
                  <td class="text-right whitespace-nowrap">{{ formatCurrency(tx.subtotal) }}</td>
                  <td class="text-right whitespace-nowrap text-warning">
                    {{ formatCurrency(tx.voucherDiscount) }}
                  </td>
                  <td v-if="showServiceCharge" class="text-right whitespace-nowrap text-secondary">
                    {{ formatCurrency(tx.serviceCharge) }}
                  </td>
                  <td v-if="showTax" class="text-right whitespace-nowrap text-info">
                    {{ formatCurrency(tx.tax) }}
                  </td>
                  <td class="text-right font-semibold whitespace-nowrap">
                    {{ formatCurrency(tx.totalAmount) }}
                  </td>
                  <td class="text-xs max-w-[160px] truncate" :title="paymentSummary(tx.payments)">
                    {{ paymentSummary(tx.payments) }}
                  </td>
                  <td class="text-right">
                    <button
                      class="btn btn-ghost btn-xs"
                      @click="router.push(`/finances/transactions/${tx.id}`)"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-semibold">
                  <td :colspan="3">Total halaman / filter</td>
                  <td class="text-right">{{ formatCurrency(summary.totalSubtotal) }}</td>
                  <td class="text-right text-warning">{{ formatCurrency(summary.totalVoucherDiscount) }}</td>
                  <td v-if="showServiceCharge" class="text-right text-secondary">
                    {{ formatCurrency(summary.totalServiceCharge) }}
                  </td>
                  <td v-if="showTax" class="text-right text-info">
                    {{ formatCurrency(summary.totalTax) }}
                  </td>
                  <td class="text-right text-success">{{ formatCurrency(summary.totalAmount) }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-if="meta.pages > 1" class="flex items-center justify-between pt-3">
            <div class="text-sm text-base-content/50">
              Halaman {{ meta.page }} / {{ meta.pages }} · {{ meta.total }} transaksi
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
