<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconFolder, IconPhoto } from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  category: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  },
  parentCategory: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const isEdit = computed(() => !!props.category)

const formData = ref({
  name: '',
  description: '',
  parentId: null,
  displayOrder: 1,
  isActive: true,
  imageUrl: '',
  icon: '',
  color: '#3b82f6'
})

const errors = ref({})

/**
 * Get flattened list of categories for parent selector
 * Excludes current category and its children (if editing)
 */
const flatCategories = computed(() => {
  const excludeIds = new Set()

  // If editing, exclude current category and all its descendants
  if (props.category) {
    const getDescendantIds = (cat) => {
      excludeIds.add(cat.id)
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(getDescendantIds)
      }
    }
    getDescendantIds(props.category)
  }

  const flatten = (cats, level = 0) => {
    let result = []
    for (const cat of cats) {
      if (excludeIds.has(cat.id)) continue
      result.push({
        ...cat,
        level,
        displayName: '—'.repeat(level) + (level > 0 ? ' ' : '') + cat.name
      })
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flatten(cat.children, level + 1))
      }
    }
    return result
  }

  return flatten(props.categories)
})

const resetForm = () => {
  if (props.category) {
    formData.value = {
      name: props.category.name || '',
      description: props.category.description || '',
      parentId: props.category.parentId || null,
      displayOrder: props.category.displayOrder || 1,
      isActive: props.category.isActive !== false,
      imageUrl: props.category.imageUrl || '',
      icon: props.category.icon || '',
      color: props.category.color || '#3b82f6'
    }
  } else {
    formData.value = {
      name: '',
      description: '',
      parentId: props.parentCategory?.id || null,
      displayOrder: 1,
      isActive: true,
      imageUrl: '',
      icon: '',
      color: '#3b82f6'
    }
  }
  errors.value = {}
}

const validateForm = () => {
  errors.value = {}

  if (!formData.value.name.trim()) {
    errors.value.name = 'Category name is required'
  } else if (formData.value.name.length > 100) {
    errors.value.name = 'Category name must be less than 100 characters'
  }

  if (formData.value.description && formData.value.description.length > 500) {
    errors.value.description = 'Description must be less than 500 characters'
  }

  if (formData.value.displayOrder < 1) {
    errors.value.displayOrder = 'Display order must be at least 1'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  const data = {
    ...formData.value,
    name: formData.value.name.trim(),
    description: formData.value.description?.trim() || null,
    parentId: formData.value.parentId || null,
    imageUrl: formData.value.imageUrl?.trim() || null,
    icon: formData.value.icon?.trim() || null,
    color: formData.value.color || null
  }

  emit('submit', data)
}

const closeModal = () => {
  emit('update:modelValue', false)
  setTimeout(resetForm, 300)
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      resetForm()
    }
  }
)

// Common category icons
const categoryIcons = [
  'restaurant',
  'coffee',
  'pizza',
  'burger',
  'noodles',
  'salad',
  'soup',
  'cake',
  'ice-cream',
  'drink',
  'fish',
  'meat',
  'vegetable',
  'fruit',
  'bread'
]

// Preset colors
const presetColors = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1' // indigo
]
</script>

<template>
  <div class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box max-w-2xl">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        <IconX class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-primary/10 rounded-lg">
          <IconFolder class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 class="font-bold text-lg">
            {{ isEdit ? 'Edit Category' : 'Create Category' }}
          </h3>
          <p class="text-sm text-base-content/60">
            {{ isEdit ? 'Update category details' : 'Add a new category to organize products' }}
          </p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">
              Category Name <span class="text-error">*</span>
            </span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="input input-bordered w-full"
            :class="{ 'input-error': errors.name }"
            placeholder="e.g., Main Dishes, Beverages"
            required
          />
          <label v-if="errors.name" class="label">
            <span class="label-text-alt text-error">{{ errors.name }}</span>
          </label>
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Description</span>
            <span class="label-text-alt">{{ formData.description?.length || 0 }}/500</span>
          </label>
          <textarea
            v-model="formData.description"
            class="textarea textarea-bordered w-full"
            :class="{ 'textarea-error': errors.description }"
            placeholder="Optional description for this category"
            rows="3"
          ></textarea>
          <label v-if="errors.description" class="label">
            <span class="label-text-alt text-error">{{ errors.description }}</span>
          </label>
        </div>

        <!-- Parent Category -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Parent Category</span>
          </label>
          <select
            v-model="formData.parentId"
            class="select select-bordered w-full"
          >
            <option :value="null">None (Top Level)</option>
            <option
              v-for="cat in flatCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.displayName }}
            </option>
          </select>
          <label class="label">
            <span class="label-text-alt text-base-content/60">
              Leave empty to create a top-level category
            </span>
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Display Order -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Display Order</span>
            </label>
            <input
              v-model.number="formData.displayOrder"
              type="number"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.displayOrder }"
              min="1"
            />
            <label v-if="errors.displayOrder" class="label">
              <span class="label-text-alt text-error">{{ errors.displayOrder }}</span>
            </label>
          </div>

          <!-- Color -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Color</span>
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="formData.color"
                type="color"
                class="w-12 h-10 rounded cursor-pointer border-0"
              />
              <div class="flex gap-1 flex-wrap">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="w-6 h-6 rounded transition-transform hover:scale-110"
                  :style="{ backgroundColor: color }"
                  :class="{
                    'ring-2 ring-offset-2 ring-primary': formData.color === color
                  }"
                  @click="formData.color = color"
                ></button>
              </div>
            </div>
          </div>
        </div>

        <!-- Image URL -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Image URL</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="formData.imageUrl"
              type="url"
              class="input input-bordered w-full"
              placeholder="https://example.com/image.jpg"
            />
            <div
              v-if="formData.imageUrl"
              class="w-10 h-10 rounded overflow-hidden flex-shrink-0"
            >
              <img
                :src="formData.imageUrl"
                alt="Preview"
                class="w-full h-full object-cover"
                @error="formData.imageUrl = ''"
              />
            </div>
            <div
              v-else
              class="w-10 h-10 rounded bg-base-200 flex items-center justify-center flex-shrink-0"
            >
              <IconPhoto class="w-5 h-5 text-base-content/40" />
            </div>
          </div>
        </div>

        <!-- Active Status -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="toggle toggle-primary"
            />
            <div>
              <span class="label-text">Active</span>
              <p class="text-xs text-base-content/60">
                Inactive categories won't appear in menus and POS
              </p>
            </div>
          </label>
        </div>

        <!-- Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            @click="closeModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !formData.name.trim()"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <span v-else>{{ isEdit ? 'Update Category' : 'Create Category' }}</span>
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>
</template>
