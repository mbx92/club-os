/**
 * Standardized Error Codes
 * Maps to frontend ERROR_MESSAGES for consistent error handling
 */

const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    statusCode: 401,
    message: 'Email atau password salah'
  },
  TENANT_INACTIVE: {
    code: 'TENANT_INACTIVE',
    statusCode: 403,
    message: 'Akun organisasi tidak aktif'
  },
  USER_INACTIVE: {
    code: 'USER_INACTIVE',
    statusCode: 403,
    message: 'Akun pengguna tidak aktif'
  },
  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    statusCode: 423,
    message: 'Akun terkunci karena terlalu banyak percobaan login gagal'
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    statusCode: 401,
    message: 'Token telah kedaluwarsa'
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    statusCode: 401,
    message: 'Token tidak valid'
  },
  NO_TOKEN: {
    code: 'NO_TOKEN',
    statusCode: 401,
    message: 'Token tidak ditemukan'
  },
  INVALID_TOKEN_FORMAT: {
    code: 'INVALID_TOKEN_FORMAT',
    statusCode: 401,
    message: 'Format token tidak valid'
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    statusCode: 401,
    message: 'Pengguna tidak ditemukan'
  },

  // Subscription Errors
  SUBSCRIPTION_REQUIRED: {
    code: 'SUBSCRIPTION_REQUIRED',
    statusCode: 402,
    message: 'Langganan diperlukan untuk mengakses fitur ini'
  },
  SUBSCRIPTION_EXPIRED: {
    code: 'SUBSCRIPTION_EXPIRED',
    statusCode: 402,
    message: 'Langganan telah berakhir'
  },
  SUBSCRIPTION_SUSPENDED: {
    code: 'SUBSCRIPTION_SUSPENDED',
    statusCode: 402,
    message: 'Langganan ditangguhkan'
  },
  TRIAL_EXPIRED: {
    code: 'TRIAL_EXPIRED',
    statusCode: 402,
    message: 'Periode trial telah berakhir'
  },

  // Permission Errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    statusCode: 401,
    message: 'Tidak memiliki izin akses'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    statusCode: 403,
    message: 'Akses ditolak'
  },
  MODULE_NOT_AVAILABLE: {
    code: 'MODULE_NOT_AVAILABLE',
    statusCode: 403,
    message: 'Modul tidak tersedia di paket langganan Anda'
  },
  FEATURE_NOT_AVAILABLE: {
    code: 'FEATURE_NOT_AVAILABLE',
    statusCode: 403,
    message: 'Fitur tidak tersedia di paket langganan Anda'
  },
  LIMIT_REACHED: {
    code: 'LIMIT_REACHED',
    statusCode: 403,
    message: 'Batas maksimum tercapai'
  },

  // Validation Errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    statusCode: 400,
    message: 'Validasi gagal'
  },
  DUPLICATE_ENTRY: {
    code: 'DUPLICATE_ENTRY',
    statusCode: 409,
    message: 'Data sudah ada'
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    statusCode: 400,
    message: 'Input tidak valid'
  },
  INVALID_OPERATION: {
    code: 'INVALID_OPERATION',
    statusCode: 400,
    message: 'Operasi tidak valid'
  },

  // Resource Errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    statusCode: 404,
    message: 'Data tidak ditemukan'
  },
  ALREADY_EXISTS: {
    code: 'ALREADY_EXISTS',
    statusCode: 409,
    message: 'Resource sudah ada'
  },
  RESOURCE_LOCKED: {
    code: 'RESOURCE_LOCKED',
    statusCode: 423,
    message: 'Resource sedang digunakan'
  },

  // Payment Errors
  PAYMENT_REQUIRED: {
    code: 'PAYMENT_REQUIRED',
    statusCode: 402,
    message: 'Pembayaran diperlukan'
  },
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    statusCode: 402,
    message: 'Pembayaran gagal'
  },
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    statusCode: 402,
    message: 'Saldo tidak mencukupi'
  },
  INSUFFICIENT_PAYMENT: {
    code: 'INSUFFICIENT_PAYMENT',
    statusCode: 400,
    message: 'Pembayaran tidak mencukupi'
  },

  // Service/Membership Errors
  MEMBER_NOT_FOUND: {
    code: 'MEMBER_NOT_FOUND',
    statusCode: 404,
    message: 'Member tidak ditemukan'
  },
  MEMBER_INACTIVE: {
    code: 'MEMBER_INACTIVE',
    statusCode: 400,
    message: 'Member tidak aktif'
  },
  NO_VALID_SERVICE: {
    code: 'NO_VALID_SERVICE',
    statusCode: 400,
    message: 'Tidak ada layanan yang valid'
  },
  NO_ACTIVE_MEMBERSHIP: {
    code: 'NO_ACTIVE_MEMBERSHIP',
    statusCode: 400,
    message: 'Tidak ada membership aktif'
  },
  MAX_CHECKINS_REACHED: {
    code: 'MAX_CHECKINS_REACHED',
    statusCode: 400,
    message: 'Batas maksimal check-in telah tercapai'
  },
  CHECK_IN_NOT_FOUND: {
    code: 'CHECK_IN_NOT_FOUND',
    statusCode: 404,
    message: 'Data check-in tidak ditemukan'
  },
  SERVICE_PLAN_NOT_FOUND: {
    code: 'SERVICE_PLAN_NOT_FOUND',
    statusCode: 404,
    message: 'Paket layanan tidak ditemukan'
  },
  TRAINER_NOT_FOUND: {
    code: 'TRAINER_NOT_FOUND',
    statusCode: 404,
    message: 'Trainer tidak ditemukan'
  },
  ACTIVE_SERVICE_NOT_FOUND: {
    code: 'ACTIVE_SERVICE_NOT_FOUND',
    statusCode: 404,
    message: 'Layanan aktif tidak ditemukan'
  },
  SERVICE_NOT_ACTIVE: {
    code: 'SERVICE_NOT_ACTIVE',
    statusCode: 400,
    message: 'Layanan tidak aktif'
  },
  NOT_SESSION_BASED: {
    code: 'NOT_SESSION_BASED',
    statusCode: 400,
    message: 'Layanan ini bukan berbasis sesi'
  },
  ALREADY_CANCELLED: {
    code: 'ALREADY_CANCELLED',
    statusCode: 400,
    message: 'Layanan sudah dibatalkan'
  },
  LIMIT_EXCEEDED: {
    code: 'LIMIT_EXCEEDED',
    statusCode: 403,
    message: 'Batas maksimum terlampaui'
  },

  // Voucher Errors
  VOUCHER_INVALID: {
    code: 'VOUCHER_INVALID',
    statusCode: 404,
    message: 'Voucher tidak valid atau tidak ditemukan'
  },
  VOUCHER_EXPIRED: {
    code: 'VOUCHER_EXPIRED',
    statusCode: 400,
    message: 'Voucher telah kedaluwarsa'
  },
  VOUCHER_LIMIT_REACHED: {
    code: 'VOUCHER_LIMIT_REACHED',
    statusCode: 400,
    message: 'Batas penggunaan voucher telah tercapai'
  },
  VOUCHER_USER_LIMIT_REACHED: {
    code: 'VOUCHER_USER_LIMIT_REACHED',
    statusCode: 400,
    message: 'Anda telah mencapai batas penggunaan voucher ini'
  },
  VOUCHER_MEMBER_LIMIT_REACHED: {
    code: 'VOUCHER_MEMBER_LIMIT_REACHED',
    statusCode: 400,
    message: 'Member telah mencapai batas penggunaan voucher ini'
  },
  VOUCHER_MIN_PURCHASE: {
    code: 'VOUCHER_MIN_PURCHASE',
    statusCode: 400,
    message: 'Minimum pembelian tidak terpenuhi'
  },

  // Transaction Errors
  TRANSACTION_NOT_FOUND: {
    code: 'TRANSACTION_NOT_FOUND',
    statusCode: 404,
    message: 'Transaksi tidak ditemukan'
  },
  ALREADY_REFUNDED: {
    code: 'ALREADY_REFUNDED',
    statusCode: 400,
    message: 'Transaksi sudah di-refund'
  },
  CANNOT_REFUND_CANCELLED: {
    code: 'CANNOT_REFUND_CANCELLED',
    statusCode: 400,
    message: 'Tidak dapat refund transaksi yang sudah dibatalkan'
  },
  REFUND_REASON_REQUIRED: {
    code: 'REFUND_REASON_REQUIRED',
    statusCode: 400,
    message: 'Alasan refund harus diisi'
  },

  // Server Errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    message: 'Kesalahan server internal'
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    statusCode: 503,
    message: 'Layanan tidak tersedia'
  },
  MAINTENANCE: {
    code: 'MAINTENANCE',
    statusCode: 503,
    message: 'Sistem dalam maintenance'
  },
  PRINTER_ERROR: {
    code: 'PRINTER_ERROR',
    statusCode: 500,
    message: 'Kesalahan pada printer'
  },

  // Network Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    statusCode: 500,
    message: 'Kesalahan jaringan'
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    statusCode: 408,
    message: 'Request timeout'
  },

  // ==========================================
  // Psychology Module Errors
  // ==========================================

  // Test Type Errors
  TEST_TYPE_NOT_FOUND: {
    code: 'TEST_TYPE_NOT_FOUND',
    statusCode: 404,
    message: 'Tipe tes tidak ditemukan'
  },
  TEST_TYPE_ALREADY_EXISTS: {
    code: 'TEST_TYPE_ALREADY_EXISTS',
    statusCode: 409,
    message: 'Tipe tes dengan kode ini sudah ada'
  },
  TEST_TYPE_IN_USE: {
    code: 'TEST_TYPE_IN_USE',
    statusCode: 400,
    message: 'Tipe tes sedang digunakan dalam paket'
  },
  INVALID_QUESTIONS_FORMAT: {
    code: 'INVALID_QUESTIONS_FORMAT',
    statusCode: 400,
    message: 'Format pertanyaan tidak valid'
  },
  QUESTIONS_VALIDATION_FAILED: {
    code: 'QUESTIONS_VALIDATION_FAILED',
    statusCode: 400,
    message: 'Validasi pertanyaan gagal'
  },

  // Patient Errors
  PATIENT_NOT_FOUND: {
    code: 'PATIENT_NOT_FOUND',
    statusCode: 404,
    message: 'Pasien tidak ditemukan'
  },
  PATIENT_EMAIL_EXISTS: {
    code: 'PATIENT_EMAIL_EXISTS',
    statusCode: 409,
    message: 'Pasien dengan email ini sudah ada'
  },
  PATIENT_HAS_ORDERS: {
    code: 'PATIENT_HAS_ORDERS',
    statusCode: 400,
    message: 'Tidak dapat menghapus pasien yang memiliki pesanan'
  },

  // Package Errors
  PSYCHOLOGY_PACKAGE_NOT_FOUND: {
    code: 'PSYCHOLOGY_PACKAGE_NOT_FOUND',
    statusCode: 404,
    message: 'Paket psikotes tidak ditemukan'
  },
  PSYCHOLOGY_PACKAGE_INACTIVE: {
    code: 'PSYCHOLOGY_PACKAGE_INACTIVE',
    statusCode: 400,
    message: 'Paket psikotes tidak aktif'
  },
  PSYCHOLOGY_PACKAGE_HAS_ORDERS: {
    code: 'PSYCHOLOGY_PACKAGE_HAS_ORDERS',
    statusCode: 400,
    message: 'Tidak dapat menghapus paket yang memiliki pesanan'
  },
  TEST_TYPES_REQUIRED: {
    code: 'TEST_TYPES_REQUIRED',
    statusCode: 400,
    message: 'Minimal satu tipe tes diperlukan'
  },
  TEST_TYPES_NOT_FOUND: {
    code: 'TEST_TYPES_NOT_FOUND',
    statusCode: 400,
    message: 'Satu atau lebih tipe tes tidak ditemukan'
  },

  // Order Errors
  PSYCHOLOGY_ORDER_NOT_FOUND: {
    code: 'PSYCHOLOGY_ORDER_NOT_FOUND',
    statusCode: 404,
    message: 'Pesanan psikotes tidak ditemukan'
  },
  PSYCHOLOGY_ORDER_NOT_PAID: {
    code: 'PSYCHOLOGY_ORDER_NOT_PAID',
    statusCode: 400,
    message: 'Pesanan belum dibayar'
  },
  PSYCHOLOGY_ORDER_CANCELLED: {
    code: 'PSYCHOLOGY_ORDER_CANCELLED',
    statusCode: 400,
    message: 'Pesanan telah dibatalkan'
  },
  PSYCHOLOGY_ORDER_HAS_COMPLETED_SESSIONS: {
    code: 'PSYCHOLOGY_ORDER_HAS_COMPLETED_SESSIONS',
    statusCode: 400,
    message: 'Tidak dapat membatalkan pesanan dengan sesi yang sudah selesai'
  },
  CANNOT_GENERATE_TOKEN_UNPAID: {
    code: 'CANNOT_GENERATE_TOKEN_UNPAID',
    statusCode: 400,
    message: 'Tidak dapat membuat token untuk pesanan yang belum dibayar'
  },

  // Session Errors
  SESSION_NOT_FOUND: {
    code: 'SESSION_NOT_FOUND',
    statusCode: 404,
    message: 'Sesi tes tidak ditemukan'
  },
  SESSION_ALREADY_COMPLETED: {
    code: 'SESSION_ALREADY_COMPLETED',
    statusCode: 400,
    message: 'Sesi tes sudah selesai'
  },
  SESSION_NOT_STARTED: {
    code: 'SESSION_NOT_STARTED',
    statusCode: 400,
    message: 'Sesi tes belum dimulai'
  },
  SESSION_NOT_COMPLETED: {
    code: 'SESSION_NOT_COMPLETED',
    statusCode: 400,
    message: 'Sesi tes belum selesai'
  },
  NO_ANSWERS_TO_SCORE: {
    code: 'NO_ANSWERS_TO_SCORE',
    statusCode: 400,
    message: 'Tidak ada jawaban untuk dinilai'
  },
  CANNOT_MODIFY_COMPLETED_SESSION: {
    code: 'CANNOT_MODIFY_COMPLETED_SESSION',
    statusCode: 400,
    message: 'Tidak dapat mengubah sesi yang sudah selesai'
  },

  // Invitation Errors
  INVITATION_NOT_FOUND: {
    code: 'INVITATION_NOT_FOUND',
    statusCode: 404,
    message: 'Undangan tidak ditemukan'
  },
  INVITATION_INVALID: {
    code: 'INVITATION_INVALID',
    statusCode: 403,
    message: 'Undangan tidak valid atau sudah kedaluwarsa'
  },
  INVITATION_EXPIRED: {
    code: 'INVITATION_EXPIRED',
    statusCode: 403,
    message: 'Undangan sudah kedaluwarsa'
  },
  INVITATION_LIMIT_REACHED: {
    code: 'INVITATION_LIMIT_REACHED',
    statusCode: 403,
    message: 'Batas penggunaan undangan telah tercapai'
  },
  INVITATION_HAS_REGISTRATIONS: {
    code: 'INVITATION_HAS_REGISTRATIONS',
    statusCode: 400,
    message: 'Tidak dapat menghapus undangan dengan pendaftaran aktif'
  },
  ALREADY_REGISTERED_INVITATION: {
    code: 'ALREADY_REGISTERED_INVITATION',
    statusCode: 409,
    message: 'Anda sudah terdaftar untuk tes ini'
  },

  // Access Token Errors
  ACCESS_TOKEN_INVALID: {
    code: 'ACCESS_TOKEN_INVALID',
    statusCode: 403,
    message: 'Token akses tidak valid'
  },
  ACCESS_TOKEN_EXPIRED: {
    code: 'ACCESS_TOKEN_EXPIRED',
    statusCode: 403,
    message: 'Token akses sudah kedaluwarsa'
  },

  // Price Rule Errors
  PRICE_RULE_NOT_FOUND: {
    code: 'PRICE_RULE_NOT_FOUND',
    statusCode: 404,
    message: 'Aturan harga tidak ditemukan'
  },
  PROMO_CODE_EXISTS: {
    code: 'PROMO_CODE_EXISTS',
    statusCode: 409,
    message: 'Kode promo sudah ada'
  },
  PROMO_CODE_INVALID: {
    code: 'PROMO_CODE_INVALID',
    statusCode: 400,
    message: 'Kode promo tidak valid atau sudah kedaluwarsa'
  },
  PROMO_CODE_LIMIT_REACHED: {
    code: 'PROMO_CODE_LIMIT_REACHED',
    statusCode: 400,
    message: 'Batas penggunaan kode promo telah tercapai'
  },
  PRICE_RULE_IN_USE: {
    code: 'PRICE_RULE_IN_USE',
    statusCode: 400,
    message: 'Tidak dapat menghapus aturan harga yang sudah digunakan'
  },

  // Database Backup/Restore Errors
  BACKUP_FAILED: {
    code: 'BACKUP_FAILED',
    statusCode: 500,
    message: 'Database backup gagal'
  },
  RESTORE_FAILED: {
    code: 'RESTORE_FAILED',
    statusCode: 500,
    message: 'Database restore gagal'
  }
};

/**
 * Create a standardized error response
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} customMessage - Optional custom message
 * @param {object} data - Optional additional data
 * @returns {Error} Error object with standardized properties
 */
function createError(errorCode, customMessage = null, data = null) {
  const errorDef = ERROR_CODES[errorCode];
  
  if (!errorDef) {
    throw new Error(`Unknown error code: ${errorCode}`);
  }

  const error = new Error(customMessage || errorDef.message);
  error.code = errorDef.code;
  error.statusCode = errorDef.statusCode;
  error.isOperational = true; // Marks as expected error
  
  if (data) {
    error.data = data;
  }

  return error;
}

module.exports = {
  ERROR_CODES,
  createError
};
