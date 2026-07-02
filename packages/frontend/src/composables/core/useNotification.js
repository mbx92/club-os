import { ref } from 'vue'
import { getErrorConfig } from '@/utils/errorMessages'
import {
  captureFrontendException,
  shouldReportHandledFrontendError
} from '@/services/glitchtip'

const notifications = ref([])
let notificationId = 0

/**
 * Parse error message from various error formats
 * @param {Error|Object|String} error - Error object, API response, or string
 * @returns {String} - Parsed error message
 */
const parseErrorMessage = (error) => {
  // If it's a string, return directly
  if (typeof error === 'string') {
    return error
  }

  // If it's an Error object with code, try to get message from mapping
  if (error && error.code) {
    const config = getErrorConfig(error.code, error.message)
    return config.message
  }

  // If it's an Error object
  if (error instanceof Error) {
    // Check if it's a fetch error with statusCode
    if (error.statusCode === 404) {
      return 'Resource not found'
    }
    if (error.statusCode === 403) {
      return 'Access denied'
    }
    if (error.statusCode === 401) {
      return 'Unauthorized access'
    }
    if (error.statusCode === 500) {
      return 'Server error occurred'
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return 'Request failed'
    }
    if (error.statusCode >= 500) {
      return 'Server error occurred'
    }
    
    // Return clean message without URL
    return error.message?.replace(/\[GET\]|\[POST\]|\[PUT\]|\[DELETE\]|\[PATCH\]/g, '').trim() || 'An unexpected error occurred'
  }

  // If it's an API error response object
  if (error && typeof error === 'object') {
    // Check for error code first
    const errorCode = error.code || error.data?.code || error.response?.data?.code
    if (errorCode) {
      const customMessage = error.message || error.data?.message || error.response?.data?.message
      const config = getErrorConfig(errorCode, customMessage)
      return config.message
    }
    
    // Check for status code
    if (error.statusCode === 404 || error.status === 404) {
      return 'Resource not found'
    }
    if (error.statusCode === 403 || error.status === 403) {
      return 'Access denied'
    }
    if (error.statusCode === 401 || error.status === 401) {
      return 'Unauthorized access'
    }
    if (error.statusCode === 500 || error.status === 500) {
      return 'Server error occurred'
    }
    
    // Check for common API error formats
    if (error.message) {
      // Clean up message - remove HTTP methods and URLs
      const cleanMessage = error.message
        .replace(/\[GET\]|\[POST\]|\[PUT\]|\[DELETE\]|\[PATCH\]/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\d{3}\s+(Not Found|Forbidden|Unauthorized|Internal Server Error|Bad Request)/gi, '')
        .trim()
      
      if (cleanMessage && cleanMessage !== 'An unexpected error occurred') {
        return cleanMessage
      }
    }
    if (error.error) {
      return typeof error.error === 'string' ? error.error : error.error.message || 'An error occurred'
    }
    if (error.data?.message) {
      return error.data.message
    }
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    if (error.statusText && error.statusText !== 'Not Found') {
      return error.statusText
    }
  }

  return 'An unexpected error occurred'
}

/**
 * Parse error configuration (title, message, type) from error object
 * @param {Error|Object|String} error - Error object, API response, or string
 * @returns {Object} - Error configuration with title, message, and type
 */
const parseErrorConfig = (error) => {
  // Check for error code in various locations
  const errorCode = error?.code || error?.data?.code || error?.response?.data?.code
  const customMessage = error?.message || error?.data?.message || error?.response?.data?.message

  if (errorCode) {
    return getErrorConfig(errorCode, customMessage)
  }

  // Return default config
  return {
    title: 'Error',
    message: parseErrorMessage(error),
    type: 'error'
  }
}

export const useNotification = () => {
  const showNotification = (message, type = 'info', duration = 3000, title = '') => {
    const id = ++notificationId
    const notification = {
      id,
      message,
      type,
      title,
      duration,
      visible: true
    }
    
    notifications.value.push(notification)
    
    // Auto remove after duration
    setTimeout(() => {
      const index = notifications.value.findIndex(n => n.id === id)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
    }, duration)
    
    return id
  }

  const showSuccess = (message, duration = 3000, title = '') => {
    return showNotification(message, 'success', duration, title)
  }

  const showError = (message, duration = 5000, title = '') => {
    return showNotification(message, 'error', duration, title)
  }

  const showWarning = (message, duration = 4000, title = '') => {
    return showNotification(message, 'warning', duration, title)
  }

  const showInfo = (message, duration = 3000, title = '') => {
    return showNotification(message, 'info', duration, title)
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * Handle error and show appropriate toast notification
   * @param {Error|Object|String} error - Error to handle
   * @param {String} defaultMessage - Default message if error cannot be parsed
   * @param {Number} duration - Duration to show notification
   * @returns {String} - The error message that was shown
   */
  const handleError = (error, defaultMessage = 'An error occurred', duration = 5000) => {
    const isDev = import.meta.env.DEV
    
    if (isDev) {
      console.error('[useNotification] Error:', error)
    }

    const errorConfig = parseErrorConfig(error)
    
    let message = errorConfig.message
    let title = errorConfig.title
    
    if (!message || message === 'An unexpected error occurred') {
      message = defaultMessage
    }

    showNotification(message, 'error', duration, title)

    if (shouldReportHandledFrontendError(error)) {
      captureFrontendException(error, {
        tags: {
          handled: 'true',
          source: 'useNotification'
        },
        extra: {
          defaultMessage,
          displayedMessage: message,
          displayedTitle: title
        }
      })
    }

    return message
  }

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    handleError,
    parseErrorMessage,
    parseErrorConfig
  }
}
