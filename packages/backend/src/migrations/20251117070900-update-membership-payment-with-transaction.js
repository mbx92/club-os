'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if transactionId column already exists
    const tableInfo = await queryInterface.describeTable('MembershipPayments');
    
    if (!tableInfo.transactionId) {
      // Add transactionId column to MembershipPayments table
      await queryInterface.addColumn('MembershipPayments', 'transactionId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // Add index for transactionId
      await queryInterface.addIndex('MembershipPayments', ['transactionId'], {
        name: 'membership_payments_transaction_id_index'
      });
    } else {
      console.log('transactionId column already exists in MembershipPayments table');
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if transactionId column exists
    const tableInfo = await queryInterface.describeTable('MembershipPayments');
    
    if (tableInfo.transactionId) {
      // Remove the index first
      try {
        await queryInterface.removeIndex('MembershipPayments', 'membership_payments_transaction_id_index');
      } catch (error) {
        console.log('Index may not exist or was already removed');
      }
      
      // Remove transactionId column
      await queryInterface.removeColumn('MembershipPayments', 'transactionId');
    } else {
      console.log('transactionId column does not exist in MembershipPayments table');
    }
  }
};