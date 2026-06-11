<route lang="yaml">
meta:
  title: Service Status
  layout: default
</route>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGymReports } from '@/composables/gym/reports'
import { 
  IconArrowLeft, 
  IconFilter, 
  IconRefresh,
  IconDownload,
  IconTicket,
  IconAlertCircle,
  IconChecks,
  IconAlertTriangle,
  IconCalendarX,
  IconUsers,
  IconCircleCheck,
  IconBan
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  getServiceStatusReport, 
  serviceStatusReport,
  formatCurrency, 
  exportToCSV,
  loading 
} = useGymReports()

// Filters
const statusFilter = ref('')
const serviceTypeFilter = ref('')

// Summary stats
const summary = computed(() => serviceStatusReport.value?.summary || {})
const servicesByStatus = computed(() => serviceStatusReport.value?.servicesByStatus || [])
const servicesByType = computed(() => serviceStatusReport.value?.servicesByType || [])
const expiringSoon = computed(() => serviceStatusReport.value?.expiringSoon || [])
const lowSessions = computed(() => serviceStatusReport.value?.lowSessions || [])

const loadData = async () => {
  try {
    await getServiceStatusReport({
      status: statusFilter.value || undefined,
      serviceType: serviceTypeFilter.value || undefined
    })
  } catch (err) {
    console.error('Failed to load service status report:', err)
  }
}

// Resolve display name: prefer member.name, fallback to customerName
const getDisplayName = (service) =>
  service.member?.name || service.customerName || '-'

const getDisplayPhone = (service) =>
  service.member?.phone || '-'

const getDisplayEmail = (service) =>
  service.member?.email || null

// Calculate days remaining from today
const getDaysRemaining = (endDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  return Math.round((end - today) / (1000 * 60 * 60 * 24))
}

const getDaysRemainingLabel = (endDate) => {
  const days = getDaysRemaining(endDate)
  if (days < 0) return 'Expired'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

const getDaysRemainingClass = (endDate) => {
  const days = getDaysRemaining(endDate)
  if (days <= 0) return 'badge-error'
  if (days <= 1) return 'badge-error'
  if (days <= 3) return 'badge-warning'
  return 'badge-info'
}

const formatDateLocal = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const capitalizeStatus = (status) => {
  if (!status) return '-'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Export expiring services - safe null member
const handleExportExpiring = () => {
  if (!expiringSoon.value.length) return
  
  const exportData = expiringSoon.value.map(s => ({
    'Customer Name': getDisplayName(s),
    'Email': getDisplayEmail(s) || '-',
    'Phone': getDisplayPhone(s),
    'Service Plan': s.servicePlan?.name ?? '-',
    'Service Type': s.servicePlan?.serviceType ?? '-',
    'Start Date': s.startDate,
    'End Date': s.endDate,
    'Days Remaining': getDaysRemaining(s.endDate),
    'Status': s.status
  }))
  
  exportToCSV(exportData, 'gym-services-expiring')
}

// Export low sessions - safe null member
const handleExportLowSessions = () => {
  if (!lowSessions.value.length) return
  
  const exportData = lowSessions.value.map(s => ({
    'Customer Name': getDisplayName(s),
    'Email': getDisplayEmail(s) || '-',
    'Phone': getDisplayPhone(s),
    'Service Plan': s.servicePlan?.name ?? '-',
    'Service Type': s.servicePlan?.serviceType ?? '-',
    'Remaining Sessions': s.remainingSessions,
    'Total Sessions': s.totalSessions,
    'Usage (%)': s.usagePercentage
  }))
  
  exportToCSV(exportData, 'gym-services-low-sessions')
}

const getStatusBadgeClass = (status) => {
  const classes = {
    active: 'badge-success',
    expired: 'badge-error',
    suspended: 'badge-warning',
    depleted: 'badge-info',
    cancelled: 'badge-ghost'
  }
  return classes[status] || 'badge-ghost'
}

// Percentage of active services out of total
const activePercentage = computed(() => {
  const total = summary.value.totalServices || 0
  const active = summary.value.activeServices || 0
  if (!total) return 0
  return Math.round((active / total) * 100)
})

watch([statusFilter, serviceTypeFilter], () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-sm btn-circle" @click="router.push('/gym/reports')">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-3xl font-bold">Service Status Report</h1>
        <p class="text-base-content/60 mt-1">Service tracking and renewal opportunities</p>
      </div>
      <button class="btn btn-ghost btn-sm btn-circle" @click="loadData" :disabled="loading">
        <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow mb-6">
      <div class="card-body p-4">
        <div class="flex items-center gap-2 mb-3">
          <IconFilter class="w-5 h-5 text-base-content/60" />
          <h3 class="font-semibold">Filters</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Status -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="statusFilter" class="select select-bordered w-full">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="depleted">Depleted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Service Type -->
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium">Service Type</span>
            </label>
            <select v-model="serviceTypeFilter" class="select select-bordered w-full">
              <option value="">All Types</option>
              <option value="membership">Membership</option>
              <option value="personal_training">Personal Training</option>
              <option value="class">Class</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <!-- Total -->
      <div class="stat bg-base-100 rounded-box shadow p-4 col-span-2 md:col-span-1">
        <div class="stat-figure text-primary">
          <IconUsers class="w-8 h-8" />
        </div>
        <div class="stat-title text-xs">Total Services</div>
        <div class="stat-value text-primary text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.totalServices || 0 }}</span>
        </div>
        <div v-if="!loading && summary.totalServices" class="stat-desc">
          {{ activePercentage }}% active
        </div>
      </div>

      <!-- Active -->
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-success">
          <IconCircleCheck class="w-7 h-7" />
        </div>
        <div class="stat-title text-xs">Active</div>
        <div class="stat-value text-success text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.activeServices || 0 }}</span>
        </div>
      </div>

      <!-- Expired -->
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-error">
          <IconCalendarX class="w-7 h-7" />
        </div>
        <div class="stat-title text-xs">Expired</div>
        <div class="stat-value text-error text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.expiredServices || 0 }}</span>
        </div>
      </div>

      <!-- Suspended -->
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-warning">
          <IconBan class="w-7 h-7" />
        </div>
        <div class="stat-title text-xs">Suspended</div>
        <div class="stat-value text-warning text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.suspendedServices || 0 }}</span>
        </div>
      </div>

      <!-- Depleted -->
      <div class="stat bg-base-100 rounded-box shadow p-4">
        <div class="stat-figure text-info">
          <IconAlertCircle class="w-7 h-7" />
        </div>
        <div class="stat-title text-xs">Depleted</div>
        <div class="stat-value text-info text-2xl">
          <span v-if="loading" class="loading loading-dots loading-sm"></span>
          <span v-else>{{ summary.depletedServices || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Alerts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Services Expiring Soon -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base">
              <IconAlertCircle class="w-5 h-5 text-warning" />
              Expiring Soon
              <span v-if="!loading && expiringSoon.length" class="badge badge-warning badge-sm ml-1">
                {{ expiringSoon.length }}
              </span>
            </h3>
            <button 
              class="btn btn-ghost btn-xs gap-1" 
              @click="handleExportExpiring" 
              :disabled="!expiringSoon.length || loading"
              title="Export CSV"
            >
              <IconDownload class="w-4 h-4" />
              Export
            </button>
          </div>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="!expiringSoon.length" class="flex flex-col items-center py-10 text-base-content/50 gap-2">
            <IconChecks class="w-10 h-10" />
            <span class="text-sm">No services expiring in the next 7 days</span>
          </div>
          
          <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div 
              v-for="service in expiringSoon" 
              :key="service.id"
              class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold truncate">{{ getDisplayName(service) }}</span>
                    <span v-if="service.member" class="badge badge-outline badge-xs">Member</span>
                    <span v-else class="badge badge-ghost badge-xs">Walk-in</span>
                  </div>
                  <div class="text-xs text-base-content/60 mt-0.5">
                    {{ getDisplayPhone(service) }}
                    <span v-if="getDisplayEmail(service)" class="ml-2">· {{ getDisplayEmail(service) }}</span>
                  </div>
                  <div class="text-sm font-medium mt-1 text-primary">{{ service.servicePlan?.name ?? '-' }}</div>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-xs text-base-content/50">
                      {{ formatDateLocal(service.startDate) }} → {{ formatDateLocal(service.endDate) }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span :class="['badge badge-sm', getDaysRemainingClass(service.endDate)]">
                    {{ getDaysRemainingLabel(service.endDate) }}
                  </span>
                  <span :class="['badge badge-xs', getStatusBadgeClass(service.status)]">
                    {{ capitalizeStatus(service.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Low Sessions -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="card-title text-base">
              <IconAlertTriangle class="w-5 h-5 text-error" />
              Low Sessions
              <span v-if="!loading && lowSessions.length" class="badge badge-error badge-sm ml-1">
                {{ lowSessions.length }}
              </span>
              <span class="text-xs font-normal text-base-content/50">(&lt; 20% remaining)</span>
            </h3>
            <button 
              class="btn btn-ghost btn-xs gap-1" 
              @click="handleExportLowSessions" 
              :disabled="!lowSessions.length || loading"
              title="Export CSV"
            >
              <IconDownload class="w-4 h-4" />
              Export
            </button>
          </div>
          
          <div v-if="loading" class="flex justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="!lowSessions.length" class="flex flex-col items-center py-10 text-base-content/50 gap-2">
            <IconChecks class="w-10 h-10" />
            <span class="text-sm">No services with low sessions</span>
          </div>
          
          <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div 
              v-for="service in lowSessions" 
              :key="service.id"
              class="p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold truncate">{{ getDisplayName(service) }}</span>
                    <span v-if="service.member" class="badge badge-outline badge-xs">Member</span>
                    <span v-else class="badge badge-ghost badge-xs">Walk-in</span>
                  </div>
                  <div class="text-xs text-base-content/60 mt-0.5">
                    {{ getDisplayPhone(service) }}
                    <span v-if="getDisplayEmail(service)" class="ml-2">· {{ getDisplayEmail(service) }}</span>
                  </div>
                  <div class="text-sm font-medium mt-1 text-primary">{{ service.servicePlan?.name ?? '-' }}</div>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-xs text-base-content/60">
                      {{ service.remainingSessions }}/{{ service.totalSessions }} sessions left
                    </span>
                  </div>
                  <!-- Session progress bar -->
                  <div class="mt-1.5 w-full bg-base-300 rounded-full h-1.5">
                    <div 
                      class="h-1.5 rounded-full bg-error"
                      :style="{ width: `${(service.remainingSessions / service.totalSessions) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="shrink-0">
                  <span class="badge badge-error badge-sm">{{ service.usagePercentage }}% used</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Status & Type Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Services by Status -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title text-base mb-4">Services by Status</h3>
          
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          
          <div v-else-if="!servicesByStatus.length" class="text-center py-8 text-base-content/50 text-sm">
            No data available
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Status</th>
                  <th class="text-right">Count</th>
                  <th class="text-right">Total Sessions</th>
                  <th class="text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="status in servicesByStatus" :key="status.status" class="hover">
                  <td>
                    <span :class="['badge badge-sm', getStatusBadgeClass(status.status)]">
                      {{ capitalizeStatus(status.status) }}
                    </span>
                  </td>
                  <td class="text-right font-semibold">{{ status.count }}</td>
                  <td class="text-right text-base-content/60">{{ status.totalSessions || '-' }}</td>
                  <td class="text-right text-base-content/60">{{ status.remainingSessions || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Services by Type -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title text-base mb-4">Services by Type</h3>
          
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else-if="!servicesByType.length" class="text-center py-8 text-base-content/50 text-sm">
            No data available
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Service Type</th>
                  <th class="text-right">Count</th>
                  <th class="text-right">Avg Sessions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="type in servicesByType" :key="type.serviceType" class="hover">
                  <td class="capitalize font-medium">{{ type.serviceType.replace('_', ' ') }}</td>
                  <td class="text-right font-semibold">{{ type.count }}</td>
                  <td class="text-right text-base-content/60">
                    {{ parseFloat(type.avgSessions) > 0 ? type.avgSessions : '-' }}
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
