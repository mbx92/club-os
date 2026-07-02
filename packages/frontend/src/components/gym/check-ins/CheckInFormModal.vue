<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCheckins } from '@/composables/gym/checkin-management'
import { useMembers } from '@/composables/gym/member-management'
import { IconDoorEnter, IconUser, IconNotes } from '@tabler/icons-vue'

const emit = defineEmits(['close', 'saved'])

const { createCheckin, loading } = useCheckins()
const { members, fetchMembers } = useMembers()

// Modal ref for dialog API
const modal = ref(null)

// Form data
const formData = ref({
  memberId: '',
  serviceType: '',
  notes: ''
})

// Validation errors
const errors = ref({})

// Loading states
const loadingMembers = ref(false)
const searchQuery = ref('')
const filteredMembers = ref([])
const showMemberModal = ref(false)
const selectedMember = ref(null)

// Service type options
const serviceTypeOptions = [
  { value: '', label: 'Membership', description: 'Basic gym access' },
  { value: 'pt_package', label: 'PT Package', description: 'Uses 1 PT session' },
  { value: 'class_package', label: 'Class Package', description: 'Uses 1 class session' }
]

// Computed
const modalTitle = computed(() => 'Create New Check-In')

const selectedServiceDescription = computed(() => {
  const selected = serviceTypeOptions.find(opt => opt.value === formData.value.serviceType)
  return selected ? selected.description : 'Select a service type for this check-in'
})

// Format helpers
const formatServiceType = (type) => {
  const typeMap = {
    'pt_package': 'PT Package',
    'class_package': 'Class Package',
    'membership': 'Membership'
  }
  return typeMap[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getMemberDisplayName = (member) => {
  return `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Member'
}

const getMemberInitial = (member) => {
  const name = getMemberDisplayName(member)
  return name.charAt(0).toUpperCase() || 'M'
}

// Validate form
const validateForm = () => {
  errors.value = {}

  if (!formData.value.memberId) {
    errors.value.memberId = 'Please select a member'
  }

  return Object.keys(errors.value).length === 0
}

// Load members with active services
const loadMembers = async () => {
  loadingMembers.value = true
  try {
    await fetchMembers({ 
      page: 1, 
      limit: 100, 
      status: 'active',
      includeActiveServices: true 
    })
    // Only show members that have at least one active service
    filteredMembers.value = (members.value || []).filter(m => Array.isArray(m.activeServices) && m.activeServices.length > 0)
  } catch (error) {
    console.error('Error loading members:', error)
  } finally {
    loadingMembers.value = false
  }
}

// Search members
const handleMemberSearch = (event) => {
  const query = event.target.value.toLowerCase()
  searchQuery.value = query
  
  if (!query) {
    // Reset to only members with active services
    filteredMembers.value = (members.value || []).filter(m => Array.isArray(m.activeServices) && m.activeServices.length > 0)
    return
  }

  const candidates = (members.value || []).filter(m => Array.isArray(m.activeServices) && m.activeServices.length > 0)

  filteredMembers.value = candidates.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const email = member.email?.toLowerCase() || ''
    const phone = member.phone || ''
    return fullName.includes(query) || email.includes(query) || phone.includes(query)
  })
}

// Select member
const selectMember = (member) => {
  selectedMember.value = member
  formData.value.memberId = member.id
  searchQuery.value = `${member.firstName} ${member.lastName}`
  closeMemberModal()
  errors.value.memberId = ''
}

// Clear member selection
const clearMemberSelection = () => {
  selectedMember.value = null
  formData.value.memberId = ''
  searchQuery.value = ''
  filteredMembers.value = (members.value || []).filter(m => Array.isArray(m.activeServices) && m.activeServices.length > 0)
}

// Reset form
const resetForm = () => {
  formData.value = {
    memberId: '',
    serviceType: '',
    notes: ''
  }
  errors.value = {}
  clearMemberSelection()
}

// Submit form
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    const payload = {
      memberId: formData.value.memberId,
      notes: formData.value.notes || undefined
    }

    // Only include serviceType if it's selected
    if (formData.value.serviceType) {
      payload.serviceType = formData.value.serviceType
    }

    const result = await createCheckin(payload)
    emit('saved', { checkinResult: result, member: selectedMember.value })
    closeModal()
  } catch (error) {
    console.error('Error creating check-in:', error)
  }
}

// Modal controls
const openModal = () => {
  resetForm()
  modal.value?.showModal()
}

const closeModal = () => {
  modal.value?.close()
  resetForm()
}

// Member modal controls
const memberModal = ref(null)

const openMemberModal = () => {
  if (members.value.length === 0) {
    loadMembers()
  } else {
    // Already fetched – show only members with active services
    filteredMembers.value = (members.value || []).filter(m => Array.isArray(m.activeServices) && m.activeServices.length > 0)
  }
  searchQuery.value = ''
  showMemberModal.value = true
  memberModal.value?.showModal()
}

const closeMemberModal = () => {
  memberModal.value?.close()
  showMemberModal.value = false
  searchQuery.value = ''
}

// Expose methods
defineExpose({ openModal, closeModal, resetForm })
</script>

<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold">{{ modalTitle }}</h3>
        <button
          type="button"
          @click="closeModal"
          class="btn btn-sm btn-circle btn-ghost"
        >
          ✕
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Member Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              <IconUser class="w-4 h-4 inline mr-1" />
              Member <span class="text-error">*</span>
            </span>
          </label>
          
          <!-- Selected Member Display or Button -->
          <div v-if="selectedMember" class="space-y-2">
            <div class="card bg-base-200 border border-base-300">
              <div class="card-body p-2.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="grid flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_200px] md:items-start">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2.5">
                        <div class="avatar placeholder">
                          <div class="h-8 w-8 rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            <span>{{ getMemberInitial(selectedMember) }}</span>
                          </div>
                        </div>
                        <div class="min-w-0">
                          <div class="truncate text-sm font-semibold leading-tight">{{ getMemberDisplayName(selectedMember) }}</div>
                          <div class="truncate text-xs text-base-content/60">
                            {{ selectedMember.email }}
                          </div>
                          <div v-if="selectedMember.phone" class="text-[11px] leading-tight text-base-content/50">
                            {{ selectedMember.phone }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-lg bg-base-100 px-2.5 py-2">
                      <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-base-content/50">
                        Active Services
                      </div>
                      <div v-if="selectedMember.activeServices && selectedMember.activeServices.length > 0" class="space-y-1">
                        <div
                          v-for="service in selectedMember.activeServices"
                          :key="service.id"
                          class="rounded-md border border-base-300 bg-base-100 px-2 py-1.5"
                        >
                          <div class="truncate text-xs font-semibold leading-tight">
                            {{ service.servicePlan?.name || 'Service' }}
                          </div>
                          <div class="mt-0.5 text-[11px] leading-tight text-base-content/60">
                            <span>{{ formatServiceType(service.serviceType) }}</span>
                            <span v-if="service.totalSessions">
                              • {{ service.remainingSessions || 0 }}/{{ service.totalSessions }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div v-else class="badge badge-sm badge-ghost">No active services</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="clearMemberSelection"
                    class="btn btn-ghost btn-sm btn-circle"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            v-else
            type="button"
            @click="openMemberModal"
            class="btn btn-outline w-full justify-start"
            :class="{ 'btn-error': errors.memberId }"
          >
            <IconUser class="w-5 h-5 mr-2" />
            Select Member
          </button>
          
          <label v-if="errors.memberId" class="label">
            <span class="label-text-alt text-error">{{ errors.memberId }}</span>
          </label>
        </div>

        <!-- Service Type Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              <IconDoorEnter class="w-4 h-4 inline mr-1" />
              Service Type
            </span>
          </label>
          <select
            class="select select-bordered w-full"
            v-model="formData.serviceType"
          >
            <option
              v-for="option in serviceTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              {{ selectedServiceDescription }}
            </span>
          </label>
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">
              <IconNotes class="w-4 h-4 inline mr-1" />
              Notes
            </span>
          </label>
          <textarea
            class="textarea textarea-bordered w-full h-24"
            placeholder="Optional notes about this check-in..."
            v-model="formData.notes"
          ></textarea>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action mt-6">
          <button
            type="button"
            @click="closeModal"
            class="btn btn-ghost"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>
              <IconDoorEnter class="w-5 h-5 inline mr-1" />
              Check In
            </span>
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>

  <!-- Member Selection Modal -->
  <dialog ref="memberModal" class="modal">
    <div class="modal-box w-11/12 max-w-3xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold">Select Member</h3>
        <button
          type="button"
          @click="closeMemberModal"
          class="btn btn-sm btn-circle btn-ghost"
        >
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="form-control mb-4">
        <input
          type="text"
          placeholder="Search member by name, email, or phone..."
          class="input input-bordered w-full"
          v-model="searchQuery"
          @input="handleMemberSearch"
          autocomplete="off"
        />
      </div>

      <!-- Members List -->
      <div class="overflow-y-auto max-h-96">
        <div v-if="loadingMembers" class="flex justify-center items-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="filteredMembers.length === 0" class="text-center py-12 text-base-content/60">
          No members found
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="member in filteredMembers"
            :key="member.id"
            @click="selectMember(member)"
            class="card bg-base-100 border border-base-300 hover:border-primary hover:bg-base-200 cursor-pointer transition-all"
          >
            <div class="card-body p-2.5">
              <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_210px] md:items-start">
                <div class="min-w-0">
                  <div class="flex items-center gap-2.5">
                    <div class="avatar placeholder">
                      <div class="h-8 w-8 rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        <span>{{ getMemberInitial(member) }}</span>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-semibold leading-tight">{{ getMemberDisplayName(member) }}</div>
                      <div class="truncate text-xs text-base-content/60">
                        {{ member.email }}
                      </div>
                      <div v-if="member.phone" class="text-[11px] leading-tight text-base-content/50">
                        {{ member.phone }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg bg-base-200/80 px-2.5 py-2">
                  <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-base-content/50">
                    Active Services
                  </div>
                  <div v-if="member.activeServices && member.activeServices.length > 0" class="space-y-1">
                    <div
                      v-for="service in member.activeServices"
                      :key="service.id"
                      class="rounded-md border border-base-300 bg-base-100 px-2 py-1.5"
                    >
                      <div class="truncate text-xs font-semibold leading-tight">
                        {{ service.servicePlan?.name || 'Service' }}
                      </div>
                      <div class="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] leading-tight text-base-content/60">
                        <span class="badge badge-xs" :class="{
                          'badge-info': service.serviceType === 'class_package',
                          'badge-success': service.serviceType === 'pt_package',
                          'badge-primary': service.serviceType === 'membership'
                        }">
                          {{ formatServiceType(service.serviceType) }}
                        </span>
                        <span v-if="service.totalSessions">
                          {{ service.remainingSessions || 0 }}/{{ service.totalSessions }} sessions
                        </span>
                        <span v-if="service.endDate">
                          Until {{ formatDate(service.endDate) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="badge badge-sm badge-ghost">No active services</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" @click="closeMemberModal" class="btn">Cancel</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeMemberModal">close</button>
    </form>
  </dialog>
</template>

<style scoped>
/* Custom styles for dropdown to appear above other elements */
.relative {
  position: relative;
}

.z-10 {
  z-index: 10;
}
</style>
