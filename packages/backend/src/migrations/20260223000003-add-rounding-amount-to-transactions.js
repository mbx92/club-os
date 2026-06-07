'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Transactions', 'roundingAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Rounding adjustment applied to totalAmount (positive = rounded up, negative = rounded down). Zero when rounding is disabled.',
      after: 'voucherDiscount'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Transactions', 'roundingAmount');
  }
};
