'use strict';

/**
 * Migration: Add paymentNotes column to Expenses.
 *
 * Stores payment-specific notes such as card holder name, last 4 digits,
 * bank branch, etc. Separate from the general 'notes' field.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      ADD COLUMN IF NOT EXISTS "paymentNotes" TEXT NULL;
    `);

    console.log('✓ Expenses.paymentNotes column added');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      DROP COLUMN IF EXISTS "paymentNotes";
    `);
  }
};
