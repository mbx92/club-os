<script setup>
import { ref, computed } from 'vue'
import {
  IconFolder,
  IconFolderPlus,
  IconList,
  IconLayoutGrid,
  IconRefresh
} from '@tabler/icons-vue'
import CategoryTreeNode from './CategoryTreeNode.vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'tree',
    validator: (val) => ['tree', 'grid', 'list'].includes(val)
  },
  draggable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'edit',
  'delete',
  'add-child',
  'select',
  'toggle-active',
  'create',
  'refresh',
  'update:viewMode'
])

const expandedNodes = ref(new Set())

// Expand first level by default
const initializeExpanded = () => {
  props.categories.forEach((cat) => {
    if (cat.children && cat.children.length > 0) {
      expandedNodes.value.add(cat.id)
    }
  })
}

// Watch categories and initialize
if (props.categories.length > 0) {
  initializeExpanded()
}

const toggleNode = (categoryId) => {
  if (expandedNodes.value.has(categoryId)) {
    expandedNodes.value.delete(categoryId)
  } else {
    expandedNodes.value.add(categoryId)
  }
}

const isExpanded = (categoryId) => expandedNodes.value.has(categoryId)

const expandAll = () => {
  const addAll = (cats) => {
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        expandedNodes.value.add(cat.id)
        addAll(cat.children)
      }
    })
  }
  addAll(props.categories)
}

const collapseAll = () => {
  expandedNodes.value.clear()
}

const totalCategories = computed(() => {
  const count = (cats) => {
    let total = cats.length
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        total += count(cat.children)
      }
    })
    return total
  }
  return count(props.categories)
})
</script>

<template>
  <div class="category-tree">
    <!-- Header Actions -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-base-content/60">
          {{ totalCategories }} categories
        </span>
        <div class="divider divider-horizontal mx-1"></div>
        <button
          class="btn btn-ghost btn-xs"
          @click="expandAll"
          title="Expand all"
        >
          Expand All
        </button>
        <button
          class="btn btn-ghost btn-xs"
          @click="collapseAll"
          title="Collapse all"
        >
          Collapse All
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- View Mode Toggle -->
        <div class="join">
          <button
            class="btn btn-sm join-item"
            :class="{ 'btn-active': viewMode === 'grid' }"
            @click="$emit('update:viewMode', viewMode === 'grid' ? 'tree' : 'grid')"
            :title="viewMode === 'grid' ? 'Switch to tree view' : 'Switch to grid view'"
          >
            <template v-if="viewMode === 'grid'">
              <IconList class="w-4 h-4" />
            </template>
            <template v-else>
              <IconLayoutGrid class="w-4 h-4" />
            </template>
          </button>
        </div>

        <!-- Refresh -->
        <button
          class="btn btn-ghost btn-sm btn-square"
          @click="$emit('refresh')"
          :disabled="loading"
          title="Refresh"
        >
          <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <!-- Create New -->
        <button
          class="btn btn-primary btn-sm gap-2"
          @click="$emit('create')"
        >
          <IconFolderPlus class="w-4 h-4" />
          New Category
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="categories.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <IconFolder class="w-20 h-20 text-base-content/20 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No categories yet</h3>
      <p class="text-base-content/60 mb-6">
        Create your first category to organize your products
      </p>
      <button class="btn btn-primary gap-2" @click="$emit('create')">
        <IconFolderPlus class="w-5 h-5" />
        Create Category
      </button>
    </div>

    <!-- Tree View -->
    <div v-else-if="viewMode === 'tree'" class="space-y-1">
      <CategoryTreeNode
        v-for="category in categories"
        :key="category.id"
        :category="category"
        :expanded="isExpanded(category.id)"
        :expanded-nodes="expandedNodes"
        :depth="0"
        :draggable="draggable"
        @toggle="toggleNode"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-child="$emit('add-child', $event)"
        @select="$emit('select', $event)"
        @toggle-active="$emit('toggle-active', $event)"
      />
    </div>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <div
        v-for="category in flattenedCategories"
        :key="category.id"
        class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        :class="{ 'opacity-50': !category.isActive }"
        @click="$emit('select', category)"
      >
        <div class="card-body p-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium">{{ category.name }}</h3>
              <p v-if="category.description" class="text-xs text-base-content/60 mt-1">
                {{ category.description }}
              </p>
            </div>
            <span
              v-if="category.productCount || category._count?.products"
              class="badge badge-sm"
            >
              {{ category.productCount || category._count?.products }}
            </span>
          </div>
          <div v-if="category.level > 0" class="mt-2">
            <span class="text-xs text-base-content/40">
              Level {{ category.level + 1 }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    flattenedCategories() {
      const flatten = (cats, level = 0) => {
        let result = []
        cats.forEach((cat) => {
          result.push({ ...cat, level })
          if (cat.children && cat.children.length > 0) {
            result = result.concat(flatten(cat.children, level + 1))
          }
        })
        return result
      }
      return flatten(this.categories)
    }
  }
}
</script>
