import { ref } from 'vue'

/**
 * Global toast notification composable
 * Provides success, error, warning, and info toast methods.
 * Works standalone or integrates with an AppShell toast outlet.
 *
 * @returns {{ toasts: Ref<Toast[]>, success, error, warning, info, remove }}
 * @typedef {object} Toast
 * @property {string} id
 * @property {'success'|'error'|'warning'|'info'} type
 * @property {string} message
 */
export function useToast() {
  const toasts = ref([])
  let counter = 0

  /** @type {Record<string, { icon: string, bgClass: string, iconClass: string }>} */
  const config = {
    success: {
      icon: 'circle-check',
      bgClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
      iconClass: 'text-green-500 dark:text-green-400',
    },
    error: {
      icon: 'alert-triangle',
      bgClass: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
      iconClass: 'text-red-500 dark:text-red-400',
    },
    warning: {
      icon: 'alert-circle',
      bgClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200',
      iconClass: 'text-amber-500 dark:text-amber-400',
    },
    info: {
      icon: 'info-circle',
      bgClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
      iconClass: 'text-blue-500 dark:text-blue-400',
    },
  }

  /**
   * Show a toast notification
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} message
   * @param {number} [duration=4000] - Auto-dismiss in ms (0 for persistent)
   * @returns {string} Toast ID
   */
  function show(type, message, duration = 4000) {
    const id = `toast-${++counter}-${Date.now()}`
    const toast = reactiveToast({ id, type, message, duration })
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  /**
   * @param {string} message
   * @param {number} [duration]
   */
  const success = (message, duration) => show('success', message, duration)

  /**
   * @param {string} message
   * @param {number} [duration]
   */
  const error = (message, duration) => show('error', message, duration)

  /**
   * @param {string} message
   * @param {number} [duration]
   */
  const warning = (message, duration) => show('warning', message, duration)

  /**
   * @param {string} message
   * @param {number} [duration]
   */
  const info = (message, duration) => show('info', message, duration)

  /**
   * Remove a toast by ID
   * @param {string} id
   */
  function remove(id) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  /** Clear all toasts */
  function clearAll() {
    toasts.value = []
  }

  return { toasts, config, show, success, error, warning, info, remove, clearAll }
}

/**
 * Create a reactive toast object with render properties
 * @param {Toast} raw
 * @returns {Toast}
 */
function reactiveToast(raw) {
  return raw
}
