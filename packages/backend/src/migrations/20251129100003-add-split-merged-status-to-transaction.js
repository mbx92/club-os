'use strict';

/**
 * Migration: Add split/merged status to Transaction
 * 
 * This migration adds 'split', 'merged', and 'paid' status to Transaction status enum.
 * Required for split bill and merge bills functionality.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // For PostgreSQL, we need to alter the enum type
    // First, check if the values already exist
    const [results] = await queryInterface.sequelize.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Transactions_status')
    `);
    
    const existingValues = results.map(r => r.enumlabel);
    
    // Add 'split' if not exists
    if (!existingValues.includes('split')) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'split'
      `);
    }
    
    // Add 'merged' if not exists
    if (!existingValues.includes('merged')) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'merged'
      `);
    }
    
    // Add 'paid' if not exists (for checkout before fully completed)
    if (!existingValues.includes('paid')) {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'paid'
      `);
    }

    console.log('✅ Added split, merged, paid status to Transaction status enum');
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing values from ENUM
    // The values will remain but won't be used
    console.log('⚠️ Cannot remove values from PostgreSQL ENUM. Values remain but unused.');
  }
};
