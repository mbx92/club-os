<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      startDate: '',
      endDate: ''
    })
  },
  label: {
    type: String,
    default: 'Date Range'
  },
  showPresets: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizeRange = (value = {}) => ({
  start: value.start ?? value.startDate ?? '',
  end: value.end ?? value.endDate ?? ''
})

const startDate = ref(normalizeRange(props.modelValue).start)
const endDate = ref(normalizeRange(props.modelValue).end)

watch(
  () => props.modelValue,
  (value) => {
    const normalized = normalizeRange(value)

    if (normalized.start !== startDate.value) startDate.value = normalized.start
    if (normalized.end !== endDate.value) endDate.value = normalized.end
  },
  { deep: true }
)

watch([startDate, endDate], ([newStart, newEnd]) => {
  const value = {
    ...(props.modelValue || {}),
    start: newStart,
    end: newEnd,
    startDate: newStart,
    endDate: newEnd
  }
  emit('update:modelValue', value)
  emit('change', value)
})

// Preset options
const setToday = () => {
  const today = new Date().toISOString().split('T')[0]
  startDate.value = today
  endDate.value = today
}

const setYesterday = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  startDate.value = dateStr
  endDate.value = dateStr
}

const setThisWeek = () => {
  const today = new Date()
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
  const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6))
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = lastDay.toISOString().split('T')[0]
}

const setThisMonth = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = lastDay.toISOString().split('T')[0]
}

const setLastMonth = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = lastDay.toISOString().split('T')[0]
}

const setLast7Days = () => {
  const today = new Date()
  const last7 = new Date()
  last7.setDate(today.getDate() - 7)
  startDate.value = last7.toISOString().split('T')[0]
  endDate.value = today.toISOString().split('T')[0]
}

const setLast30Days = () => {
  const today = new Date()
  const last30 = new Date()
  last30.setDate(today.getDate() - 30)
  startDate.value = last30.toISOString().split('T')[0]
  endDate.value = today.toISOString().split('T')[0]
}

const clearDates = () => {
  startDate.value = ''
  endDate.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="label">
      <span class="label-text font-semibold">{{ label }}</span>
    </label>
    
    <div class="flex flex-col sm:flex-row gap-2">
      <!-- Date inputs -->
      <div class="flex gap-2 flex-1">
        <div class="form-control flex-1">
          <input 
            v-model="startDate"
            type="date" 
            class="input input-bordered w-full"
            placeholder="Start Date"
          />
        </div>
        
        <div class="form-control flex-1">
          <input 
            v-model="endDate"
            type="date" 
            class="input input-bordered w-full"
            placeholder="End Date"
          />
        </div>
      </div>
      
      <!-- Preset buttons dropdown -->
      <div v-if="showPresets" class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-outline">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Presets
        </label>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-1 border border-base-300">
          <li><a @click="setToday">Today</a></li>
          <li><a @click="setYesterday">Yesterday</a></li>
          <li><a @click="setLast7Days">Last 7 Days</a></li>
          <li><a @click="setLast30Days">Last 30 Days</a></li>
          <li class="menu-title"><span>Periods</span></li>
          <li><a @click="setThisWeek">This Week</a></li>
          <li><a @click="setThisMonth">This Month</a></li>
          <li><a @click="setLastMonth">Last Month</a></li>
          <li class="border-t border-base-300 mt-1 pt-1">
            <a @click="clearDates" class="text-error">Clear Dates</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
