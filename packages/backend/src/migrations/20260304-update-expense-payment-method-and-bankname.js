'use strict';

/**
 * Migration: Update Expenses.paymentMethod from ENUM to VARCHAR
 * and add bankName column for recording bank transfer origin.
 *
 * Reason: ENUM 'transfer' not compatible with 'bank_transfer' sent by frontend,
 * causing 500 errors. Standardise to VARCHAR like other payment tables.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Change paymentMethod from ENUM to VARCHAR
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      ALTER COLUMN "paymentMethod" TYPE VARCHAR(255) USING "paymentMethod"::text;
    `);

    // 2. Drop old ENUM type if it exists
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Expenses_paymentMethod" CASCADE;
    `);

    // 3. Add bankName column
    await queryInterface.addColumn('Expenses', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Bank name for bank_transfer payment method (e.g. BCA, Mandiri, BRI)'
    });

    console.log('✓ Expenses.paymentMethod changed from ENUM to VARCHAR');
    console.log('✓ Expenses.bankName column added');
  },

  async down(queryInterface, Sequelize) {
    // Remove bankName column
    await queryInterface.removeColumn('Expenses', 'bankName');

    // Restore ENUM (recreate with original values)
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Expenses_paymentMethod" AS ENUM (
        'cash', 'transfer', 'credit_card', 'debit_card', 'check', 'other'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      ALTER COLUMN "paymentMethod" TYPE "enum_Expenses_paymentMethod"
      USING "paymentMethod"::"enum_Expenses_paymentMethod";
    `);
  }
};
