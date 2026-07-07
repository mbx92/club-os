export const BANK_OPTIONS = [
  { value: 'BCA', label: 'BCA' },
  { value: 'MANDIRI', label: 'MANDIRI' }
]

export const BANK_SELECTION_PAYMENT_METHODS = ['bank_transfer', 'credit_card', 'debit_card']

export const buildPaymentBankPayload = (paymentMethod, bankName) => {
  const normalizedBankName = typeof bankName === 'string' ? bankName.trim() : ''

  if (!normalizedBankName) {
    return {}
  }

  const payload = {
    paymentDetails: {
      bank: normalizedBankName
    }
  }

  if (paymentMethod === 'bank_transfer') {
    payload.bankName = normalizedBankName
  }

  return payload
}
