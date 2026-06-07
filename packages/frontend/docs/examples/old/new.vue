<route lang="yaml">
meta:
  title: New Check-in
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
        <h1 class="text-3xl font-bold">New Check-in</h1>
        <p class="text-base-content/60 mt-1">Check in a member to the gym</p>
      </div>
    </div>

    <!-- Form Card -->
    <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <!-- Member Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Member *</span>
            </label>
            <div class="relative">
              <input
                type="text"
                placeholder="Search member by name, email, or phone..."
                class="input input-bordered w-full"
                v-model="searchQuery"
                @input="handleSearch"
                @focus="showMemberDropdown = true"
                :class="{ 'input-error': errors.memberId }"
              />
              <IconSearch class="absolute right-3 top-3 w-5 h-5 text-base-content/40" />
            </div>

            <!-- Member Dropdown -->
            <div
              v-if="showMemberDropdown && (searchResults.length > 0 || searchLoading)"
              class="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
              <div v-if="searchLoading" class="p-4 text-center">
                <span class="loading loading-spinner loading-sm"></span>
                <span class="ml-2">Searching...</span>
              </div>
              <div v-else>
                <button
                  type="button"
                  v-for="m in searchResults"
                  :key="m.id"
                  class="w-full p-3 text-left hover:bg-base-200 flex items-center gap-3 border-b border-base-300 last:border-b-0"
                  @click="selectMember(m)"
                >
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-10">
                      <span class="text-sm">{{ getMemberInitials(m) }}</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="font-semibold">{{ m.firstName }} {{ m.lastName }}</div>
                    <div class="text-sm text-base-content/60">{{ m.email }}</div>
                    <div class="text-sm text-base-content/60">{{ m.phone }}</div>
                  </div>
                  <div>
                    <span
                      class="badge badge-sm"
                      :class="{
                        'badge-success': m.membershipStatus === 'active',
                        'badge-warning': m.membershipStatus === 'expired',
                        'badge-error': m.membershipStatus === 'inactive'
                      }"
                    >
                      {{ m.membershipStatus }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Selected Member -->
            <div v-if="selectedMember" class="mt-3 p-4 bg-base-200 rounded-lg flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-12">
                    <span>{{ getMemberInitials(selectedMember) }}</span>
                  </div>
                </div>
                <div>
                  <div class="font-semibold">{{ selectedMember.firstName }} {{ selectedMember.lastName }}</div>
                  <div class="text-sm text-base-content/60">{{ selectedMember.email }}</div>
                  <div class="text-sm text-base-content/60">{{ selectedMember.phone }}</div>
                </div>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-circle"
                @click="clearMember"
              >
                <IconX class="w-4 h-4" />
              </button>
            </div>
            
            <label v-if="errors.memberId" class="label">
              <span class="label-text-alt text-error">{{ errors.memberId }}</span>
            </label>
          </div>

          <!-- Service Type Selection -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text font-semibold">Service Type (Optional)</span>
            </label>
            <select
              class="select select-bordered"
              v-model="formData.serviceType"
            >
              <option value="">General Membership Check-in</option>
              <option value="pt_package">Personal Training Package</option>
              <option value="class_package">Class Package</option>
            </select>
            <label class="label">
              <span class="label-text-alt">
                Select a service type if this check-in uses a specific package. Leave empty for general membership check-in.
              </span>
            </label>
          </div>

          <!-- Active Services Info (if available) -->
          <div v-if="selectedMember && memberServices.length > 0" class="mt-4">
            <div class="alert alert-info">
              <IconInfoCircle class="w-5 h-5" />
              <div>
                <div class="font-semibold">Active Services Available</div>
                <div class="text-sm mt-1">
                  <div v-for="service in memberServices" :key="service.id" class="flex items-center gap-2 mt-1">
                    <span class="badge badge-sm">{{ service.serviceType }}</span>
                    <span>{{ service.servicePlanName }}</span>
                    <span v-if="service.remainingSessions" class="text-xs">
                      ({{ service.remainingSessions }} sessions left)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text font-semibold">Notes</span>
            </label>
            <textarea
              class="textarea textarea-bordered"
              placeholder="Enter notes about this check-in (optional)..."
              rows="4"
              v-model="formData.notes"
            ></textarea>
          </div>

          <!-- Submit Buttons -->
          <div class="card-actions justify-end mt-6">
            <button
              type="button"
              class="btn btn-ghost"
              @click="$router.back()"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="loading || !selectedMember"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <IconLogin v-else class="w-5 h-5 mr-2" />
              {{ loading ? 'Processing...' : 'Check-in Member' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCheckins } from '@/composables/gym/checkin-management/useCheckins'
import { useMembers } from '@/composables/gym/member-management/useMembers'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices'
import { 
  IconArrowLeft,
  IconLogin,
  IconSearch,
  IconX,
  IconInfoCircle
} from '@tabler/icons-vue'

const router = useRouter()

const { createCheckin, loading } = useCheckins()
const { fetchMembers, loading: searchLoading } = useMembers()
const { getServicesByMember } = useActiveServices()

// Form state
const formData = ref({
  memberId: '',
  serviceType: '',
  notes: ''
})

const errors = ref({})
const searchQuery = ref('')
const searchResults = ref([])
const selectedMember = ref(null)
const showMemberDropdown = ref(false)
const memberServices = ref([])

let searchTimeout = null

// Methods
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetchMembers({
        search: searchQuery.value,
        limit: 10,
        page: 1,
        isActive: 'true'
      })
      searchResults.value = response.data || []
    } catch (error) {
      console.error('Error searching members:', error)
      searchResults.value = []
    }
  }, 300)
}

const selectMember = async (member) => {
  selectedMember.value = member
  formData.value.memberId = member.id
  searchQuery.value = `${member.firstName} ${member.lastName}`
  showMemberDropdown.value = false
  errors.value.memberId = ''

  // Fetch member's active services
  try {
    const services = await getServicesByMember(member.id)
    memberServices.value = services?.filter(s => s.status === 'active') || []
  } catch (error) {
    console.error('Error fetching member services:', error)
    memberServices.value = []
  }
}

const clearMember = () => {
  selectedMember.value = null
  formData.value.memberId = ''
  searchQuery.value = ''
  memberServices.value = []
  searchResults.value = []
}

const getMemberInitials = (member) => {
  if (!member) return '?'
  const first = member.firstName?.[0] || ''
  const last = member.lastName?.[0] || ''
  return (first + last).toUpperCase()
}

const validateForm = () => {
  errors.value = {}

  if (!formData.value.memberId) {
    errors.value.memberId = 'Please select a member'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    const checkinData = {
      memberId: formData.value.memberId,
      notes: formData.value.notes
    }

    // Add service type if selected
    if (formData.value.serviceType) {
      checkinData.serviceType = formData.value.serviceType
    }

    const result = await createCheckin(checkinData)
    
    // Redirect to check-in details or list
    if (result?.checkIn?.id) {
      router.push(`/gym/check-ins/${result.checkIn.id}`)
    } else {
      router.push('/gym/check-ins')
    }
  } catch (error) {
    console.error('Error creating check-in:', error)
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showMemberDropdown.value = false
  }
}

// Add click outside listener
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}

// Watch for selected member changes
watch(selectedMember, (newValue) => {
  if (newValue) {
    showMemberDropdown.value = false
  }
})
</script>
