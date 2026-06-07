<route lang="yaml">
meta:
  title: Check-In Details
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Content -->
    <div v-else-if="checkin" class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <router-link to="/gym/check-ins" class="btn btn-ghost btn-sm">
              <IconArrowLeft class="w-4 h-4" />
            </router-link>
            <h1 class="text-3xl font-bold">Check-In Details</h1>
          </div>
          <p class="text-base-content/60">View check-in information</p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="!checkin.checkOutTime"
            @click="openCheckoutModal"
            class="btn btn-success"
          >
            <IconDoorExit class="w-5 h-5 mr-2" />
            Check Out
          </button>
          <button
            @click="confirmDelete"
            class="btn btn-error"
          >
            <IconTrash class="w-5 h-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <!-- Main Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Member Information -->
            <div>
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                <IconUser class="w-5 h-5" />
                Member Information
              </h3>
              <div class="space-y-3">
                <div v-if="checkin.member">
                  <label class="text-sm text-base-content/60">Name</label>
                  <p class="font-semibold">
                    {{ checkin.member.firstName }} {{ checkin.member.lastName }}
                  </p>
                </div>
                <div v-if="checkin.member?.email">
                  <label class="text-sm text-base-content/60">Email</label>
                  <p class="font-semibold">{{ checkin.member.email }}</p>
                </div>
                <div v-if="checkin.member?.phone">
                  <label class="text-sm text-base-content/60">Phone</label>
                  <p class="font-semibold">{{ checkin.member.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Check-In Information -->
            <div>
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                <IconClock class="w-5 h-5" />
                Check-In Information
              </h3>
              <div class="space-y-3">
                <div>
                  <label class="text-sm text-base-content/60">Check-In Time</label>
                  <p class="font-semibold">{{ formatDateTime(checkin.checkInTime) }}</p>
                </div>
                <div>
                  <label class="text-sm text-base-content/60">Check-Out Time</label>
                  <p v-if="checkin.checkOutTime" class="font-semibold">
                    {{ formatDateTime(checkin.checkOutTime) }}
                  </p>
                  <div v-else class="badge badge-warning">Currently Active</div>
                </div>
                <div v-if="checkin.checkInTime && checkin.checkOutTime">
                  <label class="text-sm text-base-content/60">Duration</label>
                  <p class="font-semibold">{{ calculateDuration(checkin.checkInTime, checkin.checkOutTime) }}</p>
                </div>
                <div v-if="checkin.checkedBy">
                  <label class="text-sm text-base-content/60">Checked In By</label>
                  <p class="font-semibold">
                    {{ checkin.checkedBy.firstName }} {{ checkin.checkedBy.lastName }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Service Information -->
          <div v-if="checkin.activeService" class="mt-6 pt-6 border-t border-base-300">
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <IconBarbell class="w-5 h-5" />
              Service Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label class="text-sm text-base-content/60">Service Type</label>
                <div class="badge badge-info mt-1">
                  {{ formatServiceType(checkin.activeService.serviceType) }}
                </div>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Service Plan</label>
                <p class="font-semibold">{{ checkin.activeService.servicePlanName }}</p>
              </div>
              <div v-if="checkin.activeService.totalSessions">
                <label class="text-sm text-base-content/60">Sessions</label>
                <p class="font-semibold">
                  {{ checkin.activeService.remainingSessions || 0 }} / {{ checkin.activeService.totalSessions }}
                  <span class="text-sm text-base-content/60">remaining</span>
                </p>
              </div>
              <div v-if="checkin.activeService.endDate">
                <label class="text-sm text-base-content/60">Valid Until</label>
                <p class="font-semibold">{{ formatDate(checkin.activeService.endDate) }}</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="checkin.notes" class="mt-6 pt-6 border-t border-base-300">
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <IconNotes class="w-5 h-5" />
              Notes
            </h3>
            <p class="text-base-content/80 whitespace-pre-wrap">{{ checkin.notes }}</p>
          </div>

          <!-- Timestamps -->
          <div class="mt-6 pt-6 border-t border-base-300">
            <h3 class="text-lg font-bold mb-4">System Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-base-content/60">Created At</label>
                <p class="font-semibold text-sm">{{ formatDateTime(checkin.createdAt) }}</p>
              </div>
              <div>
                <label class="text-sm text-base-content/60">Last Updated</label>
                <p class="font-semibold text-sm">{{ formatDateTime(checkin.updatedAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconFileOff class="w-16 h-16 text-base-content/20 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Check-In Not Found</h3>
        <p class="text-base-content/60 mb-6">
          The check-in you're looking for doesn't exist or has been removed.
        </p>
        <router-link to="/gym/check-ins" class="btn btn-primary">
          <IconArrowLeft class="w-5 h-5 mr-2" />
          Back to Check-Ins
        </router-link>
      </div>
    </div>

    <!-- Check-Out Modal -->
    <CheckOutModal
      ref="checkoutModal"
      :checkin="checkin"
      @saved="handleCheckoutSaved"
    />

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Confirm Delete</h3>
        <p class="py-4">
          Are you sure you want to delete this check-in for
          <span v-if="checkin?.member" class="font-semibold">
            {{ checkin.member.firstName }} {{ checkin.member.lastName }}
          </span>?
          This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn">Cancel</button>
          <button @click="handleDelete" class="btn btn-error" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCheckins } from '@/composables/gym/checkin-management'
import CheckOutModal from '@/components/gym/check-ins/CheckOutModal.vue'
import {
  IconArrowLeft,
  IconUser,
  IconClock,
  IconBarbell,
  IconNotes,
  IconDoorExit,
  IconTrash,
  IconFileOff
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()

const { checkin, loading, getCheckinById, deleteCheckin } = useCheckins()

const checkoutModal = ref(null)
const deleteModal = ref(null)

// Methods
const loadCheckin = async () => {
  try {
    const id = route.params.id
    await getCheckinById(id)
  } catch (error) {
    console.error('Error loading check-in:', error)
  }
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
    'pt_package': 'PT Package',
    'class_package': 'Class Package',
    'membership': 'Membership'
  }
  return typeMap[type] || type
}

const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '-'
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end - start
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const openCheckoutModal = () => {
  checkoutModal.value?.openModal()
}

const handleCheckoutSaved = async () => {
  await loadCheckin()
}

const confirmDelete = () => {
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
}

const handleDelete = async () => {
  if (!checkin.value) return
  
  try {
    await deleteCheckin(checkin.value.id)
    closeDeleteModal()
    router.push('/gym/check-ins')
  } catch (error) {
    console.error('Error deleting check-in:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadCheckin()
})
</script>
