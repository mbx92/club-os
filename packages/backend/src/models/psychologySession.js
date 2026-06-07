'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PsychologySession extends Model {
    static associate(models) {
      // Belongs to Tenant
      PsychologySession.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant'
      });

      // Belongs to Order
      PsychologySession.belongsTo(models.PsychologyOrder, {
        foreignKey: 'orderId',
        as: 'order'
      });

      // Belongs to Test Type
      PsychologySession.belongsTo(models.PsychologyTestType, {
        foreignKey: 'testTypeId',
        as: 'testType'
      });

      // Belongs to User (verified by)
      PsychologySession.belongsTo(models.User, {
        foreignKey: 'verifiedBy',
        as: 'verifier'
      });
    }

    /**
     * Check if session is completed
     */
    isCompleted() {
      return this.status === 'completed' && this.completedAt;
    }

    /**
     * Check if session is verified
     */
    isVerified() {
      return this.verifiedAt && this.verifiedBy;
    }

    /**
     * Check if session can be started
     */
    canStart() {
      return this.status === 'pending' || this.status === 'in_progress';
    }

    /**
     * Get answer count (only count answered questions, exclude null/undefined/empty)
     */
    getAnswerCount() {
      if (!this.answers) return 0;
      
      if (Array.isArray(this.answers)) {
        // Count non-null, non-undefined, non-empty items
        return this.answers.filter(a => a !== null && a !== undefined && a !== '').length;
      }
      
      // For object format, count keys with valid values
      return Object.values(this.answers).filter(v => v !== null && v !== undefined && v !== '').length;
    }

    /**
     * Calculate completion percentage for in-progress session
     */
    calculateProgress(totalQuestions) {
      if (!totalQuestions || totalQuestions === 0) return 0;
      const answered = this.getAnswerCount();
      return Math.round((answered / totalQuestions) * 100);
    }

    /**
     * Get duration in minutes
     */
    getDurationMinutes() {
      if (!this.startedAt || !this.completedAt) return null;
      const start = new Date(this.startedAt);
      const end = new Date(this.completedAt);
      return Math.round((end - start) / (1000 * 60));
    }
  }

  PsychologySession.init({
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
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologyOrders',
        key: 'id'
      }
    },
    testTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'PsychologyTestTypes',
        key: 'id'
      }
    },
    sessionToken: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Unique token for this specific test session'
    },
    sessionNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Order of this test in the package (1, 2, 3...)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'started', 'in_progress', 'paused', 'completed', 'verified', 'abandoned', 'timeout'),
      defaultValue: 'pending'
    },
    answers: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'PAPI: [{id, answer}], EPPS: {"1":"A"}'
    },
    scores: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Backend-verified scores (PAPI: 20 scales, EPPS: 15 needs)'
    },
    interpretation: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Interpretation data with percentiles and labels'
    },
    subject: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Subject/patient data snapshot at test time'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When scores were verified by backend'
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Admin who triggered verification (or null for auto)'
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last activity timestamp for timeout detection'
    },
    currentQuestion: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Current question index for progress tracking'
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total time spent in seconds'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'PsychologySession',
    tableName: 'PsychologySessions',
    indexes: [
      {
        fields: ['tenantId', 'orderId'],
        name: 'psychology_sessions_order'
      },
      {
        fields: ['tenantId', 'testTypeId'],
        name: 'psychology_sessions_test_type'
      },
      {
        fields: ['status'],
        name: 'psychology_sessions_status'
      }
    ],
    hooks: {
      beforeUpdate: async (session, options) => {
        // Auto-set startedAt when status changes to in_progress
        if (session.changed('status') && session.status === 'in_progress' && !session.startedAt) {
          session.startedAt = new Date();
        }
        
        // Auto-set completedAt when status changes to completed
        if (session.changed('status') && session.status === 'completed' && !session.completedAt) {
          session.completedAt = new Date();
        }
      }
    }
  });

  return PsychologySession;
};
