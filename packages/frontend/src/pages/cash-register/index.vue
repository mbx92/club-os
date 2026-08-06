<route lang="yaml">
meta:
  title: Cash Register
  layout: default
</route>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCashRegister } from '@/composables/gym/cash-register'
import { useShifts } from '@/composables/gym/useShifts'
import { useCurrency } from '@/composables/core/useCurrency'
import dayjs from 'dayjs'
import {
  IconCashRegister,
  IconClock,
  IconCash,
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconLock,
  IconDoorEnter,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconCalendar,
  IconFileReport,
  IconX,
  IconReceipt,
  IconArrowRight
} from '@tabler/icons-vue'

const router = useRouter()

const {
  currentSession,
  liveSummary,
  loading,
  error,
  inheritedOrders,
  getCurrentSession,
  openShift,
  closeShift
} = useCashRegister()

const { formatCurrency } = useCurrency()

// Master data shifts
const { shifts: masterShifts, fetchShifts: fetchMasterShifts } = useShifts()
const masterShiftsLoading = ref(false)

// Polling
let pollInterval = null

// Open shift form
const openForm = ref({
  shiftId: null,
  shiftName: '',
  openingNotes: '',
  openingBalance: 0,
})
const customShiftName = ref(false)

const showOpenModal = ref(false)

const openOpenShiftModal = () => {
  showOpenModal.value = true
}

const isBackOfficeShift = (shift) => {
  if (!shift) return false

  const candidateValues = [
    shift.type,
    shift.shiftType,
    shift.category,
    shift.module,
    shift.department,
    shift.division,
    shift.scope,
    shift.target,
    shift.workArea,
    shift.workType,
    shift.code,
    shift.name,
  ]

  return candidateValues.some(value => {
    const normalizedValue = String(value || '').trim().toLowerCase()
    return normalizedValue.includes('back office') || normalizedValue.includes('back_office') || normalizedValue.includes('backoffice')
  })
}

const getShiftSortPriority = (shift) => {
  const normalizedText = `${shift?.name || ''} ${shift?.code || ''}`.trim().toLowerCase()

  if (normalizedText.includes('morning')) return 0
  if (normalizedText.includes('middle')) return 1
  if (normalizedText.includes('evening')) return 2
  if (normalizedText.includes('midnight')) return 3

  return 99
}

// Active master shifts for presets
const activeShifts = computed(() => {
  return masterShifts.value
    .filter(s => s.isActive !== false && !isBackOfficeShift(s))
    .slice()
    .sort((leftShift, rightShift) => {
      const leftPriority = getShiftSortPriority(leftShift)
      const rightPriority = getShiftSortPriority(rightShift)

      if (leftPriority !== rightPriority) return leftPriority - rightPriority

      return String(leftShift?.name || '').localeCompare(String(rightShift?.name || ''), 'en', { sensitivity: 'base' })
    })
})

// Close shift form
const showCloseModal = ref(false)
const closeForm = ref({
  actualCash: 0,
  closingNotes: '',
  tipping: 0
})

// Close result
const showResultModal = ref(false)
const closeResult = ref(null)
const closedSessionId = ref(null)

// Active orders blocking dialog
const showActiveOrdersModal = ref(false)
const activeOrdersBlocking = ref([])
const activeOrdersMessage = ref('')

// Carried-over orders after closing with carryOverOrders:true
const carriedOverOrders = ref([])
const carryOverLoading = ref(false)

// Computed
const expectedCash = computed(() => {
  return liveSummary.value?.expectedCash ?? 0
})

const expectedCashWithTipping = computed(() => {
  const tip = parseFloat(closeForm.value.tipping) || 0
  return expectedCash.value + tip
})

const closeDifference = computed(() => {
  const actual = parseFloat(closeForm.value.actualCash) || 0
  // Kas fisik tidak bisa negatif. Jika expectedCash sudah negatif (kas keluar > kas masuk),
  // bandingkan terhadap 0 agar tidak muncul "Surplus" yang menyesatkan.
  const expectedBase = Math.max(0, expectedCashWithTipping.value)
  return actual - expectedBase
})

const closeDifferenceStatus = computed(() => {
  const diff = closeDifference.value
  if (diff === 0) return 'balance'
  return diff > 0 ? 'surplus' : 'deficit'
})

// Helpers
const formatShiftTime = (shift) => {
  if (!shift) return ''
  const start = shift.shiftStart?.substring(0, 5) || '—'
  const end = shift.shiftEnd?.substring(0, 5) || '—'
  return `${start} – ${end}`
}

// Methods
const loadCurrentSession = async () => {
  try {
    await getCurrentSession()
  } catch {
    // handled by composable
  }
}

const handleOpenShift = async () => {
  try {
    if (!openForm.value.shiftName) return

    const data = {
      shiftName: openForm.value.shiftName,
      openingBalance: parseFloat(openForm.value.openingBalance) || 0,
    }
    if (openForm.value.shiftId) data.shiftId = openForm.value.shiftId
    if (openForm.value.openingNotes) data.openingNotes = openForm.value.openingNotes

    await openShift(data)
    showOpenModal.value = false
    openForm.value = { shiftId: null, shiftName: activeShifts.value[0]?.name || '', openingNotes: '', openingBalance: 0 }
    if (activeShifts.value[0]) selectMasterShift(activeShifts.value[0])
    startPolling()
  } catch {
    // handled by composable
  }
}

const openCloseModal = () => {
  closeForm.value = {
    // If expectedCash is negative (more cash out than in), default to 0
    // so the user isn't blocked from submitting the form.
    actualCash: Math.max(0, expectedCash.value),
    closingNotes: '',
    tipping: 0
  }
  showCloseModal.value = true
}

const handleCloseShift = async (carryOver = false) => {
  if (!currentSession.value) return
  const sessionId = currentSession.value.id
  if (carryOver) carryOverLoading.value = true
  try {
    const result = await closeShift(sessionId, {
      actualCash: parseFloat(closeForm.value.actualCash) || 0,
      tipping: parseFloat(closeForm.value.tipping) || 0,
      closingNotes: closeForm.value.closingNotes || undefined,
      ...(carryOver ? { carryOverOrders: true } : {})
    })
    showCloseModal.value = false
    showActiveOrdersModal.value = false
    stopPolling()
    closedSessionId.value = sessionId

    // Capture carried-over orders (if carryOver:true response)
    carriedOverOrders.value = result?.carriedOverOrders || []

    // Show result modal
    closeResult.value = result?.summary || result?.data?.summary || {
      openingBalance: liveSummary.value?.openingBalance || 0,
      cashIn: liveSummary.value?.cashIn || 0,
      cashOut: liveSummary.value?.cashOut || 0,
      tipping: parseFloat(closeForm.value.tipping) || 0,
      expectedCash: expectedCash.value,
      expectedCashWithTipping: expectedCashWithTipping.value,
      actualCash: parseFloat(closeForm.value.actualCash) || 0,
      difference: closeDifference.value,
      status: closeDifferenceStatus.value
    }
    showResultModal.value = true
  } catch (err) {
    // Interceptor transforms 400 responses into: err.data = { success, message, data: { activeOrders } }
    const errPayload = err?.data || err?.response?.data
    if (errPayload?.data?.activeOrders?.length) {
      activeOrdersBlocking.value = errPayload.data.activeOrders
      activeOrdersMessage.value = errPayload.message || err?.message || 'Masih ada transaksi aktif yang harus diselesaikan sebelum menutup shift.'
      showCloseModal.value = false
      showActiveOrdersModal.value = true
    }
    // other errors already handled by composable (toast shown)
  } finally {
    carryOverLoading.value = false
  }
}

const handleCarryOverClose = () => handleCloseShift(true)

const closeResultAndReset = () => {
  showResultModal.value = false
  closeResult.value = null
  carriedOverOrders.value = []
  openForm.value = { shiftId: null, shiftName: activeShifts.value[0]?.name || '', openingNotes: '', openingBalance: 0 }
  if (activeShifts.value[0]) selectMasterShift(activeShifts.value[0])
}

const startPolling = () => {
  stopPolling()
  pollInterval = setInterval(() => {
    if (currentSession.value) getCurrentSession()
  }, 60000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const loadMasterShifts = async () => {
  masterShiftsLoading.value = true
  try {
    await fetchMasterShifts({ isActive: true })
    // Set default shift if no shift selected yet
    if (!openForm.value.shiftName && activeShifts.value.length > 0) {
      selectMasterShift(activeShifts.value[0])
    }
  } catch {
    // fallback handled in composable
  } finally {
    masterShiftsLoading.value = false
  }
}

const selectMasterShift = (shift) => {
  openForm.value.shiftId = shift.id
  openForm.value.shiftName = shift.name
  customShiftName.value = false
}

onMounted(async () => {
  await Promise.all([
    loadCurrentSession(),
    loadMasterShifts(),
  ])
  if (currentSession.value) startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <IconCashRegister class="w-8 h-8 text-primary" />
      <div>
        <h1 class="text-2xl font-bold">Cash Register</h1>
        <p class="text-sm text-base-content/60">Kelola shift kasir & petty cash</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !currentSession" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- ═══════════════ NO ACTIVE SESSION ═══════════════ -->
    <div v-else-if="!currentSession" class="space-y-6">
      <div class="alert alert-warning shadow-sm">
        <IconAlertTriangle class="w-6 h-6 shrink-0" />
        <div>
          <h3 class="font-bold">Belum ada shift aktif</h3>
          <p class="text-sm">Buka shift terlebih dahulu sebelum memulai transaksi hari ini.</p>
        </div>
        <button class="btn btn-sm btn-primary" @click="openOpenShiftModal">
          <IconDoorEnter class="w-4 h-4 mr-1" />
          Buka Shift
        </button>
      </div>

      <div class="alert alert-info shadow-sm">
        <IconInfoCircle class="w-5 h-5 shrink-0" />
        <div class="text-sm">
          <p class="font-semibold">Modal kasir</p>
          <p class="opacity-90 mt-0.5">
            Input kas fisik yang ada di laci saat buka shift (boleh 0 kalau laci kosong).
            Petty Cash tersedia terpisah sebagai sumber dana pengeluaran, tidak lagi jadi modal awal laci.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body items-center text-center py-16">
          <IconCashRegister class="w-16 h-16 text-base-content/20 mb-4" />
          <h3 class="text-lg font-semibold text-base-content/40">Tidak ada shift yang sedang berjalan</h3>
          <p class="text-sm text-base-content/30 max-w-md">Klik "Buka Shift" untuk memulai shift kasir hari ini.</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════ ACTIVE SESSION ═══════════════ -->
    <div v-else class="space-y-4">

      <!-- Hero Card -->
      <div class="rounded-2xl bg-base-100 border border-base-200 shadow-sm overflow-hidden">
        <!-- Top bar -->
        <div class="flex items-center justify-between px-6 pt-5 pb-4">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 rounded-xl p-2.5 text-primary">
              <IconCashRegister class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-xl font-bold capitalize tracking-tight">Shift {{ currentSession.shiftName }}</h2>
              <p class="text-sm text-base-content/60 flex items-center gap-1 mt-0.5">
                <IconClock class="w-3.5 h-3.5 shrink-0" />
                {{ dayjs(currentSession.shiftDate || currentSession.openedAt).format('dddd, DD MMM YYYY') }}
                &mdash; Dibuka {{ dayjs(currentSession.openedAt).format('HH:mm') }}
                <span v-if="currentSession.openedBy">
                  oleh <span class="font-semibold text-base-content">{{ currentSession.openedBy.firstName }} {{ currentSession.openedBy.lastName }}</span>
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Live badge -->
            <div class="hidden sm:flex items-center gap-1.5 bg-success/10 text-success rounded-full px-3 py-1.5 text-xs font-semibold">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              LIVE
            </div>
            <!-- Close button -->
            <button class="btn btn-sm btn-error btn-outline gap-1.5" @click="openCloseModal">
              <IconLock class="w-4 h-4" />
              Tutup Shift
            </button>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-base-200 mx-6"></div>

        <!-- Stats grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 divide-x divide-base-200">
          <div class="px-6 py-4">
            <div class="text-xs text-base-content/50 flex items-center gap-1 mb-1">
              <IconWallet class="w-3.5 h-3.5" />
              Modal Awal
            </div>
            <div class="text-xl font-bold">{{ formatCurrency(liveSummary?.openingBalance || 0) }}</div>
            <div v-if="currentSession?.pettyCashAccount" class="text-xs text-base-content/50 mt-0.5 truncate">
              dari {{ currentSession.pettyCashAccount.name }}
            </div>
          </div>
          <div class="px-6 py-4">
            <div class="text-xs text-base-content/50 flex items-center gap-1 mb-1">
              <IconArrowUpRight class="w-3.5 h-3.5" />
              Kas Masuk
            </div>
            <div class="text-xl font-bold text-success">{{ formatCurrency(liveSummary?.cashIn || 0) }}</div>
          </div>
          <div class="px-6 py-4">
            <div class="text-xs text-base-content/50 flex items-center gap-1 mb-1">
              <IconArrowDownRight class="w-3.5 h-3.5" />
              Kas Keluar
            </div>
            <div class="text-xl font-bold text-error">{{ formatCurrency(liveSummary?.cashOut || 0) }}</div>
          </div>
          <div class="px-6 py-4 bg-primary/5">
            <div class="text-xs text-primary/70 flex items-center gap-1 mb-1">
              <IconCash class="w-3.5 h-3.5" />
              Estimasi Kas
            </div>
            <div class="text-xl font-bold text-primary">{{ formatCurrency(expectedCash) }}</div>
          </div>
        </div>
      </div>

      <!-- Meta row -->
      <div class="flex flex-wrap items-center gap-3 text-sm text-base-content/60 px-1">
        <div class="flex items-center gap-1.5">
          <IconCalendar class="w-4 h-4" />
          Shift ke-{{ currentSession.shiftNumber || '1' }}
        </div>
        <div v-if="currentSession.location" class="flex items-center gap-1.5">
          <span class="text-base-content/30">·</span>
          {{ currentSession.location.name }}
        </div>
        <div v-if="liveSummary?.transactionCount != null" class="flex items-center gap-1.5">
          <span class="text-base-content/30">·</span>
          {{ liveSummary.transactionCount }} transaksi
        </div>
        <div class="ml-auto sm:hidden">
          <button class="btn btn-error btn-sm gap-1.5" @click="openCloseModal">
            <IconLock class="w-3.5 h-3.5" />
            Tutup Shift
          </button>
        </div>
      </div>


      <!-- Inherited orders banner (from previous shift) -->
      <div v-if="inheritedOrders.length > 0" class="alert alert-info shadow-sm">
        <IconArrowRight class="w-5 h-5 shrink-0" />
        <div class="flex-1">
          <span class="font-semibold">{{ inheritedOrders.length }} order dari shift sebelumnya</span>
          <p class="text-xs opacity-80 mt-0.5">Order berikut dilanjutkan ke shift ini dan sudah masuk ke ringkasan kas.</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="ord in inheritedOrders"
              :key="ord.id"
              class="badge badge-sm font-mono badge-info badge-outline"
            >{{ ord.transactionNumber }}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-xs" @click="inheritedOrders.splice(0)">✕</button>
      </div>
    </div>

    <!-- ═══════════════ OPEN SHIFT MODAL ═══════════════ -->
    <Teleport to="body">
    <dialog :class="['modal', showOpenModal && 'modal-open']">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <IconDoorEnter class="w-5 h-5 text-primary" />
          Buka Shift Baru
        </h3>

        <div class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Shift <span class="text-error">*</span></span></label>

            <div v-if="masterShiftsLoading" class="flex items-center gap-2 py-2">
              <span class="loading loading-spinner loading-xs"></span>
              <span class="text-sm text-base-content/50">Memuat data shift...</span>
            </div>

            <div v-else-if="!customShiftName && activeShifts.length > 0" class="space-y-2">
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="shift in activeShifts"
                  :key="shift.id"
                  type="button"
                  :class="['btn btn-sm capitalize', openForm.shiftId === shift.id ? 'btn-primary' : 'btn-outline']"
                  @click="selectMasterShift(shift)"
                >
                  <div v-if="shift.color" class="w-2.5 h-2.5 rounded-full mr-1" :style="{ backgroundColor: shift.color }"></div>
                  {{ shift.name }}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  @click="customShiftName = true; openForm.shiftId = null; openForm.shiftName = ''"
                >
                  Custom...
                </button>
              </div>
              <div v-if="openForm.shiftId" class="text-xs text-base-content/50 flex items-center gap-1">
                <IconClock class="w-3.5 h-3.5" />
                Jam: {{ formatShiftTime(activeShifts.find(s => s.id === openForm.shiftId)) }}
              </div>
            </div>

            <div v-else class="flex gap-2">
              <input
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="Nama shift..."
                v-model="openForm.shiftName"
              />
              <button
                v-if="activeShifts.length > 0"
                type="button"
                class="btn btn-sm btn-ghost"
                @click="selectMasterShift(activeShifts[0])"
              >
                Pilih Shift
              </button>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Modal Awal (kas fisik di laci)</span>
            </label>
            <input
              v-model="openForm.openingBalance"
              type="number"
              min="0"
              step="1000"
              class="input input-bordered w-full"
              placeholder="0"
            />
            <label class="label">
              <span class="label-text-alt text-base-content/50">Boleh dikosongkan / 0 kalau laci belum ada kas.</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Catatan</span></label>
            <textarea
              class="textarea textarea-bordered resize-none w-full"
              rows="2"
              v-model="openForm.openingNotes"
              placeholder="Opsional — e.g. Shift pagi, kasir A"
            ></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="showOpenModal = false">Batal</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="loading || !openForm.shiftName"
            @click="handleOpenShift"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            Buka Shift
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showOpenModal = false"></div>
    </dialog>
    </Teleport>

    <!-- ═══════════════ CLOSE SHIFT MODAL ═══════════════ -->
    <Teleport to="body">
    <dialog :class="['modal', showCloseModal && 'modal-open']">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <IconLock class="w-5 h-5 text-error" />
          Tutup Shift: <span class="capitalize">{{ currentSession?.shiftName }}</span>
        </h3>

        <!-- Summary -->
        <div class="bg-base-200 rounded-lg p-4 mb-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-base-content/60">Modal awal</span>
            <span class="font-medium text-right">
              {{ formatCurrency(liveSummary?.openingBalance || 0) }}
              <span v-if="currentSession?.pettyCashAccount" class="block text-xs font-normal text-base-content/50">
                ← {{ currentSession.pettyCashAccount.name }}
              </span>
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">Kas masuk</span>
            <span class="font-medium text-success">{{ formatCurrency(liveSummary?.cashIn || 0) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">Kas keluar</span>
            <span class="font-medium text-error">{{ formatCurrency(liveSummary?.cashOut || 0) }}</span>
          </div>
          <div class="divider my-1"></div>
          <div class="flex justify-between font-bold">
            <span>Kas Penjualan</span>
            <span class="text-primary">{{ formatCurrency(expectedCash) }}</span>
          </div>
          <div v-if="parseFloat(closeForm.tipping) > 0" class="flex justify-between font-bold text-success">
            <span>Tipping (+)</span>
            <span>{{ formatCurrency(parseFloat(closeForm.tipping) || 0) }}</span>
          </div>
          <div v-if="parseFloat(closeForm.tipping) > 0" class="flex justify-between font-bold text-lg mt-1 pt-1 border-t border-base-300">
            <span>Total Diharapkan</span>
            <span class="text-primary">{{ formatCurrency(expectedCashWithTipping) }}</span>
          </div>
        </div>

        <!-- Tipping Input -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Tipping <span class="text-base-content/50 text-xs font-normal">(Tambahan di luar sistem)</span></span></label>
          <input
            type="number"
            class="input input-bordered w-full text-success font-semibold"
            v-model.number="closeForm.tipping"
            min="0"
            placeholder="0"
          />
        </div>

        <!-- Actual Cash Input -->
        <div class="form-control mb-4">
          <div class="flex justify-between items-end">
            <label class="label"><span class="label-text">Kas Aktual (hitung fisik) <span class="text-error">*</span></span></label>
            <button
              v-if="closeDifference !== 0"
              type="button"
              class="btn btn-xs btn-ghost text-primary mb-1 font-semibold"
              @click="closeForm.actualCash = expectedCashWithTipping"
            >
              Samakan dgn Target
            </button>
          </div>
          <input
            type="number"
            class="input input-bordered w-full"
            v-model.number="closeForm.actualCash"
            min="0"
            placeholder="0"
          />
        </div>

        <!-- Live Difference Preview -->
        <div
          class="alert mb-4 items-start"
          :class="{
            'alert-success': closeDifferenceStatus === 'balance',
            'alert-info': closeDifferenceStatus === 'surplus',
            'alert-error': closeDifferenceStatus === 'deficit'
          }"
        >
          <IconCheck v-if="closeDifferenceStatus === 'balance'" class="w-5 h-5 shrink-0 mt-0.5" />
          <IconInfoCircle v-else-if="closeDifferenceStatus === 'surplus'" class="w-5 h-5 shrink-0 mt-0.5" />
          <IconAlertTriangle v-else class="w-5 h-5 shrink-0 mt-0.5" />
          <div class="w-full">
            <span class="text-sm font-semibold block">
              Selisih: {{ formatCurrency(Math.abs(closeDifference)) }}
              <span class="text-xs ml-1 font-normal inline-block">
                <template v-if="closeDifferenceStatus === 'balance'">(Pas)</template>
                <template v-else-if="closeDifferenceStatus === 'surplus'">(Surplus — kas lebih)</template>
                <template v-else>(Deficit — kas kurang)</template>
              </span>
            </span>
            <!-- Bantuan UX untuk Tipping -->
            <p 
              v-if="closeDifferenceStatus === 'deficit' && parseFloat(closeForm.tipping) > 0 && Math.abs(closeDifference) === parseFloat(closeForm.tipping)"
              class="text-xs mt-1.5 opacity-90 leading-tight"
            >
              💡 <strong>Tips UX:</strong> Apakah selisih ini karena tipping? Tambahkan tipping ke <strong>Kas Aktual</strong> atau klik "Samakan dgn Target".
            </p>
          </div>
        </div>

        <!-- Closing Notes -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Catatan Penutupan</span></label>
          <textarea
            class="textarea textarea-bordered resize-none w-full"
            rows="2"
            v-model="closeForm.closingNotes"
            placeholder="e.g. Kurang 10rb, kemungkinan kembalian keliru"
          ></textarea>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showCloseModal = false">Batal</button>
          <button
            class="btn btn-error"
            :disabled="loading"
            @click="handleCloseShift"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            <IconLock class="w-4 h-4" />
            Tutup Shift
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showCloseModal = false"></div>
    </dialog>
    </Teleport>

    <!-- ═══════════════ ACTIVE ORDERS BLOCKING MODAL ═══════════════ -->
    <Teleport to="body">
    <dialog :class="['modal', showActiveOrdersModal && 'modal-open']">
      <div class="modal-box max-w-md">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center shrink-0">
            <IconAlertTriangle class="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 class="font-bold text-lg leading-tight">Shift Tidak Bisa Ditutup</h3>
            <p class="text-xs text-base-content/50">Selesaikan semua transaksi aktif terlebih dahulu</p>
          </div>
        </div>

        <div class="alert alert-error alert-sm my-4 text-sm">
          <IconAlertTriangle class="w-4 h-4 shrink-0" />
          <span>{{ activeOrdersMessage }}</span>
        </div>

        <!-- Order list -->
        <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
          <div
            v-for="order in activeOrdersBlocking"
            :key="order.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-200"
          >
            <IconReceipt class="w-4 h-4 text-base-content/40 shrink-0" />
            <span class="flex-1 text-sm font-mono font-semibold tracking-wide">{{ order.transactionNumber }}</span>
            <span
              class="badge badge-sm capitalize"
              :class="{
                'badge-warning': order.status === 'pending',
                'badge-primary': order.status === 'preparing',
                'badge-info': order.status === 'confirmed',
                'badge-accent': order.status === 'ready',
                'badge-ghost': order.status === 'split'
              }"
            >{{ order.status }}</span>
          </div>
        </div>

        <p class="text-xs text-base-content/50 mt-3 leading-relaxed">
          Selesaikan semua order di atas, atau lanjutkan order ke shift berikutnya.
        </p>

        <div class="divider text-xs text-base-content/40 my-3">Pilih tindakan</div>

        <div class="flex flex-col gap-2">
          <!-- Option A: settle first -->
          <button class="btn btn-outline w-full" @click="showActiveOrdersModal = false">
            <IconX class="w-4 h-4" />
            Selesaikan Dulu
          </button>
          <!-- Option B: carry over to next shift -->
          <button
            class="btn btn-warning w-full"
            :disabled="carryOverLoading || loading"
            @click="handleCarryOverClose"
          >
            <span v-if="carryOverLoading" class="loading loading-spinner loading-xs"></span>
            <IconArrowRight v-else class="w-4 h-4" />
            Lanjutkan ke Shift Berikutnya
          </button>
          <p class="text-xs text-base-content/40 text-center leading-tight">
            Order akan otomatis masuk ke hitungan shift yang baru dibuka.
          </p>
        </div>
      </div>
      <div class="modal-backdrop" @click="showActiveOrdersModal = false"></div>
    </dialog>
    </Teleport>

    <!-- ═══════════════ CLOSE RESULT MODAL ═══════════════ -->
    <Teleport to="body">
    <dialog :class="['modal', showResultModal && 'modal-open']">
      <div class="modal-box max-w-sm text-center">
        <div class="mb-4">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            :class="{
              'bg-success/20': closeResult?.status === 'balance',
              'bg-info/20': closeResult?.status === 'surplus',
              'bg-error/20': closeResult?.status === 'deficit'
            }"
          >
            <IconCheck v-if="closeResult?.status === 'balance'" class="w-8 h-8 text-success" />
            <IconArrowUpRight v-else-if="closeResult?.status === 'surplus'" class="w-8 h-8 text-info" />
            <IconAlertTriangle v-else class="w-8 h-8 text-error" />
          </div>
        </div>

        <h3 class="font-bold text-lg mb-4">Shift Ditutup</h3>

        <div class="space-y-2 text-sm bg-base-200 rounded-lg p-4 text-left mb-4">
          <div class="flex justify-between">
            <span class="text-base-content/60">Kas penjualan</span>
            <span class="font-medium">{{ formatCurrency(closeResult?.expectedCash || 0) }}</span>
          </div>
          <div class="flex justify-between" v-if="closeResult?.tipping > 0">
            <span class="text-base-content/60">Tipping</span>
            <span class="font-medium text-success">+ {{ formatCurrency(closeResult?.tipping || 0) }}</span>
          </div>
          <div class="flex justify-between font-semibold pt-1 border-t border-base-300" v-if="closeResult?.tipping > 0">
            <span>Total diharapkan</span>
            <span class="text-primary">{{ formatCurrency(closeResult?.expectedCashWithTipping || (closeResult?.expectedCash + closeResult?.tipping) || 0) }}</span>
          </div>
          <div class="flex justify-between mt-2">
            <span class="text-base-content/60">Kas aktual (Fisik)</span>
            <span class="font-medium">{{ formatCurrency(closeResult?.actualCash || 0) }}</span>
          </div>
          <div class="divider my-1"></div>
          <div class="flex justify-between font-bold">
            <span>Selisih</span>
            <span
              :class="{
                'text-success': closeResult?.status === 'balance',
                'text-info': closeResult?.status === 'surplus',
                'text-error': closeResult?.status === 'deficit'
              }"
            >
              {{ closeResult?.difference >= 0 ? '+' : '' }}{{ formatCurrency(closeResult?.difference || 0) }}
              <span class="badge badge-sm ml-1 uppercase" :class="{
                'badge-success': closeResult?.status === 'balance',
                'badge-info': closeResult?.status === 'surplus',
                'badge-error': closeResult?.status === 'deficit'
              }">{{ closeResult?.status }}</span>
            </span>
          </div>
        </div>

        <!-- Carried-over orders info -->
        <div v-if="carriedOverOrders.length > 0" class="alert alert-warning text-left mb-4 items-start gap-3">
          <IconArrowRight class="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold">{{ carriedOverOrders.length }} order dilanjutkan ke shift berikutnya</p>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <span
                v-for="ord in carriedOverOrders"
                :key="ord.id"
                class="badge badge-sm font-mono badge-warning"
              >{{ ord.transactionNumber }}</span>
            </div>
          </div>
        </div>

        <div class="modal-action justify-center gap-2">
          <button class="btn btn-ghost" @click="closeResultAndReset">Tutup</button>
          <button
            v-if="closedSessionId"
            class="btn btn-primary gap-1"
            @click="closeResultAndReset(); router.push(`/cash-register/${closedSessionId}/report`)"
          >
            <IconFileReport class="w-4 h-4" />
            Lihat Report
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeResultAndReset"></div>
    </dialog>
    </Teleport>
  </div>
</template>
