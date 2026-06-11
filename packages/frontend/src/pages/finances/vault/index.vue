<route lang="yaml">
meta:
  title: Vault / Brankas
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { redirectToAccessDenied } from '@/utils/accessDenied'
import { useAuthStore } from '@/stores/auth'
import { useVault } from '@/composables/finances'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import { useNotification } from '@/composables/core/useNotification'
import {
  collectionStatusClass,
  collectionStatusLabel,
  formatCurrency,
  formatDate,
  formatLocalDate,
  getCollectionStatus,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getRoleName,
} from '@/utils/vault'
import FinanceStatCard from '@/components/finances/FinanceStatCard.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconArrowRight,
  IconBuildingBank,
  IconCalendarStats,
  IconCash,
  IconChecks,
  IconRefresh,
  IconReportMoney,
  IconReceipt,
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const confirmDialog = ref(null)
const { showWarning } = useNotification()

const {
  summary,
  pendingCollectionsPreview,
  collectibles,
  summaryLoading,
  collectiblesLoading,
  actionLoading,
  collectiblePagination,
  fetchSummary,
  fetchCollectibles,
  collectToVault,
} = useVault()

const { locations, fetchLocations } = useRestaurantLocations()

const roleName = computed(() => getRoleName(authStore.user?.role))
const isCashier = computed(() => ['cashier', 'kasir'].includes(roleName.value))

const filters = ref({
  startDate: route.query.startDate || getFirstDayOfMonth(),
  endDate: route.query.endDate || getLastDayOfMonth(),
  locationId: route.query.locationId || '',
  collectibleView: route.query.collectibleView || 'daily',
  collectiblePage: Number(route.query.collectiblePage || 1),
  collectibleLimit: Number(route.query.collectibleLimit || 50),
})

const collectForm = ref({
  mutationDate: formatLocalDate(new Date()),
  notes: '',
})

const selectedCollections = ref({})

const summaryCards = computed(() => [
  {
    title: 'Saldo Vault',
    value: formatCurrency(summary.value?.vaultBalance),
    description: 'gunakan summary API, bukan hitung frontend',
    icon: IconBuildingBank,
    iconColor: 'text-primary',
  },
  {
    title: 'Total Masuk Vault',
    value: formatCurrency(summary.value?.totalIn),
    description: 'seluruh inflow ke vault',
    icon: IconArrowRight,
    iconColor: 'text-success',
  },
  {
    title: 'Total Keluar Vault',
    value: formatCurrency(summary.value?.totalOut),
    description: 'seluruh outflow dari vault',
    icon: IconReportMoney,
    iconColor: 'text-error',
  },
  {
    title: 'Collected Hari Ini',
    value: formatCurrency(summary.value?.todayCollected),
    description: `${summary.value?.pendingSessionCount || 0} shift pending`,
    icon: IconChecks,
    iconColor: 'text-info',
  },
  {
    title: 'Pending Cash Drawer',
    value: formatCurrency(summary.value?.pendingDrawerCash),
    description: 'cash shift belum masuk vault',
    icon: IconCash,
    iconColor: 'text-warning',
  },
])

const groupedDailyItems = computed(() => {
  const daily = collectibles.value.daily?.length ? collectibles.value.daily : pendingCollectionsPreview.value
  return daily.map(item => {
    const sessions = (collectibles.value.sessions || []).filter(session => {
      const sameDate = session.shiftDate === item.shiftDate
      const sessionLocation = session.location?.id || session.location?.name || ''
      const itemLocation = item.location?.id || item.location?.name || ''
      return sameDate && sessionLocation === itemLocation
    })

    return {
      ...item,
      sessions: item.sessions?.length ? item.sessions : sessions,
    }
  })
})

const selectedSessionIds = computed(() => {
  return Object.entries(selectedCollections.value)
    .filter(([, value]) => value.selected)
    .map(([sessionId]) => sessionId)
})

const selectedSessionRows = computed(() => {
  return (collectibles.value.sessions || []).filter(session => selectedSessionIds.value.includes(session.id))
})

const totalSelectedAmount = computed(() => {
  return selectedSessionRows.value.reduce((total, session) => {
    const selected = selectedCollections.value[session.id]
    const manualAmount = Number(selected?.amount || 0)
    return total + (manualAmount > 0 ? manualAmount : Number(session.remainingAmount || 0))
  }, 0)
})

const hasSelectedCollections = computed(() => selectedSessionIds.value.length > 0)

const syncQuery = async () => {
  const query = {
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined,
    locationId: filters.value.locationId || undefined,
    collectibleView: filters.value.collectibleView !== 'daily' ? filters.value.collectibleView : undefined,
    collectiblePage: filters.value.collectiblePage > 1 ? String(filters.value.collectiblePage) : undefined,
    collectibleLimit: filters.value.collectibleLimit !== 50 ? String(filters.value.collectibleLimit) : undefined,
  }

  await router.replace({ query })
}

const ensureSelectionState = () => {
  const nextState = {}
  for (const session of collectibles.value.sessions || []) {
    nextState[session.id] = selectedCollections.value[session.id] || {
      selected: false,
      amount: '',
      notes: '',
    }
  }
  selectedCollections.value = nextState
}

const loadVaultData = async () => {
  await syncQuery()

  const summaryFilters = {
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    locationId: filters.value.locationId,
  }
  const collectibleFilters = {
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    locationId: filters.value.locationId,
    page: filters.value.collectiblePage,
    limit: filters.value.collectibleLimit,
  }

  await Promise.all([
    fetchSummary(summaryFilters),
    fetchCollectibles(collectibleFilters),
  ])

  ensureSelectionState()
}

const handleCollectibleSearch = async () => {
  filters.value.collectiblePage = 1
  await loadVaultData()
}

const handleCollectibleViewChange = async (view) => {
  filters.value.collectibleView = view
  await syncQuery()
}

const handleCollectiblePageChange = async (page) => {
  filters.value.collectiblePage = page
  await loadVaultData()
}

const resetFilters = async () => {
  filters.value = {
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    locationId: '',
    collectibleView: 'daily',
    collectiblePage: 1,
    collectibleLimit: 50,
  }
  await loadVaultData()
}

const goToMutations = () => {
  router.push({
    path: '/finances/vault/mutations',
    query: {
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
      locationId: filters.value.locationId || undefined,
    },
  })
}

const isSessionCollectDisabled = (session) => {
  const status = getCollectionStatus(session)
  return status === 'collected' || status === 'no_cash_transaction' || Number(session.remainingAmount || 0) <= 0
}

const toggleSession = (session, checked) => {
  if (isSessionCollectDisabled(session)) return
  selectedCollections.value[session.id] = {
    ...selectedCollections.value[session.id],
    selected: checked,
  }
}

const updateSelectedAmount = (sessionId, amount) => {
  selectedCollections.value[sessionId] = {
    ...selectedCollections.value[sessionId],
    amount,
  }
}

const updateSelectedNotes = (sessionId, notes) => {
  selectedCollections.value[sessionId] = {
    ...selectedCollections.value[sessionId],
    notes,
  }
}

const validateCollections = () => {
  for (const session of selectedSessionRows.value) {
    const selected = selectedCollections.value[session.id]
    const manualAmount = Number(selected?.amount || 0)
    const remainingAmount = Number(session.remainingAmount || 0)

    if (manualAmount < 0) {
      showWarning('Amount collect tidak boleh negatif')
      return false
    }

    if (manualAmount > remainingAmount) {
      showWarning(`Amount collect untuk shift ${session.shiftName || '-'} melebihi sisa collectible`)
      return false
    }
  }

  return true
}

const submitCollect = async () => {
  if (!hasSelectedCollections.value) {
    showWarning('Pilih minimal satu shift session untuk di-collect')
    return
  }

  if (!collectForm.value.mutationDate) {
    showWarning('Tanggal collect wajib diisi')
    return
  }

  if (!validateCollections()) return

  const confirmed = await confirmDialog.value?.open({
    title: 'Collect Cash Drawer ke Vault',
    message: `Simpan collect untuk ${selectedSessionIds.value.length} shift dengan total ${formatCurrency(totalSelectedAmount.value)}?`,
    confirmText: 'Simpan',
    type: 'info',
  })

  if (!confirmed) return

  const payload = {
    mutationDate: collectForm.value.mutationDate,
    notes: collectForm.value.notes || undefined,
    collections: selectedSessionRows.value.map(session => {
      const selected = selectedCollections.value[session.id]
      const item = {
        sessionId: session.id,
      }
      const manualAmount = Number(selected?.amount || 0)
      if (manualAmount > 0) item.amount = manualAmount
      if (selected?.notes?.trim()) item.notes = selected.notes.trim()
      return item
    }),
  }

  await collectToVault(payload)

  selectedCollections.value = {}
  collectForm.value.notes = ''
  await loadVaultData()
}

onMounted(async () => {
  if (isCashier.value) {
    redirectToAccessDenied({ from: route.fullPath, reason: 'permission' })
    return
  }

  await Promise.all([
    fetchLocations({ isActive: true, limit: 200 }).catch(() => null),
    loadVaultData(),
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl space-y-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Vault / Brankas</h1>
        <p class="text-base-content/60 mt-1">Pantau saldo vault dan cash drawer yang belum diambil. Riwayat mutasi tersedia di halaman terpisah.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" @click="goToMutations">
          <IconReceipt class="w-4 h-4" />
          Lihat Mutasi
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="summaryLoading || collectiblesLoading" @click="loadVaultData">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': summaryLoading || collectiblesLoading }" />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <FinanceStatCard
        v-for="card in summaryCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :icon="card.icon"
        :icon-color="card.iconColor"
        :loading="summaryLoading"
      />
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body gap-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 class="card-title">Pending Collections</h2>
            <p class="text-sm text-base-content/60">Dua tampilan tersedia: ringkasan per hari dan detail per shift session.</p>
          </div>
          <div class="tabs tabs-boxed bg-base-200 p-1 w-fit">
            <button
              class="tab"
              :class="{ 'tab-active': filters.collectibleView === 'daily' }"
              @click="handleCollectibleViewChange('daily')"
            >
              Group by Tanggal
            </button>
            <button
              class="tab"
              :class="{ 'tab-active': filters.collectibleView === 'sessions' }"
              @click="handleCollectibleViewChange('sessions')"
            >
              Detail Shift
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tanggal Mulai</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered w-full" @change="handleCollectibleSearch" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tanggal Akhir</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered w-full" @change="handleCollectibleSearch" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Lokasi</span></label>
            <select v-model="filters.locationId" class="select select-bordered w-full" @change="handleCollectibleSearch">
              <option value="">Semua Lokasi</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Aksi</span></label>
            <button class="btn btn-ghost justify-start" @click="resetFilters">Reset Filter</button>
          </div>
        </div>

        <div class="flex justify-end">
          <div class="form-control w-full md:w-56">
            <label class="label"><span class="label-text font-medium">Collectible Per Halaman</span></label>
            <select v-model="filters.collectibleLimit" class="select select-bordered w-full" @change="handleCollectiblePageChange(1)">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <div v-if="hasSelectedCollections" class="card bg-base-200 border border-base-300">
          <div class="card-body gap-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold">Form Collect</h3>
                <p class="text-sm text-base-content/60">{{ selectedSessionIds.length }} shift dipilih dengan estimasi {{ formatCurrency(totalSelectedAmount) }}.</p>
              </div>
              <button class="btn btn-primary" :disabled="actionLoading" @click="submitCollect">
                <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
                <span v-else>Simpan Collect</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Tanggal Mutasi</span></label>
                <input v-model="collectForm.mutationDate" type="date" class="input input-bordered w-full" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text font-medium">Catatan Global</span></label>
                <input v-model="collectForm.notes" type="text" class="input input-bordered w-full" placeholder="Contoh: Pengambilan kas sore oleh admin" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="collectiblesLoading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="filters.collectibleView === 'daily'" class="space-y-4">
          <div v-if="!groupedDailyItems.length" class="alert">
            <IconCalendarStats class="w-5 h-5" />
            <span>Tidak ada cash drawer pending pada periode ini.</span>
          </div>

          <div v-for="item in groupedDailyItems" :key="`${item.shiftDate}-${item.location?.id || item.location?.name}`" class="card bg-base-100 border border-base-300">
            <div class="card-body gap-4">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-semibold text-lg">{{ formatDate(item.shiftDate) }}</h3>
                    <span class="badge" :class="collectionStatusClass(getCollectionStatus(item))">
                      {{ collectionStatusLabel(getCollectionStatus(item)) }}
                    </span>
                  </div>
                  <p class="text-sm text-base-content/60 mt-1">{{ item.location?.name || 'Tanpa lokasi' }} · {{ item.sessionCount || item.sessions?.length || 0 }} shift</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Collectible</div>
                    <div class="font-semibold">{{ formatCurrency(item.collectibleBase) }}</div>
                  </div>
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Sudah Diambil</div>
                    <div class="font-semibold text-info">{{ formatCurrency(item.collectedAmount) }}</div>
                  </div>
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Sisa</div>
                    <div class="font-semibold text-warning">{{ formatCurrency(item.remainingAmount) }}</div>
                  </div>
                </div>
              </div>

              <div v-if="item.sessions?.length" class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Pilih</th>
                      <th>Shift</th>
                      <th>Closing / Actual</th>
                      <th>Sudah Diambil</th>
                      <th>Sisa</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="session in item.sessions" :key="session.id">
                      <td>
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          :checked="selectedCollections[session.id]?.selected || false"
                          :disabled="isSessionCollectDisabled(session)"
                          @change="toggleSession(session, $event.target.checked)"
                        />
                      </td>
                      <td>
                        <div class="font-medium">Shift {{ session.shiftNumber || '-' }} · {{ session.shiftName || '-' }}</div>
                      </td>
                      <td>{{ formatCurrency(session.actualCash || session.closingBalance || session.collectibleBase) }}</td>
                      <td>{{ formatCurrency(session.collectedAmount) }}</td>
                      <td>
                        <div class="font-semibold text-warning">{{ formatCurrency(session.remainingAmount) }}</div>
                        <div v-if="getCollectionStatus(session) === 'partially_collected'" class="text-xs text-base-content/50">Masih tersisa collectible</div>
                      </td>
                      <td>
                        <span class="badge badge-sm" :class="collectionStatusClass(getCollectionStatus(session))">
                          {{ collectionStatusLabel(getCollectionStatus(session)) }}
                        </span>
                      </td>
                      <td class="min-w-40">
                        <CurrencyInput
                          :model-value="selectedCollections[session.id]?.amount || ''"
                          :disabled="!selectedCollections[session.id]?.selected || isSessionCollectDisabled(session)"
                          input-class="input input-bordered input-sm w-full"
                          placeholder="Kosong = ambil penuh"
                          @update:model-value="updateSelectedAmount(session.id, $event)"
                        />
                      </td>
                      <td class="min-w-48">
                        <input
                          :value="selectedCollections[session.id]?.notes || ''"
                          type="text"
                          class="input input-bordered input-sm w-full"
                          :disabled="!selectedCollections[session.id]?.selected || isSessionCollectDisabled(session)"
                          placeholder="Catatan per shift"
                          @input="updateSelectedNotes(session.id, $event.target.value)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Pilih</th>
                <th>Tanggal</th>
                <th>Lokasi</th>
                <th>Shift</th>
                <th>Closing / Actual</th>
                <th>Sudah Diambil</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!collectibles.sessions?.length">
                <td colspan="10" class="text-center py-8 text-base-content/50">Tidak ada shift session yang pending.</td>
              </tr>
              <tr v-for="session in collectibles.sessions" :key="session.id">
                <td>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="selectedCollections[session.id]?.selected || false"
                    :disabled="isSessionCollectDisabled(session)"
                    @change="toggleSession(session, $event.target.checked)"
                  />
                </td>
                <td>{{ formatDate(session.shiftDate) }}</td>
                <td>{{ session.location?.name || '-' }}</td>
                <td>
                  <div class="font-medium">Shift {{ session.shiftNumber || '-' }}</div>
                  <div class="text-xs text-base-content/60">{{ session.shiftName || '-' }}</div>
                </td>
                <td>{{ formatCurrency(session.actualCash || session.closingBalance || session.collectibleBase) }}</td>
                <td>{{ formatCurrency(session.collectedAmount) }}</td>
                <td>
                  <div class="font-semibold text-warning">{{ formatCurrency(session.remainingAmount) }}</div>
                  <div v-if="getCollectionStatus(session) === 'partially_collected'" class="text-xs text-base-content/50">Masih tersisa collectible</div>
                </td>
                <td>
                  <span class="badge badge-sm" :class="collectionStatusClass(getCollectionStatus(session))">
                    {{ collectionStatusLabel(getCollectionStatus(session)) }}
                  </span>
                </td>
                <td class="min-w-40">
                  <CurrencyInput
                    :model-value="selectedCollections[session.id]?.amount || ''"
                    :disabled="!selectedCollections[session.id]?.selected || isSessionCollectDisabled(session)"
                    input-class="input input-bordered input-sm w-full"
                    placeholder="Kosong = ambil penuh"
                    @update:model-value="updateSelectedAmount(session.id, $event)"
                  />
                </td>
                <td class="min-w-48">
                  <input
                    :value="selectedCollections[session.id]?.notes || ''"
                    type="text"
                    class="input input-bordered input-sm w-full"
                    :disabled="!selectedCollections[session.id]?.selected || isSessionCollectDisabled(session)"
                    placeholder="Catatan per shift"
                    @input="updateSelectedNotes(session.id, $event.target.value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="collectiblePagination.totalPages > 1" class="flex justify-center">
          <div class="join">
            <button
              v-for="page in collectiblePagination.totalPages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === collectiblePagination.page }"
              @click="handleCollectiblePageChange(page)"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <DialogConfirm ref="confirmDialog" />
  </div>
</template>