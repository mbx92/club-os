'use strict';

/**
 * Migration: Add serviceCharge field to Transactions table
 * 
 * Adds service charge amount field to support separate tracking
 * of service charges in restaurant orders.
 * 
 * Formula: totalAmount = subtotal - voucherDiscount + serviceCharge + tax
 * 
 * @migration 20260217000001-add-service-charge-to-transactions
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Transactions', 'serviceCharge', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Service charge amount (for restaurant orders)'
    });

    console.log('✅ Added serviceCharge column to Transactions table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Transactions', 'serviceCharge');
    console.log('✅ Removed serviceCharge column from Transactions table');
  }
};
