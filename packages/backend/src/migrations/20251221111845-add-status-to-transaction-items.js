'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('TransactionItems', 'status', {
      type: Sequelize.ENUM('pending', 'preparing', 'ready', 'served', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    });

    await queryInterface.addIndex('TransactionItems', ['transactionId', 'status'], {
      name: 'transaction_items_transaction_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('TransactionItems', 'transaction_items_transaction_status_idx');
    await queryInterface.removeColumn('TransactionItems', 'status');
  }
};
