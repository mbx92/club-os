<route lang="yaml">
meta:
  title: Psychology Dashboard
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Psychology Module</h1>
      <p class="text-base-content/60 mt-1">Dashboard tes psikologi</p>
    </div>

    <!-- Stats Cards -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Total Orders -->
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-primary">
            <IconShoppingCart class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Pesanan</div>
          <div class="stat-value text-primary">{{ formatNumber(overview?.orders?.total || 0) }}</div>
          <div class="stat-desc">
            <span class="text-warning">{{ overview?.orders?.pending || 0 }} pending</span> • 
            <span class="text-success">{{ overview?.orders?.completed || 0 }} selesai</span>
          </div>
        </div>
      </div>

      <!-- Total Patients -->
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-secondary">
            <IconUsers class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Pasien</div>
          <div class="stat-value text-secondary">{{ formatNumber(overview?.patients?.total || 0) }}</div>
          <div class="stat-desc">Terdaftar di sistem</div>
        </div>
      </div>

      <!-- Sessions -->
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-info">
            <IconPlayerPlay class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Sesi</div>
          <div class="stat-value text-info">{{ formatNumber(overview?.sessions?.total || 0) }}</div>
          <div class="stat-desc">
            <span class="text-success">{{ overview?.sessions?.completed || 0 }} selesai</span> • 
            {{ overview?.sessions?.completionRate || 0 }}% completion
          </div>
        </div>
      </div>

      <!-- Revenue -->
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-success">
            <IconCash class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Pendapatan</div>
          <div class="stat-value text-success text-2xl">{{ formatCurrency(overview?.revenue?.total || 0) }}</div>
          <div class="stat-desc">Semua waktu</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Popular Packages -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">
            <IconPackage class="w-5 h-5" />
            Paket Populer
          </h2>
          <div class="space-y-3 mt-4">
            <div 
              v-for="pkg in popularPackages" 
              :key="pkg.id"
              class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
            >
              <div>
                <p class="font-medium">{{ pkg.name }}</p>
                <p class="text-xs text-base-content/60">
                  {{ formatCurrency(pkg.basePrice) }} • 
                  <span class="badge badge-xs" :class="pkg.packageType === 'bundle' ? 'badge-secondary' : 'badge-info'">
                    {{ pkg.packageType }}
                  </span>
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-primary">{{ pkg.orderCount }}</p>
                <p class="text-xs text-base-content/60">pesanan</p>
              </div>
            </div>
            <div v-if="!popularPackages?.length" class="text-center py-4 text-base-content/60">
              Belum ada data
            </div>
          </div>
        </div>
      </div>

      <!-- Test Completion Stats -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">
            <IconClipboardList class="w-5 h-5" />
            Statistik Tes
          </h2>
          
          <!-- Status Breakdown -->
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="bg-warning/10 p-3 rounded-lg text-center">
              <p class="text-2xl font-bold text-warning">{{ testCompletionStats?.statusBreakdown?.pending || 0 }}</p>
              <p class="text-xs text-base-content/60">Pending</p>
            </div>
            <div class="bg-success/10 p-3 rounded-lg text-center">
              <p class="text-2xl font-bold text-success">{{ testCompletionStats?.statusBreakdown?.completed || 0 }}</p>
              <p class="text-xs text-base-content/60">Selesai</p>
            </div>
          </div>

          <!-- Test Type Breakdown -->
          <div class="divider text-xs">Per Jenis Tes</div>
          <div class="space-y-2">
            <div 
              v-for="item in testCompletionStats?.testTypeBreakdown || []" 
              :key="item.testTypeId"
              class="flex items-center justify-between"
            >
              <div>
                <p class="font-medium text-sm">{{ item.testTypeName }}</p>
                <p class="text-xs text-base-content/60">{{ item.testTypeCode }}</p>
              </div>
              <div class="badge badge-primary">{{ item.count }} tes</div>
            </div>
            <div v-if="!testCompletionStats?.testTypeBreakdown?.length" class="text-center py-2 text-base-content/60 text-sm">
              Belum ada data
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title mb-4">Aksi Cepat</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <router-link to="/psychology/patients" class="btn btn-outline">
            <IconUsers class="w-4 h-4" />
            Kelola Pasien
          </router-link>
          <router-link to="/psychology/orders" class="btn btn-outline">
            <IconShoppingCart class="w-4 h-4" />
            Kelola Pesanan
          </router-link>
          <router-link to="/psychology/packages" class="btn btn-outline">
            <IconPackage class="w-4 h-4" />
            Paket Tes
          </router-link>
          <router-link to="/psychology/invitations" class="btn btn-outline">
            <IconMail class="w-4 h-4" />
            Undangan
          </router-link>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title">
            <IconReceipt class="w-5 h-5" />
            Pesanan Terbaru
          </h2>
          <router-link to="/psychology/orders" class="btn btn-sm btn-ghost">
            Lihat Semua →
          </router-link>
        </div>

        <div v-if="recentOrders.length > 0" class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>No. Order</th>
                <th>Pasien</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td class="font-mono text-sm">{{ order.orderNumber }}</td>
                <td>
                  <div>
                    <p class="font-medium">{{ order.patient?.fullName || '-' }}</p>
                    <p class="text-xs text-base-content/60">{{ order.patient?.email || '' }}</p>
                  </div>
                </td>
                <td>{{ order.package?.name || '-' }}</td>
                <td>
                  <div class="badge badge-sm" :class="getOrderStatusClass(order.status)">
                    {{ getOrderStatusLabel(order.status) }}
                  </div>
                </td>
                <td class="text-sm text-base-content/60">{{ formatDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8 text-base-content/60">
          <IconInbox class="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Belum ada pesanan</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import {
  IconUsers,
  IconPlayerPlay,
  IconCash,
  IconClipboardList,
  IconShoppingCart,
  IconPackage,
  IconMail,
  IconReceipt,
  IconInbox
} from '@tabler/icons-vue'
import { usePsychologyDashboard } from '@/composables/psychology'

const { 
  overview, 
  popularPackages, 
  recentOrders, 
  testCompletionStats, 
  loading, 
  fetchDashboardData, 
  formatNumber, 
  formatCurrency, 
  formatDate,
  getOrderStatusClass,
  getOrderStatusLabel
} = usePsychologyDashboard()

onMounted(async () => {
  try {
    await fetchDashboardData()
  } catch (error) {
    console.error('Failed to load dashboard:', error)
  }
})
</script>
