'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('DeviceAttendanceLogs', 'eventType', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Event type label from device (e.g. AccessControllerEvent)',
      after: 'verifyMode',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('DeviceAttendanceLogs', 'eventType');
  },
};
