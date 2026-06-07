<route lang="yaml">
meta:
  title: Member Services
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Content -->
    <div v-else-if="memberServices">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <router-link to="/gym/active-services" class="btn btn-sm btn-ghost btn-circle">
              <IconArrowLeft class="w-4 h-4" />
            </router-link>
            <h1 class="text-3xl font-bold">Member Services</h1>
          </div>
          <p class="text-base-content/60">Active services for this member</p>
        </div>
      </div>

      <!-- Member Info Card -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <div class="flex flex-col md:flex-row items-start justify-between gap-4">
            <div class="flex-1">
              <h2 class="text-2xl font-bold mb-2">{{ memberServices.member.fullName }}</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div class="text-sm text-base-content/60">Email</div>
                  <div class="font-semibold">{{ memberServices.member.email }}</div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Phone</div>
                  <div class="font-semibold">{{ memberServices.member.phone }}</div>
                </div>
                <div>
                  <div class="text-sm text-base-content/60">Membership Status</div>
                  <div 
                    class="badge"
                    :class="{
                      'badge-success': memberServices.member.membershipStatus === 'active',
                      'badge-error': memberServices.member.membershipStatus === 'inactive'
                    }"
                  >
                    {{ memberServices.member.membershipStatus }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <router-link 
                :to="`/gym/members/${route.params.id}`" 
                class="btn btn-primary btn-outline"
              >
                <IconUser class="w-4 h-4 mr-2" />
                View Profile
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Services Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Total Services</div>
            <div class="stat-value text-primary">{{ memberServices.summary.totalServices }}</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Active</div>
            <div class="stat-value text-success">{{ memberServices.summary.activeCount }}</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Expired</div>
            <div class="stat-value text-error">{{ memberServices.summary.expiredCount }}</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Depleted</div>
            <div class="stat-value text-warning">{{ memberServices.summary.depletedCount }}</div>
          </div>
        </div>
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="stat-title">Remaining Sessions</div>
            <div class="stat-value text-info">{{ memberServices.summary.totalRemainingSessions || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Services List -->
      <div v-if="memberServices.services.length > 0" class="space-y-4">
        <div 
          v-for="service in memberServices.services" 
          :key="service.id"
          class="card bg-base-100 shadow-xl"
        >
          <div class="card-body">
            <div class="flex flex-col lg:flex-row items-start justify-between gap-4">
              <!-- Left Section: Service Info -->
              <div class="flex-1">
                <div class="flex items-start gap-4 mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <h3 class="text-xl font-bold">{{ service.servicePlan.name }}</h3>
                      <div 
                        class="badge"
                        :class="{
                          'badge-success': service.status === 'active',
                          'badge-error': service.status === 'expired',
                          'badge-warning': service.status === 'depleted',
                          'badge-ghost': service.status === 'suspended'
                        }"
                      >
                        {{ service.status }}
                      </div>
                      <div class="badge badge-info">
                        {{ formatServiceType(service.serviceType) }}
                      </div>
                    </div>
                    
                    <!-- Alerts -->
                    <div v-if="service.isExpiringSoon || service.hasLowSessions" class="flex gap-2 mb-3">
                      <div v-if="service.isExpiringSoon" class="badge badge-warning gap-1">
                        <IconAlertTriangle class="w-3 h-3" />
                        Expiring in {{ service.daysRemaining }} days
                      </div>
                      <div v-if="service.hasLowSessions" class="badge badge-warning gap-1">
                        <IconAlertCircle class="w-3 h-3" />
                        Low sessions
                      </div>
                    </div>

                    <!-- Service Details Grid -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div class="text-xs text-base-content/60">Start Date</div>
                        <div class="font-semibold">{{ formatDate(service.startDate) }}</div>
                      </div>
                      <div>
                        <div class="text-xs text-base-content/60">End Date</div>
                        <div class="font-semibold">{{ formatDate(service.endDate) }}</div>
                      </div>
                      <div v-if="service.totalSessions">
                        <div class="text-xs text-base-content/60">Sessions</div>
                        <div class="font-semibold">
                          {{ service.remainingSessions }} / {{ service.totalSessions }}
                          <span class="text-xs text-base-content/60">({{ service.usagePercentage }}% used)</span>
                        </div>
                      </div>
                      <div>
                        <div class="text-xs text-base-content/60">Days Remaining</div>
                        <div 
                          class="font-semibold"
                          :class="{
                            'text-error': service.daysRemaining <= 3,
                            'text-warning': service.daysRemaining > 3 && service.daysRemaining <= 7
                          }"
                        >
                          {{ service.daysRemaining }} days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Additional Info -->
                <div class="divider my-2"></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div class="text-xs text-base-content/60">Price Paid</div>
                    <div class="font-bold text-success">{{ formatCurrency(service.pricePaid) }}</div>
                  </div>
                  <div v-if="parseFloat(service.voucherDiscount) > 0">
                    <div class="text-xs text-base-content/60">Discount</div>
                    <div class="font-semibold text-warning">-{{ formatCurrency(service.voucherDiscount) }}</div>
                  </div>
                  <div v-if="service.pricePerSession">
                    <div class="text-xs text-base-content/60">Price/Session</div>
                    <div class="font-semibold">{{ formatCurrency(service.pricePerSession) }}</div>
                  </div>
                  <div v-if="service.assignedTrainer">
                    <div class="text-xs text-base-content/60">Trainer</div>
                    <div class="font-semibold">{{ service.assignedTrainer.name }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/60">Transaction #</div>
                    <router-link 
                      :to="`/gym/transactions/${service.purchaseTransaction.id}`"
                      class="font-mono text-xs link link-primary"
                    >
                      {{ service.purchaseTransaction.transactionNumber }}
                    </router-link>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/60">Purchase Date</div>
                    <div class="font-semibold text-xs">{{ formatDateTime(service.purchaseTransaction.createdAt) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-base-content/60">Auto Renew</div>
                    <div class="font-semibold">{{ service.autoRenew ? 'Yes' : 'No' }}</div>
                  </div>
                </div>
              </div>

              <!-- Right Section: Actions -->
              <div class="flex flex-col gap-2">
                <button 
                  v-if="canAssignTrainer(service)"
                  class="btn btn-sm btn-primary btn-outline"
                  @click="showAssignTrainerModal(service)"
                >
                  <IconUserPlus class="w-4 h-4 mr-2" />
                  {{ service.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer' }}
                </button>
                <router-link 
                  :to="`/gym/transactions/${service.purchaseTransactionId}`"
                  class="btn btn-sm btn-ghost"
                >
                  <IconReceipt class="w-4 h-4 mr-2" />
                  View Transaction
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-xl font-semibold mb-2">No Services Found</h3>
          <p class="text-base-content/60">This member has no active or past services.</p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconAlertCircle class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Failed to Load Services</h3>
        <p class="text-base-content/60 mb-4">Unable to retrieve member services.</p>
        <button class="btn btn-primary" @click="loadMemberServices">
          <IconRefresh class="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    </div>

<!-- Assign Trainer Modal -->
<dialog ref="assignTrainerModal" class="modal">
  <div class="modal-box max-w-lg">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeAssignTrainerModal">
        ✕
      </button>
    </form>

    <h3 class="font-bold text-lg mb-2">{{ selectedService?.assignedTrainerId ? 'Change Trainer' : 'Assign Trainer' }}</h3>
    <p class="text-sm text-base-content/70 mb-6">
      Assign a trainer to this {{ formatServiceType(selectedService?.serviceType) }}
    </p>
    
    <div v-if="selectedService" class="space-y-4">
      <!-- Service Info Card -->
      <div class="p-4 bg-base-200 rounded-lg">
        <div class="text-xs font-medium text-base-content/60 mb-1">Service:</div>
        <div class="font-semibold text-base">{{ selectedService.servicePlan?.name }}</div>
        <div class="text-sm text-base-content/70 mt-1">{{ selectedService.member?.firstName }} {{ selectedService.member?.lastName }}</div>
      </div>

      <!-- Trainer Selection -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Select Trainer</span>
          <span v-if="loadingTrainers" class="label-text-alt text-info">
            <span class="loading loading-spinner loading-xs"></span>
            Loading...
          </span>
        </label>
        <select 
          class="select select-bordered w-full" 
          v-model="selectedTrainerId"
          :disabled="loadingTrainers"
        >
          <option value="" disabled>Select a trainer...</option>
          <option 
            v-for="trainer in activeTrainers" 
            :key="trainer.id" 
            :value="trainer.id"
          >
            {{ trainer.firstName }} {{ trainer.lastName }}
            <template v-if="trainer.specialization"> - {{ formatSpecialization(trainer.specialization) }}</template>
          </option>
        </select>
        <label class="label" v-if="!loadingTrainers && activeTrainers.length === 0">
          <span class="label-text-alt text-warning">No active trainers available</span>
        </label>
      </div>
    </div>

    <div class="modal-action mt-6">
      <button class="btn btn-ghost" @click="closeAssignTrainerModal">Cancel</button>
      <button 
        class="btn btn-primary" 
        @click="handleAssignTrainer"
        :disabled="!selectedTrainerId || assigningTrainer"
      >
        <span v-if="assigningTrainer" class="loading loading-spinner loading-sm"></span>
        <span v-else>Assign Trainer</span>
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button @click="closeAssignTrainerModal">close</button>
  </form>
</dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useActiveServices } from '@/composables/gym/service-management'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useCurrency } from '@/composables/core/useCurrency'
import { 
  IconArrowLeft,
  IconUser,
  IconUserPlus,
  IconReceipt,
  IconFileOff,
  IconAlertCircle,
  IconAlertTriangle,
  IconRefresh
} from '@tabler/icons-vue'

const route = useRoute()

const { 
  memberServices,
  loading,
  getServicesByMember,
  assignTrainer,
  canAssignTrainer
} = useActiveServices()

const { trainers, loading: loadingTrainers, fetchTrainers } = useTrainers()
const { formatCurrency } = useCurrency()

const assignTrainerModal = ref(null)
const selectedService = ref(null)
const selectedTrainerId = ref('')
const assigningTrainer = ref(false)

// Computed
const activeTrainers = computed(() => {
  // If no trainers loaded, return empty
  if (!trainers.value || trainers.value.length === 0) {
    return []
  }
  
  // Filter only active trainers, but show all if isActive is undefined
  const filtered = trainers.value.filter(trainer => {
    // Show trainer if isActive is true OR undefined (backward compatibility)
    return trainer.isActive === true || trainer.isActive === undefined
  })
  
  return filtered
})

// Methods
const loadMemberServices = async () => {
  try {
    const memberId = route.params.id
    await getServicesByMember(memberId)
  } catch (error) {
    console.error('Error loading member services:', error)
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

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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

const showAssignTrainerModal = async (service) => {
  selectedService.value = service
  selectedTrainerId.value = service.assignedTrainerId || ''
  
  // Always fetch trainers to get latest data
  try {
    await fetchTrainers({ limit: 100 })
  } catch (error) {
    console.error('[AssignTrainer] Error fetching trainers:', error)
  }
  
  assignTrainerModal.value?.showModal()
}

const closeAssignTrainerModal = () => {
  assignTrainerModal.value?.close()
  selectedService.value = null
  selectedTrainerId.value = ''
}

const handleAssignTrainer = async () => {
  if (!selectedService.value || !selectedTrainerId.value) return
  
  assigningTrainer.value = true
  try {
    await assignTrainer(selectedService.value.id, selectedTrainerId.value)
    closeAssignTrainerModal()
    await loadMemberServices()
  } catch (error) {
    console.error('Error assigning trainer:', error)
  } finally {
    assigningTrainer.value = false
  }
}

const formatSpecialization = (spec) => {
  const specMap = {
    'yoga': 'Yoga',
    'personal_training': 'Personal Training',
    'spinning': 'Spinning',
    'boxing': 'Boxing',
    'pilates': 'Pilates',
    'crossfit': 'CrossFit',
    'zumba': 'Zumba'
  }
  return specMap[spec] || spec
}

// Lifecycle
onMounted(() => {
  loadMemberServices()
})
</script>
