<route lang="yaml">
meta:
  title: Manajemen Sesi
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Sesi Tes</h1>
        <p class="text-base-content/60 mt-1">Kelola sesi tes psikologi</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-4">
            <label class="label">
              <span class="label-text font-medium">Pencarian</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama pasien, jenis tes..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="pending">Belum Dimulai</option>
              <option value="in_progress">Sedang Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="expired">Kadaluarsa</option>
            </select>
          </div>

          <!-- Date From -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Dari Tanggal</span>
            </label>
            <input 
              type="date" 
              v-model="filters.dateFrom" 
              class="input input-bordered w-full"
              @change="handleSearch"
            />
          </div>

          <!-- Date To -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Sampai Tanggal</span>
            </label>
            <input 
              type="date" 
              v-model="filters.dateTo" 
              class="input input-bordered w-full"
              @change="handleSearch"
            />
          </div>

          <!-- Limit -->
          <div class="form-control lg:col-span-1">
            <label class="label">
              <span class="label-text font-medium">Tampil</span>
            </label>
            <select v-model="filters.limit" class="select select-bordered w-full" @change="handleSearch">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>

        <!-- Active Filters Info -->
        <div v-if="hasActiveFilters" class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Filter aktif:</span>
          <div class="flex flex-wrap gap-2">
            <div v-if="filters.search" class="badge badge-primary badge-outline gap-1">
              Cari: "{{ filters.search }}"
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('search')">✕</button>
            </div>
            <div v-if="filters.status" class="badge badge-primary badge-outline gap-1">
              Status: {{ getStatusLabel(filters.status) }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
            </div>
            <div v-if="filters.dateFrom" class="badge badge-primary badge-outline gap-1">
              Dari: {{ filters.dateFrom }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('dateFrom')">✕</button>
            </div>
            <div v-if="filters.dateTo" class="badge badge-primary badge-outline gap-1">
              Sampai: {{ filters.dateTo }}
              <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('dateTo')">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Hapus Semua</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Sessions List -->
        <div v-else-if="sessions?.length > 0">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Pasien</th>
                  <th>Jenis Tes</th>
                  <th>Status</th>
                  <th>Durasi</th>
                  <th>Tanggal</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="session in sessions" :key="session.id">
                  <td>
                    <div class="font-mono text-sm font-medium">{{ session.sessionToken }}</div>
                    <div class="text-xs text-base-content/60">Sesi #{{ session.sessionNumber }}</div>
                  </td>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                        <span class="text-lg font-bold leading-none">{{ session.order?.patient?.fullName?.charAt(0).toUpperCase() || '?' }}</span>
                      </div>
                      <div>
                        <div class="font-bold uppercase">{{ session.order?.patient?.fullName || '-' }}</div>
                        <div class="text-sm text-base-content/60">{{ session.order?.orderNumber }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="font-medium">{{ session.testType?.name }}</div>
                    <div class="text-sm text-base-content/60">{{ session.testType?.code }}</div>
                  </td>
                  <td>
                    <div class="flex items-center gap-1">
                      <div class="badge" :class="getStatusClass(session.status)">
                        {{ getStatusLabel(session.status) }}
                      </div>
                      <div v-if="session.hasScores" class="badge badge-success badge-xs">Skor</div>
                    </div>
                  </td>
                  <td>
                    <div v-if="session.duration" class="text-sm">
                      {{ session.duration }} menit
                    </div>
                    <div v-else-if="session.status === 'in_progress'" class="text-sm text-warning">
                      Sedang berlangsung
                    </div>
                    <div v-else class="text-sm text-base-content/60">-</div>
                  </td>
                  <td>
                    <div class="text-sm">
                      <div v-if="session.startedAt">
                        <span class="text-base-content/60">Mulai:</span> {{ formatDateTime(session.startedAt) }}
                      </div>
                      <div v-if="session.completedAt">
                        <span class="text-base-content/60">Selesai:</span> {{ formatDateTime(session.completedAt) }}
                      </div>
                      <div v-if="session.verifiedAt">
                        <span class="text-success">✓ Terverifikasi</span>
                      </div>
                      <div v-if="!session.startedAt" class="text-base-content/60">
                        Belum dimulai
                      </div>
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <div class="tooltip" data-tip="Detail">
                        <router-link 
                          :to="`/psychology/sessions/${session.id}`"
                          class="btn btn-ghost btn-sm"
                        >
                          <IconEye class="w-4 h-4" />
                        </router-link>
                      </div>
                      <button 
                        v-if="session.hasScores || session.status === 'completed' || session.status === 'verified'"
                        class="btn btn-primary btn-sm"
                        @click="viewResult(session)"
                      >
                        <IconChartBar class="w-4 h-4" />
                        Hasil
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex justify-between items-center mt-6">
            <div class="text-sm text-base-content/60">
              Menampilkan {{ sessions.length }} dari {{ pagination.total }} sesi (Halaman {{ pagination.page }} dari {{ pagination.totalPages }})
            </div>
            <div v-if="pagination.totalPages > 1" class="join">
              <button 
                class="join-item btn btn-sm" 
                :disabled="pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >
                <IconChevronLeft class="w-4 h-4" />
              </button>
              <button 
                v-for="page in visiblePages" 
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': page === pagination.page }"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
              <button 
                class="join-item btn btn-sm" 
                :disabled="pagination.page >= pagination.totalPages"
                @click="changePage(pagination.page + 1)"
              >
                <IconChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <IconClipboardOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold mb-2">Tidak ada sesi</h3>
          <p class="text-base-content/60">Sesi tes akan muncul setelah pesanan dibayar</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconEye,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardOff
} from '@tabler/icons-vue'
import { useSessions } from '@/composables/psychology'
import { useDebounceFn } from '@vueuse/core'
import { getResultRoute } from '@/utils/psychology/testTypeRouting'

const router = useRouter()

const {
  sessions,
  loading,
  pagination,
  fetchSessions,
  getStatusClass,
  getStatusLabel,
  formatDateTime
} = useSessions()

const filters = ref({
  search: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  limit: 10
})

const hasActiveFilters = computed(() => {
  return filters.value.search || 
         filters.value.status || 
         filters.value.dateFrom || 
         filters.value.dateTo
})

const loadSessions = async () => {
  const params = {
    page: pagination.value.page,
    limit: filters.value.limit,
    ...filters.value
  }
  await fetchSessions(params)
}

const handleSearch = () => {
  pagination.value.page = 1
  loadSessions()
}

const debouncedSearch = useDebounceFn(() => {
  handleSearch()
}, 300)

const clearFilter = (filterName) => {
  filters.value[filterName] = ''
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.search = ''
  filters.value.status = ''
  filters.value.dateFrom = ''
  filters.value.dateTo = ''
  handleSearch()
}

const changePage = async (page) => {
  pagination.value.page = page
  await loadSessions()
}

const visiblePages = computed(() => {
  const pages = []
  const total = pagination.value.totalPages
  const current = pagination.value.page
  
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, 5)
    } else if (end === total) {
      start = Math.max(1, total - 4)
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const viewResult = (session) => {
  // Get dynamic route based on test type
  router.push(getResultRoute(session))
}

onMounted(() => {
  loadSessions()
})
</script>
