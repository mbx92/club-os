'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StaffAttendance extends Model {
    static associate(models) {
      StaffAttendance.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      StaffAttendance.belongsTo(models.DeviceEmployee, {
        foreignKey: 'deviceEmployeeId',
        as: 'deviceEmployee',
      });
      StaffAttendance.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      StaffAttendance.belongsTo(models.HikvisionDevice, {
        foreignKey: 'deviceId',
        as: 'device',
      });
      StaffAttendance.belongsTo(models.DeviceAttendanceLog, {
        foreignKey: 'logId',
        as: 'log',
      });
    }
  }

  StaffAttendance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      deviceEmployeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'DeviceEmployees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'References DeviceEmployee — primary identifier for attendance',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional link to system User (auto-filled if DeviceEmployee is linked)',
      },
      deviceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'HikvisionDevices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      logId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'DeviceAttendanceLogs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      checkInTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checkOutTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'present',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'StaffAttendance',
    }
  );

  return StaffAttendance;
};
