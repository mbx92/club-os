<route lang="yaml">
meta:
  title: Service Alerts
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Service Alerts</h1>
        <p class="text-base-content/60 mt-1">Monitor services requiring attention</p>
      </div>
      <button class="btn btn-outline btn-sm" @click="loadAlerts" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-xs"></span>
        <IconRefresh v-else class="w-4 h-4 mr-2" />
        Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="alerts">
      <!-- Summary Cards -->
      <div v-if="alertsSummary" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Total Alerts</div>
          <div class="stat-value text-2xl">{{ alertsSummary.totalAlerts ?? 0 }}</div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Expiring</div>
          <div :class="['stat-value text-2xl', alertsSummary.expiringServices > 0 ? 'text-warning' : 'text-base-content/30']">
            {{ alertsSummary.expiringServices ?? 0 }}
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">Low Sessions</div>
          <div :class="['stat-value text-2xl', alertsSummary.lowSessionServices > 0 ? 'text-info' : 'text-base-content/30']">
            {{ alertsSummary.lowSessionServices ?? 0 }}
          </div>
        </div>
        <div class="stat bg-base-100 shadow rounded-box py-4 px-5">
          <div class="stat-title text-xs">High Severity</div>
          <div :class="['stat-value text-2xl', alertsSummary.highSeverity > 0 ? 'text-error' : 'text-base-content/30']">
            {{ alertsSummary.highSeverity ?? 0 }}
          </div>
        </div>
      </div>

      <!-- Alerts Content -->
      <div v-if="hasAnyAlerts" class="space-y-6">
        <!-- Expiring Soon -->
        <div v-if="alerts.expiring?.length > 0" class="card bg-base-100 shadow-xl">
          <div class="card-body p-0">
            <div class="px-5 pt-4 pb-3 border-b border-base-300 flex items-center gap-2">
              <IconClock class="w-5 h-5 text-warning" />
              <h2 class="font-semibold text-lg">Akan Berakhir ({{ alerts.expiring.length }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Layanan</th>
                    <th>Tipe</th>
                    <th>Tanggal Berakhir</th>
                    <th class="text-center">Sisa Hari</th>
                    <th class="text-center">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="alert in alerts.expiring" :key="alert.serviceId">
                    <td class="font-medium">{{ alert.memberName || '—' }}</td>
                    <td>{{ alert.serviceName || '—' }}</td>
                    <td>
                      <span class="badge badge-ghost badge-sm capitalize">{{ formatServiceType(alert.serviceType) }}</span>
                    </td>
                    <td class="text-sm">{{ formatDate(alert.endDate) }}</td>
                    <td class="text-center">
                      <span :class="['badge badge-sm', alert.daysUntilExpiry <= 0 ? 'badge-error' : 'badge-warning']">
                        {{ alert.daysUntilExpiry <= 0 ? 'Hari ini' : `${alert.daysUntilExpiry} hari` }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span :class="['badge badge-sm', severityBadge(alert.severity)]">
                        {{ alert.severity }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Low Sessions -->
        <div v-if="alerts.lowSessions?.length > 0" class="card bg-base-100 shadow-xl">
          <div class="card-body p-0">
            <div class="px-5 pt-4 pb-3 border-b border-base-300 flex items-center gap-2">
              <IconAlertTriangle class="w-5 h-5 text-info" />
              <h2 class="font-semibold text-lg">Sesi Rendah ({{ alerts.lowSessions.length }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Layanan</th>
                    <th>Tipe</th>
                    <th class="text-center">Sisa Sesi</th>
                    <th class="text-center">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="alert in alerts.lowSessions" :key="alert.serviceId">
                    <td class="font-medium">{{ alert.memberName || '—' }}</td>
                    <td>{{ alert.serviceName || '—' }}</td>
                    <td>
                      <span class="badge badge-ghost badge-sm capitalize">{{ formatServiceType(alert.serviceType) }}</span>
                    </td>
                    <td class="text-center">
                      <span class="badge badge-info badge-sm">{{ alert.remainingSessions ?? 0 }} sesi</span>
                    </td>
                    <td class="text-center">
                      <span :class="['badge badge-sm', severityBadge(alert.severity)]">
                        {{ alert.severity }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconCheck class="w-16 h-16 mx-auto text-success mb-4" />
          <h3 class="text-xl font-semibold mb-2">Semua Aman!</h3>
          <p class="text-base-content/60">Tidak ada layanan yang memerlukan perhatian saat ini.</p>
        </div>
      </div>
    </template>

    <!-- Initial / error empty -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconCheck class="w-16 h-16 mx-auto text-success mb-4" />
        <h3 class="text-xl font-semibold mb-2">Semua Aman!</h3>
        <p class="text-base-content/60">Tidak ada layanan yang memerlukan perhatian saat ini.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import {
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-vue'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices.js'

const { alerts, alertsSummary, loading, getServiceAlerts } = useActiveServices()

const hasAnyAlerts = computed(() =>
  (alerts.value?.expiring?.length ?? 0) + (alerts.value?.lowSessions?.length ?? 0) > 0
)

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

const formatServiceType = (type) => {
  if (!type) return '—'
  return type.replace(/_/g, ' ')
}

const severityBadge = (severity) => {
  return { high: 'badge-error', medium: 'badge-warning', low: 'badge-info' }[severity] ?? 'badge-ghost'
}

const loadAlerts = async () => {
  try {
    await getServiceAlerts({ daysThreshold: 7, lowSessionsThreshold: 3 })
  } catch {
    // handled in composable
  }
}

onMounted(() => loadAlerts())
</script>
