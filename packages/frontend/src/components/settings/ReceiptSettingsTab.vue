<template>
  <div class="receipt-settings-tab">
    <!-- Template Type Selector -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-4">Receipt Template Settings</h3>
      <div class="tabs tabs-boxed bg-base-200">
        <button 
          v-for="type in templateTypes" 
          :key="type.value"
          :class="['tab', { 'tab-active': selectedType === type.value }]"
          @click="selectTemplate(type.value)"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Template Editor -->
    <div v-else-if="currentSettings" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Settings Form -->
      <div class="space-y-4">
        <!-- Quick Actions -->
        <div class="flex gap-2 mb-4">
          <button 
            @click="setLanguage('id')" 
            class="btn btn-sm btn-outline"
          >
            🇮🇩 Bahasa Indonesia
          </button>
          <button 
            @click="setLanguage('en')" 
            class="btn btn-sm btn-outline"
          >
            🇬🇧 English
          </button>
        </div>

        <!-- Header Settings -->
        <div v-if="selectedType !== 'kitchen' && selectedType !== 'label'" class="card bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-3">Header Settings</h4>
            
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.header.showBusinessName" 
                />
                <span class="label-text">Show Business Name</span>
              </label>
            </div>

            <div v-if="currentSettings.header.showBusinessName" class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Business Name Override</span>
              </label>
              <input 
                type="text"
                class="input input-sm input-bordered w-full"
                v-model="currentSettings.header.businessNameOverride"
                placeholder="Leave empty to use default"
              />
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.header.showAddress" 
                />
                <span class="label-text">Show Address</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.header.showPhone" 
                />
                <span class="label-text">Show Phone</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.header.showTaxNumber" 
                />
                <span class="label-text">Show Tax Number (NPWP)</span>
              </label>
            </div>

            <div v-if="currentSettings.header.showTaxNumber" class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Tax Number (NPWP)</span>
              </label>
              <input 
                type="text"
                class="input input-sm input-bordered w-full"
                v-model="currentSettings.header.taxNumber"
                placeholder="01.234.567.8-901.000"
              />
            </div>

            <div class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Custom Header Text</span>
              </label>
              <input 
                type="text"
                class="input input-sm input-bordered w-full"
                v-model="currentSettings.header.customHeaderText"
                placeholder="e.g., Cabang Pusat - Jakarta"
              />
            </div>
          </div>
        </div>

        <!-- Body Settings -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-3">Body Settings</h4>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Order Label</span>
                </label>
                <input 
                  type="text"
                  class="input input-sm input-bordered w-full"
                  v-model="currentSettings.body.orderLabel"
                />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Date Label</span>
                </label>
                <input 
                  type="text"
                  class="input input-sm input-bordered w-full"
                  v-model="currentSettings.body.dateLabel"
                />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Total Label</span>
                </label>
                <input 
                  type="text"
                  class="input input-sm input-bordered w-full"
                  v-model="currentSettings.body.totalLabel"
                />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Paper Width</span>
                </label>
                <select 
                  class="select select-sm select-bordered w-full"
                  v-model.number="currentSettings.paperWidth"
                >
                  <option :value="32">58mm (32 chars)</option>
                  <option :value="48">80mm (48 chars)</option>
                  <option :value="80">110mm (80 chars)</option>
                </select>
              </div>
            </div>

            <div class="divider my-2"></div>

            <div class="space-y-2">
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    v-model="currentSettings.body.showCustomer" 
                  />
                  <span class="label-text">Show Customer Name</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    v-model="currentSettings.body.showTable" 
                  />
                  <span class="label-text">Show Table Number</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    v-model="currentSettings.body.showDiscount" 
                  />
                  <span class="label-text">Show Discount</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    v-model="currentSettings.body.showTax" 
                  />
                  <span class="label-text">Show Tax</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-2">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    v-model="currentSettings.body.showPaymentBreakdown" 
                  />
                  <span class="label-text">Show Payment Breakdown</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Settings -->
        <div v-if="selectedType !== 'kitchen' && selectedType !== 'label'" class="card bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <h4 class="font-semibold mb-3">Footer Settings</h4>
            
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.footer.showThankYou" 
                />
                <span class="label-text">Show Thank You Message</span>
              </label>
            </div>

            <div v-if="currentSettings.footer.showThankYou" class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Thank You Message</span>
              </label>
              <textarea 
                class="textarea textarea-sm textarea-bordered w-full"
                rows="2"
                v-model="currentSettings.footer.thankYouMessage"
              ></textarea>
            </div>

            <div class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Custom Footer Text</span>
              </label>
              <input 
                type="text"
                class="input input-sm input-bordered w-full"
                v-model="currentSettings.footer.customFooterText"
                placeholder="e.g., Buka 08:00-22:00"
              />
            </div>

            <div class="divider my-2"></div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.footer.showSocialMedia" 
                />
                <span class="label-text">Show Social Media</span>
              </label>
            </div>

            <div v-if="currentSettings.footer.showSocialMedia" class="space-y-2">
              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Instagram</span>
                </label>
                <div class="input-group input-group-sm">
                  <span class="bg-base-200">@</span>
                  <input 
                    type="text"
                    class="input input-sm input-bordered w-full"
                    v-model="currentSettings.footer.socialMedia.instagram"
                    placeholder="username"
                  />
                </div>
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">WhatsApp</span>
                </label>
                <input 
                  type="text"
                  class="input input-sm input-bordered w-full"
                  v-model="currentSettings.footer.socialMedia.whatsapp"
                  placeholder="08123456789"
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  v-model="currentSettings.footer.showWebsite" 
                />
                <span class="label-text">Show Website</span>
              </label>
            </div>

            <div v-if="currentSettings.footer.showWebsite" class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs">Website URL</span>
              </label>
              <input 
                type="text"
                class="input input-sm input-bordered w-full"
                v-model="currentSettings.footer.website"
                placeholder="www.example.com"
              />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button 
            @click="saveSettings" 
            class="btn btn-primary btn-sm flex-1"
            :disabled="saving"
          >
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
          <button 
            @click="resetSettings" 
            class="btn btn-ghost btn-sm"
            :disabled="saving"
          >
            Reset to Default
          </button>
        </div>
      </div>

      <!-- Right: Live Preview -->
      <div class="sticky top-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold">Live Preview</h4>
              
              <!-- Test Print Button -->
              <div class="dropdown dropdown-end">
                <button 
                  tabindex="0" 
                  class="btn btn-sm btn-primary gap-2"
                  :disabled="testPrinting || !printers.length"
                >
                  <IconPrinter class="w-4 h-4" />
                  {{ testPrinting ? 'Printing...' : 'Test Print' }}
                </button>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mt-2">
                  <li class="menu-title">
                    <span>Select Printer</span>
                  </li>
                  <li v-for="printer in printers" :key="printer.id">
                    <a @click="handleTestPrint(printer.id)">
                      {{ printer.name }}
                      <span class="badge badge-sm">{{ printer.ipAddress }}</span>
                    </a>
                  </li>
                  <li v-if="!printers.length">
                    <a disabled>No printers available</a>
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- Paper Size Label -->
            <div class="mx-auto thermal-paper-container" :style="{ width: paperWidthPx }">
              <div class="bg-base-300 text-xs px-3 py-1.5 text-center font-medium rounded-t-lg">
                {{ paperSizeLabel }} ({{ currentSettings.paperWidth }} chars)
              </div>
              
              <!-- Receipt Preview - Thermal Paper Simulation -->
              <div class="thermal-paper">
                <div class="thermal-paper-content">
                  <pre class="receipt-preview"
                       :style="{ width: `${currentSettings.paperWidth}ch` }">{{ previewContent }}</pre>
                </div>
              </div>
              
              <div class="bg-base-300 text-xs px-3 py-1.5 text-center text-base-content/70 rounded-b-lg">
                Actual print size preview
              </div>
            </div>

            <!-- Preview Info -->
            <div class="grid grid-cols-2 gap-2 mt-4">
              <div class="stat bg-base-200 rounded-lg p-2">
                <div class="stat-title text-xs">Lines</div>
                <div class="stat-value text-lg">{{ previewLines }}</div>
              </div>
              <div class="stat bg-base-200 rounded-lg p-2">
                <div class="stat-title text-xs">Characters</div>
                <div class="stat-value text-lg">{{ previewLength }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useReceiptSettings } from '@/composables/gym/useReceiptSettings'
import { usePrinterSettings } from '@/composables/gym/printer-settings'
import { useNotification } from '@/composables/core/useNotification'
import { IconPrinter } from '@tabler/icons-vue'

const { showSuccess, showError } = useNotification()
const { 
  settings, 
  loading, 
  fetchSettings, 
  updateTemplate, 
  resetTemplate,
  testPrint,
  testPrintActual
} = useReceiptSettings()

const { getPrinters } = usePrinterSettings()

// Enhanced sample data for all template types
const sampleData = {
  // General info
  businessName: 'Gym & Fitness Center',
  businessAddress: 'Jl. Contoh No. 123, Jakarta',
  businessPhone: '021-12345678',
  date: new Date().toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }),
  time: new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }),
  transactionNumber: 'ORD-20250001',
  
  // Restaurant/Order info
  orderType: 'dineIn', // dineIn, takeaway, delivery
  tableNumber: '5',
  customerName: 'John Doe',
  cashierName: 'Admin',
  items: [
    {
      name: 'Nasi Goreng Spesial',
      quantity: 2,
      price: 35000,
      subtotal: 70000,
      modifiers: ['Extra Pedas', 'Tanpa Bawang'],
      notes: 'Jangan terlalu matang'
    },
    {
      name: 'Es Teh Manis',
      quantity: 2,
      price: 8000,
      subtotal: 16000,
      modifiers: [],
      notes: 'Es banyak, gula sedikit'
    },
    {
      name: 'Ayam Bakar',
      quantity: 1,
      price: 45000,
      subtotal: 45000,
      modifiers: ['Sambal Extra', 'Lalapan Lengkap'],
      notes: null
    }
  ],
  subtotal: '131.000',
  tax: '13.100',
  discount: '0',
  total: '144.100',
  
  // Membership/Service info
  memberId: 'MBR-12345',
  memberName: 'John Doe',
  packageName: 'Gold Membership - 6 Bulan',
  packagePrice: '2.500.000',
  startDate: '08 Des 2025',
  endDate: '08 Jun 2026',
  validityPeriod: '6 Bulan',
  
  // Class info
  instructorName: 'Sarah Yoga',
  className: 'Yoga Class - 10 Sesi',
  totalSessions: 10,
  remainingSessions: 10,
  sessionDuration: '60 menit',
  pricePerSession: '150.000',
  
  // Personal Training info
  trainerName: 'Michael PT',
  ptPackage: 'Personal Training - 12 Sesi',
  ptTotalSessions: 12,
  ptRemainingSessions: 12,
  ptSessionDuration: '90 menit',
  ptPricePerSession: '250.000',
  ptValidUntil: '08 Mar 2026'
}

const templateTypes = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'label', label: 'Label' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'report', label: 'Report' },
  { value: 'membership', label: 'Membership' },
  { value: 'class', label: 'Class' },
  { value: 'personalTraining', label: 'Personal Training' }
]

const selectedType = ref('receipt')
const currentSettings = ref(null)
const saving = ref(false)
const printers = ref([])
const selectedPrinter = ref(null)
const testPrinting = ref(false)

// Computed
const paperSizeLabel = computed(() => {
  const width = currentSettings.value?.paperWidth || 48
  if (width === 32) return '58mm'
  if (width === 48) return '80mm'
  if (width === 80) return '110mm'
  return `${width}mm`
})

const paperWidthPx = computed(() => {
  const width = currentSettings.value?.paperWidth || 48
  // Exact monospace width calculation with padding compensation
  // 8.46px per character + extra padding for safety
  return `${(width * 8.46) + 20}px`
})

const previewContent = computed(() => {
  if (!currentSettings.value) return ''
  
  const s = currentSettings.value
  const w = s.paperWidth || 48
  const sep = s.header?.separatorChar || '='
  const bodySep = s.body?.separatorChar || '-'
  
  let content = ''
  
  // ========== HEADER ==========
  if (s.header?.showBusinessName !== false) {
    content += centerText(s.header?.businessNameOverride || sampleData.businessName, w) + '\n'
  }
  if (s.header?.showAddress !== false) {
    content += centerText(sampleData.businessAddress, w) + '\n'
  }
  if (s.header?.showPhone !== false) {
    content += centerText(`Tel: ${sampleData.businessPhone}`, w) + '\n'
  }
  if (s.header?.showTaxNumber && s.header?.taxNumber) {
    content += centerText(`NPWP: ${s.header.taxNumber}`, w) + '\n'
  }
  if (s.header?.customHeaderText) {
    content += centerText(s.header.customHeaderText, w) + '\n'
  }
  content += sep.repeat(w) + '\n\n'
  
  // ========== BODY ==========
  // Check template type for special handling
  const isServiceTemplate = selectedType.value === 'membership' || 
                           selectedType.value === 'class' || 
                           selectedType.value === 'personalTraining'
  
  // Order/Transaction info
  content += `${s.body?.orderLabel || 'Order'}: ${sampleData.transactionNumber}\n`
  content += `${s.body?.dateLabel || 'Tanggal'}: ${sampleData.date} ${sampleData.time}\n`
  
  // For service templates (membership/class/PT), show member and package info
  if (isServiceTemplate) {
    content += '\n' + bodySep.repeat(w) + '\n'
    
    if (selectedType.value === 'membership') {
      content += `Member: ${sampleData.memberName}\n`
      content += `ID Member: ${sampleData.memberId}\n`
      content += '\n' + bodySep.repeat(w) + '\n'
      content += `Paket: ${sampleData.packageName}\n`
      content += `Berlaku: ${sampleData.startDate} - ${sampleData.endDate}\n`
      content += `Masa Aktif: ${sampleData.validityPeriod}\n`
    } else if (selectedType.value === 'class') {
      content += `Member: ${sampleData.memberName}\n`
      content += `Instruktur: ${sampleData.instructorName}\n`
      content += '\n' + bodySep.repeat(w) + '\n'
      content += `Paket: ${sampleData.className}\n`
      content += `Total Sesi: ${sampleData.totalSessions}\n`
      content += `Sisa Sesi: ${sampleData.remainingSessions}\n`
      content += `Durasi per Sesi: ${sampleData.sessionDuration}\n`
      content += `Harga per Sesi: Rp ${sampleData.pricePerSession}\n`
    } else if (selectedType.value === 'personalTraining') {
      content += `Member: ${sampleData.memberName}\n`
      content += `Trainer: ${sampleData.trainerName}\n`
      content += '\n' + bodySep.repeat(w) + '\n'
      content += `Paket: ${sampleData.ptPackage}\n`
      content += `Total Sesi: ${sampleData.ptTotalSessions}\n`
      content += `Sisa Sesi: ${sampleData.ptRemainingSessions}\n`
      content += `Durasi per Sesi: ${sampleData.ptSessionDuration}\n`
      content += `Harga per Sesi: Rp ${sampleData.ptPricePerSession}\n`
      content += `Berlaku Sampai: ${sampleData.ptValidUntil}\n`
    }
    
    content += bodySep.repeat(w) + '\n'
    
    // Price summary for service templates
    content += padLine('Harga Paket', `Rp ${sampleData.packagePrice}`, w) + '\n'
    
    if (s.body?.showDiscount !== false && sampleData.discount !== '0') {
      content += padLine(s.body?.discountLabel || 'Diskon', `Rp ${sampleData.discount}`, w) + '\n'
    }
    
    if (s.body?.showTax !== false) {
      content += padLine(s.body?.taxLabel || 'Pajak', `Rp ${sampleData.tax}`, w) + '\n'
    }
    
    content += bodySep.repeat(w) + '\n'
    content += padLine(s.body?.totalLabel || 'TOTAL', `Rp ${sampleData.total}`, w) + '\n'
    content += sep.repeat(w) + '\n'
    
  } else {
    // Regular order/restaurant template
    
    // Order type (kitchen template)
    if (s.body?.showOrderType !== false && sampleData.orderType) {
      const typeLabel = s.body?.typeLabel || 'Tipe'
      let orderTypeText = sampleData.orderType
      if (sampleData.orderType === 'dineIn') {
        orderTypeText = s.body?.dineInLabel || 'Dine In'
      } else if (sampleData.orderType === 'takeaway') {
        orderTypeText = s.body?.takeawayLabel || 'Take Away'
      } else if (sampleData.orderType === 'delivery') {
        orderTypeText = s.body?.deliveryLabel || 'Delivery'
      }
      content += `${typeLabel}: ${orderTypeText}\n`
    }
    
    if (s.body?.showTable !== false) {
      content += `${s.body?.tableLabel || 'Meja'}: ${sampleData.tableNumber}\n`
    }
    if (s.body?.showCustomer !== false) {
      content += `${s.body?.customerLabel || 'Pelanggan'}: ${sampleData.customerName}\n`
    }
    if (s.body?.showCashier !== false && sampleData.cashierName) {
      content += `${s.body?.cashierLabel || 'Kasir'}: ${sampleData.cashierName}\n`
    }
    
    content += '\n' + bodySep.repeat(w) + '\n'
    
    // ========== ITEMS ==========
    const showPrices = s.body?.showPrices !== false
    const showQuantity = s.body?.showQuantity !== false
    const showModifiers = s.body?.showModifiers !== false
    const showNotes = s.body?.showNotes !== false
    
    sampleData.items.forEach((item, i) => {
      // Item name with quantity
      if (showQuantity) {
        content += `${item.quantity}x ${item.name}\n`
      } else {
        content += `${i + 1}. ${item.name}\n`
      }
      
      // Modifiers
      if (showModifiers && item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(modifier => {
          content += `   + ${modifier}\n`
        })
      }
      
      // Notes
      if (showNotes && item.notes) {
        const notesLabel = s.body?.notesLabel || 'Catatan'
        content += `   ${notesLabel}: ${item.notes}\n`
      }
      
      // Price (if enabled)
      if (showPrices) {
        const priceRight = `Rp ${item.subtotal.toLocaleString('id-ID')}`
        content += padLine('', priceRight, w) + '\n'
      }
      
      content += '\n'
    })
    
    // ========== TOTALS (if prices shown) ==========
    if (showPrices) {
      content += bodySep.repeat(w) + '\n'
      content += padLine(s.body?.subtotalLabel || 'Subtotal', `Rp ${sampleData.subtotal}`, w) + '\n'
      
      if (s.body?.showDiscount !== false && sampleData.discount !== '0') {
        content += padLine(s.body?.discountLabel || 'Diskon', `Rp ${sampleData.discount}`, w) + '\n'
      }
      
      if (s.body?.showTax !== false) {
        content += padLine(s.body?.taxLabel || 'Pajak', `Rp ${sampleData.tax}`, w) + '\n'
      }
      
      content += bodySep.repeat(w) + '\n'
      content += padLine(s.body?.totalLabel || 'TOTAL', `Rp ${sampleData.total}`, w) + '\n'
    } else {
      content += bodySep.repeat(w) + '\n'
    }
    
    content += sep.repeat(w) + '\n'
  }
  
  // ========== FOOTER ==========
  if (s.footer?.showThankYou !== false && s.footer?.thankYouMessage) {
    content += '\n' + centerText(s.footer.thankYouMessage, w) + '\n'
  }
  
  if (s.footer?.customFooterText) {
    content += '\n' + centerText(s.footer.customFooterText, w) + '\n'
  }
  
  if (s.footer?.showSocialMedia && s.footer?.socialMedia) {
    content += '\n'
    if (s.footer.socialMedia.instagram) {
      content += centerText(`IG: @${s.footer.socialMedia.instagram}`, w) + '\n'
    }
    if (s.footer.socialMedia.whatsapp) {
      content += centerText(`WA: ${s.footer.socialMedia.whatsapp}`, w) + '\n'
    }
  }
  
  if (s.footer?.showWebsite && s.footer?.website) {
    content += centerText(s.footer.website, w) + '\n'
  }
  
  if (s.footer?.showSocialMedia || s.footer?.showWebsite) {
    content += sep.repeat(w) + '\n'
  }
  
  return content
})

const previewLines = computed(() => {
  return previewContent.value.split('\n').length
})

const previewLength = computed(() => {
  return previewContent.value.length
})

// Helper functions
const centerText = (text, width) => {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

const padLine = (left, right, width) => {
  const spaces = width - left.length - right.length
  return left + ' '.repeat(Math.max(1, spaces)) + right
}

// Watch for selectedType changes
watch(selectedType, async (newType) => {
  try {
    // Fetch settings if not loaded
    if (!settings.value[newType]) {
      await fetchSettings(newType)
    }
    
    // Update currentSettings with loaded or default settings
    currentSettings.value = JSON.parse(JSON.stringify(
      settings.value[newType] || getDefaultSettings(newType)
    ))
  } catch (error) {
    console.error('Failed to load template:', error)
    // Use default settings if fetch fails
    currentSettings.value = getDefaultSettings(newType)
  }
}, { immediate: false })

// Watch for settings changes (after save/reset)
watch(() => settings.value[selectedType.value], (newSettings) => {
  if (newSettings) {
    currentSettings.value = JSON.parse(JSON.stringify(newSettings))
  }
}, { deep: true })

// Methods
const selectTemplate = async (type) => {
  selectedType.value = type
  
  try {
    if (!settings.value[type]) {
      await fetchSettings(type)
    }
    
    // Clone settings to avoid direct mutation
    currentSettings.value = JSON.parse(JSON.stringify(settings.value[type] || getDefaultSettings(type)))
  } catch (error) {
    showError('Failed to load template settings')
    currentSettings.value = getDefaultSettings(type)
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await updateTemplate(selectedType.value, currentSettings.value)
    showSuccess('Settings saved successfully!')
  } catch (error) {
    if (error.statusCode === 409) {
      showError('Template does not exist. Creating new template...')
      // Could implement create logic here
    } else {
      showError('Failed to save settings')
    }
  } finally {
    saving.value = false
  }
}

const resetSettings = async () => {
  if (!confirm('Reset this template to default settings?')) return
  
  saving.value = true
  try {
    const resetData = await resetTemplate(selectedType.value)
    currentSettings.value = JSON.parse(JSON.stringify(resetData))
    showSuccess('Template reset to default!')
  } catch (error) {
    showError('Failed to reset template')
  } finally {
    saving.value = false
  }
}

const setLanguage = async (lang) => {
  const labels = {
    id: {
      orderLabel: 'Order',
      dateLabel: 'Tanggal',
      tableLabel: 'Meja',
      customerLabel: 'Pelanggan',
      subtotalLabel: 'Subtotal',
      taxLabel: 'Pajak',
      totalLabel: 'TOTAL',
      thankYouMessage: 'Terima kasih atas kunjungan Anda!'
    },
    en: {
      orderLabel: 'Order',
      dateLabel: 'Date',
      tableLabel: 'Table',
      customerLabel: 'Customer',
      subtotalLabel: 'Subtotal',
      taxLabel: 'Tax',
      totalLabel: 'TOTAL',
      thankYouMessage: 'Thank you for your visit!'
    }
  }
  
  // Update current settings
  currentSettings.value.body = {
    ...currentSettings.value.body,
    ...labels[lang]
  }
  
  currentSettings.value.footer = {
    ...currentSettings.value.footer,
    thankYouMessage: labels[lang].thankYouMessage
  }
  
  showSuccess(`Language changed to ${lang === 'id' ? 'Indonesian' : 'English'}`)
}

// Test print
const handleTestPrint = async (printerId) => {
  testPrinting.value = true
  try {
    // Gunakan testPrintActual - lebih sederhana, langsung pakai settings yang sudah tersimpan
    const result = await testPrintActual(
      selectedType.value,
      printerId
    )
    
    showSuccess(`Test print sent to ${result.printerName}`)
  } catch (error) {
    showError(error.message || 'Failed to send test print')
  } finally {
    testPrinting.value = false
  }
}

const getDefaultSettings = (type = 'receipt') => {
  // Base settings
  const base = {
    paperWidth: 48,
    header: {
      showBusinessName: true,
      businessNameOverride: null,
      showAddress: true,
      showCity: true,
      showPhone: true,
      showTaxNumber: false,
      taxNumber: null,
      customHeaderText: null,
      separatorChar: '='
    },
    body: {
      orderLabel: 'Order',
      dateLabel: 'Tanggal',
      showOrderType: true,
      typeLabel: 'Tipe',
      dineInLabel: 'Dine In',
      takeawayLabel: 'Take Away',
      deliveryLabel: 'Delivery',
      tableLabel: 'Meja',
      customerLabel: 'Pelanggan',
      cashierLabel: 'Kasir',
      subtotalLabel: 'Subtotal',
      discountLabel: 'Diskon',
      taxLabel: 'Pajak',
      totalLabel: 'TOTAL',
      showTable: true,
      showCustomer: true,
      showCashier: true,
      showItemCode: false,
      showQuantity: true,
      showModifiers: false,
      showNotes: false,
      notesLabel: 'Catatan',
      showDiscount: true,
      showTax: true,
      showPaymentBreakdown: true,
      showPrices: true,
      separatorChar: '-'
    },
    footer: {
      showThankYou: true,
      thankYouMessage: 'Terima kasih atas kunjungan Anda!',
      customFooterText: null,
      showSocialMedia: false,
      socialMedia: {
        instagram: null,
        whatsapp: null
      },
      showWebsite: false,
      website: null,
      separatorChar: '=',
      autoCut: true
    }
  }

  // Template-specific overrides
  if (type === 'kitchen') {
    return {
      ...base,
      header: {
        ...base.header,
        showBusinessName: false,
        showAddress: false,
        showCity: false,
        showPhone: false,
        customHeaderText: '=== DAPUR ==='
      },
      body: {
        ...base.body,
        dateLabel: 'Waktu',
        customerLabel: 'Atas Nama',
        showCashier: false,
        showModifiers: true,
        showNotes: true,
        showPrices: false,
        showDiscount: false,
        showTax: false,
        showPaymentBreakdown: false
      },
      footer: {
        ...base.footer,
        showThankYou: false,
        customFooterText: 'SEGERA PROSES!',
        showSocialMedia: false,
        showWebsite: false
      }
    }
  }

  if (type === 'label') {
    return {
      ...base,
      paperWidth: 32,
      header: {
        ...base.header,
        showBusinessName: false,
        showAddress: false,
        showCity: false,
        showPhone: false,
        customHeaderText: '=== LABEL PAKET ==='
      },
      body: {
        ...base.body,
        showOrderType: true,
        showTable: false,
        showCashier: false,
        showModifiers: false,
        showNotes: false,
        showPrices: false,
        showDiscount: false,
        showTax: false,
        showPaymentBreakdown: false
      },
      footer: {
        ...base.footer,
        showThankYou: false,
        customFooterText: null,
        showSocialMedia: false,
        showWebsite: false
      }
    }
  }

  if (type === 'invoice') {
    return {
      ...base,
      header: {
        ...base.header,
        showTaxNumber: true,
        taxNumber: '01.234.567.8-901.000',
        customHeaderText: 'INVOICE'
      },
      body: {
        ...base.body,
        showItemCode: true,
        showPrices: true
      },
      footer: {
        ...base.footer,
        thankYouMessage: 'Terima kasih atas kepercayaan Anda',
        customFooterText: 'Pembayaran melalui transfer bank'
      }
    }
  }

  if (type === 'report') {
    return {
      ...base,
      header: {
        ...base.header,
        showAddress: false,
        showPhone: false,
        customHeaderText: '=== LAPORAN PENJUALAN ==='
      },
      body: {
        ...base.body,
        orderLabel: 'Laporan',
        dateLabel: 'Periode',
        showTable: false,
        showCustomer: false,
        showCashier: false
      },
      footer: {
        ...base.footer,
        showThankYou: false,
        customFooterText: 'Dokumen ini dicetak otomatis',
        showSocialMedia: false
      }
    }
  }

  if (type === 'membership') {
    return {
      ...base,
      header: {
        ...base.header,
        customHeaderText: 'BUKTI PEMBELIAN MEMBERSHIP'
      },
      body: {
        ...base.body,
        orderLabel: 'No. Transaksi',
        customerLabel: 'Member',
        showTable: false,
        showCashier: false,
        showOrderType: false,
        showModifiers: false,
        showNotes: false,
        showPrices: true,
        showDiscount: true,
        showTax: true
      },
      footer: {
        ...base.footer,
        thankYouMessage: 'Selamat bergabung! Nikmati fasilitas kami.',
        customFooterText: 'Simpan struk ini sebagai bukti pembelian'
      }
    }
  }

  if (type === 'class') {
    return {
      ...base,
      header: {
        ...base.header,
        customHeaderText: 'BUKTI PEMBELIAN CLASS'
      },
      body: {
        ...base.body,
        orderLabel: 'No. Transaksi',
        customerLabel: 'Member',
        showTable: false,
        showCashier: false,
        showOrderType: false,
        showModifiers: false,
        showNotes: false,
        showPrices: true,
        showDiscount: true,
        showTax: true
      },
      footer: {
        ...base.footer,
        thankYouMessage: 'Terima kasih! Jangan lupa reservasi jadwal Anda.',
        customFooterText: 'Hubungi instruktur untuk info lebih lanjut'
      }
    }
  }

  if (type === 'personalTraining') {
    return {
      ...base,
      header: {
        ...base.header,
        customHeaderText: 'BUKTI PEMBELIAN PERSONAL TRAINING'
      },
      body: {
        ...base.body,
        orderLabel: 'No. Transaksi',
        customerLabel: 'Member',
        showTable: false,
        showCashier: false,
        showOrderType: false,
        showModifiers: false,
        showNotes: false,
        showPrices: true,
        showDiscount: true,
        showTax: true
      },
      footer: {
        ...base.footer,
        thankYouMessage: 'Terima kasih! Hubungi trainer untuk jadwal sesi.',
        customFooterText: 'Maksimal reschedule 24 jam sebelum sesi'
      }
    }
  }

  // Default: receipt type
  return base
}

// Initialize
onMounted(async () => {
  try {
    // Load printers
    const loadedPrinters = await getPrinters()
    printers.value = loadedPrinters || []
    
    // Load settings
    await fetchSettings()
    await selectTemplate('receipt')
  } catch (error) {
    // If no settings exist, use default
    currentSettings.value = getDefaultSettings()
  }
})
</script>

<style scoped>
.receipt-settings-tab {
  @apply w-full;
}

.thermal-paper-container {
  /* Container for the thermal paper simulation */
  position: relative;
}

.thermal-paper {
  /* Simulate actual thermal paper */
  background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.05),
    inset 0 0 0 1px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}

.thermal-paper::before {
  /* Add subtle paper texture */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, 0.008) 1px,
      rgba(0, 0, 0, 0.008) 2px
    );
  pointer-events: none;
}

.thermal-paper-content {
  padding: 12px 8px;
  position: relative;
  z-index: 1;
}

.receipt-preview {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre;
  overflow-x: hidden;
  overflow-y: auto;
  word-break: keep-all;
  word-wrap: normal;
  margin: 0;
  padding: 0;
  color: #000000;
  background: transparent;
}
</style>
