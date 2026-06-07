import { ref } from 'vue'
import { getErrorConfig } from '@/utils/errorMessages'

/**
 * Composable for handling API errors with standardized error display
 */
export function useErrorHandler() {
  const error = ref(null)
  const errorTitle = ref('')
  const errorMessage = ref('')
  const errorType = ref('error')

  /**
   * Extract error code from various error object structures
   */
  const extractErrorCode = (err) => {
    return err?.code || 
           err?.data?.code || 
           err?.response?.data?.code ||
           null
  }

  /**
   * Extract error message from various error object structures
   */
  const extractErrorMessage = (err) => {
    return err?.message || 
           err?.data?.message || 
           err?.response?.data?.message ||
           'An unexpected error occurred'
  }

  /**
   * Set error from error object
   */
  const setError = (err) => {
    error.value = err
    
    const errorCode = extractErrorCode(err)
    const customMessage = extractErrorMessage(err)
    
    if (errorCode) {
      const config = getErrorConfig(errorCode, customMessage)
      errorTitle.value = config.title
      errorMessage.value = config.message
      errorType.value = config.type
    } else {
      errorTitle.value = 'Error'
      errorMessage.value = customMessage
      errorType.value = 'error'
    }
  }

  /**
   * Set error with custom title and message
   */
  const setCustomError = (title, message, type = 'error') => {
    errorTitle.value = title
    errorMessage.value = message
    errorType.value = type
  }

  /**
   * Clear error
   */
  const clearError = () => {
    error.value = null
    errorTitle.value = ''
    errorMessage.value = ''
    errorType.value = 'error'
  }

  /**
   * Check if there is an error
   */
  const hasError = () => {
    return !!error.value || !!errorMessage.value
  }

  /**
   * Handle error from API call
   * Returns true if error was handled, false otherwise
   */
  const handleError = (err, fallbackMessage = null) => {
    if (!err) {
      clearError()
      return false
    }

    const errorCode = extractErrorCode(err)
    
    if (errorCode) {
      const customMessage = extractErrorMessage(err)
      const config = getErrorConfig(errorCode, customMessage)
      errorTitle.value = config.title
      errorMessage.value = config.message
      errorType.value = config.type
      error.value = err
      return true
    }

    // No error code found, use fallback
    if (fallbackMessage) {
      errorTitle.value = 'Error'
      errorMessage.value = fallbackMessage
      errorType.value = 'error'
      error.value = err
      return true
    }

    // Try to extract message from error
    const message = extractErrorMessage(err)
    errorTitle.value = 'Error'
    errorMessage.value = message
    errorType.value = 'error'
    error.value = err
    return true
  }

  return {
    // State
    error,
    errorTitle,
    errorMessage,
    errorType,
    
    // Methods
    setError,
    setCustomError,
    clearError,
    hasError,
    handleError
  }
}
