import { createApp } from 'vue'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'

class DialogService {
  constructor() {
    this.dialogInstance = null
    this.mountPoint = null
  }

  init() {
    if (!this.dialogInstance) {
      this.mountPoint = document.createElement('div')
      document.body.appendChild(this.mountPoint)
      
      const app = createApp(DialogConfirm)
      const instance = app.mount(this.mountPoint)
      this.dialogInstance = instance
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

export const dialog = new DialogService()

export default {
  install: (app) => {
    app.config.globalProperties.$dialog = dialog
  }
}
