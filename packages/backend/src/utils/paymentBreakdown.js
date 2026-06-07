function isCashPaymentMethod(method) {
  return typeof method === 'string' && method.trim().toLowerCase() === 'cash';
}

function applyCashExpenseDeduction(rows, {
  deduction = 0,
  paymentMethodKey = 'paymentMethod',
  totalKey = 'total',
  transactionCountKey = 'transactionCount'
} = {}) {
  const cashExpenseDeduction = parseFloat(deduction || 0);

  const normalizedRows = (rows || []).map((row) => {
    const grossTotal = parseFloat(row?.[totalKey] || 0);
    return {
      ...row,
      [totalKey]: grossTotal,
      grossTotal,
      cashExpenseDeduction: 0
    };
  });

  if (cashExpenseDeduction <= 0) {
    return normalizedRows;
  }

  const cashRow = normalizedRows.find((row) => isCashPaymentMethod(row?.[paymentMethodKey]));

  if (cashRow) {
    cashRow[totalKey] = parseFloat((cashRow.grossTotal - cashExpenseDeduction).toFixed(2));
    cashRow.cashExpenseDeduction = cashExpenseDeduction;
    return normalizedRows;
  }

  return [
    ...normalizedRows,
    {
      [paymentMethodKey]: 'cash',
      [totalKey]: parseFloat((0 - cashExpenseDeduction).toFixed(2)),
      grossTotal: 0,
      cashExpenseDeduction,
      [transactionCountKey]: 0
    }
  ];
}

module.exports = {
  applyCashExpenseDeduction,
  isCashPaymentMethod
};
