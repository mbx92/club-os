<route lang="yaml">
meta:
  title: Check-in Details
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button @click="$router.back()" class="btn btn-ghost btn-sm btn-circle">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-3xl font-bold">Check-in Details</h1>
        <p class="text-base-content/60 mt-1">View and manage check-in information</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Check-in Details -->
    <div v-else-if="checkin" class="space-y-6">
      <!-- Main Information Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Check-in Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Member Information -->
            <div class="space-y-4">
              <h3 class="font-semibold text-lg border-b pb-2">Member Information</h3>
              
              <div v-if="checkin.member">
                <div class="flex items-start gap-3">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-16">
                      <span class="text-2xl">{{ getMemberInitials(checkin.member) }}</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="font-bold text-lg">{{ checkin.member.firstName }} {{ checkin.member.lastName }}</div>
                    <div class="text-sm text-base-content/60 mt-1">
                      <div class="flex items-center gap-2 mb-1">
                        <IconMail class="w-4 h-4" />
                        {{ checkin.member.email }}
                      </div>
                      <div class="flex items-center gap-2">
                        <IconPhone class="w-4 h-4" />
                        {{ checkin.member.phone }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-base-content/60">No member information</div>
            </div>

            <!-- Check-in Details -->
            <div class="space-y-4">
              <h3 class="font-semibold text-lg border-b pb-2">Check-in Details</h3>
              
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Check-in Time:</span>
                  <span class="font-semibold">{{ formatDateTime(checkin.checkInTime) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Check-out Time:</span>
                  <span v-if="checkin.checkOutTime" class="font-semibold">{{ formatDateTime(checkin.checkOutTime) }}</span>
                  <span v-else class="badge badge-success">Still Active</span>
                </div>

                <div v-if="checkin.checkOutTime" class="flex justify-between items-center">
                  <span class="text-base-content/60">Duration:</span>
                  <span class="font-semibold">{{ calculateDuration(checkin.checkInTime, checkin.checkOutTime) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Checked By:</span>
                  <span v-if="checkin.checkedBy" class="font-semibold">
                    {{ checkin.checkedBy.firstName }} {{ checkin.checkedBy.lastName }}
                  </span>
                  <span v-else class="text-base-content/60">-</span>
                </div>

                <div v-if="checkin.activeServiceId" class="flex justify-between items-center">
                  <span class="text-base-content/60">Service Type:</span>
                  <span class="badge badge-info">Service Package</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div v-if="checkin.notes" class="mt-6 pt-6 border-t">
            <h3 class="font-semibold text-lg mb-2">Notes</h3>
            <div class="bg-base-200 p-4 rounded-lg">
              {{ checkin.notes }}
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions justify-end mt-6 pt-6 border-t">
            <button
              v-if="!checkin.checkOutTime"
              class="btn btn-success"
              @click="showCheckoutModal"
            >
              <IconLogout class="w-4 h-4 mr-2" />
              Check-out
            </button>
            <button
              class="btn btn-primary"
              @click="showEditModal"
            >
              <IconEdit class="w-4 h-4 mr-2" />
              Edit Notes
            </button>
            <button
              class="btn btn-error"
              @click="showDeleteModal"
            >
              <IconTrash class="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Active Service Information (if available) -->
      <div v-if="checkin.activeService" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Active Service Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/60">Service Plan:</span>
              <span class="font-semibold">{{ checkin.activeService.servicePlanName }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-base-content/60">Service Type:</span>
              <span class="badge badge-info">{{ checkin.activeService.serviceType }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-base-content/60">Status:</span>
              <span class="badge badge-success">{{ checkin.activeService.status }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-base-content/60">End Date:</span>
              <span class="font-semibold">{{ formatDate(checkin.activeService.endDate) }}</span>
            </div>
            
            <div v-if="checkin.activeService.totalSessions" class="flex justify-between items-center">
              <span class="text-base-content/60">Sessions:</span>
              <span class="font-semibold">
                {{ checkin.activeService.remainingSessions }} / {{ checkin.activeService.totalSessions }} remaining
              </span>
            </div>
            
            <div v-if="checkin.sessionUsed !== undefined" class="flex justify-between items-center">
              <span class="text-base-content/60">Session Used:</span>
              <span v-if="checkin.sessionUsed" class="badge badge-warning">Yes</span>
              <span v-else class="badge badge-ghost">No</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconAlertCircle class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Check-in Not Found</h3>
        <p class="text-base-content/60 mb-4">The check-in you're looking for doesn't exist or has been removed.</p>
        <router-link to="/gym/check-ins" class="btn btn-primary">
          Back to Check-ins
        </router-link>
      </div>
    </div>

    <!-- Edit Notes Modal -->
    <dialog ref="editModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Edit Notes</h3>
        <p class="py-2 text-sm text-base-content/60">Update the check-in notes</p>
        
        <div class="form-control">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            class="textarea textarea-bordered"
            placeholder="Enter notes..."
            rows="4"
            v-model="editNotes"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeEditModal">Cancel</button>
          <button 
            class="btn btn-primary" 
            @click="handleUpdateNotes"
          >
            Save Changes
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Checkout Modal -->
    <dialog ref="checkoutModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Check-out</h3>
        <p class="py-4">Are you sure you want to check out this member?</p>
        
        <div class="form-control">
          <label class="label">
            <span class="label-text">Additional Notes (Optional)</span>
          </label>
          <textarea
            class="textarea textarea-bordered"
            placeholder="Enter notes for check-out..."
            rows="3"
            v-model="checkoutNotes"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeCheckoutModal">Cancel</button>
          <button 
            class="btn btn-success" 
            @click="handleCheckout"
          >
            Confirm Check-out
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Delete Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Delete</h3>
        <p class="py-4">Are you sure you want to delete this check-in? This action cannot be undone.</p>

        <div class="modal-action">
          <button class="btn" @click="closeDeleteModal">Cancel</button>
          <button class="btn btn-error" @click="handleDelete">
            Delete Check-in
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCheckins } from '@/composables/gym/checkin-management/useCheckins'
import { 
  IconArrowLeft,
  IconLogout,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconMail,
  IconPhone
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()

const { 
  checkin, 
  loading, 
  getCheckinById,
  updateCheckin,
  deleteCheckin
} = useCheckins()

const editModal = ref(null)
const checkoutModal = ref(null)
const deleteModal = ref(null)
const editNotes = ref('')
const checkoutNotes = ref('')

// Methods
const loadCheckin = async () => {
  try {
    const checkinId = route.params.id
    await getCheckinById(checkinId)
    editNotes.value = checkin.value?.notes || ''
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

const calculateDuration = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return '-'
  
  const start = new Date(checkInTime)
  const end = new Date(checkOutTime)
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMins / 60)
  const minutes = diffMins % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const getMemberInitials = (member) => {
  if (!member) return '?'
  const first = member.firstName?.[0] || ''
  const last = member.lastName?.[0] || ''
  return (first + last).toUpperCase()
}

const showEditModal = () => {
  editNotes.value = checkin.value?.notes || ''
  editModal.value?.showModal()
}

const closeEditModal = () => {
  editModal.value?.close()
}

const handleUpdateNotes = async () => {
  if (!checkin.value) return
  
  try {
    await updateCheckin(checkin.value.id, {
      notes: editNotes.value
    })
    
    closeEditModal()
    await loadCheckin()
  } catch (error) {
    console.error('Error updating notes:', error)
  }
}

const showCheckoutModal = () => {
  checkoutNotes.value = checkin.value?.notes || ''
  checkoutModal.value?.showModal()
}

const closeCheckoutModal = () => {
  checkoutModal.value?.close()
  checkoutNotes.value = ''
}

const handleCheckout = async () => {
  if (!checkin.value) return
  
  try {
    await updateCheckin(checkin.value.id, {
      checkOutTime: new Date().toISOString(),
      notes: checkoutNotes.value
    })
    
    closeCheckoutModal()
    await loadCheckin()
  } catch (error) {
    console.error('Error checking out:', error)
  }
}

const showDeleteModal = () => {
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
