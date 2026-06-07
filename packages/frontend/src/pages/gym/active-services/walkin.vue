<route lang="yaml">
meta:
  title: Walk-in Services
  layout: default
</route>

<template>
  <div class="container px-4 py-8 mx-auto">
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-bold">Walk-in Services</h1>
        <p class="mt-1 text-base-content/60">Active services purchased by walk-in (non-member) customers</p>
      </div>
      <router-link to="/gym/active-services" class="btn btn-ghost btn-sm">
        <IconArrowLeft class="w-4 h-4 mr-1" />
        All Services
      </router-link>
    </div>

    <!-- Filters -->
    <div class="mb-6 shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <!-- Status -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Status</span>
            </label>
            <select v-model="filters.status" class="w-full select select-bordered select-sm" @change="handleSearch">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <!-- Service Type -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Service Type</span>
            </label>
            <select v-model="filters.serviceType" class="w-full select select-bordered select-sm" @change="handleSearch">
              <option value="all">All Types</option>
              <option value="membership">Membership</option>
              <option value="class_package">Class Package</option>
              <option value="pt_package">PT Package</option>
              <option value="spa_package">Spa Package</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <!-- Date filter -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Date</span>
            </label>
            <input
              type="date"
              v-model="filters.date"
              class="w-full input input-bordered input-sm"
              @change="handleSearch"
            />
          </div>

          <!-- Limit -->
          <div class="flex-col form-control">
            <label class="label">
              <span class="font-medium label-text">Show</span>
            </label>
            <select v-model="filters.limit" class="w-full select select-bordered select-sm" @change="handleSearch">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>

        <!-- Active Filters -->
        <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-base-300">
          <span class="text-sm text-base-content/60">Filters:</span>
          <div v-if="filters.status !== 'all'" class="gap-1 badge badge-primary badge-outline">
            Status: {{ getStatusLabel(filters.status) }}
            <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('status')">✕</button>
          </div>
          <div v-if="filters.serviceType !== 'all'" class="gap-1 badge badge-primary badge-outline">
            Type: {{ formatServiceType(filters.serviceType) }}
            <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('serviceType')">✕</button>
          </div>
          <div v-if="filters.date" class="gap-1 badge badge-primary badge-outline">
            Date: {{ filters.date }}
            <button class="btn btn-ghost btn-xs btn-circle" @click="clearFilter('date')">✕</button>
          </div>
          <button class="btn btn-xs btn-ghost" @click="clearAllFilters">Clear All</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Table -->
    <div v-else-if="services.length > 0" class="shadow-xl card bg-base-100">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service Plan</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>Expires At</th>
                <th>Assigned Trainer</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in services" :key="service.id" :class="getRowClass(service)">
                <!-- Customer Name -->
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="rounded-full w-10 bg-secondary text-secondary-content" style="display:flex!important;align-items:center!important;justify-content:center!important;">
                        <span class="text-sm">{{ getInitialFromName(service.customerName) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-semibold">{{ service.customerName || 'Walk-in' }}</div>
                      <div class="text-xs badge badge-ghost badge-sm mt-0.5">Walk-in</div>
                    </div>
                  </div>
                </td>

                <!-- Service Plan -->
                <td>
                  <div class="font-semibold">{{ service.servicePlan?.name || '—' }}</div>
                  <div class="text-sm text-base-content/60">{{ formatCurrency(service.servicePlan?.price) }}</div>
                </td>

                <!-- Type -->
                <td>
                  <div class="badge badge-sm badge-outline">{{ formatServiceType(service.serviceType || service.servicePlan?.serviceType) }}</div>
                </td>

                <!-- Start Date -->
                <td>
                  <div class="text-sm">{{ formatDate(service.startDate) }}</div>
                </td>

                <!-- Expires At -->
                <td>
                  <div class="text-sm">{{ formatDate(service.expiresAt || service.endDate) }}</div>
                  <div class="badge badge-xs mt-0.5" :class="getRemainingBadgeClass(service)">
                    {{ getRemainingDays(service) }}
                  </div>
                </td>

                <!-- Trainer -->
                <td>
                  <span v-if="service.assignedTrainer">
                    {{ service.assignedTrainer.firstName }} {{ service.assignedTrainer.lastName }}
                  </span>
                  <span v-else class="text-base-content/40">—</span>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div class="badge badge-sm" :class="getStatusBadgeClass(service.status)">
                    {{ getStatusLabel(service.status) }}
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <button
                    class="tooltip btn btn-xs btn-ghost"
                    data-tip="View Details"
                    @click="openDetail(service)"
                  >
                    <IconEye class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col items-center justify-between gap-4 pt-4 mt-6 border-t sm:flex-row border-base-300">
          <div class="text-sm text-base-content/60">{{ paginationInfo }}</div>
          <div v-if="totalPages > 1" class="join">
            <button class="join-item btn btn-sm" :disabled="filters.page === 1" @click="changePage(filters.page - 1)">«</button>
            <button
              v-for="page in visiblePages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === filters.page }"
              @click="changePage(page)"
            >{{ page }}</button>
            <button class="join-item btn btn-sm" :disabled="filters.page === totalPages" @click="changePage(filters.page + 1)">»</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="shadow-xl card bg-base-100">
      <div class="py-12 text-center card-body">
        <IconUserOff class="w-16 h-16 mx-auto mb-4 text-base-content/30" />
        <h3 class="mb-2 text-xl font-semibold">No Walk-in Services Found</h3>
        <p class="text-base-content/60">
          {{ hasActiveFilters ? 'Try adjusting your filters.' : 'Walk-in services will appear here after a POS transaction for a walk-in customer.' }}
        </p>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <dialog ref="detailModal" class="modal">
        <div class="max-w-2xl modal-box">
          <form method="dialog">
            <button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">✕</button>
          </form>

          <h3 class="mb-4 text-lg font-bold">Walk-in Service Details</h3>

          <div v-if="selectedService" class="space-y-4">
            <!-- Customer -->
            <div class="card bg-base-200">
              <div class="p-4 card-body">
                <h4 class="mb-3 font-semibold">Customer Information</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-base-content/60">Name</p>
                    <p class="font-medium">{{ selectedService.customerName || 'Walk-in' }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Customer Type</p>
                    <div class="badge badge-secondary badge-sm">Walk-in</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Service Info -->
            <div class="card bg-base-200">
              <div class="p-4 card-body">
                <h4 class="mb-3 font-semibold">Service Information</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-base-content/60">Plan Name</p>
                    <p class="font-medium">{{ selectedService.servicePlan?.name }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Price Paid</p>
                    <p class="font-medium">{{ formatCurrency(selectedService.pricePaid || selectedService.servicePlan?.price) }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Start Date</p>
                    <p class="font-medium">{{ formatDate(selectedService.startDate) }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Expires At</p>
                    <p class="font-medium">{{ formatDate(selectedService.expiresAt || selectedService.endDate) }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Remaining</p>
                    <p class="font-medium">{{ getRemainingDays(selectedService) }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Status</p>
                    <div class="badge badge-sm" :class="getStatusBadgeClass(selectedService.status)">
                      {{ getStatusLabel(selectedService.status) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Transaction -->
            <div v-if="selectedService.purchaseTransaction" class="card bg-base-200">
              <div class="p-4 card-body">
                <h4 class="mb-3 font-semibold">Transaction</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-base-content/60">Transaction #</p>
                    <p class="font-mono font-medium">{{ selectedService.purchaseTransaction.transactionNumber }}</p>
                  </div>
                  <div>
                    <p class="text-base-content/60">Total</p>
                    <p class="font-medium">{{ formatCurrency(selectedService.purchaseTransaction.totalAmount) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trainer -->
            <div v-if="selectedService.assignedTrainer" class="card bg-base-200">
              <div class="p-4 card-body">
                <h4 class="mb-3 font-semibold">Assigned Trainer</h4>
                <p class="font-medium">{{ selectedService.assignedTrainer.firstName }} {{ selectedService.assignedTrainer.lastName }}</p>
              </div>
            </div>
          </div>

          <div class="modal-action">
            <form method="dialog">
              <button class="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconArrowLeft,
  IconEye,
  IconUserOff,
} from '@tabler/icons-vue'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices.js'

const {
  services,
  loading,
  fetchWalkInServices,
  formatCurrency,
  formatDate,
  getRemainingDays,
  getStatusLabel,
  getStatusBadgeClass,
  getRemainingBadgeClass,
  getRowClass,
} = useActiveServices()

const filters = ref({
  status: 'all',
  serviceType: 'all',
  date: '',
  page: 1,
  limit: 10,
})

const totalItems = ref(0)
const totalPages = ref(1)
const selectedService = ref(null)
const detailModal = ref(null)

// Computed
const hasActiveFilters = computed(() =>
  filters.value.status !== 'all' ||
  filters.value.serviceType !== 'all' ||
  !!filters.value.date
)

const paginationInfo = computed(() => {
  const start = (filters.value.page - 1) * filters.value.limit + 1
  const end = Math.min(filters.value.page * filters.value.limit, totalItems.value)
  if (totalItems.value === 0) return 'No services found'
  return `Showing ${start}–${end} of ${totalItems.value} services`
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, filters.value.page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Methods
const loadServices = async () => {
  try {
    const result = await fetchWalkInServices(filters.value)
    if (result) {
      totalItems.value = result.total || 0
      totalPages.value = result.totalPages || 1
    }
  } catch (e) {
    totalItems.value = 0
    totalPages.value = 1
  }
}

const handleSearch = () => {
  filters.value.page = 1
  loadServices()
}

const changePage = (page) => {
  filters.value.page = page
  loadServices()
}

const clearFilter = (key) => {
  if (key === 'status') filters.value.status = 'all'
  else if (key === 'serviceType') filters.value.serviceType = 'all'
  else filters.value[key] = ''
  handleSearch()
}

const clearAllFilters = () => {
  filters.value.status = 'all'
  filters.value.serviceType = 'all'
  filters.value.date = ''
  handleSearch()
}

const openDetail = (service) => {
  selectedService.value = service
  detailModal.value?.showModal()
}

const getInitialFromName = (name) => {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

const formatServiceType = (type) => {
  const map = {
    membership: 'Membership',
    class_package: 'Class Package',
    pt_package: 'PT Package',
    spa_package: 'Spa Package',
    custom: 'Custom',
  }
  return map[type] || type || '—'
}

onMounted(loadServices)
</script>
