<route lang="yaml">
meta:
  title: Instructor Detail
  layout: default
</route>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Trainer Details -->
    <div v-else-if="trainer">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Instructor Details</h1>
          <p class="text-base-content/60 mt-1">View and manage instructor information</p>
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-outline"
            @click="openEditModal"
          >
            <IconEdit class="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            class="btn btn-warning btn-outline"
            @click="confirmResetPassword"
          >
            <IconKey class="w-4 h-4 mr-2" />
            Reset Password
          </button>
          <button
            class="btn btn-error btn-outline"
            @click="confirmDeleteTrainer"
          >
            <IconTrash class="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <!-- Trainer Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- Active Status -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Account Status</div>
            <div class="stat-value text-2xl">
              <div class="badge badge-lg" :class="trainer.isActive ? 'badge-success' : 'badge-error'">
                {{ trainer.isActive ? 'Active' : 'Inactive' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Hire Date -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Hire Date</div>
            <div class="stat-value text-xl">{{ formatDate(trainer.hireDate) }}</div>
            <div class="stat-desc">{{ formatDateRelative(trainer.hireDate) }}</div>
          </div>
        </div>

        <!-- Specializations Count -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Specializations</div>
            <div class="stat-value text-2xl">{{ trainer.specializations?.length || 0 }}</div>
            <div class="stat-desc">areas of expertise</div>
          </div>
        </div>

        <!-- Age -->
        <div class="stats shadow" v-if="trainer.dateOfBirth">
          <div class="stat">
            <div class="stat-title">Age</div>
            <div class="stat-value text-2xl">{{ calculateAge(trainer.dateOfBirth) }}</div>
            <div class="stat-desc">years old</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Personal Information -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Personal Information</h2>
              
              <!-- Profile Photo and Name -->
              <div class="flex items-start gap-4 mb-6 pb-6 border-b border-base-300">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-24" style="display: flex !important; align-items: center !important; justify-content: center !important;">
                    <span v-if="trainer.photoUrl">
                      <img :src="trainer.photoUrl" :alt="formatTrainerName(trainer)" />
                    </span>
                    <span v-else class="text-3xl">
                      {{ trainer.firstName?.charAt(0) }}{{ trainer.lastName?.charAt(0) }}
                    </span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold">{{ formatTrainerName(trainer) }}</h3>
                  <p class="text-base-content/60 text-sm mt-1">ID: {{ trainer.id }}</p>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="trainer.email">
                  <div class="text-sm text-base-content/60">Email</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconMail class="w-4 h-4" />
                    {{ trainer.email }}
                  </div>
                </div>

                <div v-if="trainer.phone">
                  <div class="text-sm text-base-content/60">Phone</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconPhone class="w-4 h-4" />
                    {{ trainer.phone }}
                  </div>
                </div>

                <div v-if="trainer.dateOfBirth">
                  <div class="text-sm text-base-content/60">Date of Birth</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconCalendar class="w-4 h-4" />
                    {{ formatDateOfBirth(trainer.dateOfBirth) }}
                  </div>
                </div>

                <div v-if="trainer.gender">
                  <div class="text-sm text-base-content/60">Gender</div>
                  <div class="font-medium capitalize mt-1">{{ trainer.gender }}</div>
                </div>
              </div>

              <!-- Bio -->
              <div v-if="trainer.bio" class="mt-4 pt-4 border-t border-base-300">
                <div class="text-sm text-base-content/60 mb-2">Bio</div>
                <p class="text-base-content/80">{{ trainer.bio }}</p>
              </div>
            </div>
          </div>

          <!-- Specializations -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Specializations</h2>
              
              <div v-if="trainer.specializations && trainer.specializations.length > 0" class="flex flex-wrap gap-2">
                <div
                  v-for="spec in trainer.specializations"
                  :key="spec"
                  class="badge badge-lg badge-primary badge-outline capitalize"
                >
                  {{ spec.replace(/_/g, ' ') }}
                </div>
              </div>
              <div v-else class="text-center py-4 text-base-content/60">
                No specializations listed
              </div>
            </div>
          </div>

          <!-- Certifications -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconAward class="w-5 h-5" />
                Certifications
              </h2>
              
              <div v-if="trainer.certifications && trainer.certifications.length > 0" class="space-y-4">
                <div
                  v-for="(cert, index) in trainer.certifications"
                  :key="index"
                  class="card bg-base-200"
                >
                  <div class="card-body p-4">
                    <h3 class="font-bold">{{ cert.name }}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <div class="text-sm text-base-content/60">Issuer</div>
                        <div class="font-medium">{{ cert.issuer }}</div>
                      </div>
                      <div>
                        <div class="text-sm text-base-content/60">Issue Date</div>
                        <div class="font-medium">{{ formatDate(cert.date) }}</div>
                      </div>
                      <div v-if="cert.expiryDate">
                        <div class="text-sm text-base-content/60">Expiry Date</div>
                        <div class="font-medium" :class="{ 'text-error': isCertExpired(cert.expiryDate) }">
                          {{ formatDate(cert.expiryDate) }}
                          <span v-if="isCertExpired(cert.expiryDate)" class="badge badge-error badge-sm ml-2">Expired</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <IconFileOff class="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No certifications on file</p>
              </div>
            </div>
          </div>

          <!-- Weekly Availability -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconClock class="w-5 h-5" />
                Weekly Availability
              </h2>
              
              <div v-if="hasAvailability" class="space-y-3">
                <div
                  v-for="day in weekDays"
                  :key="day.value"
                  class="flex items-start gap-3 p-3 rounded-lg"
                  :class="trainer.availability[day.value]?.length > 0 ? 'bg-base-200' : 'opacity-50'"
                >
                  <div class="font-medium w-24">{{ day.label }}</div>
                  <div v-if="trainer.availability[day.value]?.length > 0" class="flex-1">
                    <div class="flex flex-wrap gap-2">
                      <div
                        v-for="(slot, index) in trainer.availability[day.value]"
                        :key="index"
                        class="badge badge-outline"
                      >
                        {{ slot }}
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-base-content/60">Not available</div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-base-content/60">
                No availability schedule set
              </div>
            </div>
          </div>

          <!-- Commission Information -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconCoin class="w-5 h-5" />
                Commission
              </h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-base-content/60">Commission Type</div>
                  <div class="font-medium capitalize mt-1">{{ getCommissionTypeLabel(trainer.commissionType) }}</div>
                </div>

                <div>
                  <div class="text-sm text-base-content/60">Commission Value</div>
                  <div class="font-bold text-lg text-primary mt-1">
                    {{ formatCommissionValue(trainer.commissionValue, trainer.commissionType) }}
                  </div>
                </div>

                <div v-if="trainer.commissionNotes" class="md:col-span-2">
                  <div class="text-sm text-base-content/60 mb-1">Notes</div>
                  <p class="text-base-content/80">{{ trainer.commissionNotes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Metadata & Actions -->
        <div class="space-y-6">
          <!-- Account Information -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Account Information</h2>
              
              <div class="space-y-4">
                <div v-if="trainer.user">
                  <div class="text-sm text-base-content/60">User ID</div>
                  <div class="font-mono text-xs mt-1 break-all">{{ trainer.user.id }}</div>
                </div>

                <div v-if="trainer.user?.lastLogin">
                  <div class="text-sm text-base-content/60">Last Login</div>
                  <div class="font-medium mt-1">{{ formatDateTime(trainer.user.lastLogin) }}</div>
                </div>

                <div>
                  <div class="text-sm text-base-content/60">Created At</div>
                  <div class="font-medium mt-1">{{ formatDateTime(trainer.createdAt) }}</div>
                </div>

                <div>
                  <div class="text-sm text-base-content/60">Last Updated</div>
                  <div class="font-medium mt-1">{{ formatDateTime(trainer.updatedAt) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Quick Actions</h2>
              
              <div class="space-y-2">
                <button
                  class="btn btn-block btn-outline justify-start"
                  @click="toggleStatus"
                >
                  <IconToggleLeft class="w-4 h-4" />
                  {{ trainer.isActive ? 'Deactivate' : 'Activate' }} Account
                </button>

                <button
                  class="btn btn-block btn-outline justify-start"
                  @click="openEditModal"
                >
                  <IconEdit class="w-4 h-4" />
                  Edit Details
                </button>

                <button
                  class="btn btn-block btn-warning btn-outline justify-start"
                  @click="confirmResetPassword"
                >
                  <IconKey class="w-4 h-4" />
                  Reset Password
                </button>

                <div class="divider my-2"></div>

                <button
                  class="btn btn-block btn-error btn-outline justify-start"
                  @click="confirmDeleteTrainer"
                >
                  <IconTrash class="w-4 h-4" />
                  Delete Instructor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trainer Form Modal -->
      <TrainerFormModal
        ref="trainerFormModal"
        :trainer="trainer"
        :loading="modalLoading"
        @submit="handleTrainerUpdate"
        @close="handleModalClose"
      />
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconAlertCircle class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Instructor Not Found</h3>
        <p class="text-base-content/60 mb-4">
          The instructor you're looking for doesn't exist or has been deleted.
        </p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Back to Instructors
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconKey,
  IconMail,
  IconPhone,
  IconCalendar,
  IconAlertCircle,
  IconFileOff,
  IconToggleLeft,
  IconAward,
  IconClock,
  IconCoin
} from '@tabler/icons-vue'
import { useTrainers } from '@/composables/gym/trainer-management/useTrainers'
import { useDialog } from '@/composables/core/useApi'
import TrainerFormModal from '@/components/instructors/TrainerFormModal.vue'

// Composables
const {
  trainer,
  loading,
  getTrainerById,
  updateTrainer,
  toggleTrainerStatus,
  resetTrainerPassword,
  deleteTrainer,
  formatTrainerName,
  formatDateOfBirth,
  calculateAge,
  getCommissionTypeLabel,
  formatCommissionValue,
  formatAvailability
} = useTrainers()

const route = useRoute()
const router = useRouter()
const dialog = useDialog()

// Local state
const modalLoading = ref(false)
const trainerFormModal = ref(null)

// Constants
const weekDays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' }
]

// Computed
const hasAvailability = computed(() => {
  if (!trainer.value?.availability) return false
  return Object.values(trainer.value.availability).some(slots => 
    Array.isArray(slots) && slots.length > 0
  )
})

// Methods
const loadTrainer = async () => {
  const trainerId = route.params.id
  try {
    await getTrainerById(trainerId)
  } catch (error) {
    console.error('Error loading trainer:', error)
  }
}

const goBack = () => {
  router.push('/gym/instructors')
}

const openEditModal = () => {
  trainerFormModal.value?.openModal()
}

const handleModalClose = () => {
  // Optional: refresh trainer data
}

const handleTrainerUpdate = async (trainerData) => {
  modalLoading.value = true
  try {
    await updateTrainer(trainer.value.id, trainerData)
    trainerFormModal.value?.closeModal()
    await loadTrainer() // Refresh trainer data
  } catch (error) {
    console.error('Error updating trainer:', error)
  } finally {
    modalLoading.value = false
  }
}

const toggleStatus = async () => {
  const newStatus = !trainer.value.isActive
  const action = newStatus ? 'activate' : 'deactivate'
  
  const confirmed = await dialog.confirm({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Instructor`,
    message: `Are you sure you want to ${action} "${formatTrainerName(trainer.value)}"?`,
    type: 'warning',
    confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await toggleTrainerStatus(trainer.value.id, newStatus)
      await loadTrainer() // Refresh trainer data
    } catch (error) {
      console.error('Error toggling trainer status:', error)
    }
  }
}

const confirmResetPassword = async () => {
  const confirmed = await dialog.confirm({
    title: 'Reset Password',
    message: `Are you sure you want to reset the password for "${formatTrainerName(trainer.value)}"? A new temporary password will be generated.`,
    type: 'warning',
    confirmText: 'Reset Password',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await resetTrainerPassword(trainer.value.id)
    } catch (error) {
      console.error('Error resetting password:', error)
    }
  }
}

const confirmDeleteTrainer = async () => {
  const confirmed = await dialog.confirm({
    title: 'Delete Instructor',
    message: `Are you sure you want to delete "${formatTrainerName(trainer.value)}"? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await deleteTrainer(trainer.value.id)
      router.push('/instructors')
    } catch (error) {
      console.error('Error deleting trainer:', error)
    }
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateRelative = (date) => {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diffTime = Math.abs(now - then)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

const isCertExpired = (expiryDate) => {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

// Lifecycle
onMounted(async () => {
  await loadTrainer()
})
</script>
