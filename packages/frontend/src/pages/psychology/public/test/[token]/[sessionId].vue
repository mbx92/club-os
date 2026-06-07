<route lang="yaml">
meta:
  title: Tes Psikologi
  layout: public
  requiresModule: psychology
  public: true
</route>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg mb-4"></span>
      <p class="text-base-content/60">Memuat tes...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen p-4">
      <div class="card bg-base-100 shadow-xl max-w-md">
        <div class="card-body text-center">
          <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
          <h2 class="text-2xl font-bold mb-2">Error</h2>
          <p class="text-base-content/60">{{ error }}</p>
          <button class="btn btn-primary mt-4" @click="goBack">
            Kembali
          </button>
        </div>
      </div>
    </div>

    <!-- Instruction Screen -->
    <div v-else-if="showInstructions && session" class="flex items-center justify-center min-h-screen p-4">
      <div class="card bg-base-100 shadow-xl max-w-2xl">
        <div class="card-body">
          <h2 class="text-2xl font-bold mb-4">{{ session.testType?.name }}</h2>
          <div class="space-y-4">
            <div v-if="session.testType?.config?.instructionText" class="prose max-w-none">
              <p class="whitespace-pre-line text-base">{{ session.testType.config.instructionText }}</p>
            </div>
            <div v-else class="prose max-w-none">
              <p>Anda akan mengerjakan tes <strong>{{ session.testType?.name }}</strong> dengan {{ actualQuestionCount }} soal.</p>
              <p v-if="session.testType?.config?.timeLimit">Waktu pengerjaan: <strong>{{ session.testType.config.timeLimit }} menit</strong>.</p>
              <p v-else>Tidak ada batasan waktu.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                <IconListCheck class="w-5 h-5 text-primary" />
                <span>{{ actualQuestionCount }} soal</span>
              </div>
              <div v-if="session.testType?.config?.timeLimit" class="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                <IconClock class="w-5 h-5 text-primary" />
                <span>{{ session.testType.config.timeLimit }} menit</span>
              </div>
              <div v-if="session.testType?.config?.allowBack !== false" class="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                <IconCheck class="w-5 h-5 text-success" />
                <span>Boleh kembali</span>
              </div>
              <div v-if="session.testType?.config?.allowSkip" class="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                <IconCheck class="w-5 h-5 text-success" />
                <span>Boleh lewati soal</span>
              </div>
            </div>

            <div class="alert alert-info">
              <IconAlertTriangle class="w-5 h-5" />
              <span>Pastikan koneksi internet Anda stabil selama mengerjakan tes.</span>
            </div>
          </div>

          <div class="card-actions justify-end mt-6">
            <button class="btn btn-primary btn-lg" @click="startTest">
              Mulai Tes
              <IconChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Biodata Form -->
    <div v-else-if="showBiodataForm && session" class="flex items-center justify-center min-h-screen p-4">
      <div class="card bg-base-100 shadow-xl max-w-md">
        <div class="card-body">
          <h2 class="text-xl font-bold mb-2">Konfirmasi Data Peserta</h2>
          <p class="text-sm text-base-content/60 mb-4">Mohon periksa dan konfirmasi data Anda sebelum memulai tes.</p>
          
          <div class="space-y-4">
            <!-- Patient Info (Read-only) -->
            <div v-if="session.patient" class="alert alert-info">
              <IconUser class="w-5 h-5" />
              <div class="text-left">
                <p class="font-medium">{{ session.patient.fullName || session.patient.name }}</p>
                <p v-if="session.patient.email" class="text-sm opacity-80">{{ session.patient.email }}</p>
              </div>
            </div>

            <div v-if="session.testType?.config?.requiresAge" class="form-control">
              <label class="label">
                <span class="label-text font-medium">Usia (tahun) <span class="text-error">*</span></span>
              </label>
              <input 
                type="number" 
                v-model.number="biodataForm.age"
                class="input input-bordered" 
                :class="{ 'input-success': biodataForm.age && !isAgeManuallyEdited }"
                placeholder="Masukkan usia Anda"
                min="1"
                max="100"
                @input="isAgeManuallyEdited = true"
                required
              />
              <label v-if="biodataForm.age && !isAgeManuallyEdited" class="label">
                <span class="label-text-alt text-success">✓ Dihitung otomatis dari tanggal lahir</span>
              </label>
            </div>

            <div v-if="session.testType?.config?.requiresBirthDate" class="form-control">
              <label class="label">
                <span class="label-text font-medium">Tanggal Lahir <span class="text-error">*</span></span>
              </label>
              <input 
                type="date" 
                v-model="biodataForm.birthDate"
                class="input input-bordered"
                :class="{ 'input-success': biodataForm.birthDate && biodataForm.birthDateSource === 'patient' }"
                :max="new Date().toISOString().split('T')[0]"
                @change="onBirthDateChange"
                required
              />
              <label v-if="biodataForm.birthDate && biodataForm.birthDateSource === 'patient'" class="label">
                <span class="label-text-alt text-success">✓ Data dari registrasi</span>
              </label>
            </div>

            <div v-if="biodataForm.calculatedAge" class="alert alert-sm">
              <IconInfoCircle class="w-4 h-4" />
              <span class="text-sm">Umur Anda saat ini: <strong>{{ biodataForm.calculatedAge }} tahun</strong></span>
            </div>
          </div>

          <div class="card-actions justify-end mt-6">
            <button 
              class="btn btn-primary btn-lg w-full" 
              @click="submitBiodata"
              :disabled="!isBiodataValid"
            >
              Konfirmasi & Lanjutkan
              <IconChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CFIT Instruction Page (only for CFIT test) -->
    <div v-else-if="testStarted && isCfitTest && currentQuestion?.type === 'instruction'" class="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-base-200 to-base-300">
      <div class="card bg-base-100 shadow-2xl max-w-4xl w-full">
        <div class="card-body p-8">
          <!-- Header -->
          <div class="text-center mb-6 pb-6 border-b-2 border-base-300">
            <h1 class="text-3xl font-bold text-primary mb-2">{{ currentQuestion.title }}</h1>
            <h2 class="text-xl text-base-content/70">{{ currentQuestion.subtitle }}</h2>
          </div>

          <!-- Introduction -->
          <div class="bg-gradient-to-r from-info/10 to-info/5 p-6 rounded-lg mb-6 border-l-4 border-info">
            <p class="text-base leading-relaxed whitespace-pre-line">{{ currentQuestion.content.intro }}</p>
            <div class="mt-4 flex items-center gap-2 bg-warning/20 text-warning-content p-3 rounded-lg border border-warning/50">
              <IconClock class="w-5 h-5 flex-shrink-0" />
              <span class="font-semibold">Waktu: {{ formatTimeLimit(currentQuestion.content.timeLimit) }}</span>
            </div>
          </div>

          <!-- Examples -->
          <div v-if="currentQuestion.content.examples?.length" class="mb-6">
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
              <IconBulb class="w-6 h-6 text-warning" />
              Contoh Soal:
            </h3>
            <div class="space-y-4">
              <div 
                v-for="example in currentQuestion.content.examples" 
                :key="example.number"
                class="bg-base-200 p-5 rounded-lg border-l-4 border-primary"
              >
                <div class="font-bold text-primary mb-3">Contoh {{ example.number }}:</div>
                
                <!-- Example Image (if available) -->
                <div v-if="example.imagePath" class="mb-4 flex justify-center">
                  <div v-if="!getCfitImageUrl(example.imagePath)" class="flex items-center justify-center h-48 bg-base-300 rounded-lg w-full max-w-md">
                    <span class="loading loading-spinner loading-lg"></span>
                  </div>
                  <img 
                    v-else
                    :src="getCfitImageUrl(example.imagePath)" 
                    :alt="`Contoh ${example.number}`"
                    class="rounded-lg border border-base-300 max-w-md w-full"
                    @error="onImageError"
                  />
                </div>
                
                <p class="text-base mb-3 leading-relaxed text-base-content">{{ example.description }}</p>
                <div class="bg-success/20 p-4 rounded-lg border border-success/50">
                  <div class="flex items-center gap-2 mb-2">
                    <IconCheck class="w-5 h-5 text-success" />
                    <span class="font-bold text-base-content">Jawaban: {{ example.answer }}</span>
                  </div>
                  <p class="text-sm text-base-content/80">{{ example.explanation }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Rules -->
          <div v-if="currentQuestion.content.rules?.length" class="mb-6">
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
              <IconListCheck class="w-6 h-6 text-info" />
              Aturan Pengerjaan:
            </h3>
            <div class="bg-info/10 p-5 rounded-lg">
              <ul class="space-y-3">
                <li 
                  v-for="(rule, index) in currentQuestion.content.rules" 
                  :key="index"
                  class="flex items-start gap-3"
                >
                  <IconCheck class="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <span class="text-base">{{ rule }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Warnings (for topology) -->
          <div v-if="currentQuestion.content.warnings?.length" class="mb-6">
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
              <IconAlertTriangle class="w-6 h-6 text-warning" />
              Perhatian:
            </h3>
            <div class="bg-warning/20 p-5 rounded-lg border-l-4 border-warning">
              <ul class="space-y-2">
                <li 
                  v-for="(warning, index) in currentQuestion.content.warnings" 
                  :key="index"
                  class="flex items-start gap-3 text-warning-content font-medium"
                >
                  <IconAlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{{ warning }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Continue Button -->
          <div class="text-center mt-8">
            <button class="btn btn-primary btn-lg px-12 gap-2 shadow-lg hover:shadow-xl transition-all" @click="continueFromInstruction">
              <IconCheck class="w-6 h-6" />
              Saya Mengerti, Mulai Tes
              <IconChevronRight class="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Content -->
    <div v-else-if="testStarted && session && questions.length > 0 && (!isCfitTest || currentQuestion?.type !== 'instruction')" class="flex flex-col min-h-screen">
      <!-- Header -->
      <div class="bg-base-100 shadow-lg sticky top-0 z-10">
        <!-- Connection Warning Alert (only show if questions are loaded) -->
        <div v-if="shouldShowWarning() && questions.length > 0" class="bg-warning/10 border-b border-warning/30">
          <div class="container mx-auto px-4 py-3">
            <div class="flex items-start gap-3">
              <span class="text-warning text-xl mt-0.5">⚠️</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-warning">{{ getRecommendation() }}</p>
                <p class="text-xs text-warning/70 mt-1">Jawaban Anda akan tetap tersimpan dan akan dikirim saat koneksi kembali stabil.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold">{{ session.testType?.name }}</h1>
              <p class="text-sm text-base-content/60">{{ session.testType?.code }}</p>
            </div>
            
            <!-- Header Actions -->
            <div class="flex items-center gap-4">
              <!-- Connection Indicator -->
              <div class="tooltip tooltip-bottom" :data-tip="getRecommendation() || 'Koneksi stabil'">
                <div 
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                  :class="{
                    'bg-success/20 text-success': connectionQuality === 'good',
                    'bg-warning/20 text-warning': connectionQuality === 'warning',
                    'bg-error/20 text-error': connectionQuality === 'poor' || connectionQuality === 'offline'
                  }"
                >
                  <icon-tabler-wifi v-if="connectionQuality === 'good'" class="w-4 h-4" />
                  <icon-tabler-wifi-1 v-else-if="connectionQuality === 'warning'" class="w-4 h-4" />
                  <icon-tabler-wifi-0 v-else-if="connectionQuality === 'poor'" class="w-4 h-4" />
                  <icon-tabler-wifi-off v-else-if="connectionQuality === 'offline'" class="w-4 h-4" />
                  <icon-tabler-refresh v-else class="w-4 h-4 animate-spin" />
                  <span class="font-mono">{{ pingLatency > 0 ? pingLatency + 'ms' : connectionQuality === 'offline' ? 'Offline' : '...' }}</span>
                  <span class="hidden sm:inline">{{ getQualityLabel() }}</span>
                </div>
              </div>
              
              <!-- Timer (hidden for CFIT - CFIT uses per-subtest timer shown elsewhere) -->
              <div v-if="!isCfitTest" class="flex flex-col items-end">
                <div 
                  class="flex items-center gap-2 text-lg font-mono"
                  :class="{ 'text-error animate-pulse': remainingTime < 60 }"
                >
                  <IconClock class="w-5 h-5" />
                  <span>{{ formatTime(remainingTime) }}</span>
                </div>
                <div v-if="isSubtestProtectionEnabled && currentSubtest" class="text-xs text-base-content/60">
                  {{ getSubtestLabel(currentSubtest) }}
                </div>
              </div>
              
              <!-- Saving indicator -->
              <div v-if="saving" class="text-sm text-base-content/60">
                <span class="loading loading-spinner loading-xs"></span>
                Menyimpan...
              </div>
              
              <!-- Debug only: Random answer button (controlled by VITE_DEBUG) -->
              <button 
                v-if="isDebug"
                class="btn btn-warning btn-sm gap-1"
                @click="fillRandomAnswers(false)"
                :disabled="fillingRandom"
                title="Isi 90% jawaban secara acak (10% kosong untuk testing)"
              >
                <span v-if="fillingRandom" class="loading loading-spinner loading-xs"></span>
                <IconDice class="w-4 h-4" v-else />
                90%
              </button>
              <button 
                v-if="isDebug"
                class="btn btn-success btn-sm gap-1"
                @click="fillRandomAnswers(true)"
                :disabled="fillingRandom"
                title="Isi semua jawaban secara acak (100%)"
              >
                <span v-if="fillingRandom" class="loading loading-spinner loading-xs"></span>
                <IconCheck class="w-4 h-4" v-else />
                100%
              </button>
              
              <!-- Submit button (always visible) -->
              <button 
                class="btn btn-success btn-sm"
                @click="confirmSubmit"
              >
                Selesai
              </button>
            </div>
          </div>

          <!-- Progress -->
          <div v-if="session.testType?.config?.showProgress !== false" class="mt-4">
            <div class="flex justify-between text-sm mb-2">
              <span>Soal {{ getCurrentDisplayNumber() }} dari {{ actualQuestionCount }}</span>
              <span>{{ progress.answered }} dijawab</span>
            </div>
            <progress 
              class="progress progress-primary w-full" 
              :value="progress.answered" 
              :max="actualQuestionCount"
            ></progress>
          </div>
        </div>
      </div>

      <!-- Question Content -->
      <div class="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div v-if="currentQuestion" class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <!-- Question Number & Subtest Info (for CFIT) -->
            <div class="flex items-center gap-2 mb-4">
              <div class="badge badge-primary">
                {{ currentQuestion.type === 'example' ? 'Contoh' : `Soal ${isSubtestProtectionEnabled ? getSubtestQuestionNumber(currentQuestion) : getActualQuestionNumber(currentQuestion)}` }}
              </div>
              <div v-if="currentQuestion.subtest" class="badge badge-secondary badge-outline">
                {{ getSubtestLabel(currentQuestion.subtest) }}
              </div>
              <div v-if="currentQuestion.type === 'example'" class="badge badge-warning badge-outline">
                Latihan
              </div>
            </div>

            <!-- CFIT Image-based Question -->
            <template v-if="isCfitTest && currentQuestion.imagePath">
              <div class="flex flex-col items-center">
                <!-- Question Image -->
                <div class="w-full max-w-2xl mb-6">
                  <div v-if="!getCfitImageUrl(currentQuestion.imagePath)" class="flex items-center justify-center h-96 bg-base-200 rounded-lg">
                    <span class="loading loading-spinner loading-lg"></span>
                  </div>
                  <img 
                    v-else
                    :src="getCfitImageUrl(currentQuestion.imagePath)" 
                    :alt="`Soal ${currentQuestionIndex + 1}`"
                    class="w-full rounded-lg border border-base-300"
                    @error="onImageError"
                  />
                </div>

                <!-- CFIT Options (A-E) -->
                <div class="w-full">
                  <p class="text-center text-base-content/70 mb-4">Pilih jawaban yang tepat:</p>
                  <div class="flex flex-wrap justify-center gap-3">
                    <button 
                      v-for="option in currentQuestion.options" 
                      :key="option"
                      class="btn btn-lg min-w-16 text-xl font-bold"
                      :class="getAnswerValue(answers[getQuestionId(currentQuestion)]) === option ? 'btn-primary' : 'btn-outline'"
                      @click="selectAnswer(option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- Standard Question (PAPI, EPPS, etc.) -->
            <template v-else>
              <!-- Question Text -->
              <h2 class="text-xl mb-6 whitespace-pre-line">{{ getQuestionText(currentQuestion) }}</h2>

              <!-- Question Image (non-CFIT) -->
              <img 
                v-if="currentQuestion.imageUrl || currentQuestion.image" 
                :src="currentQuestion.imageUrl || currentQuestion.image" 
                alt="Question image"
                class="max-w-full rounded-lg mb-6"
              />

              <!-- Options -->
              <div class="space-y-3">
                <label 
                  v-for="(option, index) in getOptions(currentQuestion)" 
                  :key="index"
                  class="flex items-center gap-4 p-4 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                  :class="{ 
                    'ring-2 ring-primary bg-primary/10': getAnswerValue(answers[getQuestionId(currentQuestion)]) === option.value
                  }"
                >
                  <input 
                    type="radio" 
                    :name="`question-${getQuestionId(currentQuestion)}`"
                    :value="option.value"
                    :checked="getAnswerValue(answers[getQuestionId(currentQuestion)]) === option.value"
                    @change="selectAnswer(option.value)"
                    class="radio radio-primary"
                  />
                  <span class="flex-1">{{ option.text || option.label }}</span>
                </label>
              </div>
            </template>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-6">
          <button 
            v-if="session.testType?.config?.allowBack !== false && !isSubtestProtectionEnabled"
            class="btn btn-ghost"
            :disabled="currentQuestionIndex === 0"
            @click="prevQuestion"
          >
            <IconChevronLeft class="w-5 h-5" />
            Sebelumnya
          </button>
          <div v-else></div>
          
          <div class="flex gap-2">
            <button 
              v-if="canSubmitIncomplete && !isQuestionAnswered(currentQuestion)"
              class="btn btn-ghost"
              @click="skipQuestion"
            >
              Lewati
            </button>
            <button 
              v-if="currentQuestionIndex < questions.length - 1"
              class="btn btn-primary"
              @click="nextQuestion"
            >
              Selanjutnya
              <IconChevronRight class="w-5 h-5" />
            </button>
            <button 
              v-else
              class="btn btn-success"
              @click="confirmSubmit"
            >
              Selesai
              <IconCheck class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Question Navigator (exclude instruction pages for CFIT to show correct count) -->
      <div class="bg-base-100 shadow-lg border-t border-base-300">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center gap-2 overflow-x-auto pb-2">
            <template v-for="(q, index) in questions" :key="getQuestionId(q)">
              <!-- Hide instruction pages from navigator for cleaner display -->
              <button 
                v-if="q.type !== 'instruction'"
                class="btn btn-sm"
                :class="getQuestionButtonClass(q, index)"
                :disabled="isSubtestProtectionEnabled && !canNavigateToQuestion(index)"
                @click="goToQuestion(index)"
              >
                <span>{{ isSubtestProtectionEnabled ? getSubtestQuestionNumber(q) : getDisplayQuestionNumber(q) }}</span>
              </button>
            </template>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-4 mt-2 text-xs text-base-content/60 flex-wrap">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-primary"></span> Saat ini</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-success"></span> Dijawab</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded border border-base-300"></span> Belum dijawab</span>
            <span v-if="isCfitTest" class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-warning"></span> Contoh</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Subtest Transition Confirmation Modal -->
    <dialog ref="subtestTransitionModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <IconAlertTriangle class="w-6 h-6 text-warning" />
          Pindah ke Subtest Berikutnya?
        </h3>
        
        <div class="space-y-4">
          <div class="alert alert-warning">
            <IconAlertTriangle class="w-5 h-5" />
            <div>
              <p class="font-medium">Perhatian!</p>
              <p class="text-sm">Setelah lanjut ke subtest berikutnya, Anda <strong>tidak bisa kembali</strong> ke subtest sebelumnya.</p>
            </div>
          </div>

          <div v-if="pendingSubtestTransition" class="p-4 bg-base-200 rounded-lg">
            <p class="text-sm mb-2">Anda akan pindah dari:</p>
            <div class="flex items-center gap-3">
              <div class="flex-1 p-3 bg-base-300 rounded text-center">
                <p class="font-bold text-primary">{{ getSubtestLabel(pendingSubtestTransition.from) }}</p>
              </div>
              <IconChevronRight class="w-5 h-5" />
              <div class="flex-1 p-3 bg-primary/20 rounded text-center">
                <p class="font-bold text-primary">{{ getSubtestLabel(pendingSubtestTransition.to) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="cancelSubtestTransition">
            Tidak, Tetap di Sini
          </button>
          <button class="btn btn-primary" @click="confirmSubtestTransition">
            <IconCheck class="w-5 h-5" />
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </dialog>

    <!-- Submit Confirmation Modal -->
    <dialog ref="submitModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Selesaikan Tes?</h3>
        
        <div class="space-y-4">
          <div class="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
            <div class="text-4xl font-bold text-primary">{{ progress.answered }}</div>
            <div>
              <p class="font-medium">dari {{ actualQuestionCount }} soal</p>
              <p class="text-sm text-base-content/60">telah dijawab</p>
            </div>
          </div>

          <div v-if="unansweredQuestions.length > 0 && !canSubmitIncomplete" class="alert alert-error">
            <IconAlertTriangle class="w-5 h-5" />
            <div>
              <p class="font-medium">Tidak dapat menyelesaikan tes</p>
              <p class="text-sm">Masih ada {{ unansweredQuestions.length }} soal yang belum dijawab. Silakan jawab semua soal terlebih dahulu.</p>
            </div>
          </div>
          <div v-else-if="unansweredQuestions.length > 0" class="alert alert-warning">
            <IconAlertTriangle class="w-5 h-5" />
            <div>
              <p class="font-medium">Konfirmasi Pengiriman</p>
              <p class="text-sm">Ada {{ unansweredQuestions.length }} soal yang belum dijawab. Apakah Anda yakin ingin menyelesaikan tes?</p>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost">Kembali</button>
          </form>
          <button 
            class="btn btn-success" 
            @click="submitTest"
            :disabled="submitting || (unansweredQuestions.length > 0 && !canSubmitIncomplete)"
          >
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            <template v-if="unansweredQuestions.length > 0 && !canSubmitIncomplete">
              Jawab Semua Soal Dulu
            </template>
            <template v-else>
              Ya, Selesaikan
            </template>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAlertTriangle,
  IconClock,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconDice,
  IconListCheck,
  IconUser,
  IconInfoCircle,
  IconBulb
} from '@tabler/icons-vue'
import { usePsychologyPublic, useTestLogger } from '@/composables/psychology'
import { useConnectionMonitor } from '@/composables/core/useConnectionMonitor'
import { isDebug } from '@/utils/debug'

const route = useRoute()
const router = useRouter()

const {
  session,
  questions,
  answers,
  loading,
  error,
  saving,
  submitting,
  progress,
  unansweredQuestions,
  getQuestions,
  setAnswer,
  saveProgress,
  submitAnswers,
  startAutoSave,
  stopAutoSave,
  fetchImageWithAuth
} = usePsychologyPublic()

const {
  logError,
  logWarning,
  logInfo,
  logTimerState,
  logTestCompletion,
  logCriticalEvent,
  flushLogs,
  startAutoFlush,
  stopAutoFlush
} = useTestLogger()

const {
  connectionQuality,
  pingLatency,
  isOnline,
  startMonitoring,
  stopMonitoring,
  getQualityLabel,
  getQualityColor,
  getQualityIcon,
  getRecommendation,
  shouldShowWarning
} = useConnectionMonitor()

const submitModal = ref(null)
const subtestTransitionModal = ref(null)
const currentQuestionIndex = ref(0)
const remainingTime = ref(0)
const timerInterval = ref(null)
const fillingRandom = ref(false)
const cfitImageCache = ref({}) // Cache for loaded CFIT images
const showInstructions = ref(true) // Show instruction screen first
const showBiodataForm = ref(false) // Show biodata form after instructions
const visitedQuestionIndices = ref(new Set([0])) // Track visited questions for navigation control
const pendingSubtestTransition = ref(null) // Store pending subtest transition info
const currentSubtestCode = ref(null) // Track current active subtest code
const subtestTimers = ref({}) // Store remaining time for each subtest
const biodataForm = ref({ 
  age: null, 
  birthDate: '', 
  birthDateSource: null, // 'patient' | 'manual'
  calculatedAge: null 
})
const isAgeManuallyEdited = ref(false)
const testStarted = ref(false) // Track if test has actually started
const questionTimers = ref({}) // Track when each question is first displayed

const token = computed(() => route.params.token)
const sessionId = computed(() => route.params.sessionId)

const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

// Check if current test is CFIT
const isCfitTest = computed(() => {
  return session.value?.testType?.code === 'CFIT'
})

// Check if subtest protection is enabled
const isSubtestProtectionEnabled = computed(() => {
  return session.value?.testType?.config?.subtestProtection === true && isCfitTest.value
})

// Get current subtest from current question
const currentSubtest = computed(() => {
  return currentQuestion.value?.subtest || currentSubtestCode.value
})

// Get subtest config from scoringConfig.subtests
const getSubtestConfig = (subtestCode) => {
  // Try scoringConfig.subtests first (from API), then fallback to config.subtests
  return session.value?.testType?.scoringConfig?.subtests?.[subtestCode] 
    || session.value?.testType?.config?.subtests?.[subtestCode]
}

// Get actual question count (excluding instructions for CFIT)
const actualQuestionCount = computed(() => {
  if (isCfitTest.value) {
    // For CFIT, exclude instruction pages
    return questions.value.filter(q => q.type !== 'instruction' && q.type !== 'example').length
  }
  // For other tests, exclude only examples
  return questions.value.filter(q => q.type !== 'example').length
})

// Validate biodata form
const isBiodataValid = computed(() => {
  const config = session.value?.testType?.config
  if (config?.requiresAge && !biodataForm.value.age) return false
  if (config?.requiresBirthDate && !biodataForm.value.birthDate) return false
  return true
})

// Get CFIT image URL with authentication
const getCfitImageUrl = (imagePath) => {
  if (!imagePath) return ''
  
  // Return cached image if available
  if (cfitImageCache.value[imagePath]) {
    return cfitImageCache.value[imagePath]
  }
  
  // Load image with auth in background
  if (token.value) {
    fetchImageWithAuth(imagePath, token.value)
      .then(objectUrl => {
        cfitImageCache.value[imagePath] = objectUrl
        // Force reactivity update
        cfitImageCache.value = { ...cfitImageCache.value }
      })
      .catch(err => {
        console.error('Failed to load CFIT image:', err)
      })
  }
  
  return '' // Return empty while loading
}

// Handle image load error
const onImageError = (event) => {
  console.error('Failed to load image:', event.target.src)
  // Show error placeholder or keep broken image
  event.target.alt = 'Gagal memuat gambar'
  event.target.classList.add('opacity-50')
}

// Get subtest label for CFIT
const getSubtestLabel = (subtest) => {
  const labels = {
    series: 'Subtes 1: Series',
    classification: 'Subtes 2: Classification',
    matrices: 'Subtes 3: Matrices',
    topology: 'Subtes 4: Topology'
  }
  return labels[subtest] || subtest
}

// Get question number within its subtest (for subtest protection mode)
const getSubtestQuestionNumber = (question) => {
  if (!question || !question.subtest) return '-'
  if (question.type === 'example' || question.type === 'instruction') return '-'
  
  // Filter questions in the same subtest (excluding examples and instructions)
  const subtestQuestions = questions.value.filter(q => 
    q.subtest === question.subtest && 
    q.type !== 'example' && 
    q.type !== 'instruction'
  )
  
  // Find index within subtest
  const index = subtestQuestions.findIndex(q => getQuestionId(q) === getQuestionId(question))
  return index >= 0 ? index + 1 : '-'
}

// Check if can navigate to a specific question (for subtest protection)
const canNavigateToQuestion = (targetIndex) => {
  // For subtest protection mode
  if (isSubtestProtectionEnabled.value) {
    // Can always go to current question
    if (targetIndex === currentQuestionIndex.value) {
      return true
    }
    
    // Cannot go backwards
    if (targetIndex < currentQuestionIndex.value) {
      return false
    }
    
    // Can only go to next unvisited question sequentially
    return targetIndex === currentQuestionIndex.value + 1
  }
  
  // For non-subtest mode, check allowBack config
  if (session.value?.testType?.config?.allowBack === false) {
    // Can only navigate to current question or forward
    if (targetIndex === currentQuestionIndex.value) {
      return true
    }
    // Cannot go backwards when allowBack is false
    if (targetIndex < currentQuestionIndex.value) {
      return false
    }
    // Can go forward
    return true
  }
  
  // Default: can navigate anywhere
  return true
}

// Check if question is last in its subtest
const isLastQuestionOfSubtest = (question) => {
  if (!question || !question.subtest) return false
  if (question.type === 'example' || question.type === 'instruction') return false
  
  const currentIndex = questions.value.findIndex(q => getQuestionId(q) === getQuestionId(question))
  if (currentIndex === -1) return false
  
  // Check if next question is different subtest or end of questions
  if (currentIndex === questions.value.length - 1) return true
  
  const nextQuestion = questions.value[currentIndex + 1]
  // Next is instruction means new subtest starting
  if (nextQuestion.type === 'instruction') return true
  // Next is different subtest
  if (nextQuestion.subtest !== question.subtest) return true
  
  return false
}

// Confirm subtest transition
const confirmSubtestTransition = () => {
  if (pendingSubtestTransition.value) {
    currentQuestionIndex.value = pendingSubtestTransition.value.targetIndex
    visitedQuestionIndices.value.add(pendingSubtestTransition.value.targetIndex)
    pendingSubtestTransition.value = null
  }
  subtestTransitionModal.value?.close()
}

// Cancel subtest transition
const cancelSubtestTransition = () => {
  pendingSubtestTransition.value = null
  subtestTransitionModal.value?.close()
}

// Force move to next subtest when time expires
const forceNextSubtest = () => {
  stopTimer()
  
  const currentQ = currentQuestion.value
  if (!currentQ || !currentQ.subtest) {
    console.warn('⚠️ Cannot force next subtest: no current question or subtest')
    return
  }
  
  console.log(`⏰ Subtest ${currentQ.subtest} time expired! Moving to next subtest...`)
  
  // Log subtest transition
  logWarning(token.value, sessionId.value, 'subtest_time_expired', {
    subtest: currentQ.subtest,
    currentQuestionIndex: currentQuestionIndex.value,
    answeredInSubtest: Object.keys(answers.value || {}).filter(qId => {
      const q = questions.value.find(question => getQuestionId(question) === qId)
      return q?.subtest === currentQ.subtest
    }).length
  })
  
  // Find next question that belongs to a different subtest or is an instruction
  let nextIndex = currentQuestionIndex.value + 1
  let foundNextSubtest = false
  
  while (nextIndex < questions.value.length) {
    const nextQ = questions.value[nextIndex]
    
    // If we hit an instruction page or different subtest, stop here
    if (nextQ.type === 'instruction' || (nextQ.subtest && nextQ.subtest !== currentQ.subtest)) {
      foundNextSubtest = true
      break
    }
    
    nextIndex++
  }
  
  if (foundNextSubtest && nextIndex < questions.value.length) {
    // Move to next subtest
    currentQuestionIndex.value = nextIndex
    visitedQuestionIndices.value.add(nextIndex)
    
    const nextQ = questions.value[nextIndex]
    
    // If next is instruction, update current subtest code but DON'T start timer
    // Timer will be started when user clicks "Saya Mengerti" in continueFromInstruction()
    if (nextQ.type === 'instruction' && nextQ.subtest) {
      currentSubtestCode.value = nextQ.subtest
      
      // Log that we moved to instruction page after time expired
      logInfo(token.value, sessionId.value, 'forced_to_instruction', {
        previousSubtest: currentQ.subtest,
        nextSubtest: nextQ.subtest,
        note: 'Timer will start after instruction is completed'
      })
    } else if (nextQ.subtest) {
      currentSubtestCode.value = nextQ.subtest
      
      // Start timer for new subtest (only if not instruction)
      const subtestConfig = getSubtestConfig(nextQ.subtest)
      if (subtestConfig?.timeLimit) {
        if (!subtestTimers.value[nextQ.subtest]) {
          subtestTimers.value[nextQ.subtest] = subtestConfig.timeLimit
        }
        remainingTime.value = subtestTimers.value[nextQ.subtest]
        startTimer()
      }
    }
    
    console.log(`Time expired! Forced move to next subtest at index ${nextIndex}`)
  } else {
    // No more subtests, submit the test
    console.log('No more subtests, submitting test')
    forceSubmitTest()
  }
}

// Get actual question number (excluding examples and instructions for CFIT)
const getActualQuestionNumber = (question) => {
  if (!question) return '-'
  if (question.type === 'example') return '-'
  if (isCfitTest.value && question.type === 'instruction') return '-'
  
  // Count only non-example questions (and non-instruction for CFIT) up to current
  const questionsOnly = isCfitTest.value 
    ? questions.value.filter(q => q.type !== 'example' && q.type !== 'instruction')
    : questions.value.filter(q => q.type !== 'example')
  const index = questionsOnly.findIndex(q => getQuestionId(q) === getQuestionId(question))
  return index >= 0 ? index + 1 : '-'
}

// Get current display number for progress bar
const getCurrentDisplayNumber = () => {
  const question = currentQuestion.value
  if (!question) return 0
  
  // For instruction or example pages, return '-' or keep current
  if (question.type === 'instruction' || question.type === 'example') {
    return '-'
  }
  
  return getActualQuestionNumber(question)
}

// Get display question number for navigator
const getDisplayQuestionNumber = (question) => {
  if (isCfitTest.value && question.type === 'instruction') return 'I'
  if (question.type === 'example') return 'C' // C for Contoh
  
  // Count only actual questions (exclude instruction for CFIT, exclude example for all)
  const questionsOnly = isCfitTest.value 
    ? questions.value.filter(q => q.type !== 'example' && q.type !== 'instruction')
    : questions.value.filter(q => q.type !== 'example')
  const index = questionsOnly.findIndex(q => getQuestionId(q) === getQuestionId(question))
  return index + 1
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format time limit for instruction page
const formatTimeLimit = (seconds) => {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs > 0) {
    return `${minutes} menit ${secs} detik`
  }
  return `${minutes} menit`
}

// Continue from instruction page to first question (CFIT only)
const continueFromInstruction = () => {
  if (!isCfitTest.value) return
  
  // Move to next item (should be first question of subtest)
  currentQuestionIndex.value++
  visitedQuestionIndices.value.add(currentQuestionIndex.value)
  
  // If next item is a question, start/reset timer for this subtest
  if (currentQuestion.value && currentQuestion.value.type === 'question') {
    const subtestCode = currentQuestion.value.subtest
    currentSubtestCode.value = subtestCode
    
    // Get time limit from config.subtests
    const subtestConfig = getSubtestConfig(subtestCode)
    const timeLimit = subtestConfig?.timeLimit
    
    if (timeLimit) {
      // Check if we already have saved time for this subtest
      if (!subtestTimers.value[subtestCode]) {
        subtestTimers.value[subtestCode] = timeLimit
      }
      
      remainingTime.value = subtestTimers.value[subtestCode]
      
      console.log(`▶️ Starting subtest ${subtestCode}: ${remainingTime.value} seconds (${Math.floor(remainingTime.value / 60)}m ${remainingTime.value % 60}s)`)
      
      // Log instruction completion and timer start
      logInfo(token.value, sessionId.value, 'instruction_completed', {
        subtest: subtestCode,
        timerStarted: true,
        remainingTime: remainingTime.value,
        timeLimit: timeLimit
      })
      
      // Safety: Make sure timer is valid before starting
      if (remainingTime.value > 0) {
        // Start or restart timer
        stopTimer()
        startTimer()
      } else {
        console.error('⚠️ Cannot start timer: Invalid remainingTime for subtest', subtestCode)
        
        // Log error
        logError(token.value, sessionId.value, 'invalid_timer_start', {
          subtest: subtestCode,
          remainingTime: remainingTime.value,
          timeLimit: timeLimit
        }, 'Cannot start timer: Invalid remainingTime')
      }
    }
  }
}

// Calculate age from birthDate
const calculateAge = (birthDateString) => {
  if (!birthDateString) return null
  const birthDate = new Date(birthDateString)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Handle birthDate change - auto calculate age
const onBirthDateChange = () => {
  if (biodataForm.value.birthDate && session.value?.testType?.config?.requiresAge) {
    const calculatedAge = calculateAge(biodataForm.value.birthDate)
    biodataForm.value.calculatedAge = calculatedAge
    if (!isAgeManuallyEdited.value) {
      biodataForm.value.age = calculatedAge
    }
  }
}

// Populate biodata from session patient data
const populateBiodataFromSession = () => {
  const patient = session.value?.patient
  if (!patient) return

  // Auto-fill birthDate from patient data
  if (patient.birthDate || patient.dateOfBirth) {
    const birthDateValue = patient.birthDate || patient.dateOfBirth
    // Format to YYYY-MM-DD if needed
    const formattedDate = new Date(birthDateValue).toISOString().split('T')[0]
    biodataForm.value.birthDate = formattedDate
    biodataForm.value.birthDateSource = 'patient'
    
    // Auto-calculate age
    const calculatedAge = calculateAge(formattedDate)
    biodataForm.value.calculatedAge = calculatedAge
    if (session.value?.testType?.config?.requiresAge) {
      biodataForm.value.age = calculatedAge
    }
  }
  
  // If patient has age field directly
  if (patient.age && session.value?.testType?.config?.requiresAge) {
    biodataForm.value.age = patient.age
  }
}

const getOptions = (question) => {
  // Handle different option formats
  if (question.options && Array.isArray(question.options)) {
    // For CFIT, options are simple strings ['A', 'B', 'C', 'D', 'E']
    // Convert to standard format for non-CFIT handling
    if (isCfitTest.value) {
      return question.options.map(opt => ({ value: opt, text: opt }))
    }
    return question.options
  }
  // PAPI format with textA, textB (and scaleA, scaleB)
  if (question.textA && question.textB) {
    return [
      { value: 'A', text: question.textA, scale: question.scaleA },
      { value: 'B', text: question.textB, scale: question.scaleB }
    ]
  }
  // Alternative PAPI format with optionA, optionB
  if (question.optionA && question.optionB) {
    return [
      { value: 'A', text: question.optionA },
      { value: 'B', text: question.optionB }
    ]
  }
  // Alternative format with option_a, option_b
  if (question.option_a && question.option_b) {
    return [
      { value: 'A', text: question.option_a },
      { value: 'B', text: question.option_b }
    ]
  }
  return []
}

// Get question text from various possible field names
const getQuestionText = (question) => {
  // For PAPI-style questions, there's no main question text
  // The question is implied by choosing between A and B
  if (question.textA && question.textB) {
    return 'Pilih pernyataan yang paling menggambarkan diri Anda:'
  }
  return question.text || question.question || question.questionText || question.content || ''
}

// Get question ID from various possible field names
const getQuestionId = (question) => {
  return question.id || question._id || question.questionId
}

// Helper to get answer value from answer data (handles both old and new format)
const getAnswerValue = (answerData) => {
  if (!answerData) return null
  
  // Check if answerData is an object
  if (typeof answerData === 'object') {
    // New nested format: { answer: { answer: 'A', timestamp, duration }, timestamp, duration }
    if (answerData.answer !== undefined && answerData.answer !== null) {
      // If answer is an object, get answer.answer
      if (typeof answerData.answer === 'object' && answerData.answer.answer !== undefined) {
        return answerData.answer.answer
      }
      // If answer is a string/value, return it directly
      return answerData.answer
    }
  }
  
  // Old format: just the value 'A'
  return answerData
}

// Check if a question has been answered
const isQuestionAnswered = (question) => {
  if (!question) return false
  const questionId = getQuestionId(question)
  const answerData = answers.value[questionId]
  const answer = getAnswerValue(answerData)
  // Check if answer exists and is not null/undefined/empty string
  return answer !== undefined && answer !== null && answer !== ''
}

// Start test flow - handle instructions and biodata
const startTest = () => {
  const config = session.value?.testType?.config
  
  // Check if biodata is required
  if (config?.requiresAge || config?.requiresBirthDate) {
    showInstructions.value = false
    showBiodataForm.value = true
    // Populate biodata from session patient data
    populateBiodataFromSession()
  } else {
    // No biodata needed, start test directly
    showInstructions.value = false
    showBiodataForm.value = false
    testStarted.value = true
    
    // Initialize timer for first question
    if (questions.value.length > 0) {
      const firstQuestion = questions.value[0]
      const firstQuestionId = getQuestionId(firstQuestion)
      if (!questionTimers.value[firstQuestionId] && !answers.value[firstQuestionId]) {
        questionTimers.value[firstQuestionId] = Date.now()
      }
      
      // For CFIT with subtest protection, set initial subtest
      if (isSubtestProtectionEnabled.value && firstQuestion.subtest) {
        currentSubtestCode.value = firstQuestion.subtest
        // Get time limit from config
        const subtestConfig = getSubtestConfig(firstQuestion.subtest)
        if (subtestConfig?.timeLimit) {
          if (!subtestTimers.value[firstQuestion.subtest]) {
            subtestTimers.value[firstQuestion.subtest] = subtestConfig.timeLimit
          }
          remainingTime.value = subtestTimers.value[firstQuestion.subtest]
        }
      }
    }
    
    // Start timer if there's a time limit
    if (remainingTime.value > 0) {
      startTimer()
    }
  }
}

// Submit biodata and start test
const submitBiodata = () => {
  if (!isBiodataValid.value) return
  
  // TODO: Save biodata to session if needed
  // For now, just proceed to test
  showBiodataForm.value = false
  testStarted.value = true
  
  // Initialize timer for first question
  if (questions.value.length > 0) {
    const firstQuestion = questions.value[0]
    const firstQuestionId = getQuestionId(firstQuestion)
    if (!questionTimers.value[firstQuestionId] && !answers.value[firstQuestionId]) {
      questionTimers.value[firstQuestionId] = Date.now()
    }
    
    // For CFIT with subtest protection, set initial subtest
    if (isSubtestProtectionEnabled.value && firstQuestion.subtest) {
      currentSubtestCode.value = firstQuestion.subtest
      // Get time limit from config
      const subtestConfig = getSubtestConfig(firstQuestion.subtest)
      if (subtestConfig?.timeLimit) {
        if (!subtestTimers.value[firstQuestion.subtest]) {
          subtestTimers.value[firstQuestion.subtest] = subtestConfig.timeLimit
        }
        remainingTime.value = subtestTimers.value[firstQuestion.subtest]
      }
    }
  }
  
  // Start timer if there's a time limit
  if (remainingTime.value > 0) {
    startTimer()
  }
}

// Skip current question (if allowSkip enabled)
const skipQuestion = () => {
  if (canSubmitIncomplete.value) {
    // Just move to next without answering
    nextQuestion()
  }
}

const loadQuestions = async () => {
  try {
    console.log('📥 Loading questions for session:', sessionId.value)
    const response = await getQuestions(token.value, sessionId.value)
    
    const hasAnswers = Object.keys(answers.value || {}).length
    
    // Restore subtest timers from metadata if available
    if (response.metadata?.subtestTimers) {
      subtestTimers.value = response.metadata.subtestTimers
      console.log('✅ Restored subtest timers from backend:', subtestTimers.value)
    }
    if (response.metadata?.currentSubtest) {
      currentSubtestCode.value = response.metadata.currentSubtest
      console.log('✅ Restored current subtest:', currentSubtestCode.value)
    }
    if (response.metadata?.currentQuestionIndex !== undefined) {
      currentQuestionIndex.value = response.metadata.currentQuestionIndex
      console.log('✅ Restored question index:', currentQuestionIndex.value)
    }
    
    console.log('✅ Questions loaded:', {
      total: questions.value.length,
      hasAnswers,
      testType: session.value?.testType?.code,
      restoredMetadata: !!response.metadata
    })
    
    // Log session state
    logInfo(token.value, sessionId.value, 'session_loaded', {
      totalQuestions: questions.value.length,
      savedAnswers: hasAnswers,
      testType: session.value?.testType?.code,
      isResume: hasAnswers > 0
    })
    
    // Randomize questions if config enabled
    if (session.value?.testType?.config?.randomizeQuestions && questions.value.length > 0) {
      // Shuffle array using Fisher-Yates algorithm
      const shuffled = [...questions.value]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      questions.value = shuffled
    }
    
    // Initialize timers for unanswered questions only
    if (answers.value && Object.keys(answers.value).length > 0) {
      // For resumed tests, don't reset timers for already answered questions
      const timers = {}
      questions.value.forEach(q => {
        const qId = getQuestionId(q)
        if (!answers.value[qId]) {
          // Only initialize timer if question not yet answered
          timers[qId] = null
        }
      })
      questionTimers.value = timers
    }
    
    if (session.value) {
      // For subtest protection mode (CFIT), don't calculate global time
      // Timer will be set per subtest
      if (!isSubtestProtectionEnabled.value) {
        // Calculate remaining time for non-subtest tests
        const startedAt = new Date(session.value.startedAt || Date.now())
        // Priority: config.timeLimit > estimatedDuration > fallback 60
        const duration = session.value.testType?.config?.timeLimit || session.value.testType?.estimatedDuration || 60
        const endTime = new Date(startedAt.getTime() + duration * 60 * 1000)
        const calculatedTime = Math.floor((endTime - new Date()) / 1000)
        
        // Store calculated time but don't start timer yet (wait for user to start test)
        if (calculatedTime > 0) {
          remainingTime.value = calculatedTime
        } else {
          remainingTime.value = 0
          console.warn('Test time already expired')
        }
      } else {
        // For subtest mode, detect current question's subtest and initialize timer
        // This handles resume session case
        const currentQ = questions.value[currentQuestionIndex.value]
        if (currentQ && currentQ.subtest && currentQ.type !== 'instruction') {
          currentSubtestCode.value = currentQ.subtest
          const subtestConfig = getSubtestConfig(currentQ.subtest)
          if (subtestConfig?.timeLimit) {
            if (!subtestTimers.value[currentQ.subtest]) {
              subtestTimers.value[currentQ.subtest] = subtestConfig.timeLimit
            }
            remainingTime.value = subtestTimers.value[currentQ.subtest]
            
            if (import.meta.env.DEV) {
              console.log(`Resume session: Subtest ${currentQ.subtest}, timer: ${remainingTime.value}s`)
            }
          }
        } else {
          remainingTime.value = 0
        }
      }
      
      // Check if should show instructions
      const config = session.value.testType?.config
      const hasAnswers = answers.value && Object.keys(answers.value).length > 0
      
      // If has answers, it means resuming a session - skip instructions
      if (hasAnswers) {
        showInstructions.value = false
        testStarted.value = true
        
        // Start timer for resumed session (but not for CFIT with subtest protection)
        // CFIT timer will start when user continues from instruction
        if (remainingTime.value > 0 && !isSubtestProtectionEnabled.value) {
          startTimer()
        } else if (remainingTime.value > 0 && isSubtestProtectionEnabled.value) {
          console.log('⏸️ CFIT resumed: Timer NOT auto-started. Will start when user navigates.')
          
          // Log resume state
          logInfo(token.value, sessionId.value, 'cfit_resumed_no_autostart', {
            remainingTime: remainingTime.value,
            currentSubtest: currentSubtestCode.value,
            currentQuestionIndex: currentQuestionIndex.value,
            savedAnswers: Object.keys(answers.value || {}).length
          })
        }
      } else if (config?.instructionText || config?.requiresAge || config?.requiresBirthDate) {
        // First time, show instructions
        showInstructions.value = true
        testStarted.value = false
      } else {
        // No instructions needed, start test immediately
        showInstructions.value = false
        testStarted.value = true
        
        // Initialize first question for non-subtest mode
        if (!isSubtestProtectionEnabled.value && questions.value.length > 0) {
          const firstQuestion = questions.value[0]
          const firstQuestionId = getQuestionId(firstQuestion)
          if (!questionTimers.value[firstQuestionId] && !answers.value[firstQuestionId]) {
            questionTimers.value[firstQuestionId] = Date.now()
          }
        }
        
        if (remainingTime.value > 0) {
          startTimer()
        }
      }
      
      // Start auto-save every 30 seconds (only when test started)
      if (testStarted.value) {
        startAutoSave(
          token.value, 
          sessionId.value, 
          30000, 
          // Error callback (after all retries failed)
          (err, attempts) => {
            logWarning(token.value, sessionId.value, 'autosave_error', {
              error: err.message,
              answeredCount: progress.value?.answered || 0,
              attempts: attempts,
              maxRetries: 3
            }, 'Auto-save failed after retries')
          },
          // Success callback
          (data, attempts) => {
            // Only log if it succeeded after retry
            if (attempts > 0) {
              logInfo(token.value, sessionId.value, 'autosave_recovered', {
                answeredCount: progress.value?.answered || 0,
                attempts: attempts + 1 // Total attempts including the successful one
              }, `Auto-save succeeded after ${attempts + 1} attempt(s)`)
            }
          },
          // Metadata callback - returns current state to persist
          () => ({
            subtestTimers: subtestTimers.value,
            currentSubtest: currentSubtestCode.value,
            currentQuestionIndex: currentQuestionIndex.value
          })
        )
      }
    }
  } catch (err) {
    console.error('Failed to load questions:', err)
    
    // Log critical error when loading questions fails
    logError(token.value, sessionId.value, 'load_questions_error', {
      error: err.message,
      errorStack: err.stack,
      sessionId: sessionId.value,
      token: token.value ? 'present' : 'missing'
    }, `Failed to load questions: ${err.message}`)
    
    error.value = 'Gagal memuat soal test. Silakan refresh halaman atau hubungi administrator.'
  }
}

const startTimer = () => {
  // Start auto-save and auto-flush logs when timer starts
  startAutoSave(
    token.value, 
    sessionId.value, 
    30000, 
    // Error callback (after all retries failed)
    (err, attempts) => {
      logWarning(token.value, sessionId.value, 'autosave_error', {
        error: err.message,
        answeredCount: progress.value?.answered || 0,
        attempts: attempts,
        maxRetries: 3
      }, 'Auto-save failed during test')
    },
    // Success callback
    (data, attempts) => {
      // Only log if it succeeded after retry
      if (attempts > 0) {
        logInfo(token.value, sessionId.value, 'autosave_recovered', {
          answeredCount: progress.value?.answered || 0,
          attempts: attempts + 1
        }, `Auto-save recovered after ${attempts + 1} attempt(s)`)
      }
    },
    // Metadata callback - returns current state to persist
    () => ({
      subtestTimers: subtestTimers.value,
      currentSubtest: currentSubtestCode.value,
      currentQuestionIndex: currentQuestionIndex.value
    })
  )
  startAutoFlush(token.value, sessionId.value)
  
  if (remainingTime.value <= 0) {
    console.warn('⚠️ Cannot start timer: remainingTime is 0 or negative')
    
    // Log warning
    logWarning(token.value, sessionId.value, 'timer_invalid', {
      remainingTime: remainingTime.value,
      testType: session.value?.testType?.code,
      currentSubtest: currentSubtestCode.value
    })
    
    return // No timer if no time limit
  }
  
  // Safety check: Don't start timer if already running
  if (timerInterval.value) {
    console.warn('⚠️ Timer already running, skipping startTimer()')
    
    logWarning(token.value, sessionId.value, 'timer_already_running', {
      remainingTime: remainingTime.value,
      testType: session.value?.testType?.code
    })
    
    return
  }
  
  console.log(`⏱️ Starting timer: ${remainingTime.value} seconds`)
  
  // Log timer start
  logTimerState(token.value, sessionId.value, 'started', {
    remainingTime: remainingTime.value,
    testType: session.value?.testType?.code,
    currentSubtest: currentSubtestCode.value,
    currentQuestionIndex: currentQuestionIndex.value
  })
  
  timerInterval.value = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
      
      // Update subtest timer if subtest protection enabled
      if (isSubtestProtectionEnabled.value && currentSubtestCode.value) {
        subtestTimers.value[currentSubtestCode.value] = remainingTime.value
      }
      
      // When timer reaches 0
      if (remainingTime.value === 0) {
        // For subtest protection mode, force move to next subtest
        if (isSubtestProtectionEnabled.value && currentSubtest.value) {
          forceNextSubtest()
        } else if (session.value?.testType?.config?.autoSubmitOnTimeout !== false) {
          // For non-subtest mode, force submit entire test
          forceSubmitTest()
        } else {
          // Just stop timer and show warning
          stopTimer()
          console.warn('Time expired but autoSubmitOnTimeout is disabled')
        }
      }
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    const currentQ = currentQuestion.value
    const nextIndex = currentQuestionIndex.value + 1
    const nextQ = questions.value[nextIndex]
    
    // Check if subtest protection is enabled and this is crossing subtest boundary
    if (isSubtestProtectionEnabled.value && 
        currentQ && nextQ && 
        currentQ.subtest && nextQ.subtest &&
        currentQ.subtest !== nextQ.subtest &&
        currentQ.type !== 'instruction' && currentQ.type !== 'example') {
      
      // Show confirmation modal
      pendingSubtestTransition.value = {
        from: currentQ.subtest,
        to: nextQ.subtest,
        targetIndex: nextIndex
      }
      subtestTransitionModal.value?.showModal()
    } else {
      // Normal navigation
      currentQuestionIndex.value++
      visitedQuestionIndices.value.add(currentQuestionIndex.value)
    }
  }
}

const goToQuestion = (index) => {
  // Check if navigation is allowed with subtest protection
  if (isSubtestProtectionEnabled.value && !canNavigateToQuestion(index)) {
    return // Prevent navigation
  }
  
  currentQuestionIndex.value = index
  visitedQuestionIndices.value.add(index)
}

// Watch currentQuestionIndex to start timer for each question
watch(currentQuestionIndex, (newIndex, oldIndex) => {
  const question = questions.value[newIndex]
  if (question) {
    const questionId = getQuestionId(question)
    // Start timer only if not already started and question not yet answered
    if (!questionTimers.value[questionId] && !answers.value[questionId]) {
      questionTimers.value[questionId] = Date.now()
    }
    // Track visited question index
    visitedQuestionIndices.value.add(newIndex)
    
    // 🔴 CRITICAL FIX: Stop timer when entering instruction page
    // This prevents the timer from the previous subtest from continuing to run
    // while the participant is reading the instructions for the next subtest
    if (isSubtestProtectionEnabled.value && question.type === 'instruction') {
      stopTimer()
      console.log('⏸️ Timer stopped: Entering instruction page for', question.subtest)
      
      // Log instruction page entry
      logInfo(token.value, sessionId.value, 'instruction_page_entered', {
        subtest: question.subtest,
        previousSubtest: currentSubtestCode.value,
        timerStopped: true
      })
      
      return // Exit early, don't process subtest change logic
    }
    
    // Handle subtest change for subtest protection mode
    if (isSubtestProtectionEnabled.value && question.subtest) {
      const oldQuestion = questions.value[oldIndex]
      const oldSubtest = oldQuestion?.subtest
      const newSubtest = question.subtest
      
      // If subtest changed and not an instruction page
      if (newSubtest !== oldSubtest && question.type !== 'instruction' && newSubtest !== currentSubtestCode.value) {
        currentSubtestCode.value = newSubtest
        
        // Start new subtest timer
        const subtestConfig = getSubtestConfig(newSubtest)
        if (subtestConfig?.timeLimit) {
          // Use saved time or start fresh
          if (!subtestTimers.value[newSubtest]) {
            subtestTimers.value[newSubtest] = subtestConfig.timeLimit
          }
          remainingTime.value = subtestTimers.value[newSubtest]
          
          // Restart timer
          stopTimer()
          startTimer()
          
          if (import.meta.env.DEV) {
            console.log(`Subtest changed to ${newSubtest}, timer: ${remainingTime.value}s`)
          }
        }
      }
    }
  }
})

const selectAnswer = (value) => {
  if (currentQuestion.value) {
    const questionId = getQuestionId(currentQuestion.value)
    
    // Calculate duration for this question
    const startTime = questionTimers.value[questionId]
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
    
    // Store answer with metadata
    const answerData = {
      answer: value,
      timestamp: new Date().toISOString(),
      duration: duration
    }
    
    setAnswer(questionId, answerData)
    
    // Log answer submission periodically (every 5 answers or at milestones)
    // This reduces server load while still providing progress tracking
    const answeredCount = progress.value?.answered || 0
    const isMultipleOfFive = answeredCount % 5 === 0
    const isMilestone = answeredCount === 10 || answeredCount === 25 || answeredCount === 50
    
    if (isMultipleOfFive || isMilestone) {
      logInfo(token.value, sessionId.value, 'answer_progress', {
        testType: session.value?.testType?.code,
        currentSubtest: currentSubtest.value,
        remainingTime: remainingTime.value,
        answeredCount: answeredCount,
        totalQuestions: actualQuestionCount.value
      })
    }
    
    // Auto-advance if configured (except for last question)
    if (session.value?.testType?.config?.autoAdvance && currentQuestionIndex.value < questions.value.length - 1) {
      setTimeout(() => {
        nextQuestion() // Will handle subtest transition check internally
      }, 300)
    }
  }
}

// Get question button class for navigator
const getQuestionButtonClass = (question, index) => {
  const questionId = getQuestionId(question)
  const isCurrentQuestion = index === currentQuestionIndex.value
  const answerData = answers.value?.[questionId]
  
  // Check if answered - handle both formats:
  // New format: { answer: { answer: 'A', timestamp, duration }, timestamp, duration }
  // Or: { answer: 'A', timestamp, duration }
  let isAnswered = false
  if (answerData) {
    if (answerData.answer !== undefined && answerData.answer !== null) {
      // Check nested answer.answer or direct answer
      const actualAnswer = typeof answerData.answer === 'object' ? answerData.answer.answer : answerData.answer
      isAnswered = actualAnswer !== undefined && actualAnswer !== null && actualAnswer !== ''
    }
  }
  
  const isInstruction = isCfitTest.value && question.type === 'instruction'
  const isExample = question.type === 'example'
  
  if (isInstruction) {
    return isCurrentQuestion ? 'btn-info' : 'btn-outline btn-info'
  }
  
  if (isExample) {
    return isCurrentQuestion ? 'btn-warning' : 'btn-outline btn-warning'
  }
  
  if (isCurrentQuestion) {
    return 'btn-primary'
  }
  
  if (isAnswered) {
    return 'btn-success'
  }
  
  return 'btn-outline'
}

// Dev only: Fill questions with random answers
// fillAll = true: 100% filled, fillAll = false: 90% filled (10% empty for testing)
const fillRandomAnswers = async (fillAll = false) => {
  if (!isDebug) return
  
  fillingRandom.value = true
  try {
    for (const question of questions.value) {
      const options = getOptions(question)
      if (options.length > 0) {
        // fillAll=true: always answer, fillAll=false: 90% chance to answer
        if (fillAll || Math.random() < 0.90) {
          const randomOption = options[Math.floor(Math.random() * options.length)]
          setAnswer(getQuestionId(question), randomOption.value)
        }
        // else: skip this question (leave unanswered)
      }
    }
    // Save progress after filling with metadata
    await saveProgress(
      token.value, 
      sessionId.value,
      null,
      null,
      {
        subtestTimers: subtestTimers.value,
        currentSubtest: currentSubtestCode.value,
        currentQuestionIndex: currentQuestionIndex.value
      }
    )
  } finally {
    fillingRandom.value = false
  }
}

const confirmSubmit = () => {
  submitModal.value?.showModal()
}

// Computed untuk check apakah bisa submit dengan jawaban tidak lengkap
const canSubmitIncomplete = computed(() => {
  // Fallback: Jika config tidak ada, default allow skip = true
  return session.value?.testType?.config?.allowSkip ?? true
})

const submitTest = async () => {
  try {
    stopTimer()
    stopAutoSave()
    
    // Save final state before submit
    await saveProgress(
      token.value, 
      sessionId.value, 
      null, 
      null,
      {
        subtestTimers: subtestTimers.value,
        currentSubtest: currentSubtestCode.value,
        currentQuestionIndex: currentQuestionIndex.value
      }
    )
    
    // Log normal completion
    await logTestCompletion(token.value, sessionId.value, 'normal', {
      answeredCount: progress.value.answered,
      unansweredCount: unansweredQuestions.value.length,
      totalQuestions: questions.value.length,
      testType: session.value?.testType?.code,
      remainingTime: remainingTime.value
    })
    
    await submitAnswers(token.value, sessionId.value)
    submitModal.value?.close()
    router.push(`/psychology/public/access/${token.value}`)
  } catch (err) {
    console.error('Submit error:', err)
    
    // Log submit error with retry info
    await logCriticalEvent(token.value, sessionId.value, 'submit_error', {
      error: err.message,
      errorStack: err.stack,
      answeredCount: progress.value.answered,
      unansweredCount: unansweredQuestions.value.length,
      testType: session.value?.testType?.code,
      remainingTime: remainingTime.value,
      maxRetries: 3,
      message: 'Failed to submit test after retries'
    }, `Submit failed: ${err.message}`)
    
    // Show error to user with retry option
    error.value = 'Gagal mengirim jawaban setelah beberapa percobaan. Silakan periksa koneksi internet Anda.'
    
    // Don't close modal - give user chance to retry
  }
}

// Force submit when time runs out (bypasses validation)
const forceSubmitTest = async () => {
  try {
    stopTimer()
    stopAutoSave()
    
    // Show notification that time is up
    const unansweredCount = unansweredQuestions.value.length
    const answeredCount = progress.value.answered
    
    // Safety check: Don't force submit if user hasn't answered anything
    // This prevents accidental submit when timer miscalculated
    if (answeredCount === 0 && questions.value.length > 5) {
      console.error('⚠️ PREVENTED FORCE SUBMIT: No answers recorded. Timer may have miscalculated.')
      error.value = 'Waktu test telah habis, namun tidak ada jawaban yang tercatat. Silakan hubungi administrator.'
      
      // Log critical event
      await logCriticalEvent(token.value, sessionId.value, 'force_submit_prevented', {
        reason: 'no_answers_recorded',
        totalQuestions: questions.value.length,
        answeredCount,
        remainingTime: remainingTime.value,
        testType: session.value?.testType?.code,
        currentQuestionIndex: currentQuestionIndex.value
      })
      
      return
    }
    
    console.warn(`⏰ Time expired! Submitting test with ${answeredCount} answered, ${unansweredCount} unanswered questions`)
    
    // Try to save final state before submit
    try {
      await saveProgress(
        token.value,
        sessionId.value,
        null,
        null,
        {
          subtestTimers: subtestTimers.value,
          currentSubtest: currentSubtestCode.value,
          currentQuestionIndex: currentQuestionIndex.value,
          forceSubmitPending: true
        }
      )
    } catch (saveErr) {
      console.warn('Could not save final state before force submit:', saveErr.message)
    }
    
    // Log force submit
    await logTestCompletion(token.value, sessionId.value, 'force', {
      answeredCount,
      unansweredCount,
      totalQuestions: questions.value.length,
      testType: session.value?.testType?.code,
      currentQuestionIndex: currentQuestionIndex.value,
      reason: 'time_expired'
    })
    
    await submitAnswers(token.value, sessionId.value)
    router.push(`/psychology/public/access/${token.value}`)
  } catch (err) {
    console.error('Force submit error:', err)
    
    // Log force submit error with full context and retry info
    await logError(token.value, sessionId.value, 'force_submit_error', {
      error: err.message,
      errorStack: err.stack,
      answeredCount: progress.value.answered,
      unansweredCount: unansweredQuestions.value.length,
      totalQuestions: questions.value.length,
      testType: session.value?.testType?.code,
      currentQuestionIndex: currentQuestionIndex.value,
      remainingTime: remainingTime.value,
      maxRetries: 3,
      message: 'Force submit failed after retries'
    }, `Force submit failed: ${err.message}`)
    
    // Show error with instruction to reload or contact admin
    error.value = 'Waktu habis dan terjadi kesalahan saat mengirim jawaban. Jawaban Anda telah disimpan. Silakan refresh halaman untuk mencoba mengirim ulang, atau hubungi administrator jika masalah berlanjut.'
  }
}

const goBack = () => {
  router.push(`/psychology/public/access/${token.value}`)
}

onMounted(() => {
  loadQuestions()
  
  // Start connection monitoring (check every 10 seconds)
  startMonitoring(10000)
})

// Watch for connection quality changes and log them
watch(connectionQuality, (newQuality, oldQuality) => {
  if (oldQuality && newQuality !== oldQuality) {
    const logLevel = newQuality === 'poor' || newQuality === 'offline' ? 'warning' : 'info'
    const logFn = logLevel === 'warning' ? logWarning : logInfo
    
    logFn(token.value, sessionId.value, 'connection_quality_changed', {
      from: oldQuality,
      to: newQuality,
      latency: pingLatency.value,
      isOnline: isOnline.value
    }, `Connection quality changed: ${oldQuality} → ${newQuality}`)
  }
})

onUnmounted(() => {
  stopTimer()
  stopAutoSave()
  
  // Flush remaining logs before unmount
  flushLogs(token.value, sessionId.value)
  stopAutoFlush()
  
  // Stop connection monitoring
  stopMonitoring()
  
  // Cleanup CFIT image object URLs
  Object.values(cfitImageCache.value).forEach(url => {
    if (url) URL.revokeObjectURL(url)
  })
  cfitImageCache.value = {}
})
</script>
