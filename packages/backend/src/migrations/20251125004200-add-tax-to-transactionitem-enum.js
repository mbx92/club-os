'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'tax' value to the enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_TransactionItems_itemType" ADD VALUE IF NOT EXISTS 'tax';`
    );

    // Make itemId nullable for tax items
    await queryInterface.changeColumn('TransactionItems', 'itemId', {
      type: Sequelize.UUID,
      allowNull: true // Allow null for tax and other non-item-specific entries
    });
  },

  async down(queryInterface, Sequelize) {
    // Make itemId non-nullable again
    await queryInterface.changeColumn('TransactionItems', 'itemId', {
      type: Sequelize.UUID,
      allowNull: false
    });

    // Note: PostgreSQL does not support removing enum values directly
    // You would need to recreate the enum type if you need to remove values
    console.log('Reverting enum values is not supported. Manual intervention required.');
  }
};
