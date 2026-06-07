<route lang="yaml">
meta:
  title: Detail Pesanan
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Order Details -->
    <div v-else-if="order">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">{{ order.orderNumber }}</h1>
          <p class="text-base-content/60 mt-1">Detail pesanan</p>
        </div>
        <div class="badge badge-lg" :class="getPaymentStatusClass(order.status)">
          {{ getPaymentStatusLabel(order.status) }}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Patient Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Informasi Pasien</h2>
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-2xl font-bold leading-none">{{ order.patient?.name?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold uppercase">{{ order.patient?.name }}</h3>
                  <p class="text-base-content/60">{{ order.patient?.email || order.patient?.phone }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sessions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Sesi Tes</h2>
              
              <div class="space-y-4">
                <div 
                  v-for="session in order.sessions" 
                  :key="session.id"
                  class="border border-base-300 rounded-lg p-4"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-bold">{{ session.testType?.name }}</h3>
                      <p class="text-sm text-base-content/60">{{ session.testType?.code }}</p>
                    </div>
                    <div class="badge" :class="getSessionStatusClass(session.status)">
                      {{ getSessionStatusLabel(session.status) }}
                    </div>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p class="text-base-content/60">Durasi</p>
                      <p class="font-medium">{{ session.testType?.durationMinutes }} menit</p>
                    </div>
                    <div>
                      <p class="text-base-content/60">Jumlah Soal</p>
                      <p class="font-medium">{{ session.testType?.questionCount }} soal</p>
                    </div>
                    <div v-if="session.startedAt">
                      <p class="text-base-content/60">Mulai</p>
                      <p class="font-medium">{{ formatDateTime(session.startedAt) }}</p>
                    </div>
                    <div v-if="session.completedAt">
                      <p class="text-base-content/60">Selesai</p>
                      <p class="font-medium">{{ formatDateTime(session.completedAt) }}</p>
                    </div>
                  </div>

                  <!-- View Result Button -->
                  <div v-if="session.status === 'completed'" class="mt-4 pt-4 border-t border-base-300">
                    <router-link 
                      :to="`/psychology/results/${session.id}`"
                      class="btn btn-primary btn-sm"
                    >
                      <IconChartBar class="w-4 h-4 mr-1" />
                      Lihat Hasil
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="order.notes" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Catatan</h2>
              <p class="text-base-content/80 whitespace-pre-line">{{ order.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Order Summary -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Ringkasan</h2>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Paket</span>
                  <span class="font-medium">{{ order.package?.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Tanggal Order</span>
                  <span>{{ formatDate(order.createdAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Berlaku Hingga</span>
                  <span :class="{ 'text-error': isOrderExpired(order.expiresAt) }">
                    {{ formatDate(order.expiresAt) }}
                  </span>
                </div>
                <div class="divider my-2"></div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Harga Dasar</span>
                  <span>{{ formatPrice(order.pricing?.baseAmount) }}</span>
                </div>
                <div v-if="order.pricing?.discountAmount > 0" class="flex justify-between text-success">
                  <span>Diskon</span>
                  <span>-{{ formatPrice(order.pricing?.discountAmount) }}</span>
                </div>
                <div class="divider my-2"></div>
                <div class="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span class="text-primary">{{ formatPrice(order.pricing?.finalAmount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Access Link -->
          <div v-if="['paid', 'in_progress', 'completed'].includes(order.status) && !isOrderExpired(order.expiresAt)" class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Akses Tes</h2>
              
              <!-- Access Token -->
              <div v-if="order.accessToken" class="mb-4">
                <p class="text-sm text-base-content/60 mb-2">Kode Akses:</p>
                <div class="flex items-center gap-2">
                  <code class="text-lg font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                    {{ order.accessToken }}
                  </code>
                  <button 
                    class="btn btn-ghost btn-sm btn-square"
                    @click="copyAccessToken"
                  >
                    <IconCopy class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Access URL -->
              <div>
                <p class="text-sm text-base-content/60 mb-2">
                  Link Akses Tes:
                </p>
                <div class="bg-base-200 rounded-lg p-3 break-all text-sm font-mono">
                  {{ order.accessUrl }}
                </div>
              </div>

              <div class="flex gap-2 mt-3">
                <button class="btn btn-primary flex-1" @click="copyAccessLink">
                  <IconCopy class="w-4 h-4" />
                  Salin Link
                </button>
                <button class="btn btn-outline" @click="regenerateToken" title="Generate token baru">
                  <IconRefresh class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi</h2>
              <div class="space-y-2">
                <button 
                  v-if="order.status === 'pending'"
                  class="btn btn-success btn-block"
                  @click="openPaymentModal"
                >
                  <IconCash class="w-4 h-4" />
                  Proses Pembayaran
                </button>
                <button 
                  v-if="order.status === 'pending'"
                  class="btn btn-error btn-outline btn-block"
                  @click="confirmCancel"
                >
                  <IconX class="w-4 h-4" />
                  Batalkan Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconReceiptOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Pesanan Tidak Ditemukan</h3>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Payment Modal -->
    <dialog ref="paymentModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Proses Pembayaran</h3>
        
        <div class="space-y-4">
          <div class="bg-base-200 rounded-lg p-4">
            <p class="text-sm text-base-content/60">Total Pembayaran</p>
            <p class="text-2xl font-bold text-primary">{{ formatPrice(order?.pricing?.finalAmount) }}</p>
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
            Konfirmasi
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconChartBar,
  IconCopy,
  IconRefresh,
  IconCash,
  IconX,
  IconReceiptOff
} from '@tabler/icons-vue'
import { useOrders } from '@/composables/psychology'
import { useDialog } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { BANK_OPTIONS, BANK_SELECTION_PAYMENT_METHODS, buildPaymentBankPayload } from '@/utils/paymentBanks'

const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const { showSuccess } = useNotification()

const {
  order,
  loading,
  getOrderById,
  processPayment,
  regenerateToken: regenerate,
  cancelOrder,
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getSessionStatusClass,
  getSessionStatusLabel,
  formatPrice,
  formatDate,
  formatDateTime,
  isOrderExpired
} = useOrders()

const paymentModal = ref(null)
const paymentMethod = ref('cash')
const paymentBank = ref('')
const processingPayment = ref(false)

const loadOrder = async () => {
  const orderId = route.params.id
  try {
    await getOrderById(orderId)
  } catch (error) {
    console.error('Error loading order:', error)
  }
}

const goBack = () => {
  router.push('/psychology/orders')
}

const copyAccessLink = async () => {
  if (order.value?.accessUrl) {
    try {
      await navigator.clipboard.writeText(order.value.accessUrl)
      showSuccess('Link berhasil disalin!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

const copyAccessToken = async () => {
  if (order.value?.accessToken) {
    try {
      await navigator.clipboard.writeText(order.value.accessToken)
      showSuccess('Kode akses berhasil disalin!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

const regenerateToken = async () => {
  try {
    await regenerate(order.value.id)
    await loadOrder()
  } catch (error) {
    console.error('Error regenerating token:', error)
  }
}

const openPaymentModal = () => {
  paymentMethod.value = 'cash'
  paymentBank.value = ''
  paymentModal.value?.showModal()
}

const confirmPayment = async () => {
  processingPayment.value = true
  try {
    await processPayment(order.value.id, {
      paymentMethod: paymentMethod.value,
      ...buildPaymentBankPayload(paymentMethod.value, paymentBank.value)
    })
    paymentModal.value?.close()
    paymentBank.value = ''
    await loadOrder()
  } catch (error) {
    console.error('Error processing payment:', error)
  } finally {
    processingPayment.value = false
  }
}

const confirmCancel = async () => {
  const confirmed = await dialog.confirm({
    title: 'Batalkan Pesanan',
    message: 'Apakah Anda yakin ingin membatalkan pesanan ini?',
    type: 'warning',
    confirmText: 'Batalkan',
    cancelText: 'Kembali'
  })

  if (confirmed) {
    try {
      await cancelOrder(order.value.id)
      router.push('/psychology/orders')
    } catch (error) {
      console.error('Error cancelling order:', error)
    }
  }
}

onMounted(() => {
  loadOrder()
})
</script>
