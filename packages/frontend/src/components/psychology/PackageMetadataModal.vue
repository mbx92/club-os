<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        <IconSettings class="w-5 h-5 inline-block mr-2" />
        Konfigurasi Metadata
      </h3>
      <p class="text-sm text-base-content/60 mb-4">
        Paket: <span class="font-semibold">{{ packageData?.name }}</span>
      </p>

      <!-- Loading State -->
      <div v-if="loading && !packageData" class="flex justify-center items-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Difficulty -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tingkat Kesulitan</span>
            </label>
            <select v-model="form.difficulty" class="select select-bordered w-full">
              <option value="">Tidak ditentukan</option>
              <option value="beginner">Pemula (Beginner)</option>
              <option value="intermediate">Menengah (Intermediate)</option>
              <option value="advanced">Lanjutan (Advanced)</option>
            </select>
          </div>

          <!-- Target Audience -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Target Audiens</span>
            </label>
            <select v-model="form.targetAudience" class="select select-bordered w-full">
              <option value="">Tidak ditentukan</option>
              <option value="children">Anak-anak</option>
              <option value="teenagers">Remaja</option>
              <option value="adults">Dewasa</option>
              <option value="elderly">Lansia</option>
              <option value="all">Semua Usia</option>
            </select>
          </div>

          <!-- Tags -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Tags</span>
              <span class="label-text-alt text-base-content/60">Pisahkan dengan koma</span>
            </label>
            <input
              v-model="tagsInput"
              type="text"
              placeholder="personality, assessment, comprehensive"
              class="input input-bordered w-full"
            />
            <div v-if="form.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span 
                v-for="(tag, index) in form.tags" 
                :key="index"
                class="badge badge-primary gap-1"
              >
                {{ tag }}
                <button type="button" @click="removeTag(index)" class="btn btn-ghost btn-xs p-0">
                  <IconX class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- Custom Fields Section -->
          <div class="divider">Custom Fields</div>

          <!-- Time Limit per Session -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Batas Waktu per Sesi (menit)</span>
              <span class="label-text-alt text-base-content/60">Kosongkan jika tidak ada batas</span>
            </label>
            
            <!-- Calculated time limit info -->
            <div v-if="calculatedTimeLimit" class="alert alert-info mb-2 py-2">
              <IconClock class="w-4 h-4" />
              <div class="flex-1">
                <span class="text-sm">Total dari {{ packageData?.items?.length }} tes: <strong>{{ calculatedTimeLimit }} menit</strong></span>
              </div>
              <button 
                type="button" 
                class="btn btn-xs btn-ghost"
                @click="useCalculatedTimeLimit"
              >
                Gunakan
              </button>
            </div>
            
            <input
              v-model.number="form.customFields.timeLimitMinutes"
              type="number"
              min="0"
              placeholder="Contoh: 120"
              class="input input-bordered w-full"
            />
            <label class="label">
              <span class="label-text-alt text-base-content/60">
                Waktu maksimal untuk menyelesaikan tes dalam satu sesi
              </span>
            </label>
          </div>

          <!-- Special Instructions -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Instruksi Khusus</span>
            </label>
            <textarea
              v-model="form.customFields.specialInstructions"
              placeholder="Contoh: Paket ini termasuk sesi konsultasi"
              class="textarea textarea-bordered w-full"
              rows="2"
            ></textarea>
          </div>

          <!-- Allow Pause/Resume -->
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                v-model="form.customFields.allowPause"
                class="checkbox checkbox-primary"
              />
              <div>
                <span class="label-text font-medium">Izinkan Jeda</span>
                <p class="text-xs text-base-content/60">Peserta dapat menjeda dan melanjutkan tes</p>
              </div>
            </label>
          </div>

          <!-- Language -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Bahasa</span>
            </label>
            <select v-model="form.customFields.language" class="select select-bordered w-full">
              <option value="">Tidak ditentukan</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
              <option value="id,en">Bilingual (ID & EN)</option>
            </select>
          </div>

          <!-- Additional Custom Fields (Super Admin Only) -->
          <template v-if="isSuperAdmin">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Custom Fields Tambahan</span>
                <button type="button" class="btn btn-ghost btn-xs" @click="addCustomField">
                  <IconPlus class="w-4 h-4" /> Tambah Field
                </button>
              </label>
              <div v-if="additionalFields.length > 0" class="space-y-2">
                <div 
                  v-for="(field, index) in additionalFields" 
                  :key="index"
                  class="flex gap-2"
                >
                  <input
                    v-model="field.key"
                    type="text"
                    placeholder="Key"
                    class="input input-bordered input-sm flex-1"
                  />
                  <input
                    v-model="field.value"
                    type="text"
                    placeholder="Value"
                    class="input input-bordered input-sm flex-1"
                  />
                  <button 
                    type="button" 
                    class="btn btn-ghost btn-sm btn-square"
                    @click="removeCustomField(index)"
                  >
                    <IconTrash class="w-4 h-4 text-error" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Preview JSON (Super Admin Only) -->
        <div v-if="isSuperAdmin" class="collapse collapse-arrow bg-base-200 mt-4">
          <input type="checkbox" />
          <div class="collapse-title text-sm font-medium">
            Preview Metadata JSON
          </div>
          <div class="collapse-content">
            <pre class="text-xs bg-base-300 p-3 rounded-lg overflow-auto max-h-48">{{ JSON.stringify(computedMetadata, null, 2) }}</pre>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            Simpan Metadata
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconSettings,
  IconPlus,
  IconTrash,
  IconX,
  IconClock
} from '@tabler/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.user?.isSuperAdmin === true)

const props = defineProps({
  packageData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

const modalRef = ref(null)

const initialForm = {
  difficulty: '',
  targetAudience: '',
  tags: [],
  customFields: {
    timeLimitMinutes: null,
    allowPause: false,
    specialInstructions: '',
    language: ''
  }
}

const form = ref({ ...initialForm, customFields: { ...initialForm.customFields } })
const tagsInput = ref('')
const additionalFields = ref([])

// Calculate total time limit from all test types in package
// Uses config.timeLimit if available, otherwise falls back to estimatedDuration
const calculatedTimeLimit = computed(() => {
  if (!props.packageData?.items?.length) return null
  
  let totalMinutes = 0
  
  props.packageData.items.forEach(item => {
    const testType = item.testType
    // Priority: config.timeLimit > estimatedDuration
    if (testType?.config?.timeLimit) {
      totalMinutes += testType.config.timeLimit
    } else if (testType?.estimatedDuration) {
      totalMinutes += testType.estimatedDuration
    }
  })
  
  return totalMinutes > 0 ? totalMinutes : null
})

// Use calculated time limit
const useCalculatedTimeLimit = () => {
  if (calculatedTimeLimit.value) {
    form.value.customFields.timeLimitMinutes = calculatedTimeLimit.value
  }
}

// Compute final metadata object
const computedMetadata = computed(() => {
  const metadata = {}
  
  if (form.value.difficulty) {
    metadata.difficulty = form.value.difficulty
  }
  
  if (form.value.targetAudience) {
    metadata.targetAudience = form.value.targetAudience
  }
  
  if (form.value.tags.length > 0) {
    metadata.tags = form.value.tags
  }
  
  // Build customFields
  const customFields = {}
  
  if (form.value.customFields.specialInstructions) {
    customFields.specialInstructions = form.value.customFields.specialInstructions
  }
  
  if (form.value.customFields.timeLimitMinutes) {
    customFields.timeLimitMinutes = form.value.customFields.timeLimitMinutes
  }
  
  if (form.value.customFields.allowPause) {
    customFields.allowPause = form.value.customFields.allowPause
  }
  
  if (form.value.customFields.language) {
    customFields.language = form.value.customFields.language
  }
  
  // Add additional custom fields
  additionalFields.value.forEach(field => {
    if (field.key && field.value) {
      customFields[field.key] = field.value
    }
  })
  
  if (Object.keys(customFields).length > 0) {
    metadata.customFields = customFields
  }
  
  return metadata
})

const resetForm = () => {
  form.value = { 
    ...initialForm, 
    tags: [],
    customFields: { ...initialForm.customFields } 
  }
  tagsInput.value = ''
  additionalFields.value = []
}

// Watch tagsInput and parse tags
watch(tagsInput, (newValue) => {
  if (newValue.includes(',')) {
    const parts = newValue.split(',')
    const lastPart = parts.pop().trim()
    const newTags = parts
      .map(t => t.trim())
      .filter(t => t && !form.value.tags.includes(t))
    
    if (newTags.length > 0) {
      form.value.tags.push(...newTags)
    }
    tagsInput.value = lastPart
  }
})

// Watch packageData for changes
watch(() => props.packageData, (newPackage) => {
  if (newPackage?.metadata) {
    const metadata = newPackage.metadata
    form.value = {
      difficulty: metadata.difficulty || '',
      targetAudience: metadata.targetAudience || '',
      tags: Array.isArray(metadata.tags) ? [...metadata.tags] : [],
      customFields: {
        timeLimitMinutes: metadata.customFields?.timeLimitMinutes || null,
        allowPause: metadata.customFields?.allowPause || false,
        specialInstructions: metadata.customFields?.specialInstructions || '',
        language: metadata.customFields?.language || ''
      }
    }
    
    // Load additional custom fields
    additionalFields.value = []
    if (metadata.customFields) {
      const knownFields = ['timeLimitMinutes', 'allowPause', 'specialInstructions', 'language']
      Object.entries(metadata.customFields).forEach(([key, value]) => {
        if (!knownFields.includes(key)) {
          additionalFields.value.push({ key, value: String(value) })
        }
      })
    }
    
    tagsInput.value = ''
  } else {
    resetForm()
  }
}, { immediate: true })

const removeTag = (index) => {
  form.value.tags.splice(index, 1)
}

const addCustomField = () => {
  additionalFields.value.push({ key: '', value: '' })
}

const removeCustomField = (index) => {
  additionalFields.value.splice(index, 1)
}

const handleSubmit = () => {
  // Add remaining tag from input
  if (tagsInput.value.trim()) {
    const tag = tagsInput.value.trim()
    if (!form.value.tags.includes(tag)) {
      form.value.tags.push(tag)
    }
    tagsInput.value = ''
  }
  
  emit('submit', {
    packageId: props.packageData?.id,
    metadata: computedMetadata.value
  })
}

const openModal = () => {
  modalRef.value?.showModal()
}

const closeModal = () => {
  modalRef.value?.close()
  emit('close')
}

defineExpose({
  openModal,
  closeModal,
  resetForm
})
</script>
