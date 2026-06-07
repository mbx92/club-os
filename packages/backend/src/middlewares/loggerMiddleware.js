const logger = require('../utils/logger');
const { getClientIp } = require('../utils/requestHelper');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const clientIp = getClientIp(req);
    
    // Log general app activity
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${clientIp}`
    );
    
    // Log auth events to auth log
    if (req.originalUrl.includes('/auth/')) {
      logger.logAuth(
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
        {
          request: {
            method: req.method,
            path: req.path,
            ip: clientIp
          },
          response: {
            statusCode: res.statusCode
          },
          executionTime: duration
        }
      );
    }
    
    // Log security events to security log
    if (res.statusCode >= 400) {
      logger.logSecurity(
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
        {
          request: {
            method: req.method,
            path: req.path,
            ip: clientIp
          },
          response: {
            statusCode: res.statusCode
          },
          executionTime: duration
        }
      );
    }
  });

  next();
}

module.exports = requestLogger;
