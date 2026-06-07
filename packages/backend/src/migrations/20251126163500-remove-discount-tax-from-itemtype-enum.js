'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ENUM already updated by previous migration (20251125004200)
    // Data already cleaned up manually
    // Only need to make itemId NOT NULL
    
    console.log('Making itemId NOT NULL...');
    
    const tableInfo = await queryInterface.describeTable('TransactionItems');
    if (tableInfo.itemId && tableInfo.itemId.allowNull) {
      await queryInterface.changeColumn('TransactionItems', 'itemId', {
        type: Sequelize.UUID,
        allowNull: false
      });
      console.log('✅ itemId set to NOT NULL');
    } else {
      console.log('⚠️  itemId already NOT NULL, skipping');
    }
    
    console.log('Migration complete - discount and tax removed from itemType enum');
  },

  async down(queryInterface, Sequelize) {
    // Rollback: Allow itemId to be null again
    await queryInterface.changeColumn('TransactionItems', 'itemId', {
      type: Sequelize.UUID,
      allowNull: true
    });
  }
};
