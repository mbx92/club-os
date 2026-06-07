const { applyCashExpenseDeduction } = require('../../src/utils/paymentBreakdown');

describe('applyCashExpenseDeduction', () => {
  it('deducts cash expense from an existing cash row', () => {
    const rows = [
      { paymentMethod: 'cash', total: '10027900', transactionCount: '144' },
      { paymentMethod: 'qris', total: '2500000', transactionCount: '30' }
    ];

    const result = applyCashExpenseDeduction(rows, { deduction: 10096900 });

    expect(result).toEqual([
      {
        paymentMethod: 'cash',
        total: -69000,
        transactionCount: '144',
        grossTotal: 10027900,
        cashExpenseDeduction: 10096900
      },
      {
        paymentMethod: 'qris',
        total: 2500000,
        transactionCount: '30',
        grossTotal: 2500000,
        cashExpenseDeduction: 0
      }
    ]);
  });

  it('adds a negative cash row when only outflow exists', () => {
    const result = applyCashExpenseDeduction([
      { paymentMethod: 'qris', total: '50000', transactionCount: '2' }
    ], { deduction: 10000 });

    expect(result).toEqual([
      {
        paymentMethod: 'qris',
        total: 50000,
        transactionCount: '2',
        grossTotal: 50000,
        cashExpenseDeduction: 0
      },
      {
        paymentMethod: 'cash',
        total: -10000,
        grossTotal: 0,
        cashExpenseDeduction: 10000,
        transactionCount: 0
      }
    ]);
  });
});
