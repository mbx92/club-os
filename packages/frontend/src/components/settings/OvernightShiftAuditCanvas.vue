<template>
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>

        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-5xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              <div class="px-6 py-4 bg-base-200 border-b border-base-300 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-warning/10">
                      <IconMoon class="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Audit Shift Malam</h2>
                      <p class="text-sm text-base-content/70">
                        Cek schedule overnight yang kemungkinan tersimpan di tanggal checkout
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

                <div class="mt-4 flex flex-wrap gap-3 items-end">
                  <div class="form-control">
                    <label class="label label-text text-xs pb-1">Schedule Date From</label>
                    <input v-model="filters.startDate" type="date" class="input input-bordered input-sm" />
                  </div>
                  <div class="form-control">
                    <label class="label label-text text-xs pb-1">Schedule Date To</label>
                    <input v-model="filters.endDate" type="date" class="input input-bordered input-sm" />
                  </div>
                  <div class="form-control min-w-[220px]">
                    <label class="label label-text text-xs pb-1">Employee No / UUID</label>
                    <input
                      v-model="filters.employeeQuery"
                      type="text"
                      class="input input-bordered input-sm"
                      placeholder="contoh: 130 atau UUID"
                    />
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

              <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <div v-if="!loaded" class="text-center py-20 text-base-content/40">
                  <IconMoon class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Preview</strong> untuk melihat kandidat masalah shift malam.</p>
                  <p class="text-xs mt-2 opacity-70">Preview tidak mengubah data apa pun.</p>
                </div>

                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <template v-else>
                  <div v-if="result" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Kandidat</div>
                      <div class="stat-value text-2xl">{{ result.total }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Fixable</div>
                      <div class="stat-value text-2xl text-success">{{ result.summary?.fixable ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Blocked</div>
                      <div class="stat-value text-2xl text-warning">{{ result.summary?.blocked ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Overnight Schedules</div>
                      <div class="stat-value text-2xl">{{ result.summary?.overnightSchedules ?? 0 }}</div>
                    </div>
                  </div>

                  <div v-if="result && result.total === 0" class="text-center py-12">
                    <IconCircleCheck class="w-14 h-14 mx-auto mb-4 text-success opacity-70" />
                    <p class="text-lg font-semibold">Tidak ada kandidat masalah shift malam</p>
                    <p class="text-sm text-base-content/60 mt-1">
                      Tidak ditemukan schedule overnight yang tampak tersimpan di tanggal checkout.
                    </p>
                  </div>

                  <div v-if="result && result.total > 0" class="space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <span class="badge" :class="result.mode === 'dry_run' ? 'badge-warning' : 'badge-success'">
                          {{ result.mode === 'dry_run' ? 'Preview (Dry Run)' : 'Applied' }}
                        </span>
                        <span class="text-sm text-base-content/60">
                          {{ result.summary?.fixable ?? 0 }} bisa difix dari {{ result.total }} kandidat
                        </span>
                      </div>
                      <button
                        v-if="result.mode === 'dry_run'"
                        class="btn btn-success btn-sm gap-2"
                        :disabled="loading || (result.summary?.fixable ?? 0) === 0"
                        @click="openConfirmApply"
                      >
                        <IconTool class="w-4 h-4" />
                        Apply Fixable
                      </button>
                      <div v-else class="flex items-center gap-2 text-success text-sm font-medium">
                        <IconCircleCheck class="w-5 h-5" />
                        Fix sudah dijalankan
                      </div>
                    </div>

                    <div class="space-y-3">
                      <div
                        v-for="item in result.fixes"
                        :key="item.issueKey"
                        class="rounded-xl border p-4"
                        :class="item.canFix ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'"
                      >
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div class="flex items-center gap-2 flex-wrap">
                              <h3 class="font-semibold">
                                {{ item.employeeNo || '-' }} - {{ item.employeeName || 'Tanpa nama' }}
                              </h3>
                              <span class="badge badge-sm" :class="item.canFix ? 'badge-success' : 'badge-warning'">
                                {{ item.canFix ? 'Fixable' : 'Blocked' }}
                              </span>
                            </div>
                            <p class="text-sm text-base-content/70 mt-1">{{ item.reason }}</p>
                          </div>
                          <div class="text-xs font-mono text-base-content/60">
                            scheduleId: {{ item.scheduleId }}
                          </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
                          <div class="rounded-lg bg-base-100/80 border border-base-300 p-3">
                            <div class="text-xs text-base-content/60 mb-1">Tanggal Schedule</div>
                            <div class="font-mono">{{ item.currentScheduleDate }}</div>
                            <div class="text-xs mt-1 text-success">Saran: {{ item.suggestedScheduleDate }}</div>
                          </div>
                          <div class="rounded-lg bg-base-100/80 border border-base-300 p-3">
                            <div class="text-xs text-base-content/60 mb-1">Shift</div>
                            <div class="font-mono">{{ shortTime(item.shiftStart) }} - {{ shortTime(item.shiftEnd) }}</div>
                          </div>
                          <div class="rounded-lg bg-base-100/80 border border-base-300 p-3">
                            <div class="text-xs text-base-content/60 mb-1">Tap Mulai Terdeteksi</div>
                            <div class="font-mono text-xs">{{ item.detectedStartTapLocal || '-' }}</div>
                          </div>
                          <div class="rounded-lg bg-base-100/80 border border-base-300 p-3">
                            <div class="text-xs text-base-content/60 mb-1">Tap Selesai Terdeteksi</div>
                            <div class="font-mono text-xs">{{ item.detectedEndTapLocal || '-' }}</div>
                          </div>
                        </div>

                        <div class="mt-4">
                          <div class="text-xs uppercase tracking-wide text-base-content/60 mb-2">
                            Attendance Terkait ({{ item.relatedAttendanceCount }})
                          </div>
                          <div v-if="item.relatedAttendances?.length" class="overflow-x-auto rounded-lg border border-base-300">
                            <table class="table table-sm">
                              <thead>
                                <tr>
                                  <th>Tanggal</th>
                                  <th>Check In</th>
                                  <th>Check Out</th>
                                  <th>Schedule Link</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="att in item.relatedAttendances" :key="att.id">
                                  <td class="font-mono text-xs">{{ att.date }}</td>
                                  <td class="font-mono text-xs">{{ att.checkInLocal || '-' }}</td>
                                  <td class="font-mono text-xs">{{ att.checkOutLocal || '-' }}</td>
                                  <td>
                                    <span class="badge badge-ghost badge-xs">
                                      {{ att.scheduleId ? 'linked' : 'unlinked' }}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div v-else class="text-sm text-base-content/60">
                            Belum ada attendance yang terkait ke shift ini.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="result.mode === 'applied' && result.applied?.length" class="space-y-2">
                      <div class="text-sm font-semibold">Hasil Fix</div>
                      <div
                        v-for="item in result.applied"
                        :key="item.scheduleId"
                        class="alert alert-success text-sm"
                      >
                        <IconCircleCheck class="w-4 h-4 shrink-0" />
                        <span>
                          {{ item.employeeNo || '-' }} dipindah dari {{ item.fromDate }} ke {{ item.toDate }}
                          <span class="font-mono">({{ shortTime(item.shiftStart) }} - {{ shortTime(item.shiftEnd) }})</span>
                          dengan attendance {{ item.checkInLocal || '-' }} sampai {{ item.checkOutLocal || '-' }}.
                        </span>
                      </div>
                    </div>

                    <div v-if="result.mode === 'applied' && result.skipped?.length" class="space-y-2">
                      <div class="text-sm font-semibold text-warning">Skipped</div>
                      <div
                        v-for="item in result.skipped"
                        :key="`${item.scheduleId}-${item.reason}`"
                        class="alert alert-warning text-sm"
                      >
                        <IconAlertTriangle class="w-4 h-4 shrink-0" />
                        <span>{{ item.employeeNo || '-' }}: {{ item.reason }}</span>
                      </div>
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

  <dialog ref="confirmDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-2">Konfirmasi Fix Shift Malam</h3>
      <p class="text-sm">
        Sistem akan memindahkan <strong>{{ result?.summary?.fixable ?? 0 }}</strong> schedule overnight
        ke tanggal mulai shift, menghapus attendance terkait yang salah, lalu rebuild dari raw log.
      </p>
      <div class="alert alert-warning mt-4 text-sm">
        <IconAlertTriangle class="w-4 h-4 shrink-0" />
        <span>Aksi ini permanen. Jalankan hanya setelah hasil preview terlihat benar.</span>
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
import dayjs from 'dayjs'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconMoon,
  IconX,
  IconSearch,
  IconTool,
  IconAlertTriangle,
  IconCircleCheck,
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const api = useApi()
const { showSuccess, handleError } = useNotification()

const BASE = '/gym/staff-attendance/fix-overnight'

const loaded = ref(false)
const loading = ref(false)
const mode = ref('preview')
const result = ref(null)
const confirmDialog = ref(null)

const filters = reactive({
  startDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  employeeQuery: '',
})

const shortTime = (value) => value ? String(value).slice(0, 5) : '-'

const buildParams = (dryRun) => {
  const params = { dryRun: String(dryRun) }
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.employeeQuery) params.employeeQuery = filters.employeeQuery
  return params
}

const runPreview = async () => {
  loading.value = true
  loaded.value = true
  mode.value = 'preview'
  result.value = null

  try {
    const response = await api.post(BASE, {}, { params: buildParams(true) })
    result.value = response
  } catch (error) {
    handleError(error, 'Gagal menjalankan preview audit shift malam')
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
    const response = await api.post(BASE, {}, { params: buildParams(false) })
    result.value = response
    showSuccess(`${response.summary?.applied ?? 0} shift malam berhasil diperbaiki`)
  } catch (error) {
    handleError(error, 'Gagal mengapply fix shift malam')
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
