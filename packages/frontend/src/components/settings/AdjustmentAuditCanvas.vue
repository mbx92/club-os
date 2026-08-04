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
                    <div class="p-2 rounded-lg bg-primary/10">
                      <IconReceipt2 class="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Audit Penyesuaian Manual</h2>
                      <p class="text-sm text-base-content/70">
                        Cek koreksi manual (Penyesuaian +/-) yang mungkin dibuat untuk menambal selisih laporan
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

                <div class="mt-4 flex flex-wrap items-end gap-2">
                  <div class="form-control">
                    <label class="label py-0"><span class="label-text text-xs">Dari tanggal</span></label>
                    <input v-model="filters.startDate" type="date" class="input input-sm input-bordered" />
                  </div>
                  <div class="form-control">
                    <label class="label py-0"><span class="label-text text-xs">Sampai tanggal</span></label>
                    <input v-model="filters.endDate" type="date" class="input input-sm input-bordered" />
                  </div>
                  <button class="btn btn-primary btn-sm gap-2" :disabled="loading" @click="load">
                    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Muat Data
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <div v-if="!loaded && !loading" class="text-center py-20 text-base-content/40">
                  <IconReceipt2 class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Muat Data</strong> untuk melihat daftar penyesuaian manual.</p>
                </div>

                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <template v-else>
                  <!-- Backdated opening entries: informational, no action needed -->
                  <div v-if="backdatedOpenings.length" class="alert alert-warning items-start">
                    <IconAlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
                    <div class="text-sm">
                      <p class="font-semibold">
                        {{ backdatedOpenings.length }} akun punya saldo-awal ledger yang di-backfill belakangan
                      </p>
                      <p class="mt-1 opacity-80">
                        Entry <code>opening</code>-nya baru dibuat lama setelah akun mulai dipakai (biasanya dari
                        Recalculate Saldo), lalu di-mundur-tanggal-kan ke tanggal saldo awal. Ini penyebab laporan
                        periode sempat double-count saldo awal sebagai pemasukan — sudah diperbaiki di kode laporan,
                        tidak perlu tindakan lebih lanjut di sini.
                      </p>
                      <ul class="mt-2 space-y-1">
                        <li v-for="o in backdatedOpenings" :key="o.entryNumber" class="font-mono text-xs">
                          {{ o.accountName }} · {{ fmt(o.amount) }} · dibuat {{ o.delayHours }}j setelah akun dibuat
                          (entryDate {{ o.entryDate }})
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div v-if="adjustments.length === 0" class="alert alert-success">
                    <IconCircleCheck class="w-5 h-5" />
                    <span>Tidak ada penyesuaian manual pada rentang tanggal ini.</span>
                  </div>

                  <div v-else class="overflow-x-auto rounded-lg border border-base-300">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Akun</th>
                          <th>Tipe</th>
                          <th class="text-right">Jumlah</th>
                          <th>Keterangan</th>
                          <th>Oleh</th>
                          <th class="text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in adjustments" :key="row.id">
                          <td class="text-xs">{{ row.entryDate }}</td>
                          <td>
                            <div class="font-medium">{{ row.accountName }}</div>
                            <div class="text-xs text-base-content/50">{{ row.accountType }}</div>
                          </td>
                          <td>
                            <span
                              class="badge badge-sm"
                              :class="row.type === 'adjustment_credit' ? 'badge-success' : 'badge-error'"
                            >
                              {{ row.type === 'adjustment_credit' ? 'Koreksi (+)' : 'Koreksi (-)' }}
                            </span>
                          </td>
                          <td class="text-right font-mono text-sm">{{ fmt(row.amount) }}</td>
                          <td class="text-xs max-w-xs truncate" :title="row.description">{{ row.description }}</td>
                          <td class="text-xs">{{ row.performedByName || '—' }}</td>
                          <td class="text-right">
                            <span v-if="row.reversedBy" class="badge badge-ghost badge-sm gap-1">
                              <IconCheck class="w-3 h-3" /> Sudah dibalik
                            </span>
                            <button
                              v-else
                              class="btn btn-ghost btn-xs gap-1 text-warning"
                              :disabled="reversing === row.id"
                              @click="openReverseConfirm(row)"
                            >
                              <span v-if="reversing === row.id" class="loading loading-spinner loading-xs"></span>
                              <IconArrowBackUp v-else class="w-3.5 h-3.5" />
                              Balik
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
      <h3 class="font-bold text-lg">Balik Penyesuaian Ini?</h3>
      <p class="py-2 text-sm">
        Akan membuat entry <strong>{{ targetRow?.type === 'adjustment_debit' ? 'Koreksi (+)' : 'Koreksi (-)' }}</strong>
        sebesar <strong>{{ fmt(targetRow?.amount) }}</strong> pada akun <strong>{{ targetRow?.accountName }}</strong>
        untuk membatalkan efek entry <code>{{ targetRow?.entryNumber }}</code>. Entry asli tidak dihapus (ledger
        tetap utuh untuk audit).
      </p>
      <div class="form-control">
        <label class="label py-1"><span class="label-text text-xs">Alasan (opsional)</span></label>
        <input v-model="reverseReason" type="text" class="input input-sm input-bordered" placeholder="mis. sudah diperbaiki lewat fix kode laporan" />
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="confirmDialog?.close()">Batal</button>
        <button class="btn btn-sm btn-warning" :disabled="reversing" @click="confirmReverse">
          <span v-if="reversing" class="loading loading-spinner loading-sm"></span>
          Ya, Balik
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
import { useCurrency } from '@/composables/subscription/useCurrency'
import dayjs from 'dayjs'
import {
  IconReceipt2,
  IconX,
  IconSearch,
  IconAlertTriangle,
  IconCircleCheck,
  IconCheck,
  IconArrowBackUp,
} from '@tabler/icons-vue'

defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const api = useApi()
const { showSuccess, handleError } = useNotification()
const { formatCurrency } = useCurrency()

const BASE = '/finance/accounts/adjustment-audit'

const loaded = ref(false)
const loading = ref(false)
const adjustments = ref([])
const backdatedOpenings = ref([])
const confirmDialog = ref(null)
const targetRow = ref(null)
const reverseReason = ref('')
const reversing = ref(null)

const filters = reactive({
  startDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
})

const fmt = (value) => formatCurrency(value ?? 0)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const load = async () => {
  loading.value = true
  try {
    const q = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate })
    const response = await api.get(`${BASE}?${q.toString()}`)
    adjustments.value = response.data?.adjustments || []
    backdatedOpenings.value = response.data?.backdatedOpenings || []
    loaded.value = true
  } catch (error) {
    handleError(error, 'Gagal memuat audit penyesuaian manual')
  } finally {
    loading.value = false
  }
}

const openReverseConfirm = (row) => {
  targetRow.value = row
  reverseReason.value = ''
  confirmDialog.value?.showModal()
}

const confirmReverse = async () => {
  if (!targetRow.value) return
  reversing.value = targetRow.value.id
  try {
    await api.post(`${BASE}/${targetRow.value.id}/reverse`, { reason: reverseReason.value || undefined })
    confirmDialog.value?.close()
    showSuccess('Penyesuaian berhasil dibalik.')
    await load()
  } catch (error) {
    handleError(error, 'Gagal membalik penyesuaian')
  } finally {
    reversing.value = null
  }
}
</script>

<style scoped>
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.2s ease;
}
.canvas-enter-active .absolute.inset-y-0,
.canvas-leave-active .absolute.inset-y-0 {
  transition: transform 0.25s ease;
}
.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}
.canvas-enter-from .absolute.inset-y-0,
.canvas-leave-to .absolute.inset-y-0 {
  transform: translateX(100%);
}
</style>
