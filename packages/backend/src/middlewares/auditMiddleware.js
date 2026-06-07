const logger = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');
const { getClientIp } = require('../utils/requestHelper');

/**
 * Audit middleware
 * Gunakan di route yang perlu dicatat (misalnya login, CRUD penting).
 */
function auditLog(action) {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const clientIp = getClientIp(req);
    
    // Override res.send to capture response data
    res.send = function(data) {
      res.responseData = data;
      originalSend.call(res, data);
    };
    
    res.on('finish', () => {
      try {
        const executionTime = Date.now() - startTime;
        
        if (res.statusCode < 400) { // hanya log kalau sukses
          logAudit({
            action,
            user: req.user || { email: 'anonymous' },
            tenant: req.user?.tenant || null,
            request: {
              method: req.method,
              path: req.path,
              ip: clientIp,
              body: req.body
            },
            response: {
              statusCode: res.statusCode,
              data: res.responseData
            },
            executionTime
          });
        } else {
          // Log errors with security level
          logger.logSecurity(`Failed ${action}`, {
            user: req.user || { email: 'anonymous' },
            tenant: req.user?.tenant || null,
            request: {
              method: req.method,
              path: req.path,
              ip: clientIp,
              body: req.body
            },
            response: {
              statusCode: res.statusCode,
              data: res.responseData
            },
            executionTime
          });
        }
      } catch (err) {
        console.error('Error in audit middleware:', err);
      }
    });
    next();
  };
}

module.exports = auditLog;
