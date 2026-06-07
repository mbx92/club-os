<route lang="yaml">
meta:
  title: Edit Psikogram
  layout: default
  requiresModule: psychology
</route>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Loading -->
    <div v-if="loadingData" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <template v-else-if="form.id">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-2xl font-bold">Edit Psikogram</h1>
          <p class="text-base-content/60">{{ form.participant.name }}</p>
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
              <!-- Nama -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Nama</span>
                </label>
                <input
                  v-model="form.participant.name"
                  type="text"
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
                  class="input input-bordered w-full"
                />
              </div>
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

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Kesimpulan</span>
                </label>
                <textarea
                  v-model="form.sections.kecerdasan.conclusion"
                  class="textarea textarea-bordered w-full"
                  rows="3"
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

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Kesimpulan</span>
                </label>
                <textarea
                  v-model="form.sections.sikapKerja.conclusion"
                  class="textarea textarea-bordered w-full"
                  rows="3"
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

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Kesimpulan</span>
                </label>
                <textarea
                  v-model="form.sections.kepribadian.conclusion"
                  class="textarea textarea-bordered w-full"
                  rows="3"
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

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Kesimpulan</span>
                </label>
                <textarea
                  v-model="form.sections.kemampuanBelajar.conclusion"
                  class="textarea textarea-bordered w-full"
                  rows="3"
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
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <p class="text-base-content/60">Psikogram tidak ditemukan</p>
      <button class="btn btn-primary btn-sm mt-4" @click="goBack">
        Kembali
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  IconFileOff
} from '@tabler/icons-vue'
import { usePsikogram } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'
import AspekItem from '@/components/psychology/psikogram/AspekItem.vue'

const route = useRoute()
const router = useRouter()
const { getPsikogramById, updatePsikogram } = usePsikogram()
const { showSuccess, showError } = useNotification()

const loadingData = ref(true)
const saving = ref(false)

const form = reactive({
  id: '',
  patientId: '',
  sessionId: '',
  examDate: '',
  participant: {
    name: '',
    birthDate: '',
    education: '',
    corporate: ''
  },
  sections: {
    kecerdasan: { items: [], conclusion: '' },
    sikapKerja: { items: [], conclusion: '' },
    kepribadian: { items: [], conclusion: '' },
    kemampuanBelajar: { items: [], conclusion: '' }
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

const goBack = () => {
  router.push('/psychology/psikogram')
}

const loadPsikogram = async () => {
  loadingData.value = true
  const id = route.params.id
  
  try {
    const data = await getPsikogramById(id)
    
    if (data) {
      form.id = data.id
      form.patientId = data.patientId || ''
      form.sessionId = data.sessionId || ''
      form.examDate = data.examDate ? data.examDate.split('T')[0] : ''
      form.participant = {
        name: data.participant?.name || '',
        birthDate: data.participant?.birthDate ? data.participant.birthDate.split('T')[0] : '',
        education: data.participant?.education || '',
        corporate: data.participant?.corporate || ''
      }
      form.sections = data.sections || {
        kecerdasan: { items: [], conclusion: '' },
        sikapKerja: { items: [], conclusion: '' },
        kepribadian: { items: [], conclusion: '' },
        kemampuanBelajar: { items: [], conclusion: '' }
      }
      form.recommendation = data.recommendation || ''
      form.status = data.status || 'draft'
    }
  } catch (error) {
    console.error('Error loading psikogram:', error)
  } finally {
    loadingData.value = false
  }
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
    const payload = {
      patientId: form.patientId || undefined,
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
    
    await updatePsikogram(form.id, payload)
    showSuccess('Psikogram berhasil disimpan')
    router.push('/psychology/psikogram')
  } catch (error) {
    console.error('Error saving psikogram:', error)
    showError('Gagal menyimpan psikogram')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPsikogram()
})
</script>
