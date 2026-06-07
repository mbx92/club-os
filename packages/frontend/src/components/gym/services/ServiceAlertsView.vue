<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ title || 'Service Alerts' }}</h1>
        <p class="text-base-content/70">{{ subtitle || 'Monitor expiring services and low sessions' }}</p>
      </div>
      <button @click="goBack" class="btn btn-outline btn-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>
    </div>

    <!-- Alert Thresholds Configuration -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Alert Thresholds</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Days Until Expiry Warning</span>
            </label>
            <input
              v-model.number="daysThreshold"
              type="number"
              min="1"
              max="90"
              class="input input-bordered"
              @change="loadAlerts"
            />
            <label class="label">
              <span class="label-text-alt">Alert when service expires in X days</span>
            </label>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Low Sessions Warning</span>
            </label>
            <input
              v-model.number="lowSessionsThreshold"
              type="number"
              min="1"
              max="50"
              class="input input-bordered"
              @change="loadAlerts"
            />
            <label class="label">
              <span class="label-text-alt">Alert when sessions remaining ≤ X</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card bg-error/10 shadow-md">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-error">Total Alerts</h3>
              <p class="text-3xl font-bold text-error mt-2">{{ alertSummary.totalAlerts || 0 }}</p>
            </div>
            <div class="p-3 bg-error/20 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-warning/10 shadow-md">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-warning">Expiring Services</h3>
              <p class="text-3xl font-bold text-warning mt-2">{{ alertSummary.expiringServices || 0 }}</p>
            </div>
            <div class="p-3 bg-warning/20 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-info/10 shadow-md">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-info">Low Sessions</h3>
              <p class="text-3xl font-bold text-info mt-2">{{ alertSummary.lowSessionServices || 0 }}</p>
            </div>
            <div class="p-3 bg-info/20 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-error mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Alerts Content -->
    <div v-else>
      <!-- Expiring Services Table -->
      <div class="card bg-base-100 shadow-md mb-6">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg">Expiring Services ({{ filteredExpiringServices.length }})</h3>
          </div>

          <!-- No Expiring Services -->
          <div v-if="filteredExpiringServices.length === 0" class="text-center py-8">
            <div class="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-base-content/70">No services expiring within {{ daysThreshold }} days</p>
          </div>

          <!-- Expiring Services Table -->
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Member</th>
                  <th>Service Name</th>
                  <th>Service Type</th>
                  <th>End Date</th>
                  <th>Days Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alert in filteredExpiringServices" :key="alert.serviceId">
                  <td>
                    <div
                      class="badge"
                      :class="{
                        'badge-error': alert.severity === 'high',
                        'badge-warning': alert.severity === 'medium',
                        'badge-info': alert.severity === 'low'
                      }"
                    >
                      {{ alert.severity }}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div class="font-medium">{{ alert.memberName }}</div>
                      <div class="text-sm text-base-content/70">{{ alert.memberPhone }}</div>
                    </div>
                  </td>
                  <td>{{ alert.serviceName }}</td>
                  <td>
                    <span class="badge badge-ghost">{{ formatServiceType(alert.serviceType) }}</span>
                  </td>
                  <td>{{ formatDate(alert.endDate) }}</td>
                  <td>
                    <span
                      class="font-semibold"
                      :class="{
                        'text-error': alert.daysUntilExpiry <= 3,
                        'text-warning': alert.daysUntilExpiry > 3 && alert.daysUntilExpiry <= 7,
                        'text-info': alert.daysUntilExpiry > 7
                      }"
                    >
                      {{ alert.daysUntilExpiry }} days
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        @click="contactMember(alert)"
                        class="btn btn-sm btn-ghost"
                        title="Contact Member"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button
                        @click="viewMember(alert.memberId)"
                        class="btn btn-sm btn-ghost"
                        title="View Member"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Low Sessions Table -->
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg">Low Sessions ({{ filteredLowSessions.length }})</h3>
          </div>

          <!-- No Low Sessions -->
          <div v-if="filteredLowSessions.length === 0" class="text-center py-8">
            <div class="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-base-content/70">No services with low sessions (≤ {{ lowSessionsThreshold }})</p>
          </div>

          <!-- Low Sessions Table -->
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Service Name</th>
                  <th>Service Type</th>
                  <th>Total Sessions</th>
                  <th>Remaining</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alert in filteredLowSessions" :key="alert.serviceId">
                  <td>
                    <div>
                      <div class="font-medium">{{ alert.memberName }}</div>
                      <div class="text-sm text-base-content/70">{{ alert.memberPhone }}</div>
                    </div>
                  </td>
                  <td>{{ alert.serviceName }}</td>
                  <td>
                    <span class="badge badge-ghost">{{ formatServiceType(alert.serviceType) }}</span>
                  </td>
                  <td>{{ alert.totalSessions }}</td>
                  <td>
                    <span class="font-semibold text-warning">
                      {{ alert.remainingSessions }} sessions
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <progress
                        class="progress progress-warning w-20"
                        :value="(alert.totalSessions || 0) - (alert.remainingSessions || 0)"
                        :max="alert.totalSessions || 1"
                      ></progress>
                      <span class="text-sm">{{ calculateUsagePercentage((alert.totalSessions || 0) - (alert.remainingSessions || 0), alert.totalSessions || 1) }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        @click="contactMember(alert)"
                        class="btn btn-sm btn-ghost"
                        title="Contact Member"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                      <button
                        @click="viewMember(alert.memberId)"
                        class="btn btn-sm btn-ghost"
                        title="View Member"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Member Modal -->
    <dialog ref="contactModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Contact Member</h3>
        <div v-if="selectedAlert" class="space-y-4">
          <div>
            <p class="text-sm text-base-content/70">Member Name</p>
            <p class="font-semibold">{{ selectedAlert.memberName }}</p>
          </div>
          <div>
            <p class="text-sm text-base-content/70">Phone Number</p>
            <a :href="`tel:${selectedAlert.memberPhone}`" class="link link-primary font-semibold">
              {{ selectedAlert.memberPhone }}
            </a>
          </div>
          <div>
            <p class="text-sm text-base-content/70">Service</p>
            <p class="font-semibold">{{ selectedAlert.serviceName }}</p>
            <p class="text-sm">{{ formatServiceType(selectedAlert.serviceType) }}</p>
          </div>
          <div v-if="selectedAlert.type === 'expiring'">
            <p class="text-sm text-base-content/70">Alert</p>
            <p class="font-semibold text-warning">{{ selectedAlert.message }}</p>
          </div>
        </div>
        <div class="modal-action">
          <button @click="closeContactModal" class="btn">Close</button>
          <a
            v-if="selectedAlert"
            :href="`tel:${selectedAlert.memberPhone}`"
            class="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Now
          </a>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeContactModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices'

// Props
const props = defineProps({
  serviceType: {
    type: String,
    required: true,
    validator: (value) => ['membership', 'class_package', 'pt_package', 'spa_package'].includes(value)
  },
  title: {
    type: String,
    default: null
  },
  subtitle: {
    type: String,
    default: null
  }
})

// Composables
const router = useRouter()
const { getServiceAlerts } = useActiveServices()

// State
const loading = ref(false)
const error = ref(null)
const daysThreshold = ref(7)
const lowSessionsThreshold = ref(3)
const expiringServices = ref([])
const lowSessionServices = ref([])
const alertSummary = ref({
  totalAlerts: 0,
  expiringServices: 0,
  lowSessionServices: 0,
  highSeverity: 0
})
const selectedAlert = ref(null)
const contactModal = ref(null)

// Computed - Filter by serviceType
const filteredExpiringServices = computed(() => {
  return expiringServices.value.filter(alert => alert.serviceType === props.serviceType)
})

const filteredLowSessions = computed(() => {
  return lowSessionServices.value.filter(alert => alert.serviceType === props.serviceType)
})

// Methods
const loadAlerts = async () => {
  loading.value = true
  error.value = null

  try {
    const resp = await getServiceAlerts({
      daysThreshold: daysThreshold.value,
      lowSessionsThreshold: lowSessionsThreshold.value
    })

    // Normalize response shape. API may return:
    // - { data: { expiring: [], lowSessions: [] }, summary: {...} }
    // - { expiring: [], lowSessions: [], summary: {...} }
    // - { expiring: [], lowSessions: [] }
    const payload = resp && resp.data ? resp.data : resp

    expiringServices.value = (payload && (payload.expiring || payload.expiringServices)) || []
    lowSessionServices.value = (payload && (payload.lowSessions || payload.lowSessionServices)) || []

    // Prefer server-provided summary when available
    const serverSummary = resp && resp.summary ? resp.summary : (payload && payload.summary ? payload.summary : null)
    if (serverSummary) {
      alertSummary.value = {
        totalAlerts: serverSummary.totalAlerts ?? (expiringServices.value.length + lowSessionServices.value.length),
        expiringServices: serverSummary.expiringServices ?? expiringServices.value.length,
        lowSessionServices: serverSummary.lowSessionServices ?? lowSessionServices.value.length,
        highSeverity: serverSummary.highSeverity ?? expiringServices.value.filter(a => a.severity === 'high').length
      }
    } else {
      // Recalculate summary for filtered data
      alertSummary.value = {
        totalAlerts: filteredExpiringServices.value.length + filteredLowSessions.value.length,
        expiringServices: filteredExpiringServices.value.length,
        lowSessionServices: filteredLowSessions.value.length,
        highSeverity: filteredExpiringServices.value.filter(a => a.severity === 'high').length
      }
    }
  } catch (err) {
    console.error('Error loading alerts:', err)
    error.value = 'Failed to load alerts. Please try again.'
  } finally {
    loading.value = false
  }
}

const formatServiceType = (type) => {
  const typeMap = {
    membership: 'Membership',
    class_package: 'Class Package',
    pt_package: 'Personal Training',
    spa_package: 'Spa Package'
  }
  return typeMap[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const calculateUsagePercentage = (used, total) => {
  if (!total) return 0
  return Math.round((used / total) * 100)
}

const contactMember = (alert) => {
  selectedAlert.value = alert
  contactModal.value?.showModal()
}

const closeContactModal = () => {
  contactModal.value?.close()
  selectedAlert.value = null
}

const viewMember = (memberId) => {
  router.push(`/gym/active-services/member/${memberId}`)
}

const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(() => {
  loadAlerts()
})
</script>
