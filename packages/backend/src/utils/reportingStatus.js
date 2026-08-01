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
};
