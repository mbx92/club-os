'use strict';

/**
 * Add nullable accountId FK to:
 *   - TransactionPayments  (non-cash payments auto-linked to an Account)
 *   - Expenses             (expense source account)
 *
 * These are nullable/additive — no existing behaviour is broken.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const accountFk = {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Accounts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    await queryInterface.addColumn('TransactionPayments', 'accountId', accountFk);
    await queryInterface.addIndex('TransactionPayments', ['accountId'], {
      name: 'transaction_payments_account_id',
    });

    await queryInterface.addColumn('Expenses', 'accountId', accountFk);
    await queryInterface.addIndex('Expenses', ['accountId'], {
      name: 'expenses_account_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('TransactionPayments', 'accountId');
    await queryInterface.removeColumn('Expenses', 'accountId');
  },
};
