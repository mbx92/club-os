<route lang="yaml">
meta:
  title: Pesanan
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Pesanan</h1>
        <p class="text-base-content/60 mt-1">Kelola pesanan tes psikologi</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <IconPlus class="w-4 h-4 mr-2" />
        Buat Pesanan
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="form-control">
            <select v-model="filters.status" class="select select-bordered w-full" @change="handleSearch">
              <option value="">Semua Status</option>
              <option value="pending">Menunggu Pembayaran</option>
              <option value="paid">Lunas</option>
              <option value="in_progress">Sedang Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="verified">Terverifikasi</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="expired">Kadaluarsa</option>
            </select>
          </div>
          <div class="form-control">
            <input
              v-model="filters.startDate"
              type="date"
              class="input input-bordered w-full"
              placeholder="Dari tanggal"
              @change="handleSearch"
            />
          </div>
          <div class="form-control">
            <input
              v-model="filters.endDate"
              type="date"
              class="input input-bordered w-full"
              placeholder="Sampai tanggal"
              @change="handleSearch"
            />
          </div>
          <select v-model="filters.limit" class="select select-bordered w-full" @change="handleSearch">
            <option :value="10">10 per halaman</option>
            <option :value="25">25 per halaman</option>
            <option :value="50">50 per halaman</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Orders Table -->
    <div v-else-if="orders.length > 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>No. Order</th>
                <th>Pasien</th>
                <th>Paket</th>
                <th>Total</th>
                <th>Status</th>
                <th>Invitation Code</th>
                <th>Tanggal</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td>
                  <span class="font-mono text-sm">{{ order.orderNumber }}</span>
                </td>
                <td>
                  <div>
                    <div class="font-medium uppercase">{{ order.patient?.fullName || '-' }}</div>
                    <div class="text-xs text-base-content/60">{{ order.patient?.email }}</div>
                  </div>
                </td>
                <td>{{ order.package?.name || '-' }}</td>
                <td class="font-medium">{{ formatPrice(order.baseAmount) }}</td>
                <td>
                  <div class="badge badge-sm" :class="getPaymentStatusClass(order.status)">
                    {{ getPaymentStatusLabel(order.status) }}
                  </div>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    {{ order.metadata?.invitationCode }}
                  </div>
                </td>
                <td class="text-sm text-base-content/60">{{ formatDate(order.createdAt) }}</td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <div class="tooltip" data-tip="Detail">
                      <router-link
                        :to="`/psychology/orders/${order.id}`"
                        class="btn btn-xs btn-ghost"
                      >
                        <IconEye class="w-4 h-4" />
                      </router-link>
                    </div>
                    <div v-if="order.status === 'pending'" class="tooltip" data-tip="Proses Pembayaran">
                      <button
                        class="btn btn-xs btn-ghost text-success"
                        @click="handlePayment(order)"
                      >
                        <IconCash class="w-4 h-4" />
                      </button>
                    </div>
                    <div v-if="['paid', 'in_progress', 'completed'].includes(order.status) && !isOrderExpired(order.expiresAt)" class="tooltip" data-tip="Copy Link">
                      <button
                        class="btn btn-xs btn-ghost"
                        @click="copyAccessLink(order)"
                      >
                        <IconLink class="w-4 h-4" />
                      </button>
                    </div>
                    <div v-if="order.status === 'pending'" class="tooltip" data-tip="Batalkan">
                      <button
                        class="btn btn-xs btn-ghost text-error"
                        @click="confirmCancel(order)"
                      >
                        <IconX class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-base-300">
          <div class="text-sm text-base-content/60">
            Menampilkan {{ paginationInfo }}
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
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconInbox class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum Ada Pesanan</h3>
        <p class="text-base-content/60 mb-4">Buat pesanan pertama Anda</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <IconPlus class="w-4 h-4 mr-2" />
          Buat Pesanan
        </button>
      </div>
    </div>

    <!-- Order Form Modal -->
    <OrderFormModal
      ref="orderFormModal"
      :packages="availablePackages"
      :loading="modalLoading"
      @submit="handleSubmit"
      @search-patients="handlePatientSearch"
      @validate-promo="handlePromoValidation"
      @close="handleModalClose"
    />

    <!-- Payment Modal -->
    <dialog ref="paymentModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Proses Pembayaran</h3>
        
        <div v-if="selectedOrder" class="space-y-4">
          <div class="bg-base-200 rounded-lg p-4">
            <p class="text-sm text-base-content/60">No. Order</p>
            <p class="font-mono font-bold">{{ selectedOrder.orderNumber }}</p>
          </div>

          <div class="bg-base-200 rounded-lg p-4">
            <p class="text-sm text-base-content/60">Total Pembayaran</p>
            <p class="text-2xl font-bold text-primary">{{ formatPrice(selectedOrder.finalAmount) }}</p>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Metode Pembayaran</span>
            </label>
            <select v-model="paymentMethod" class="select select-bordered w-full">
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="credit_card">Kartu</option>
              <option value="debit_card">Kartu Debit</option>
              <option value="qris">QRIS</option>
              <option value="e_wallet">E-Wallet (OVO, GoPay, Dana)</option>
              <option value="compliment">Gratis (Compliment)</option>
            </select>
          </div>

          <!-- Nama Bank (credit_card / debit_card) -->
          <div v-if="BANK_SELECTION_PAYMENT_METHODS.includes(paymentMethod)" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Nama Bank</span>
            </label>
            <select
              v-model="paymentBank"
              class="select select-bordered w-full"
            >
              <option value="">-- Pilih Bank --</option>
              <option
                v-for="bank in BANK_OPTIONS"
                :key="bank.value"
                :value="bank.value"
              >
                {{ bank.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost">Batal</button>
          </form>
          <button 
            class="btn btn-primary" 
            @click="confirmPayment"
            :disabled="processingPayment"
          >
            <span v-if="processingPayment" class="loading loading-spinner loading-sm"></span>
            Konfirmasi Pembayaran
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconPlus,
  IconEye,
  IconCash,
  IconLink,
  IconX,
  IconInbox,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-vue'
import { useOrders, usePackages, usePatients, usePriceRules } from '@/composables/psychology'
import { useDialog } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { BANK_OPTIONS, BANK_SELECTION_PAYMENT_METHODS, buildPaymentBankPayload } from '@/utils/paymentBanks'
import OrderFormModal from '@/components/psychology/OrderFormModal.vue'

const dialog = useDialog()
const { showSuccess } = useNotification()

const {
  orders,
  loading,
  pagination,
  fetchOrders,
  createOrder,
  processPayment,
  cancelOrder,
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getSessionStatusClass,
  formatPrice,
  formatDate,
  isOrderExpired
} = useOrders()

const { packages: availablePackages, fetchPackages } = usePackages()
const { searchPatients } = usePatients()
const { validatePromoCode } = usePriceRules()

const filters = ref({
  status: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10
})

const modalLoading = ref(false)
const orderFormModal = ref(null)
const paymentModal = ref(null)
const selectedOrder = ref(null)
const paymentMethod = ref('cash')
const paymentBank = ref('')
const processingPayment = ref(false)

const paginationInfo = computed(() => {
  const start = (pagination.value.page - 1) * filters.value.limit + 1
  const end = Math.min(pagination.value.page * filters.value.limit, pagination.value.total)
  return `${start}-${end} dari ${pagination.value.total} pesanan`
})

const handleSearch = () => {
  filters.value.page = 1
  loadOrders()
}

const loadOrders = async () => {
  await fetchOrders({
    ...filters.value,
    page: filters.value.page || 1
  })
}

const changePage = (page) => {
  if (page < 1 || page > pagination.value.totalPages) return
  filters.value.page = page
  loadOrders()
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

const openCreateModal = () => {
  orderFormModal.value?.resetForm()
  orderFormModal.value?.openModal()
}

const handleModalClose = () => {
  // Reset
}

const handlePatientSearch = async (query) => {
  const results = await searchPatients(query)
  // If query is empty, it's initial load - mark as all patients
  orderFormModal.value?.setSearchResults(results, query === '')
}

const handlePromoValidation = async (code) => {
  try {
    const result = await validatePromoCode(code)
    orderFormModal.value?.setPromoResult({ valid: true, discount: result.discountAmount })
  } catch (err) {
    orderFormModal.value?.setPromoResult({ valid: false, message: 'Kode promo tidak valid' })
  }
}

const handleSubmit = async (orderData) => {
  modalLoading.value = true
  try {
    await createOrder(orderData)
    orderFormModal.value?.closeModal()
    await loadOrders()
  } catch (error) {
    console.error('Error creating order:', error)
  } finally {
    modalLoading.value = false
  }
}

const handlePayment = (order) => {
  selectedOrder.value = order
  paymentMethod.value = 'cash'
  paymentBank.value = ''
  paymentModal.value?.showModal()
}

const confirmPayment = async () => {
  if (!selectedOrder.value) return
  
  processingPayment.value = true
  try {
    await processPayment(selectedOrder.value.id, {
      paymentMethod: paymentMethod.value,
      ...buildPaymentBankPayload(paymentMethod.value, paymentBank.value)
    })
    paymentModal.value?.close()
    selectedOrder.value = null
    paymentBank.value = ''
    await loadOrders()
  } catch (error) {
    console.error('Error processing payment:', error)
  } finally {
    processingPayment.value = false
  }
}

const copyAccessLink = async (order) => {
  if (order.accessUrl) {
    try {
      await navigator.clipboard.writeText(order.accessUrl)
      showSuccess('Link akses berhasil disalin!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

const confirmCancel = async (order) => {
  const confirmed = await dialog.confirm({
    title: 'Batalkan Pesanan',
    message: `Apakah Anda yakin ingin membatalkan pesanan "${order.orderNumber}"?`,
    type: 'warning',
    confirmText: 'Batalkan',
    cancelText: 'Kembali'
  })

  if (confirmed) {
    try {
      await cancelOrder(order.id)
      await loadOrders()
    } catch (error) {
      console.error('Error cancelling order:', error)
    }
  }
}

onMounted(async () => {
  await Promise.all([
    loadOrders(),
    fetchPackages({ isActive: true })
  ])
})
</script>
