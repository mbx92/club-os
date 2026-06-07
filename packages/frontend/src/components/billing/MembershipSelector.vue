<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { IconPlus, IconMinus, IconCheck, IconCalendar, IconCrown } from '@tabler/icons-vue'

const props = defineProps({
  selected: {
    type: Array,
    default: () => []
  },
  memberId: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:selected'])

const api = useApi()

const membershipTypes = ref([])
const loading = ref(false)

// Fetch service plans (membership type)
const fetchMembershipTypes = async () => {
  loading.value = true
  try {
    const response = await api.get('/service/plans', { params: { serviceType: 'membership' } })
    membershipTypes.value = response.data?.data || response.data || []
  } catch (err) {
    console.error('Failed to fetch service plans:', err)
  } finally {
    loading.value = false
  }
}

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Format duration
const formatDuration = (days) => {
  if (days >= 365) {
    const years = Math.floor(days / 365)
    return `${years} Year${years > 1 ? 's' : ''}`
  }
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return `${months} Month${months > 1 ? 's' : ''}`
  }
  return `${days} Day${days > 1 ? 's' : ''}`
}

// Check if membership is selected
const isSelected = (membershipType) => {
  return props.selected.some(s => s.id === membershipType.id)
}

// Get selected item
const getSelectedItem = (membershipType) => {
  return props.selected.find(s => s.id === membershipType.id)
}

// Add membership to selection
const addMembership = (membershipType) => {
  if (isSelected(membershipType)) return
  
  const newItem = {
    id: membershipType.id,
    name: membershipType.name,
    price: membershipType.price,
    duration: membershipType.duration,
    startDate: new Date().toISOString().split('T')[0]
  }
  
  emit('update:selected', [...props.selected, newItem])
}

// Remove membership from selection
const removeMembership = (membershipType) => {
  emit('update:selected', props.selected.filter(s => s.id !== membershipType.id))
}

// Toggle membership selection
const toggleMembership = (membershipType) => {
  if (isSelected(membershipType)) {
    removeMembership(membershipType)
  } else {
    addMembership(membershipType)
  }
}

// Update start date
const updateStartDate = (membershipType, date) => {
  const updated = props.selected.map(s => {
    if (s.id === membershipType.id) {
      return { ...s, startDate: date }
    }
    return s
  })
  emit('update:selected', updated)
}

// Calculate end date
const calculateEndDate = (startDate, duration) => {
  if (!startDate || !duration) return '-'
  const start = new Date(startDate)
  start.setDate(start.getDate() + duration)
  return start.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(() => {
  fetchMembershipTypes()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-md"></span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!membershipTypes.length" class="text-center py-8 text-base-content/60">
      <IconCrown class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>No membership types available</p>
    </div>

    <!-- Membership Types Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div 
        v-for="membership in membershipTypes" 
        :key="membership.id"
        :class="[
          'card border-2 transition-all cursor-pointer',
          isSelected(membership) 
            ? 'border-primary bg-primary/5' 
            : 'border-base-200 hover:border-base-300'
        ]"
        @click="toggleMembership(membership)"
      >
        <div class="card-body p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-semibold">{{ membership.name }}</h3>
              <div class="text-sm text-base-content/60">
                {{ formatDuration(membership.duration) }}
              </div>
            </div>
            
            <!-- Selection Indicator -->
            <div 
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                isSelected(membership) 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-200'
              ]"
            >
              <IconCheck v-if="isSelected(membership)" class="w-4 h-4" />
            </div>
          </div>
          
          <!-- Price -->
          <div class="text-lg font-bold text-primary mt-2">
            {{ formatCurrency(membership.price) }}
          </div>
          
          <!-- Description -->
          <p v-if="membership.description" class="text-xs text-base-content/60 mt-1">
            {{ membership.description }}
          </p>
          
          <!-- Start Date (when selected) -->
          <div 
            v-if="isSelected(membership)" 
            class="mt-3 pt-3 border-t border-base-200"
            @click.stop
          >
            <label class="label py-0">
              <span class="label-text text-xs">Start Date</span>
            </label>
            <div class="flex items-center gap-2">
              <IconCalendar class="w-4 h-4 text-base-content/60" />
              <input 
                type="date"
                :value="getSelectedItem(membership)?.startDate"
                :min="new Date().toISOString().split('T')[0]"
                class="input input-bordered input-sm flex-1"
                :disabled="disabled"
                @change="updateStartDate(membership, $event.target.value)"
              />
            </div>
            <div class="text-xs text-base-content/60 mt-1">
              Ends: {{ calculateEndDate(getSelectedItem(membership)?.startDate, membership.duration) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Summary -->
    <div v-if="selected.length > 0" class="alert bg-primary/10 border-primary/20">
      <div class="flex-1">
        <div class="font-semibold">{{ selected.length }} membership(s) selected</div>
        <div class="text-sm">
          Total: {{ formatCurrency(selected.reduce((sum, s) => sum + s.price, 0)) }}
        </div>
      </div>
    </div>
  </div>
</template>
