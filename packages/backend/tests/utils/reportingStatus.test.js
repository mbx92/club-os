const {
  CASH_IN_EXCLUDED_TRANSACTION_STATUSES,
  REFUNDED_TRANSACTION_STATUSES,
  isCashInTransaction,
  netCashAmount,
  cashInFromPayment,
  cashInFromTransaction,
} = require('../../src/utils/reportingStatus');

describe('canonical cash-in helpers', () => {
  describe('isCashInTransaction', () => {
    it('excludes cancelled, refunded, and partially_refunded', () => {
      for (const status of CASH_IN_EXCLUDED_TRANSACTION_STATUSES) {
        expect(isCashInTransaction({ status })).toBe(false);
      }
    });

    it('includes reportable statuses', () => {
      for (const status of ['completed', 'paid', 'served', 'split', 'merged']) {
        expect(isCashInTransaction({ status })).toBe(true);
      }
    });

    it('returns false for a missing transaction', () => {
      expect(isCashInTransaction(null)).toBe(false);
    });
  });

  describe('netCashAmount', () => {
    it('subtracts change returned to the customer', () => {
      expect(netCashAmount({ amount: 100000 }, { changeAmount: 99949 })).toBe(51);
    });

    it('never goes negative', () => {
      expect(netCashAmount({ amount: 50 }, { changeAmount: 100 })).toBe(0);
    });

    it('handles null/undefined inputs', () => {
      expect(netCashAmount(null, null)).toBe(0);
      expect(netCashAmount({}, {})).toBe(0);
    });
  });

  describe('cashInFromPayment', () => {
    it('counts a completed cash payment on a valid transaction', () => {
      const payment = {
        paymentMethod: 'cash',
        amount: 1320000,
        transaction: { status: 'completed', changeAmount: 0 },
      };
      expect(cashInFromPayment(payment)).toBe(1320000);
    });

    it('excludes cash on a cancelled transaction — the 5 Oct 2026 regression', () => {
      const payment = {
        paymentMethod: 'cash',
        amount: 11000,
        transaction: { status: 'cancelled', changeAmount: 0 },
      };
      expect(cashInFromPayment(payment)).toBe(0);
    });

    it('excludes non-cash methods', () => {
      const payment = {
        paymentMethod: 'credit_card',
        amount: 11000,
        transaction: { status: 'completed', changeAmount: 0 },
      };
      expect(cashInFromPayment(payment)).toBe(0);
    });

    it('accepts the "tunai" alias', () => {
      const payment = {
        paymentMethod: 'Tunai',
        amount: 5000,
        transaction: { status: 'completed', changeAmount: 0 },
      };
      expect(cashInFromPayment(payment)).toBe(5000);
    });
  });

  describe('cashInFromTransaction', () => {
    it('sums only cash payments and nets change', () => {
      const trx = {
        status: 'completed',
        changeAmount: 1000,
        payments: [
          { paymentMethod: 'cash', amount: 11600 },
          { paymentMethod: 'qris', amount: 50000 },
        ],
      };
      expect(cashInFromTransaction(trx)).toBe(10600);
    });

    it('returns 0 for excluded statuses', () => {
      const trx = {
        status: 'refunded',
        changeAmount: 0,
        payments: [{ paymentMethod: 'cash', amount: 11000 }],
      };
      expect(cashInFromTransaction(trx)).toBe(0);
    });

    it('supports a custom method normalizer', () => {
      const trx = {
        status: 'completed',
        changeAmount: 0,
        payments: [{ paymentMethod: 'TUNAI', amount: 7000 }],
      };
      const normalize = (m) => (m === 'TUNAI' ? 'cash' : m);
      expect(cashInFromTransaction(trx, normalize)).toBe(7000);
    });
  });

  describe('refund statuses', () => {
    it('are a subset of the excluded statuses', () => {
      for (const status of REFUNDED_TRANSACTION_STATUSES) {
        expect(CASH_IN_EXCLUDED_TRANSACTION_STATUSES).toContain(status);
      }
    });
  });
});
