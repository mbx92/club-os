'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceSyncLog extends Model {
    static associate(models) {
      DeviceSyncLog.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      DeviceSyncLog.belongsTo(models.HikvisionDevice, {
        foreignKey: 'deviceId',
        as: 'device',
      });
      DeviceSyncLog.belongsTo(models.User, {
        foreignKey: 'triggeredByUserId',
        as: 'triggeredByUser',
      });
    }
  }

  DeviceSyncLog.init(
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
      triggeredByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User yang memicu sync secara manual. Null jika cron/push',
      },
      syncType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'attendance_pull | employee_push_to_device | employee_import_from_device | push_event',
      },
      trigger: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'manual | cron | push_event',
      },
      status: {
        type: DataTypes.STRING(15),
        allowNull: false,
        comment: 'success | partial | failed',
      },
      stats: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stats objek: processed, synced, failed, matched, unmatched, dll.',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Pesan error jika status = failed',
      },
      syncFrom: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Awal rentang waktu untuk attendance_pull',
      },
      syncTo: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Akhir rentang waktu untuk attendance_pull',
      },
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Durasi eksekusi dalam milidetik',
      },
    },
    {
      sequelize,
      modelName: 'DeviceSyncLog',
      tableName: 'DeviceSyncLogs',
      timestamps: true,
      indexes: [
        { fields: ['deviceId', 'createdAt'] },
        { fields: ['tenantId', 'createdAt'] },
        { fields: ['syncType', 'status'] },
      ],
    }
  );

  return DeviceSyncLog;
};
