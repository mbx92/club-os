'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologyReportCache extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologyReportCache.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to Session
      PsychologyReportCache.belongsTo(models.PsychologySession, {
        foreignKey: 'sessionId',
        as: 'session'
      });
    }

    /**
     * Check if cache is expired
     */
    isExpired() {
      return new Date(this.expiresAt) < new Date();
    }

    /**
     * Check if cache is still valid
     */
    isValid() {
      return !this.isExpired();
    }

    /**
     * Get human-readable file size
     */
    getFileSizeFormatted() {
      if (!this.fileSize) return 'Unknown';
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
      return `${(this.fileSize / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Get time until expiration
     */
    getTimeUntilExpiry() {
      const now = new Date();
      const expiry = new Date(this.expiresAt);
      const diff = expiry - now;
      
      if (diff <= 0) return 'Expired';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  }

  PsychologyReportCache.init({
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
    reportType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'full',
      validate: {
        isIn: {
          args: [['full', 'summary', 'detailed', 'participant']],
          msg: 'reportType must be one of: full, summary, detailed, participant'
        }
      },
      comment: 'Report type: full, summary, detailed, participant'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Absolute path to PDF file on disk'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename for download'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'File size in bytes'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      defaultValue: 'application/pdf'
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When this cache expires (default: 24 hours from generation)'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastDownloadedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional metadata: participantName, packageName, generatedBy, etc.'
    }
  }, {
    sequelize,
    modelName: 'PsychologyReportCache',
    tableName: 'PsychologyReportCaches',
    indexes: [
      {
        name: 'idx_report_cache_tenant',
        fields: ['tenantId']
      },
      {
        name: 'idx_report_cache_session',
        fields: ['sessionId']
      },
      {
        name: 'idx_report_cache_expires',
        fields: ['expiresAt']
      },
      {
        name: 'idx_unique_session_report_type',
        unique: true,
        fields: ['sessionId', 'reportType']
      }
    ]
  });

  return PsychologyReportCache;
};
