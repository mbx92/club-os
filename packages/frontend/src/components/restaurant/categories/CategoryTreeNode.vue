<script setup>
import { computed } from 'vue'
import {
  IconChevronRight,
  IconChevronDown,
  IconEdit,
  IconTrash,
  IconPlus,
  IconFolder,
  IconFolderOpen,
  IconGripVertical,
  IconToggleLeft,
  IconToggleRight
} from '@tabler/icons-vue'

const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  expanded: {
    type: Boolean,
    default: false
  },
  expandedNodes: {
    type: Set,
    default: () => new Set()
  },
  depth: {
    type: Number,
    default: 0
  },
  draggable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle',
  'edit',
  'delete',
  'add-child',
  'select',
  'toggle-active'
])

const hasChildren = computed(() => {
  return props.category.children && props.category.children.length > 0
})

const isExpanded = (categoryId) => {
  return props.expandedNodes.has(categoryId)
}

const productCount = computed(() => {
  return Number(props.category.productCount || props.category._count?.products || 0)
})

const isActive = computed(() => {
  return props.category.isActive !== false
})
</script>

<template>
  <div class="category-tree-node">
    <!-- Current Node -->
    <div
      class="flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 cursor-pointer group transition-colors"
      :class="{
        'opacity-50': !isActive,
        'bg-base-100': depth === 0,
        'ml-6': depth > 0
      }"
      @click="$emit('select', category)"
    >
      <!-- Drag Handle (if draggable) -->
      <div
        v-if="draggable"
        class="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <IconGripVertical class="w-4 h-4 text-base-content/40" />
      </div>

      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren"
        class="btn btn-ghost btn-xs btn-square"
        @click.stop="$emit('toggle', category.id)"
      >
        <IconChevronDown v-if="expanded" class="w-4 h-4 transition-transform" />
        <IconChevronRight v-else class="w-4 h-4 transition-transform" />
      </button>
      <div v-else class="w-6"></div>

      <!-- Folder Icon -->
      <IconFolderOpen v-if="expanded && hasChildren" class="w-5 h-5 text-warning flex-shrink-0" />
      <IconFolder v-else class="w-5 h-5 text-base-content/60 flex-shrink-0" />

      <!-- Category Name and Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium truncate">{{ category.name }}</span>
          <span
            v-if="productCount > 0"
            class="badge badge-sm badge-ghost"
          >
            {{ productCount }} items
          </span>
          <span
            v-if="!isActive"
            class="badge badge-sm badge-warning"
          >
            Inactive
          </span>
        </div>
        <p
          v-if="category.description"
          class="text-xs text-base-content/60 truncate"
        >
          {{ category.description }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- Toggle Active -->
        <button
          class="btn btn-ghost btn-xs btn-square"
          :class="isActive ? 'text-success' : 'text-warning'"
          @click.stop="$emit('toggle-active', category)"
          :title="isActive ? 'Deactivate' : 'Activate'"
        >
          <IconToggleRight v-if="isActive" class="w-4 h-4" />
          <IconToggleLeft v-else class="w-4 h-4" />
        </button>

        <!-- Add Subcategory -->
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="$emit('add-child', category)"
          title="Add subcategory"
        >
          <IconPlus class="w-4 h-4" />
        </button>

        <!-- Edit -->
        <button
          class="btn btn-ghost btn-xs btn-square"
          @click.stop="$emit('edit', category)"
          title="Edit category"
        >
          <IconEdit class="w-4 h-4" />
        </button>

        <!-- Delete -->
        <button
          class="btn btn-ghost btn-xs btn-square text-error"
          @click.stop="$emit('delete', category)"
          title="Delete category"
        >
          <IconTrash class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Children (Recursive) -->
    <Transition name="expand">
      <div
        v-if="expanded && hasChildren"
        class="category-children"
      >
        <CategoryTreeNode
          v-for="child in category.children"
          :key="child.id"
          :category="child"
          :expanded="isExpanded(child.id)"
          :expanded-nodes="expandedNodes"
          :depth="depth + 1"
          :draggable="draggable"
          @toggle="$emit('toggle', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @add-child="$emit('add-child', $event)"
          @select="$emit('select', $event)"
          @toggle-active="$emit('toggle-active', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
