// Error message mapping untuk berbagai error codes dari backend
// Ini memudahkan maintenance dan internationalization

export const ERROR_MESSAGES = {
  // Authentication Errors
  INVALID_CREDENTIALS: {
    title: 'Login Gagal',
    message: 'Email atau password salah. Silakan coba lagi.',
    type: 'error'
  },
  TENANT_INACTIVE: {
    title: 'Akun Tidak Aktif',
    message: 'Akun organisasi Anda tidak aktif. Silakan hubungi support untuk mengaktifkan kembali.',
    type: 'error'
  },
  USER_INACTIVE: {
    title: 'Akun Tidak Aktif',
    message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
    type: 'error'
  },
  ACCOUNT_LOCKED: {
    title: 'Akun Terkunci',
    message: 'Akun Anda telah dikunci karena terlalu banyak percobaan login yang gagal.',
    type: 'error'
  },
  TOKEN_EXPIRED: {
    title: 'Sesi Berakhir',
    message: 'Sesi Anda telah berakhir. Silakan login kembali.',
    type: 'warning'
  },
  INVALID_TOKEN: {
    title: 'Token Tidak Valid',
    message: 'Token autentikasi tidak valid. Silakan login kembali.',
    type: 'error'
  },

  // Subscription Errors
  SUBSCRIPTION_REQUIRED: {
    title: 'Langganan Diperlukan',
    message: 'Fitur ini memerlukan langganan aktif. Silakan berlangganan terlebih dahulu.',
    type: 'warning'
  },
  SUBSCRIPTION_EXPIRED: {
    title: 'Langganan Berakhir',
    message: 'Langganan Anda telah berakhir. Silakan perpanjang untuk melanjutkan.',
    type: 'error'
  },
  SUBSCRIPTION_SUSPENDED: {
    title: 'Langganan Ditangguhkan',
    message: 'Langganan Anda telah ditangguhkan. Silakan hubungi support.',
    type: 'error'
  },
  TRIAL_EXPIRED: {
    title: 'Trial Berakhir',
    message: 'Periode trial Anda telah berakhir. Silakan berlangganan untuk melanjutkan.',
    type: 'warning'
  },

  // Permission Errors
  UNAUTHORIZED: {
    title: 'Akses Ditolak',
    message: 'Anda tidak memiliki izin untuk mengakses fitur ini.',
    type: 'error'
  },
  FORBIDDEN: {
    title: 'Terlarang',
    message: 'Akses ke resource ini dilarang.',
    type: 'error'
  },
  MODULE_NOT_AVAILABLE: {
    title: 'Modul Tidak Tersedia',
    message: 'Modul ini tidak tersedia di paket langganan Anda.',
    type: 'warning'
  },
  FEATURE_NOT_AVAILABLE: {
    title: 'Fitur Tidak Tersedia',
    message: 'Fitur ini tidak tersedia di paket langganan Anda.',
    type: 'warning'
  },
  LIMIT_REACHED: {
    title: 'Batas Tercapai',
    message: 'Anda telah mencapai batas maksimum untuk resource ini.',
    type: 'warning'
  },

  // Validation Errors
  VALIDATION_ERROR: {
    title: 'Validasi Gagal',
    message: 'Data yang Anda masukkan tidak valid. Silakan periksa kembali.',
    type: 'error'
  },
  DUPLICATE_ENTRY: {
    title: 'Data Duplikat',
    message: 'Data yang Anda masukkan sudah ada dalam sistem.',
    type: 'error'
  },
  INVALID_INPUT: {
    title: 'Input Tidak Valid',
    message: 'Input yang Anda masukkan tidak valid.',
    type: 'error'
  },

  // Resource Errors
  NOT_FOUND: {
    title: 'Tidak Ditemukan',
    message: 'Data yang Anda cari tidak ditemukan.',
    type: 'error'
  },
  ALREADY_EXISTS: {
    title: 'Sudah Ada',
    message: 'Resource yang Anda coba buat sudah ada.',
    type: 'error'
  },
  RESOURCE_LOCKED: {
    title: 'Resource Terkunci',
    message: 'Resource ini sedang digunakan dan tidak dapat dimodifikasi.',
    type: 'warning'
  },

  // Payment Errors
  PAYMENT_REQUIRED: {
    title: 'Pembayaran Diperlukan',
    message: 'Silakan selesaikan pembayaran untuk melanjutkan.',
    type: 'warning'
  },
  PAYMENT_FAILED: {
    title: 'Pembayaran Gagal',
    message: 'Pembayaran Anda gagal diproses. Silakan coba lagi.',
    type: 'error'
  },
  INSUFFICIENT_BALANCE: {
    title: 'Saldo Tidak Cukup',
    message: 'Saldo Anda tidak mencukupi untuk transaksi ini.',
    type: 'error'
  },

  // Server Errors
  INTERNAL_ERROR: {
    title: 'Kesalahan Server',
    message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    type: 'error'
  },
  SERVICE_UNAVAILABLE: {
    title: 'Layanan Tidak Tersedia',
    message: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
    type: 'error'
  },
  MAINTENANCE: {
    title: 'Maintenance',
    message: 'Sistem sedang dalam maintenance. Silakan coba lagi nanti.',
    type: 'info'
  },

  // Network Errors
  NETWORK_ERROR: {
    title: 'Kesalahan Jaringan',
    message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    type: 'error'
  },
  TIMEOUT: {
    title: 'Timeout',
    message: 'Request timeout. Silakan coba lagi.',
    type: 'error'
  }
}

/**
 * Get error message configuration by error code
 * @param {string} errorCode - Error code from backend
 * @param {string} customMessage - Custom message from backend (optional)
 * @returns {object} Error configuration with title, message, and type
 */
export function getErrorConfig(errorCode, customMessage = null) {
  const config = ERROR_MESSAGES[errorCode]
  
  if (!config) {
    // Default error if code not found
    return {
      title: 'Error',
      message: customMessage || 'Terjadi kesalahan. Silakan coba lagi.',
      type: 'error'
    }
  }

  // Use custom message from backend if provided, otherwise use default
  return {
    ...config,
    message: customMessage || config.message
  }
}

/**
 * Get user-friendly error message from error code
 * @param {string} errorCode - Error code from backend
 * @param {string} customMessage - Custom message from backend (optional)
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(errorCode, customMessage = null) {
  const config = getErrorConfig(errorCode, customMessage)
  return config.message
}

/**
 * Get error title from error code
 * @param {string} errorCode - Error code from backend
 * @returns {string} Error title
 */
export function getErrorTitle(errorCode) {
  const config = ERROR_MESSAGES[errorCode]
  return config?.title || 'Error'
}

/**
 * Get error type (for styling)
 * @param {string} errorCode - Error code from backend
 * @returns {string} Error type: 'error', 'warning', 'info'
 */
export function getErrorType(errorCode) {
  const config = ERROR_MESSAGES[errorCode]
  return config?.type || 'error'
}
