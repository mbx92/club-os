<route lang="yaml">
meta:
  title: Katalog
  layout: default
  action: read
  subject: ServicePlan
</route>

<template>
  <div>
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div>
        <h1 class="text-2xl font-bold">Katalog</h1>
        <p class="text-sm text-base-content/60 mt-0.5">
          Kelola membership, paket kelas, paket PT, spa, dan add-on di satu tempat
        </p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-1.5" />
        Tambah Item
      </button>
    </div>

    <div class="flex flex-wrap gap-1.5 mb-4">
      <button
        v-for="tab in typeTabs"
        :key="tab.value"
        class="btn btn-xs"
        :class="filters.serviceType === tab.value ? 'btn-primary' : 'btn-ghost'"
        @click="setTypeFilter(tab.value)"
      >
        {{ tab.label }}
        <span v-if="typeCount(tab.value) != null" class="opacity-70">{{ typeCount(tab.value) }}</span>
      </button>
    </div>

    <div class="card bg-base-100 shadow-md mb-4">
      <div class="card-body p-3 sm:p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div class="form-control lg:col-span-5">
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama atau deskripsi..."
              class="input input-bordered input-sm w-full"
              @input="debouncedSearch"
            />
          </div>
          <div class="form-control lg:col-span-3">
            <select v-model="filters.isActive" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option value="all">Semua status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
          <div class="form-control lg:col-span-2">
            <select v-model="filters.sortBy" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option value="displayOrder">Urutan</option>
              <option value="name">Nama</option>
              <option value="price">Harga</option>
              <option value="serviceType">Tipe</option>
            </select>
          </div>
          <div class="form-control lg:col-span-2">
            <select v-model="filters.limit" class="select select-bordered select-sm w-full" @change="handleSearch">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="hasPlans" class="card bg-base-100 shadow-md">
      <div class="card-body p-3 sm:p-4">
        <div class="overflow-x-auto">
          <table class="table table-xs table-zebra">
            <thead>
              <tr class="text-[11px] uppercase tracking-wide text-base-content/60">
                <th class="w-8">#</th>
                <th>Tipe</th>
                <th>Nama</th>
                <th class="text-right">Harga</th>
                <th>Durasi / Sesi</th>
                <th class="text-center">Status</th>
                <th class="text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in plans"
                :key="plan.id"
                class="align-top"
                :class="{ 'opacity-50': !plan.isActive }"
              >
                <td class="font-mono text-base-content/40 whitespace-nowrap">{{ plan.displayOrder }}</td>
                <td class="whitespace-nowrap">
                  <span class="badge badge-xs" :class="getServiceTypeBadge(plan.serviceType)">
                    {{ catalogTypeLabel(plan.serviceType) }}
                  </span>
                </td>
                <td class="min-w-[12rem] max-w-[20rem]">
                  <div class="font-medium leading-tight truncate" :title="plan.name">
                    {{ plan.name }}
                    <span v-if="plan.isPopular" class="text-[10px] text-warning ml-1">★</span>
                  </div>
                  <div
                    v-if="plan.description"
                    class="text-[11px] text-base-content/50 leading-tight truncate"
                    :title="plan.description"
                  >
                    {{ plan.description }}
                  </div>
                </td>
                <td class="text-right whitespace-nowrap">
                  <div class="font-semibold leading-tight tabular-nums">
                    {{ formatCurrency(plan.price, plan.tenantCurrency) }}
                  </div>
                  <div v-if="getPricePerSession(plan)" class="text-[10px] text-base-content/50">
                    {{ formatCurrency(getPricePerSession(plan), plan.tenantCurrency) }}/sesi
                  </div>
                </td>
                <td class="whitespace-nowrap">
                  <div class="leading-tight">{{ formatDuration(plan) }}</div>
                  <div v-if="formatValidity(plan)" class="text-[11px] text-base-content/50 leading-tight">
                    {{ formatValidity(plan) }}
                  </div>
                </td>
                <td class="text-center">
                  <input
                    type="checkbox"
                    class="toggle toggle-success toggle-xs"
                    :checked="plan.isActive"
                    :disabled="actionLoading"
                    @change="togglePlanStatus(plan)"
                  />
                </td>
                <td class="text-center">
                  <div class="dropdown dropdown-end">
                    <button
                      tabindex="0"
                      class="btn btn-ghost btn-xs btn-circle"
                      :disabled="actionLoading"
                    >
                      <IconDotsVertical class="w-3.5 h-3.5" />
                    </button>
                    <ul tabindex="0" class="dropdown-content z-[1] menu menu-sm p-1.5 shadow-lg bg-base-100 rounded-box w-40">
                      <li>
                        <a @click="showPlanDetail(plan)">
                          <IconEye class="w-3.5 h-3.5" /> Detail
                        </a>
                      </li>
                      <li>
                        <a @click="openEditModal(plan)">
                          <IconEdit class="w-3.5 h-3.5" /> Edit
                        </a>
                      </li>
                      <li>
                        <a class="text-error" @click="confirmDeletePlan(plan)">
                          <IconTrash class="w-3.5 h-3.5" /> Hapus
                        </a>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-base-300">
          <div class="text-xs text-base-content/60">{{ paginationInfo }}</div>
          <div v-if="totalPages > 1" class="join">
            <button class="join-item btn btn-xs" :disabled="filters.page === 1" @click="changePage(filters.page - 1)">«</button>
            <button class="join-item btn btn-xs">{{ filters.page }} / {{ totalPages }}</button>
            <button class="join-item btn btn-xs" :disabled="filters.page === totalPages" @click="changePage(filters.page + 1)">»</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card bg-base-100 shadow-md">
      <div class="card-body items-center text-center py-10">
        <IconPackages class="w-12 h-12 text-base-content/30 mb-3" />
        <h3 class="font-semibold mb-1">Belum ada item katalog</h3>
        <p class="text-sm text-base-content/60 mb-4">
          {{ hasActiveFilters ? 'Tidak ada data untuk filter ini.' : 'Tambahkan membership atau paket untuk mulai menjual.' }}
        </p>
        <button v-if="!hasActiveFilters" class="btn btn-primary btn-sm" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-1.5" />
          Tambah Item
        </button>
      </div>
    </div>

    <dialog ref="detailModal" class="modal">
      <div class="modal-box max-w-lg">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="font-bold text-base mb-3">{{ selectedPlan?.name }}</h3>
        <div v-if="selectedPlan" class="space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <p class="text-xs text-base-content/50">Tipe</p>
              <p>{{ catalogTypeLabel(selectedPlan.serviceType) }}</p>
            </div>
            <div>
              <p class="text-xs text-base-content/50">Harga</p>
              <p>{{ formatCurrency(selectedPlan.price, selectedPlan.tenantCurrency) }}</p>
            </div>
            <div>
              <p class="text-xs text-base-content/50">Durasi / Sesi</p>
              <p>{{ formatDuration(selectedPlan) }}</p>
            </div>
            <div v-if="formatValidity(selectedPlan)">
              <p class="text-xs text-base-content/50">Masa berlaku</p>
              <p>{{ formatValidity(selectedPlan) }}</p>
            </div>
          </div>
          <p v-if="selectedPlan.description" class="text-base-content/70">{{ selectedPlan.description }}</p>
          <div class="flex flex-wrap gap-1">
            <span :class="selectedPlan.isActive ? 'badge badge-success badge-xs' : 'badge badge-ghost badge-xs'">
              {{ selectedPlan.isActive ? 'Aktif' : 'Nonaktif' }}
            </span>
            <span v-if="selectedPlan.isPopular" class="badge badge-warning badge-xs">Populer</span>
            <span v-if="requiresTrainer(selectedPlan)" class="badge badge-info badge-xs">Perlu trainer</span>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <ServicePlanFormModal
      ref="planFormModal"
      :plan="editingPlan"
      :loading="modalLoading"
      @submit="handlePlanSubmit"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconPackages,
  IconDotsVertical,
} from '@tabler/icons-vue'
import { useServicePlans } from '@/composables/gym/service-management/useServicePlans.js'
import { useDialog } from '@/composables/core/useApi'
import ServicePlanFormModal from '@/components/gym/services/ServicePlanFormModal.vue'

const CATALOG_TYPE_LABELS = {
  membership: 'Membership',
  class_package: 'Paket Kelas',
  pt_package: 'Paket PT',
  spa_package: 'Paket Spa',
  custom: 'Add-on',
}

const typeTabs = [
  { value: 'all', label: 'Semua' },
  { value: 'membership', label: 'Membership' },
  { value: 'class_package', label: 'Paket Kelas' },
  { value: 'pt_package', label: 'Paket PT' },
  { value: 'spa_package', label: 'Spa' },
  { value: 'custom', label: 'Add-on' },
]

const {
  plans,
  loading,
  stats,
  fetchPlans,
  fetchStats,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  formatCurrency,
  getServiceTypeBadge,
  formatDuration,
  formatValidity,
  getPricePerSession,
  requiresTrainer,
} = useServicePlans()

const dialog = useDialog()

const filters = ref({
  search: '',
  serviceType: 'all',
  isActive: 'all',
  sortBy: 'displayOrder',
  sortOrder: 'ASC',
  page: 1,
  limit: 25,
})

const totalPlans = ref(0)
const totalPages = ref(0)
const editingPlan = ref(null)
const selectedPlan = ref(null)
const modalLoading = ref(false)
const actionLoading = ref(false)
const planFormModal = ref(null)
const detailModal = ref(null)
let searchTimeout = null

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.serviceType !== 'all' || filters.value.isActive !== 'all'
})

const hasPlans = computed(() => Array.isArray(plans.value) && plans.value.length > 0)

const paginationInfo = computed(() => {
  if (!totalPlans.value) return '0 item'
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalPlans.value)
  return `${start}–${end} dari ${totalPlans.value} item`
})

const catalogTypeLabel = (serviceType) => CATALOG_TYPE_LABELS[serviceType] || serviceType

const typeCount = (serviceType) => {
  if (!stats.value?.length) return null
  if (serviceType === 'all') {
    return stats.value.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
  }
  const row = stats.value.find((item) => item.serviceType === serviceType)
  return row ? Number(row.count) || 0 : 0
}

const handleSearch = async () => {
  filters.value.page = 1
  await loadPlans()
}

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 400)
}

const setTypeFilter = (serviceType) => {
  filters.value.serviceType = serviceType
  handleSearch()
}

const loadPlans = async () => {
  try {
    const result = await fetchPlans(filters.value)
    if (result?.data) {
      totalPlans.value = result.total || result.data.length || 0
      totalPages.value = result.totalPages || 1
    } else if (Array.isArray(result)) {
      totalPlans.value = result.length
      totalPages.value = 1
    } else {
      totalPlans.value = 0
      totalPages.value = 1
    }
  } catch {
    totalPlans.value = 0
    totalPages.value = 1
  }
}

const changePage = (page) => {
  filters.value.page = page
  loadPlans()
}

const openCreateModal = () => {
  editingPlan.value = null
  planFormModal.value?.resetForm()
  planFormModal.value?.openModal()
}

const openEditModal = (plan) => {
  editingPlan.value = plan
  planFormModal.value?.openModal()
}

const handleModalClose = () => {
  editingPlan.value = null
}

const handlePlanSubmit = async (planData) => {
  modalLoading.value = true
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.id, planData)
    } else {
      await createPlan(planData)
    }
    planFormModal.value?.closeModal()
    editingPlan.value = null
    await Promise.all([loadPlans(), fetchStats()])
  } finally {
    modalLoading.value = false
  }
}

const togglePlanStatus = async (plan) => {
  actionLoading.value = true
  try {
    await togglePlanActive(plan.id, !plan.isActive)
    await Promise.all([loadPlans(), fetchStats()])
  } finally {
    actionLoading.value = false
  }
}

const confirmDeletePlan = async (plan) => {
  const confirmed = await dialog.confirm({
    title: 'Hapus item katalog',
    message: `Hapus "${plan.name}"? Item yang sudah terjual tidak akan terpengaruh.`,
    type: 'danger',
    confirmText: 'Hapus',
    cancelText: 'Batal',
  })

  if (!confirmed) return

  actionLoading.value = true
  try {
    await deletePlan(plan.id)
    await Promise.all([loadPlans(), fetchStats()])
  } finally {
    actionLoading.value = false
  }
}

const showPlanDetail = (plan) => {
  selectedPlan.value = plan
  detailModal.value?.showModal()
}

onMounted(async () => {
  await Promise.all([loadPlans(), fetchStats()])
})
</script>
