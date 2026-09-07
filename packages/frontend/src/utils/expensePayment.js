/**
 * Expense fund-source options.
 *
 * Petty Cash (akun type=petty_cash — "berangkas kecil") is a separate entity from
 * the cash drawer (uang hasil jualan/tunai di laci): it has its own Account balance
 * and ledger, and spending from it never affects the shift's drawer expectedCash/closingBalance.
 *
 * - Cashier on shift  → Laci / Cash Drawer, atau Petty Cash (akun petty cash shift-nya)
 * - Owner / admin     → Akun Keuangan (Tunai/Brankas/Bank), Laci / Cash Drawer, atau Petty Cash
 */

export const EXPENSE_PAYMENT_OPTION_MAP = {
  cash_drawer_cash: { paymentMethod: 'cash', fundSource: 'cash_drawer' },
  from_account: { fundSource: 'account' },
  petty_cash: { paymentMethod: 'petty_cash', fundSource: 'petty_cash' },
  // Legacy keys kept for resolve/display of old expenses
  vault_cash: { paymentMethod: 'cash', fundSource: 'vault' },
  bank_transfer: { paymentMethod: 'bank_transfer', fundSource: 'bank' },
}

/** Owner/admin: can use accounts (settled cash + bank), cash drawer, or petty cash. */
export const EXPENSE_PAYMENT_OPTIONS_OWNER = [
  { value: 'from_account', label: 'Dari Akun Keuangan' },
  { value: 'cash_drawer_cash', label: 'Laci / Cash Drawer' },
  { value: 'petty_cash', label: 'Petty Cash' },
]

/** Cashier on duty: pay from the open cash drawer or the shift's petty cash. */
export const EXPENSE_PAYMENT_OPTIONS_CASHIER = [
  { value: 'cash_drawer_cash', label: 'Laci / Cash Drawer' },
  { value: 'petty_cash', label: 'Petty Cash' },
]

/** @deprecated use getExpensePaymentOptions({ isCashier }) */
export const EXPENSE_PAYMENT_OPTIONS = [
  ...EXPENSE_PAYMENT_OPTIONS_OWNER,
]

/** Account types allowed as expense fund source for owner/admin. */
export const EXPENSE_ACCOUNT_TYPES = ['cash', 'bank', 'main_vault']

/** Account types that can appear on the expenses list account filter. */
export const EXPENSE_ACCOUNT_FILTER_TYPES = [...EXPENSE_ACCOUNT_TYPES, 'petty_cash']

export function getExpensePaymentOptions({ isCashier = false } = {}) {
  return isCashier ? EXPENSE_PAYMENT_OPTIONS_CASHIER : EXPENSE_PAYMENT_OPTIONS_OWNER
}

/**
 * Label for Laci / Cash Drawer option, including available cash when shift is open.
 * @param {{ expectedCash?: number|null, hasSession?: boolean }} opts
 */
export function formatCashDrawerPaymentLabel({ expectedCash = null, hasSession = false } = {}) {
  const base = 'Laci / Cash Drawer'
  if (!hasSession) return `${base} — Tidak ada shift aktif`
  const nominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(expectedCash) || 0)
  return `${base} — ${nominal}`
}

/**
 * Label for Petty Cash option, including the linked account's balance when known.
 * Petty Cash is a separate entity from the cash drawer (its own Account/ledger, not tied
 * to any shift session) — spending from it never touches the drawer's expectedCash.
 * @param {{ pettyCashAccount?: {name: string, balance: number}|null, hasAccounts?: boolean }} opts
 */
export function formatPettyCashPaymentLabel({ pettyCashAccount = null, hasAccounts = true } = {}) {
  const base = 'Petty Cash'
  if (pettyCashAccount) {
    const nominal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(pettyCashAccount.balance) || 0)
    return `${base} (${pettyCashAccount.name}) — ${nominal}`
  }
  if (!hasAccounts) return `${base} — Akun tidak tersedia`
  return base
}

/**
 * Enrich payment options with live cash-drawer balance and petty-cash account balance
 * when available. `hasAccounts` defaults to true so the option reads as plain "Petty Cash"
 * until the caller actually knows whether any Petty Cash account exists.
 */
export function getExpensePaymentOptionsWithDrawer(opts = {}) {
  const { isCashier = false, expectedCash = null, hasSession = false, pettyCashAccount = null, hasAccounts = true } = opts
  return getExpensePaymentOptions({ isCashier }).map((option) => {
    if (option.value === 'cash_drawer_cash') {
      return { ...option, label: formatCashDrawerPaymentLabel({ expectedCash, hasSession }) }
    }
    if (option.value === 'petty_cash') {
      return { ...option, label: formatPettyCashPaymentLabel({ pettyCashAccount, hasAccounts }) }
    }
    return option
  })
}

export const FUND_SOURCE_LABELS = {
  account: 'Dari Akun Keuangan',
  cash_drawer: 'Laci / Cash Drawer',
  vault: 'Drawer',
  petty_cash: 'Petty Cash',
  bank: 'Transfer Bank',
}

/** Filter values for the expenses list (aligned with payment options). */
export const EXPENSE_FUND_SOURCE_FILTER_OPTIONS = [
  { value: 'account', label: FUND_SOURCE_LABELS.account },
  { value: 'cash_drawer', label: FUND_SOURCE_LABELS.cash_drawer },
  { value: 'petty_cash', label: FUND_SOURCE_LABELS.petty_cash },
]

const PAYMENT_METHOD_LABELS = {
  cash: 'Tunai',
  petty_cash: 'Petty Cash',
  bank_transfer: 'Transfer Bank',
  e_wallet: 'E-Wallet',
  payment_gateway: 'Payment Gateway',
  qris: 'QRIS',
  credit_card: 'Kartu Kredit',
  debit_card: 'Kartu Debit',
}

/**
 * Map stored expense fields back to a UI payment option.
 * Petty Cash is checked before the generic accountId→from_account rule, since a
 * Petty Cash expense also carries an accountId (the linked petty_cash Account).
 */
export function resolveExpensePaymentOption(expense = null, { isCashier = false } = {}) {
  if (!expense) return isCashier ? 'cash_drawer_cash' : 'from_account'

  if (expense.fundSource === 'petty_cash') return 'petty_cash'

  if (expense.accountId || expense.fundSource === 'account') return 'from_account'
  if (expense.fundSource === 'cash_drawer') return 'cash_drawer_cash'
  if (expense.paymentMethod === 'cash' && expense.fundSource === 'cash_drawer') return 'cash_drawer_cash'
  if (expense.paymentMethod === 'cash' && !expense.fundSource && !expense.accountId) return 'cash_drawer_cash'

  // Legacy sources → closest active option
  if (expense.fundSource === 'vault' || expense.vaultAccountId) return 'from_account'
  if (expense.fundSource === 'bank' || expense.paymentMethod === 'bank_transfer' || expense.paymentMethod === 'transfer') {
    return 'from_account'
  }
  // Legacy petty cash (old PettyCash model — no fundSource/accountId, identified by paymentMethod only)
  if (expense.paymentMethod === 'petty_cash') return isCashier ? 'petty_cash' : 'from_account'
  if (['e_wallet', 'payment_gateway', 'qris', 'credit_card', 'debit_card'].includes(expense.paymentMethod)) {
    return 'from_account'
  }

  if (expense.paymentMethod === 'cash') return 'cash_drawer_cash'
  if (isCashier) return 'cash_drawer_cash'
  return expense.paymentMethod ? 'from_account' : 'from_account'
}

export function paymentMethodFromAccount(acc) {
  if (!acc) return 'bank_transfer'
  if (acc.paymentMethod) return acc.paymentMethod
  if (acc.type === 'cash' || acc.type === 'main_vault') return 'cash'
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

/** Filter accounts for the expenses list (includes Petty Cash). */
export function filterExpenseAccountOptions(accounts = []) {
  return (accounts || []).filter((a) => EXPENSE_ACCOUNT_FILTER_TYPES.includes(a.type) && a.isActive !== false)
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
    return `Drawer: ${expense.vaultAccount.name}`
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
