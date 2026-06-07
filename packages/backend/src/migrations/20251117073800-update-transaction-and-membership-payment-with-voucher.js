'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add voucherId column to Transactions table
    await queryInterface.addColumn('Transactions', 'voucherId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    // Add voucherDiscount column to Transactions table
    await queryInterface.addColumn('Transactions', 'voucherDiscount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    
    // Add voucherId column to MembershipPayments table
    await queryInterface.addColumn('MembershipPayments', 'voucherId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Vouchers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    // Add voucherDiscount column to MembershipPayments table
    await queryInterface.addColumn('MembershipPayments', 'voucherDiscount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    
    // Add indexes for voucherId columns
    await queryInterface.addIndex('Transactions', ['voucherId'], {
      name: 'transactions_voucher_id_index'
    });
    
    await queryInterface.addIndex('MembershipPayments', ['voucherId'], {
      name: 'membership_payments_voucher_id_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('Transactions', 'transactions_voucher_id_index');
    await queryInterface.removeIndex('MembershipPayments', 'membership_payments_voucher_id_index');
    
    // Remove columns
    await queryInterface.removeColumn('Transactions', 'voucherDiscount');
    await queryInterface.removeColumn('Transactions', 'voucherId');
    await queryInterface.removeColumn('MembershipPayments', 'voucherDiscount');
    await queryInterface.removeColumn('MembershipPayments', 'voucherId');
  }
};