'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ServicePlans', 'allowWalkIn', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this service plan can be sold to walk-in customers without a Member record'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ServicePlans', 'allowWalkIn');
  }
};
