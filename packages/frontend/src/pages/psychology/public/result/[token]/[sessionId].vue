<route lang="yaml">
meta:
  title: Hasil Tes
  layout: public
  public: true
</route>

<template>
  <div class="min-h-screen bg-base-200 py-8">
    <div class="container mx-auto px-4 max-w-2xl">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <span class="loading loading-spinner loading-lg mb-4"></span>
        <p class="text-base-content/60">Memuat hasil...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
          <h2 class="text-2xl font-bold mb-2">Error</h2>
          <p class="text-base-content/60">{{ error }}</p>
          <button class="btn btn-primary mt-4" @click="goBack">
            Kembali
          </button>
        </div>
      </div>

      <!-- Result Content -->
      <div v-else-if="result">
        <!-- Header -->
        <div class="text-center mb-8">
          <!-- <div class="avatar placeholder mb-4">
            <div class="bg-success text-success-content rounded-full w-20">
              <IconCheck class="w-10 h-10" />
            </div>
          </div> -->
                      <IconCircleCheck class="w-16 h-16 mx-auto mb-4 text-success" />
            <h2 class="text-2xl font-bold mb-2">Semua Tes Selesai!</h2>
          <h1 class="text-3xl font-bold mb-2">Tes Selesai!</h1>
          <p class="text-base-content/60">Terima kasih telah menyelesaikan {{ result.testType?.name }}</p>
        </div>

        <!-- Test Info -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Informasi Tes</h2>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-base-content/60">Jenis Tes</p>
                <p class="font-medium">{{ result.testType?.name }}</p>
              </div>
              <div>
                <p class="text-base-content/60">Kode</p>
                <p class="font-medium">{{ result.testType?.code }}</p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Mulai</p>
                <p class="font-medium">{{ formatDateTime(result.session?.startedAt) }}</p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Selesai</p>
                <p class="font-medium">{{ formatDateTime(result.session?.completedAt) }}</p>
              </div>
              <div>
                <p class="text-base-content/60">Durasi Pengerjaan</p>
                <p class="font-medium">{{ calculateDuration(result.session?.startedAt, result.session?.completedAt) }}</p>
              </div>
              <div>
                <p class="text-base-content/60">Soal Terjawab</p>
                <p class="font-medium">{{ result.session?.answeredCount }}/{{ result.testType?.questionCount }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Scores (only show if verified) -->
        <div v-if="result.session?.verifiedAt && result.scores && Object.keys(result.scores).length > 0" class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Hasil Skor</h2>
            
            <!-- Score Details -->
            <div class="space-y-3">
              <div 
                v-for="(value, key) in result.scores" 
                :key="key"
                class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
              >
                <span class="font-medium">{{ key }}</span>
                <span class="text-lg font-bold text-primary">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary (only show if verified) -->
        <div v-if="result.session?.verifiedAt && result.summary" class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Kesimpulan</h2>
            <p class="text-base-content/80 whitespace-pre-line">{{ result.summary }}</p>
          </div>
        </div>

        <!-- Recommendations (only show if verified) -->
        <div v-if="result.session?.verifiedAt && result.recommendations?.length > 0" class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Rekomendasi</h2>
            <ul class="space-y-2">
              <li 
                v-for="(rec, index) in result.recommendations" 
                :key="index"
                class="flex items-start gap-3"
              >
                <IconPointFilled class="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <span class="text-base-content/80">{{ rec }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Pending Verification Notice (show if not verified) -->
        <div v-if="!result.session?.verifiedAt" class="card bg-info/10 border border-info shadow-xl mb-6">
          <div class="card-body">
            <div class="flex items-center gap-4">
              <IconClock class="w-10 h-10 text-info" />
              <div>
                <h3 class="font-bold">Menunggu Verifikasi</h3>
                <p class="text-base-content/60">Hasil tes Anda sedang dalam proses verifikasi oleh psikolog. Hasil lengkap akan tersedia setelah diverifikasi.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Notice -->
        <div v-if="!result.isProcessed" class="card bg-warning/10 border border-warning shadow-xl mb-6">
          <div class="card-body">
            <div class="flex items-center gap-4">
              <IconClock class="w-10 h-10 text-warning" />
              <div>
                <h3 class="font-bold">Hasil Sedang Diproses</h3>
                <p class="text-base-content/60">Hasil lengkap akan tersedia dalam beberapa waktu. Silakan kembali lagi nanti.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <button 
            class="btn btn-primary btn-block"
            @click="backToTestList"
          >
            <IconArrowLeft class="w-5 h-5" />
            Kembali ke Daftar Tes
          </button>
          
          <button 
            class="btn btn-outline btn-block"
            @click="downloadResult"
            :disabled="!result.isProcessed"
          >
            <IconDownload class="w-5 h-5" />
            Download Hasil (PDF)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconCircleCheck,
  IconCheck,
  IconAlertTriangle,
  IconPointFilled,
  IconClock,
  IconArrowLeft,
  IconDownload
} from '@tabler/icons-vue'
import { usePsychologyPublic } from '@/composables/psychology'

const route = useRoute()
const router = useRouter()

const {
  result,
  loading,
  error,
  getResult,
  formatDate
} = usePsychologyPublic()

const token = computed(() => route.params.token)
const sessionId = computed(() => route.params.sessionId)

const loadResult = async () => {
  await getResult(token.value, sessionId.value)
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return '-'
  
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / 60000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)
  
  return `${diffMins} menit ${diffSecs} detik`
}

const backToTestList = () => {
  router.push(`/psychology/public/access/${token.value}`)
}

const goBack = () => {
  router.push(`/psychology/public/access/${token.value}`)
}

const downloadResult = () => {
  // TODO: Implement PDF download
  alert('Fitur download PDF akan segera tersedia')
}

onMounted(() => {
  loadResult()
})
</script>
