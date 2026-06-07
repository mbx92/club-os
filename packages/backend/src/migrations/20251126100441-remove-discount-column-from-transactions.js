'use strict';

/**
 * Migration: Remove ambiguous 'discount' column from Transactions table
 * Reason: Duplicate with voucherDiscount field. Keep only voucherDiscount for clarity.
 * Formula: subtotal - voucherDiscount + tax = totalAmount
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('Removing discount column from Transactions table...');
    
    const tableInfo = await queryInterface.describeTable('Transactions');
    if (tableInfo.discount) {
      await queryInterface.removeColumn('Transactions', 'discount');
      console.log('✅ discount column removed');
    } else {
      console.log('⚠️  discount column does not exist, skipping');
    }
  },

  async down (queryInterface, Sequelize) {
    console.log('Rolling back: Adding discount column back to Transactions table...');
    
    await queryInterface.addColumn('Transactions', 'discount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'tax'
    });
    
    console.log('✅ Rollback complete: discount column restored');
  }
};
