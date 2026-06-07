<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ testType ? 'Edit Jenis Tes' : 'Tambah Jenis Tes' }}
      </h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Row 1: Nama Tes & Kode -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Nama Tes <span class="text-error">*</span></span>
              </label>
              <input 
                type="text" 
                v-model="form.name" 
                class="input input-bordered w-full"
                :class="{ 'input-error': errors.name }"
                placeholder="Masukkan nama tes"
                required
              />
              <label v-if="errors.name" class="label">
                <span class="label-text-alt text-error">{{ errors.name }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kode <span class="text-error">*</span></span>
              </label>
              <input 
                type="text" 
                v-model="form.code" 
                class="input input-bordered w-full"
                :class="{ 'input-error': errors.code }"
                placeholder="Contoh: MMPI, DISC, MBTI"
                required
              />
              <label v-if="errors.code" class="label">
                <span class="label-text-alt text-error">{{ errors.code }}</span>
              </label>
            </div>
          </div>

          <!-- Row 2: Kategori & Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kategori</span>
              </label>
              <select v-model="form.category" class="select select-bordered w-full">
                <option value="">Pilih Kategori</option>
                <option value="Kepribadian">Kepribadian</option>
                <option value="Inteligensi">Inteligensi</option>
                <option value="Minat Bakat">Minat Bakat</option>
                <option value="Kesehatan Mental">Kesehatan Mental</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Status</span>
              </label>
              <label class="label cursor-pointer justify-start gap-3 border border-base-300 rounded-lg px-4 h-12">
                <input 
                  type="checkbox" 
                  v-model="form.isActive" 
                  class="checkbox checkbox-primary" 
                />
                <span class="label-text">{{ form.isActive ? 'Aktif' : 'Non-aktif' }}</span>
              </label>
            </div>
          </div>

          <!-- Row 3: Durasi, Jumlah Soal & Harga -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Durasi (menit) <span class="text-error">*</span></span>
              </label>
              <input 
                type="number" 
                v-model.number="form.durationMinutes" 
                class="input input-bordered w-full"
                :class="{ 'input-error': errors.durationMinutes }"
                min="1"
                placeholder="60"
                required
              />
              <label v-if="errors.durationMinutes" class="label">
                <span class="label-text-alt text-error">{{ errors.durationMinutes }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Jumlah Soal <span class="text-error">*</span></span>
              </label>
              <input 
                type="number" 
                v-model.number="form.questionCount" 
                class="input input-bordered w-full"
                :class="{ 'input-error': errors.questionCount }"
                min="1"
                placeholder="100"
                required
              />
              <label v-if="errors.questionCount" class="label">
                <span class="label-text-alt text-error">{{ errors.questionCount }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Harga Dasar</span>
              </label>
              <CurrencyInput
                v-model="form.basePrice"
                :min="0"
                placeholder="0"
                input-class="input input-bordered w-full"
              />
            </div>
          </div>

          <!-- Deskripsi -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Deskripsi</span>
            </label>
            <textarea 
              v-model="form.description" 
              class="textarea textarea-bordered w-full"
              rows="2"
              placeholder="Deskripsi singkat tentang jenis tes ini"
            ></textarea>
          </div>

          <!-- Instruksi -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Instruksi</span>
            </label>
            <textarea 
              v-model="form.instructions" 
              class="textarea textarea-bordered w-full"
              rows="2"
              placeholder="Instruksi untuk peserta tes"
            ></textarea>
          </div>

          <!-- Questions JSON -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Data Soal (JSON) <span class="text-error">*</span></span>
            </label>
            <textarea 
              v-model="questionsJson" 
              class="textarea textarea-bordered w-full font-mono text-sm"
              :class="{ 'textarea-error': errors.questions || jsonError }"
              rows="6"
              placeholder='[{"question": "Pertanyaan 1", "options": ["A", "B", "C", "D"], "answer": "A"}, ...]'
            ></textarea>
            <label class="label">
              <span v-if="errors.questions || jsonError" class="label-text-alt text-error">
                {{ errors.questions || jsonError }}
              </span>
              <span v-else class="label-text-alt text-base-content/60">
                Paste array JSON berisi data soal. Jumlah: {{ parsedQuestionsCount }}
              </span>
            </label>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="close">Batal</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="loading loading-spinner loading-sm"></span>
            {{ testType ? 'Simpan Perubahan' : 'Tambah Jenis Tes' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useTestTypes } from '@/composables/psychology'
import { useNotification } from '@/composables/core/useNotification'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'

const props = defineProps({
  testType: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['saved'])

const { createTestType, updateTestType, validateTestType } = useTestTypes()
const { showSuccess, showError } = useNotification()

const modalRef = ref(null)
const saving = ref(false)
const errors = ref({})
const questionsJson = ref('')
const jsonError = ref('')

const initialForm = {
  name: '',
  code: '',
  category: '',
  description: '',
  instructions: '',
  durationMinutes: 60,
  questionCount: 100,
  basePrice: 0,
  isActive: true
}

const form = reactive({ ...initialForm })

// Parse questions JSON and count
const parsedQuestionsCount = computed(() => {
  if (!questionsJson.value.trim()) return 0
  try {
    const parsed = JSON.parse(questionsJson.value)
    jsonError.value = ''
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
})

// Validate JSON on change
watch(questionsJson, (val) => {
  if (!val.trim()) {
    jsonError.value = ''
    return
  }
  try {
    const parsed = JSON.parse(val)
    if (!Array.isArray(parsed)) {
      jsonError.value = 'Data harus berupa array JSON'
    } else {
      jsonError.value = ''
    }
  } catch (e) {
    jsonError.value = 'Format JSON tidak valid'
  }
})

const resetForm = () => {
  Object.assign(form, initialForm)
  questionsJson.value = ''
  jsonError.value = ''
  errors.value = {}
}

const open = () => {
  if (props.testType) {
    Object.assign(form, {
      name: props.testType.name,
      code: props.testType.code,
      category: props.testType.category || '',
      description: props.testType.description || '',
      instructions: props.testType.instructions || '',
      durationMinutes: props.testType.durationMinutes,
      questionCount: props.testType.questionCount,
      basePrice: props.testType.basePrice || 0,
      isActive: props.testType.isActive
    })
    // Load questions if available
    if (props.testType.questions) {
      questionsJson.value = JSON.stringify(props.testType.questions, null, 2)
    }
  } else {
    resetForm()
  }
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
  resetForm()
}

const handleSubmit = async () => {
  // Validate JSON first
  let questions = []
  if (questionsJson.value.trim()) {
    try {
      questions = JSON.parse(questionsJson.value)
      if (!Array.isArray(questions)) {
        errors.value = { questions: 'Data soal harus berupa array' }
        return
      }
    } catch {
      errors.value = { questions: 'Format JSON tidak valid' }
      return
    }
  } else {
    errors.value = { questions: 'Data soal wajib diisi' }
    return
  }

  // Validate form
  const validation = validateTestType(form)
  if (!validation.valid) {
    errors.value = validation.errors
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      questions
    }

    if (props.testType) {
      await updateTestType(props.testType.id, payload)
      showSuccess('Jenis tes berhasil diperbarui')
    } else {
      await createTestType(payload)
      showSuccess('Jenis tes berhasil ditambahkan')
    }
    emit('saved')
    close()
  } catch (error) {
    showError(error.message || 'Gagal menyimpan jenis tes')
  } finally {
    saving.value = false
  }
}

watch(() => props.testType, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      name: newVal.name,
      code: newVal.code,
      category: newVal.category || '',
      description: newVal.description || '',
      instructions: newVal.instructions || '',
      durationMinutes: newVal.durationMinutes,
      questionCount: newVal.questionCount,
      basePrice: newVal.basePrice || 0,
      isActive: newVal.isActive
    })
    if (newVal.questions) {
      questionsJson.value = JSON.stringify(newVal.questions, null, 2)
    }
  }
})

defineExpose({ open, close })
</script>
