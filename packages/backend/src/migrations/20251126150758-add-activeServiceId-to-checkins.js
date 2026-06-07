'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('CheckIns');
    
    if (!tableInfo.activeServiceId) {
      await queryInterface.addColumn('CheckIns', 'activeServiceId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ActiveServices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to the active service used for this check-in'
      });

      // Add index for better query performance
      await queryInterface.addIndex('CheckIns', ['activeServiceId'], {
        name: 'checkins_activeserviceid_idx'
      });
      console.log('✅ activeServiceId column and index added');
    } else {
      console.log('⚠️  activeServiceId already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('CheckIns', 'checkins_activeserviceid_idx');
    await queryInterface.removeColumn('CheckIns', 'activeServiceId');
  }
};
