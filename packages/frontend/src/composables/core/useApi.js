import { inject } from 'vue'

export const useApi = () => {
  const api = inject('api')
  return api
}

export const useDialog = () => {
  const dialog = inject('dialog')
  return dialog
}
