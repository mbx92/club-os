'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove membershipId column from Payment table
    // First check if the column exists
    try {
      await queryInterface.removeColumn('Payments', 'membershipId');
    } catch (error) {
      // Column might not exist, continue execution
      console.log('membershipId column does not exist or was already removed');
    }
  },

  async down(queryInterface, Sequelize) {
    // Add back membershipId column to Payment table
    await queryInterface.addColumn('Payments', 'membershipId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Memberships',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};