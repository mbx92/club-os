'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ServicePlans', 'pax', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of people included in this plan (e.g. 2 for "2 Pax Daily Pass"). Used for accurate headcount in shift reports.'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ServicePlans', 'pax');
  }
};
