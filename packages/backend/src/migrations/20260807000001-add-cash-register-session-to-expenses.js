'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Expenses', 'cashRegisterSessionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'CashRegisterSessions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Shift laci yang dipakai saat expense dibayar dari cash_drawer',
    });

    await queryInterface.addIndex('Expenses', ['cashRegisterSessionId'], {
      name: 'expenses_cash_register_session_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Expenses', 'expenses_cash_register_session_id_idx');
    await queryInterface.removeColumn('Expenses', 'cashRegisterSessionId');
  },
};
