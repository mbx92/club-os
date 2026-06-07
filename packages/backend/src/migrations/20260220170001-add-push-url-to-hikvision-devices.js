'use strict';

/**
 * Migration: Add pushUrl and pushEnabled to HikvisionDevices
 *
 * Stores the configured push URL in the database so frontend can display
 * current push status without querying the device hardware.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('HikvisionDevices', 'pushUrl', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: 'Event push URL configured on this device',
    });

    await queryInterface.addColumn('HikvisionDevices', 'pushEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether event push is enabled on this device',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('HikvisionDevices', 'pushEnabled');
    await queryInterface.removeColumn('HikvisionDevices', 'pushUrl');
  },
};
