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
                    <div class="p-2 rounded-lg bg-warning/10">
                      <IconCash class="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Recalc Expense Laci Historis</h2>
                      <p class="text-sm text-base-content/70">
                        Dry-run lalu apply: bind expense ke shift + sync collectible
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label class="form-control">
                    <span class="label-text text-xs">Dari tanggal</span>
                    <input v-model="filters.startDate" type="date" class="input input-bordered input-sm" />
                  </label>
                  <label class="form-control">
                    <span class="label-text text-xs">Sampai tanggal</span>
                    <input v-model="filters.endDate" type="date" class="input input-bordered input-sm" />
                  </label>
                  <label class="form-control sm:col-span-2">
                    <span class="label-text text-xs">Opsi</span>
                    <div class="flex flex-wrap gap-3 pt-1">
                      <label class="label cursor-pointer gap-2 justify-start py-0">
                        <input v-model="filters.syncSessions" type="checkbox" class="checkbox checkbox-sm" />
                        <span class="label-text text-sm">Sync closing/collectible</span>
                      </label>
                      <label class="label cursor-pointer gap-2 justify-start py-0">
                        <input v-model="filters.clawbackCollect" type="checkbox" class="checkbox checkbox-sm checkbox-warning" />
                        <span class="label-text text-sm">Clawback “sudah diambil” (opsional)</span>
                      </label>
                    </div>
                  </label>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                  <button class="btn btn-warning btn-sm gap-2" :disabled="loading" @click="runPreview">
                    <span v-if="loading && mode === 'preview'" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Preview (Dry-run)
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <div v-if="!loaded" class="text-center py-20 text-base-content/40">
                  <IconCash class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Pilih rentang tanggal lalu klik <strong>Preview</strong>.</p>
                  <p class="text-xs mt-2 opacity-70 max-w-lg mx-auto">
                    Expense laci tanpa <code>cashRegisterSessionId</code> akan dicocokkan ke shift
                    (waktu paid/created, fallback tanggal shift). Collect yang sudah ada
                    <strong>tidak diubah</strong> kecuali opsi clawback dicentang.
                  </p>
                </div>

                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <template v-else-if="result">
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Expense di-scan</div>
                      <div class="stat-value text-xl">{{ result.summary?.expensesScanned ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Akan di-bind</div>
                      <div class="stat-value text-xl text-warning">{{ result.summary?.expensesToBind ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Tidak cocok</div>
                      <div class="stat-value text-xl">{{ result.summary?.expensesUnmatched ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Session sync</div>
                      <div class="stat-value text-xl">{{ result.summary?.sessionsToSync ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Clawback</div>
                      <div class="stat-value text-lg">{{ fmt(result.summary?.clawbackTotal) }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-3">
                      <div class="stat-title text-xs">Mode</div>
                      <div class="stat-value text-lg">
                        <span class="badge" :class="result.mode === 'dry_run' ? 'badge-warning' : 'badge-success'">
                          {{ result.mode === 'dry_run' ? 'Preview' : 'Applied' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-base-content/60">
                      Default: bind + sync session. Clawback collect opsional (ubah “sudah diambil”).
                    </p>
                    <button
                      v-if="result.mode === 'dry_run'"
                      class="btn btn-success btn-sm gap-2"
                      :disabled="loading || !canApply"
                      @click="openConfirmApply"
                    >
                      <IconPlayerPlay class="w-4 h-4" />
                      Apply Recalculate
                    </button>
                  </div>

                  <div v-if="!canApply" class="alert alert-success text-sm">
                    <IconCircleCheck class="w-5 h-5" />
                    <span>Tidak ada perubahan yang perlu diterapkan pada filter ini.</span>
                  </div>

                  <div v-if="filters.clawbackCollect" class="alert alert-warning text-sm">
                    <IconAlertTriangle class="w-5 h-5 shrink-0" />
                    <span>
                      Clawback aktif: apply akan mengurangi “sudah diambil” / saldo vault &amp; akun Tunai
                      bila collect melebihi collectible baru.
                    </span>
                  </div>

                  <!-- Binds -->
                  <div class="space-y-2">
                    <h3 class="font-semibold">Bind expense → shift</h3>
                    <div class="overflow-x-auto rounded-lg border border-base-300 max-h-72 overflow-y-auto">
                      <table class="table table-sm">
                        <thead class="sticky top-0 bg-base-200">
                          <tr>
                            <th>Expense</th>
                            <th>Status</th>
                            <th class="text-right">Amount</th>
                            <th>Match</th>
                            <th>Shift</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="!(result.binds || []).length">
                            <td colspan="5" class="text-center text-base-content/50 py-6">Tidak ada expense unbound</td>
                          </tr>
                          <tr
                            v-for="row in result.binds"
                            :key="row.expenseId"
                            :class="row.action === 'unmatched' ? 'bg-error/5' : 'bg-warning/5'"
                          >
                            <td>
                              <div class="font-medium">{{ row.title || row.expenseNumber }}</div>
                              <div class="text-xs text-base-content/50">{{ row.expenseNumber }}</div>
                            </td>
                            <td><span class="badge badge-sm">{{ row.status }}</span></td>
                            <td class="text-right font-mono text-sm">{{ fmt(row.totalAmount) }}</td>
                            <td class="text-xs">{{ row.match }}</td>
                            <td class="text-sm">
                              <template v-if="row.sessionId">
                                {{ row.shiftDate }} · {{ row.shiftName || '-' }} #{{ row.shiftNumber || '-' }}
                              </template>
                              <span v-else class="text-error">—</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- Session syncs -->
                  <div v-if="(result.sessionSyncs || []).length" class="space-y-2">
                    <h3 class="font-semibold">Sync session (closing / collectible)</h3>
                    <div class="overflow-x-auto rounded-lg border border-base-300 max-h-80 overflow-y-auto">
                      <table class="table table-sm">
                        <thead class="sticky top-0 bg-base-200">
                          <tr>
                            <th>Shift</th>
                            <th class="text-right">Collectible lama</th>
                            <th class="text-right">Collectible baru</th>
                            <th class="text-right">Collected</th>
                            <th class="text-right">Clawback</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="row in result.sessionSyncs"
                            :key="row.sessionId"
                            :class="row.willChange ? 'bg-warning/10' : ''"
                          >
                            <td>
                              <div class="font-medium">{{ row.shiftDate }} · {{ row.shiftName || '-' }}</div>
                              <div class="text-xs text-base-content/50">#{{ row.shiftNumber || '-' }}</div>
                            </td>
                            <td class="text-right font-mono text-sm">{{ fmt(row.before?.collectibleBase) }}</td>
                            <td class="text-right font-mono text-sm font-semibold">{{ fmt(row.after?.collectibleBase) }}</td>
                            <td class="text-right font-mono text-sm">
                              {{ fmt(row.before?.collected) }}
                              <span v-if="row.after?.collected != null && row.after.collected !== row.before?.collected" class="text-warning">
                                → {{ fmt(row.after.collected) }}
                              </span>
                            </td>
                            <td class="text-right font-mono text-sm text-warning">
                              {{ fmt(row.clawbackPreview ?? row.clawbackAmount ?? 0) }}
                            </td>
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

  <dialog ref="confirmDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Apply Recalc Expense Laci?</h3>
      <p class="py-3 text-sm">
        Akan bind <strong>{{ result?.summary?.expensesToBind ?? 0 }}</strong> expense
        dan sync <strong>{{ result?.summary?.sessionsToSync ?? 0 }}</strong> session.
        <span v-if="filters.clawbackCollect">
          Clawback collect: <strong>{{ fmt(result?.summary?.clawbackTotal) }}</strong>.
        </span>
      </p>
      <div class="alert alert-warning text-sm">
        <IconAlertTriangle class="w-4 h-4 shrink-0" />
        <span>Pastikan hasil preview sudah benar. Data collect historis tidak berubah kecuali clawback dicentang.</span>
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="confirmDialog?.close()">Batal</button>
        <button class="btn btn-sm btn-success" :disabled="loading" @click="runApply">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          Ya, Apply
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useCurrency } from '@/composables/subscription/useCurrency'
import {
  IconCash,
  IconX,
  IconSearch,
  IconPlayerPlay,
  IconCircleCheck,
  IconAlertTriangle,
} from '@tabler/icons-vue'

defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const api = useApi()
const { showSuccess, handleError } = useNotification()
const { formatCurrency } = useCurrency()

const BASE = '/finance/expenses/recalculate-drawer-binding'

const loaded = ref(false)
const loading = ref(false)
const mode = ref('preview')
const result = ref(null)
const confirmDialog = ref(null)

const filters = ref({
  startDate: '',
  endDate: '',
  syncSessions: true,
  clawbackCollect: false,
})

const fmt = (value) => formatCurrency(value ?? 0)

const canApply = computed(() => {
  const s = result.value?.summary
  if (!s) return false
  return (s.expensesToBind || 0) > 0
    || (s.sessionsToSync || 0) > 0
    || (s.clawbackTotal || 0) > 0
})

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const buildBody = () => ({
  startDate: filters.value.startDate || null,
  endDate: filters.value.endDate || null,
  syncSessions: filters.value.syncSessions,
  clawbackCollect: filters.value.clawbackCollect,
})

const runPreview = async () => {
  loading.value = true
  mode.value = 'preview'
  try {
    const response = await api.post(`${BASE}?dryRun=true`, buildBody())
    result.value = response
    loaded.value = true
  } catch (error) {
    handleError(error, 'Gagal preview recalc expense laci')
  } finally {
    loading.value = false
  }
}

const openConfirmApply = () => {
  confirmDialog.value?.showModal()
}

const runApply = async () => {
  loading.value = true
  mode.value = 'apply'
  try {
    confirmDialog.value?.close()
    const response = await api.post(`${BASE}?dryRun=false`, buildBody())
    result.value = response
    loaded.value = true
    showSuccess(
      `Recalc selesai. Bind ${result.value?.summary?.expensesToBind ?? 0} expense, sync ${result.value?.summary?.sessionsToSync ?? 0} session.`
    )
  } catch (error) {
    handleError(error, 'Gagal apply recalc expense laci')
  } finally {
    loading.value = false
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
