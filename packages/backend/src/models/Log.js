'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Log extends Model {
    static associate(models) {
      Log.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
      Log.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  Log.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true, // Nullable for system-level logs
      references: {
        model: 'Tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Nullable for system/anonymous actions
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    level: {
      type: DataTypes.ENUM('info', 'warn', 'error', 'security', 'audit', 'auth', 'system', 'debug'),
      allowNull: false,
      defaultValue: 'info',
      comment: 'Log level/category'
    },
    action: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Action performed (e.g., LOGIN, CREATE_USER, UPDATE_PAYMENT)'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Log message'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional context (request, response, error details, etc)'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP address of the request'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP method (GET, POST, PUT, DELETE, etc)'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Request path'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP status code'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Request duration in milliseconds'
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error stack trace for error-level logs'
    }
  }, {
    sequelize,
    modelName: 'Log',
    tableName: 'Logs',
    timestamps: true,
    updatedAt: false, // Logs are immutable, only createdAt
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['userId'] },
      { fields: ['level'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
      { fields: ['tenantId', 'level'] },
      { fields: ['tenantId', 'createdAt'] },
      { fields: ['tenantId', 'userId'] }
    ]
  });
  
  return Log;
};
