'use strict';

const { Op } = require('sequelize');

/**
 * Expense dari laci kasir (mengurangi kas fisik shift).
 * - fundSource=cash_drawer → selalu dari laci
 * - Legacy: paymentMethod=cash tanpa fundSource/accountId/vaultAccountId
 *
 * Expense dari akun Tunai/Brankas (fundSource=account) atau petty_cash
 * tidak boleh masuk perhitungan expectedCash laci.
 *
 * Extra predicates (tenantId, status, paidDate/createdAt, location, …) di-AND
 * dengan filter fund-source agar tidak saling menimpa Op.or.
 */
function getCashDrawerExpenseWhere(extra = {}) {
  const fundSourceOr = {
    [Op.or]: [
      { fundSource: 'cash_drawer' },
      {
        paymentMethod: 'cash',
        accountId: { [Op.is]: null },
        vaultAccountId: { [Op.is]: null },
        fundSource: { [Op.is]: null },
      },
    ],
  };

  const extraKeys = Object.keys(extra);
  if (extraKeys.length === 0) return fundSourceOr;

  return {
    [Op.and]: [extra, fundSourceOr],
  };
}

function isCashDrawerExpense(expense) {
  const fundSource = String(expense?.fundSource || '').toLowerCase();
  if (fundSource === 'cash_drawer') return true;
  if (fundSource && fundSource !== 'cash_drawer') return false;
  if (expense?.accountId || expense?.vaultAccountId) return false;
  return String(expense?.paymentMethod || '').toLowerCase() === 'cash';
}

module.exports = {
  getCashDrawerExpenseWhere,
  isCashDrawerExpense,
};
