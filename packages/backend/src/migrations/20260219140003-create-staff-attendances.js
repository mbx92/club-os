'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StaffAttendances', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Staff user who attended',
      },
      deviceId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'HikvisionDevices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Device that recorded the attendance',
      },
      logId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'DeviceAttendanceLogs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to the raw device log',
      },
      checkInTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      checkOutTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Attendance date for easy querying',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'present',
        comment: 'present | late | absent | half_day',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // One attendance record per user per date
    await queryInterface.addConstraint('StaffAttendances', {
      fields: ['tenantId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_staff_attendance_user_date',
    });

    // Index for date-range reports
    await queryInterface.addIndex('StaffAttendances', ['tenantId', 'date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('StaffAttendances');
  }
};
