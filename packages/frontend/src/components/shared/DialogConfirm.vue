<template>
  <dialog ref="dialogRef" class="modal" style="z-index: 9999;">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ title }}</h3>
      <div v-if="isHtml" class="py-4" v-html="message"></div>
      <p v-else class="py-4 whitespace-pre-line">{{ message }}</p>
      <div class="modal-action">
        <button 
          class="btn" 
          @click="handleClose"
        >
          {{ cancelText }}
        </button>
        <button 
          v-if="showConfirm"
          :class="['btn', confirmButtonClass]"
          @click="handleConfirm"
          :disabled="loading"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          {{ loading ? 'Processing...' : confirmText }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleClose">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'

const dialogRef = ref(null)
const title = ref('')
const message = ref('')
const isHtml = ref(false)
const confirmText = ref('Ya')
const cancelText = ref('Batal')
const showConfirm = ref(true)
const confirmButtonClass = ref('btn-error')
const loading = ref(false)
const resolvePromise = ref(null)

const open = (options = {}) => {
  return new Promise((resolve) => {
    title.value = options.title || 'Konfirmasi'
    message.value = options.message || 'Apakah Anda yakin?'
    isHtml.value = options.isHtml || false
    confirmText.value = options.confirmText || 'Ya'
    cancelText.value = options.cancelText || 'Batal'
    showConfirm.value = options.showConfirm !== false
    confirmButtonClass.value = options.type === 'danger' ? 'btn-error' : 
                                options.type === 'warning' ? 'btn-warning' :
                                options.type === 'info' ? 'btn-info' :
                                'btn-primary'
    loading.value = false
    resolvePromise.value = resolve
    
    if (dialogRef.value) {
      dialogRef.value.showModal()
    }
  })
}

const handleConfirm = () => {
  if (resolvePromise.value) {
    resolvePromise.value(true)
  }
  close()
}

const handleClose = () => {
  if (resolvePromise.value) {
    resolvePromise.value(false)
  }
  close()
}

const close = () => {
  if (dialogRef.value) {
    dialogRef.value.close()
  }
  loading.value = false
}

defineExpose({
  open,
  close
})
</script>
