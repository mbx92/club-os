<route lang="yaml">
meta:
  title: Service Alerts
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Service Alerts</h1>
        <p class="text-base-content/60 mt-1">Monitor expiring services and low session warnings</p>
      </div>
      <router-link to="/gym/active-services" class="btn btn-primary btn-outline">
        <IconList class="w-5 h-5 mr-2" />
        Back to List
      </router-link>
    </div>

    <!-- Alert Settings -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="text-lg font-bold mb-4">Alert Thresholds</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Expiring Within (Days)</span>
              <span class="label-text-alt">Default: 7 days</span>
            </label>
            <input 
              type="number" 
              class="input input-bordered w-full"
              v-model.number="thresholds.daysThreshold"
              min="1"
              max="90"
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Low Sessions Threshold</span>
              <span class="label-text-alt">Default: 3 sessions</span>
            </label>
            <input 
              type="number" 
              class="input input-bordered w-full"
              v-model.number="thresholds.lowSessionsThreshold"
              min="1"
              max="20"
            />
          </div>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary" @click="loadAlerts">
            <IconRefresh class="w-4 h-4 mr-2" />
            Apply & Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Alert Summary -->
    <div v-if="alertSummary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="stat-title">Total Alerts</div>
          <div class="stat-value text-warning">{{ alertSummary.totalAlerts || 0 }}</div>
          <div class="stat-desc">Requires attention</div>
        </div>
      </div>
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="stat-title">Expiring Soon</div>
          <div class="stat-value text-error">{{ alertSummary.expiringServices || 0 }}</div>
          <div class="stat-desc">Within {{ thresholds.daysThreshold }} days</div>
        </div>
      </div>
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="stat-title">Low Sessions</div>
          <div class="stat-value text-warning">{{ alertSummary.lowSessionServices || 0 }}</div>
          <div class="stat-desc">Below {{ thresholds.lowSessionsThreshold }} sessions</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Alerts Content -->
    <div v-else>
      <!-- Expiring Services -->
      <div v-if="hasExpiringAlerts" class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex items-center gap-2 mb-4">
            <IconAlertTriangle class="w-6 h-6 text-error" />
            <h3 class="text-xl font-bold">Expiring Services</h3>
            <div class="badge badge-error">{{ alerts.expiring.length }}</div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Member</th>
                  <th>Service</th>
                  <th>Type</th>
                  <th>End Date</th>
                  <th>Days Left</th>
                  <th>Message</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alert in alerts.expiring" :key="alert.serviceId">
                  <!-- Severity -->
                  <td>
                    <div 
                      class="badge badge-sm"
                      :class="{
                        'badge-error': alert.severity === 'high',
                        'badge-warning': alert.severity === 'medium',
                        'badge-info': alert.severity === 'low'
                      }"
                    >
                      {{ alert.severity }}
                    </div>
                  </td>

                  <!-- Member -->
                  <td>
                    <div class="flex flex-col">
                      <div class="font-semibold">{{ alert.memberName }}</div>
                      <div class="text-sm text-base-content/60">{{ alert.memberPhone }}</div>
                    </div>
                  </td>

                  <!-- Service -->
                  <td>
                    <div class="font-semibold">{{ alert.serviceName }}</div>
                  </td>

                  <!-- Type -->
                  <td>
                    <div class="badge badge-sm badge-info">
                      {{ formatServiceType(alert.serviceType) }}
                    </div>
                  </td>

                  <!-- End Date -->
                  <td>
                    <div class="text-sm">{{ formatDate(alert.endDate) }}</div>
                  </td>

                  <!-- Days Left -->
                  <td>
                    <div 
                      class="font-bold"
                      :class="{
                        'text-error': alert.daysUntilExpiry <= 3,
                        'text-warning': alert.daysUntilExpiry > 3 && alert.daysUntilExpiry <= 7
                      }"
                    >
                      {{ alert.daysUntilExpiry }} days
                    </div>
                  </td>

                  <!-- Message -->
                  <td>
                    <div class="text-sm">{{ alert.message }}</div>
                  </td>

                  <!-- Actions -->
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <router-link
                        :to="`/gym/active-services/member/${alert.memberId}`"
                        class="btn btn-xs btn-ghost tooltip"
                        data-tip="View Details"
                      >
                        <IconEye class="w-4 h-4" />
                      </router-link>
                      <button
                        class="btn btn-xs btn-ghost text-success tooltip"
                        data-tip="Contact Member"
                        @click="contactMember(alert)"
                      >
                        <IconPhone class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Low Sessions Services -->
      <div v-if="hasLowSessionsAlerts" class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex items-center gap-2 mb-4">
            <IconAlertCircle class="w-6 h-6 text-warning" />
            <h3 class="text-xl font-bold">Low Sessions</h3>
            <div class="badge badge-warning">{{ alerts.lowSessions.length }}</div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Member</th>
                  <th>Service</th>
                  <th>Type</th>
                  <th>Sessions Left</th>
                  <th>End Date</th>
                  <th>Message</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alert in alerts.lowSessions" :key="alert.serviceId">
                  <!-- Severity -->
                  <td>
                    <div 
                      class="badge badge-sm"
                      :class="{
                        'badge-error': alert.severity === 'high',
                        'badge-warning': alert.severity === 'medium',
                        'badge-info': alert.severity === 'low'
                      }"
                    >
                      {{ alert.severity }}
                    </div>
                  </td>

                  <!-- Member -->
                  <td>
                    <div class="flex flex-col">
                      <div class="font-semibold">{{ alert.memberName }}</div>
                      <div class="text-sm text-base-content/60">{{ alert.memberPhone }}</div>
                    </div>
                  </td>

                  <!-- Service -->
                  <td>
                    <div class="font-semibold">{{ alert.serviceName }}</div>
                  </td>

                  <!-- Type -->
                  <td>
                    <div class="badge badge-sm badge-info">
                      {{ formatServiceType(alert.serviceType) }}
                    </div>
                  </td>

                  <!-- Sessions Left -->
                  <td>
                    <div 
                      class="font-bold text-warning"
                    >
                      {{ alert.remainingSessions }} / {{ alert.totalSessions }}
                    </div>
                  </td>

                  <!-- End Date -->
                  <td>
                    <div class="text-sm">{{ formatDate(alert.endDate) }}</div>
                  </td>

                  <!-- Message -->
                  <td>
                    <div class="text-sm">{{ alert.message }}</div>
                  </td>

                  <!-- Actions -->
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <router-link
                        :to="`/gym/active-services/member/${alert.memberId}`"
                        class="btn btn-xs btn-ghost tooltip"
                        data-tip="View Details"
                      >
                        <IconEye class="w-4 h-4" />
                      </router-link>
                      <button
                        class="btn btn-xs btn-ghost text-success tooltip"
                        data-tip="Contact Member"
                        @click="contactMember(alert)"
                      >
                        <IconPhone class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No Alerts -->
      <div v-if="!hasExpiringAlerts && !hasLowSessionsAlerts" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconShieldCheck class="w-16 h-16 mx-auto text-success mb-4" />
          <h3 class="text-xl font-semibold mb-2">No Alerts</h3>
          <p class="text-base-content/60">
            All services are in good standing. No action required at this time.
          </p>
        </div>
      </div>
    </div>

    <!-- Contact Member Modal -->
    <dialog ref="contactModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Contact Member</h3>
        
        <div v-if="selectedAlert" class="py-4">
          <div class="mb-4">
            <div class="text-sm text-base-content/60">Member:</div>
            <div class="font-bold text-lg">{{ selectedAlert.memberName }}</div>
            <div class="text-sm">{{ selectedAlert.memberPhone }}</div>
          </div>

          <div class="mb-4">
            <div class="text-sm text-base-content/60">Service:</div>
            <div class="font-semibold">{{ selectedAlert.serviceName }}</div>
          </div>

          <div class="mb-4">
            <div class="text-sm text-base-content/60">Issue:</div>
            <div class="text-sm">{{ selectedAlert.message }}</div>
          </div>

          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <span>You can contact the member via phone or setup an automated reminder system.</span>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeContactModal">Close</button>
          <a 
            v-if="selectedAlert" 
            :href="`tel:${selectedAlert.memberPhone}`" 
            class="btn btn-success"
          >
            <IconPhone class="w-4 h-4 mr-2" />
            Call Now
          </a>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActiveServices } from '@/composables/gym/service-management'
import { 
  IconList,
  IconRefresh,
  IconAlertTriangle,
  IconAlertCircle,
  IconShieldCheck,
  IconEye,
  IconPhone,
  IconInfoCircle
} from '@tabler/icons-vue'

const { 
  alerts,
  loading,
  getServiceAlerts
} = useActiveServices()

const thresholds = ref({
  daysThreshold: 7,
  lowSessionsThreshold: 3
})

const contactModal = ref(null)
const selectedAlert = ref(null)

// Computed
const hasExpiringAlerts = computed(() => {
  return alerts.value?.expiring && alerts.value.expiring.length > 0
})

const hasLowSessionsAlerts = computed(() => {
  return alerts.value?.lowSessions && alerts.value.lowSessions.length > 0
})

const alertSummary = computed(() => {
  if (!alerts.value) return null
  
  const expiring = alerts.value.expiring || []
  const lowSessions = alerts.value.lowSessions || []
  
  return {
    totalAlerts: expiring.length + lowSessions.length,
    expiringServices: expiring.length,
    lowSessionServices: lowSessions.length,
    highSeverity: [...expiring, ...lowSessions].filter(a => a.severity === 'high').length
  }
})

// Methods
const loadAlerts = async () => {
  try {
    await getServiceAlerts({
      daysThreshold: thresholds.value.daysThreshold,
      lowSessionsThreshold: thresholds.value.lowSessionsThreshold
    })
  } catch (error) {
    console.error('Error loading alerts:', error)
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatServiceType = (type) => {
  const typeMap = {
    'membership': 'Membership',
    'class_package': 'Class Package',
    'pt_package': 'PT Package',
    'spa_package': 'Spa Package'
  }
  return typeMap[type] || type
}

const contactMember = (alert) => {
  selectedAlert.value = alert
  contactModal.value?.showModal()
}

const closeContactModal = () => {
  contactModal.value?.close()
  selectedAlert.value = null
}

// Lifecycle
onMounted(() => {
  loadAlerts()
})
</script>
