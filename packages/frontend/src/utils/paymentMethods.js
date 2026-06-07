export const PAYMENT_METHODS = {
  cash: 'cash',
  credit_card: 'credit_card',
  debit_card: 'debit_card',
  bank_transfer: 'bank_transfer',
  qris: 'qris',
  e_wallet: 'e_wallet',
  payment_gateway: 'payment_gateway',
  compliment: 'compliment',
}

export const ID_LABELS = {
  cash: 'Tunai',
  credit_card: 'Kartu',
  debit_card: 'Kartu Debit',
  bank_transfer: 'Transfer Bank',
  qris: 'QRIS',
  e_wallet: 'E-Wallet',
  payment_gateway: 'Payment Gateway',
  compliment: 'Gratis (Compliment)',
  card: 'Kartu',
  ewallet: 'E-Wallet',
  transfer: 'Transfer Bank',
  bni: 'BNI',
  bca: 'BCA',
  mandiri: 'Mandiri',
  gojek: 'Gojek',
}

export const EN_LABELS = {
  cash: 'Cash',
  credit_card: 'Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  qris: 'QRIS',
  e_wallet: 'E-Wallet',
  payment_gateway: 'Payment Gateway',
  compliment: 'Compliment',
  card: 'Card',
  ewallet: 'E-Wallet',
  transfer: 'Bank Transfer',
}

export const PAYMENT_FEATURE_KEY_MAP = {
  cash: 'cash',
  bankTransfer: 'bank_transfer',
  bank_transfer: 'bank_transfer',
  creditCard: 'credit_card',
  credit_card: 'credit_card',
  debitCard: 'debit_card',
  debit_card: 'debit_card',
  eWallet: 'e_wallet',
  e_wallet: 'e_wallet',
  ewallet: 'e_wallet',
  paymentGateway: 'payment_gateway',
  payment_gateway: 'payment_gateway',
  qris: 'qris',
  compliment: 'compliment',
  card: 'credit_card',
  transfer: 'bank_transfer',
}

export const BADGE_CLASSES = {
  cash: 'badge-success',
  credit_card: 'badge-info',
  debit_card: 'badge-info',
  bank_transfer: 'badge-accent',
  qris: 'badge-warning',
  e_wallet: 'badge-secondary',
  compliment: 'badge-ghost',
  card: 'badge-info',
  ewallet: 'badge-secondary',
  transfer: 'badge-accent',
}

export const BG_CLASSES = {
  cash: 'bg-success',
  credit_card: 'bg-primary',
  debit_card: 'bg-info',
  bank_transfer: 'bg-warning',
  qris: 'bg-secondary',
  e_wallet: 'bg-accent',
  compliment: 'bg-base-content/30',
  gojek: 'bg-success',
  bni: 'bg-warning',
  bca: 'bg-info',
  mandiri: 'bg-primary',
}

export const CARD_KEYS = new Set([
  'credit_card',
  'debit_card',
  'card',
  'bni',
  'bca',
  'mandiri',
])

export const isCardPayment = (key) => CARD_KEYS.has(key)

export const getPaymentLabel = (method, locale = 'id') => {
  const labels = locale === 'id' ? ID_LABELS : EN_LABELS
  return labels[method] || labels[method?.toLowerCase()] || method || '-'
}

export const getPaymentBadgeClass = (method) => {
  return BADGE_CLASSES[method] || BADGE_CLASSES[method?.toLowerCase()] || 'badge-ghost'
}

export const getPaymentBgClass = (method) => {
  return BG_CLASSES[method] || 'bg-base-content/30'
}
