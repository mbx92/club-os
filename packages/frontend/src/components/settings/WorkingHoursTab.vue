<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-4">
        <IconClock class="w-6 h-6" />
        Working Hours
      </h2>

      <div class="alert alert-info mb-4">
        <IconInfoCircle class="w-5 h-5" />
        <span class="text-sm">Set your gym's operating hours for each day of the week</span>
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Monday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Monday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.monday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.monday.closed" class="flex gap-2">
            <input
              v-model="formData.monday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.monday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Tuesday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Tuesday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.tuesday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.tuesday.closed" class="flex gap-2">
            <input
              v-model="formData.tuesday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.tuesday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Wednesday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Wednesday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.wednesday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.wednesday.closed" class="flex gap-2">
            <input
              v-model="formData.wednesday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.wednesday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Thursday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Thursday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.thursday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.thursday.closed" class="flex gap-2">
            <input
              v-model="formData.thursday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.thursday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Friday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Friday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.friday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.friday.closed" class="flex gap-2">
            <input
              v-model="formData.friday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.friday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Saturday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Saturday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.saturday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.saturday.closed" class="flex gap-2">
            <input
              v-model="formData.saturday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.saturday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Sunday -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-semibold">Sunday</span>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Closed</span>
              <input
                v-model="formData.sunday.closed"
                type="checkbox"
                class="toggle toggle-sm"
              />
            </label>
          </label>
          <div v-if="!formData.sunday.closed" class="flex gap-2">
            <input
              v-model="formData.sunday.open"
              type="time"
              class="input input-bordered flex-1"
            />
            <span class="flex items-center px-2">to</span>
            <input
              v-model="formData.sunday.close"
              type="time"
              class="input input-bordered flex-1"
            />
          </div>
          <div v-else class="text-sm opacity-50 py-2">Closed all day</div>
        </div>

        <!-- Quick Actions -->
        <div class="divider"></div>
        <div class="flex gap-2 flex-wrap">
          <button
            type="button"
            class="btn btn-sm btn-outline"
            @click="applyToWeekdays"
          >
            <IconCopy class="w-4 h-4" />
            Apply to All Weekdays
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            @click="applyToWeekend"
          >
            <IconCopy class="w-4 h-4" />
            Apply to Weekend
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            @click="applyToAll"
          >
            <IconCopy class="w-4 h-4" />
            Apply to All Days
          </button>
        </div>

        <!-- Actions -->
        <div class="card-actions justify-end pt-4">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="saving"
            @click="resetForm"
          >
            Reset
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :class="{ 'loading': saving }"
            :disabled="saving || !hasChanges"
          >
            <IconDeviceFloppy v-if="!saving" class="w-5 h-5" />
            {{ saving ? 'Saving...' : 'Save Working Hours' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTenantSettings } from '@/composables/admin/useTenantSettings'
import {
  IconClock,
  IconInfoCircle,
  IconDeviceFloppy,
  IconCopy
} from '@tabler/icons-vue'

const {
  workingHours,
  loading,
  saving,
  fetchWorkingHours,
  updateWorkingHours,
  getDefaultWorkingHours
} = useTenantSettings()

// Form data structure for each day
const createDayData = (open = '08:00', close = '22:00', closed = false) => ({
  open,
  close,
  closed
})

// Form data
const formData = ref({
  monday: createDayData(),
  tuesday: createDayData(),
  wednesday: createDayData(),
  thursday: createDayData(),
  friday: createDayData(),
  saturday: createDayData('08:00', '20:00'),
  sunday: createDayData('08:00', '20:00')
})

// Store original data for comparison
const originalData = ref({})

// Check if form has changes
const hasChanges = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalData.value)
})

// Load working hours on mount
onMounted(async () => {
  await loadWorkingHours()
})

// Watch for working hours changes
watch(() => workingHours.value, (newHours) => {
  if (newHours) {
    populateForm(newHours)
  }
}, { deep: true })

// Load working hours from API
const loadWorkingHours = async () => {
  try {
    await fetchWorkingHours()
  } catch (err) {
    // Error already handled by handleError in composable
    // Just use default values as fallback
    const isDev = import.meta.env.DEV
    if (isDev) {
      console.log('[WorkingHoursTab] Using default working hours as fallback')
    }
    populateForm({ workingHours: getDefaultWorkingHours() })
  }
}

// Populate form with working hours data
const populateForm = (data) => {
  // Handle different response structures
  let hours = data
  
  // If data has workingHours property, use it
  if (data && typeof data === 'object' && data.workingHours) {
    hours = data.workingHours
  }
  
  // If hours is still wrapped, unwrap it
  if (hours && typeof hours === 'object' && hours.workingHours) {
    hours = hours.workingHours
  }
  
  Object.keys(formData.value).forEach(day => {
    if (hours && hours[day]) {
      const dayHours = hours[day]
      if (Array.isArray(dayHours) && dayHours.length === 2) {
        formData.value[day] = {
          open: dayHours[0],
          close: dayHours[1],
          closed: false
        }
      } else if (dayHours === null || dayHours === 'closed') {
        formData.value[day] = {
          open: '08:00',
          close: '22:00',
          closed: true
        }
      }
    }
  })
  
  // Store original data
  originalData.value = JSON.parse(JSON.stringify(formData.value))
}

// Convert form data to API format
const formatWorkingHours = () => {
  const hours = {}
  Object.keys(formData.value).forEach(day => {
    if (formData.value[day].closed) {
      hours[day] = null
    } else {
      hours[day] = [formData.value[day].open, formData.value[day].close]
    }
  })
  return hours
}

// Handle form submission
const handleSubmit = async () => {
  const formattedHours = formatWorkingHours()
  const result = await updateWorkingHours(formattedHours)
  
  if (result.success) {
    // Update original data after successful save
    originalData.value = JSON.parse(JSON.stringify(formData.value))
  }
}

// Reset form to original values
const resetForm = () => {
  formData.value = JSON.parse(JSON.stringify(originalData.value))
}

// Apply Monday hours to all weekdays
const applyToWeekdays = () => {
  const mondayHours = { ...formData.value.monday }
  ;['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
    formData.value[day] = { ...mondayHours }
  })
}

// Apply Saturday hours to weekend
const applyToWeekend = () => {
  const saturdayHours = { ...formData.value.saturday }
  formData.value.sunday = { ...saturdayHours }
}

// Apply Monday hours to all days
const applyToAll = () => {
  const mondayHours = { ...formData.value.monday }
  Object.keys(formData.value).forEach(day => {
    if (day !== 'monday') {
      formData.value[day] = { ...mondayHours }
    }
  })
}
</script>
