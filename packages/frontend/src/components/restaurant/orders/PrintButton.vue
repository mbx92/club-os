<script setup>
import { ref, computed } from 'vue'
import {
  IconPrinter,
  IconReceipt,
  IconChefHat,
  IconEye,
  IconX
} from '@tabler/icons-vue'
import Receipt from './Receipt.vue'
import KitchenTicket from './KitchenTicket.vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    default: 'receipt', // 'receipt' or 'kitchen'
    validator: (v) => ['receipt', 'kitchen'].includes(v)
  },
  settings: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'button', // 'button', 'dropdown', 'icon'
    validator: (v) => ['button', 'dropdown', 'icon'].includes(v)
  }
})

const emit = defineEmits(['print', 'preview'])

// State
const showPreview = ref(false)
const previewType = ref('receipt')

// Button config
const buttonConfig = computed(() => {
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  }

  return {
    sizeClass: sizeClasses[props.size],
    icon: props.type === 'kitchen' ? IconChefHat : IconReceipt,
    label: props.type === 'kitchen' ? 'Kitchen Ticket' : 'Receipt'
  }
})

// Handle print
const handlePrint = (type = props.type) => {
  emit('print', type)
}

// Handle preview
const handlePreview = (type = props.type) => {
  previewType.value = type
  showPreview.value = true
  emit('preview', type)
}

// Print preview
const printPreview = () => {
  window.print()
}

// Close preview
const closePreview = () => {
  showPreview.value = false
}
</script>

<template>
  <!-- Simple Button -->
  <template v-if="variant === 'button'">
    <button
      class="btn btn-outline gap-2"
      :class="buttonConfig.sizeClass"
      :disabled="loading"
      @click="handlePrint()"
    >
      <span v-if="loading" class="loading loading-spinner loading-sm"></span>
      <component v-else :is="buttonConfig.icon" class="w-4 h-4" />
      <span v-if="showLabel">Print {{ buttonConfig.label }}</span>
    </button>
  </template>

  <!-- Icon Only -->
  <template v-else-if="variant === 'icon'">
    <button
      class="btn btn-ghost btn-circle"
      :class="buttonConfig.sizeClass"
      :disabled="loading"
      :title="`Print ${buttonConfig.label}`"
      @click="handlePrint()"
    >
      <span v-if="loading" class="loading loading-spinner loading-sm"></span>
      <component v-else :is="buttonConfig.icon" class="w-5 h-5" />
    </button>
  </template>

  <!-- Dropdown with Options -->
  <template v-else-if="variant === 'dropdown'">
    <div class="dropdown dropdown-end">
      <label
        tabindex="0"
        class="btn gap-2"
        :class="[buttonConfig.sizeClass, { 'btn-disabled': loading }]"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
        <IconPrinter v-else class="w-4 h-4" />
        <span v-if="showLabel">Print</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </label>

      <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52">
        <li>
          <button @click="handlePrint('receipt')" :disabled="loading">
            <IconReceipt class="w-4 h-4" />
            Print Receipt
          </button>
        </li>
        <li>
          <button @click="handlePrint('kitchen')" :disabled="loading">
            <IconChefHat class="w-4 h-4" />
            Print Kitchen Ticket
          </button>
        </li>
        <li class="divider"></li>
        <li>
          <button @click="handlePreview('receipt')">
            <IconEye class="w-4 h-4" />
            Preview Receipt
          </button>
        </li>
        <li>
          <button @click="handlePreview('kitchen')">
            <IconEye class="w-4 h-4" />
            Preview Kitchen Ticket
          </button>
        </li>
      </ul>
    </div>
  </template>

  <!-- Preview Modal -->
  <dialog :class="['modal', { 'modal-open': showPreview }]">
    <div class="modal-box max-w-lg p-0">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="font-bold text-lg">
          {{ previewType === 'kitchen' ? 'Kitchen Ticket' : 'Receipt' }} Preview
        </h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="closePreview">
          <IconX class="w-5 h-5" />
        </button>
      </div>

      <!-- Preview Content -->
      <div class="p-4 bg-gray-100 overflow-auto max-h-[60vh]">
        <Receipt
          v-if="previewType === 'receipt'"
          :order="order"
          :settings="settings"
        />
        <KitchenTicket
          v-else
          :order="order"
          :settings="settings"
        />
      </div>

      <!-- Actions -->
      <div class="modal-action p-4 border-t">
        <button class="btn btn-ghost" @click="closePreview">
          Close
        </button>
        <button class="btn btn-primary gap-2" @click="printPreview">
          <IconPrinter class="w-4 h-4" />
          Print
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closePreview">
      <button>close</button>
    </form>
  </dialog>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  
  .modal-box,
  .modal-box * {
    visibility: visible;
  }
  
  .modal-box {
    position: absolute;
    left: 0;
    top: 0;
    margin: 0;
    padding: 0;
    width: 80mm;
    max-width: none;
    box-shadow: none;
    background: white;
  }

  .modal-box .modal-action,
  .modal-box .border-b,
  .modal-box .border-t,
  .modal-box .btn {
    display: none !important;
  }

  .modal-box .bg-gray-100 {
    background: white !important;
    padding: 0 !important;
  }
}
</style>
