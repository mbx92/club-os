'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if sequences already exist
    const [existingSequences] = await queryInterface.sequelize.query(
      "SELECT name FROM \"Sequences\" WHERE name IN ('invoice_number', 'receipt_number', 'payment_number')"
    );

    if (existingSequences.length === 0) {
      await queryInterface.bulkInsert('Sequences', [
        {
          name: 'invoice_number',
          prefix: 'INV',
          currentValue: 0,
          step: 1,
          padLength: 6,
          resetPeriod: 'monthly',
          lastResetDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'receipt_number',
          prefix: 'RCT',
          currentValue: 0,
          step: 1,
          padLength: 6,
          resetPeriod: 'monthly',
          lastResetDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'payment_number',
          prefix: 'PAY',
          currentValue: 0,
          step: 1,
          padLength: 6,
          resetPeriod: 'monthly',
          lastResetDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Sequences', {
      name: ['invoice_number', 'receipt_number', 'payment_number']
    }, {});
  }
};
