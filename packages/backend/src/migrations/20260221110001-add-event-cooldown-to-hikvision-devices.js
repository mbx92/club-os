'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('HikvisionDevices', 'eventCooldownMinutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Minimum minutes between attendance events for the same person. Prevents duplicate check-in/check-out from rapid scans.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('HikvisionDevices', 'eventCooldownMinutes');
  },
};
