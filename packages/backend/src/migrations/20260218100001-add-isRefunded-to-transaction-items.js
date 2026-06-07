'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('TransactionItems', 'isRefunded', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this item has been refunded (partial refund support)'
    });

    await queryInterface.addColumn('TransactionItems', 'refundedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when this item was refunded'
    });

    await queryInterface.addColumn('TransactionItems', 'refundTransactionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to the refund transaction created for this item'
    });

    await queryInterface.addIndex('TransactionItems', ['isRefunded'], {
      name: 'transaction_items_is_refunded_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('TransactionItems', 'transaction_items_is_refunded_idx');
    await queryInterface.removeColumn('TransactionItems', 'refundTransactionId');
    await queryInterface.removeColumn('TransactionItems', 'refundedAt');
    await queryInterface.removeColumn('TransactionItems', 'isRefunded');
  }
};
