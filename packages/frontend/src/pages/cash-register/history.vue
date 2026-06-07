<route lang="yaml">
meta:
  title: Cash Register History
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCashRegister } from '@/composables/gym/cash-register'
import { useCurrency } from '@/composables/core/useCurrency'
import dayjs from 'dayjs'
import {
  IconArrowLeft,
  IconCashRegister,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconEye,
  IconFileReport,
  IconCalendar,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconX
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { sessions, pagination, loading, session, sessionSummary, fetchSessions, getSessionById } = useCashRegister()
const { formatCurrency } = useCurrency()

// Filters
const filters = ref({
  status: '',
  dateFrom: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
  dateTo: dayjs().format('YYYY-MM-DD'),
  page: 1,
  limit: 20
})

// Detail modal
const showDetail = ref(false)
const detailLoading = ref(false)

const getDiffClass = (diff) => {
  const n = parseFloat(diff)
  if (n === 0 || isNaN(n)) return ''
  return n > 0 ? 'text-info' : 'text-error'
}

const getDiffBadge = (status) => {
  const map = { balance: 'badge-success', surplus: 'badge-info', deficit: 'badge-error' }
  return map[status] || 'badge-ghost'
}

const loadSessions = async () => {
  await fetchSessions({
    ...filters.value,
    status: filters.value.status || undefined
  })
}

const applyFilters = () => {
  filters.value.page = 1
  loadSessions()
}

const resetFilters = () => {
  filters.value = {
    status: '',
    dateFrom: dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dateTo: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 20
  }
  loadSessions()
}

const changePage = (page) => {
  filters.value.page = page
  loadSessions()
}

const viewDetail = async (id) => {
  detailLoading.value = true
  showDetail.value = true
  try {
    await getSessionById(id)
  } catch {
    // handled by composable
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetail.value = false
}

onMounted(() => {
  // If query param ?session=xxx, open detail
  const sessionId = route.query.session
  if (sessionId) viewDetail(sessionId)
  loadSessions()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <IconCashRegister class="w-7 h-7 text-primary" />
          Riwayat Shift
        </h1>
        <p class="text-sm text-base-content/60 mt-1">Histori semua cash register session</p>
      </div>
      <router-link to="/cash-register" class="btn btn-ghost btn-sm">
        <IconArrowLeft class="w-4 h-4 mr-1" />
        Kembali
      </router-link>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 border border-base-200 shadow-sm mb-6">
      <div class="card-body py-4 px-5">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Filter icon + label -->
          <div class="flex items-center gap-1.5 text-base-content/60 mr-1">
            <IconFilter class="w-4 h-4" />
            <span class="font-semibold text-sm">Filter</span>
          </div>

          <!-- Status -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/60 whitespace-nowrap">Status</span>
            <select class="select select-bordered select-sm min-w-[130px]" v-model="filters.status">
              <option value="">Semua</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <!-- Divider -->
          <div class="hidden sm:block w-px h-8 bg-base-300"></div>

          <!-- Dari Tanggal -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/60 whitespace-nowrap">Dari Tanggal</span>
            <input type="date" class="input input-bordered input-sm w-36" v-model="filters.dateFrom" />
          </div>

          <!-- Sampai Tanggal -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/60 whitespace-nowrap">Sampai Tanggal</span>
            <input type="date" class="input input-bordered input-sm w-36" v-model="filters.dateTo" />
          </div>

          <!-- Divider -->
          <div class="hidden sm:block w-px h-8 bg-base-300"></div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <button class="btn btn-primary btn-sm gap-1.5" @click="applyFilters">
              <IconSearch class="w-3.5 h-3.5" />
              Cari
            </button>
            <button class="btn btn-ghost btn-sm gap-1.5" @click="resetFilters">
              <IconRefresh class="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card bg-base-100 border border-base-200 shadow-sm">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr class="bg-base-200/50">
                <th>Tanggal</th>
                <th>Shift</th>
                <th>Kasir</th>
                <th>Dibuka</th>
                <th>Ditutup</th>
                <th class="text-right">Modal</th>
                <th class="text-right">Kas Aktual</th>
                <th class="text-right">Selisih</th>
                <th>Status</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="10" class="text-center py-10">
                  <span class="loading loading-spinner loading-md"></span>
                </td>
              </tr>
              <tr v-else-if="sessions.length === 0">
                <td colspan="10" class="text-center text-base-content/40 py-10">
                  <IconCashRegister class="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Tidak ada data shift</p>
                </td>
              </tr>
              <tr v-for="s in sessions" :key="s.id" class="hover">
                <td class="font-medium text-sm">{{ dayjs(s.shiftDate || s.openedAt).format('DD MMM YYYY') }}</td>
                <td><span class="capitalize">{{ s.shiftName }}</span></td>
                <td class="text-sm">{{ s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : '-' }}</td>
                <td class="text-sm">{{ dayjs(s.openedAt).format('HH:mm') }}</td>
                <td class="text-sm">
                  <template v-if="s.closedAt">{{ dayjs(s.closedAt).format('HH:mm') }}</template>
                  <span v-else class="text-base-content/30">—</span>
                </td>
                <td class="text-right text-sm">{{ formatCurrency(s.openingBalance) }}</td>
                <td class="text-right text-sm">
                  <template v-if="s.actualCash != null">{{ formatCurrency(s.actualCash) }}</template>
                  <span v-else class="text-base-content/30">—</span>
                </td>
                <td class="text-right text-sm font-medium" :class="getDiffClass(s.difference)">
                  <template v-if="s.difference != null">
                    {{ parseFloat(s.difference) >= 0 ? '+' : '' }}{{ formatCurrency(s.difference) }}
                  </template>
                  <span v-else class="text-base-content/30">—</span>
                </td>
                <td>
                  <span class="badge badge-sm" :class="s.status === 'open' ? 'badge-success' : 'badge-ghost'">
                    {{ s.status }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex gap-1 justify-end">
                    <button class="btn btn-ghost btn-xs" @click="viewDetail(s.id)" title="Detail">
                      <IconEye class="w-3.5 h-3.5" />
                    </button>
                    <button class="btn btn-ghost btn-xs" @click="router.push(`/cash-register/${s.id}/report`)" title="Lihat Report">
                      <IconFileReport class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-between items-center px-4 py-3 border-t border-base-200">
          <span class="text-sm text-base-content/60">Total {{ pagination.total }} sesi</span>
          <div class="join">
            <button class="join-item btn btn-sm" :disabled="filters.page <= 1" @click="changePage(filters.page - 1)">«</button>
            <button class="join-item btn btn-sm btn-disabled">{{ filters.page }} / {{ pagination.totalPages }}</button>
            <button class="join-item btn btn-sm" :disabled="filters.page >= pagination.totalPages" @click="changePage(filters.page + 1)">»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Detail Modal ═══ -->
    <Teleport to="body">
      <dialog :class="['modal', showDetail && 'modal-open']">
        <div class="modal-box max-w-lg">
          <button class="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" @click="closeDetail">
            <IconX class="w-4 h-4" />
          </button>

          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <IconCashRegister class="w-5 h-5 text-primary" />
            Detail Shift
          </h3>

          <div v-if="detailLoading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <div v-else-if="session" class="space-y-4">
            <!-- Info -->
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-base-content/50 text-xs">Shift</span>
                <div class="font-semibold capitalize">{{ session.shiftName }}</div>
              </div>
              <div>
                <span class="text-base-content/50 text-xs">Status</span>
                <div>
                  <span class="badge badge-sm" :class="session.status === 'open' ? 'badge-success' : 'badge-ghost'">{{ session.status }}</span>
                </div>
              </div>
              <div>
                <span class="text-base-content/50 text-xs">Tanggal</span>
                <div class="font-medium">{{ dayjs(session.shiftDate || session.openedAt).format('DD MMM YYYY') }}</div>
              </div>
              <div>
                <span class="text-base-content/50 text-xs">Shift ke-</span>
                <div class="font-medium">{{ session.shiftNumber || '-' }}</div>
              </div>
              <div>
                <span class="text-base-content/50 text-xs">Dibuka</span>
                <div class="font-medium">{{ dayjs(session.openedAt).format('HH:mm') }} <span class="text-base-content/50">{{ session.openedBy ? `${session.openedBy.firstName} ${session.openedBy.lastName}` : '' }}</span></div>
              </div>
              <div>
                <span class="text-base-content/50 text-xs">Ditutup</span>
                <div class="font-medium" v-if="session.closedAt">{{ dayjs(session.closedAt).format('HH:mm') }} <span class="text-base-content/50">{{ session.closedBy ? `${session.closedBy.firstName} ${session.closedBy.lastName}` : '' }}</span></div>
                <div v-else class="text-base-content/30">—</div>
              </div>
            </div>

            <!-- Summary -->
            <div v-if="sessionSummary" class="bg-base-200 rounded-lg p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/60">Modal awal</span>
                <span class="font-medium">{{ formatCurrency(sessionSummary.openingBalance) }}</span>
              </div>
              <div v-if="sessionSummary.cashIn != null" class="flex justify-between">
                <span class="text-base-content/60">Kas masuk</span>
                <span class="font-medium text-success">{{ formatCurrency(sessionSummary.cashIn) }}</span>
              </div>
              <div v-if="sessionSummary.cashOut != null" class="flex justify-between">
                <span class="text-base-content/60">Kas keluar</span>
                <span class="font-medium text-error">{{ formatCurrency(sessionSummary.cashOut) }}</span>
              </div>
              <div class="divider my-1"></div>
              <div class="flex justify-between font-bold">
                <span>Kas diharapkan</span>
                <span class="text-primary">{{ formatCurrency(sessionSummary.expectedCash ?? sessionSummary.closingBalance ?? 0) }}</span>
              </div>
              <template v-if="sessionSummary.actualCash != null">
                <div class="flex justify-between font-bold">
                  <span>Kas aktual</span>
                  <span>{{ formatCurrency(sessionSummary.actualCash) }}</span>
                </div>
                <div class="divider my-1"></div>
                <div class="flex justify-between font-bold">
                  <span>Selisih</span>
                  <span :class="getDiffClass(sessionSummary.difference)">
                    {{ parseFloat(sessionSummary.difference) >= 0 ? '+' : '' }}{{ formatCurrency(sessionSummary.difference) }}
                    <span class="badge badge-sm ml-1" :class="getDiffBadge(sessionSummary.status)">{{ sessionSummary.status }}</span>
                  </span>
                </div>
              </template>
            </div>

            <!-- Notes -->
            <div v-if="session.openingNotes || session.closingNotes" class="space-y-2 text-sm">
              <div v-if="session.openingNotes">
                <span class="text-base-content/50 text-xs">Catatan Pembukaan</span>
                <p>{{ session.openingNotes }}</p>
              </div>
              <div v-if="session.closingNotes">
                <span class="text-base-content/50 text-xs">Catatan Penutupan</span>
                <p>{{ session.closingNotes }}</p>
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button class="btn btn-ghost" @click="closeDetail">Tutup</button>
            <button
              v-if="session"
              class="btn btn-primary btn-sm gap-1"
              @click="closeDetail(); router.push(`/cash-register/${session.id}/report`)">
              <IconFileReport class="w-4 h-4" />
              Lihat Report
            </button>
          </div>
        </div>
        <div class="modal-backdrop" @click="closeDetail"></div>
      </dialog>
    </Teleport>
  </div>
</template>
