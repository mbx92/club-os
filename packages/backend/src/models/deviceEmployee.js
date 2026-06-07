'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceEmployee extends Model {
    static associate(models) {
      DeviceEmployee.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      DeviceEmployee.belongsTo(models.HikvisionDevice, {
        foreignKey: 'deviceId',
        as: 'device',
      });
      DeviceEmployee.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  DeviceEmployee.init(
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
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      employeeNo: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hasFingerprint: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      fingerprintCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | inactive | pending_sync | sync_failed',
      },
      lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DeviceEmployee',
      indexes: [
        {
          unique: true,
          fields: ['deviceId', 'employeeNo'],
          name: 'unique_device_employee',
        },
      ],
    }
  );

  return DeviceEmployee;
};
