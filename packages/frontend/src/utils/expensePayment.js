/**
 * Shared helpers for expense payment / fund-source option mapping.
 */

export const EXPENSE_PAYMENT_OPTION_MAP = {
  cash_drawer_cash: { paymentMethod: 'cash', fundSource: 'cash_drawer' },
  vault_cash: { paymentMethod: 'cash', fundSource: 'vault' },
  petty_cash: { paymentMethod: 'petty_cash', fundSource: 'petty_cash' },
  bank_transfer: { paymentMethod: 'bank_transfer', fundSource: 'bank' },
  from_account: { fundSource: 'account' },
}

export const EXPENSE_PAYMENT_OPTIONS = [
  { value: 'from_account', label: 'Dari Akun Keuangan' },
  { value: 'cash_drawer_cash', label: 'Tunai / Laci Kasir' },
  { value: 'vault_cash', label: 'Vault / Brankas' },
  { value: 'petty_cash', label: 'Petty Cash (Modal Awal)' },
  { value: 'bank_transfer', label: 'Transfer Bank' },
]

const FUND_SOURCE_LABELS = {
  account: 'Dari Akun Keuangan',
  cash_drawer: 'Tunai / Laci Kasir',
  vault: 'Vault / Brankas',
  petty_cash: 'Petty Cash',
  bank: 'Transfer Bank',
}

const PAYMENT_METHOD_LABELS = {
  cash: 'Tunai',
  petty_cash: 'Petty Cash',
  bank_transfer: 'Transfer Bank',
  e_wallet: 'E-Wallet',
  payment_gateway: 'Payment Gateway',
  qris: 'QRIS',
  credit_card: 'Kartu',
  debit_card: 'Kartu Debit',
}

/**
 * Map stored expense fields back to a UI payment option.
 * Fund-source / account linkage always wins over raw paymentMethod.
 */
export function resolveExpensePaymentOption(expense = null, { isCashier = false } = {}) {
  if (isCashier) return 'cash_drawer_cash'
  if (!expense) return ''

  if (expense.accountId || expense.fundSource === 'account') return 'from_account'
  if (expense.fundSource === 'vault' || expense.vaultAccountId) return 'vault_cash'
  if (expense.fundSource === 'cash_drawer') return 'cash_drawer_cash'
  if (expense.fundSource === 'bank') return 'bank_transfer'
  if (expense.fundSource === 'petty_cash' || expense.paymentMethod === 'petty_cash') return 'petty_cash'
  if (expense.paymentMethod === 'bank_transfer' || expense.paymentMethod === 'transfer') return 'bank_transfer'
  if (expense.paymentMethod === 'cash') return 'cash_drawer_cash'

  // Account-origin methods without explicit fundSource (legacy / partial saves)
  if (['e_wallet', 'payment_gateway', 'qris', 'credit_card', 'debit_card'].includes(expense.paymentMethod)) {
    return 'from_account'
  }

  return expense.paymentMethod ? 'from_account' : ''
}

export function paymentMethodFromAccount(acc) {
  if (!acc) return 'bank_transfer'
  if (acc.paymentMethod) return acc.paymentMethod
  if (acc.type === 'cash') return 'cash'
  if (acc.type === 'bank') return 'bank_transfer'
  if (acc.type === 'e_wallet') return 'e_wallet'
  if (acc.type === 'payment_gateway') return 'payment_gateway'
  if (acc.type === 'petty_cash') return 'petty_cash'
  return 'bank_transfer'
}

/**
 * Human-readable fund source for expense detail / list display.
 */
export function formatExpenseFundSource(expense) {
  if (!expense) return '-'

  if (expense.account?.name) {
    const bank = expense.account.bankName ? ` (${expense.account.bankName})` : ''
    return `${expense.account.name}${bank}`
  }

  if (expense.accountId || expense.fundSource === 'account') {
    return FUND_SOURCE_LABELS.account
  }

  if (expense.vaultAccount?.name) {
    return `Vault: ${expense.vaultAccount.name}`
  }

  if (expense.fundSource && FUND_SOURCE_LABELS[expense.fundSource]) {
    return FUND_SOURCE_LABELS[expense.fundSource]
  }

  const option = resolveExpensePaymentOption(expense)
  const optionLabel = EXPENSE_PAYMENT_OPTIONS.find(o => o.value === option)?.label
  if (optionLabel) return optionLabel

  if (expense.paymentMethod && PAYMENT_METHOD_LABELS[expense.paymentMethod]) {
    return PAYMENT_METHOD_LABELS[expense.paymentMethod]
  }

  if (expense.paymentMethod) {
    return expense.paymentMethod.replace(/_/g, ' ')
  }

  return '-'
}

export function formatExpensePaymentMethod(method) {
  if (!method) return '-'
  return PAYMENT_METHOD_LABELS[method] || method.replace(/_/g, ' ')
}
