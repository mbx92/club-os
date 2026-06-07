const { Sequence } = require('../models');
const { sequelize } = require('../models');
const logger = require('../utils/logger');
const { calendarDateLocal, parseDateOnlyLocal } = require('../utils/calendarDate');

/**
 * Universal invoice/document number generator service
 * Supports dynamic formatting based on tenant settings
 * 
 * Features:
 * - Race condition safe (SELECT FOR UPDATE)
 * - Tenant-specific sequences
 * - Configurable prefix, date format, separator
 * - Multiple numbering formats
 * - Auto-reset per period
 * 
 * @example
 * Settings:
 * {
 *   invoice: {
 *     transactionPrefix: "GYM",
 *     numberingFormat: "PREFIX-DATE-NUMBER",
 *     dateFormat: "YYYYMMDD",
 *     prefixSeparator: "/"
 *   }
 * }
 * 
 * Result: GYM/20251125/0001
 */

/**
 * Generate next document number with configurable format
 * 
 * @param {string} documentType - Type of document ('transaction', 'order', 'quote', 'invoice')
 * @param {string} tenantId - Tenant UUID
 * @param {object} settings - Tenant invoice settings
 * @param {object} transaction - Sequelize transaction (optional)
 * @returns {Promise<string>} Generated document number
 */
async function generateDocumentNumber(documentType, tenantId, settings = {}, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    // Extract settings with defaults
    const prefixKey = `${documentType}Prefix`;
    const prefix = settings[prefixKey] || getDefaultPrefix(documentType);
    const numberingFormat = settings.numberingFormat || 'PREFIX-DATE-NUMBER';
    const dateFormat = settings.dateFormat || 'YYYYMM';
    const separator = settings.prefixSeparator || '-';
    const padLength = settings.numberPadLength || 4;
    const resetPeriod = getResetPeriod(dateFormat);
    
    // Generate sequence name (tenant + document type specific)
    const sequenceName = `${documentType}_${tenantId}`;
    
    // Lock sequence row for update (race condition prevention)
    let sequence = await Sequence.findOne({
      where: { name: sequenceName },
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    
    // Auto-create sequence if not exists
    if (!sequence) {
      try {
        logger.logInfo('Auto-creating document sequence', {
          action: 'AUTOCREATING_DOCUMENT_SEQUENCE',
          sequenceName,
          documentType,
          tenantId,
          prefix
        });
        
        sequence = await Sequence.create({
          name: sequenceName,
          prefix: prefix,
          currentValue: 0,
          step: 1,
          padLength: padLength,
          resetPeriod: resetPeriod,
          lastResetDate: calendarDateLocal(new Date())
        }, { transaction: t });
      } catch (createError) {
        // Handle race condition where another transaction created it first
        if (createError.name === 'SequelizeUniqueConstraintError') {
          // Retry finding the sequence
          sequence = await Sequence.findOne({
            where: { name: sequenceName },
            lock: t.LOCK.UPDATE,
            transaction: t
          });
          
          if (!sequence) {
            throw new Error(`Failed to create or find sequence: ${sequenceName}`);
          }
        } else {
          throw createError;
        }
      }
    }
    
    const now = new Date();
    const currentDate = calendarDateLocal(now);
    let shouldReset = false;
    
    // Check if sequence should be reset
    if (sequence.resetPeriod !== 'none' && sequence.lastResetDate) {
      shouldReset = checkResetNeeded(sequence.resetPeriod, sequence.lastResetDate, now);
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
    
    // Update sequence prefix if changed in settings
    if (sequence.prefix !== prefix) {
      sequence.prefix = prefix;
    }
    
    // Save updated sequence
    await sequence.save({ transaction: t });
    
    // Generate formatted document number
    const formattedNumber = formatDocumentNumber({
      format: numberingFormat,
      prefix: prefix,
      dateFormat: dateFormat,
      separator: separator,
      number: nextValue,
      padLength: padLength,
      date: now
    });
    
    // Commit transaction if we created it
    if (!transaction) {
      await t.commit();
    }
    
    logger.logInfo('Document number generated', {
      action: 'DOCUMENT_NUMBER_GENERATED',
      sequenceName,
      documentType,
      tenantId,
      nextValue,
      formattedNumber
    });
    
    return formattedNumber;
  } catch (error) {
    // Rollback transaction if we created it
    if (!transaction) {
      await t.rollback();
    }
    
    logger.logSecurity('Error generating document number', {
      action: 'GENERATING_DOCUMENT_NUMBER',
      documentType,
      tenantId,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

/**
 * Format document number based on configuration
 * 
 * @param {object} config - Formatting configuration
 * @param {string} config.format - Format pattern (PREFIX-DATE-NUMBER, PREFIX-NUMBER, DATE-NUMBER, NUMBER)
 * @param {string} config.prefix - Document prefix
 * @param {string} config.dateFormat - Date format (YYYYMMDD, YYYYMM, YYYY, YY)
 * @param {string} config.separator - Separator character
 * @param {number} config.number - Sequence number
 * @param {number} config.padLength - Zero padding length
 * @param {Date} config.date - Current date
 * @returns {string} Formatted document number
 */
function formatDocumentNumber(config) {
  const {
    format,
    prefix,
    dateFormat,
    separator,
    number,
    padLength,
    date
  } = config;
  
  const paddedNumber = String(number).padStart(padLength, '0');
  const formattedDate = formatDate(date, dateFormat);
  
  const parts = [];
  
  switch (format.toUpperCase()) {
    case 'PREFIX-DATE-NUMBER':
      if (prefix) parts.push(prefix);
      if (formattedDate) parts.push(formattedDate);
      parts.push(paddedNumber);
      break;
      
    case 'PREFIX-NUMBER-DATE':
      if (prefix) parts.push(prefix);
      parts.push(paddedNumber);
      if (formattedDate) parts.push(formattedDate);
      break;
      
    case 'PREFIX-NUMBER':
      if (prefix) parts.push(prefix);
      parts.push(paddedNumber);
      break;
      
    case 'DATE-NUMBER':
      if (formattedDate) parts.push(formattedDate);
      parts.push(paddedNumber);
      break;
      
    case 'NUMBER-ONLY':
      parts.push(paddedNumber);
      break;
      
    default:
      // Default to PREFIX-DATE-NUMBER
      if (prefix) parts.push(prefix);
      if (formattedDate) parts.push(formattedDate);
      parts.push(paddedNumber);
  }
  
  return parts.join(separator);
}

/**
 * Format date based on pattern
 * 
 * @param {Date} date - Date to format
 * @param {string} format - Date format pattern
 * @returns {string} Formatted date string
 */
function formatDate(date, format) {
  if (!format || format === 'NONE') return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (format.toUpperCase()) {
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYYMM':
      return `${year}${month}`;
    case 'YYYY':
      return `${year}`;
    case 'YY':
      return String(year).slice(-2);
    case 'MMDD':
      return `${month}${day}`;
    case 'MM':
      return month;
    default:
      return `${year}${month}`; // Default to YYYYMM
  }
}

/**
 * Get default prefix for document type
 * 
 * @param {string} documentType - Document type
 * @returns {string} Default prefix
 */
function getDefaultPrefix(documentType) {
  const defaults = {
    transaction: 'TRX',
    order: 'ORD',
    quote: 'QUO',
    invoice: 'INV',
    receipt: 'RCT',
    payment: 'PAY',
    refund: 'REF'
  };
  
  return defaults[documentType] || 'DOC';
}

/**
 * Determine reset period based on date format
 * 
 * @param {string} dateFormat - Date format pattern
 * @returns {string} Reset period (none, daily, monthly, yearly)
 */
function getResetPeriod(dateFormat) {
  if (!dateFormat || dateFormat === 'NONE') return 'none';
  
  switch (dateFormat.toUpperCase()) {
    case 'YYYYMMDD':
    case 'MMDD':
      return 'daily';
    case 'YYYYMM':
    case 'MM':
      return 'monthly';
    case 'YYYY':
    case 'YY':
      return 'yearly';
    default:
      return 'monthly';
  }
}

/**
 * Check if sequence reset is needed
 * 
 * @param {string} resetPeriod - Reset period
 * @param {string} lastResetDate - Last reset date (YYYY-MM-DD)
 * @param {Date} now - Current date
 * @returns {boolean} True if reset is needed
 */
function checkResetNeeded(resetPeriod, lastResetDate, now) {
  if (resetPeriod === 'none') return false;

  const lastReset = parseDateOnlyLocal(lastResetDate);
  if (Number.isNaN(lastReset.getTime())) return false;

  const todayLocal = calendarDateLocal(now);

  switch (resetPeriod) {
    case 'daily':
      return todayLocal !== lastResetDate;
    case 'monthly':
      return now.getMonth() !== lastReset.getMonth() ||
             now.getFullYear() !== lastReset.getFullYear();
    case 'yearly':
      return now.getFullYear() !== lastReset.getFullYear();
    default:
      return false;
  }
}

/**
 * Generate transaction number (convenience wrapper)
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} settings - Tenant invoice settings
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<string>} Generated transaction number
 */
async function generateTransactionNumber(tenantId, settings, transaction) {
  return generateDocumentNumber('transaction', tenantId, settings, transaction);
}

/**
 * Generate order number (convenience wrapper)
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} settings - Tenant invoice settings
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<string>} Generated order number
 */
async function generateOrderNumber(tenantId, settings, transaction) {
  return generateDocumentNumber('order', tenantId, settings, transaction);
}

/**
 * Generate invoice number (convenience wrapper)
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} settings - Tenant invoice settings
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<string>} Generated invoice number
 */
async function generateInvoiceNumber(tenantId, settings, transaction) {
  return generateDocumentNumber('invoice', tenantId, settings, transaction);
}

/**
 * Generate quote number (convenience wrapper)
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} settings - Tenant invoice settings
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<string>} Generated quote number
 */
async function generateQuoteNumber(tenantId, settings, transaction) {
  return generateDocumentNumber('quote', tenantId, settings, transaction);
}

/**
 * Preview document number format without incrementing sequence
 * 
 * @param {string} documentType - Document type
 * @param {object} settings - Tenant invoice settings
 * @returns {string} Preview of next document number format
 */
function previewDocumentNumberFormat(documentType, settings = {}) {
  const prefixKey = `${documentType}Prefix`;
  const prefix = settings[prefixKey] || getDefaultPrefix(documentType);
  const numberingFormat = settings.numberingFormat || 'PREFIX-DATE-NUMBER';
  const dateFormat = settings.dateFormat || 'YYYYMM';
  const separator = settings.prefixSeparator || '-';
  const padLength = settings.numberPadLength || 4;
  
  return formatDocumentNumber({
    format: numberingFormat,
    prefix: prefix,
    dateFormat: dateFormat,
    separator: separator,
    number: 1,
    padLength: padLength,
    date: new Date()
  });
}

module.exports = {
  generateDocumentNumber,
  generateTransactionNumber,
  generateOrderNumber,
  generateInvoiceNumber,
  generateQuoteNumber,
  previewDocumentNumberFormat,
  formatDocumentNumber,
  formatDate
};
