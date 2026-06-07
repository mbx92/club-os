'use strict';

/**
 * PrintJob Model
 * 
 * Tracks print jobs for thermal printers with queue management,
 * retry mechanism, and health monitoring.
 * 
 * Features:
 * - Job status tracking (pending, printing, completed, failed)
 * - Automatic retry mechanism
 * - Stuck job detection for health monitoring
 * - Reference to source transaction/order
 * - Priority queue support
 * 
 * @module models/printJob
 */

module.exports = (sequelize, DataTypes) => {
  const PrintJob = sequelize.define('PrintJob', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: { msg: 'Tenant ID is required' },
        notEmpty: { msg: 'Tenant ID cannot be empty' }
      }
    },
    printerId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Printer ID is required' },
        notEmpty: { msg: 'Printer ID cannot be empty' }
      },
      comment: 'ID from tenant.settings.printers'
    },
    jobType: {
      type: DataTypes.ENUM('receipt', 'kitchen', 'label', 'invoice', 'report'),
      allowNull: false,
      defaultValue: 'receipt',
      validate: {
        isIn: {
          args: [['receipt', 'kitchen', 'label', 'invoice', 'report']],
          msg: 'Job type must be receipt, kitchen, label, invoice, or report'
        }
      }
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Model name (Transaction, Order, Membership, etc)'
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of referenced model'
    },
    status: {
      type: DataTypes.ENUM('pending', 'printing', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'printing', 'completed', 'failed', 'cancelled']],
          msg: 'Status must be pending, printing, completed, failed, or cancelled'
        }
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Priority must be non-negative' }
      },
      comment: 'Higher value = higher priority'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Attempts cannot be negative' }
      }
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: { args: [0], msg: 'Max retries must be non-negative' }
      }
    },
    printData: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Print data is required' },
        notEmpty: { msg: 'Print data cannot be empty' }
      },
      comment: 'ESC/POS commands (base64 encoded)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional metadata (customer name, items, etc)'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    printDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in milliseconds'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'PrintJobs',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['printerId'] },
      { fields: ['status'] },
      { fields: ['jobType'] },
      { fields: ['referenceType', 'referenceId'] },
      { fields: ['tenantId', 'printerId', 'status', 'priority'] },
      { fields: ['scheduledAt'] }
    ]
  });

  /**
   * Associations
   */
  PrintJob.associate = function(models) {
    // Belongs to Tenant
    PrintJob.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Belongs to User (creator)
    PrintJob.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  /**
   * Instance Methods
   */

  /**
   * Check if job is stuck (in printing status for > 5 minutes)
   */
  PrintJob.prototype.isStuck = function() {
    if (this.status !== 'printing' && this.status !== 'pending') {
      return false;
    }

    const now = new Date();
    const checkTime = this.startedAt || this.scheduledAt;
    const minutesElapsed = (now - checkTime) / 1000 / 60;

    return minutesElapsed > 5;
  };

  /**
   * Check if job can be retried
   */
  PrintJob.prototype.canRetry = function() {
    return this.status === 'failed' && this.attempts < this.maxRetries;
  };

  /**
   * Mark job as started
   */
  PrintJob.prototype.markStarted = async function() {
    this.status = 'printing';
    this.startedAt = new Date();
    this.attempts += 1;
    return await this.save();
  };

  /**
   * Mark job as completed
   */
  PrintJob.prototype.markCompleted = async function() {
    const now = new Date();
    this.status = 'completed';
    this.completedAt = now;
    
    if (this.startedAt) {
      this.printDuration = now - this.startedAt;
    }
    
    return await this.save();
  };

  /**
   * Mark job as failed
   */
  PrintJob.prototype.markFailed = async function(error) {
    this.status = 'failed';
    this.error = error.message || error.toString();
    this.errorStack = error.stack;
    return await this.save();
  };

  /**
   * Mark job as cancelled
   */
  PrintJob.prototype.markCancelled = async function() {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    return await this.save();
  };

  /**
   * Class Methods
   */

  /**
   * Get pending jobs for a printer (ordered by priority)
   */
  PrintJob.getPendingJobs = async function(tenantId, printerId, limit = 10) {
    return await PrintJob.findAll({
      where: {
        tenantId,
        printerId,
        status: 'pending'
      },
      order: [
        ['priority', 'DESC'],
        ['scheduledAt', 'ASC']
      ],
      limit
    });
  };

  /**
   * Get stuck jobs (printing/pending for > 5 minutes)
   */
  PrintJob.getStuckJobs = async function(tenantId, printerId = null) {
    const { Op } = require('sequelize');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const where = {
      tenantId,
      status: { [Op.in]: ['printing', 'pending'] },
      [Op.or]: [
        {
          startedAt: { [Op.lte]: fiveMinutesAgo },
          status: 'printing'
        },
        {
          scheduledAt: { [Op.lte]: fiveMinutesAgo },
          status: 'pending',
          startedAt: null
        }
      ]
    };

    if (printerId) {
      where.printerId = printerId;
    }

    return await PrintJob.findAll({ where });
  };

  /**
   * Get job statistics for a printer
   */
  PrintJob.getStatistics = async function(tenantId, printerId, startDate = null) {
    const { Op } = require('sequelize');
    
    const where = { tenantId, printerId };
    
    if (startDate) {
      where.createdAt = { [Op.gte]: startDate };
    }

    const [total, completed, failed, pending, cancelled] = await Promise.all([
      PrintJob.count({ where }),
      PrintJob.count({ where: { ...where, status: 'completed' } }),
      PrintJob.count({ where: { ...where, status: 'failed' } }),
      PrintJob.count({ where: { ...where, status: 'pending' } }),
      PrintJob.count({ where: { ...where, status: 'cancelled' } })
    ]);

    // Get average print duration
    const avgResult = await PrintJob.findOne({
      where: { ...where, status: 'completed', printDuration: { [Op.ne]: null } },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('printDuration')), 'avgDuration']
      ],
      raw: true
    });

    return {
      total,
      completed,
      failed,
      pending,
      cancelled,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
      avgDuration: avgResult?.avgDuration ? Math.round(avgResult.avgDuration) : null
    };
  };

  /**
   * Clean old completed jobs (older than 30 days)
   */
  PrintJob.cleanOldJobs = async function(daysOld = 30) {
    const { Op } = require('sequelize');
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return await PrintJob.destroy({
      where: {
        status: { [Op.in]: ['completed', 'cancelled'] },
        updatedAt: { [Op.lte]: cutoffDate }
      },
      force: true // Hard delete
    });
  };

  return PrintJob;
};
