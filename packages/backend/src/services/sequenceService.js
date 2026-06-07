const { Sequence } = require('../models');
const { sequelize } = require('../models');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');
const { calendarDateLocal, parseDateOnlyLocal } = require('../utils/calendarDate');

/**
 * Generate next sequence number with race condition prevention
 * Uses database row-level locking (SELECT FOR UPDATE) in transaction
 * 
 * @param {string} sequenceName - Name of the sequence (e.g., 'invoice_number', 'service_transaction_{tenantId}')
 * @param {object} transaction - Sequelize transaction object (optional)
 * @param {object} options - Options for auto-creating sequence if not exists
 * @param {string} options.prefix - Prefix for auto-created sequence (default: 'TRX-')
 * @param {string} options.resetPeriod - Reset period for auto-created sequence (default: 'monthly')
 * @param {number} options.padLength - Pad length for auto-created sequence (default: 4)
 * @returns {Promise<string>} Generated sequence number (e.g., 'INV-202511-000001')
 */
async function getNextSequence(sequenceName, transaction = null, options = {}) {
  const t = transaction || await sequelize.transaction();
  
  try {
    // Lock the row for update to prevent race condition
    let sequence = await Sequence.findOne({
      where: { name: sequenceName },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    // Auto-create sequence if not exists
    if (!sequence) {
      logger.logInfo('Auto-creating sequence', {
      action: 'AUTOCREATING_SEQUENCE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      sequenceName, options
    });
      
      sequence = await Sequence.create({
        name: sequenceName,
        prefix: options.prefix || 'TRX-',
        currentValue: 0,
        step: 1,
        padLength: options.padLength || 4,
        resetPeriod: options.resetPeriod || 'monthly',
        lastResetDate: calendarDateLocal(new Date())
      }, { transaction: t });
    }

    const now = new Date();
    const currentDate = calendarDateLocal(now);
    let shouldReset = false;

    // Check if sequence should be reset based on resetPeriod
    if (sequence.resetPeriod !== 'none' && sequence.lastResetDate) {
      const lastReset = parseDateOnlyLocal(sequence.lastResetDate);

      switch (sequence.resetPeriod) {
        case 'daily':
          shouldReset = currentDate !== sequence.lastResetDate;
          break;
        case 'monthly':
          if (Number.isNaN(lastReset.getTime())) {
            shouldReset = false;
          } else {
            shouldReset = now.getMonth() !== lastReset.getMonth() ||
                         now.getFullYear() !== lastReset.getFullYear();
          }
          break;
        case 'yearly':
          shouldReset = Number.isNaN(lastReset.getTime())
            ? false
            : now.getFullYear() !== lastReset.getFullYear();
          break;
      }
    } else if (sequence.resetPeriod !== 'none' && !sequence.lastResetDate) {
      // First time, initialize lastResetDate
      shouldReset = false;
      sequence.lastResetDate = currentDate;
    }

    // Reset or increment
    let nextValue;
    if (shouldReset) {
      nextValue = sequence.step;
      sequence.currentValue = nextValue;
      sequence.lastResetDate = currentDate;
    } else {
      nextValue = sequence.currentValue + sequence.step;
      sequence.currentValue = nextValue;
    }

    // Save the updated sequence
    await sequence.save({ transaction: t });

    // Generate the formatted sequence number
    const formattedNumber = generateFormattedNumber(sequence, nextValue, now);

    // Commit transaction if we created it
    if (!transaction) {
      await t.commit();
    }

    logger.logInfo('Sequence generated', {
      action: 'SEQUENCE_GENERATED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      sequenceName,
      nextValue,
      formattedNumber
    });

    return formattedNumber;
  } catch (error) {
    // Rollback transaction if we created it
    if (!transaction) {
      await t.rollback();
    }
    
    logger.logSecurity('Error generating sequence', {
      action: 'GENERATING_SEQUENCE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      sequenceName,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

/**
 * Generate formatted sequence number
 * Format: {PREFIX}-{YEAR}{MONTH}-{PADDED_NUMBER}
 * Example: INV-202511-000001
 * 
 * @param {object} sequence - Sequence object
 * @param {number} value - Current sequence value
 * @param {Date} date - Current date
 * @returns {string} Formatted sequence number
 */
function generateFormattedNumber(sequence, value, date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const paddedValue = String(value).padStart(sequence.padLength, '0');
  
  let formatted = '';
  
  // Add prefix if exists
  if (sequence.prefix) {
    formatted += sequence.prefix;
  }
  
  // Add date part based on reset period
  if (sequence.resetPeriod === 'yearly') {
    formatted += `-${year}`;
  } else if (sequence.resetPeriod === 'monthly') {
    formatted += `-${year}${month}`;
  } else if (sequence.resetPeriod === 'daily') {
    const day = String(date.getDate()).padStart(2, '0');
    formatted += `-${year}${month}${day}`;
  }
  
  // Add separator before number if we have prefix or date
  if (formatted) {
    formatted += '-';
  }
  
  formatted += paddedValue;
  
  return formatted;
}

/**
 * Reset sequence to initial value
 * 
 * @param {string} sequenceName - Name of the sequence
 * @returns {Promise<void>}
 */
async function resetSequence(sequenceName) {
  const t = await sequelize.transaction();
  
  try {
    const sequence = await Sequence.findOne({
      where: { name: sequenceName },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!sequence) {
      throw new Error(`Sequence '${sequenceName}' not found`);
    }

    sequence.currentValue = 0;
    sequence.lastResetDate = calendarDateLocal(new Date());
    await sequence.save({ transaction: t });

    await t.commit();

    logger.logInfo('Sequence reset', {
      action: 'SEQUENCE_RESET',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      sequenceName,
      resetDate: sequence.lastResetDate
    });
  } catch (error) {
    await t.rollback();
    
    logger.logSecurity('Error resetting sequence', {
      action: 'RESETTING_SEQUENCE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      sequenceName,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Get current sequence value without incrementing
 * 
 * @param {string} sequenceName - Name of the sequence
 * @returns {Promise<number>} Current sequence value
 */
async function getCurrentSequenceValue(sequenceName) {
  const sequence = await Sequence.findOne({
    where: { name: sequenceName }
  });

  if (!sequence) {
    throw new Error(`Sequence '${sequenceName}' not found`);
  }

  return sequence.currentValue;
}

module.exports = {
  getNextSequence,
  resetSequence,
  getCurrentSequenceValue,
  generateFormattedNumber
};
