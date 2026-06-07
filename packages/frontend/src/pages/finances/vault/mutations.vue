<route lang="yaml">
meta:
  title: Mutasi Vault
  layout: default
  requiresModule: finance
</route>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVault } from '@/composables/finances'
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'
import {
  accountLabel,
  formatCurrency,
  formatDate,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getRoleName,
  mutationStatusClass,
  mutationTypeLabel,
} from '@/utils/vault'
import {
  IconArrowLeft,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const {
  mutations,
  mutationsLoading,
  mutationPagination,
  fetchMutations,
} = useVault()

const { locations, fetchLocations } = useRestaurantLocations()

const roleName = computed(() => getRoleName(authStore.user?.role))
const isCashier = computed(() => ['cashier', 'kasir'].includes(roleName.value))

const filters = ref({
  startDate: route.query.startDate || getFirstDayOfMonth(),
  endDate: route.query.endDate || getLastDayOfMonth(),
  mutationType: route.query.mutationType || '',
  sourceAccount: route.query.sourceAccount || '',
  destinationAccount: route.query.destinationAccount || '',
  status: route.query.status || 'posted',
  locationId: route.query.locationId || '',
  search: route.query.search || '',
  page: Number(route.query.page || 1),
  limit: Number(route.query.limit || 20),
})

const visiblePages = computed(() => {
  const totalPages = mutationPagination.value.totalPages || 0
  return Array.from({ length: totalPages }, (_, index) => index + 1)
})

const normalizeReferenceType = (referenceType) => {
  return String(referenceType || '').trim().toLowerCase()
}

const shortReferenceId = (referenceId) => {
  if (!referenceId) return '-'
  const value = String(referenceId)
  return value.length > 12 ? `${value.slice(0, 8)}...` : value
}

const getReferenceTargetId = (mutation) => {
  const referenceType = normalizeReferenceType(mutation?.referenceType)

  switch (referenceType) {
    case 'expense':
      return mutation?.expense?.id || mutation?.reference?.id || mutation?.referenceId || ''
    case 'cashregistersession':
      return mutation?.shiftSession?.id || mutation?.shiftSessionId || mutation?.reference?.id || mutation?.referenceId || ''
    case 'transaction':
      return mutation?.transaction?.id || mutation?.reference?.id || mutation?.referenceId || ''
    case 'order':
      return mutation?.order?.id || mutation?.reference?.id || mutation?.referenceId || ''
    case 'pettycash':
    case 'pettycashfund':
      return mutation?.pettyCash?.id || mutation?.pettyCashFund?.id || mutation?.reference?.id || mutation?.referenceId || ''
    default:
      return mutation?.referenceId || ''
  }
}

const getReferenceRoute = (mutation) => {
  const referenceId = getReferenceTargetId(mutation)
  if (!referenceId) return ''

  switch (normalizeReferenceType(mutation?.referenceType)) {
    case 'expense':
      return `/finances/expenses/${referenceId}`
    case 'cashregistersession':
      return `/cash-register/${referenceId}/report`
    case 'transaction':
      return `/finances/transactions/${referenceId}`
    case 'order':
      return `/restaurant/orders/${referenceId}`
    case 'pettycash':
    case 'pettycashfund':
      return `/finances/petty-cash/${referenceId}`
    default:
      return ''
  }
}

const getReferenceLabel = (mutation) => {
  const candidates = [
    mutation?.referenceNumber,
    mutation?.expense?.expenseNumber,
    mutation?.expense?.referenceNumber,
    mutation?.transaction?.transactionNumber,
    mutation?.order?.transactionNumber,
    mutation?.reference?.expenseNumber,
    mutation?.reference?.transactionNumber,
    mutation?.reference?.orderNumber,
    mutation?.reference?.referenceNumber,
    mutation?.shiftSession?.sessionNumber,
  ].filter(Boolean)

  if (candidates.length) return candidates[0]

  if (normalizeReferenceType(mutation?.referenceType) === 'cashregistersession' && mutation?.shiftSession) {
    return `Shift #${mutation.shiftSession.shiftNumber || '-'} ${mutation.shiftSession.shiftDate || ''}`.trim()
  }

  return shortReferenceId(mutation?.referenceId)
}

const baseVaultQuery = computed(() => ({
  startDate: filters.value.startDate || undefined,
  endDate: filters.value.endDate || undefined,
  locationId: filters.value.locationId || undefined,
}))

const syncQuery = async () => {
  const query = {
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined,
    mutationType: filters.value.mutationType || undefined,
    sourceAccount: filters.value.sourceAccount || undefined,
    destinationAccount: filters.value.destinationAccount || undefined,
    status: filters.value.status || undefined,
    locationId: filters.value.locationId || undefined,
    search: filters.value.search || undefined,
    page: filters.value.page > 1 ? String(filters.value.page) : undefined,
    limit: filters.value.limit !== 20 ? String(filters.value.limit) : undefined,
  }

  await router.replace({ query })
}

const loadMutations = async () => {
  await syncQuery()

  await fetchMutations({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    mutationType: filters.value.mutationType,
    sourceAccount: filters.value.sourceAccount,
    destinationAccount: filters.value.destinationAccount,
    status: filters.value.status,
    locationId: filters.value.locationId,
    search: filters.value.search,
    page: filters.value.page,
    limit: filters.value.limit,
  })
}

const handleSearch = async () => {
  filters.value.page = 1
  await loadMutations()
}

const handlePageChange = async (page) => {
  filters.value.page = page
  await loadMutations()
}

const resetFilters = async () => {
  filters.value = {
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    mutationType: '',
    sourceAccount: '',
    destinationAccount: '',
    status: 'posted',
    locationId: '',
    search: '',
    page: 1,
    limit: 20,
  }

  await loadMutations()
}

const goBackToVault = () => {
  router.push({
    path: '/finances/vault',
    query: baseVaultQuery.value,
  })
}

onMounted(async () => {
  if (isCashier.value) {
    router.replace('/403')
    return
  }

  await Promise.all([
    fetchLocations({ isActive: true, limit: 200 }).catch(() => null),
    loadMutations(),
  ])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl space-y-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Mutasi Vault</h1>
        <p class="text-base-content/60 mt-1">Semua pergerakan dana yang menyentuh vault ditampilkan di halaman ini.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" @click="goBackToVault">
          <IconArrowLeft class="w-4 h-4" />
          Kembali ke Vault
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="mutationsLoading" @click="loadMutations">
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': mutationsLoading }" />
        </button>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body gap-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 class="card-title">Filter Mutasi</h2>
            <p class="text-sm text-base-content/60">Gunakan filter untuk melacak transfer drawer, expense vault, dan penyesuaian.</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" @click="resetFilters">
              Reset
            </button>
            <button class="btn btn-primary btn-sm" :disabled="mutationsLoading" @click="handleSearch">
              <IconSearch class="w-4 h-4" />
              Terapkan Filter
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Cari</span></label>
            <label class="input input-bordered flex items-center gap-2">
              <IconSearch class="w-4 h-4 opacity-60" />
              <input v-model="filters.search" type="text" class="grow" placeholder="Nomor mutasi / catatan" @keyup.enter="handleSearch" />
            </label>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tipe Mutasi</span></label>
            <select v-model="filters.mutationType" class="select select-bordered w-full">
              <option value="">Semua Tipe</option>
              <option value="drawer_to_vault_transfer">Drawer ke Vault</option>
              <option value="vault_expense">Expense Vault</option>
              <option value="vault_adjustment">Penyesuaian Vault</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Dari</span></label>
            <select v-model="filters.sourceAccount" class="select select-bordered w-full">
              <option value="">Semua Sumber</option>
              <option value="cash_drawer">Laci Kasir</option>
              <option value="vault">Vault / Brankas</option>
              <option value="petty_cash">Petty Cash</option>
              <option value="bank">Bank / Transfer</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Ke</span></label>
            <select v-model="filters.destinationAccount" class="select select-bordered w-full">
              <option value="">Semua Tujuan</option>
              <option value="vault">Vault / Brankas</option>
              <option value="cash_drawer">Laci Kasir</option>
              <option value="petty_cash">Petty Cash</option>
              <option value="bank">Bank / Transfer</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Status</span></label>
            <select v-model="filters.status" class="select select-bordered w-full">
              <option value="">Semua Status</option>
              <option value="posted">Posted</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tanggal Mulai</span></label>
            <input v-model="filters.startDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Tanggal Akhir</span></label>
            <input v-model="filters.endDate" type="date" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Lokasi</span></label>
            <select v-model="filters.locationId" class="select select-bordered w-full">
              <option value="">Semua Lokasi</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex justify-end">
          <div class="form-control w-full md:w-56">
            <label class="label"><span class="label-text font-medium">Per Halaman</span></label>
            <select v-model="filters.limit" class="select select-bordered w-full" @change="handlePageChange(1)">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>

        <div v-if="mutationsLoading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Nomor Mutasi</th>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Dari</th>
                <th>Ke</th>
                <th>Amount</th>
                <th>Referensi</th>
                <th>Shift</th>
                <th>Lokasi</th>
                <th>Dibuat Oleh</th>
                <th>Catatan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!mutations.length">
                <td colspan="12" class="text-center py-8 text-base-content/50">Belum ada mutasi vault untuk filter ini.</td>
              </tr>
              <tr v-for="mutation in mutations" :key="mutation.id">
                <td><div class="font-medium">{{ mutation.mutationNumber || '-' }}</div></td>
                <td>{{ formatDate(mutation.mutationDate) }}</td>
                <td>{{ mutationTypeLabel(mutation.mutationType) }}</td>
                <td>{{ accountLabel(mutation.sourceAccount) }}</td>
                <td>{{ accountLabel(mutation.destinationAccount) }}</td>
                <td class="font-semibold">{{ formatCurrency(mutation.amount) }}</td>
                <td>
                  <router-link
                    v-if="getReferenceRoute(mutation)"
                    :to="getReferenceRoute(mutation)"
                    class="link link-primary font-medium"
                  >
                    {{ getReferenceLabel(mutation) }}
                  </router-link>
                  <div v-else class="font-medium">{{ getReferenceLabel(mutation) }}</div>
                  <div class="text-xs text-base-content/50">{{ mutation.referenceType || '-' }}</div>
                </td>
                <td>
                  <div>{{ mutation.shiftSession?.shiftName || '-' }}</div>
                  <div class="text-xs text-base-content/50">{{ mutation.shiftSession?.shiftDate || '-' }} · #{{ mutation.shiftSession?.shiftNumber || '-' }}</div>
                </td>
                <td>{{ mutation.location?.name || '-' }}</td>
                <td>{{ [mutation.creator?.firstName, mutation.creator?.lastName].filter(Boolean).join(' ') || '-' }}</td>
                <td><div class="max-w-xs whitespace-pre-line">{{ mutation.notes || '-' }}</div></td>
                <td>
                  <span class="badge badge-sm" :class="mutationStatusClass(mutation.status)">
                    {{ mutation.status || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="visiblePages.length > 1" class="flex justify-center">
          <div class="join">
            <button
              v-for="page in visiblePages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === mutationPagination.page }"
              @click="handlePageChange(page)"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>