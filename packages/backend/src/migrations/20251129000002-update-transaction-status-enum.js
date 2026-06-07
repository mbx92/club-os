'use strict';

/**
 * Migration: Update Transaction status enum for restaurant orders
 * 
 * Adds new statuses: confirmed, preparing, ready, served
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new enum values to existing status column
    // PostgreSQL requires special handling for adding enum values
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'confirmed';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'preparing';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'ready';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'served';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing enum values
    // This would require recreating the column with a new enum type
    // For safety, we'll leave the enum values in place
    console.log('Note: Enum values cannot be removed in PostgreSQL. The values will remain.');
  }
};
