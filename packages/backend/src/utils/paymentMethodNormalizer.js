/**
 * Normalize payment method string to snake_case standard.
 * 
 * Converts camelCase variants (e.g., 'creditCard', 'debitCard', 'bankTransfer')
 * to snake_case format (e.g., 'credit_card', 'debit_card', 'bank_transfer')
 * to ensure consistent data storage across all tables.
 * 
 * Standard values: cash, credit_card, debit_card, bank_transfer, qris, e_wallet, 
 *                  compliment, transfer, check, other, pending
 * 
 * @param {string} method - Raw payment method string from frontend
 * @returns {string} Normalized payment method in snake_case
 */
function normalizePaymentMethod(method) {
  if (!method) return method;
  const m = method.trim();

  // Map of camelCase → snake_case
  const camelToSnake = {
    'creditcard': 'credit_card',
    'creditCard': 'credit_card',
    'debitcard': 'debit_card',
    'debitCard': 'debit_card',
    'banktransfer': 'bank_transfer',
    'bankTransfer': 'bank_transfer',
    'ewallet': 'e_wallet',
    'eWallet': 'e_wallet',
  };

  return camelToSnake[m] || m;
}

module.exports = { normalizePaymentMethod };
