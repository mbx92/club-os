<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title">{{ title }}</h3>
      
      <!-- Date Range Filter -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Start Date <span class="text-error">*</span></span>
          </label>
          <input
            v-model="filters.startDate"
            type="date"
            class="input input-bordered w-full"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">End Date <span class="text-error">*</span></span>
          </label>
          <input
            v-model="filters.endDate"
            type="date"
            class="input input-bordered w-full"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Group By</span>
          </label>
          <select v-model="filters.groupBy" class="select select-bordered w-full">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      <!-- Location Filter (if showLocationFilter) -->
      <div v-if="showLocationFilter" class="form-control mb-4">
        <label class="label">
          <span class="label-text font-medium">Location</span>
        </label>
        <select v-model="filters.locationId" class="select select-bordered w-full">
          <option value="">All Locations</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
      </div>

      <!-- Category Filter (if showCategoryFilter) -->
      <div v-if="showCategoryFilter" class="form-control mb-4">
        <label class="label">
          <span class="label-text font-medium">Category</span>
        </label>
        <select v-model="filters.categoryId" class="select select-bordered w-full">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Generate Button -->
      <div class="flex justify-end">
        <button
          class="btn btn-primary"
          :disabled="!canGenerate || loading"
          @click="handleGenerate"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Generate Report</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getTenantTimezone, todayInTz, firstDayOfMonth } from '@/utils/tenantDate'

const authStore = useAuthStore()
const tz = getTenantTimezone(authStore)
const today = todayInTz(tz)

const props = defineProps({
  title: {
    type: String,
    default: 'Report Filters'
  },
  showLocationFilter: {
    type: Boolean,
    default: false
  },
  showCategoryFilter: {
    type: Boolean,
    default: false
  },
  locations: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['generate'])

const filters = ref({
  startDate: firstDayOfMonth(today),
  endDate: today,
  groupBy: 'month',
  locationId: '',
  categoryId: ''
})

const canGenerate = computed(() => {
  return filters.value.startDate && filters.value.endDate
})

const handleGenerate = () => {
  if (!canGenerate.value) return
  
  const reportFilters = {
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    groupBy: filters.value.groupBy
  }
  
  if (filters.value.locationId) {
    reportFilters.locationId = filters.value.locationId
  }
  
  if (filters.value.categoryId) {
    reportFilters.categoryId = filters.value.categoryId
  }
  
  emit('generate', reportFilters)
}
</script>
