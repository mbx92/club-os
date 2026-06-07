<script setup>
/**
 * DDashboardPage — Example dashboard implementation using design system components.
 * Demonstrates: StatCards, DataTable, CheckInWidget, alert banner, and expiry alerts.
 *
 * This is a demo/example page showing how all components work together.
 * Data is mock/demo — replace with API calls in production.
 */
import { ref, computed } from 'vue'
import { useFormatIDR } from '../composables/useFormatIDR.js'

const { format } = useFormatIDR()

// ─── Stat Cards ───
const stats = [
  { label: 'Anggota Aktif', value: 1247, icon: 'i-tabler-users', trend: 12, trendLabel: 'vs bulan lalu', color: 'primary' },
  { label: 'Pendapatan Hari Ini', value: '12.5', prefix: 'Rp', suffix: 'Jt', icon: 'i-tabler-cash', trend: 8, trendLabel: 'vs kemarin', color: 'gold' },
  { label: 'Check-In Hari Ini', value: 89, icon: 'i-tabler-scan', trend: -3, trendLabel: 'vs kemarin', color: 'gym' },
  { label: 'Pesanan Resto', value: 34, icon: 'i-tabler-tools-kitchen-2', trend: 15, trendLabel: 'vs kemarin', color: 'restaurant' },
]

// ─── Recent Transactions Table ───
const txColumns = [
  { key: 'type', label: 'Jenis', sortable: true },
  { key: 'member', label: 'Anggota' },
  { key: 'amount', label: 'Jumlah', sortable: true, align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Tanggal', sortable: true },
  { key: 'channel', label: 'Channel' },
]

const txRows = [
  { id: 1, type: 'Membership', member: 'John Doe', amount: 500000, status: 'success', date: '06 Jun 2026', channel: 'Midtrans' },
  { id: 2, type: 'Resto Order', member: 'Jane Smith', amount: 125000, status: 'success', date: '06 Jun 2026', channel: 'Cash' },
  { id: 3, type: 'Membership', member: 'Bob Wilson', amount: 250000, status: 'pending', date: '05 Jun 2026', channel: 'Xendit' },
  { id: 4, type: 'PT Session', member: 'Alice Brown', amount: 150000, status: 'success', date: '05 Jun 2026', channel: 'QRIS' },
  { id: 5, type: 'Resto Order', member: 'Mike Davis', amount: 82000, status: 'success', date: '04 Jun 2026', channel: 'Cash' },
]

const txPagination = ref({ page: 1, perPage: 5, total: 5, perPageOptions: [5, 10, 25] })
const txSortBy = ref('date')
const txSortDir = ref('desc')

// ─── Expiry Alerts ───
const expiryAlerts = [
  { id: 'M001', name: 'Sarah Johnson', tier: 'gold', daysLeft: 2, expiryDate: '08 June 2026' },
  { id: 'M002', name: 'Tom Clark', tier: 'silver', daysLeft: 5, expiryDate: '11 June 2026' },
  { id: 'M003', name: 'Linda Park', tier: 'platinum', daysLeft: 7, expiryDate: '13 June 2026' },
]

// ─── Check-In Sample ───
const checkInState = ref({ status: 'idle', memberData: {}, recentCheckIns: [], todayStats: { totalVisits: 89, activeNow: 12 }, error: '' })
</script>

<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div>
      <h2 class="text-2xl font-bold">Selamat Datang, Admin!</h2>
      <p class="text-sm text-base-content/50 mt-0.5">06 Juni 2026 &middot; Berikut ringkasan operasional hari ini.</p>
    </div>

    <!-- Alert Banner -->
    <DAlertBanner
      type="info"
      message="3 anggota akan kadaluarsa dalam 7 hari ke depan"
      description="Periksa daftar di bawah untuk melakukan perpanjangan."
      dismissible
    />

    <!-- Stat Cards Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DStatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :prefix="stat.prefix"
        :suffix="stat.suffix"
        :icon="stat.icon"
        :trend="stat.trend"
        :trend-label="stat.trendLabel"
        :color="stat.color"
      />
    </div>

    <!-- 2-Column Row: Table + Check-In -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Transactions Table -->
      <div class="lg:col-span-2 rounded-2xl border border-base-300 bg-base-100 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold flex items-center gap-2">
            <span class="i-tabler-credit-card size-5 text-base-content/40" />
            Transaksi Terbaru
          </h3>
          <a href="#" class="text-xs text-primary font-semibold hover:underline">Lihat Semua</a>
        </div>

        <DDataTable
          :columns="txColumns"
          :rows="txRows"
          :pagination="txPagination"
          :sort-by="txSortBy"
          :sort-dir="txSortDir"
          :show-column-toggle="false"
          :export-formats="['csv']"
          :row-actions="[
            { label: 'Lihat', icon: 'i-tabler-eye', action: 'view' },
            { label: 'Hapus', icon: 'i-tabler-trash', action: 'delete', color: 'error' },
          ]"
        >
          <!-- Custom cell render: Amount -->
          <template #cell-amount="{ value }">
            <span class="text-sm font-mono font-semibold">{{ format(value) }}</span>
          </template>
          <!-- Custom cell render: Status -->
          <template #cell-status="{ value }">
            <DBadge
              :variant="value === 'success' ? 'success' : value === 'pending' ? 'pending' : 'error'"
              size="xs"
              outline
            >
              {{ value === 'success' ? 'Sukses' : value === 'pending' ? 'Tertunda' : value }}
            </DBadge>
          </template>
        </DDataTable>
      </div>

      <!-- Quick Check-In Widget -->
      <div class="lg:col-span-1">
        <DCheckInWidget
          :check-in-status="checkInState.status"
          :member-data="checkInState.memberData"
          :recent-check-ins="[
            { id: 'c1', name: 'John Doe', photo: '', tier: 'gold', checkInTime: '06 Jun 2026, 08:30' },
            { id: 'c2', name: 'Jane Smith', photo: '', tier: 'silver', checkInTime: '06 Jun 2026, 08:15' },
            { id: 'c3', name: 'Bob Wilson', photo: '', tier: 'bronze', checkInTime: '06 Jun 2026, 08:00' },
          ]"
          :today-stats="{ totalVisits: 89, activeNow: 12 }"
        />
      </div>
    </div>

    <!-- Expiry Alerts -->
    <div class="rounded-2xl border border-base-300 bg-base-100 p-5">
      <h3 class="text-base font-bold flex items-center gap-2 mb-4">
        <span class="i-tabler-clock-exclamation size-5 text-warning" />
        Anggota Mendekati Kadaluarsa
      </h3>
      <div class="space-y-3">
        <div
          v-for="alert in expiryAlerts"
          :key="alert.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-base-200 hover:border-base-300 transition-colors"
        >
          <DAvatar :name="alert.name" size="sm" :tier="alert.tier" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ alert.name }}</p>
            <p class="text-xs text-base-content/40">{{ alert.id }} &middot; {{ alert.expiryDate }}</p>
          </div>
          <DBadge
            :variant="alert.daysLeft <= 3 ? 'error' : alert.daysLeft <= 7 ? 'warning' : 'info'"
            size="xs"
          >
            {{ alert.daysLeft }} hari lagi
          </DBadge>
          <DButton variant="ghost" size="xs" icon-only icon-left="i-tabler-chevron-right" />
        </div>
      </div>
    </div>
  </div>
</template>
