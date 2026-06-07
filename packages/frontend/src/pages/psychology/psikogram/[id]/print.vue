<route lang="yaml">
meta:
  title: Print Psikogram
  layout: false
</route>

<template>
  <div class="min-h-screen bg-white">
    <div class="print-container">
    <!-- Toolbar (Hidden on print) -->
    <div class="toolbar no-print">
      <div class="toolbar-content">
        <button class="btn btn-ghost btn-sm gap-2" @click="$router.back()">
          <IconArrowLeft class="w-4 h-4" />
          Kembali
        </button>
        <h1 class="text-lg font-bold">Preview Psikogram</h1>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm gap-2" @click="handleShare">
            <IconShare class="w-4 h-4" />
            Bagikan
          </button>
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

    <!-- Print Content -->
    <div v-else-if="psikogram" class="print-wrapper">
      <div class="paper">
        <!-- Header with Logo and Institution Info -->
        <div class="header" style="border-color: #16a34a;">
          <div class="header-content-vertical">
            <!-- Logo at top -->
            <div v-if="settings.showLogo && settings.logo" class="header-logo-top">
              <img :src="settings.logo" alt="Logo" />
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
              <img v-if="settings.showSignature && settings.signature" :src="settings.signature" alt="Signature" />
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

    <!-- Not Found -->
    <div v-else class="not-found no-print">
      <IconFileOff class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-gray-500 mb-4">Data psikogram tidak ditemukan</p>
      <button class="btn btn-primary btn-sm" @click="$router.back()">Kembali</button>
    </div>

    <!-- Share Modal -->
    <dialog ref="shareModal" class="modal no-print">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Bagikan Psikogram</h3>
        <p class="text-sm text-gray-600 mb-4">
          Link ini dapat dibagikan kepada <strong>{{ psikogram?.participant?.name }}</strong> untuk mengakses hasil psikogram secara mandiri.
        </p>
        
        <div v-if="generatingLink" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        
        <div v-else class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Link Publik</span>
            </label>
            <div class="join w-full">
              <input 
                :value="shareLink"
                type="text" 
                class="input input-bordered join-item flex-1" 
                readonly
              />
              <button 
                class="btn btn-primary join-item"
                @click="copyShareLink"
              >
                <IconShare class="w-4 h-4" />
                Salin
              </button>
            </div>
          </div>
          
          <!-- WhatsApp Button -->
          <button 
            v-if="psikogram?.participant?.phone"
            class="btn btn-success w-full gap-2"
            @click="shareViaWhatsApp"
          >
            <IconBrandWhatsapp class="w-5 h-5" />
            Bagikan via WhatsApp ke {{ psikogram?.participant?.name }}
          </button>
          
          <div class="alert alert-info">
            <IconCheck class="w-5 h-5" />
            <div class="text-sm">
              <p class="font-semibold">Link ini bersifat publik</p>
              <p>Siapa saja yang memiliki link ini dapat melihat dan mendownload hasil psikogram.</p>
            </div>
          </div>
        </div>
        
        <div class="modal-action">
          <button class="btn" @click="shareModal?.close()">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { IconArrowLeft, IconPrinter, IconCheck, IconFileOff, IconDownload, IconShare, IconBrandWhatsapp } from '@tabler/icons-vue'
import { useApi } from '@/composables/core/useApi'
import SectionTable from '@/components/psychology/psikogram/SectionTable.vue'

const route = useRoute()
const api = useApi()

const loading = ref(true)
const psikogram = ref(null)
const errorMsg = ref('')
const shareModal = ref(null)
const shareLink = ref('')
const generatingLink = ref(false)

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
  // Generate filename: psikogram-nama-tanggal
  const name = psikogram.value?.participant?.name || 'unknown'
  const date = psikogram.value?.examDate
  const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'unknown'
  const filename = `psikogram-${name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}`
  
  // Set document title for PDF filename
  const originalTitle = document.title
  document.title = filename
  
  // Show instruction
  alert('Silakan pilih "Save as PDF" atau "Microsoft Print to PDF" pada dialog print yang akan muncul.')
  
  // Open print dialog
  setTimeout(() => {
    window.print()
    
    // Restore title after print
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }, 100)
}

const handleShare = async () => {
  generatingLink.value = true
  shareLink.value = ''
  shareModal.value?.showModal()
  
  try {
    const response = await api.post(`/psychology/psikograms/${route.params.id}/share`)
    const data = response.data?.data || response.data || response
    
    const baseUrl = window.location.origin
    const token = data.token || data.shareToken
    shareLink.value = `${baseUrl}/public/psikogram/${token}`
  } catch (error) {
    console.error('Error generating share link:', error)
    shareLink.value = 'Error: Gagal generate link'
  } finally {
    generatingLink.value = false
  }
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    alert('Link berhasil disalin ke clipboard')
  } catch (error) {
    console.error('Error copying to clipboard:', error)
  }
}

const shareViaWhatsApp = () => {
  const phone = psikogram.value?.participant?.phone
  if (!phone) {
    alert('Nomor WhatsApp peserta tidak tersedia')
    return
  }
  
  const cleanPhone = phone.replace(/\D/g, '')
  const phoneWithCode = cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone.replace(/^0/, '')
  
  const participantName = psikogram.value?.participant?.name || 'Peserta'
  const message = encodeURIComponent(
    `Halo ${participantName},\n\n` +
    `Berikut adalah link untuk mengakses hasil psikogram Anda:\n\n` +
    `🔗 ${shareLink.value}\n\n` +
    `Silakan klik link di atas untuk melihat dan mendownload hasil psikogram Anda.\n\n` +
    `Terima kasih.`
  )
  
  const waUrl = `https://wa.me/${phoneWithCode}?text=${message}`
  window.open(waUrl, '_blank')
}

const loadSettings = async () => {
  try {
    const response = await api.get('/psychology/settings')
    const data = response.data?.data || response.data || response
    if (data) {
      Object.assign(settings, {
        logo: data.logo || '',
        footer: data.footer || '',
        primaryColor: data.primaryColor || data.primary_color || '#1e3a5f',
        secondaryColor: data.secondaryColor || data.secondary_color || '#6b7280',
        psychologistName: data.psychologistName || data.psychologist_name || '',
        licenseNumber: data.licenseNumber || data.license_number || '',
        institutionName: data.institutionName || data.institution_name || '',
        tagline: data.tagline || '',
        address: data.address || '',
        institutionWebsite: data.institutionWebsite || data.institution_website || '',
        institutionEmail: data.institutionEmail || data.institution_email || '',
        institutionPhone: data.institutionPhone || data.institution_phone || '',
        reportTitle: data.reportTitle || data.report_title || 'PSIKOGRAM',
        reportSubtitle: data.reportSubtitle || data.report_subtitle || 'Hasil Pemeriksaan Psikologis',
        reportFooter: data.reportFooter || data.report_footer || '',
        showLogo: data.showLogo ?? data.show_logo ?? true,
        showSignature: data.showSignature ?? data.show_signature ?? true,
        signature: data.signature || ''
      })
    }
  } catch (error) {
    console.log('Using default settings:', error.message)
  }
}

const loadPsikogram = async () => {
  const id = route.params.id
  console.log('Loading psikogram with ID:', id)
  
  try {
    const response = await api.get(`/psychology/psikograms/${id}`)
    console.log('API Response:', response)
    const data = response.data?.data || response.data || response
    if (data && data.id) {
      psikogram.value = data
      console.log('Psikogram loaded:', data)
    } else {
      throw new Error('Data tidak valid')
    }
  } catch (error) {
    console.error('Error loading psikogram:', error)
    errorMsg.value = error.message || 'Gagal memuat data'
    
    // Fallback demo data for testing
    psikogram.value = {
      id: id,
      examDate: new Date().toISOString(),
      participant: {
        name: 'DEMO - Data tidak ditemukan',
        birthDate: '1990-01-01',
        education: 'S1',
        corporate: 'PT Demo'
      },
      examiner: { name: 'Psikolog Demo' },
      sections: {
        kecerdasan: {
          items: [
            { title: 'Logika Berpikir', description: 'Kemampuan berpikir logis dan sistematis', rating: 'C' },
            { title: 'Kemampuan Analisa', description: 'Kemampuan menganalisa masalah', rating: 'B' }
          ],
          conclusion: 'Cukup baik dalam aspek kecerdasan'
        },
        sikapKerja: {
          items: [
            { title: 'Orientasi Hasil', description: 'Komitmen terhadap pencapaian hasil', rating: 'B' },
            { title: 'Ketelitian', description: 'Perhatian terhadap detail', rating: 'C' }
          ],
          conclusion: ''
        },
        kepribadian: {
          items: [
            { title: 'Kerjasama', description: 'Kemampuan bekerja dalam tim', rating: 'B' },
            { title: 'Stabilitas Emosi', description: 'Pengendalian emosi', rating: 'C' }
          ],
          conclusion: ''
        },
        kemampuanBelajar: {
          items: [
            { title: 'Pengembangan Diri', description: 'Kemauan untuk belajar dan berkembang', rating: 'B' }
          ],
          conclusion: ''
        }
      },
      recommendation: 'recommended'
    }
  }
}

onMounted(async () => {
  console.log('Print page mounted, route:', route.params)
  loading.value = true
  
  try {
    await Promise.all([loadSettings(), loadPsikogram()])
  } catch (e) {
    console.error('Error in onMounted:', e)
  }
  
  loading.value = false
  console.log('Loading complete, psikogram:', psikogram.value)
})
</script>

<style>
/* ===== SCREEN STYLES ===== */
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

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

/* Header */
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

/* Report Title */
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

.report-title h3 {
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

/* Sections */
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

/* Biodata Table */
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

/* Summary Table */
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

/* Recommendation */
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

/* Conclusion */
.conclusion-text {
  font-size: 11px;
  line-height: 1.6;
  text-align: justify;
  margin: 0;
  color: #000000;
}

/* Signature */
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

/* Footer */
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

/* Hide Vue DevTools */
#__nuxt-devtools__,
.__nuxt-devtools__,
[data-v-inspector] {
  display: none !important;
}

/* ===== PRINT STYLES ===== */
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
  .section-title,
  .section-header {
    color: #ffffff !important;
  }
  
  .institution-name,
  .report-title h2 {
    color: #16a34a !important;
  }

  html, body {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
  }

  .no-print,
  #__nuxt-devtools__,
  .__nuxt-devtools__,
  [data-v-inspector] {
    display: none !important;
    visibility: hidden !important;
  }

  .print-container {
    background: white;
    min-height: auto;
  }

  .print-wrapper {
    padding: 0;
    transform: scale(0.99);
    transform-origin: top left;
  }

  .paper {
    width: 100%;
    min-height: auto;
    box-shadow: none;
    padding: 0;
    margin: 0;
  }

  /* Ensure header colors print */
  .header {
    border-bottom-width: 3px !important;
    border-bottom-style: solid !important;
  }

  .section-title {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .rec-checkbox.checked,
  .rec-checkbox.checked-no {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Ensure all borders print */
  table {
    border-collapse: collapse !important;
  }

  table th,
  table td {
    border: 1px solid #000000 !important;
    border-style: solid !important;
  }

  .biodata-table td {
    border: none !important;
  }

  /* Footer sizing for print */
  .footer {
    border-top: 1px solid #000000 !important;
    border-top-style: solid !important;
  }

  .footer-image img {
    width: 100%;
    height: auto;
  }

  .signature-name {
    border-top: 1px solid #000000 !important;
    border-top-style: solid !important;
  }
}
</style>
