'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add 'trial' to the ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Subscriptions_status" ADD VALUE IF NOT EXISTS 'trial';
    `);
    
    console.log('✅ Added "trial" value to Subscription status ENUM');
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing ENUM values directly
    // You would need to recreate the type if you want to remove 'trial'
    console.log('⚠️  Cannot remove ENUM value in PostgreSQL. Manual intervention required.');
  }
};
