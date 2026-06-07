'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TestSessionLog extends Model {
    static associate(models) {
      // Belongs to Tenant
      TestSessionLog.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to PsychologySession
      TestSessionLog.belongsTo(models.PsychologySession, {
        foreignKey: 'sessionId',
        as: 'session'
      });
    }

    /**
     * Create a log entry for a session
     * @param {Object} options - Log options
     * @param {string} options.sessionId - Session UUID
     * @param {string} options.tenantId - Tenant UUID
     * @param {string} options.level - Log level (debug, info, warn, error)
     * @param {string} options.eventType - Event type identifier
     * @param {string} [options.message] - Human readable message
     * @param {Object} [options.data] - Additional data
     * @param {Date} [options.clientTimestamp] - Client timestamp
     * @param {string} [options.ipAddress] - Client IP
     * @param {string} [options.userAgent] - Client user agent
     */
    static async createLog(options) {
      const {
        sessionId,
        tenantId,
        level = 'info',
        eventType,
        message,
        data = {},
        clientTimestamp,
        ipAddress,
        userAgent
      } = options;

      return this.create({
        sessionId,
        tenantId,
        level,
        eventType,
        message,
        data,
        clientTimestamp,
        ipAddress,
        userAgent
      });
    }

    /**
     * Bulk create log entries
     * @param {Array} logs - Array of log objects
     */
    static async createBulkLogs(logs) {
      return this.bulkCreate(logs);
    }
  }

  TestSessionLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologySessions',
        key: 'id'
      }
    },
    level: {
      type: DataTypes.ENUM('debug', 'info', 'warn', 'error'),
      allowNull: false,
      defaultValue: 'info'
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    clientTimestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'TestSessionLog',
    tableName: 'TestSessionLogs',
    timestamps: false, // We only use createdAt, no updatedAt
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['sessionId'] },
      { fields: ['level'] },
      { fields: ['eventType'] },
      { fields: ['createdAt'] },
      { fields: ['sessionId', 'eventType'] },
      { fields: ['sessionId', 'createdAt'] }
    ]
  });

  return TestSessionLog;
};
