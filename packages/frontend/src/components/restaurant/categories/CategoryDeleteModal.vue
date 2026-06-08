<script setup>
import { ref, computed } from 'vue'
import { IconX, IconAlertTriangle, IconArrowRight } from '@tabler/icons-vue'

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
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const moveProductsTo = ref(null)

const productCount = computed(() => {
  return Number(props.category?.productCount || props.category?._count?.products || 0)
})

const hasProducts = computed(() => productCount.value > 0)

const hasChildren = computed(() => {
  return props.category?.children && props.category.children.length > 0
})

/**
 * Get available categories for moving products
 * Excludes the category being deleted and its descendants
 */
const availableCategories = computed(() => {
  if (!props.category) return []

  const excludeIds = new Set()

  // Exclude current category and descendants
  const getDescendantIds = (cat) => {
    excludeIds.add(cat.id)
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach(getDescendantIds)
    }
  }
  getDescendantIds(props.category)

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

const handleConfirm = () => {
  emit('confirm', {
    categoryId: props.category.id,
    moveProductsTo: hasProducts.value ? moveProductsTo.value : null
  })
}

const closeModal = () => {
  moveProductsTo.value = null
  emit('update:modelValue', false)
}

const canDelete = computed(() => {
  // Can delete if no products or if products will be moved
  if (!hasProducts.value) return true
  return moveProductsTo.value !== null
})
</script>

<template>
  <div class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box max-w-md">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        <IconX class="w-5 h-5" />
      </button>

      <div class="flex items-start gap-4 mb-6">
        <div class="p-3 bg-error/10 rounded-full">
          <IconAlertTriangle class="w-6 h-6 text-error" />
        </div>
        <div>
          <h3 class="font-bold text-lg">Delete Category</h3>
          <p class="text-sm text-base-content/60 mt-1">
            Are you sure you want to delete "{{ category?.name }}"?
          </p>
        </div>
      </div>

      <!-- Warnings -->
      <div class="space-y-3">
        <!-- Has Products Warning -->
        <div v-if="hasProducts" class="alert alert-warning">
          <div>
            <p class="font-medium">
              This category has {{ productCount }} product(s)
            </p>
            <p class="text-sm">
              Select where to move them before deleting
            </p>
          </div>
        </div>

        <!-- Has Children Warning -->
        <div v-if="hasChildren" class="alert alert-error">
          <div>
            <p class="font-medium">Cannot delete</p>
            <p class="text-sm">
              This category has subcategories. Delete or move them first.
            </p>
          </div>
        </div>

        <!-- Move Products Selector -->
        <div v-if="hasProducts && !hasChildren" class="form-control">
          <label class="label">
            <span class="label-text">Move products to <span class="text-error">*</span></span>
          </label>
          <select
            v-model="moveProductsTo"
            class="select select-bordered w-full"
          >
            <option :value="null" disabled>Select a category</option>
            <option
              v-for="cat in availableCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.displayName }}
            </option>
          </select>

          <!-- Preview -->
          <div v-if="moveProductsTo" class="mt-3 p-3 bg-base-200 rounded-lg">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium">{{ category?.name }}</span>
              <IconArrowRight class="w-4 h-4" />
              <span class="font-medium text-primary">
                {{ availableCategories.find(c => c.id === moveProductsTo)?.name }}
              </span>
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              {{ productCount }} product(s) will be moved
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          @click="closeModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-error"
          @click="handleConfirm"
          :disabled="loading || hasChildren || !canDelete"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Delete Category</span>
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>
</template>
