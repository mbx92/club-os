const { 
  generateDocumentNumber,
  generateTransactionNumber,
  generateOrderNumber,
  generateInvoiceNumber,
  previewDocumentNumberFormat,
  formatDate
} = require('../../src/services/invoiceNumberService');
const { Sequence, sequelize } = require('../../src/models');

describe('Invoice Number Service', () => {
  let testTenantId;

  beforeEach(async () => {
    testTenantId = '123e4567-e89b-12d3-a456-426614174000';
    await Sequence.destroy({ where: {} });
  });

  describe('generateDocumentNumber', () => {
    test('should generate document number with PREFIX-DATE-NUMBER format', async () => {
      const settings = {
        transactionPrefix: 'GYM',
        numberingFormat: 'PREFIX-DATE-NUMBER',
        dateFormat: 'YYYYMMDD',
        prefixSeparator: '/',
        numberPadLength: 4
      };

      const number = await generateDocumentNumber('transaction', testTenantId, settings);
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      expect(number).toBe(`GYM/${dateStr}/0001`);
    });

    test('should generate document number with PREFIX-NUMBER format', async () => {
      const settings = {
        transactionPrefix: 'TRX',
        numberingFormat: 'PREFIX-NUMBER',
        dateFormat: 'NONE',
        prefixSeparator: '-',
        numberPadLength: 5
      };

      const number = await generateDocumentNumber('transaction', testTenantId, settings);
      
      expect(number).toBe('TRX-00001');
    });

    test('should auto-increment sequence', async () => {
      const settings = {
        orderPrefix: 'ORD',
        numberingFormat: 'PREFIX-NUMBER',
        dateFormat: 'NONE',
        prefixSeparator: '-',
        numberPadLength: 3
      };

      const num1 = await generateDocumentNumber('order', testTenantId, settings);
      const num2 = await generateDocumentNumber('order', testTenantId, settings);
      const num3 = await generateDocumentNumber('order', testTenantId, settings);
      
      expect(num1).toBe('ORD-001');
      expect(num2).toBe('ORD-002');
      expect(num3).toBe('ORD-003');
    });

    test('should handle multiple tenants independently', async () => {
      const settings = {
        invoicePrefix: 'INV',
        numberingFormat: 'PREFIX-NUMBER',
        dateFormat: 'NONE',
        prefixSeparator: '-',
        numberPadLength: 4
      };

      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      const t1n1 = await generateDocumentNumber('invoice', tenant1, settings);
      const t2n1 = await generateDocumentNumber('invoice', tenant2, settings);
      const t1n2 = await generateDocumentNumber('invoice', tenant1, settings);
      const t2n2 = await generateDocumentNumber('invoice', tenant2, settings);
      
      expect(t1n1).toBe('INV-0001');
      expect(t2n1).toBe('INV-0001'); // Same number but different tenant
      expect(t1n2).toBe('INV-0002');
      expect(t2n2).toBe('INV-0002');
    });

    test('should reset sequence daily when dateFormat is YYYYMMDD', async () => {
      const settings = {
        transactionPrefix: 'TRX',
        numberingFormat: 'PREFIX-DATE-NUMBER',
        dateFormat: 'YYYYMMDD',
        prefixSeparator: '-',
        numberPadLength: 4
      };

      // Generate first number
      const num1 = await generateDocumentNumber('transaction', testTenantId, settings);
      
      // Manually update lastResetDate to yesterday
      const sequenceName = `transaction_${testTenantId}`;
      const sequence = await Sequence.findOne({ where: { name: sequenceName } });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      sequence.lastResetDate = yesterday.toISOString().split('T')[0];
      await sequence.save();
      
      // Generate second number (should reset to 0001)
      const num2 = await generateDocumentNumber('transaction', testTenantId, settings);
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      expect(num2).toBe(`TRX-${dateStr}-0001`);
    });

    test('should handle concurrent requests (race condition safe)', async () => {
      const settings = {
        transactionPrefix: 'TRX',
        numberingFormat: 'PREFIX-NUMBER',
        dateFormat: 'NONE',
        prefixSeparator: '-',
        numberPadLength: 4
      };

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        generateDocumentNumber('transaction', testTenantId, settings)
      );

      const numbers = await Promise.all(promises);
      
      // All numbers should be unique
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(10);
      
      // Numbers should be sequential (no gaps)
      const extracted = numbers.map(n => parseInt(n.split('-')[1]));
      extracted.sort((a, b) => a - b);
      
      for (let i = 0; i < extracted.length - 1; i++) {
        expect(extracted[i + 1] - extracted[i]).toBe(1);
      }
    });
  });

  describe('Convenience Wrappers', () => {
    test('generateTransactionNumber should work', async () => {
      const settings = {
        transactionPrefix: 'GYM',
        numberingFormat: 'PREFIX-DATE-NUMBER',
        dateFormat: 'YYYYMM',
        prefixSeparator: '/',
        numberPadLength: 4
      };

      const number = await generateTransactionNumber(testTenantId, settings);
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      expect(number).toBe(`GYM/${dateStr}/0001`);
    });

    test('generateOrderNumber should work', async () => {
      const settings = {
        orderPrefix: 'ORD',
        numberingFormat: 'PREFIX-NUMBER',
        prefixSeparator: '-'
      };

      const number = await generateOrderNumber(testTenantId, settings);
      
      expect(number).toMatch(/^ORD-\d{4}$/);
    });

    test('generateInvoiceNumber should work', async () => {
      const settings = {
        invoicePrefix: 'INV',
        numberingFormat: 'PREFIX-DATE-NUMBER',
        dateFormat: 'YYYY',
        prefixSeparator: '/'
      };

      const number = await generateInvoiceNumber(testTenantId, settings);
      const year = new Date().getFullYear();
      
      expect(number).toBe(`INV/${year}/0001`);
    });
  });

  describe('Date Formatting', () => {
    test('should format YYYYMMDD correctly', () => {
      const date = new Date('2025-11-25');
      expect(formatDate(date, 'YYYYMMDD')).toBe('20251125');
    });

    test('should format YYYYMM correctly', () => {
      const date = new Date('2025-11-25');
      expect(formatDate(date, 'YYYYMM')).toBe('202511');
    });

    test('should format YYYY correctly', () => {
      const date = new Date('2025-11-25');
      expect(formatDate(date, 'YYYY')).toBe('2025');
    });

    test('should format YY correctly', () => {
      const date = new Date('2025-11-25');
      expect(formatDate(date, 'YY')).toBe('25');
    });

    test('should return empty string for NONE', () => {
      const date = new Date('2025-11-25');
      expect(formatDate(date, 'NONE')).toBe('');
    });
  });

  describe('Preview Format', () => {
    test('should preview document number format without incrementing', () => {
      const settings = {
        transactionPrefix: 'GYM',
        numberingFormat: 'PREFIX-DATE-NUMBER',
        dateFormat: 'YYYYMMDD',
        prefixSeparator: '/',
        numberPadLength: 4
      };

      const preview = previewDocumentNumberFormat('transaction', settings);
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      expect(preview).toBe(`GYM/${dateStr}/0001`);
    });
  });

  describe('Default Values', () => {
    test('should use default prefix when not provided', async () => {
      const settings = {
        numberingFormat: 'PREFIX-NUMBER',
        dateFormat: 'NONE',
        prefixSeparator: '-'
      };

      const number = await generateDocumentNumber('transaction', testTenantId, settings);
      
      expect(number).toMatch(/^TRX-\d{4}$/);
    });

    test('should use default format when not provided', async () => {
      const settings = {
        transactionPrefix: 'GYM'
      };

      const number = await generateDocumentNumber('transaction', testTenantId, settings);
      
      // Default: PREFIX-DATE-NUMBER with YYYYMM
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      expect(number).toBe(`GYM-${dateStr}-0001`);
    });
  });
});
