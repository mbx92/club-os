'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('PsychologyTestTypes');
    
    if (!tableInfo.category) {
      // Add category column
      await queryInterface.addColumn('PsychologyTestTypes', 'category', {
        type: Sequelize.ENUM('personality', 'aptitude', 'interest', 'cognitive', 'other'),
        defaultValue: 'personality',
        allowNull: true
      });
      console.log('✓ Added category column to PsychologyTestTypes');
    } else {
      console.log('category column already exists in PsychologyTestTypes table');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('PsychologyTestTypes', 'category');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PsychologyTestTypes_category";');
  }
};
