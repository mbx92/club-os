const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const auditLogFormat = format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    auditLogFormat
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

function logAudit({ action, user, tenant, request, response, executionTime }) {
  try {
    const userInfo = user?.email || 'unknown';
    const tenantInfo = tenant?.name || 'unknown';
    const method = request?.method || 'unknown';
    const path = request?.path || 'unknown';
    const ip = request?.ip || 'unknown';
    const statusCode = response?.statusCode || 'unknown';
    
    auditLogger.info(
      `User=${userInfo} | Tenant=${tenantInfo} | Action=${action} | Method=${method} | Path=${path} | IP=${ip} | Status=${statusCode} | ExecutionTime=${executionTime}ms`
    );
  } catch (err) {
    console.error('Error in audit logger:', err);
  }
}

module.exports = { logAudit };
