'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('CashRegisterSessions', 'tipping', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Manual tipping inputted during shift close',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('CashRegisterSessions', 'tipping');
  }
};
