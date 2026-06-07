<route lang="yaml">
meta:
  title: Buat Psikogram
  layout: default
  requiresModule: psychology
</route>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button class="btn btn-ghost btn-circle" @click="goBack">
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold">Buat Psikogram Baru</h1>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline" @click="saveDraft" :disabled="saving">
          <IconDeviceFloppy class="w-4 h-4" />
          Simpan Draft
        </button>
        <button class="btn btn-primary" @click="saveFinal" :disabled="saving">
          <IconCheck class="w-4 h-4" />
          Simpan Final
        </button>
      </div>
    </div>

    <!-- Form -->
    <div class="space-y-6">
      <!-- Biodata Peserta -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconUser class="w-5 h-5" />
            Biodata Peserta
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Pilih Peserta -->
            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text font-medium">Pilih Peserta <span class="text-error">*</span></span>
              </label>
              <div class="relative">
                <div class="join w-full">
                  <div class="join-item flex items-center justify-center w-10 bg-base-200 border border-r-0 border-base-300 rounded-l-lg">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      class="w-4 h-4 text-base-content/50"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Cari dan pilih peserta..."
                    class="input input-bordered join-item flex-1"
                    @focus="onSearchFocus"
                    @blur="onSearchBlur"
                  />
                  <button
                    v-if="searchQuery"
                    type="button"
                    class="btn btn-ghost join-item"
                    @click="clearSelection"
                  >
                    <IconX class="w-4 h-4" />
                  </button>
                </div>
                
                <!-- Dropdown -->
                <div 
                  v-show="showDropdown && filteredParticipants.length > 0"
                  class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                >
                  <div v-if="sessionsLoading" class="p-4 text-center">
                    <span class="loading loading-spinner loading-sm"></span>
                  </div>
                  <template v-else>
                    <div
                      v-for="participant in filteredParticipants"
                      :key="participant.sessionId"
                      class="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0"
                      @mousedown.prevent="onPatientChange(participant)"
                    >
                      <div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center shrink-0">
                        <IconUser class="w-5 h-5 text-base-content/60" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-semibold truncate">{{ participant.fullName }}</div>
                        <div class="text-xs text-base-content/60 flex flex-wrap items-center gap-1">
                          <span v-if="participant.email">{{ participant.email }}</span>
                          <span v-if="participant.age">• {{ participant.age }} tahun</span>
                          <span v-if="participant.education" class="badge badge-xs badge-ghost">{{ participant.education }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="filteredParticipants.length === 0 && !sessionsLoading" class="p-4 text-center text-base-content/60">
                      Tidak ada peserta terverifikasi
                    </div>
                  </template>
                </div>
              </div>
              <label class="label">
                <span class="label-text-alt text-base-content/50">Hanya peserta yang sudah menyelesaikan test dan terverifikasi</span>
              </label>
            </div>

            <!-- Nama -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Nama <span class="text-error">*</span></span>
              </label>
              <input
                v-model="form.participant.name"
                type="text"
                placeholder="Nama lengkap peserta"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Tanggal Lahir -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Lahir</span>
              </label>
              <input
                v-model="form.participant.birthDate"
                type="date"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Tanggal Pemeriksaan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Pemeriksaan</span>
              </label>
              <input
                v-model="form.examDate"
                type="date"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Usia -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Usia</span>
              </label>
              <input
                :value="calculatedAge"
                type="text"
                class="input input-bordered w-full bg-base-200"
                placeholder="Otomatis dihitung dari tanggal lahir"
                readonly
              />
            </div>

            <!-- Pendidikan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Pendidikan Terakhir</span>
              </label>
              <input
                v-model="form.participant.education"
                type="text"
                placeholder="e.g. S1 Sipil, SMA IPA, dll"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Perusahaan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Perusahaan</span>
              </label>
              <input
                v-model="form.participant.corporate"
                type="text"
                placeholder="Nama perusahaan"
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Status Card -->
      <div v-if="form.sessionId" class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title">
              <IconInfoCircle class="w-5 h-5" />
              Status Analisis PAPI
            </h2>
            <button 
              class="btn btn-sm btn-outline" 
              @click="reanalyze"
              :disabled="analyzing"
            >
              <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': analyzing }" />
              {{ analyzing ? 'Menganalisis...' : 'Analisis Ulang' }}
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="analyzing" class="flex items-center gap-3 py-4">
            <span class="loading loading-spinner loading-md text-primary"></span>
            <span class="text-base-content/70">Menganalisis jawaban PAPI dan menghitung rating aspek...</span>
          </div>

          <!-- Analysis Result -->
          <div v-else-if="analysisResult" class="space-y-4 mt-4">
            <!-- Overall Score -->
            <div class="stats stats-horizontal shadow bg-base-200 w-full">
              <div class="stat place-items-center">
                <div class="stat-title">Overall Score</div>
                <div class="stat-value text-primary">{{ analysisResult.overallPercent }}%</div>
                <div class="stat-desc">
                  <span :class="['badge', getRatingColorClass(analysisResult.overallRating)]">
                    {{ getRatingLabel(analysisResult.overallRating) }}
                  </span>
                </div>
              </div>
              <div class="stat place-items-center">
                <div class="stat-title">Kecerdasan</div>
                <div class="stat-value text-secondary text-2xl">{{ analysisResult.kecerdasan?.overallPercent || 0 }}%</div>
              </div>
              <div class="stat place-items-center">
                <div class="stat-title">Sikap Kerja</div>
                <div class="stat-value text-accent text-2xl">{{ analysisResult.sikapKerja?.overallPercent || 0 }}%</div>
              </div>
              <div class="stat place-items-center">
                <div class="stat-title">Kepribadian</div>
                <div class="stat-value text-info text-2xl">{{ analysisResult.kepribadian?.overallPercent || 0 }}%</div>
              </div>
            </div>

            <!-- Info -->
            <div class="alert alert-success">
              <IconCheck class="w-5 h-5" />
              <div>
                <h3 class="font-bold">Analisis Berhasil!</h3>
                <div class="text-xs">Rating aspek telah diisi otomatis berdasarkan jawaban PAPI. Anda dapat mengubah rating secara manual jika diperlukan.</div>
              </div>
            </div>
          </div>

          <!-- No Analysis Yet -->
          <div v-else class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <span>Pilih peserta terlebih dahulu untuk menganalisis jawaban PAPI secara otomatis.</span>
          </div>
        </div>
      </div>

      <!-- A. Kecerdasan -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconBrain class="w-5 h-5" />
            A. Kecerdasan
          </h2>

          <div class="space-y-4">
            <AspekItem
              v-for="(item, index) in form.sections.kecerdasan.items"
              :key="index"
              :title="item.title"
              :description="item.description"
              v-model:rating="item.rating"
            />

            <!-- Kesimpulan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kesimpulan</span>
              </label>
              <textarea
                v-model="form.sections.kecerdasan.conclusion"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Tulis kesimpulan untuk aspek kecerdasan..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- B. Sikap dan Cara Kerja -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconBriefcase class="w-5 h-5" />
            B. Sikap dan Cara Kerja
          </h2>

          <div class="space-y-4">
            <AspekItem
              v-for="(item, index) in form.sections.sikapKerja.items"
              :key="index"
              :title="item.title"
              :description="item.description"
              v-model:rating="item.rating"
            />

            <!-- Kesimpulan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kesimpulan</span>
              </label>
              <textarea
                v-model="form.sections.sikapKerja.conclusion"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Tulis kesimpulan untuk aspek sikap dan cara kerja..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- C. Kepribadian -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconHeart class="w-5 h-5" />
            C. Kepribadian
          </h2>

          <div class="space-y-4">
            <AspekItem
              v-for="(item, index) in form.sections.kepribadian.items"
              :key="index"
              :title="item.title"
              :description="item.description"
              v-model:rating="item.rating"
            />

            <!-- Kesimpulan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kesimpulan</span>
              </label>
              <textarea
                v-model="form.sections.kepribadian.conclusion"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Tulis kesimpulan untuk aspek kepribadian..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- D. Kemampuan Belajar -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconSchool class="w-5 h-5" />
            D. Kemampuan Belajar
          </h2>

          <div class="space-y-4">
            <AspekItem
              v-for="(item, index) in form.sections.kemampuanBelajar.items"
              :key="index"
              :title="item.title"
              :description="item.description"
              v-model:rating="item.rating"
            />

            <!-- Kesimpulan -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kesimpulan</span>
              </label>
              <textarea
                v-model="form.sections.kemampuanBelajar.conclusion"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Tulis kesimpulan untuk aspek kemampuan belajar..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Rekomendasi -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Rekomendasi</h2>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Hasil Rekomendasi</span>
            </label>
            <div class="flex gap-4">
              <label class="label cursor-pointer justify-start gap-2 border rounded-lg px-4 py-2" :class="form.recommendation === 'recommended' ? 'border-success bg-success/10' : 'border-base-300'">
                <input
                  type="radio"
                  name="recommendation"
                  value="recommended"
                  v-model="form.recommendation"
                  class="radio radio-success"
                />
                <IconCheck class="w-4 h-4 text-success" />
                <span class="label-text">Disarankan</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2 border rounded-lg px-4 py-2" :class="form.recommendation === 'not_recommended' ? 'border-error bg-error/10' : 'border-base-300'">
                <input
                  type="radio"
                  name="recommendation"
                  value="not_recommended"
                  v-model="form.recommendation"
                  class="radio radio-error"
                />
                <IconX class="w-4 h-4 text-error" />
                <span class="label-text">Tidak Disarankan</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons (Bottom) -->
      <div class="flex justify-end gap-2 py-4">
        <button class="btn btn-outline" @click="saveDraft" :disabled="saving">
          <IconDeviceFloppy class="w-4 h-4" />
          Simpan Draft
        </button>
        <button class="btn btn-primary" @click="saveFinal" :disabled="saving">
          <IconCheck class="w-4 h-4" />
          Simpan Final
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconCheck,
  IconX,
  IconUser,
  IconBrain,
  IconBriefcase,
  IconHeart,
  IconSchool,
  IconSearch,
  IconRefresh,
  IconInfoCircle
} from '@tabler/icons-vue'
import { useSessions, usePatients, usePsikogram } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'
import AspekItem from '@/components/psychology/psikogram/AspekItem.vue'
import { 
  analyzePapiScoresToPsikogram, 
  calculateScalesFromAnswers,
  getRatingLabel,
  getRatingColorClass
} from '@/utils/psychology/psikogramAnalyzer'
import { papiQuestions } from '@/data/papikostick'

const router = useRouter()
const { showSuccess, showError, showInfo } = useNotification()
const { sessions, fetchSessions, getSessionById, loading: sessionsLoading } = useSessions()
const { calculateAge } = usePatients()
const { createPsikogram, loading: savingPsikogram } = usePsikogram()

const saving = ref(false)
const searchQuery = ref('')
const showDropdown = ref(false)
const analyzing = ref(false)
const analysisResult = ref(null)
const selectedSession = ref(null)

// Peserta yang sudah menyelesaikan test dan terverifikasi
const verifiedParticipants = computed(() => {
  if (!sessions.value) return []
  return sessions.value
    .filter(s => s.status === 'verified')
    .map(s => {
      // Data patient dari order.patient
      const patient = s.order?.patient || s.patient || {}
      return {
        sessionId: s.id,
        patientId: patient.id || s.patientId,
        fullName: patient.fullName || patient.name || '-',
        email: patient.email || '',
        birthDate: patient.birthDate || patient.dateOfBirth,
        age: patient.age || calculateAge(patient.birthDate || patient.dateOfBirth),
        education: patient.personalData?.education || patient.education || '',
        corporate: patient.personalData?.corporate || patient.corporate || '',
        sex: patient.sex || '',
        testType: s.testType?.name || s.testTypeName || '',
        verifiedAt: s.verifiedAt || s.updatedAt
      }
    })
})

// Filter berdasarkan pencarian
const filteredParticipants = computed(() => {
  if (!searchQuery.value) return verifiedParticipants.value
  const query = searchQuery.value.toLowerCase()
  return verifiedParticipants.value.filter(p => 
    p.fullName.toLowerCase().includes(query) ||
    p.email.toLowerCase().includes(query) ||
    (p.corporate && p.corporate.toLowerCase().includes(query))
  )
})

const form = reactive({
  patientId: '',
  sessionId: '',
  examDate: new Date().toISOString().split('T')[0],
  participant: {
    name: '',
    birthDate: '',
    education: '',
    corporate: ''
  },
  sections: {
    kecerdasan: {
      items: [
        { title: 'Logika Berpikir', description: 'Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi.', rating: '' },
        { title: 'Kemampuan Analisa', description: 'Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian yang lebih kecil.', rating: '' },
        { title: 'Kemampuan Numerikal', description: 'Kemampuan untuk berpikir praktis dalam memahami konsep angka dan hitungan.', rating: '' },
        { title: 'Kemampuan Verbal', description: 'Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata.', rating: '' }
      ],
      conclusion: ''
    },
    sikapKerja: {
      items: [
        { title: 'Orientasi Hasil', description: 'Kemampuan untuk mempertahankan komitmen untuk menyelesaikan tugas secara bertanggung jawab.', rating: '' },
        { title: 'Fleksibilitas', description: 'Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan.', rating: '' },
        { title: 'Sistematika Kerja', description: 'Kemampuan untuk merencanakan hingga mengorganisasikan cara kerja.', rating: '' }
      ],
      conclusion: ''
    },
    kepribadian: {
      items: [
        { title: 'Motivasi Berprestasi', description: 'Kemampuan untuk menunjukkan prestasi dan mencapai target.', rating: '' },
        { title: 'Kerjasama', description: 'Kemampuan untuk menjalin, membina dan mengoptimalkan hubungan kerja yang efektif.', rating: '' },
        { title: 'Keterampilan Interpersonal', description: 'Kemampuan untuk menjalin hubungan sosial dan mampu memahami kebutuhan orang lain.', rating: '' },
        { title: 'Stabilitas Emosi', description: 'Kemampuan untuk memahami dan mengontrol emosi.', rating: '' }
      ],
      conclusion: ''
    },
    kemampuanBelajar: {
      items: [
        { title: 'Pengembangan Diri', description: 'Kemampuan untuk meningkatkan pengetahuan dan menyempurnakan keterampilan diri.', rating: '' },
        { title: 'Mengelola Perubahan', description: 'Kemampuan dalam menyesuaikan diri dengan situasi baru.', rating: '' }
      ],
      conclusion: ''
    }
  },
  recommendation: '',
  status: 'draft'
})

const calculatedAge = computed(() => {
  if (!form.participant.birthDate) return ''
  const birth = new Date(form.participant.birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return `${age} tahun`
})

const onPatientChange = async (participant) => {
  if (participant) {
    form.patientId = participant.patientId
    form.sessionId = participant.sessionId
    form.participant.name = participant.fullName || ''
    form.participant.birthDate = participant.birthDate ? participant.birthDate.split('T')[0] : ''
    form.participant.education = participant.education || ''
    form.participant.corporate = participant.corporate || ''
    searchQuery.value = participant.fullName
    showDropdown.value = false
    
    // Fetch session detail untuk mendapatkan jawaban PAPI
    await fetchAndAnalyzePapiAnswers(participant.sessionId)
  }
}

/**
 * Fetch session detail dan analisis jawaban PAPI
 */
const fetchAndAnalyzePapiAnswers = async (sessionId) => {
  analyzing.value = true
  analysisResult.value = null
  
  try {
    // Ambil detail session termasuk jawaban
    const sessionData = await getSessionById(sessionId)
    selectedSession.value = sessionData
    
    console.log('Session Data:', sessionData) // Debug
    
    // Cek apakah ada jawaban PAPI (support berbagai kemungkinan field name)
    const answers = sessionData.answers 
      || sessionData.result?.answers 
      || sessionData.data?.answers
      || sessionData.session?.answers
      || null
    
    // Check jumlah jawaban (handle object dan array)
    const answersCount = Array.isArray(answers) 
      ? answers.length 
      : (answers && typeof answers === 'object' ? Object.keys(answers).length : 0)
    
    console.log('Answers found:', answersCount, 'Format:', Array.isArray(answers) ? 'array' : 'object') // Debug
    
    if (!answers || answersCount === 0) {
      showInfo('Tidak ada data jawaban PAPI. Rating akan diisi manual.')
      return
    }
    
    // Gunakan pertanyaan dari data lokal atau dari session
    const questions = sessionData.testType?.questions 
      || sessionData.data?.testType?.questions
      || papiQuestions 
      || []
    
    console.log('Questions found:', questions.length) // Debug
    
    if (questions.length === 0) {
      showError('Data pertanyaan PAPI tidak ditemukan')
      return
    }
    
    // Hitung skor per skala (support both array and object format)
    const scaleScores = calculateScalesFromAnswers(answers, questions)
    
    console.log('Scale Scores:', scaleScores) // Debug
    
    // Konversi ke format object untuk analisis
    const papiScores = {}
    for (const scale of scaleScores) {
      papiScores[scale.code] = {
        score: scale.score,
        max: scale.max,
        percent: scale.percent
      }
    }
    
    // Analisis ke aspek Psikogram
    const analysis = analyzePapiScoresToPsikogram(papiScores)
    analysisResult.value = analysis
    
    // Auto-fill rating ke form
    applyAnalysisToForm(analysis)
    
    showSuccess('Analisis PAPI berhasil! Rating aspek telah diisi otomatis.')
  } catch (error) {
    console.error('Error analyzing PAPI answers:', error)
    showError('Gagal menganalisis jawaban PAPI')
  } finally {
    analyzing.value = false
  }
}

/**
 * Apply hasil analisis ke form
 */
const applyAnalysisToForm = (analysis) => {
  // Kecerdasan
  if (analysis.kecerdasan?.items) {
    for (let i = 0; i < analysis.kecerdasan.items.length; i++) {
      if (form.sections.kecerdasan.items[i]) {
        form.sections.kecerdasan.items[i].rating = analysis.kecerdasan.items[i].rating
      }
    }
  }
  
  // Sikap Kerja
  if (analysis.sikapKerja?.items) {
    for (let i = 0; i < analysis.sikapKerja.items.length; i++) {
      if (form.sections.sikapKerja.items[i]) {
        form.sections.sikapKerja.items[i].rating = analysis.sikapKerja.items[i].rating
      }
    }
  }
  
  // Kepribadian
  if (analysis.kepribadian?.items) {
    for (let i = 0; i < analysis.kepribadian.items.length; i++) {
      if (form.sections.kepribadian.items[i]) {
        form.sections.kepribadian.items[i].rating = analysis.kepribadian.items[i].rating
      }
    }
  }
  
  // Kemampuan Belajar
  if (analysis.kemampuanBelajar?.items) {
    for (let i = 0; i < analysis.kemampuanBelajar.items.length; i++) {
      if (form.sections.kemampuanBelajar.items[i]) {
        form.sections.kemampuanBelajar.items[i].rating = analysis.kemampuanBelajar.items[i].rating
      }
    }
  }
}

/**
 * Re-analyze jika user ingin refresh
 */
const reanalyze = async () => {
  if (form.sessionId) {
    await fetchAndAnalyzePapiAnswers(form.sessionId)
  }
}

const onSearchFocus = () => {
  showDropdown.value = true
}

const onSearchBlur = () => {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

const clearSelection = () => {
  form.patientId = ''
  form.sessionId = ''
  form.participant.name = ''
  form.participant.birthDate = ''
  form.participant.education = ''
  form.participant.corporate = ''
  searchQuery.value = ''
}

const goBack = () => {
  router.push('/psychology/psikogram')
}

const saveDraft = async () => {
  form.status = 'draft'
  await saveForm()
}

const saveFinal = async () => {
  form.status = 'final'
  await saveForm()
}

const saveForm = async () => {
  saving.value = true
  try {
    // Prepare data for API
    const payload = {
      patientId: form.patientId,
      sessionId: form.sessionId || undefined,
      examDate: form.examDate,
      participant: {
        name: form.participant.name,
        birthDate: form.participant.birthDate || undefined,
        education: form.participant.education || undefined,
        corporate: form.participant.corporate || undefined
      },
      sections: JSON.parse(JSON.stringify(form.sections)),
      recommendation: form.recommendation || undefined,
      status: form.status
    }
    
    // Call API
    await createPsikogram(payload)
    
    router.push('/psychology/psikogram')
  } catch (error) {
    console.error('Error saving psikogram:', error)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    // Fetch sessions with verified status
    await fetchSessions({ status: 'verified', limit: 100 })
  } catch (error) {
    console.error('Error loading verified participants:', error)
  }
})
</script>
