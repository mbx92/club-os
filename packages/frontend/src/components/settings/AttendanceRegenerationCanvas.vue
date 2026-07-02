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
          <div class="w-screen max-w-4xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              <div class="px-6 py-4 bg-base-200 border-b border-base-300 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-success/10">
                      <IconRefresh class="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Generate Attendance dari Log</h2>
                      <p class="text-sm text-base-content/70">
                        Rebuild attendance dari raw log yang sudah matched ke employee dan schedule
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

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
                    <label class="label label-text text-xs pb-1">Employee No / UUID</label>
                    <input
                      v-model="filters.employeeQuery"
                      type="text"
                      class="input input-bordered input-sm"
                      placeholder="opsional"
                    />
                  </div>
                  <label class="label cursor-pointer gap-2 pb-2">
                    <input v-model="filters.forceAll" type="checkbox" class="checkbox checkbox-sm" />
                    <span class="label-text text-sm">Force all employees with logs</span>
                  </label>
                  <button class="btn btn-warning btn-sm gap-2" :disabled="loading" @click="runPreview">
                    <span v-if="loading && mode === 'preview'" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Preview
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <div v-if="!loaded" class="text-center py-20 text-base-content/40">
                  <IconRefresh class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Preview</strong> untuk melihat employee yang akan diregenerate.</p>
                  <p class="text-xs mt-2 opacity-70">Cron job otomatis juga akan menjalankan versi aman tiap 1 jam.</p>
                </div>

                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <template v-else-if="result">
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Tenants</div>
                      <div class="stat-value text-2xl">{{ result.summary?.tenantsScanned ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Employees Scan</div>
                      <div class="stat-value text-2xl">{{ result.summary?.employeesScanned ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Need Repair</div>
                      <div class="stat-value text-2xl text-warning">{{ result.summary?.employeesToRepair ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Logs Scan</div>
                      <div class="stat-value text-2xl">{{ result.summary?.logsScanned ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Attendances</div>
                      <div class="stat-value text-2xl">{{ result.summary?.attendancesInWindow ?? 0 }}</div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span class="badge" :class="result.mode === 'dry_run' ? 'badge-warning' : 'badge-success'">
                        {{ result.mode === 'dry_run' ? 'Preview (Dry Run)' : 'Applied' }}
                      </span>
                      <span class="text-sm text-base-content/60">
                        {{ result.summary?.employeesToRepair ?? 0 }} employee kandidat regenerate
                      </span>
                    </div>
                    <button
                      v-if="result.mode === 'dry_run'"
                      class="btn btn-success btn-sm gap-2"
                      :disabled="loading || (result.summary?.employeesToRepair ?? 0) === 0"
                      @click="openConfirmApply"
                    >
                      <IconPlayerPlay class="w-4 h-4" />
                      Generate Manual
                    </button>
                  </div>

                  <div v-if="result.summary?.employeesToRepair === 0" class="alert alert-success">
                    <IconCircleCheck class="w-5 h-5" />
                    <span>Tidak ada employee yang perlu diregenerate pada rentang ini.</span>
                  </div>

                  <div v-for="tenant in result.tenants || []" :key="tenant.tenantId" class="space-y-3">
                    <div class="text-sm font-semibold">
                      {{ tenant.tenantName }} <span class="text-base-content/50">({{ tenant.timezone }})</span>
                    </div>

                    <div v-if="tenant.employees.length === 0" class="text-sm text-base-content/60">
                      Tidak ada kandidat regenerate di tenant ini.
                    </div>

                    <div v-else class="overflow-x-auto rounded-lg border border-base-300">
                      <table class="table table-sm table-zebra">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Reason</th>
                            <th>Logs</th>
                            <th>Attendance</th>
                            <th>Schedules</th>
                            <th>Window</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in tenant.employees" :key="item.employeeId">
                            <td class="font-medium">{{ item.employeeNo }} - {{ item.employeeName }}</td>
                            <td class="text-xs">{{ item.reason }}</td>
                            <td class="text-center">{{ item.logCount }}</td>
                            <td class="text-center">{{ item.attendanceCount }}</td>
                            <td class="text-center">{{ item.scheduleCount }}</td>
                            <td class="font-mono text-xs">
                              {{ item.logWindow?.first || '-' }}<br />
                              {{ item.logWindow?.last || '-' }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div v-if="result.mode === 'applied' && result.applied?.length" class="space-y-2">
                    <div class="text-sm font-semibold">Applied</div>
                    <div v-for="item in result.applied" :key="item.employeeId" class="alert alert-success text-sm">
                      <IconCircleCheck class="w-4 h-4 shrink-0" />
                      <span>
                        {{ item.employeeNo }} - {{ item.employeeName }}:
                        {{ item.deletedCount }} attendance dihapus, {{ item.rebuiltCount }} dibangun ulang dari {{ item.logsProcessed }} log.
                      </span>
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
      <h3 class="font-bold text-lg mb-2">Konfirmasi Generate Manual</h3>
      <p class="text-sm">
        Sistem akan menghapus lalu membangun ulang attendance employee kandidat pada rentang ini berdasarkan raw log yang sudah matched.
      </p>
      <div class="alert alert-warning mt-4 text-sm">
        <IconAlertTriangle class="w-4 h-4 shrink-0" />
        <span>Gunakan ini setelah schedule diperbarui, agar log lama dipairing ulang ke schedule yang benar.</span>
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="confirmDialog?.close()">Batal</button>
        <button class="btn btn-sm btn-success" :disabled="loading" @click="runApply">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          Ya, Generate
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
  IconRefresh,
  IconX,
  IconSearch,
  IconPlayerPlay,
  IconCircleCheck,
  IconAlertTriangle,
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const api = useApi()
const { showSuccess, handleError } = useNotification()

const BASE = '/gym/staff-attendance/regenerate-from-logs'

const loaded = ref(false)
const loading = ref(false)
const mode = ref('preview')
const result = ref(null)
const confirmDialog = ref(null)

const filters = reactive({
  startDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  employeeQuery: '',
  forceAll: false,
})

const buildParams = (dryRun) => ({
  dryRun: String(dryRun),
  startDate: filters.startDate,
  endDate: filters.endDate,
  employeeQuery: filters.employeeQuery || undefined,
  forceAll: String(filters.forceAll),
})

const runPreview = async () => {
  loading.value = true
  loaded.value = true
  mode.value = 'preview'
  result.value = null
  try {
    const response = await api.post(BASE, {}, { params: buildParams(true) })
    result.value = response
  } catch (error) {
    handleError(error, 'Gagal menjalankan preview generate attendance')
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
    showSuccess(`${response.summary?.employeesRebuilt ?? 0} employee berhasil digenerate ulang`)
  } catch (error) {
    handleError(error, 'Gagal generate attendance dari log')
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
