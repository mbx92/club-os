'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'service_plan' value to the enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_TransactionItems_itemType" ADD VALUE IF NOT EXISTS 'service_plan';`
    );

    // Add 'discount' value to the enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_TransactionItems_itemType" ADD VALUE IF NOT EXISTS 'discount';`
    );
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing enum values directly
    // You would need to recreate the enum type if you need to remove values
    // For now, we'll leave this empty as removing enum values is complex
    console.log('Reverting enum values is not supported. Manual intervention required.');
  }
};
