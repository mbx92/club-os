<route lang="yaml">
meta:
  title: Akses Tes
  layout: public
  public: true
</route>

<template>
  <div class="min-h-screen bg-base-200 py-8">
    <div class="container mx-auto px-4 max-w-2xl">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <span class="loading loading-spinner loading-lg mb-4"></span>
        <p class="text-base-content/60">Memvalidasi akses...</p>
      </div>

      <!-- Invalid/Expired -->
      <div v-else-if="error" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
          <h2 class="text-2xl font-bold mb-2">Akses Tidak Valid</h2>
          <p class="text-base-content/60">{{ error }}</p>
        </div>
      </div>

      <!-- Access Content -->
      <div v-else-if="accessInfo">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-2">Selamat Datang, {{ accessInfo.patient?.fullName }}</h1>
          <p class="text-base-content/60">Pilih tes yang ingin Anda kerjakan</p>
        </div>

        <!-- Order Info -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h2 class="card-title">{{ accessInfo.package?.name }}</h2>
              <div class="badge badge-success">Aktif</div>
            </div>
            
            <div class="flex flex-wrap gap-4 text-sm">
              <div class="flex items-center gap-2">
                <IconCalendar class="w-4 h-4 text-base-content/60" />
                <span>Berlaku hingga: {{ formatDate(accessInfo.expiresAt) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <IconClipboardCheck class="w-4 h-4 text-base-content/60" />
                <span>{{ completedCount }}/{{ totalTests }} tes selesai</span>
              </div>
            </div>

            <!-- Progress -->
            <div class="mt-4">
              <div class="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span class="font-medium">{{ Math.round((completedCount / totalTests) * 100) }}%</span>
              </div>
              <progress 
                class="progress progress-success w-full" 
                :value="completedCount" 
                :max="totalTests"
              ></progress>
            </div>
          </div>
        </div>

        <!-- Test Sessions -->
        <div class="space-y-4">
          <div 
            v-for="session in accessInfo.sessions" 
            :key="session.id"
            class="card bg-base-100 shadow-xl"
          >
            <div class="card-body">
              <div class="flex items-start gap-4">
                <div class="avatar">
                  <div 
                    class="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 relative"
                    :class="[
                      getSessionBgClass(session.status),
                      { 'opacity-50': session.status === 'completed' }
                    ]"
                  >
                    <IconCheck 
                      v-if="session.status === 'completed'" 
                      class="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                    />
                    <IconPlayerPlay 
                      v-else-if="session.status === 'in_progress'" 
                      class="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                    />
                    <IconClipboard 
                      v-else 
                      class="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                    />
                  </div>
                </div>

                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-bold">{{ session.testType?.name }}</h3>
                    <div class="badge badge-sm" :class="getSessionStatusClass(session.status)">
                      {{ getSessionStatusLabel(session.status) }}
                    </div>
                  </div>
                  <p class="text-sm text-base-content/60 mb-3">
                    {{session.testType?.code }}
                  </p>

                  <div class="flex flex-wrap gap-4 text-sm text-base-content/60">
                    <div class="flex items-center gap-1">
                      <IconClock class="w-4 h-4" />
                      <span>{{ session.testType?.estimatedDuration }} menit</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconListCheck class="w-4 h-4" />
                      <span>{{ getActualQuestionCount(session) }} soal</span>
                    </div>
                    <div v-if="session.status === 'in_progress'" class="flex items-center gap-1 text-warning">
                      <IconProgress class="w-4 h-4" />
                      <span>{{ getQuestionProgress(session).answered }}/{{ getQuestionProgress(session).total }} dijawab</span>
                    </div>
                    <div v-if="session.status === 'completed'" class="flex items-center gap-1 text-success">
                      <IconCheck class="w-4 h-4" />
                      <span>{{ getQuestionProgress(session).answered }}/{{ getQuestionProgress(session).total }} terjawab</span>
                    </div>
                  </div>
                </div>

                <div class="flex-shrink-0">
                  <button 
                    v-if="session.status === 'pending'"
                    class="btn btn-primary"
                    @click="startTest(session)"
                    :disabled="starting"
                  >
                    <IconPlayerPlay class="w-4 h-4" />
                    Mulai
                  </button>
                  <button 
                    v-else-if="session.status === 'in_progress'"
                    class="btn btn-warning"
                    @click="continueTest(session)"
                  >
                    <IconPlayerPlay class="w-4 h-4" />
                    Lanjutkan
                  </button>
                  <button 
                    v-else-if="session.status === 'completed'"
                    class="btn btn-ghost"
                    @click="viewResult(session)"
                  >
                    <IconChartBar class="w-4 h-4" />
                    Hasil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- All Completed -->
        <div v-if="completedCount === totalTests && totalTests > 0" class="card bg-success text-success-content shadow-xl mt-6">
          <div class="card-body text-center">
            <IconCircleCheck class="w-16 h-16 mx-auto mb-4" />
            <h2 class="text-2xl font-bold mb-2">Semua Tes Selesai!</h2>
            <p>Terima kasih telah menyelesaikan semua tes. Hasil akan segera diproses.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAlertTriangle,
  IconCalendar,
  IconClipboardCheck,
  IconCheck,
  IconPlayerPlay,
  IconClipboard,
  IconClock,
  IconListCheck,
  IconProgress,
  IconChartBar,
  IconCircleCheck
} from '@tabler/icons-vue'
import { usePsychologyPublic } from '@/composables/psychology'

const route = useRoute()
const router = useRouter()

const {
  tokenData: accessInfo,
  loading,
  error,
  validateToken,
  startSession,
  formatDate
} = usePsychologyPublic()

const starting = ref(false)

const totalTests = computed(() => accessInfo.value?.sessions?.length || 0)

const completedCount = computed(() => {
  return accessInfo.value?.sessions?.filter(s => s.status === 'completed').length || 0
})

// Get actual question count (exclude instruction for CFIT)
const getActualQuestionCount = (session) => {
  if (!session?.testType) return 0
  
  // Priority 1: Use totalQuestions from session (already calculated by backend)
  if (session.totalQuestions !== undefined && session.totalQuestions !== null) {
    return session.totalQuestions
  }
  
  // Priority 2: Use actualQuestionCount if provided
  if (session.actualQuestionCount !== undefined && session.actualQuestionCount !== null) {
    return session.actualQuestionCount
  }
  
  // Priority 3: Use questionCount from testType
  const questionCount = session.testType.questionCount || 0
  
  // For CFIT, subtract instruction pages if not already provided by backend
  const isCFIT = session.testType.code?.toUpperCase() === 'CFIT'
  if (isCFIT && questionCount > 46) {
    // Only subtract if questionCount seems to include instructions (> 46)
    return questionCount - 4
  }
  
  return questionCount
}

// Get actual answered/total questions (exclude instruction for CFIT)
const getQuestionProgress = (session) => {
  const answered = session.answeredQuestions || 0
  const total = getActualQuestionCount(session)
  
  return { answered, total }
}

const getSessionBgClass = (status) => {
  const classes = {
    'pending': 'bg-base-200 text-base-content',
    'in_progress': 'bg-warning text-warning-content',
    'completed': 'bg-success text-success-content'
  }
  return classes[status] || classes['pending']
}

const getSessionStatusClass = (status) => {
  const classes = {
    'pending': 'badge-ghost',
    'in_progress': 'badge-warning',
    'completed': 'badge-success'
  }
  return classes[status] || classes['pending']
}

const getSessionStatusLabel = (status) => {
  const labels = {
    'pending': 'Belum Dimulai',
    'in_progress': 'Sedang Berlangsung',
    'completed': 'Selesai'
  }
  return labels[status] || status
}

const loadAccessInfo = async () => {
  const token = route.params.token
  await validateToken(token)
}

const startTest = async (session) => {
  starting.value = true
  try {
    const token = route.params.token
    const result = await startSession(token, session.id)
    if (result) {
      router.push(`/psychology/public/test/${route.params.token}/${session.id}`)
    }
  } catch (err) {
    console.error('Start test error:', err)
  } finally {
    starting.value = false
  }
}

const continueTest = (session) => {
  router.push(`/psychology/public/test/${route.params.token}/${session.id}`)
}

const viewResult = (session) => {
  // Check test type and redirect to appropriate result page
  const testCode = session.testType?.code?.toUpperCase()
  if (testCode === 'EPPS') {
    router.push(`/psychology/public/result/epps/${route.params.token}/${session.id}`)
  } else if (testCode === 'CFIT') {
    router.push(`/psychology/public/result/cfit/${route.params.token}/${session.id}`)
  } else {
    router.push(`/psychology/public/result/${route.params.token}/${session.id}`)
  }
}

onMounted(() => {
  loadAccessInfo()
})
</script>
