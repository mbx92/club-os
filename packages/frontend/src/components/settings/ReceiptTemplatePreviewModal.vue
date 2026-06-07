<template>
  <Teleport to="body">
    <div class="modal modal-open z-[9999]">
      <div class="modal-box max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Template Preview</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>

      <!-- Printer Selector & Test Print -->
      <div v-if="previewData && !loading" class="flex gap-2 mb-4">
        <select 
          v-model="selectedPrinter" 
          class="select select-bordered select-sm flex-1"
        >
          <option :value="null" disabled>Select Printer</option>
          <option 
            v-for="printer in printers" 
            :key="printer.id" 
            :value="printer.id"
          >
            {{ printer.name }} ({{ printer.ipAddress || printer.address }})
          </option>
        </select>
        <button 
          @click="handleTestPrint"
          class="btn btn-sm btn-primary"
          :disabled="testPrinting || !selectedPrinter"
        >
          <span v-if="testPrinting" class="loading loading-spinner loading-xs"></span>
          <IconPrinter v-else class="w-4 h-4" />
          {{ testPrinting ? 'Printing...' : 'Test Print' }}
        </button>
      </div>

      <div class="space-y-4">
        <!-- Template Info -->
        <div v-if="templateInfo" class="card bg-base-200">
          <div class="card-body p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-base-content/60">Template Name</div>
                <div class="font-semibold">{{ templateInfo.name }}</div>
              </div>
              <div>
                <div class="text-xs text-base-content/60">Type</div>
                <div class="badge badge-primary">{{ templateInfo.templateType }}</div>
              </div>
              <div>
                <div class="text-xs text-base-content/60">Paper Width</div>
                <div>{{ templateInfo.paperWidth }} chars</div>
              </div>
              <div>
                <div class="text-xs text-base-content/60">Slot</div>
                <div>
                  <span v-if="templateInfo.slot" class="badge badge-accent">Slot {{ templateInfo.slot }}</span>
                  <span v-else class="text-base-content/60">No Slot</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-12">
          <span class="loading loading-spinner loading-lg mb-4"></span>
          <p class="text-base-content/60">Generating preview...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-error">
          <IconAlertCircle class="w-5 h-5" />
          <span>{{ error }}</span>
        </div>

        <!-- Preview Content -->
        <div v-else-if="previewData" class="space-y-4">
          <!-- Receipt Preview -->
          <div class="bg-white border-2 border-base-300 rounded-lg shadow-lg mx-auto" style="max-width: 400px;">
            <div class="p-6">
              <div class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-black" style="word-break: break-word;">{{ typeof previewData === 'string' ? previewData : (previewData.readable || previewData.text || previewData.preview || JSON.stringify(previewData, null, 2)) }}</div>
            </div>
          </div>

          <!-- Info Cards -->
          <div class="grid grid-cols-2 gap-4">
            <div class="stat bg-base-200 rounded-lg">
              <div class="stat-title">Text Length</div>
              <div class="stat-value text-2xl">{{ typeof previewData === 'string' ? previewData.length : (previewData.readable || previewData.text || '').length }}</div>
              <div class="stat-desc">characters</div>
            </div>

            <div class="stat bg-base-200 rounded-lg">
              <div class="stat-title">Lines</div>
              <div class="stat-value text-2xl">{{ typeof previewData === 'string' ? previewData.split('\n').length : (previewData.readable || previewData.text || '').split('\n').length }}</div>
              <div class="stat-desc">lines</div>
            </div>
          </div>

          <!-- Variables Info -->
          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <div>
              <div class="font-semibold">Available Variables:</div>
              <div class="text-sm mt-1">
                businessName, businessAddress, businessPhone, items, subtotal, tax, discount, total, customerName, date, time, etc.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button @click="$emit('close')" class="btn">Close</button>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useReceiptTemplates } from '@/composables/gym/useReceiptTemplates'
import { usePrinterSettings } from '@/composables/gym/printer-settings'
import { useNotification } from '@/composables/core/useNotification'
import { IconAlertCircle, IconInfoCircle, IconPrinter } from '@tabler/icons-vue'
import { api } from '@/plugins/api'

const props = defineProps({
  templateId: {
    type: String,
    required: true
  }
})

defineEmits(['close'])

const { previewData, loading, error, previewTemplate, fetchTemplate } = useReceiptTemplates()
const { getPrinters } = usePrinterSettings()
const { showSuccess, showError } = useNotification()
const templateInfo = ref(null)
const testPrinting = ref(false)
const printers = ref([])
const selectedPrinter = ref(null)

// Load printers on mount
onMounted(async () => {
  try {
    const loadedPrinters = await getPrinters({ isActive: true })
    printers.value = loadedPrinters || []
    // Auto-select first printer
    if (printers.value.length > 0) {
      selectedPrinter.value = printers.value[0].id
    }
  } catch (error) {
    console.error('Failed to load printers:', error)
  }
})

// Load preview when templateId changes
watch(() => props.templateId, async (newId) => {
  if (newId) {
    try {
      // Fetch template details
      templateInfo.value = await fetchTemplate(newId)
      
      // Preview with sample data
      await previewTemplate(newId, {
        businessName: 'Sample Gym & Fitness',
        businessAddress: 'Jl. Contoh No. 123, Jakarta',
        businessPhone: '021-12345678',
        transactionNumber: 'TRX-2024-001',
        customerName: 'John Doe',
        items: [
          { name: 'Membership Gold (3 Bulan)', quantity: 1, price: 1500000 },
          { name: 'PT Session (12 Sesi)', quantity: 1, price: 2400000 }
        ],
        subtotal: 3900000,
        tax: 390000,
        discount: 0,
        total: 4290000
      })
    } catch (err) {
      console.error('Preview error:', err)
    }
  }
}, { immediate: true })

const handleTestPrint = async () => {
  if (!selectedPrinter.value) {
    showError('Please select a printer first')
    return
  }

  testPrinting.value = true
  try {
    const response = await api.post(`/system/receipt-templates/${props.templateId}/test-print`, {
      printerId: selectedPrinter.value,
      data: {
        businessName: 'Sample Gym & Fitness',
        businessAddress: 'Jl. Contoh No. 123, Jakarta',
        businessPhone: '021-12345678',
        transactionNumber: 'TRX-2024-001',
        customerName: 'John Doe',
        items: [
          { name: 'Membership Gold (3 Bulan)', quantity: 1, price: 1500000 },
          { name: 'PT Session (12 Sesi)', quantity: 1, price: 2400000 }
        ],
        subtotal: 3900000,
        tax: 390000,
        discount: 0,
        total: 4290000
      }
    })
    
    if (response.success) {
      showSuccess('Test print sent successfully')
    } else {
      throw new Error(response.message || 'Failed to send test print')
    }
  } catch (error) {
    showError(error.message || 'Failed to send test print')
  } finally {
    testPrinting.value = false
  }
}
</script>
