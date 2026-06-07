<route lang="yaml">
meta:
  title: Psikogram
  layout: false
  public: true
</route>

<template>
  <div class="min-h-screen bg-white">
    <div class="print-container">
    <!-- Toolbar (Hidden on print) -->
    <div class="toolbar no-print">
      <div class="toolbar-content">
        <div class="flex items-center gap-3">
          <img v-if="settings.logo" :src="settings.logo" alt="Logo" class="h-8" />
          <h1 class="text-lg font-bold">{{ settings.institutionName || 'Hasil Psikogram' }}</h1>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm gap-2" @click="downloadPDF">
            <IconDownload class="w-4 h-4" />
            Download PDF
          </button>
          <button class="btn btn-ghost btn-sm gap-2" @click="printPage">
            <IconPrinter class="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container no-print">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error / Expired -->
    <div v-else-if="error" class="error-container no-print">
      <IconAlertCircle class="w-16 h-16 text-error mb-4" />
      <p class="text-lg font-semibold mb-2">{{ error }}</p>
      <p class="text-sm text-gray-500">Link mungkin sudah kadaluarsa atau tidak valid</p>
    </div>

    <!-- Print Content -->
    <div v-else-if="psikogram" class="print-wrapper">
      <div class="paper">
        <!-- Header with Logo and Institution Info -->
        <div class="header" style="border-color: #16a34a;">
          <div class="header-content-vertical">
            <!-- Logo at top -->
            <div v-if="settings.showLogo && isValidLogoUrl" class="header-logo-top">
              <img :src="settings.logo" alt="Logo" @error="handleLogoError" />
            </div>

            <!-- Institution Info below logo -->
            <div class="header-info-center">
              <h1 class="institution-name" style="color: #16a34a;">
                {{ settings.institutionName || 'LEMBAGA PSIKOLOGI' }}
              </h1>
              <p class="institution-tagline" style="color: #6b7280;">
                {{ settings.tagline || 'Jasa Konsultasi Psikologi' }}
              </p>
              <p class="institution-address">
                {{ settings.address || 'Alamat Praktek' }}
              </p>
              <p class="institution-contact">
                <span v-if="settings.institutionPhone">{{ settings.institutionPhone }}</span>
                <span v-if="settings.institutionPhone && settings.institutionEmail"> • </span>
                <span v-if="settings.institutionEmail">{{ settings.institutionEmail }}</span>
                <span v-if="(settings.institutionPhone || settings.institutionEmail) && settings.institutionWebsite"> • </span>
                <span v-if="settings.institutionWebsite">{{ settings.institutionWebsite }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Title -->
        <div class="report-title">
          <h2 style="color: #16a34a;">
            {{ settings.reportTitle || 'RINGKASAN' }}
          </h2>
          <h3 style="color: #16a34a; margin-top: 0;">
            HASIL PEMERIKSAAN PSIKOLOGI
          </h3>
        </div>

        <!-- Summary Table -->
        <div class="section">
          <table class="summary-table">
            <tbody>
              <tr>
                <td class="summary-number">1</td>
                <td class="summary-label">Nama Psikolog Pemeriksa</td>
                <td class="summary-separator">:</td>
                <td class="summary-value">{{ settings.psychologistName || psikogram.examiner?.name || '-' }}</td>
              </tr>
              <tr>
                <td class="summary-number">2</td>
                <td class="summary-label">Nama Fasyankes/Lembaga layanan psikologi</td>
                <td class="summary-separator">:</td>
                <td class="summary-value">{{ settings.institutionName || '-' }}</td>
              </tr>
              <tr>
                <td class="summary-number">3</td>
                <td class="summary-label">Alamat Fasyankes/Lembaga Psikologi</td>
                <td class="summary-separator">:</td>
                <td class="summary-value">{{ settings.address || '-' }}</td>
              </tr>
              <tr>
                <td class="summary-number">4</td>
                <td class="summary-label">Tanggal Pemeriksaan</td>
                <td class="summary-separator">:</td>
                <td class="summary-value">{{ formatDate(psikogram.examDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Biodata Peserta -->
        <div class="section">
          <h3 class="section-title" style="background-color: #16a34a;">
            BIODATA PESERTA
          </h3>
          <table class="biodata-table">
            <tbody>
              <tr>
                <td class="label">Nama</td>
                <td class="separator">:</td>
                <td class="value">{{ psikogram.participant?.name || '-' }}</td>
              </tr>
              <tr>
                <td class="label">Tanggal Lahir / Usia</td>
                <td class="separator">:</td>
                <td class="value">{{ formatDate(psikogram.participant?.birthDate) }} / {{ calculateAge(psikogram.participant?.birthDate) }}</td>
              </tr>
              <tr>
                <td class="label">Pendidikan Terakhir</td>
                <td class="separator">:</td>
                <td class="value">{{ psikogram.participant?.education || '-' }}</td>
              </tr>
              <tr>
                <td class="label">Perusahaan</td>
                <td class="separator">:</td>
                <td class="value">{{ psikogram.participant?.corporate || '-' }}</td>
              </tr>
              <tr>
                <td class="label">Tanggal Pemeriksaan</td>
                <td class="separator">:</td>
                <td class="value">{{ formatDate(psikogram.examDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sections -->
        <div class="sections">
          <SectionTable
            title="A. KECERDASAN"
            :items="psikogram.sections?.kecerdasan?.items || []"
            :conclusion="psikogram.sections?.kecerdasan?.conclusion"
            :primary-color="settings.primaryColor"
          />
          <SectionTable
            title="B. SIKAP DAN CARA KERJA"
            :items="psikogram.sections?.sikapKerja?.items || []"
            :conclusion="psikogram.sections?.sikapKerja?.conclusion"
            :primary-color="settings.primaryColor"
          />
          <SectionTable
            title="C. KEPRIBADIAN"
            :items="psikogram.sections?.kepribadian?.items || []"
            :conclusion="psikogram.sections?.kepribadian?.conclusion"
            :primary-color="settings.primaryColor"
          />
          <SectionTable
            title="D. KEMAMPUAN BELAJAR"
            :items="psikogram.sections?.kemampuanBelajar?.items || []"
            :conclusion="psikogram.sections?.kemampuanBelajar?.conclusion"
            :primary-color="settings.primaryColor"
          />
        </div>

        <!-- Rekomendasi -->
        <div class="section">
          <h3 class="section-title" style="background-color: #16a34a;">
            REKOMENDASI
          </h3>
          <div class="recommendation">
            <label class="rec-option">
              <span class="rec-checkbox">
                <span v-if="psikogram.recommendation === 'recommended'" class="check-symbol">✓</span>
              </span>
              <span>Disarankan</span>
            </label>
            <label class="rec-option">
              <span class="rec-checkbox">
                <span v-if="psikogram.recommendation === 'not_recommended'" class="check-symbol">✓</span>
              </span>
              <span>Tidak Disarankan</span>
            </label>
          </div>
        </div>

        <!-- Kesimpulan -->
        <div class="section">
          <p class="conclusion-text">
            Berdasarkan hasil pemeriksaan psikologis yang dilakukan, menimbang potensi dan sikap kerja maka disimpulkan <strong>{{ psikogram.participant?.name || 'Peserta' }}</strong> <strong>{{ psikogram.recommendation === 'recommended' ? 'DISARANKAN' : 'TIDAK DISARANKAN' }}</strong> sebagai <strong>CALON PEKERJA MIGRAN INDONESIA</strong>
          </p>
        </div>

        <!-- Signature Area -->
        <div class="signature-area">
          <div class="signature-box">
            <p class="signature-location">{{ formatLocation(psikogram.examDate) }}</p>
            
            <div class="signature-image">
              <img 
                v-if="settings.showSignature && settings.signature" 
                :src="settings.signature" 
                alt="Tanda Tangan"
                style="max-width: 150px; max-height: 80px; object-fit: contain;"
              />
              <p v-else-if="!settings.signature" style="font-size: 10px; color: #999;">
                (Tanda tangan tidak tersedia)
              </p>
            </div>

            <div class="signature-name">
              <p class="name">{{ settings.psychologistName || psikogram.examiner?.name || 'Psikolog' }}</p>
              <p v-if="settings.licenseNumber" class="license">{{ settings.licenseNumber }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="settings.footer || settings.reportFooter" class="footer">
          <div v-if="settings.footer" class="footer-image">
            <img :src="settings.footer" alt="Footer" />
          </div>
          <p v-if="settings.reportFooter" class="footer-text">
            {{ settings.reportFooter }}
          </p>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { IconPrinter, IconDownload, IconAlertCircle } from '@tabler/icons-vue'
import SectionTable from '@/components/psychology/psikogram/SectionTable.vue'

const route = useRoute()

const loading = ref(true)
const psikogram = ref(null)
const error = ref('')

const settings = reactive({
  logo: '',
  footer: '',
  primaryColor: '#1e3a5f',
  secondaryColor: '#6b7280',
  psychologistName: '',
  licenseNumber: '',
  institutionName: '',
  tagline: '',
  address: '',
  institutionWebsite: '',
  institutionEmail: '',
  institutionPhone: '',
  reportTitle: 'PSIKOGRAM',
  reportSubtitle: 'Hasil Pemeriksaan Psikologis',
  reportFooter: '',
  showLogo: true,
  showSignature: true,
  signature: ''
})

const logoError = ref(false)
const handleLogoError = () => {
  logoError.value = true
}

const isValidLogoUrl = computed(() => {
  // Only check if logo exists and hasn't errored
  // Remove example.com filter - let backend handle valid URLs
  return settings.logo && 
         settings.logo.trim() !== '' && 
         !logoError.value
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatLocation = (date) => {
  const city = settings.address?.split(',')[0] || 'Jakarta'
  return `${city}, ${formatDate(date)}`
}

const calculateAge = (birthDate) => {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return `${age} tahun`
}

const printPage = () => {
  window.print()
}

const downloadPDF = () => {
  const name = psikogram.value?.participant?.name || 'psikogram'
  const date = psikogram.value?.examDate
  const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'unknown'
  const filename = `psikogram-${name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}`
  
  const originalTitle = document.title
  document.title = filename
  
  alert('Silakan pilih "Save as PDF" atau "Microsoft Print to PDF" pada dialog print yang akan muncul.')
  
  setTimeout(() => {
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }, 100)
}

const loadPsikogram = async () => {
  const token = route.params.token
  
  try {
    // Load public psikogram via share token - use fetch directly to avoid auth headers
    const apiBaseUrl = import.meta.env.VITE_API_URL
    
    if (!apiBaseUrl) {
      throw new Error('API URL tidak dikonfigurasi. Silakan hubungi administrator.')
    }
    
    // Try to get stored token for testing (will be removed in production)
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('token')
    
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // Add auth header only if available (temporary for testing)
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const response = await fetch(`${apiBaseUrl}/psychology/public/psikograms/${token}`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Not found' : 'Failed to load')
    }
    
    const result = await response.json()
    const data = result.data || result
    
    console.log('Public psikogram data:', data)
    
    if (data && data.id) {
      // Map API response to psikogram structure
      psikogram.value = {
        id: data.id,
        examDate: data.examDate,
        participant: data.participant,
        sections: data.sections,
        recommendation: data.recommendation,
        recommendationLabel: data.recommendationLabel,
        status: data.status,
        examiner: data.examiner,
        createdAt: data.createdAt
      }
      
      // Load settings from data.organization
      const orgData = data.organization || {}
      
      Object.assign(settings, {
        logo: orgData.logo || '',
        institutionName: orgData.institutionName || orgData.name || '',
        address: orgData.address || '',
        institutionEmail: orgData.institutionEmail || orgData.email || '',
        institutionPhone: orgData.institutionPhone || orgData.phone || '',
        institutionWebsite: orgData.institutionWebsite || orgData.website || '',
        tagline: orgData.tagline || '',
        psychologistName: orgData.psychologistName || data.examiner?.name || '',
        licenseNumber: orgData.licenseNumber || '',
        primaryColor: orgData.primaryColor || '#1e3a5f',
        secondaryColor: orgData.secondaryColor || '#6b7280',
        reportTitle: 'RINGKASAN',
        reportSubtitle: 'HASIL PEMERIKSAAN PSIKOLOGI',
        reportFooter: orgData.reportFooter || '',
        showLogo: orgData.showLogo ?? true,
        showSignature: orgData.showSignature ?? true,
        signature: orgData.signature || ''
      })
      
      console.log('Settings loaded:', settings)
    } else {
      throw new Error('Data tidak valid')
    }
  } catch (err) {
    console.error('Error loading public psikogram:', err)
    error.value = err.response?.status === 404 
      ? 'Link tidak ditemukan atau sudah kadaluarsa'
      : 'Gagal memuat data psikogram'
  }
}

onMounted(async () => {
  loading.value = true
  await loadPsikogram()
  loading.value = false
})
</script>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 20px;
}
</style>

<style>
/* Reuse print styles from main print page */
.print-container {
  min-height: 100vh;
  background-color: #e5e7eb;
  color: #000000;
}

.print-container * {
  color: inherit;
  border-color: #9ca3af;
}

.toolbar {
  position: sticky;
  top: 0;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 100;
}

.toolbar-content {
  max-width: 210mm;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.print-wrapper {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.paper {
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 15mm 20mm;
  box-sizing: border-box;
  color: #000000;
}

.paper * {
  color: #000000;
  border-color: #000000;
}

.paper .text-white,
.section-title {
  color: #ffffff !important;
}

.header {
  padding-bottom: 12px;
  border-bottom: 3px solid #16a34a;
  margin-bottom: 15px;
}

.header-content-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.header-logo-top img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.header-info-center {
  text-align: center;
}

.institution-name {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #16a34a;
}

.institution-tagline {
  font-size: 13px;
  margin: 2px 0;
  color: #6b7280;
}

.institution-address {
  font-size: 11px;
  color: #000000;
  margin: 4px 0 0 0;
}

.institution-contact {
  font-size: 11px;
  color: #000000;
  margin: 0;
}

.report-title {
  text-align: center;
  margin-bottom: 15px;
}

.report-title h2 {
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 2px;
  margin: 0;
  color: #16a34a;
}

.report-title p {
  font-size: 12px;
  color: #000000;
  margin: 4px 0 0 0;
}

.section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: #ffffff;
  background-color: #16a34a;
  padding: 4px 8px;
  margin: 0 0 8px 0;
}

.sections {
  margin-bottom: 12px;
}

.biodata-table {
  width: 100%;
  font-size: 11px;
  border-collapse: collapse;
}

.biodata-table td {
  border: none;
}

.biodata-table .label {
  width: 140px;
  padding: 3px 0;
}

.biodata-table .separator {
  width: 15px;
  text-align: center;
}

.biodata-table .value {
  font-weight: 500;
}

.summary-table {
  width: 100%;
  font-size: 11px;
  border-collapse: collapse;
  margin-bottom: 12px;
  border: 1px solid #000000;
}

.summary-table td {
  border: 1px solid #000000;
  padding: 6px 8px;
}

.summary-number {
  width: 30px;
  text-align: center;
  font-weight: 500;
}

.summary-label {
  width: 280px;
}

.summary-separator {
  width: 15px;
  text-align: center;
}

.summary-value {
  font-weight: 500;
}

.recommendation {
  display: flex;
  gap: 30px;
  padding: 8px 0;
}

.rec-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
}

.rec-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.check-symbol {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  line-height: 1;
}

.conclusion-text {
  font-size: 11px;
  line-height: 1.6;
  text-align: justify;
  margin: 0;
  color: #000000;
}

.signature-area {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}

.signature-box {
  text-align: center;
  width: 200px;
}

.signature-location {
  font-size: 11px;
  margin: 0 0 8px 0;
  color: #000000;
}

.signature-image {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.signature-image img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.signature-name {
  border-top: 1px solid #000000;
  padding-top: 6px;
}

.signature-name .name {
  font-size: 12px;
  font-weight: bold;
  margin: 0;
  color: #000000;
}

.signature-name .license {
  font-size: 10px;
  color: #000000;
  margin: 2px 0 0 0;
}

.footer {
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #000000;
}

.footer-image {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.footer-image img {
  width: 100%;
  max-height: none;
  height: auto;
  object-fit: contain;
}

.footer-text {
  font-size: 10px;
  text-align: center;
  color: #000000;
  font-style: italic;
  margin: 0;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: #000000 !important;
  }
  
  .text-white,
  .section-title {
    color: #ffffff !important;
  }

  .no-print {
    display: none !important;
  }

  .print-container {
    background: white;
  }

  .print-wrapper {
    padding: 0;
  }

  .paper {
    width: 100%;
    box-shadow: none;
    padding: 0;
  }
}
</style>
