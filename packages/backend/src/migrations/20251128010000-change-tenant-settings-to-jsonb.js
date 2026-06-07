'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Convert settings column from JSON to JSONB for better performance
    // and automatic nested object update detection
    await queryInterface.changeColumn('Tenants', 'settings', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to JSON
    await queryInterface.changeColumn('Tenants', 'settings', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {}
    });
  }
};
