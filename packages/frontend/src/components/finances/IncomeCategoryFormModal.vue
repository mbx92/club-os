<template>
  <Teleport to="body">
  <dialog ref="modalRef" class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">
        {{ mode === 'create' ? 'Add Income Category' : 'Edit Income Category' }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <!-- Name -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Category Name <span class="text-error">*</span></span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="input input-bordered w-full"
            placeholder="e.g., Corporate Donations"
            required
          />
        </div>

        <!-- Description -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Description</span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Brief description of this category"
          ></textarea>
        </div>

        <!-- Type -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Type <span class="text-error">*</span></span>
          </label>
          <select
            v-model="formData.type"
            class="select select-bordered w-full"
            required
          >
            <option value="">Select Type</option>
            <option value="donation">Donation</option>
            <option value="investment">Investment</option>
            <option value="grant">Grant</option>
            <option value="sponsorship">Sponsorship</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Color & Icon -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Color</span>
            </label>
            <div class="flex gap-2">
              <input
                v-model="formData.color"
                type="color"
                class="w-12 h-12 rounded cursor-pointer"
              />
              <input
                v-model="formData.color"
                type="text"
                class="input input-bordered flex-1"
                placeholder="#4CAF50"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Icon</span>
            </label>
            <select v-model="formData.icon" class="select select-bordered w-full">
              <option value="">Select Icon</option>
              <option value="gift">Gift (Donation)</option>
              <option value="trending-up">Trending Up (Investment)</option>
              <option value="briefcase">Briefcase (Sponsorship)</option>
              <option value="award">Award (Grant)</option>
              <option value="dollar-sign">Dollar Sign</option>
              <option value="coins">Coins</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
        </div>

        <!-- Active Status -->
        <div class="form-control mb-4">
          <label class="label cursor-pointer justify-start gap-2">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="checkbox checkbox-primary"
            />
            <span class="label-text">Active Category</span>
          </label>
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              Inactive categories won't be available for new income entries
            </span>
          </label>
        </div>

        <!-- Preview -->
        <div v-if="formData.name" class="alert mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              :style="{ backgroundColor: formData.color || '#4CAF50' }"
            >
              {{ formData.icon ? '🎁' : formData.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="font-semibold">{{ formData.name }}</div>
              <div class="text-sm opacity-70">
                <span class="badge badge-sm">{{ formData.type || 'No type' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ mode === 'create' ? 'Create Category' : 'Update Category' }}
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="handleClose">close</button>
    </form>
  </dialog>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create', // 'create' or 'edit'
    validator: (value) => ['create', 'edit'].includes(value)
  },
  category: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const modalRef = ref(null)

const formData = ref({
  name: '',
  description: '',
  type: '',
  color: '#4CAF50',
  icon: 'gift',
  isActive: true
})

// Watch for category prop changes (edit mode)
watch(() => props.category, (newCategory) => {
  if (newCategory && props.mode === 'edit') {
    formData.value = { ...newCategory }
  }
}, { immediate: true })

// Reset form when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen && props.mode === 'create') {
    resetForm()
  }
})

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    type: '',
    color: '#4CAF50',
    icon: 'gift',
    isActive: true
  }
}

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>
