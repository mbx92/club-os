'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployeeScheduleOverride extends Model {
    static associate(models) {
      EmployeeScheduleOverride.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      EmployeeScheduleOverride.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  EmployeeScheduleOverride.init(
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      shiftStart: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      shiftEnd: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      isOff: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EmployeeScheduleOverride',
      indexes: [
        {
          unique: true,
          fields: ['tenantId', 'userId', 'date'],
          name: 'unique_employee_schedule_override',
        },
      ],
    }
  );

  return EmployeeScheduleOverride;
};
