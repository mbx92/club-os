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
          <div class="w-screen max-w-3xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              <div class="px-6 py-4 bg-base-200 border-b border-base-300 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary/10">
                      <IconCalculator class="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Recalculate Saldo Akun</h2>
                      <p class="text-sm text-base-content/70">
                        Hitung ulang balance = saldo awal + mutasi ledger
                      </p>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-ghost btn-circle" @click="handleClose">
                    <IconX class="w-5 h-5" />
                  </button>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button class="btn btn-warning btn-sm gap-2" :disabled="loading" @click="runPreview">
                    <span v-if="loading && mode === 'preview'" class="loading loading-spinner loading-sm"></span>
                    <IconSearch v-else class="w-4 h-4" />
                    Preview
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-6 space-y-5">
                <div v-if="!loaded" class="text-center py-20 text-base-content/40">
                  <IconCalculator class="w-14 h-14 mx-auto mb-4 opacity-30" />
                  <p>Klik <strong>Preview</strong> untuk melihat akun yang saldo-nya perlu disesuaikan.</p>
                  <p class="text-xs mt-2 opacity-70">
                    Berguna setelah inject/update <code>openingBalance</code> di database.
                  </p>
                </div>

                <div v-else-if="loading" class="flex justify-center py-20">
                  <span class="loading loading-spinner loading-lg"></span>
                </div>

                <template v-else-if="result">
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Akun di-scan</div>
                      <div class="stat-value text-2xl">{{ result.summary?.accountsScanned ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
                      <div class="stat-title text-xs">Perlu update</div>
                      <div class="stat-value text-2xl text-warning">{{ result.summary?.accountsToFix ?? 0 }}</div>
                    </div>
                    <div class="stat bg-base-200 rounded-lg p-4">
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
                      Formula: <code>openingBalance + inflow − outflow</code>
                    </p>
                    <button
                      v-if="result.mode === 'dry_run'"
                      class="btn btn-success btn-sm gap-2"
                      :disabled="loading || (result.summary?.accountsToFix ?? 0) === 0"
                      @click="openConfirmApply"
                    >
                      <IconPlayerPlay class="w-4 h-4" />
                      Apply Recalculate
                    </button>
                  </div>

                  <div v-if="(result.summary?.accountsToFix ?? 0) === 0" class="alert alert-success">
                    <IconCircleCheck class="w-5 h-5" />
                    <span>Semua saldo akun sudah sesuai dengan saldo awal + mutasi.</span>
                  </div>

                  <div class="overflow-x-auto rounded-lg border border-base-300">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Akun</th>
                          <th class="text-right">Saldo Awal</th>
                          <th class="text-right">Saldo Sekarang</th>
                          <th class="text-right">Seharusnya</th>
                          <th class="text-right">Selisih</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in result.accounts"
                          :key="row.accountId"
                          :class="row.willChange ? 'bg-warning/10' : ''"
                        >
                          <td>
                            <div class="font-medium">{{ row.name }}</div>
                            <div class="text-xs text-base-content/50">
                              {{ row.type }}{{ row.bankName ? ` · ${row.bankName}` : '' }}
                            </div>
                          </td>
                          <td class="text-right font-mono text-sm">{{ fmt(row.openingBalance) }}</td>
                          <td class="text-right font-mono text-sm">{{ fmt(row.currentBalance ?? row.before) }}</td>
                          <td class="text-right font-mono text-sm">{{ fmt(row.expectedBalance ?? row.after) }}</td>
                          <td
                            class="text-right font-mono text-sm font-semibold"
                            :class="row.delta > 0 ? 'text-success' : row.delta < 0 ? 'text-error' : 'text-base-content/40'"
                          >
                            {{ row.delta > 0 ? '+' : '' }}{{ fmt(row.delta) }}
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
      <h3 class="font-bold text-lg">Apply Recalculate Saldo?</h3>
      <p class="py-3 text-sm">
        Akan mengupdate <strong>{{ result?.summary?.accountsToFix ?? 0 }}</strong> akun
        agar balance = saldo awal + mutasi ledger, serta sync entry opening.
      </p>
      <div class="alert alert-warning text-sm">
        <IconAlertTriangle class="w-4 h-4 shrink-0" />
        <span>Jalankan hanya setelah hasil preview terlihat benar.</span>
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
import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'
import { useCurrency } from '@/composables/subscription/useCurrency'
import {
  IconCalculator,
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

const BASE = '/finance/accounts/recalculate-balances'

const loaded = ref(false)
const loading = ref(false)
const mode = ref('preview')
const result = ref(null)
const confirmDialog = ref(null)

const fmt = (value) => formatCurrency(value ?? 0)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const runPreview = async () => {
  loading.value = true
  mode.value = 'preview'
  try {
    const response = await api.post(`${BASE}?dryRun=true`)
    result.value = response
    loaded.value = true
  } catch (error) {
    handleError(error, 'Gagal preview recalculate saldo akun')
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
    const response = await api.post(`${BASE}?dryRun=false`)
    result.value = response
    loaded.value = true
    showSuccess(`Recalculate selesai. ${result.value?.summary?.accountsUpdated ?? 0} akun diupdate.`)
  } catch (error) {
    handleError(error, 'Gagal apply recalculate saldo akun')
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
