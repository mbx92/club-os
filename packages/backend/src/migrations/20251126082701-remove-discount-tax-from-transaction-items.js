'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove discount and tax columns from TransactionItems
    // These should be global at Transaction level, not per-item
    
    // Check if columns exist before removing
    const tableInfo = await queryInterface.describeTable('TransactionItems');
    
    if (tableInfo.discount) {
      await queryInterface.removeColumn('TransactionItems', 'discount');
    }
    
    if (tableInfo.tax) {
      await queryInterface.removeColumn('TransactionItems', 'tax');
    }
  },

  async down(queryInterface, Sequelize) {
    // Rollback: Add columns back
    await queryInterface.addColumn('TransactionItems', 'discount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('TransactionItems', 'tax', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
};
