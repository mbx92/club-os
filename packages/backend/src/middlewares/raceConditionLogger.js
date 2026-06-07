'use strict';

const logger = require('../utils/logger');
const { getClientIp } = require('../utils/requestHelper');

/**
 * Middleware to log potential race conditions
 */
const raceConditionLogger = (req, res, next) => {
  const originalSend = res.send;
  const clientIp = getClientIp(req);
  
  res.send = function(data) {
    // Log optimistic locking errors
    if (res.statusCode === 409) {
      logger.warn('Race condition detected', {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: clientIp,
        userId: req.user ? req.user.id : null,
        tenantId: req.user ? req.user.tenantId : null,
        timestamp: new Date().toISOString(),
        error: data && typeof data === 'object' ? data.error : 'Conflict error'
      });
    }
    
    // Log stock errors
    if (res.statusCode === 400 && data && typeof data === 'object' && data.message && data.message.includes('stock')) {
      logger.warn('Stock race condition detected', {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: clientIp,
        userId: req.user ? req.user.id : null,
        tenantId: req.user ? req.user.tenantId : null,
        timestamp: new Date().toISOString(),
        error: data.message
      });
    }
    
    // Log voucher usage limit errors
    if (res.statusCode === 400 && data && typeof data === 'object' && data.message && data.message.includes('usage limit')) {
      logger.warn('Voucher usage limit race condition detected', {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: clientIp,
        userId: req.user ? req.user.id : null,
        tenantId: req.user ? req.user.tenantId : null,
        timestamp: new Date().toISOString(),
        error: data.message
      });
    }
    
    // Call the original send method
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Helper function to log race condition retries
 * @param {string} operation - Operation being retried
 * @param {number} attempt - Current attempt number
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {Object} context - Additional context
 */
const logRetryAttempt = (operation, attempt, maxAttempts, context = {}) => {
  logger.info(`Retry attempt for ${operation}`, {
    operation,
    attempt,
    maxAttempts,
    timestamp: new Date().toISOString(),
    ...context
  });
};

/**
 * Helper function to log successful retry
 * @param {string} operation - Operation that was retried
 * @param {number} attempts - Number of attempts taken
 * @param {Object} context - Additional context
 */
const logRetrySuccess = (operation, attempts, context = {}) => {
  logger.info(`Retry successful for ${operation}`, {
    operation,
    attempts,
    timestamp: new Date().toISOString(),
    ...context
  });
};

/**
 * Helper function to log failed retry
 * @param {string} operation - Operation that was retried
 * @param {number} attempts - Number of attempts taken
 * @param {Error} error - Error that caused the failure
 * @param {Object} context - Additional context
 */
const logRetryFailure = (operation, attempts, error, context = {}) => {
  logger.error(`Retry failed for ${operation}`, {
    operation,
    attempts,
    error: error.message,
    timestamp: new Date().toISOString(),
    ...context
  });
};

module.exports = {
  raceConditionLogger,
  logRetryAttempt,
  logRetrySuccess,
  logRetryFailure
};