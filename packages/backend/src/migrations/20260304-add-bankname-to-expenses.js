'use strict';

/**
 * Migration: Add bankName column to Expenses (safe, idempotent).
 *
 * This migration uses IF NOT EXISTS to safely handle the case where
 * the previous migration may have run partially and the column is missing.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(255) NULL;
    `);

    console.log('✓ Expenses.bankName column ensured');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses"
      DROP COLUMN IF EXISTS "bankName";
    `);
  }
};
