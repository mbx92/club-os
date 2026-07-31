const { Log, Tenant, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');
const { startOfDayInTz, endOfDayInTz, DEFAULT_TIMEZONE } = require('../utils/tenantTimezone');
const fs = require('fs');
const path = require('path');

/**
 * Log Service - Business logic for log management
 */

/**
 * Build where clause for log queries
 */
function buildLogWhereClause(filters) {
  const { 
    tenantId, 
    userId, 
    level, 
    action, 
    search,
    startDate, 
    endDate,
    isSuperAdmin,
    timezone = DEFAULT_TIMEZONE,
  } = filters;
  
  const where = {};

  // Tenant filter
  if (!isSuperAdmin && tenantId) {
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  // User filter
  if (userId) {
    where.userId = userId;
  }

  // Level filter
  if (level && level !== 'all') {
    where.level = level;
  }

  // Action filter
  if (action) {
    where.action = { [Op.iLike]: `%${action}%` };
  }

  // Search in message
  if (search) {
    where[Op.or] = [
      { message: { [Op.iLike]: `%${search}%` } },
      { action: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = startOfDayInTz(startDate, timezone);
    }
    if (endDate) {
      where.createdAt[Op.lte] = endOfDayInTz(endDate, timezone);
    }
  }

  return where;
}

/**
 * Get logs with pagination and filters
 */
async function getLogs(filters, pagination) {
  const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const where = buildLogWhereClause(filters);

  // Validate sort field
  const allowedSortFields = ['createdAt', 'level', 'action', 'statusCode'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows: logs } = await Log.findAndCountAll({
    where,
    order: [[sortField, order]],
    limit: limitNum,
    offset,
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
        required: false
      }
    ]
  });

  const totalPages = Math.ceil(count / limitNum);

  return {
    data: logs,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalRecords: count,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
}

/**
 * Get log by ID
 */
async function getLogById(id, tenantId, isSuperAdmin = false) {
  const where = { id };
  if (!isSuperAdmin && tenantId) {
    where.tenantId = tenantId;
  }

  const log = await Log.findOne({
    where,
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }
    ]
  });

  if (!log) {
    throw new Error('Log not found');
  }

  return log;
}

/**
 * Get log statistics
 */
async function getLogStats(tenantId, isSuperAdmin = false, dateRange = {}) {
  const where = {};
  const timezone = dateRange.timezone || DEFAULT_TIMEZONE;
  
  if (!isSuperAdmin && tenantId) {
    where.tenantId = tenantId;
  } else if (tenantId) {
    where.tenantId = tenantId;
  }

  // Apply date range if provided
  if (dateRange.startDate || dateRange.endDate) {
    where.createdAt = {};
    if (dateRange.startDate) {
      where.createdAt[Op.gte] = startOfDayInTz(dateRange.startDate, timezone);
    }
    if (dateRange.endDate) {
      where.createdAt[Op.lte] = endOfDayInTz(dateRange.endDate, timezone);
    }
  }

  // Get total count
  const totalLogs = await Log.count({ where });

  // Count by level
  const logsByLevel = await Log.findAll({
    where,
    attributes: [
      'level',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['level'],
    raw: true
  });

  // Count by date (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const logsByDate = await Log.findAll({
    where: {
      ...where,
      createdAt: { [Op.gte]: sevenDaysAgo }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
    raw: true
  });

  // Top users by log count
  const topUsers = await Log.findAll({
    where: {
      ...where,
      userId: { [Op.ne]: null }
    },
    attributes: [
      'userId',
      [sequelize.fn('COUNT', sequelize.col('Log.id')), 'count']
    ],
    include: [{
      model: User,
      as: 'user',
      attributes: ['email', 'firstName', 'lastName']
    }],
    group: ['userId', 'user.id', 'user.email', 'user.firstName', 'user.lastName'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 10,
    subQuery: false
  });

  // Top actions
  const topActions = await Log.findAll({
    where: {
      ...where,
      action: { [Op.ne]: null }
    },
    attributes: [
      'action',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['action'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 10,
    raw: true
  });

  return {
    totalLogs,
    logsByLevel: logsByLevel.map(l => ({
      level: l.level,
      count: parseInt(l.count, 10)
    })),
    logsByDate: logsByDate.map(l => ({
      date: l.date,
      count: parseInt(l.count, 10)
    })),
    topUsers: topUsers.map(l => ({
      userId: l.userId,
      user: l.user,
      count: parseInt(l.get('count'), 10)
    })),
    topActions: topActions.map(l => ({
      action: l.action,
      count: parseInt(l.count, 10)
    }))
  };
}

/**
 * Delete logs older than specified days
 * @param {number} days - Number of days to keep logs (default: 7)
 * @param {string} tenantId - Optional tenant ID for tenant-specific cleanup
 */
async function cleanupOldLogs(days = 7, tenantId = null) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const where = {
    createdAt: { [Op.lt]: cutoffDate }
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const deletedCount = await Log.destroy({ where });

  logger.logSystem(`Log cleanup completed: ${deletedCount} logs deleted older than ${days} days`, {
    action: 'LOG_CLEANUP',
    userId: null,      // System task, no user
    tenantId: tenantId || null,
    ip: 'system',
    userAgent: 'scheduled-task',
    method: 'SYSTEM',
    path: '/system/log-cleanup',
    skipDb: true, // Don't log this to database to avoid recursive logging
    deletedCount,
    cutoffDate
  });

  return deletedCount;
}

/**
 * Delete specific logs (for manual cleanup)
 */
async function deleteLogs(logIds, tenantId, isSuperAdmin = false) {
  const where = {
    id: { [Op.in]: logIds }
  };

  if (!isSuperAdmin && tenantId) {
    where.tenantId = tenantId;
  }

  const deletedCount = await Log.destroy({ where });
  return deletedCount;
}

/**
 * Export logs to JSON format
 */
async function exportLogs(filters) {
  const where = buildLogWhereClause(filters);
  
  const logs = await Log.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 10000, // Max export limit
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName']
      }
    ]
  });

  return logs.map(log => log.toJSON());
}

/**
 * Cleanup old log files from logs directory
 * Keeps only the last N days of log files
 */
async function cleanupLogFiles(daysToKeep = 3) {
  const logsDir = path.join(__dirname, '../../logs');
  
  if (!fs.existsSync(logsDir)) {
    return {
      success: false,
      message: 'Logs directory not found',
      deletedFiles: []
    };
  }

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - daysToKeep);

  const files = fs.readdirSync(logsDir);
  const deletedFiles = [];
  const errors = [];

  for (const file of files) {
    const filePath = path.join(logsDir, file);
    
    try {
      const stats = fs.statSync(filePath);
      
      // Only process files (not directories)
      if (!stats.isFile()) continue;
      
      // Skip audit JSON files (they're metadata for winston-daily-rotate-file)
      if (file.endsWith('-audit.json')) continue;
      
      // Check if file is older than cutoff date
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedFiles.push({
          fileName: file,
          size: stats.size,
          modifiedDate: stats.mtime
        });
      }
    } catch (error) {
      errors.push({
        fileName: file,
        error: error.message
      });
    }
  }

  return {
    success: true,
    daysToKeep,
    cutoffDate,
    deletedFiles,
    deletedCount: deletedFiles.length,
    errors,
    message: `Deleted ${deletedFiles.length} log file(s) older than ${daysToKeep} days`
  };
}

module.exports = {
  getLogs,
  getLogById,
  getLogStats,
  cleanupOldLogs,
  cleanupLogFiles,
  deleteLogs,
  exportLogs,
  buildLogWhereClause
};
