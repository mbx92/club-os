'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeviceEmployees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      deviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'HikvisionDevices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Linked staff user (null if not yet mapped)',
      },
      employeeNo: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: 'Employee number as registered on device',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Employee name as set on device',
      },
      hasFingerprint: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fingerprintCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | inactive',
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time this record was synced with device',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // One employeeNo per device
    await queryInterface.addIndex('DeviceEmployees', ['deviceId', 'employeeNo'], {
      unique: true,
      name: 'unique_device_employee',
    });

    await queryInterface.addIndex('DeviceEmployees', ['tenantId']);
    await queryInterface.addIndex('DeviceEmployees', ['deviceId']);
    await queryInterface.addIndex('DeviceEmployees', ['userId']);
    await queryInterface.addIndex('DeviceEmployees', ['employeeNo']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DeviceEmployees');
  },
};
