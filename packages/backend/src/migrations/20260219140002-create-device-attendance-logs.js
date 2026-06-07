'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeviceAttendanceLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      deviceEmployeeNo: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Employee ID stored on the device',
      },
      eventTime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp from the device event',
      },
      cardNo: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Card number if card-based verification',
      },
      verifyMode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'fingerprint / card / face / password / etc.',
      },
      rawPayload: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Full event JSON from device for debugging',
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this log was processed; null = unprocessed',
      },
      matchedUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Staff user matched from deviceEmployeeNo',
      },
      matchedMemberId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Member matched from deviceEmployeeNo (if enabled)',
      },
      source: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'push',
        comment: 'push = device pushed event, pull = cron job pulled',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Unique constraint to prevent duplicate events
    await queryInterface.addConstraint('DeviceAttendanceLogs', {
      fields: ['deviceId', 'deviceEmployeeNo', 'eventTime'],
      type: 'unique',
      name: 'uq_device_attendance_logs_event',
    });

    // Index for tenant + processing status
    await queryInterface.addIndex('DeviceAttendanceLogs', ['tenantId', 'processedAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DeviceAttendanceLogs');
  }
};
