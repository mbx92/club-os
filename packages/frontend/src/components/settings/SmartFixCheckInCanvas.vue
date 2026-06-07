<template>
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>

        <!-- Canvas Panel -->
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-4xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">

              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-warning/10 rounded-lg">
                      <IconTool class="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Smart Fix CheckIn / CheckOut</h2>
                      <p class="text-sm text-base-content/70">
                        Deteksi & perbaiki tap yang disimpan di field yang salah
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

                <!-- Filter row -->
                <div class="mt-4 flex flex-wrap gap-3 items-end">
                  <div class="form-control">
                    <label class="label label-text text-xs pb-1">Start Date</label>
                    <input v-model="filters.startDate" type="date" class="input input-bordered input-sm" />
                  </div>
                  <div class="form-control">
                    <label class="label label-text text-xs pb-1">End Date</label>
                    <input v-model="filters.endDate" type="date" class="input input-bordered input-sm" />
                  </div>
                  <div class="form-control min-w-[220px]">
                    <label class="label label-text text-xs pb-1">Employee ID (opsional)</label>
                    <input v-model="filters.employeeId" type="text" class="input input-bordered input-sm font-mono" placeholder="UUID device employee" />
                  </div>
                  <button
                    class="btn btn-warning btn-sm gap-2"
                    :disabled="loading"
                    @click="runPreview"
                  >
                    <span v-if="loading && mode === 'preview'" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Preview
                  </button>
                </div>
              </div>

              <!-- Body -->
              <div class="flex-1 overflow-y-auto p-6 space-y-5">

                <!-- Idle state -->
                <div v-if="!loaded" class="text-center py-20 text-base-content/40">
                  <IconTool class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Preview</strong> untuk mendeteksi data yang perlu diperbaiki.</p>
                  <p class="text-xs mt-2 opacity-70">Mode preview tidak mengubah data.</p>
                </div>

                <!-- Loading -->
                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <!-- Results -->
                <template v-else>
                  <!-- Summary -->
                  <div v-if="result" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Total Fix</div>
                      <div class="stat-value text-2xl">{{ result.total }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">checkIn → checkOut</div>
                      <div class="stat-value text-2xl text-warning">{{ result.summary?.checkInToCheckOut ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">checkOut → checkIn</div>
                      <div class="stat-value text-2xl text-info">{{ result.summary?.checkOutToCheckIn ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Scanned</div>
                      <div class="stat-value text-2xl">{{ result.summary?.scannedRecords ?? 0 }}</div>
                    </div>
                  </div>

                  <!-- No fixes found -->
                  <div v-if="result && result.total === 0" class="text-center py-12">
                    <IconCircleCheck class="w-14 h-14 mx-auto mb-4 text-success opacity-70" />
                    <p class="text-lg font-semibold">Tidak ada data yang perlu diperbaiki</p>
                    <p class="text-sm text-base-content/60 mt-1">Semua checkIn/checkOut sudah berada di field yang benar.</p>
                  </div>

                  <!-- Fixes table -->
                  <div v-if="result && result.total > 0">
                    <!-- Mode badge -->
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="badge" :class="result.mode === 'dry_run' ? 'badge-warning' : 'badge-success'">
                          {{ result.mode === 'dry_run' ? 'Preview (Dry Run)' : 'Applied' }}
                        </span>
                        <span class="text-sm text-base-content/60">{{ result.total }} data ditemukan</span>
                      </div>
                      <button
                        v-if="result.mode === 'dry_run'"
                        class="btn btn-success btn-sm gap-2"
                        :disabled="loading"
                        @click="openConfirmApply"
                      >
                        <IconCheckbox class="w-4 h-4" />
                        Apply Fix
                      </button>
                      <div v-else class="flex items-center gap-2 text-success text-sm font-medium">
                        <IconCircleCheck class="w-5 h-5" />
                        Berhasil diapply
                      </div>
                    </div>

                    <div class="overflow-x-auto rounded-lg border border-base-300">
                      <table class="table table-sm table-zebra">
                        <thead>
                          <tr>
                            <th>Karyawan</th>
                            <th>Tanggal</th>
                            <th>Tap</th>
                            <th>Shift</th>
                            <th>Aksi</th>
                            <th>Jarak Start</th>
                            <th>Jarak End</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="fix in result.fixes" :key="fix.id">
                            <td class="font-medium">{{ fix.employee }}</td>
                            <td class="font-mono text-xs">{{ fix.date }}</td>
                            <td class="font-mono text-xs">{{ fix.tapTime?.slice(0, 5) }}</td>
                            <td class="font-mono text-xs whitespace-nowrap">{{ fix.shiftStart?.slice(0, 5) }}–{{ fix.shiftEnd?.slice(0, 5) }}</td>
                            <td>
                              <span
                                class="badge badge-sm whitespace-nowrap"
                                :class="fix.action === 'checkIn_to_checkOut' ? 'badge-warning' : 'badge-info'"
                              >
                                {{ fix.action === 'checkIn_to_checkOut' ? 'CI → CO' : 'CO → CI' }}
                              </span>
                            </td>
                            <td class="text-xs text-center">{{ fix.distToStart }} min</td>
                            <td class="text-xs text-center font-semibold text-success">{{ fix.distToEnd }} min</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </template>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Confirm Apply Dialog -->
  <dialog ref="confirmDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-2">Konfirmasi Apply Fix</h3>
      <p class="text-sm mb-1">
        Anda akan memperbaiki <strong>{{ result?.total }}</strong> record attendance secara permanen.
      </p>
      <div v-if="result?.summary" class="mt-3 space-y-1 text-sm">
        <div class="flex gap-2">
          <span class="badge badge-warning badge-sm">CI → CO</span>
          <span>{{ result.summary.checkInToCheckOut }} record</span>
        </div>
        <div class="flex gap-2">
          <span class="badge badge-info badge-sm">CO → CI</span>
          <span>{{ result.summary.checkOutToCheckIn }} record</span>
        </div>
      </div>
      <div class="alert alert-warning mt-4 text-sm">
        <IconAlertTriangle class="w-4 h-4 shrink-0" />
        <span>Aksi ini tidak dapat diurungkan. Pastikan preview sudah sesuai.</span>
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="confirmDialog?.close()">Batal</button>
        <button class="btn btn-sm btn-success" :disabled="loading" @click="runApply">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          Ya, Apply Fix
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconTool,
  IconX,
  IconSearch,
  IconAlertTriangle,
  IconCircleCheck,
  IconCheckbox,
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'close'])

const api = useApi()
const { showSuccess, handleError } = useNotification()

const BASE = '/gym/staff-attendance/fix-checkin'

const loaded = ref(false)
const loading = ref(false)
const mode = ref('preview')
const result = ref(null)
const confirmDialog = ref(null)

const filters = reactive({
  startDate: '',
  endDate: '',
  employeeId: '',
})

const buildParams = (dryRun) => {
  const p = { dryRun: String(dryRun) }
  if (filters.startDate) p.startDate = filters.startDate
  if (filters.endDate) p.endDate = filters.endDate
  if (filters.employeeId) p.employeeId = filters.employeeId
  return p
}

const runPreview = async () => {
  loading.value = true
  mode.value = 'preview'
  loaded.value = true
  result.value = null
  try {
    const params = buildParams(true)
    const res = await api.post(BASE, {}, { params })
    result.value = res
  } catch (err) {
    handleError(err, 'Gagal menjalankan preview fix')
  } finally {
    loading.value = false
  }
}

const openConfirmApply = () => {
  confirmDialog.value?.showModal()
}

const runApply = async () => {
  confirmDialog.value?.close()
  loading.value = true
  mode.value = 'apply'
  try {
    const params = buildParams(false)
    const res = await api.post(BASE, {}, { params })
    result.value = res
    showSuccess(`${res.total} data berhasil diperbaiki`)
  } catch (err) {
    handleError(err, 'Gagal mengapply fix')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.2s ease;
}
.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}
.canvas-enter-active .absolute.inset-y-0,
.canvas-leave-active .absolute.inset-y-0 {
  transition: transform 0.3s ease;
}
.canvas-enter-from .absolute.inset-y-0,
.canvas-leave-to .absolute.inset-y-0 {
  transform: translateX(100%);
}
</style>
