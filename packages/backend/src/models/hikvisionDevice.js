'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HikvisionDevice extends Model {
    static associate(models) {
      HikvisionDevice.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      HikvisionDevice.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location',
      });
      HikvisionDevice.hasMany(models.DeviceAttendanceLog, {
        foreignKey: 'deviceId',
        as: 'attendanceLogs',
      });
      HikvisionDevice.hasMany(models.StaffAttendance, {
        foreignKey: 'deviceId',
        as: 'staffAttendances',
      });
    }
  }

  HikvisionDevice.init(
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
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 80,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      serialNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      useForMemberCheckIn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pushUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
        comment: 'Event push URL configured on this device',
      },
      pushEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether event push is enabled on this device',
      },
      eventCooldownMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Minimum minutes between attendance events for the same person. Prevents duplicate check-in/check-out from rapid scans.',
      },
    },
    {
      sequelize,
      modelName: 'HikvisionDevice',
      paranoid: true, // soft delete via deletedAt
    }
  );

  return HikvisionDevice;
};
