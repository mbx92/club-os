export const DEFAULT_BANK_OPTIONS = [
  { value: 'BCA', label: 'BCA' },
  { value: 'MANDIRI', label: 'MANDIRI' },
]

/** @deprecated Use usePaymentBanks().bankOptions — kept as fallback default */
export const BANK_OPTIONS = DEFAULT_BANK_OPTIONS

export const BANK_SELECTION_PAYMENT_METHODS = ['bank_transfer', 'credit_card', 'debit_card', 'qris']

export const BANK_CATALOG = [
  { key: 'BCA', label: 'BCA', enabled: true, isSystem: true },
  { key: 'MANDIRI', label: 'MANDIRI', enabled: true, isSystem: true },
]

export const buildDefaultBanks = () =>
  BANK_CATALOG.map((bank) => ({ ...bank }))

export const normalizeBankKey = (key) =>
  String(key || '').trim().toUpperCase()

/**
 * Convert tenant bank config to dropdown options.
 * Falls back to DEFAULT_BANK_OPTIONS when empty.
 */
export const banksToOptions = (banks) => {
  const enabled = (Array.isArray(banks) ? banks : [])
    .filter((bank) => bank && bank.enabled !== false)
    .map((bank) => {
      const value = normalizeBankKey(bank.key || bank.value)
      const label = String(bank.label || value).trim()
      return value ? { value, label: label || value } : null
    })
    .filter(Boolean)

  return enabled.length ? enabled : DEFAULT_BANK_OPTIONS.map((b) => ({ ...b }))
}

export const buildPaymentBankPayload = (paymentMethod, bankName) => {
  const normalizedBankName = typeof bankName === 'string' ? bankName.trim() : ''

  if (!normalizedBankName) {
    return {}
  }

  const payload = {
    paymentDetails: {
      bank: normalizeBankKey(normalizedBankName)
    }
  }

  if (paymentMethod === 'bank_transfer') {
    payload.bankName = normalizeBankKey(normalizedBankName)
  }

  return payload
}
