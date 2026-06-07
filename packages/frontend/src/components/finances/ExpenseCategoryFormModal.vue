<template>
  <Teleport to="body">
  <dialog ref="modalRef" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      
      <h3 class="font-bold text-lg mb-4">
        {{ isEdit ? 'Edit Category' : 'Create New Category' }}
      </h3>
      
      <div class="space-y-4">
        <!-- Name -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Name <span class="text-error">*</span></span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="Enter category name"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.name }"
          />
          <label v-if="errors.name" class="label">
            <span class="label-text-alt text-error">{{ errors.name }}</span>
          </label>
        </div>

        <!-- Type -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Type <span class="text-error">*</span></span>
          </label>
          <select
            v-model="formData.type"
            class="select select-bordered w-full"
            :class="{ 'select-error': errors.type }"
          >
            <option value="">Select type</option>
            <option value="operational">Operational</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
            <option value="one_time">One Time</option>
          </select>
          <label v-if="errors.type" class="label">
            <span class="label-text-alt text-error">{{ errors.type }}</span>
          </label>
        </div>

        <!-- Color and Icon -->
        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Color</span>
            </label>
            <input
              v-model="formData.color"
              type="color"
              class="input input-bordered w-full h-12"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Icon</span>
            </label>
            <input
              v-model="formData.icon"
              type="text"
              placeholder="Icon name"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Description</span>
          </label>
          <textarea
            v-model="formData.description"
            placeholder="Enter category description"
            class="textarea textarea-bordered w-full h-24"
          ></textarea>
        </div>

        <!-- Active Status -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="checkbox checkbox-primary"
            />
            <span class="label-text font-medium">Active</span>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <form method="dialog">
          <button class="btn btn-ghost" :disabled="loading">Cancel</button>
        </form>
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>{{ isEdit ? 'Update' : 'Create' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  category: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const modalRef = ref(null)
const errors = ref({})

const formData = ref({
  name: '',
  description: '',
  type: '',
  color: '#3498db',
  icon: '',
  isActive: true
})

const isEdit = computed(() => !!props.category)

const validate = () => {
  errors.value = {}
  
  if (!formData.value.name) {
    errors.value.name = 'Name is required'
  }
  
  if (!formData.value.type) {
    errors.value.type = 'Type is required'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validate()) {
    return
  }
  
  emit('submit', { ...formData.value })
}

const open = (category = null) => {
  if (category) {
    formData.value = { ...category }
  } else {
    formData.value = {
      name: '',
      description: '',
      type: '',
      color: '#3498db',
      icon: '',
      isActive: true
    }
  }
  
  errors.value = {}
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
}

defineExpose({
  open,
  close
})
</script>
