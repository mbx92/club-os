<template>
  <Teleport to="body">
    <div class="modal modal-open z-[9999]">
      <div class="modal-box max-w-7xl max-h-[90vh] p-0 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-base-300">
          <h3 class="font-bold text-lg">
            {{ template ? 'Edit Template' : 'Create Template' }}
          </h3>
          <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
        </div>

        <div class="grid grid-cols-2 h-[calc(90vh-140px)]">
          <!-- Left: Template Editor -->
          <div class="overflow-y-auto p-6 border-r border-base-300 bg-base-50">
            <div class="space-y-4">
              <!-- Basic Info -->
              <div class="bg-white rounded-lg border border-base-300 p-4">
                <h4 class="font-semibold mb-4 text-base">Basic Information</h4>
                  
                <div class="space-y-3">
                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text font-medium">Template Name *</span>
                    </label>
                    <input
                      v-model="form.name"
                      type="text"
                      placeholder="e.g., Receipt"
                      class="input input-bordered input-sm w-full"
                      required
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="form-control">
                      <label class="label py-1">
                        <span class="label-text font-medium">Template Type *</span>
                      </label>
                      <select v-model="form.templateType" class="select select-bordered select-sm w-full" required>
                        <option value="receipt">Receipt</option>
                        <option value="kitchen">Kitchen Order</option>
                        <option value="label">Label</option>
                        <option value="invoice">Invoice</option>
                        <option value="report">Report</option>
                      </select>
                    </div>

                    <div class="form-control">
                      <label class="label py-1">
                        <span class="label-text font-medium">Paper Width (chars) *</span>
                      </label>
                      <select v-model.number="form.paperWidth" class="select select-bordered select-sm w-full" required>
                        <option :value="48">80mm</option>
                        <option :value="32">58mm</option>
                      </select>
                      <label class="label py-0">
                        <span class="label-text-alt text-xs">80mm = 48 chars, 58mm = 32 chars</span>
                      </label>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="form-control">
                      <label class="label py-1">
                        <span class="label-text font-medium">Assign to Slot</span>
                      </label>
                      <select v-model="form.slot" class="select select-bordered select-sm w-full">
                        <option :value="null">No Slot (Manual Selection)</option>
                        <option value="1">Slot 1</option>
                        <option value="2">Slot 2</option>
                        <option value="3">Slot 3</option>
                        <option value="4">Slot 4</option>
                        <option value="5">Slot 5</option>
                      </select>
                    </div>

                    <div class="flex items-center gap-4 pt-6">
                      <label class="label cursor-pointer gap-2 p-0">
                        <input v-model="form.isActive" type="checkbox" class="checkbox checkbox-sm" />
                        <span class="label-text">Active</span>
                      </label>

                      <label class="label cursor-pointer gap-2 p-0">
                        <input v-model="form.isDefault" type="checkbox" class="checkbox checkbox-sm" />
                        <span class="label-text">Set as Default</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Visual Template Editor -->
              <div class="bg-white rounded-lg border border-base-300 p-4">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="font-semibold text-base">Isi Template</h4>
                  <button 
                    type="button" 
                    class="btn btn-xs btn-ghost gap-1"
                    @click="showVariablesHelp = !showVariablesHelp"
                  >
                    <IconInfoCircle class="w-3 h-3" />
                    <span class="text-xs">Variables</span>
                  </button>
                </div>

                <!-- Variables Help -->
                <div v-if="showVariablesHelp" class="alert alert-info mb-3 py-2">
                  <div class="text-xs">
                    <div class="font-semibold mb-2">Available Variables:</div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
                      <div>&#123;&#123; businessName &#125;&#125;</div>
                      <div>&#123;&#123; date &#125;&#125;</div>
                      <div>&#123;&#123; businessAddress &#125;&#125;</div>
                      <div>&#123;&#123; time &#125;&#125;</div>
                      <div>&#123;&#123; businessPhone &#125;&#125;</div>
                      <div>&#123;&#123; transactionNumber &#125;&#125;</div>
                      <div>&#123;&#123; customerName &#125;&#125;</div>
                      <div>&#123;&#123; items &#125;&#125;</div>
                      <div>&#123;&#123; subtotal &#125;&#125;</div>
                      <div>&#123;&#123; tax &#125;&#125;</div>
                      <div>&#123;&#123; discount &#125;&#125;</div>
                      <div>&#123;&#123; total &#125;&#125;</div>
                    </div>
                  </div>
                </div>
                  
                <div class="form-control">
                  <textarea
                    v-model="form.templateContent"
                    rows="18"
                    placeholder="Example:
&#123;&#123; businessName &#125;&#125;
&#123;&#123; businessAddress &#125;&#125;
Telp: &#123;&#123; businessPhone &#125;&#125;
=====================================
Tanggal  : &#123;&#123; date &#125;&#125;
Customer : &#123;&#123; customerName &#125;&#125;
=====================================
&#123;&#123; items &#125;&#125;
=====================================
Subtotal            Rp &#123;&#123; subtotal &#125;&#125;
TOTAL               Rp &#123;&#123; total &#125;&#125;
=====================================
Terima kasih atas kunjungan Anda"
                    class="textarea textarea-bordered w-full resize-none font-mono text-xs leading-relaxed"
                    :style="{ minHeight: '400px' }"
                    required
                  ></textarea>
                  <div class="flex justify-between mt-2">
                    <span class="text-xs text-base-content/60">{{ form.templateContent?.length || 0 }} characters</span>
                    <span class="text-xs text-base-content/60">Paper width: {{ form.paperWidth }} chars</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Live Preview -->
          <div class="bg-base-50 overflow-y-auto p-6">
            <div class="sticky top-0 bg-base-50 pb-3 mb-4 z-10">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-semibold text-base">Live Preview</h4>
                  <p class="text-xs text-base-content/60 mt-0.5">Updates as you edit</p>
                </div>
              </div>
              <!-- Printer Selector & Test Print -->
              <div v-if="livePreview && !previewLoading" class="flex gap-2">
                <select 
                  v-model="selectedPrinter" 
                  class="select select-bordered select-sm flex-1 text-xs"
                >
                  <option :value="null" disabled>Select Printer</option>
                  <option 
                    v-for="printer in printers" 
                    :key="printer.id" 
                    :value="printer.id"
                  >
                    {{ printer.name }} - {{ printer.ipAddress || printer.address }}
                  </option>
                </select>
                <button 
                  @click="handleTestPrint"
                  class="btn btn-sm btn-primary gap-1"
                  :disabled="testPrinting || !selectedPrinter"
                >
                  <span v-if="testPrinting" class="loading loading-spinner loading-xs"></span>
                  <IconPrinter v-else class="w-4 h-4" />
                  <span class="text-xs">{{ testPrinting ? 'Printing...' : 'Test Print' }}</span>
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="previewLoading" class="flex flex-col items-center justify-center py-12">
              <span class="loading loading-spinner loading-lg mb-4"></span>
              <p class="text-base-content/60">Generating preview...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="previewError" class="alert alert-error">
              <IconAlertCircle class="w-5 h-5" />
              <span>{{ previewError }}</span>
            </div>

            <!-- Preview Content -->
            <div v-else-if="livePreview" class="space-y-3">
              <!-- Receipt Preview with Paper Size -->
              <div class="mx-auto" :style="{ maxWidth: form.paperWidth === 48 ? '360px' : '240px' }">
                <div class="bg-base-300 text-xs px-3 py-1.5 text-center font-medium rounded-t-lg">
                  {{ form.paperWidth === 48 ? '80mm' : '58mm' }} Paper ({{ form.paperWidth }} chars)
                </div>
                <div class="bg-white border-2 border-base-300 shadow-xl">
                  <div class="p-3">
                    <div 
                      class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-black" 
                      :style="{ 
                        wordBreak: 'break-word',
                        maxWidth: `${form.paperWidth}ch`
                      }"
                    >{{ typeof livePreview === 'string' ? livePreview : JSON.stringify(livePreview, null, 2) }}</div>
                  </div>
                </div>
                <div class="bg-base-300 text-xs px-3 py-1.5 text-center text-base-content/70 rounded-b-lg">
                  Actual print size preview
                </div>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-white border border-base-300 rounded-lg py-2 px-3">
                  <div class="text-xs text-base-content/60">Text Length</div>
                  <div class="text-lg font-bold">{{ typeof livePreview === 'string' ? livePreview.length : 0 }}</div>
                  <div class="text-xs text-base-content/50">characters</div>
                </div>

                <div class="bg-white border border-base-300 rounded-lg py-2 px-3">
                  <div class="text-xs text-base-content/60">Lines</div>
                  <div class="text-lg font-bold">{{ typeof livePreview === 'string' ? livePreview.split('\n').length : 0 }}</div>
                  <div class="text-xs text-base-content/50">lines</div>
                </div>
              </div>
            </div>

            <!-- Empty State (initial) -->
            <div v-else class="flex flex-col items-center justify-center py-12 text-base-content/40">
              <IconFileText class="w-16 h-16 mb-4" />
              <p>Preview will appear here</p>
            </div>
          </div>
        </div>

        <!-- Actions (fixed at bottom) -->
        <div class="border-t border-base-300 px-6 py-3 bg-base-50 flex justify-end gap-2">
          <button type="button" @click="$emit('close')" class="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="loading" @click="handleSubmit">
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            {{ loading ? 'Saving...' : 'Save Template' }}
          </button>
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
import { IconAlertCircle, IconFileText, IconPrinter, IconInfoCircle } from '@tabler/icons-vue'
import { api } from '@/plugins/api'

const props = defineProps({
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const { createTemplate, updateTemplate, loading } = useReceiptTemplates()
const { getPrinters } = usePrinterSettings()
const { showSuccess, showError } = useNotification()

const livePreview = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)
const testPrinting = ref(false)
const printers = ref([])
const selectedPrinter = ref(null)
const showVariablesHelp = ref(false)
let previewTimeout = null

const form = ref({
  name: '',
  templateType: 'receipt',
  paperWidth: 48,
  slot: null,
  isActive: true,
  isDefault: false,
  templateContent: ''
})

// Sample data for live preview
const sampleData = {
  businessName: 'Gym & Fitness Center',
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

// Generate preview without ID (for new templates or live editing)
const generateLivePreview = async () => {
  // Don't generate preview if template content is empty
  if (!form.value.templateContent || form.value.templateContent.trim() === '') {
    livePreview.value = null
    previewLoading.value = false
    previewError.value = null
    return
  }

  // Simple client-side preview: replace template variables with sample data
  const simplePreview = () => {
    let preview = form.value.templateContent
    
    // Replace all template variables with sample data
    preview = preview.replace(/\{\{\s*businessName\s*\}\}/g, sampleData.businessName)
    preview = preview.replace(/\{\{\s*businessAddress\s*\}\}/g, sampleData.businessAddress)
    preview = preview.replace(/\{\{\s*businessPhone\s*\}\}/g, sampleData.businessPhone)
    preview = preview.replace(/\{\{\s*date\s*\}\}/g, sampleData.date)
    preview = preview.replace(/\{\{\s*time\s*\}\}/g, sampleData.time)
    preview = preview.replace(/\{\{\s*transactionNumber\s*\}\}/g, sampleData.transactionNumber)
    preview = preview.replace(/\{\{\s*customerName\s*\}\}/g, sampleData.customerName)
    preview = preview.replace(/\{\{\s*subtotal\s*\}\}/g, sampleData.subtotal)
    preview = preview.replace(/\{\{\s*tax\s*\}\}/g, sampleData.tax)
    preview = preview.replace(/\{\{\s*discount\s*\}\}/g, sampleData.discount)
    preview = preview.replace(/\{\{\s*total\s*\}\}/g, sampleData.total)
    
    // Replace items variable with formatted item list
    if (preview.includes('{{ items }}')) {
      const itemsText = sampleData.items.map((item, index) => 
        `${index + 1}. ${item.name}\n  ${item.quantity}x Rp ${item.price.toLocaleString('id-ID')}                                                   Rp ${item.subtotal.toLocaleString('id-ID')}`
      ).join('\n\n')
      preview = preview.replace(/\{\{\s*items\s*\}\}/g, itemsText)
    }
    
    livePreview.value = preview
    previewLoading.value = false
  }

  // Use simple client-side preview for immediate feedback
  simplePreview()
}

// Watch form changes for live preview
watch(form, () => {
  generateLivePreview()
}, { deep: true })

// Load template data if editing
watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    form.value = {
      name: newTemplate.name || '',
      templateType: newTemplate.templateType || 'receipt',
      paperWidth: newTemplate.paperWidth || 48,
      slot: newTemplate.slot || null,
      isActive: newTemplate.isActive !== undefined ? newTemplate.isActive : true,
      isDefault: newTemplate.isDefault || false,
      templateContent: newTemplate.templateContent || ''
    }
  }
  // Generate initial preview
  generateLivePreview()
}, { immediate: true })

const handleSubmit = async () => {
  try {
    if (props.template?.id) {
      await updateTemplate(props.template.id, form.value)
      showSuccess('Template updated successfully')
    } else {
      await createTemplate(form.value)
      showSuccess('Template created successfully')
    }
    emit('saved')
  } catch (error) {
    showError(error.message || 'Failed to save template')
  }
}

const handleTestPrint = async () => {
  if (!selectedPrinter.value) {
    showError('Please select a printer first')
    return
  }

  testPrinting.value = true
  try {
    // Test print with draft template (unsaved)
    const response = await api.post('/system/receipt-templates/test-print-draft', {
      printerId: selectedPrinter.value,
      template: form.value,
      data: sampleData
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
