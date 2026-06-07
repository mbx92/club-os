'use strict';

/**
 * Migration: Add paidAmount and changeAmount to Transactions
 * Purpose: Track actual cash flow for accounting reconciliation
 * 
 * Why needed:
 * - paidAmount: Total cash received from customer
 * - changeAmount: Cash returned to customer (cash out)
 * - Essential for cash register reconciliation and audit trail
 * 
 * Formula: paidAmount - totalAmount = changeAmount
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('Adding paidAmount and changeAmount to Transactions table...');
    
    const tableInfo = await queryInterface.describeTable('Transactions');
    
    // Add paidAmount column if not exists
    if (!tableInfo.paidAmount) {
      await queryInterface.addColumn('Transactions', 'paidAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total amount paid by customer (may be more than totalAmount)'
      });
      console.log('✅ paidAmount column added');
    } else {
      console.log('⚠️  paidAmount already exists, skipping');
    }
    
    // Add changeAmount column if not exists
    if (!tableInfo.changeAmount) {
      await queryInterface.addColumn('Transactions', 'changeAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Change returned to customer (paidAmount - totalAmount). Important for cash reconciliation.'
      });
      console.log('✅ changeAmount column added');
    } else {
      console.log('⚠️  changeAmount already exists, skipping');
    }
  },

  async down (queryInterface, Sequelize) {
    console.log('Rolling back: Removing paidAmount and changeAmount...');
    
    await queryInterface.removeColumn('Transactions', 'changeAmount');
    await queryInterface.removeColumn('Transactions', 'paidAmount');
    
    console.log('✅ Rollback complete');
  }
};
