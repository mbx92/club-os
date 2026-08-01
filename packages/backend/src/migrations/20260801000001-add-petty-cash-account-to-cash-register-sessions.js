'use strict';

/**
 * Link CashRegisterSession modal awal to Account type=petty_cash.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('CashRegisterSessions');
    if (!table.pettyCashAccountId) {
      await queryInterface.addColumn('CashRegisterSessions', 'pettyCashAccountId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Account type=petty_cash used as modal awal source for this shift',
      });
      await queryInterface.addIndex('CashRegisterSessions', ['pettyCashAccountId'], {
        name: 'cash_register_sessions_petty_cash_account_id_idx',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('CashRegisterSessions');
    if (table.pettyCashAccountId) {
      await queryInterface.removeIndex('CashRegisterSessions', 'cash_register_sessions_petty_cash_account_id_idx').catch(() => {});
      await queryInterface.removeColumn('CashRegisterSessions', 'pettyCashAccountId');
    }
  },
};
