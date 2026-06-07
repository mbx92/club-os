import { createApp, h } from 'vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'
import { useNotification } from '@/composables/core/useNotification'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.locale('id')
dayjs.extend(localizedFormat)

// Initialize notification service
const notificationService = useNotification()

class DialogService {
  constructor() {
    this.dialogInstance = null
    this.mountPoint = null
  }

  init() {
    if (!this.mountPoint) {
      this.mountPoint = document.createElement('div')
      document.body.appendChild(this.mountPoint)
      
      const app = createApp({
        render: () => h(DialogConfirm, { ref: 'dialog' })
      })
      
      const instance = app.mount(this.mountPoint)
      this.dialogInstance = instance.$refs.dialog
    }
  }

  confirm(options) {
    this.init()
    return this.dialogInstance.open({
      showConfirm: true,
      type: 'danger',
      ...options
    })
  }

  alert(options) {
    this.init()
    return this.dialogInstance.open({
      showConfirm: false,
      cancelText: 'Tutup',
      ...options
    })
  }

  delete(options) {
    this.init()
    return this.dialogInstance.open({
      title: 'Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      showConfirm: true,
      type: 'danger',
      ...options
    })
  }

  info(options) {
    this.init()
    return this.dialogInstance.open({
      type: 'info',
      ...options
    })
  }

  warning(options) {
    this.init()
    return this.dialogInstance.open({
      type: 'warning',
      ...options
    })
  }
}

const dialog = new DialogService()

// Global dialog functions
export const showDialogConfirm = (options) => dialog.confirm(options)
export const showDialogDelete = (options) => dialog.delete(options)
export const showDialogAlert = (options) => dialog.alert(options)
export const showDialogInfo = (options) => dialog.info(options)
export const showDialogWarning = (options) => dialog.warning(options)

// Global toast notification functions
export const showSuccess = (message, duration) => notificationService.showSuccess(message, duration)
export const showError = (message, duration) => notificationService.showError(message, duration)
export const showWarning = (message, duration) => notificationService.showWarning(message, duration)
export const showInfo = (message, duration) => notificationService.showInfo(message, duration)

// HTTP Error handler - returns both title and message for form alerts
export const handleHttpError = (error) => {
  if (!error.response) {
    return {
      title: 'Network Error',
      message: error.message || 'Tidak dapat terhubung ke server'
    }
  }
  
  const status = error.response.status
  const data = error.response.data
  
  let title = `Error ${status}`
  let message = data?.message || data?.error || 'Terjadi kesalahan pada server'
  
  // Map status codes to user-friendly titles and messages
  switch (status) {
    case 400:
      title = 'Bad Request'
      message = data?.message || 'Data yang dikirim tidak valid'
      break
    case 401:
      title = 'Login Gagal'
      message = data?.message || 'Email atau password salah'
      break
    case 403:
      title = 'Akses Ditolak'
      message = data?.message || 'Anda tidak memiliki akses'
      break
    case 404:
      title = 'Not Found'
      message = 'Endpoint tidak ditemukan'
      break
    case 422:
      title = 'Validation Error'
      message = data?.message || 'Data tidak valid'
      break
    case 500:
      title = 'Server Error'
      message = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
      break
    case 503:
      title = 'Service Unavailable'
      message = 'Server sedang maintenance. Silakan coba lagi nanti.'
      break
  }
  
  return { title, message }
}

// Helper function to show error based on HTTP status code
export const showHttpError = (error, customMessage = null) => {
  let message = customMessage
  
  if (!message && error.response) {
    const status = error.response.status
    const data = error.response.data
    
    // Try to get message from response
    if (data?.message) {
      message = data.message
    } else if (data?.error) {
      message = data.error
    } else {
      // Default messages based on status code
      switch (status) {
        case 400:
          message = 'Bad Request: Data yang dikirim tidak valid'
          break
        case 401:
          message = 'Unauthorized: Anda perlu login terlebih dahulu'
          break
        case 403:
          message = 'Forbidden: Anda tidak memiliki akses'
          break
        case 404:
          message = 'Not Found: Data tidak ditemukan'
          break
        case 422:
          message = 'Validation Error: Data tidak valid'
          break
        case 500:
          message = 'Server Error: Terjadi kesalahan pada server'
          break
        case 503:
          message = 'Service Unavailable: Server sedang maintenance'
          break
        default:
          message = `Error: ${status}`
      }
    }
  } else if (!message) {
    message = error.message || 'Terjadi kesalahan yang tidak diketahui'
  }
  
  return showError(message)
}

// Date formatting functions
export const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('DD/MM/YYYY')
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

export const formatTime = (date) => {
  if (!date) return '-'
  return dayjs(date).format('HH:mm')
}

export const formatLongDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('DD MMMM YYYY')
}

// Currency formatting
export const formatCurrency = (value, currency = 'IDR') => {
  if (value === null || value === undefined) return '-'
  
  const number = parseFloat(value)
  if (isNaN(number)) return '-'
  
  if (currency === 'IDR' || currency === 'Rp') {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(number)
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency
  }).format(number)
}

// Gender formatting with symbols
export const formatGender = (gender) => {
  if (!gender) return '-'
  
  const g = gender.toLowerCase()
  if (g === 'male' || g === 'laki-laki' || g === 'l' || g === 'm') {
    return '♂ Laki-laki'
  } else if (g === 'female' || g === 'perempuan' || g === 'p' || g === 'f') {
    return '♀ Perempuan'
  }
  
  return gender
}

export default {
  install: (app) => {
    // Dialog methods
    app.config.globalProperties.$dialog = dialog
    app.config.globalProperties.DialogConfirm = showDialogConfirm
    app.config.globalProperties.DialogDelete = showDialogDelete
    app.config.globalProperties.DialogAlert = showDialogAlert
    app.config.globalProperties.DialogInfo = showDialogInfo
    app.config.globalProperties.DialogWarning = showDialogWarning
    
    // Toast notification methods
    app.config.globalProperties.$toast = notificationService
    app.config.globalProperties.showSuccess = showSuccess
    app.config.globalProperties.showError = showError
    app.config.globalProperties.showWarning = showWarning
    app.config.globalProperties.showInfo = showInfo
    app.config.globalProperties.handleHttpError = handleHttpError
    app.config.globalProperties.showHttpError = showHttpError
    
    // Formatting methods
    app.config.globalProperties.formatDate = formatDate
    app.config.globalProperties.formatDateTime = formatDateTime
    app.config.globalProperties.formatTime = formatTime
    app.config.globalProperties.formatLongDate = formatLongDate
    app.config.globalProperties.formatCurrency = formatCurrency
    app.config.globalProperties.formatGender = formatGender
    
    // Provide for Composition API
    app.provide('dialog', dialog)
    app.provide('DialogConfirm', showDialogConfirm)
    app.provide('DialogDelete', showDialogDelete)
    app.provide('DialogAlert', showDialogAlert)
    app.provide('DialogInfo', showDialogInfo)
    app.provide('DialogWarning', showDialogWarning)
    app.provide('toast', notificationService)
    app.provide('showSuccess', showSuccess)
    app.provide('showError', showError)
    app.provide('showWarning', showWarning)
    app.provide('showInfo', showInfo)
    app.provide('handleHttpError', handleHttpError)
    app.provide('showHttpError', showHttpError)
    app.provide('formatDate', formatDate)
    app.provide('formatDateTime', formatDateTime)
    app.provide('formatTime', formatTime)
    app.provide('formatLongDate', formatLongDate)
    app.provide('formatCurrency', formatCurrency)
    app.provide('formatGender', formatGender)
  }
}
