<template>
  <!-- Canvas Overlay -->
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
          <div class="w-screen max-w-3xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">

              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-warning/10 rounded-lg">
                      <IconCopy class="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Deteksi & Merge Duplikat Employee</h2>
                      <p class="text-sm text-base-content/70">
                        Gabungkan record Device Employee yang duplikat
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>
                <div class="mt-4 flex gap-3">
                  <button
                    class="btn btn-warning btn-sm gap-2"
                    :disabled="duplicatesLoading"
                    @click="loadDuplicates"
                  >
                    <span v-if="duplicatesLoading" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Cek Duplikat
                  </button>
                  <button class="btn btn-ghost btn-sm gap-2" :disabled="duplicatesLoading" @click="loadDuplicates">
                    <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': duplicatesLoading }" />
                    Refresh
                  </button>
                </div>
              </div>

              <!-- Body -->
              <div class="flex-1 overflow-y-auto p-6 space-y-6">

                <!-- Not loaded yet -->
                <div v-if="!loaded" class="text-center py-16 text-base-content/40">
                  <IconCopy class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Cek Duplikat</strong> untuk mulai deteksi.</p>
                </div>

                <!-- Loading -->
                <div v-else-if="duplicatesLoading" class="flex justify-center py-16">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <!-- No duplicates -->
                <div v-else-if="duplicates.length === 0" class="text-center py-16">
                  <IconCircleCheck class="w-14 h-14 mx-auto mb-4 text-success opacity-70" />
                  <p class="text-lg font-semibold">Tidak ada duplikat ditemukan</p>
                  <p class="text-sm text-base-content/60 mt-1">Semua record Device Employee unik.</p>
                </div>

                <!-- Duplicate groups -->
                <template v-else>
                  <div class="alert alert-warning">
                    <IconAlertTriangle class="w-5 h-5 shrink-0" />
                    <span>Ditemukan <strong>{{ duplicates.length }}</strong> grup duplikat. Pilih record yang ingin dipertahankan, lalu klik Merge.</span>
                  </div>

                  <div
                    v-for="(group, gi) in duplicates"
                    :key="gi"
                    class="card bg-base-100 border border-warning/40 shadow"
                  >
                    <div class="card-body gap-4">
                      <!-- Group header -->
                      <div class="flex items-center gap-2">
                        <span class="badge badge-warning badge-sm uppercase">{{ group.reason === 'same_name' ? 'Nama Sama' : 'User Sama' }}</span>
                        <span class="font-semibold capitalize">{{ group.nameKey || 'Duplikat user' }}</span>
                        <span class="text-xs text-base-content/50">({{ group.count }} record)</span>
                      </div>

                      <!-- Record selection -->
                      <div class="space-y-3">
                        <div
                          v-for="rec in group.records"
                          :key="rec.id"
                          class="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors"
                          :class="keepId[gi] === rec.id
                            ? 'border-success bg-success/5'
                            : 'border-base-300 hover:border-base-content/30'"
                          @click="selectKeep(gi, rec.id)"
                        >
                          <!-- Radio indicator -->
                          <div class="mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                            :class="keepId[gi] === rec.id ? 'border-success bg-success' : 'border-base-300'">
                            <div v-if="keepId[gi] === rec.id" class="w-2 h-2 rounded-full bg-white"></div>
                          </div>

                          <!-- Info -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-medium">{{ rec.name }}</span>
                              <span class="badge badge-ghost font-mono text-xs">empNo: {{ rec.employeeNo }}</span>
                              <span class="badge badge-sm" :class="rec.status === 'active' ? 'badge-success' : 'badge-error'">{{ rec.status }}</span>
                            </div>
                            <div class="flex items-center gap-3 mt-1 text-xs text-base-content/60 flex-wrap">
                              <span v-if="rec.device">
                                <IconDeviceCctv class="w-3 h-3 inline mr-1" />{{ rec.device.name }} ({{ rec.device.ipAddress }})
                              </span>
                              <span :class="rec.hasFingerprint ? 'text-success' : 'text-error'">
                                <IconFingerprint class="w-3 h-3 inline mr-1" />
                                {{ rec.hasFingerprint ? `${rec.fingerprintCount} Fingerprint` : 'No Fingerprint' }}
                              </span>
                              <span v-if="rec.lastSyncAt">
                                Sync: {{ formatDate(rec.lastSyncAt) }}
                              </span>
                              <span v-else class="text-base-content/30">Belum pernah sync</span>
                            </div>
                            <div v-if="rec.user" class="text-xs mt-1 text-primary">
                              <IconUser class="w-3 h-3 inline mr-1" />
                              {{ rec.user.firstName }} {{ rec.user.lastName }} — {{ rec.user.email }}
                            </div>
                          </div>

                          <!-- Toggle status button -->
                          <button
                            class="btn btn-xs shrink-0"
                            :class="rec.status === 'active' ? 'btn-error btn-outline' : 'btn-success btn-outline'"
                            :disabled="statusLoading"
                            @click.stop="handleToggleStatus(rec, gi)"
                          >
                            {{ rec.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
                          </button>
                        </div>
                      </div>

                      <!-- Merge result feedback -->
                      <div v-if="mergeResults[gi]" class="alert alert-success py-2 text-sm">
                        <IconCircleCheck class="w-4 h-4" />
                        <div>
                          <strong>Berhasil!</strong> {{ mergeResults[gi].message }}
                          <div class="text-xs mt-1 opacity-80">
                            Schedule dipindahkan: {{ mergeResults[gi].stats?.scheduleMoved ?? 0 }} |
                            Skipped: {{ mergeResults[gi].stats?.scheduleSkipped ?? 0 }} |
                            Attendance: {{ mergeResults[gi].stats?.attendanceMoved ?? 0 }} |
                            Logs: {{ mergeResults[gi].stats?.logsMoved ?? 0 }}
                          </div>
                        </div>
                      </div>

                      <!-- Merge action -->
                      <div class="flex items-center justify-between pt-2 border-t border-base-200">
                        <p class="text-xs text-base-content/50">
                          <span v-if="keepId[gi]">
                            Pertahankan: <strong>{{ getRecordName(group, keepId[gi]) }}</strong>.
                            Record lainnya akan dihapus setelah data dipindahkan.
                          </span>
                          <span v-else>Pilih record yang ingin dipertahankan.</span>
                        </p>
                        <button
                          class="btn btn-sm btn-warning"
                          :disabled="!canMerge(group, gi) || mergeLoading"
                          @click="handleMerge(group, gi)"
                        >
                          <span v-if="mergeLoading && mergingGroup === gi" class="loading loading-spinner loading-sm"></span>
                          <IconGitMerge v-else class="w-4 h-4" />
                          Merge Sekarang
                        </button>
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

  <!-- Confirm merge dialog -->
  <dialog ref="confirmDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-2">Konfirmasi Merge</h3>
      <p class="text-sm mb-1">Anda akan menggabungkan:</p>
      <ul class="text-sm mb-4 space-y-1 list-disc list-inside">
        <li>Pertahankan: <strong>{{ confirmData.keepName }}</strong> (empNo: {{ confirmData.keepNo }})</li>
        <li>Hapus: <strong>{{ confirmData.removeName }}</strong> (empNo: {{ confirmData.removeNo }})</li>
      </ul>
      <p class="text-xs text-base-content/60">Semua attendance, schedule, dan log akan dipindahkan. Data duplikat (tanggal sama) akan dilewati.</p>
      <div class="modal-action">
        <button class="btn btn-sm" @click="confirmDialog?.close()">Batal</button>
        <button class="btn btn-sm btn-warning" @click="confirmMerge">
          <span v-if="mergeLoading" class="loading loading-spinner loading-sm"></span>
          Ya, Merge
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Confirm toggle status dialog -->
  <dialog ref="statusDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-2">{{ statusConfirm.newStatus === 'inactive' ? 'Nonaktifkan' : 'Aktifkan' }} Employee?</h3>
      <p class="text-sm">
        <strong>{{ statusConfirm.name }}</strong> (empNo: {{ statusConfirm.employeeNo }})
        {{ statusConfirm.newStatus === 'inactive'
          ? ' — akses fingerprint akan dicabut di device.'
          : ' — employee akan diaktifkan kembali di device.' }}
      </p>
      <div class="modal-action">
        <button class="btn btn-sm" @click="statusDialog?.close()">Batal</button>
        <button class="btn btn-sm" :class="statusConfirm.newStatus === 'inactive' ? 'btn-error' : 'btn-success'" @click="confirmStatusUpdate">
          <span v-if="statusLoading" class="loading loading-spinner loading-sm"></span>
          Ya, Lanjutkan
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useDeviceEmployeeDuplicate } from '@/composables/gym/hikvision'
import {
  IconCopy,
  IconX,
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconCircleCheck,
  IconFingerprint,
  IconDeviceCctv,
  IconUser,
  IconGitMerge,
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'close'])

const { duplicates, duplicatesLoading, mergeLoading, statusLoading, fetchDuplicates, mergeEmployees, updateStatus } = useDeviceEmployeeDuplicate()

const loaded = ref(false)
// keepId per group index
const keepId = reactive({})
const mergeResults = reactive({})
const mergingGroup = ref(null)

const confirmDialog = ref(null)
const statusDialog = ref(null)

const confirmData = reactive({ keepId: '', removeId: '', keepName: '', keepNo: '', removeName: '', removeNo: '', groupIdx: null })
const statusConfirm = reactive({ id: '', name: '', employeeNo: '', newStatus: '', groupIdx: null, recIdx: null })

const loadDuplicates = async () => {
  loaded.value = true
  Object.keys(keepId).forEach(k => delete keepId[k])
  Object.keys(mergeResults).forEach(k => delete mergeResults[k])
  await fetchDuplicates()
}

const selectKeep = (groupIdx, id) => {
  keepId[groupIdx] = id
}

const canMerge = (group, gi) => {
  return !!keepId[gi] && group.records.length >= 2
}

const getRecordName = (group, id) => {
  const r = group.records.find(r => r.id === id)
  return r ? `${r.name} (empNo: ${r.employeeNo})` : ''
}

const handleMerge = (group, gi) => {
  const keep = group.records.find(r => r.id === keepId[gi])
  const remove = group.records.find(r => r.id !== keepId[gi])
  if (!keep || !remove) return

  confirmData.keepId = keep.id
  confirmData.removeId = remove.id
  confirmData.keepName = keep.name
  confirmData.keepNo = keep.employeeNo
  confirmData.removeName = remove.name
  confirmData.removeNo = remove.employeeNo
  confirmData.groupIdx = gi

  confirmDialog.value?.showModal()
}

const confirmMerge = async () => {
  confirmDialog.value?.close()
  const gi = confirmData.groupIdx
  mergingGroup.value = gi
  try {
    const result = await mergeEmployees(confirmData.keepId, confirmData.removeId)
    mergeResults[gi] = result
    // Check device sync warning
    // Re-fetch to update list
    await fetchDuplicates()
  } catch {
    // handled by composable
  } finally {
    mergingGroup.value = null
  }
}

const handleToggleStatus = (rec, gi) => {
  statusConfirm.id = rec.id
  statusConfirm.name = rec.name
  statusConfirm.employeeNo = rec.employeeNo
  statusConfirm.newStatus = rec.status === 'active' ? 'inactive' : 'active'
  statusConfirm.groupIdx = gi
  statusDialog.value?.showModal()
}

const confirmStatusUpdate = async () => {
  statusDialog.value?.close()
  try {
    const result = await updateStatus(statusConfirm.id, statusConfirm.newStatus, true)
    // Warn if device sync failed
    if (result?.deviceSync?.attempted && !result?.deviceSync?.success) {
      console.warn('[DeviceEmployeeDuplicate] Device sync failed:', result.deviceSync.error)
    }
    await fetchDuplicates()
  } catch {
    // handled by composable
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
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
