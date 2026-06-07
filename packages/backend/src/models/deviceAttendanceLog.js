'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceAttendanceLog extends Model {
    static associate(models) {
      DeviceAttendanceLog.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      DeviceAttendanceLog.belongsTo(models.HikvisionDevice, {
        foreignKey: 'deviceId',
        as: 'device',
      });
      DeviceAttendanceLog.belongsTo(models.DeviceEmployee, {
        foreignKey: 'matchedDeviceEmployeeId',
        as: 'matchedDeviceEmployee',
      });
      DeviceAttendanceLog.belongsTo(models.User, {
        foreignKey: 'matchedUserId',
        as: 'matchedUser',
      });
      DeviceAttendanceLog.belongsTo(models.Member, {
        foreignKey: 'matchedMemberId',
        as: 'matchedMember',
      });
    }
  }

  DeviceAttendanceLog.init(
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
      deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'HikvisionDevices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      deviceEmployeeNo: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      eventTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      cardNo: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      verifyMode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      eventType: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      rawPayload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      matchedDeviceEmployeeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'DeviceEmployees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      matchedUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      matchedMemberId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      source: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'push',
      },
    },
    {
      sequelize,
      modelName: 'DeviceAttendanceLog',
      updatedAt: false, // raw log, no updates
    }
  );

  return DeviceAttendanceLog;
};
