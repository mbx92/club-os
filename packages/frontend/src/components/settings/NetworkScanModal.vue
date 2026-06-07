<template>
  <transport to="body">
      <dialog ref="modal" class="modal" :class="{ 'modal-open': true }">
    <div class="modal-box max-w-4xl max-h-[90vh]">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Network Printer Scanner</h3>

      <!-- Scan Options -->
      <div class="space-y-4 mb-6">
        <div class="alert alert-info">
          <IconInfoCircle class="w-5 h-5" />
          <div>
            <p class="font-semibold">Network Scanning</p>
            <p class="text-sm">
              Scan your network to automatically discover thermal printers. This may take 30-60 seconds.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">IP Range (Optional)</span>
            </label>
            <input
              v-model="scanOptions.ipRange"
              type="text"
              class="input input-bordered"
              placeholder="e.g., 192.168.1.0/24 or 192.168.1.100"
              :disabled="scanning"
            />
            <label class="label">
              <span class="label-text-alt">Leave empty for auto-detect all interfaces</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Scan Mode</span>
            </label>
            <select v-model="scanOptions.strictMode" class="select select-bordered" :disabled="scanning">
              <option :value="true">Strict (ESC/POS only, slower)</option>
              <option :value="false">Quick (All printer ports, faster)</option>
            </select>
          </div>
        </div>

        <!-- Scan Buttons -->
        <div class="flex gap-2">
          <button
            class="btn btn-primary flex-1"
            @click="startFullScan"
            :disabled="scanning"
          >
            <span v-if="scanning" class="loading loading-spinner"></span>
            <IconRadar v-else class="w-5 h-5 mr-2" />
            {{ scanning ? 'Scanning...' : 'Full Network Scan' }}
          </button>
          <button
            class="btn btn-outline flex-1"
            @click="startQuickScan"
            :disabled="scanning"
          >
            <IconBolt class="w-5 h-5 mr-2" />
            Quick Scan
          </button>
        </div>

        <!-- Scan Progress -->
        <div v-if="scanning" class="space-y-2">
          <div class="text-sm text-base-content/60">
            Scanning network... This may take up to 60 seconds
          </div>
          <progress class="progress progress-primary w-full"></progress>
        </div>
      </div>

      <!-- Scan Results -->
      <div v-if="scanResults.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold">Found {{ scanResults.length }} printer(s)</h4>
          <button class="btn btn-ghost btn-xs" @click="clearResults">
            <IconX class="w-4 h-4" />
            Clear
          </button>
        </div>

        <div class="space-y-2 max-h-[400px] overflow-y-auto">
          <div
            v-for="(printer, index) in scanResults"
            :key="index"
            class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
            :class="{ 'ring-2 ring-primary': selectedResult === printer }"
            @click="selectPrinter(printer)"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <IconPrinter class="w-5 h-5 text-primary" />
                    <span class="font-mono font-semibold">{{ printer.ip }}</span>
                    <div
                      class="badge badge-sm"
                      :class="printer.isValid ? 'badge-success' : 'badge-warning'"
                    >
                      {{ printer.isValid ? 'Valid ESC/POS' : 'Possible Printer' }}
                    </div>
                  </div>

                  <div class="space-y-1 text-sm">
                    <div v-if="printer.printerInfo" class="flex items-center gap-2">
                      <IconDeviceDesktop class="w-4 h-4 text-base-content/60" />
                      <span class="text-base-content/60">Model:</span>
                      <span class="font-semibold">
                        {{ printer.printerInfo.manufacturer }} {{ printer.printerInfo.model }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <IconNetwork class="w-4 h-4 text-base-content/60" />
                      <span class="text-base-content/60">Open Ports:</span>
                      <div class="flex gap-1">
                        <span
                          v-for="port in printer.portsOpen"
                          :key="port"
                          class="badge badge-xs"
                        >
                          {{ port }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  class="btn btn-primary btn-sm"
                  @click.stop="selectAndAdd(printer)"
                >
                  <IconPlus class="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!scanning && scanCompleted" class="text-center py-8">
        <IconPrinterOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h4 class="font-semibold mb-2">No Printers Found</h4>
        <p class="text-base-content/60 text-sm mb-4">
          No thermal printers were detected on your network.
        </p>
        <div class="text-xs text-base-content/60">
          <p>Try:</p>
          <ul class="list-disc list-inside mt-2">
            <li>Ensure printers are powered on and connected to network</li>
            <li>Check if printers are on the same subnet</li>
            <li>Specify an IP range manually</li>
            <li>Try Quick Scan mode</li>
          </ul>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeModal">
          Close
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
  </transport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePrinterSettings } from '@/composables/gym/printer-settings'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconRadar,
  IconBolt,
  IconPrinter,
  IconPrinterOff,
  IconNetwork,
  IconDeviceDesktop,
  IconPlus,
  IconX,
  IconInfoCircle
} from '@tabler/icons-vue'

const emit = defineEmits(['close', 'printer-selected'])

const { scanNetwork, quickScan } = usePrinterSettings()
const { showError, showSuccess } = useNotification()

const modal = ref(null)
const scanning = ref(false)
const scanCompleted = ref(false)
const scanResults = ref([])
const selectedResult = ref(null)

const scanOptions = ref({
  ipRange: '',
  strictMode: true
})

const startFullScan = async () => {
  scanning.value = true
  scanCompleted.value = false
  scanResults.value = []
  
  try {
    const results = await scanNetwork(scanOptions.value)
    scanResults.value = results
    
    if (results.length > 0) {
      showSuccess(`Found ${results.length} printer(s)`)
    }
  } catch (error) {
    showError('Failed to scan network')
  } finally {
    scanning.value = false
    scanCompleted.value = true
  }
}

const startQuickScan = async () => {
  scanning.value = true
  scanCompleted.value = false
  scanResults.value = []
  
  try {
    const results = await quickScan()
    scanResults.value = results
    
    if (results.length > 0) {
      showSuccess(`Found ${results.length} printer(s)`)
    }
  } catch (error) {
    showError('Failed to quick scan')
  } finally {
    scanning.value = false
    scanCompleted.value = true
  }
}

const selectPrinter = (printer) => {
  selectedResult.value = printer
}

const selectAndAdd = (printer) => {
  emit('printer-selected', printer)
}

const clearResults = () => {
  scanResults.value = []
  scanCompleted.value = false
  selectedResult.value = null
}

const closeModal = () => {
  emit('close')
}

onMounted(() => {
  modal.value?.showModal()
})
</script>
