<route lang="yaml">
meta:
  title: Member Detail
  layout: default
</route>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Member Details -->
    <div v-else-if="member">
      <!-- Header with Back Button -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Member Details</h1>
          <p class="text-base-content/60 mt-1">View and manage member information</p>
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
            @click="confirmDeleteMember"
          >
            <IconTrash class="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <!-- Member Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- Membership Status -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Membership Status</div>
            <div class="stat-value text-2xl">
              <div class="badge badge-lg" :class="getMembershipStatusClass(member.membershipStatus)">
                {{ getMembershipStatusLabel(member.membershipStatus) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Active Status -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Account Status</div>
            <div class="stat-value text-2xl">
              <div class="badge badge-lg" :class="member.isActive ? 'badge-success' : 'badge-error'">
                {{ member.isActive ? 'Active' : 'Inactive' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Join Date -->
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Join Date</div>
            <div class="stat-value text-xl">{{ formatDate(member.joinDate) }}</div>
            <div class="stat-desc">{{ formatDateRelative(member.joinDate) }}</div>
          </div>
        </div>

        <!-- Age -->
        <div class="stats shadow" v-if="member.dateOfBirth">
          <div class="stat">
            <div class="stat-title">Age</div>
            <div class="stat-value text-2xl">{{ calculateAge(member.dateOfBirth) }}</div>
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
                    <span v-if="member.photoUrl">
                      <img :src="member.photoUrl" :alt="formatMemberName(member)" />
                    </span>
                    <span v-else class="text-3xl">
                      {{ member.firstName?.charAt(0) }}{{ member.lastName?.charAt(0) }}
                    </span>
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold">{{ formatMemberName(member) }}</h3>
                  <p class="text-base-content/60 text-sm mt-1">ID: {{ member.id }}</p>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="member.email">
                  <div class="text-sm text-base-content/60">Email</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconMail class="w-4 h-4" />
                    {{ member.email }}
                  </div>
                </div>

                <div v-if="member.phone">
                  <div class="text-sm text-base-content/60">Phone</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconPhone class="w-4 h-4" />
                    {{ member.phone }}
                  </div>
                </div>

                <div v-if="member.dateOfBirth">
                  <div class="text-sm text-base-content/60">Date of Birth</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconCalendar class="w-4 h-4" />
                    {{ formatDateOfBirth(member.dateOfBirth) }}
                  </div>
                </div>

                <div v-if="member.gender">
                  <div class="text-sm text-base-content/60">Gender</div>
                  <div class="font-medium capitalize mt-1">{{ member.gender }}</div>
                </div>

                <div v-if="member.address" class="md:col-span-2">
                  <div class="text-sm text-base-content/60">Address</div>
                  <div class="font-medium flex items-start gap-2 mt-1">
                    <IconMapPin class="w-4 h-4 mt-1 flex-shrink-0" />
                    {{ member.address }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Emergency Contact -->
          <div class="card bg-base-100 shadow-xl" v-if="member.emergencyContactName || member.emergencyContactPhone">
            <div class="card-body">
              <h2 class="card-title mb-4">
                <IconAlertTriangle class="w-5 h-5" />
                Emergency Contact
              </h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="member.emergencyContactName">
                  <div class="text-sm text-base-content/60">Contact Name</div>
                  <div class="font-medium mt-1">{{ member.emergencyContactName }}</div>
                </div>

                <div v-if="member.emergencyContactPhone">
                  <div class="text-sm text-base-content/60">Contact Phone</div>
                  <div class="font-medium flex items-center gap-2 mt-1">
                    <IconPhone class="w-4 h-4" />
                    {{ member.emergencyContactPhone }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="card bg-base-100 shadow-xl" v-if="member.notes">
            <div class="card-body">
              <h2 class="card-title mb-4">Notes</h2>
              <p class="text-base-content/80 whitespace-pre-line">{{ member.notes }}</p>
            </div>
          </div>

          <!-- Memberships -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Membership History</h2>
              
              <div v-if="member.memberships && member.memberships.length > 0">
                <div class="overflow-x-auto">
                  <table class="table table-zebra">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="membership in member.memberships" :key="membership.id">
                        <td>{{ membership.plan?.name || '-' }}</td>
                        <td>{{ formatDate(membership.startDate) }}</td>
                        <td>{{ formatDate(membership.endDate) }}</td>
                        <td>
                          <div class="badge badge-sm" :class="getMembershipStatusClass(membership.status)">
                            {{ getMembershipStatusLabel(membership.status) }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                <IconFileOff class="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No membership history available</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Metadata -->
        <div class="space-y-6">
          <!-- User Account Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Account Information</h2>
              
              <div class="space-y-4">
                <div v-if="member.user">
                  <div class="text-sm text-base-content/60">User ID</div>
                  <div class="font-mono text-xs mt-1 break-all">{{ member.user.id }}</div>
                </div>

                <div v-if="member.user?.lastLogin">
                  <div class="text-sm text-base-content/60">Last Login</div>
                  <div class="font-medium mt-1">{{ formatDateTime(member.user.lastLogin) }}</div>
                </div>

                <div>
                  <div class="text-sm text-base-content/60">Created At</div>
                  <div class="font-medium mt-1">{{ formatDateTime(member.createdAt) }}</div>
                </div>

                <div>
                  <div class="text-sm text-base-content/60">Last Updated</div>
                  <div class="font-medium mt-1">{{ formatDateTime(member.updatedAt) }}</div>
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
                  {{ member.isActive ? 'Deactivate' : 'Activate' }} Account
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
                  @click="confirmDeleteMember"
                >
                  <IconTrash class="w-4 h-4" />
                  Delete Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Member Form Modal -->
      <MemberFormModal
        ref="memberFormModal"
        :member="member"
        :loading="modalLoading"
        @submit="handleMemberUpdate"
        @close="handleModalClose"
      />
    </div>

    <!-- Error State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconAlertCircle class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Member Not Found</h3>
        <p class="text-base-content/60 mb-4">
          The member you're looking for doesn't exist or has been deleted.
        </p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Back to Members
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconKey,
  IconMail,
  IconPhone,
  IconCalendar,
  IconMapPin,
  IconAlertTriangle,
  IconAlertCircle,
  IconFileOff,
  IconToggleLeft
} from '@tabler/icons-vue'
import { useMembers } from '@/composables/gym/member-management/useMembers'
import { useDialog } from '@/composables/core/useApi'
import MemberFormModal from '@/components/members/MemberFormModal.vue'

// Composables
const {
  member,
  loading,
  getMemberById,
  updateMember,
  toggleMemberStatus,
  resetMemberPassword,
  deleteMember,
  formatMemberName,
  formatDateOfBirth,
  getMembershipStatusClass,
  getMembershipStatusLabel,
  calculateAge
} = useMembers()

const route = useRoute()
const router = useRouter()
const dialog = useDialog()

// Local state
const modalLoading = ref(false)
const memberFormModal = ref(null)

// Methods
const loadMember = async () => {
  const memberId = route.params.id
  try {
    await getMemberById(memberId)
  } catch (error) {
    console.error('Error loading member:', error)
  }
}

const goBack = () => {
  router.push('/gym/members')
}

const openEditModal = () => {
  memberFormModal.value?.openModal()
}

const handleModalClose = () => {
  // Optional: refresh member data
}

const handleMemberUpdate = async (memberData) => {
  modalLoading.value = true
  try {
    await updateMember(member.value.id, memberData)
    memberFormModal.value?.closeModal()
    await loadMember() // Refresh member data
  } catch (error) {
    console.error('Error updating member:', error)
  } finally {
    modalLoading.value = false
  }
}

const toggleStatus = async () => {
  const newStatus = !member.value.isActive
  const action = newStatus ? 'activate' : 'deactivate'
  
  const confirmed = await dialog.confirm({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Member`,
    message: `Are you sure you want to ${action} "${formatMemberName(member.value)}"?`,
    type: 'warning',
    confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await toggleMemberStatus(member.value.id, newStatus)
      await loadMember() // Refresh member data
    } catch (error) {
      console.error('Error toggling member status:', error)
    }
  }
}

const confirmResetPassword = async () => {
  const confirmed = await dialog.confirm({
    title: 'Reset Password',
    message: `Are you sure you want to reset the password for "${formatMemberName(member.value)}"? A new temporary password will be generated.`,
    type: 'warning',
    confirmText: 'Reset Password',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await resetMemberPassword(member.value.id)
    } catch (error) {
      console.error('Error resetting password:', error)
    }
  }
}

const confirmDeleteMember = async () => {
  const confirmed = await dialog.confirm({
    title: 'Delete Member',
    message: `Are you sure you want to delete "${formatMemberName(member.value)}"? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  if (confirmed) {
    try {
      await deleteMember(member.value.id)
      router.push('/members')
    } catch (error) {
      console.error('Error deleting member:', error)
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

// Lifecycle
onMounted(async () => {
  await loadMember()
})
</script>
