const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Lazy-load Log model to avoid circular dependency
let Log = null;
function getLogModel() {
  if (!Log) {
    try {
      const models = require('../models');
      Log = models.Log;
    } catch (err) {
      // Models not loaded yet or circular dependency
      return null;
    }
  }
  return Log;
}

// Custom format with user information and log levels
const logFormat = format.printf((info) => {
  const { level, message, timestamp, stack, action, user, request, response, executionTime, ...rest } = info;
  
  let log = `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  
  // Add action if available (especially for security, audit logs)
  if (action) {
    log += ` [ACTION: ${action}]`;
  }
  
  // Add user information if available
  if (user) {
    log += ` [USER: ${user.email || user.id}`;
    if (user.tenant) {
      log += ` [TENANT: ${user.tenant.name || user.tenant.id}]`;
    }
    if (user.role) {
      log += ` [ROLE: ${user.role}]`;
    }
  }
  
  // Add request information if available
  if (request) {
    log += ` [METHOD: ${request.method}] [PATH: ${request.path}]`;
    if (request.ip) {
      log += ` [IP: ${request.ip}]`;
    }
  }
  
  // Add response information if available
  if (response) {
    log += ` [STATUS: ${response.statusCode}]`;
  }
  
  // Add execution time if available
  if (executionTime) {
    log += ` [DURATION: ${executionTime}ms]`;
  }
  
  return log;
});

// Define log levels
const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
  // Custom levels for our application
  auth: 7,      // Authentication events (login, logout, register)
  audit: 8,     // Data modification events (create, update, delete)
  security: 9,   // Security events (failed login, permission denied)
  system: 10     // System events (startup, shutdown, error)
};

const logger = createLogger({
  levels: customLevels,
  level: 'system', // Log everything up to system level
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  defaultMeta: { service: 'gym-membership-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize({
          colors: {
            error: 'red',
            warn: 'yellow',
            info: 'green',
            http: 'magenta',
            verbose: 'cyan',
            debug: 'blue',
            silly: 'grey',
            auth: 'yellow',
            audit: 'green',
            security: 'red',
            system: 'blue'
          }
        }),
        format.simple()
      )
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Separate file for audit logs
    new DailyRotateFile({
      level: 'audit',
      filename: path.join(__dirname, '../../logs/audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    // Separate file for security logs
    new DailyRotateFile({
      level: 'security',
      filename: path.join(__dirname, '../../logs/security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d'
    }),
    // Separate file for auth logs
    new DailyRotateFile({
      level: 'auth',
      filename: path.join(__dirname, '../../logs/auth-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d'
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

/**
 * Save log to database asynchronously
 */
async function saveToDatabase(level, message, meta = {}) {
  // Get Log model lazily to avoid circular dependency
  const LogModel = getLogModel();
  
  // Skip if Log model not available or if explicitly disabled
  if (!LogModel || meta.skipDb) {
    return;
  }

  try {
    const logData = {
      level: level === 'auth' || level === 'audit' || level === 'security' ? level : 
             level === 'system' ? 'info' : level,
      message,
      tenantId: meta.tenantId || meta.user?.tenantId || null,
      userId: meta.userId || meta.user?.id || null,
      action: meta.action || null,
      metadata: {
        ...meta,
        user: undefined, // Remove circular references
        request: meta.request ? {
          method: meta.request.method,
          path: meta.request.path,
          body: meta.request.body,
          query: meta.request.query
        } : undefined
      },
      ipAddress: meta.request?.ip || meta.ip || null,
      userAgent: meta.request?.headers?.['user-agent'] || meta.userAgent || null,
      method: meta.request?.method || meta.method || null,
      path: meta.request?.path || meta.path || null,
      statusCode: meta.response?.statusCode || meta.statusCode || null,
      duration: meta.executionTime || meta.duration || null,
      errorStack: meta.stack || null
    };

    // Use setImmediate to avoid blocking
    setImmediate(async () => {
      try {
        await LogModel.create(logData);
      } catch (dbError) {
        // Silent fail for database logging to not disrupt app
        console.error('Failed to save log to database:', dbError.message);
      }
    });
  } catch (err) {
    console.error('Error preparing log for database:', err.message);
  }
}

// Helper functions for different log types
logger.logAuth = (message, meta = {}) => {
  try {
    logger.log('auth', message, meta);
    saveToDatabase('auth', message, meta);
  } catch (err) {
    console.error('Error in auth logger:', err);
  }
};

logger.logAudit = (message, meta = {}) => {
  try {
    logger.log('audit', message, meta);
    saveToDatabase('audit', message, meta);
  } catch (err) {
    console.error('Error in audit logger:', err);
  }
};

logger.logSecurity = (message, meta = {}) => {
  try {
    logger.log('security', message, meta);
    saveToDatabase('security', message, meta);
  } catch (err) {
    console.error('Error in security logger:', err);
  }
};

logger.logSystem = (message, meta = {}) => {
  try {
    logger.log('system', message, meta);
    // Auto-add action if not provided for system logs
    const systemMeta = meta.action ? meta : { ...meta, action: meta.action || 'SYSTEM' };
    saveToDatabase('info', message, systemMeta);
  } catch (err) {
    console.error('Error in system logger:', err);
  }
};

logger.logInfo = (message, meta = {}) => {
  try {
    logger.log('info', message, meta);
    saveToDatabase('info', message, meta);
  } catch (err) {
    console.error('Error in info logger:', err);
  }
};

logger.logError = (message, meta = {}) => {
  try {
    logger.log('error', message, meta);
    saveToDatabase('error', message, meta);
  } catch (err) {
    console.error('Error in error logger:', err);
  }
};

logger.logWarn = (message, meta = {}) => {
  try {
    logger.log('warn', message, meta);
    saveToDatabase('warn', message, meta);
  } catch (err) {
    console.error('Error in warn logger:', err);
  }
};

module.exports = logger;
