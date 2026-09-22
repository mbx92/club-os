<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { useCheckins } from '@/composables/gym/checkin-management'
import { useMembers } from '@/composables/gym/member-management'
import { IconDoorEnter, IconUser, IconNotes } from '@tabler/icons-vue'

const emit = defineEmits(['close', 'saved'])

const { createCheckin, loading } = useCheckins()
const {
  members,
  fetchMembers,
  getMemberById,
  getMembershipStatusClass,
  getMembershipStatusLabel,
} = useMembers()

// Modal ref for dialog API
const modal = ref(null)

// Form data
const formData = ref({
  memberId: '',
  serviceType: '',
  activeServiceId: '',
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
let memberSearchTimeout = null
let memberSearchSeq = 0

const memberStatusFilter = ref('all')
const memberStatusFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspend' },
]

const CHECKIN_SERVICE_TYPES = ['membership', 'pt_package', 'class_package']

const isServiceUsableForCheckIn = (service) => {
  if (!service || service.status !== 'active') return false
  if (!CHECKIN_SERVICE_TYPES.includes(service.serviceType)) return false
  if (service.endDate) {
    const today = dayjs().format('YYYY-MM-DD')
    if (String(service.endDate) < today) return false
  }
  if (service.totalSessions && (service.remainingSessions || 0) <= 0) return false
  return true
}

const memberServiceOptions = computed(() => {
  const services = selectedMember.value?.activeServices || []
  return services
    .filter(isServiceUsableForCheckIn)
    .map((service) => {
      const typeLabel = formatServiceType(service.serviceType)
      const planName = service.servicePlan?.name || typeLabel
      const parts = [typeLabel]
      if (service.totalSessions) {
        parts.push(`${service.remainingSessions || 0}/${service.totalSessions} sesi`)
      }
      if (service.endDate) {
        parts.push(`until ${formatDate(service.endDate)}`)
      }
      return {
        id: service.id,
        serviceType: service.serviceType,
        label: planName,
        description: parts.join(' • '),
      }
    })
})

const visibleMemberServices = computed(() =>
  (selectedMember.value?.activeServices || []).filter(isServiceUsableForCheckIn)
)

const serviceCompactLabel = (service) => {
  const name = service.servicePlan?.name || formatServiceType(service.serviceType)
  if (service.totalSessions) {
    return `${name} ${service.remainingSessions || 0}/${service.totalSessions}`
  }
  return name
}

const selectedServiceDescription = computed(() => {
  if (!selectedMember.value) return 'Pilih member terlebih dahulu'
  if (!memberServiceOptions.value.length) return 'Member ini tidak punya layanan aktif untuk check-in'
  const selected = memberServiceOptions.value.find((option) => option.id === formData.value.activeServiceId)
  return selected?.description || 'Pilih layanan member untuk check-in'
})

const applyMemberServiceSelection = (member) => {
  const services = (member?.activeServices || []).filter(isServiceUsableForCheckIn)
  const preferred = services.find((service) => service.serviceType === 'membership') || services[0]
  formData.value.activeServiceId = preferred?.id || ''
  formData.value.serviceType = preferred?.serviceType || ''
}

const onMemberServiceChange = () => {
  errors.value.serviceType = ''
  const selected = memberServiceOptions.value.find((option) => option.id === formData.value.activeServiceId)
  formData.value.serviceType = selected?.serviceType || ''
}

// Computed
const modalTitle = computed(() => 'Create New Check-In')

// Format helpers
const formatServiceType = (type) => {
  const typeMap = {
    pt_package: 'PT Package',
    class_package: 'Class Package',
    membership: 'Membership',
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

const getMemberEndDate = (member) => {
  if (!member) return null
  if (member.membershipEndDate) return member.membershipEndDate
  const services = member.activeServices || []
  const memberships = services.filter((service) => service.serviceType === 'membership' && service.endDate)
  if (!memberships.length) return services[0]?.endDate || null
  return memberships.reduce((latest, service) => {
    if (!latest) return service.endDate
    return String(service.endDate) > String(latest) ? service.endDate : latest
  }, null)
}

const membershipExpiryDays = (member) => {
  const endDate = getMemberEndDate(member)
  if (!endDate) return null
  return dayjs(endDate).startOf('day').diff(dayjs().startOf('day'), 'day')
}

const membershipExpiryLabel = (member) => {
  const days = membershipExpiryDays(member)
  if (days === null) return ''
  if (days === 0) return 'exp hari ini'
  const absDays = Math.abs(days)
  if (absDays < 30) {
    return days > 0 ? `exp ${absDays} hari lagi` : `exp ${absDays} hari lalu`
  }
  const months = Math.round(absDays / 30) || 1
  return days > 0 ? `exp ${months} bulan lagi` : `exp ${months} bulan lalu`
}

const membershipExpiryClass = (member) => {
  const days = membershipExpiryDays(member)
  if (days === null) return 'badge-ghost'
  if (days < 0) return 'badge-error'
  if (days <= 7) return 'badge-warning'
  return 'badge-ghost'
}

// Validate form
const validateForm = () => {
  errors.value = {}

  if (!formData.value.memberId) {
    errors.value.memberId = 'Please select a member'
  }

  if (formData.value.memberId && !formData.value.activeServiceId) {
    errors.value.serviceType = 'Pilih layanan member untuk check-in'
  }

  return Object.keys(errors.value).length === 0
}

const searchMembers = async (query = '') => {
  const seq = ++memberSearchSeq
  loadingMembers.value = true
  try {
    await fetchMembers({
      page: 1,
      limit: 20,
      isActive: 'all',
      lite: true,
      membershipStatus: memberStatusFilter.value,
      sortBy: query.trim() ? 'firstName' : 'createdAt',
      sortOrder: query.trim() ? 'ASC' : 'DESC',
      search: query.trim() || undefined,
    })
    if (seq !== memberSearchSeq) return
    filteredMembers.value = members.value || []
  } catch (error) {
    console.error('Error loading members:', error)
    if (seq !== memberSearchSeq) return
    filteredMembers.value = []
  } finally {
    if (seq === memberSearchSeq) {
      loadingMembers.value = false
    }
  }
}

const runMemberSearch = async (immediate = false) => {
  if (memberSearchTimeout) {
    clearTimeout(memberSearchTimeout)
  }

  const doFetch = () => searchMembers(searchQuery.value)

  if (immediate) {
    await doFetch()
    return
  }

  memberSearchTimeout = setTimeout(doFetch, 400)
}

const handleMemberSearch = () => {
  runMemberSearch(false)
}

const setMemberStatusFilter = (status) => {
  if (memberStatusFilter.value === status) return
  memberStatusFilter.value = status
  runMemberSearch(true)
}

const selectMember = async (member) => {
  selectedMember.value = member
  formData.value.memberId = member.id
  searchQuery.value = `${member.firstName} ${member.lastName}`
  closeMemberModal()
  errors.value.memberId = ''

  try {
    const fullMember = await getMemberById(member.id)
    if (fullMember?.id === member.id) {
      selectedMember.value = fullMember
      applyMemberServiceSelection(fullMember)
    }
  } catch (error) {
    console.error('Error loading member details:', error)
  }
}

// Clear member selection
const clearMemberSelection = () => {
  selectedMember.value = null
  formData.value.memberId = ''
  formData.value.serviceType = ''
  formData.value.activeServiceId = ''
  searchQuery.value = ''
  filteredMembers.value = []
}

// Reset form
const resetForm = () => {
  formData.value = {
    memberId: '',
    serviceType: '',
    activeServiceId: '',
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

    if (formData.value.activeServiceId) {
      payload.activeServiceId = formData.value.activeServiceId
    } else if (formData.value.serviceType) {
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

const openMemberModal = async () => {
  searchQuery.value = ''
  memberStatusFilter.value = 'all'
  showMemberModal.value = true
  memberModal.value?.showModal()
  await runMemberSearch(true)
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
                  <div class="flex min-w-0 flex-1 items-start gap-2.5">
                    <div class="avatar placeholder shrink-0">
                      <div class="h-8 w-8 rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        <span>{{ getMemberInitial(selectedMember) }}</span>
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1">
                        <div class="truncate text-sm font-semibold leading-tight">{{ getMemberDisplayName(selectedMember) }}</div>
                        <span
                          class="badge badge-xs"
                          :class="getMembershipStatusClass(selectedMember.membershipStatus)"
                        >
                          {{ getMembershipStatusLabel(selectedMember.membershipStatus) }}
                        </span>
                        <span
                          v-if="membershipExpiryLabel(selectedMember)"
                          class="badge badge-xs"
                          :class="membershipExpiryClass(selectedMember)"
                        >
                          {{ membershipExpiryLabel(selectedMember) }}
                        </span>
                      </div>
                      <div class="truncate text-xs text-base-content/60">
                        {{ selectedMember.email }}
                        <span v-if="selectedMember.phone"> • {{ selectedMember.phone }}</span>
                      </div>
                      <div v-if="visibleMemberServices.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                          v-for="service in visibleMemberServices"
                          :key="service.id"
                          class="badge badge-xs badge-outline"
                        >
                          {{ serviceCompactLabel(service) }}
                        </span>
                      </div>
                      <div v-else class="mt-1">
                        <span class="badge badge-xs badge-ghost">No active services</span>
                      </div>
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
            v-model="formData.activeServiceId"
            :disabled="!selectedMember || memberServiceOptions.length === 0"
            :class="{ 'select-error': errors.serviceType }"
            @change="onMemberServiceChange"
          >
            <option disabled value="">
              {{ selectedMember ? 'Pilih layanan member' : 'Pilih member terlebih dahulu' }}
            </option>
            <option
              v-for="option in memberServiceOptions"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt" :class="errors.serviceType ? 'text-error' : 'text-base-content/60'">
              {{ errors.serviceType || selectedServiceDescription }}
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
            :disabled="loading || !formData.activeServiceId"
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
  <Teleport to="body">
  <dialog ref="memberModal" class="modal">
    <div class="flex flex-col w-11/12 max-w-3xl h-[36rem] max-h-[90vh] modal-box">
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h3 class="text-xl font-bold">Select Member</h3>
        <button
          type="button"
          @click="closeMemberModal"
          class="btn btn-sm btn-circle btn-ghost"
        >
          ✕
        </button>
      </div>

      <div class="mb-4 space-y-3 shrink-0">
        <div class="form-control">
          <input
            type="text"
            placeholder="Ketik nama, email, atau nomor telepon member..."
            class="input input-bordered w-full"
            v-model="searchQuery"
            @input="handleMemberSearch"
            autocomplete="off"
          />
        </div>
        <div class="join w-full">
          <button
            v-for="option in memberStatusFilterOptions"
            :key="option.value"
            type="button"
            class="join-item btn btn-sm btn-outline flex-1"
            :class="memberStatusFilter === option.value ? 'btn-active btn-primary' : ''"
            @click="setMemberStatusFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="relative flex-1 min-h-0 overflow-hidden">
        <div
          v-if="loadingMembers"
          class="absolute inset-0 z-10 flex items-center justify-center bg-base-100/70"
        >
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div class="h-full overflow-y-auto">
          <div v-if="filteredMembers.length === 0 && !loadingMembers" class="flex items-center justify-center h-full text-base-content/60">
            No members found
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="member in filteredMembers"
              :key="member.id"
              @click="selectMember(member)"
              class="transition-colors border cursor-pointer card bg-base-100 border-base-300 hover:border-primary hover:bg-base-200"
            >
              <div class="p-3 card-body">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center min-w-0 gap-2.5">
                    <div class="avatar placeholder shrink-0">
                      <div class="h-8 w-8 rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        <span>{{ getMemberInitial(member) }}</span>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold truncate">{{ getMemberDisplayName(member) }}</div>
                      <div class="text-sm truncate text-base-content/60">
                        {{ member.email }} • {{ member.phone }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-end gap-1 shrink-0">
                    <span
                      class="badge badge-xs"
                      :class="getMembershipStatusClass(member.membershipStatus)"
                    >
                      {{ getMembershipStatusLabel(member.membershipStatus) }}
                    </span>
                    <span
                      v-if="membershipExpiryLabel(member)"
                      class="badge badge-xs"
                      :class="membershipExpiryClass(member)"
                    >
                      {{ membershipExpiryLabel(member) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action mt-4 shrink-0">
        <button type="button" @click="closeMemberModal" class="btn">Cancel</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeMemberModal">close</button>
    </form>
  </dialog>
  </Teleport>
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
