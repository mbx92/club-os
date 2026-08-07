<route lang="yaml">
meta:
  title: Drawer
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  getCollectionProgress,
  getCollectionStatus,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getRoleName,
  getStartOfWeek,
} from '@/utils/vault'
import FinanceStatCard from '@/components/finances/FinanceStatCard.vue'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import {
  IconCalendarStats,
  IconCash,
  IconChecks,
  IconChevronDown,
  IconFilter,
  IconReceipt,
  IconRefresh,
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const confirmDialog = ref(null)
const { showWarning } = useNotification()

const {
  summary,
  vaultAccounts,
  pendingCollectionsPreview,
  collectibles,
  summaryLoading,
  collectiblesLoading,
  actionLoading,
  collectiblePagination,
  fetchSummary,
  fetchCollectibles,
  collectToVault,
  fetchVaultAccounts,
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
  statusFilter: route.query.statusFilter || 'all',
})

const collectForm = ref({
  mutationDate: formatLocalDate(new Date()),
  notes: '',
  vaultAccountId: '',
  showDetails: true,
})

const selectedCollections = ref({})
const expandedGroups = ref({})

const periodPreset = computed(() => {
  const today = formatLocalDate(new Date())
  const weekStart = getStartOfWeek()
  const monthStart = getFirstDayOfMonth()
  const monthEnd = getLastDayOfMonth()

  if (filters.value.startDate === today && filters.value.endDate === today) return 'today'
  if (filters.value.startDate === weekStart && filters.value.endDate === today) return 'week'
  if (filters.value.startDate === monthStart && filters.value.endDate === monthEnd) return 'month'
  return 'custom'
})

const periodLabel = computed(() => {
  if (periodPreset.value === 'today') return 'hari ini'
  if (periodPreset.value === 'week') return 'minggu ini'
  if (periodPreset.value === 'month') return 'bulan ini'
  return `${formatDate(filters.value.startDate)} – ${formatDate(filters.value.endDate)}`
})

const summaryCards = computed(() => [
  {
    title: 'Belum Di-collect',
    value: formatCurrency(summary.value?.pendingDrawerCash),
    description: `${summary.value?.pendingSessionCount || 0} shift pending`,
    icon: IconCash,
    iconColor: 'text-warning',
  },
  {
    title: 'Sudah Di-collect',
    value: formatCurrency(summary.value?.periodCollected),
    description: `Periode ${periodLabel.value}`,
    icon: IconChecks,
    iconColor: 'text-success',
  },
])

const statusChips = [
  { value: 'all', label: 'Semua' },
  { value: 'uncollected', label: 'Belum Diambil' },
  { value: 'partially_collected', label: 'Diambil Sebagian' },
  { value: 'collected', label: 'Sudah Diambil' },
]

const matchesStatusFilter = (item) => {
  if (filters.value.statusFilter === 'all') return true
  return getCollectionStatus(item) === filters.value.statusFilter
}

const groupedDailyItems = computed(() => {
  const daily = collectibles.value.daily?.length ? collectibles.value.daily : pendingCollectionsPreview.value
  return daily
    .map(item => {
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
    .filter(matchesStatusFilter)
})

const filteredSessions = computed(() => {
  return (collectibles.value.sessions || []).filter(matchesStatusFilter)
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

const groupKey = (item) => `${item.shiftDate}-${item.location?.id || item.location?.name || 'none'}`

const isGroupExpanded = (item) => {
  const key = groupKey(item)
  if (expandedGroups.value[key] !== undefined) return expandedGroups.value[key]
  return Number(item.remainingAmount || 0) > 0
}

const toggleGroup = (item) => {
  const key = groupKey(item)
  expandedGroups.value[key] = !isGroupExpanded(item)
}

const syncQuery = async () => {
  const query = {
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined,
    locationId: filters.value.locationId || undefined,
    collectibleView: filters.value.collectibleView !== 'daily' ? filters.value.collectibleView : undefined,
    collectiblePage: filters.value.collectiblePage > 1 ? String(filters.value.collectiblePage) : undefined,
    collectibleLimit: filters.value.collectibleLimit !== 50 ? String(filters.value.collectibleLimit) : undefined,
    statusFilter: filters.value.statusFilter !== 'all' ? filters.value.statusFilter : undefined,
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

const applyPeriodPreset = async (preset) => {
  const today = formatLocalDate(new Date())

  if (preset === 'today') {
    filters.value.startDate = today
    filters.value.endDate = today
  } else if (preset === 'week') {
    filters.value.startDate = getStartOfWeek()
    filters.value.endDate = today
  } else if (preset === 'month') {
    filters.value.startDate = getFirstDayOfMonth()
    filters.value.endDate = getLastDayOfMonth()
  }

  await handleCollectibleSearch()
}

const handleStatusFilterChange = async (status) => {
  filters.value.statusFilter = status
  await syncQuery()
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
    statusFilter: 'all',
  }
  expandedGroups.value = {}
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

const expenseStatusClass = (status) => {
  if (status === 'paid') return 'badge-success'
  if (status === 'approved') return 'badge-info'
  if (status === 'pending') return 'badge-warning'
  return 'badge-ghost'
}

const expenseStatusLabel = (status) => {
  if (status === 'paid') return 'Paid'
  if (status === 'approved') return 'Approved'
  if (status === 'pending') return 'Pending'
  return status || '-'
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

const clearSelection = () => {
  for (const sessionId of Object.keys(selectedCollections.value)) {
    selectedCollections.value[sessionId] = {
      ...selectedCollections.value[sessionId],
      selected: false,
      amount: '',
      notes: '',
    }
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
    title: 'Collect ke Drawer',
    message: `Simpan collect untuk ${selectedSessionIds.value.length} shift dengan total ${formatCurrency(totalSelectedAmount.value)}?`,
    confirmText: 'Simpan',
    type: 'info',
  })

  if (!confirmed) return

  const payload = {
    mutationDate: collectForm.value.mutationDate,
    notes: collectForm.value.notes || undefined,
    vaultAccountId: collectForm.value.vaultAccountId || undefined,
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
  collectForm.value.vaultAccountId = ''
  await loadVaultData()
}

watch(hasSelectedCollections, (hasSelection) => {
  if (hasSelection) collectForm.value.showDetails = true
})

onMounted(async () => {
  if (isCashier.value) {
    redirectToAccessDenied({ from: route.fullPath, reason: 'permission' })
    return
  }

  await Promise.all([
    fetchLocations({ isActive: true, limit: 200 }).catch(() => null),
    fetchVaultAccounts().catch(() => null),
    loadVaultData(),
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl space-y-6" :class="{ 'pb-28': hasSelectedCollections }">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Drawer</h1>
        <p class="text-base-content/60 mt-1">Pantau cash yang belum dan sudah di-collect dari laci kasir.</p>
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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <h2 class="card-title">Collections</h2>
            <p class="text-sm text-base-content/60">Filter cepat, status chip, dan detail shift yang bisa di-expand.</p>
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

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-base-content/60 flex items-center gap-1 mr-1">
            <IconFilter class="w-4 h-4" />
            Periode
          </span>
          <button
            class="btn btn-sm"
            :class="periodPreset === 'today' ? 'btn-primary' : 'btn-ghost'"
            @click="applyPeriodPreset('today')"
          >
            Hari Ini
          </button>
          <button
            class="btn btn-sm"
            :class="periodPreset === 'week' ? 'btn-primary' : 'btn-ghost'"
            @click="applyPeriodPreset('week')"
          >
            Minggu Ini
          </button>
          <button
            class="btn btn-sm"
            :class="periodPreset === 'month' ? 'btn-primary' : 'btn-ghost'"
            @click="applyPeriodPreset('month')"
          >
            Bulan Ini
          </button>
          <span
            v-if="periodPreset === 'custom'"
            class="badge badge-outline badge-sm"
          >
            Custom
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium text-xs">Tanggal Mulai</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered input-sm w-full" @change="handleCollectibleSearch" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium text-xs">Tanggal Akhir</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered input-sm w-full" @change="handleCollectibleSearch" />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium text-xs">Lokasi</span></label>
            <select v-model="filters.locationId" class="select select-bordered select-sm w-full" @change="handleCollectibleSearch">
              <option value="">Semua Lokasi</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium text-xs">Per Halaman</span></label>
            <div class="flex gap-2">
              <select v-model="filters.collectibleLimit" class="select select-bordered select-sm w-full" @change="handleCollectiblePageChange(1)">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <button class="btn btn-ghost btn-sm" @click="resetFilters">Reset</button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-base-content/60 mr-1">Status</span>
          <button
            v-for="chip in statusChips"
            :key="chip.value"
            class="btn btn-sm"
            :class="filters.statusFilter === chip.value ? 'btn-secondary' : 'btn-outline'"
            @click="handleStatusFilterChange(chip.value)"
          >
            {{ chip.label }}
          </button>
        </div>

        <div v-if="hasSelectedCollections" class="card bg-primary/5 border border-primary/20">
          <div class="card-body gap-4 py-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <button class="flex items-center gap-2 text-left" @click="collectForm.showDetails = !collectForm.showDetails">
                <IconChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': !collectForm.showDetails }" />
                <div>
                  <h3 class="font-semibold">Form Collect</h3>
                  <p class="text-sm text-base-content/60">{{ selectedSessionIds.length }} shift · {{ formatCurrency(totalSelectedAmount) }}</p>
                </div>
              </button>
              <button class="btn btn-primary btn-sm" :disabled="actionLoading" @click="submitCollect">
                <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
                <span v-else>Simpan Collect</span>
              </button>
            </div>

            <div v-show="collectForm.showDetails" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label py-1"><span class="label-text font-medium text-xs">Tanggal Mutasi</span></label>
                <input v-model="collectForm.mutationDate" type="date" class="input input-bordered input-sm w-full" />
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text font-medium text-xs">Catatan Global</span></label>
                <input v-model="collectForm.notes" type="text" class="input input-bordered input-sm w-full" placeholder="Contoh: Pengambilan kas sore" />
              </div>
              <div class="form-control">
                <label class="label py-1"><span class="label-text font-medium text-xs">Tujuan Account</span></label>
                <select v-model="collectForm.vaultAccountId" class="select select-bordered select-sm w-full">
                  <option value="">Default (Kas)</option>
                  <option v-for="account in vaultAccounts" :key="account.id" :value="account.id">
                    {{ account.name }} ({{ account.accountType }}) - {{ formatCurrency(account.balance) }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div v-if="collectiblesLoading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="filters.collectibleView === 'daily'" class="space-y-3">
          <div v-if="!groupedDailyItems.length" class="alert">
            <IconCalendarStats class="w-5 h-5" />
            <span>Tidak ada data collectible pada filter ini.</span>
          </div>

          <div
            v-for="item in groupedDailyItems"
            :key="groupKey(item)"
            class="card bg-base-100 border border-base-300 overflow-hidden"
          >
            <button
              type="button"
              class="w-full text-left px-4 py-4 hover:bg-base-200/50 transition-colors"
              @click="toggleGroup(item)"
            >
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="flex items-start gap-3">
                  <IconChevronDown
                    class="w-5 h-5 mt-1 shrink-0 transition-transform"
                    :class="{ '-rotate-90': !isGroupExpanded(item) }"
                  />
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-semibold text-lg">{{ formatDate(item.shiftDate) }}</h3>
                      <span class="badge" :class="collectionStatusClass(getCollectionStatus(item))">
                        {{ collectionStatusLabel(getCollectionStatus(item)) }}
                      </span>
                    </div>
                    <p class="text-sm text-base-content/60 mt-1">
                      {{ item.location?.name || 'Tanpa lokasi' }} · {{ item.sessionCount || item.sessions?.length || 0 }} shift
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm min-w-0 lg:min-w-[28rem]">
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Collectible</div>
                    <div class="font-semibold">{{ formatCurrency(item.collectibleBase) }}</div>
                  </div>
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Sudah Diambil</div>
                    <div class="font-semibold text-success">{{ formatCurrency(item.collectedAmount) }}</div>
                  </div>
                  <div class="rounded-lg bg-base-200 px-3 py-2">
                    <div class="text-base-content/50">Sisa</div>
                    <div class="font-semibold text-warning">{{ formatCurrency(item.remainingAmount) }}</div>
                  </div>
                </div>
              </div>

              <div
                v-if="(item.drawerExpenseTotal || 0) > 0 || (item.pendingDrawerExpenseTotal || 0) > 0"
                class="mt-2 pl-8 text-xs text-base-content/60"
              >
                Pengeluaran laci:
                <span class="font-medium text-base-content">{{ formatCurrency(item.drawerExpenseTotal || 0) }} paid</span>
                <span v-if="(item.pendingDrawerExpenseTotal || 0) > 0">
                  · <span class="font-medium text-warning">{{ formatCurrency(item.pendingDrawerExpenseTotal) }} pending</span>
                </span>
              </div>

              <div class="mt-3 pl-8">
                <div class="flex items-center justify-between text-xs text-base-content/60 mb-1">
                  <span>Progress collect</span>
                  <span>{{ getCollectionProgress(item) }}%</span>
                </div>
                <progress
                  class="progress progress-success w-full h-2"
                  :value="getCollectionProgress(item)"
                  max="100"
                />
              </div>
            </button>

            <div v-if="isGroupExpanded(item) && item.sessions?.length" class="border-t border-base-300 px-4 pb-4 overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Pilih</th>
                    <th>Shift</th>
                    <th>Closing / Actual</th>
                    <th>Sudah Diambil</th>
                    <th>Sisa</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="session in item.sessions" :key="session.id">
                    <tr class="hover">
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
                        <div
                          v-if="(session.drawerExpenseTotal || 0) > 0 || (session.pendingDrawerExpenseTotal || 0) > 0"
                          class="text-xs text-base-content/60 mt-0.5"
                        >
                          Expense laci {{ formatCurrency(session.drawerExpenseTotal || 0) }}
                          <span v-if="(session.pendingDrawerExpenseTotal || 0) > 0" class="text-warning">
                            (+{{ formatCurrency(session.pendingDrawerExpenseTotal) }} pending)
                          </span>
                        </div>
                      </td>
                      <td>{{ formatCurrency(session.actualCash || session.closingBalance || session.collectibleBase) }}</td>
                      <td>{{ formatCurrency(session.collectedAmount) }}</td>
                      <td>
                        <div class="font-semibold text-warning">{{ formatCurrency(session.remainingAmount) }}</div>
                      </td>
                      <td class="min-w-28">
                        <progress
                          class="progress progress-success w-full h-2"
                          :value="getCollectionProgress(session)"
                          max="100"
                        />
                        <div class="text-xs text-base-content/50 mt-1">{{ getCollectionProgress(session) }}%</div>
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
                    <tr v-if="session.expenses?.length" class="bg-base-200/40">
                      <td colspan="9" class="py-2">
                        <div class="pl-6 space-y-1">
                          <div class="text-xs font-semibold text-base-content/60 uppercase tracking-wide">
                            Pengeluaran laci shift ini
                          </div>
                          <div
                            v-for="exp in session.expenses"
                            :key="exp.id"
                            class="flex flex-wrap items-center justify-between gap-2 text-sm py-1 border-b border-base-300/60 last:border-0"
                          >
                            <div class="min-w-0">
                              <span class="font-medium">{{ exp.title || exp.expenseNumber }}</span>
                              <span class="text-base-content/50 ml-2">{{ exp.expenseNumber }}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                              <span class="badge badge-sm" :class="expenseStatusClass(exp.status)">
                                {{ expenseStatusLabel(exp.status) }}
                              </span>
                              <span class="font-semibold tabular-nums">{{ formatCurrency(exp.totalAmount) }}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
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
                <th>Progress</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredSessions.length">
                <td colspan="11" class="text-center py-8 text-base-content/50">Tidak ada shift session pada filter ini.</td>
              </tr>
              <tr v-for="session in filteredSessions" :key="session.id" class="hover">
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
                  <div
                    v-if="session.expenses?.length"
                    class="text-xs text-base-content/60 mt-1"
                  >
                    {{ session.expenses.length }} expense ·
                    {{ formatCurrency(session.drawerExpenseTotal || 0) }} paid
                    <span v-if="(session.pendingDrawerExpenseTotal || 0) > 0" class="text-warning">
                      · {{ formatCurrency(session.pendingDrawerExpenseTotal) }} pending
                    </span>
                  </div>
                </td>
                <td>{{ formatCurrency(session.actualCash || session.closingBalance || session.collectibleBase) }}</td>
                <td>{{ formatCurrency(session.collectedAmount) }}</td>
                <td>
                  <div class="font-semibold text-warning">{{ formatCurrency(session.remainingAmount) }}</div>
                </td>
                <td class="min-w-28">
                  <progress
                    class="progress progress-success w-full h-2"
                    :value="getCollectionProgress(session)"
                    max="100"
                  />
                  <div class="text-xs text-base-content/50 mt-1">{{ getCollectionProgress(session) }}%</div>
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

    <div
      v-if="hasSelectedCollections"
      class="fixed bottom-0 inset-x-0 z-40 border-t border-base-300 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/80"
    >
      <div class="container mx-auto max-w-7xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div class="font-semibold">{{ selectedSessionIds.length }} shift dipilih</div>
          <div class="text-sm text-base-content/60">Estimasi collect {{ formatCurrency(totalSelectedAmount) }}</div>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button class="btn btn-ghost btn-sm flex-1 sm:flex-none" @click="clearSelection">
            Batalkan
          </button>
          <button class="btn btn-primary btn-sm flex-1 sm:flex-none" :disabled="actionLoading" @click="submitCollect">
            <span v-if="actionLoading" class="loading loading-spinner loading-sm"></span>
            <span v-else>Simpan Collect</span>
          </button>
        </div>
      </div>
    </div>

    <DialogConfirm ref="confirmDialog" />
  </div>
</template>
