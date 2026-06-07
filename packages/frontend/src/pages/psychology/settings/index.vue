<route lang="yaml">
meta:
  title: Psychology Settings
  layout: default
  requiresModule: psychology
</route>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Settings Psikolog</h1>
        <p class="text-base-content/60">Atur profil dan branding untuk laporan</p>
      </div>
      <button 
        class="btn btn-primary" 
        @click="saveSettings" 
        :disabled="saving"
      >
        <IconDeviceFloppy class="w-4 h-4" />
        {{ saving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else>
      <div class="space-y-6">
        <!-- Logo & Branding -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconPhoto class="w-5 h-5" />
              Logo & Branding
            </h2>

            <!-- Logo Upload -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text font-medium">Logo Header Laporan</span>
                <span class="label-text-alt text-base-content/60">Max 2MB, format: PNG, JPG, SVG</span>
              </label>
              
              <div class="flex items-start gap-4">
                <!-- Logo Preview -->
                <div class="relative">
                  <div 
                    class="w-40 h-20 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center bg-base-200 overflow-hidden"
                    :class="{ 'border-primary': isDragging }"
                    @dragover.prevent="isDragging = true"
                    @dragleave="isDragging = false"
                    @drop.prevent="handleDrop"
                  >
                    <img 
                      v-if="settings.logo" 
                      :src="logoPreview || settings.logo" 
                      alt="Logo" 
                      class="max-w-full max-h-full object-contain"
                    />
                    <div v-else class="text-center text-base-content/40">
                      <IconUpload class="w-6 h-6 mx-auto mb-1" />
                      <span class="text-xs">Drop atau klik</span>
                    </div>
                  </div>
                  
                  <!-- Remove button -->
                  <button 
                    v-if="settings.logo"
                    class="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                    @click="removeLogo"
                  >
                    <IconX class="w-3 h-3" />
                  </button>
                </div>

                <!-- Upload Button -->
                <div>
                  <input 
                    type="file" 
                    ref="logoInput"
                    accept="image/png,image/jpeg,image/svg+xml"
                    class="hidden"
                    @change="handleLogoUpload"
                  />
                  <button 
                    class="btn btn-outline btn-sm" 
                    @click="$refs.logoInput.click()"
                  >
                    <IconUpload class="w-4 h-4" />
                    Upload Logo
                  </button>
                  <p class="text-xs text-base-content/60 mt-2">
                    Logo akan ditampilkan pada header laporan psikogram
                  </p>
                </div>
              </div>
            </div>

            <!-- Footer Upload -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text font-medium">Footer/Banner Laporan</span>
                <span class="label-text-alt text-base-content/60">Max 2MB, format: PNG, JPG, SVG</span>
              </label>
              
              <div class="flex items-start gap-4">
                <!-- Footer Preview -->
                <div class="relative">
                  <div 
                    class="w-64 h-16 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center bg-base-200 overflow-hidden"
                  >
                    <img 
                      v-if="settings.footer" 
                      :src="footerPreview || settings.footer" 
                      alt="Footer" 
                      class="max-w-full max-h-full object-contain"
                    />
                    <div v-else class="text-center text-base-content/40">
                      <IconLayoutBottombar class="w-6 h-6 mx-auto mb-1" />
                      <span class="text-xs">Upload footer</span>
                    </div>
                  </div>
                  
                  <!-- Remove button -->
                  <button 
                    v-if="settings.footer"
                    class="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                    @click="removeFooter"
                  >
                    <IconX class="w-3 h-3" />
                  </button>
                </div>

                <!-- Upload Button -->
                <div>
                  <input 
                    type="file" 
                    ref="footerInput"
                    accept="image/png,image/jpeg,image/svg+xml"
                    class="hidden"
                    @change="handleFooterUpload"
                  />
                  <button 
                    class="btn btn-outline btn-sm" 
                    @click="$refs.footerInput.click()"
                  >
                    <IconUpload class="w-4 h-4" />
                    Upload Footer
                  </button>
                  <p class="text-xs text-base-content/60 mt-2">
                    Footer akan ditampilkan di bagian bawah laporan
                  </p>
                </div>
              </div>
            </div>

            <!-- Color Theme -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Warna Utama</span>
                </label>
                <div class="flex gap-2">
                  <input 
                    v-model="settings.primaryColor" 
                    type="color" 
                    class="w-12 h-10 rounded cursor-pointer border border-base-300"
                  />
                  <input 
                    v-model="settings.primaryColor" 
                    type="text" 
                    class="input input-bordered flex-1 font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Warna Sekunder</span>
                </label>
                <div class="flex gap-2">
                  <input 
                    v-model="settings.secondaryColor" 
                    type="color" 
                    class="w-12 h-10 rounded cursor-pointer border border-base-300"
                  />
                  <input 
                    v-model="settings.secondaryColor" 
                    type="text" 
                    class="input input-bordered flex-1 font-mono"
                    placeholder="#666666"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Informasi Psikolog -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconUserCircle class="w-5 h-5" />
              Informasi Psikolog
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nama Psikolog -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Nama Psikolog</span>
                </label>
                <input 
                  v-model="settings.psychologistName" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: Ns. Dr. Sarah, M.Psi"
                />
              </div>

              <!-- Gelar / Credential -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">No. STR/SIPP</span>
                </label>
                <input 
                  v-model="settings.licenseNumber" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: SIPP.1234.05.2020"
                />
              </div>

              <!-- Email -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Email</span>
                </label>
                <input 
                  v-model="settings.email" 
                  type="email" 
                  class="input input-bordered w-full"
                  placeholder="email@example.com"
                />
              </div>

              <!-- Phone -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">No. Telepon</span>
                </label>
                <input 
                  v-model="settings.phone" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Informasi Instansi / Tempat Praktek -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconBuilding class="w-5 h-5" />
              Informasi Instansi / Tempat Praktek
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nama Instansi -->
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-medium">Nama Instansi</span>
                </label>
                <input 
                  v-model="settings.institutionName" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: MENTAL MASTERY CONSULTING"
                />
              </div>

              <!-- Tagline -->
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-medium">Tagline / Slogan</span>
                </label>
                <input 
                  v-model="settings.tagline" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: HR & Mental Health Consultant"
                />
              </div>

              <!-- Alamat -->
              <div class="form-control md:col-span-2">
                <label class="label">
                  <span class="label-text font-medium">Alamat</span>
                </label>
                <textarea 
                  v-model="settings.address" 
                  class="textarea textarea-bordered w-full"
                  rows="2"
                  placeholder="Alamat lengkap praktek"
                ></textarea>
              </div>

              <!-- Website -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Website</span>
                </label>
                <input 
                  v-model="settings.institutionWebsite" 
                  type="url" 
                  class="input input-bordered w-full"
                  placeholder="https://www.example.com"
                />
              </div>

              <!-- Email Instansi -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Email Instansi</span>
                </label>
                <input 
                  v-model="settings.institutionEmail" 
                  type="email" 
                  class="input input-bordered w-full"
                  placeholder="info@example.com"
                />
              </div>

              <!-- No Telp Instansi -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">No. Telepon Instansi</span>
                </label>
                <input 
                  v-model="settings.institutionPhone" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="(021) xxx-xxxx"
                />
              </div>

              <!-- Social Media -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Instagram</span>
                </label>
                <div class="input-group">
                  <span class="bg-base-200 px-3 flex items-center text-base-content/60">@</span>
                  <input 
                    v-model="settings.instagram" 
                    type="text" 
                    class="input input-bordered w-full"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Report Settings -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconFileText class="w-5 h-5" />
              Pengaturan Laporan
            </h2>

            <div class="space-y-4">
              <!-- Header Text -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Judul Laporan</span>
                </label>
                <input 
                  v-model="settings.reportTitle" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: PSIKOGRAM"
                />
              </div>

              <!-- Sub Header -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Sub Judul</span>
                </label>
                <input 
                  v-model="settings.reportSubtitle" 
                  type="text" 
                  class="input input-bordered w-full"
                  placeholder="Contoh: Hasil Pemeriksaan Psikologis"
                />
              </div>

              <!-- Footer Text -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Footer Laporan</span>
                </label>
                <textarea 
                  v-model="settings.reportFooter" 
                  class="textarea textarea-bordered w-full"
                  rows="2"
                  placeholder="Teks yang ditampilkan di footer laporan"
                ></textarea>
              </div>

              <!-- Options -->
              <div class="divider">Opsi Tampilan</div>
              
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input 
                    v-model="settings.showLogo" 
                    type="checkbox" 
                    class="checkbox checkbox-primary"
                  />
                  <span class="label-text">Tampilkan logo pada laporan</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input 
                    v-model="settings.showSignature" 
                    type="checkbox" 
                    class="checkbox checkbox-primary"
                  />
                  <span class="label-text">Tampilkan tanda tangan psikolog</span>
                </label>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input 
                    v-model="settings.showWatermark" 
                    type="checkbox" 
                    class="checkbox checkbox-primary"
                  />
                  <span class="label-text">Tampilkan watermark pada laporan</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Signature Upload / Canvas -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconSignature class="w-5 h-5" />
              Tanda Tangan Digital
            </h2>

            <!-- Tabs untuk pilih metode -->
            <div role="tablist" class="tabs tabs-boxed mb-4 w-fit">
              <button 
                role="tab" 
                class="tab" 
                :class="{ 'tab-active': signatureMode === 'draw' }"
                @click="signatureMode = 'draw'"
              >
                <IconPencil class="w-4 h-4 mr-1" />
                Gambar Langsung
              </button>
              <button 
                role="tab" 
                class="tab" 
                :class="{ 'tab-active': signatureMode === 'upload' }"
                @click="signatureMode = 'upload'"
              >
                <IconUpload class="w-4 h-4 mr-1" />
                Upload File
              </button>
            </div>

            <!-- Draw Mode - Signature Canvas -->
            <div v-if="signatureMode === 'draw'" class="space-y-4">
              <div class="relative">
                <canvas
                  ref="signatureCanvas"
                  class="w-full h-48 border-2 border-base-300 rounded-lg bg-white cursor-crosshair"
                  :class="{ 'border-primary': isDrawing }"
                  @mousedown="startDrawing"
                  @mousemove="draw"
                  @mouseup="stopDrawing"
                  @mouseleave="stopDrawing"
                  @touchstart.prevent="startDrawingTouch"
                  @touchmove.prevent="drawTouch"
                  @touchend="stopDrawing"
                ></canvas>
                
                <!-- Guide text -->
                <div 
                  v-if="!hasDrawnSignature && !settings.signature"
                  class="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span class="text-base-content/30 text-sm">Tanda tangan di sini</span>
                </div>
              </div>
              
              <div class="flex gap-2">
                <button 
                  class="btn btn-outline btn-sm"
                  @click="clearSignatureCanvas"
                >
                  <IconEraser class="w-4 h-4" />
                  Hapus
                </button>
                <button 
                  class="btn btn-primary btn-sm"
                  @click="saveSignatureFromCanvas"
                  :disabled="!hasDrawnSignature"
                >
                  <IconCheck class="w-4 h-4" />
                  Gunakan Tanda Tangan Ini
                </button>
              </div>
              
              <div class="flex items-center gap-4">
                <label class="label cursor-pointer gap-2">
                  <span class="label-text text-sm">Ketebalan:</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    v-model="penSize" 
                    class="range range-xs range-primary w-24"
                  />
                </label>
                <label class="label cursor-pointer gap-2">
                  <span class="label-text text-sm">Warna:</span>
                  <input 
                    type="color" 
                    v-model="penColor" 
                    class="w-8 h-8 rounded cursor-pointer border border-base-300"
                  />
                </label>
              </div>
            </div>

            <!-- Upload Mode -->
            <div v-else class="flex items-start gap-4">
              <!-- Signature Preview -->
              <div class="relative">
                <div 
                  class="w-48 h-24 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center bg-base-200 overflow-hidden"
                >
                  <img 
                    v-if="settings.signature" 
                    :src="signaturePreview || settings.signature" 
                    alt="Signature" 
                    class="max-w-full max-h-full object-contain"
                  />
                  <div v-else class="text-center text-base-content/40">
                    <IconSignature class="w-6 h-6 mx-auto mb-1" />
                    <span class="text-xs">Upload tanda tangan</span>
                  </div>
                </div>
                
                <!-- Remove button -->
                <button 
                  v-if="settings.signature"
                  class="btn btn-circle btn-xs btn-error absolute -top-2 -right-2"
                  @click="removeSignature"
                >
                  <IconX class="w-3 h-3" />
                </button>
              </div>

              <!-- Upload Button -->
              <div>
                <input 
                  type="file" 
                  ref="signatureInput"
                  accept="image/png,image/jpeg,image/svg+xml"
                  class="hidden"
                  @change="handleSignatureUpload"
                />
                <button 
                  class="btn btn-outline btn-sm" 
                  @click="$refs.signatureInput.click()"
                >
                  <IconUpload class="w-4 h-4" />
                  Upload Tanda Tangan
                </button>
                <p class="text-xs text-base-content/60 mt-2">
                  Gunakan gambar dengan background transparan (PNG)
                </p>
              </div>
            </div>

            <!-- Current Signature Preview -->
            <div v-if="settings.signature" class="mt-4 pt-4 border-t border-base-300">
              <p class="text-sm font-medium mb-2">Tanda Tangan Saat Ini:</p>
              <div class="bg-white border border-base-300 rounded-lg p-4 w-fit">
                <img 
                  :src="settings.signature" 
                  alt="Current Signature" 
                  class="max-w-xs max-h-24 object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Card -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">
              <IconEye class="w-5 h-5" />
              Preview Header Laporan
            </h2>

            <!-- Preview Box -->
            <div class="bg-white border border-base-300 rounded-lg p-6">
              <div class="flex items-start gap-4">
                <!-- Logo Preview -->
                <div class="flex-shrink-0">
                  <img 
                    v-if="settings.logo" 
                    :src="logoPreview || settings.logo" 
                    alt="Logo" 
                    class="w-20 h-20 object-contain"
                  />
                  <div v-else class="w-20 h-20 bg-base-200 rounded flex items-center justify-center text-base-content/30">
                    <IconPhoto class="w-8 h-8" />
                  </div>
                </div>

                <!-- Institution Info -->
                <div class="flex-1">
                  <h3 
                    class="font-bold text-lg"
                    :style="{ color: settings.primaryColor }"
                  >
                    {{ settings.institutionName || 'Nama Instansi' }}
                  </h3>
                  <p class="text-sm" :style="{ color: settings.secondaryColor }">
                    {{ settings.tagline || 'Tagline / Slogan' }}
                  </p>
                  <p class="text-xs text-gray-600 mt-1">
                    {{ settings.address || 'Alamat praktek' }}
                  </p>
                  <p class="text-xs text-gray-600">
                    {{ settings.phone || 'No. Telepon' }} • {{ settings.email || 'Email' }}
                  </p>
                </div>
              </div>

              <div class="divider my-4" :style="{ borderColor: settings.primaryColor }"></div>

              <h2 
                class="text-center font-bold text-xl"
                :style="{ color: settings.primaryColor }"
              >
                {{ settings.reportTitle || 'PSIKOGRAM' }}
              </h2>
              <p class="text-center text-sm text-gray-600">
                {{ settings.reportSubtitle || 'Hasil Pemeriksaan Psikologis' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom Action -->
        <div class="flex justify-end py-4">
          <button 
            class="btn btn-primary" 
            @click="saveSettings" 
            :disabled="saving"
          >
            <IconDeviceFloppy class="w-4 h-4" />
            {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  IconDeviceFloppy,
  IconPhoto,
  IconUpload,
  IconX,
  IconUserCircle,
  IconBuilding,
  IconFileText,
  IconSignature,
  IconEye,
  IconLayoutBottombar,
  IconPencil,
  IconEraser,
  IconCheck
} from '@tabler/icons-vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

const api = useApi()
const { showSuccess, showError } = useNotification()

const loading = ref(false)
const saving = ref(false)
const isDragging = ref(false)
const logoPreview = ref(null)
const signaturePreview = ref(null)
const footerPreview = ref(null)
const logoInput = ref(null)
const signatureInput = ref(null)
const footerInput = ref(null)
const logoFile = ref(null)
const signatureFile = ref(null)
const footerFile = ref(null)

// Signature Canvas
const signatureCanvas = ref(null)
const signatureMode = ref('draw')
const isDrawing = ref(false)
const hasDrawnSignature = ref(false)
const penSize = ref(2)
const penColor = ref('#000000')
let canvasContext = null

const settings = reactive({
  // Logo & Branding
  logo: '',
  footer: '',
  primaryColor: '#1e3a5f',
  secondaryColor: '#6b7280',
  
  // Psychologist Info
  psychologistName: '',
  licenseNumber: '',
  email: '',
  phone: '',
  
  // Institution Info
  institutionName: '',
  tagline: '',
  address: '',
  institutionWebsite: '',
  institutionEmail: '',
  institutionPhone: '',
  instagram: '',
  
  // Report Settings
  reportTitle: 'PSIKOGRAM',
  reportSubtitle: 'Hasil Pemeriksaan Psikologis',
  reportFooter: '',
  
  // Options
  showLogo: true,
  showSignature: true,
  showWatermark: false,
  
  // Signature
  signature: ''
})

const loadSettings = async () => {
  loading.value = true
  try {
    const response = await api.get('/psychology/settings')
    // Handle nested response structure: response.data.data or response.data
    const data = response.data?.data || response.data
    if (data) {
      // Map backend snake_case to frontend camelCase if needed
      const mappedData = {
        logo: data.logo || '',
        footer: data.footer || '',
        primaryColor: data.primaryColor || data.primary_color || '#1e3a5f',
        secondaryColor: data.secondaryColor || data.secondary_color || '#6b7280',
        psychologistName: data.psychologistName || data.psychologist_name || '',
        licenseNumber: data.licenseNumber || data.license_number || '',
        email: data.email || '',
        phone: data.phone || '',
        institutionName: data.institutionName || data.institution_name || '',
        tagline: data.tagline || '',
        address: data.address || '',
        institutionWebsite: data.institutionWebsite || data.institution_website || '',
        institutionEmail: data.institutionEmail || data.institution_email || '',
        institutionPhone: data.institutionPhone || data.institution_phone || '',
        instagram: data.instagram || '',
        reportTitle: data.reportTitle || data.report_title || 'PSIKOGRAM',
        reportSubtitle: data.reportSubtitle || data.report_subtitle || 'Hasil Pemeriksaan Psikologis',
        reportFooter: data.reportFooter || data.report_footer || '',
        showLogo: data.showLogo ?? data.show_logo ?? true,
        showSignature: data.showSignature ?? data.show_signature ?? true,
        showWatermark: data.showWatermark ?? data.show_watermark ?? false,
        signature: data.signature || ''
      }
      Object.assign(settings, mappedData)
    }
  } catch (error) {
    // Settings might not exist yet, use defaults
    console.log('Using default settings:', error.message)
  } finally {
    loading.value = false
  }
}

const handleDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processLogoFile(file)
  }
}

const handleLogoUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    processLogoFile(file)
  }
}

const processLogoFile = (file) => {
  if (file.size > 2 * 1024 * 1024) {
    showError('Ukuran file melebihi 2MB')
    return
  }
  
  logoFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreview.value = e.target.result
    settings.logo = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeLogo = () => {
  settings.logo = ''
  logoPreview.value = null
  logoFile.value = null
  if (logoInput.value) {
    logoInput.value.value = ''
  }
}

const handleSignatureUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showError('Ukuran file melebihi 2MB')
      return
    }
    
    signatureFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      signaturePreview.value = e.target.result
      settings.signature = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removeSignature = () => {
  settings.signature = ''
  signaturePreview.value = null
  signatureFile.value = null
  if (signatureInput.value) {
    signatureInput.value.value = ''
  }
}

// Footer handlers
const handleFooterUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showError('Ukuran file melebihi 2MB')
      return
    }
    
    footerFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      footerPreview.value = e.target.result
      settings.footer = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removeFooter = () => {
  settings.footer = ''
  footerPreview.value = null
  footerFile.value = null
  if (footerInput.value) {
    footerInput.value.value = ''
  }
}

// Signature Canvas Functions
const initCanvas = () => {
  if (!signatureCanvas.value) return
  
  const canvas = signatureCanvas.value
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  
  canvasContext = canvas.getContext('2d')
  canvasContext.lineCap = 'round'
  canvasContext.lineJoin = 'round'
  canvasContext.strokeStyle = penColor.value
  canvasContext.lineWidth = penSize.value
}

const startDrawing = (e) => {
  if (!canvasContext) initCanvas()
  isDrawing.value = true
  hasDrawnSignature.value = true
  
  const rect = signatureCanvas.value.getBoundingClientRect()
  canvasContext.beginPath()
  canvasContext.moveTo(e.clientX - rect.left, e.clientY - rect.top)
}

const draw = (e) => {
  if (!isDrawing.value || !canvasContext) return
  
  canvasContext.strokeStyle = penColor.value
  canvasContext.lineWidth = penSize.value
  
  const rect = signatureCanvas.value.getBoundingClientRect()
  canvasContext.lineTo(e.clientX - rect.left, e.clientY - rect.top)
  canvasContext.stroke()
}

const stopDrawing = () => {
  isDrawing.value = false
}

const startDrawingTouch = (e) => {
  if (!canvasContext) initCanvas()
  isDrawing.value = true
  hasDrawnSignature.value = true
  
  const touch = e.touches[0]
  const rect = signatureCanvas.value.getBoundingClientRect()
  canvasContext.beginPath()
  canvasContext.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
}

const drawTouch = (e) => {
  if (!isDrawing.value || !canvasContext) return
  
  canvasContext.strokeStyle = penColor.value
  canvasContext.lineWidth = penSize.value
  
  const touch = e.touches[0]
  const rect = signatureCanvas.value.getBoundingClientRect()
  canvasContext.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
  canvasContext.stroke()
}

const clearSignatureCanvas = () => {
  if (!signatureCanvas.value) return
  
  const canvas = signatureCanvas.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  hasDrawnSignature.value = false
}

const saveSignatureFromCanvas = () => {
  if (!signatureCanvas.value) return
  
  // Get signature as PNG with transparent background
  const dataUrl = signatureCanvas.value.toDataURL('image/png')
  settings.signature = dataUrl
  signaturePreview.value = dataUrl
  showSuccess('Tanda tangan disimpan')
}

const saveSettings = async () => {
  saving.value = true
  try {
    const payload = { ...settings }
    
    // If we have new files, upload them first
    if (logoFile.value) {
      const formData = new FormData()
      formData.append('file', logoFile.value)
      formData.append('type', 'psychology-logo')
      try {
        const uploadRes = await api.post('/upload', formData)
        if (uploadRes.data?.url) {
          payload.logo = uploadRes.data.url
        }
      } catch (e) {
        // Keep base64 if upload fails
        console.log('Using base64 for logo')
      }
    }
    
    if (signatureFile.value) {
      const formData = new FormData()
      formData.append('file', signatureFile.value)
      formData.append('type', 'psychology-signature')
      try {
        const uploadRes = await api.post('/upload', formData)
        if (uploadRes.data?.url) {
          payload.signature = uploadRes.data.url
        }
      } catch (e) {
        // Keep base64 if upload fails
        console.log('Using base64 for signature')
      }
    }
    
    if (footerFile.value) {
      const formData = new FormData()
      formData.append('file', footerFile.value)
      formData.append('type', 'psychology-footer')
      try {
        const uploadRes = await api.post('/upload', formData)
        if (uploadRes.data?.url) {
          payload.footer = uploadRes.data.url
        }
      } catch (e) {
        // Keep base64 if upload fails
        console.log('Using base64 for footer')
      }
    }
    
    await api.post('/psychology/settings', payload)
    showSuccess('Pengaturan berhasil disimpan')
    
    // Clear file refs after successful save
    logoFile.value = null
    signatureFile.value = null
    footerFile.value = null
    
    // Update settings with saved URLs
    if (payload.logo) settings.logo = payload.logo
    if (payload.signature) settings.signature = payload.signature
    if (payload.footer) settings.footer = payload.footer
    
    // Clear preview refs since we now have saved URLs
    logoPreview.value = null
    signaturePreview.value = null
    footerPreview.value = null
  } catch (error) {
    console.error('Error saving settings:', error)
    showError('Gagal menyimpan pengaturan')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
  // Initialize canvas after DOM is ready
  setTimeout(() => {
    initCanvas()
  }, 100)
})
</script>

<style scoped>
.input-group {
  display: flex;
}
.input-group > span {
  border: 1px solid hsl(var(--bc) / 0.2);
  border-right: none;
  border-radius: var(--rounded-btn, 0.5rem) 0 0 var(--rounded-btn, 0.5rem);
}
.input-group > input {
  border-radius: 0 var(--rounded-btn, 0.5rem) var(--rounded-btn, 0.5rem) 0;
}
</style>
