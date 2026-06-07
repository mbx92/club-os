<route lang="yaml">
meta:
  title: Device Logs
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/gym/hikvision/devices">Hikvision Devices</router-link></li>
        <li>Device Logs</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Device Logs</h1>
        <p class="text-base-content/60 mt-1">Raw attendance logs from the device (for debugging & audit)</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Start Date</span></label>
            <input type="datetime-local" v-model="filters.startDate" class="input input-bordered input-sm" @change="loadLogs" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">End Date</span></label>
            <input type="datetime-local" v-model="filters.endDate" class="input input-bordered input-sm" @change="loadLogs" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Items Per Page</span></label>
            <select v-model="filters.limit" class="select select-bordered select-sm" @change="loadLogs">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">&nbsp;</span></label>
            <button class="btn btn-sm btn-outline w-full" @click="resetFilters">
              <IconFilterOff class="w-4 h-4 mr-1" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty -->
    <div v-else-if="logs.length === 0" class="text-center py-12">
      <IconFileText class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <h3 class="text-xl font-semibold mb-2">No Logs Found</h3>
      <p class="text-base-content/60">No device logs found for the selected filters.</p>
    </div>

    <!-- Logs Table -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Event Time</th>
                <th>Employee No</th>
                <th v-if="hasMatchedEmployee">Matched Employee</th>
                <th v-if="hasMatchedUser">Matched User</th>
                <th v-if="hasMatchedMember">Matched Member</th>
                <th>Verify Mode</th>
                <th>Source</th>
                <th>Card No</th>
                <th>Processed At</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>
                  <span class="font-mono text-sm">{{ formatDateTime(log.eventTime) }}</span>
                </td>
                <td>
                  <span class="badge badge-ghost font-mono">{{ log.deviceEmployeeNo }}</span>
                </td>
                <td v-if="hasMatchedEmployee">
                  <div v-if="log.matchedDeviceEmployee">
                    <div class="font-medium text-sm">{{ log.matchedDeviceEmployee.name }}</div>
                  </div>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td v-if="hasMatchedUser">
                  <div v-if="log.matchedUser">
                    <div class="font-medium text-sm">{{ log.matchedUser.firstName }} {{ log.matchedUser.lastName }}</div>
                    <div class="text-xs text-base-content/60">{{ log.matchedUser.email }}</div>
                  </div>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td v-if="hasMatchedMember">
                  <div v-if="log.matchedMember">
                    <div class="font-medium text-sm">{{ log.matchedMember.firstName }} {{ log.matchedMember.lastName }}</div>
                  </div>
                  <span v-else class="text-base-content/40">—</span>
                </td>
                <td>
                  <div class="badge badge-sm" :class="verifyModeBadge(log.verifyMode)">
                    {{ log.verifyMode }}
                  </div>
                </td>
                <td>
                  <div class="badge badge-sm" :class="log.source === 'push' ? 'badge-success' : 'badge-info'">
                    {{ log.source }}
                  </div>
                </td>
                <td>
                  <span class="text-sm font-mono">{{ log.cardNo || '—' }}</span>
                </td>
                <td>
                  <span class="text-xs text-base-content/60">{{ formatDateTime(log.processedAt) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
            {{ pagination.total }} logs
          </span>
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page <= 1"
              @click="goToPage(pagination.page - 1)"
            >«</button>
            <button
              v-for="p in visiblePages"
              :key="p"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': p === pagination.page }"
              @click="goToPage(p)"
            >{{ p }}</button>
            <button
              class="join-item btn btn-sm"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
            >»</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceLogs } from '@/composables/gym/hikvision'
import {
  IconFileText,
  IconFilterOff,
} from '@tabler/icons-vue'

const route = useRoute()
const deviceId = route.params.id

const { logs, loading, pagination, fetchLogs } = useDeviceLogs()

const filters = ref({
  page: 1,
  limit: 50,
  startDate: '',
  endDate: '',
})

// Computed — column visibility
const hasMatchedEmployee = computed(() => logs.value.some(log => log.matchedDeviceEmployeeId !== null))
const hasMatchedUser = computed(() => logs.value.some(log => log.matchedUserId !== null))
const hasMatchedMember = computed(() => logs.value.some(log => log.matchedMemberId !== null))

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, pagination.value.page - Math.floor(maxVisible / 2))
  let end = Math.min(pagination.value.totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Helpers
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

const verifyModeBadge = (mode) => {
  const map = {
    fingerprint: 'badge-primary',
    card: 'badge-secondary',
    face: 'badge-accent',
    password: 'badge-warning',
  }
  return map[mode] || 'badge-ghost'
}

// Lifecycle
onMounted(() => {
  loadLogs()
})

// Methods
const loadLogs = async () => {
  try {
    const params = { ...filters.value }
    if (params.startDate) params.startDate = new Date(params.startDate).toISOString()
    if (params.endDate) params.endDate = new Date(params.endDate).toISOString()
    await fetchLogs(deviceId, params)
  } catch (err) {
    // handled by composable
  }
}

const resetFilters = () => {
  filters.value = { page: 1, limit: 50, startDate: '', endDate: '' }
  loadLogs()
}

const goToPage = (page) => {
  filters.value.page = page
  loadLogs()
}
</script>
