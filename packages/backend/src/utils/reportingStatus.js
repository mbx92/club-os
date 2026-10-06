const COMPLETED_PAYMENT_STATUS = 'completed';

// Expense affects cash/balance/cashflow only after actual payment — not on approve.
const EXPENSE_CASH_RECOGNIZED_STATUSES = Object.freeze(['paid']);
const EXPENSE_CASH_RECOGNIZED_STATUS_SQL = EXPENSE_CASH_RECOGNIZED_STATUSES
  .map((status) => `'${status}'`)
  .join(', ');

const ALL_TRANSACTION_STATUSES = Object.freeze(['completed', 'paid', 'served', 'split', 'merged']);
const FINAL_TRANSACTION_STATUSES = Object.freeze(['completed', 'paid']);
const CASH_REGISTER_TRANSACTION_STATUSES = ALL_TRANSACTION_STATUSES;
const CASHIER_PARENT_TRANSACTION_STATUSES = Object.freeze(['split', 'merged']);
const CASHIER_COMPLETED_PAYMENT_REQUIRED_STATUSES = Object.freeze(['served', ...CASHIER_PARENT_TRANSACTION_STATUSES]);

// Backward-compatible alias: semua report sekarang pakai sumber data yang sama dengan cashier.
const REVENUE_RECOGNIZED_TRANSACTION_STATUSES = ALL_TRANSACTION_STATUSES;

const REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL = ALL_TRANSACTION_STATUSES
  .map((status) => `'${status}'`)
  .join(', ');

// SQL clause for transactions that have at least one completed payment.
// Use in raw SQL revenue queries that don't already JOIN TransactionPayments.
const PAID_TRANSACTION_EXISTS_SQL = `EXISTS (
  SELECT 1 FROM "TransactionPayments" tp2
  WHERE tp2."transactionId" = t."id"
    AND tp2."status" = '${COMPLETED_PAYMENT_STATUS}'
    AND tp2."deletedAt" IS NULL
)`;

// Sequelize ORM version: literal that can be spread into a `where` object via [Op.and].
const PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL = `EXISTS (
  SELECT 1 FROM "TransactionPayments" tp2
  WHERE tp2."transactionId" = "Transaction"."id"
    AND tp2."status" = '${COMPLETED_PAYMENT_STATUS}'
    AND tp2."deletedAt" IS NULL
)`;

function hasCompletedPayments(transaction) {
  return Array.isArray(transaction?.payments) && transaction.payments.length > 0;
}

function shouldIncludeCashierTransaction(transaction) {
  if (!transaction || !CASH_REGISTER_TRANSACTION_STATUSES.includes(transaction.status)) {
    return false;
  }

  if (!CASHIER_COMPLETED_PAYMENT_REQUIRED_STATUSES.includes(transaction.status)) {
    return true;
  }

  return hasCompletedPayments(transaction);
}

// ── Canonical cash-in (kas masuk laci) ───────────────────────────────────────
// Single source of truth for every "uang tunai masuk" calculation:
//   CashRegisterSession.getCashSummary()  (authoritative at shift close),
//   shift report, daily report, list sessions, cashier dashboard.
//
// A cash payment counts as cash-in only when ALL of these hold:
//   1. paymentMethod = 'cash'
//   2. payment status = 'completed'
//   3. the parent transaction is NOT cancelled / refunded / partially_refunded
//   4. the payment happened inside the shift window
//
// Net value = max(0, payment.amount - transaction.changeAmount) so the change
// handed back to the customer never inflates the drawer.
const CASH_IN_EXCLUDED_TRANSACTION_STATUSES = Object.freeze([
  'cancelled',
  'refunded',
  'partially_refunded',
]);

// Raw-SQL list of the excluded statuses (for `t."status" NOT IN (...)`).
const CASH_IN_EXCLUDED_TRANSACTION_STATUS_SQL = CASH_IN_EXCLUDED_TRANSACTION_STATUSES
  .map((status) => `'${status}'`)
  .join(', ');

// Statuses whose cash already left the drawer and must be reported as refund out.
const REFUNDED_TRANSACTION_STATUSES = Object.freeze(['refunded', 'partially_refunded']);

/**
 * True when a transaction's cash payments may count as cash-in.
 * Cancelled / refunded / partially_refunded money must never be treated as masuk kas.
 */
function isCashInTransaction(transaction) {
  if (!transaction) return false;
  if (transaction.status == null) return true;
  return !CASH_IN_EXCLUDED_TRANSACTION_STATUSES.includes(transaction.status);
}

/** Net cash for one payment: tendered minus change, never negative. */
function netCashAmount(payment, transaction) {
  const tendered = parseFloat(payment?.amount || 0);
  const change = parseFloat(transaction?.changeAmount || 0);
  return Math.max(0, tendered - change);
}

/**
 * Net cash-in contributed by a single TransactionPayment row.
 * Expects `payment.transaction` to be loaded (Sequelize include `as: 'transaction'`).
 */
function cashInFromPayment(payment) {
  const transaction = payment?.transaction;
  const method = (payment?.paymentMethod || '').toLowerCase().trim();
  if (!isCashInTransaction(transaction)) return 0;
  if (method !== 'cash' && method !== 'tunai') return 0;
  return netCashAmount(payment, transaction);
}

/**
 * Net cash-in contributed by a transaction and its loaded `payments`.
 *
 * @param {object} transaction        Transaction with `payments` loaded.
 * @param {Function} [normalizeMethod] Optional method normalizer returning
 *                                     'cash' for tunai variants (e.g. cashier
 *                                     report's normalizePaymentMethod).
 */
function cashInFromTransaction(transaction, normalizeMethod) {
  if (!isCashInTransaction(transaction)) return 0;

  const isCashMethod = normalizeMethod
    ? (method) => normalizeMethod(method) === 'cash'
    : (method) => {
        const m = (method || '').toLowerCase().trim();
        return m === 'cash' || m === 'tunai';
      };

  return (transaction.payments || [])
    .filter((p) => isCashMethod(p.paymentMethod))
    .reduce((sum, p) => sum + netCashAmount(p, transaction), 0);
}

module.exports = {
  REVENUE_RECOGNIZED_TRANSACTION_STATUSES,
  REVENUE_RECOGNIZED_TRANSACTION_STATUS_SQL,
  ALL_TRANSACTION_STATUSES,
  FINAL_TRANSACTION_STATUSES,
  CASH_REGISTER_TRANSACTION_STATUSES,
  CASHIER_PARENT_TRANSACTION_STATUSES,
  CASHIER_COMPLETED_PAYMENT_REQUIRED_STATUSES,
  COMPLETED_PAYMENT_STATUS,
  EXPENSE_CASH_RECOGNIZED_STATUSES,
  EXPENSE_CASH_RECOGNIZED_STATUS_SQL,
  PAID_TRANSACTION_EXISTS_SQL,
  PAID_TRANSACTION_SEQUELIZE_LITERAL_SQL,
  hasCompletedPayments,
  shouldIncludeCashierTransaction,
  CASH_IN_EXCLUDED_TRANSACTION_STATUSES,
  CASH_IN_EXCLUDED_TRANSACTION_STATUS_SQL,
  REFUNDED_TRANSACTION_STATUSES,
  isCashInTransaction,
  netCashAmount,
  cashInFromPayment,
  cashInFromTransaction,
};
