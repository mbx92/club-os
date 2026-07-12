/**
 * Expense fund-source options — intentionally minimal:
 *
 * - Cashier on shift  → Laci / Cash Drawer only
 * - Owner / admin     → Akun Keuangan + Laci / Cash Drawer
 */

export const EXPENSE_PAYMENT_OPTION_MAP = {
  cash_drawer_cash: { paymentMethod: 'cash', fundSource: 'cash_drawer' },
  from_account: { fundSource: 'account' },
  // Legacy keys kept for resolve/display of old expenses
  vault_cash: { paymentMethod: 'cash', fundSource: 'vault' },
  petty_cash: { paymentMethod: 'petty_cash', fundSource: 'petty_cash' },
  bank_transfer: { paymentMethod: 'bank_transfer', fundSource: 'bank' },
}

/** Owner/admin: can use accounts (settled cash + bank) and cash drawer. */
export const EXPENSE_PAYMENT_OPTIONS_OWNER = [
  { value: 'from_account', label: 'Dari Akun Keuangan' },
  { value: 'cash_drawer_cash', label: 'Laci / Cash Drawer' },
]

/** Cashier on duty: pay from the open cash drawer only. */
export const EXPENSE_PAYMENT_OPTIONS_CASHIER = [
  { value: 'cash_drawer_cash', label: 'Laci / Cash Drawer' },
]

/** @deprecated use getExpensePaymentOptions({ isCashier }) */
export const EXPENSE_PAYMENT_OPTIONS = [
  ...EXPENSE_PAYMENT_OPTIONS_OWNER,
]

/** Account types allowed as expense fund source for owner/admin. */
export const EXPENSE_ACCOUNT_TYPES = ['cash', 'bank']

export function getExpensePaymentOptions({ isCashier = false } = {}) {
  return isCashier ? EXPENSE_PAYMENT_OPTIONS_CASHIER : EXPENSE_PAYMENT_OPTIONS_OWNER
}

const FUND_SOURCE_LABELS = {
  account: 'Dari Akun Keuangan',
  cash_drawer: 'Laci / Cash Drawer',
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
 * Cashier always forced to drawer; owner/admin can use either option.
 */
export function resolveExpensePaymentOption(expense = null, { isCashier = false } = {}) {
  if (isCashier) return 'cash_drawer_cash'
  if (!expense) return 'from_account'

  if (expense.accountId || expense.fundSource === 'account') return 'from_account'
  if (expense.fundSource === 'cash_drawer') return 'cash_drawer_cash'
  if (expense.paymentMethod === 'cash' && expense.fundSource === 'cash_drawer') return 'cash_drawer_cash'
  if (expense.paymentMethod === 'cash' && !expense.fundSource && !expense.accountId) return 'cash_drawer_cash'

  // Legacy sources → closest active option
  if (expense.fundSource === 'vault' || expense.vaultAccountId) return 'from_account'
  if (expense.fundSource === 'bank' || expense.paymentMethod === 'bank_transfer' || expense.paymentMethod === 'transfer') {
    return 'from_account'
  }
  if (expense.fundSource === 'petty_cash' || expense.paymentMethod === 'petty_cash') return 'from_account'
  if (['e_wallet', 'payment_gateway', 'qris', 'credit_card', 'debit_card'].includes(expense.paymentMethod)) {
    return 'from_account'
  }

  if (expense.paymentMethod === 'cash') return 'cash_drawer_cash'
  return expense.paymentMethod ? 'from_account' : 'from_account'
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

/** Filter accounts usable as expense fund source (tunai settled + bank). */
export function filterExpenseAccounts(accounts = []) {
  return (accounts || []).filter((a) => EXPENSE_ACCOUNT_TYPES.includes(a.type) && a.isActive !== false)
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

  if (expense.fundSource === 'cash_drawer' || (expense.paymentMethod === 'cash' && !expense.accountId)) {
    return FUND_SOURCE_LABELS.cash_drawer
  }

  if (expense.vaultAccount?.name) {
    return `Vault: ${expense.vaultAccount.name}`
  }

  if (expense.fundSource && FUND_SOURCE_LABELS[expense.fundSource]) {
    return FUND_SOURCE_LABELS[expense.fundSource]
  }

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
