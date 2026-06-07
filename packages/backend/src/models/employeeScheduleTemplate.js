'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployeeScheduleTemplate extends Model {
    static associate(models) {
      EmployeeScheduleTemplate.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
      EmployeeScheduleTemplate.belongsTo(models.DeviceEmployee, {
        foreignKey: 'deviceEmployeeId',
        as: 'deviceEmployee',
      });
      EmployeeScheduleTemplate.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      EmployeeScheduleTemplate.belongsTo(models.Shift, {
        foreignKey: 'shiftId',
        as: 'shift',
      });
    }
  }

  EmployeeScheduleTemplate.init(
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
        comment: 'References DeviceEmployee — the primary employee identifier for scheduling',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional link to system User (auto-filled if DeviceEmployee is linked)',
      },
      shiftId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Shifts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 6,
        },
        comment: '0=Sunday, 1=Monday, ..., 6=Saturday',
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
      modelName: 'EmployeeScheduleTemplate',
      indexes: [
        {
          unique: true,
          fields: ['tenantId', 'deviceEmployeeId', 'dayOfWeek'],
          name: 'unique_employee_schedule_template',
        },
      ],
    }
  );

  return EmployeeScheduleTemplate;
};
