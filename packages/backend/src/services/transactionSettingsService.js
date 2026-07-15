const { Tenant } = require('../models');
const { createError } = require('../utils/errorCodes');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');

/**
 * Transaction Settings Service
 * Centralized service for managing tenant transaction configuration
 * 
 * Handles:
 * - Tax settings
 * - Service charge settings
 * - Currency configuration
 * - Discount rules
 * - Payment gateway configuration
 * - Invoice/document numbering
 * - Shipping settings
 */

/**
 * Default transaction settings structure
 */
const DEFAULT_PAYMENT_METHOD_FEE = {
  feeEnable: false,
  feeType: 'percentage', // 'percentage' | 'fixed'
  feeValue: 0,
};

const PAYMENT_METHOD_CATALOG = [
  { key: 'cash', label: 'Tunai', enabled: true, requiresBank: false, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'credit_card', label: 'Kartu', enabled: true, requiresBank: true, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'debit_card', label: 'Kartu Debit', enabled: true, requiresBank: true, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'bank_transfer', label: 'Transfer Bank', enabled: true, requiresBank: true, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'qris', label: 'QRIS', enabled: true, requiresBank: false, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'e_wallet', label: 'E-Wallet', enabled: true, requiresBank: false, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'payment_gateway', label: 'Payment Gateway', enabled: true, requiresBank: false, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
  { key: 'compliment', label: 'Gratis (Compliment)', enabled: true, requiresBank: false, isSystem: true, ...DEFAULT_PAYMENT_METHOD_FEE },
];

const BANK_CATALOG = [
  { key: 'BCA', label: 'BCA', enabled: true, isSystem: true },
  { key: 'MANDIRI', label: 'MANDIRI', enabled: true, isSystem: true },
];

const normalizePaymentMethodFee = (method = {}) => {
  const feeType = method.feeType === 'fixed' ? 'fixed' : 'percentage';
  const feeValue = Number(method.feeValue);
  return {
    feeEnable: method.feeEnable === true,
    feeType,
    feeValue: Number.isFinite(feeValue) && feeValue >= 0 ? feeValue : 0,
  };
};

const buildDefaultPaymentMethods = () =>
  PAYMENT_METHOD_CATALOG.map((method) => ({ ...method }));

const buildDefaultBanks = () =>
  BANK_CATALOG.map((bank) => ({ ...bank }));

const DEFAULT_TRANSACTION_SETTINGS = {
  taxEnable: false,
  taxPercentage: 0,
  taxType: 'percentage', // 'percentage' or 'fixed'
  serviceChargeEnable: false,
  serviceChargePercentage: 0,
  serviceChargeType: 'percentage', // 'percentage' or 'fixed'
  currency: {
    defaultCurrency: 'IDR',
    currencySymbol: 'Rp',
    decimalSeparator: ',',
    thousandSeparator: '.',
    useDecimals: true
  },
  discount: {
    allowMultipleDiscounts: false,
    discountCalculationOrder: ['PERCENTAGE_FIRST', 'FIXED_AMOUNT_SECOND'],
    couponExpirationGracePeriod: 0
  },
  payment: {
    enabledGateways: [],
    paymentTimeout: 60,
    paymentMethods: buildDefaultPaymentMethods(),
    banks: buildDefaultBanks(),
    midtransConfig: {
      apiKey: '',
      clientKey: '',
      sandbox: true,
      webhookUrl: ''
    },
    stripeConfig: {
      apiKey: '',
      clientKey: '',
      sandbox: true,
      webhookUrl: ''
    }
  },
  invoice: {
    transactionPrefix: 'TRX',
    orderPrefix: 'ORD',
    quotePrefix: 'QUO',
    invoicePrefix: 'INV',
    startingInvoiceNumber: 1000,
    numberingFormat: 'PREFIX-DATE-NUMBER',
    dateFormat: 'YYYYMM',
    prefixSeparator: '-',
    numberPadLength: 4,
    enableEmailNotifications: false,
    fromEmailAddress: ''
  },
  shipping: {
    shippingCalculationType: 'FLAT_RATE',
    requireShippingAddress: false
  },
  rounding: {
    roundingEnable: false,
    roundingMethod: 'nearest', // 'nearest' | 'up' | 'down'
    roundingValue: 100         // e.g. 100 = round to nearest 100
  }
};

// ─── In-memory TTL cache ────────────────────────────────────────────────────
// Avoids a Tenant DB round-trip on every transaction creation.
// Invalidated automatically when settings are updated via updateTransactionSettings.
const _settingsCache = new Map(); // tenantId → { data: object, expiry: number }
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get transaction settings for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Transaction settings
 */
async function getTransactionSettings(tenantId) {
  // Return from cache if still fresh
  const _cached = _settingsCache.get(tenantId);
  if (_cached && Date.now() < _cached.expiry) return _cached.data;

  try {
    const tenant = await Tenant.findByPk(tenantId, {
      attributes: ['id', 'name', 'settings']
    });

    if (!tenant) {
      throw createError('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    const settings = tenant.settings || {};
    // Support both 'transaction' and 'transactions' for backward compatibility
    const transactionSettings = settings.transaction || settings.transactions || {};

    // Merge with defaults to ensure all fields exist
    const result = mergeWithDefaults(transactionSettings);
    _settingsCache.set(tenantId, { data: result, expiry: Date.now() + SETTINGS_CACHE_TTL });
    return result;
  } catch (error) {
    logger.logSecurity('Error getting transaction settings', {
      action: 'GETTING_TRANSACTION_SETTINGS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Update transaction settings for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} updates - Settings to update
 * @returns {Promise<object>} Updated transaction settings
 */
async function updateTransactionSettings(tenantId, updates) {
  try {
    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      throw createError('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    const currentSettings = tenant.settings || {};
    const currentTransactionSettings = currentSettings.transaction || currentSettings.transactions || {};

    // Deep merge updates with current settings
    const updatedTransactionSettings = deepMerge(currentTransactionSettings, updates);

    // Validate settings
    validateTransactionSettings(updatedTransactionSettings);

    // Update tenant settings
    tenant.settings = {
      ...currentSettings,
      transaction: updatedTransactionSettings
    };

    // Mark as changed for JSONB update
    tenant.changed('settings', true);
    await tenant.save();

    // Invalidate cache so next request picks up new settings
    _settingsCache.delete(tenantId);

    logger.logInfo('Transaction settings updated', {
      action: 'TRANSACTION_SETTINGS_UPDATED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId,
      updatedFields: Object.keys(updates)
    });

    return mergeWithDefaults(updatedTransactionSettings);
  } catch (error) {
    logger.logSecurity('Error updating transaction settings', {
      action: 'UPDATING_TRANSACTION_SETTINGS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get tax configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Tax configuration
 */
async function getTaxConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  
  return {
    taxEnable: settings.taxEnable || settings.taxEnabled || false,
    taxPercentage: parseFloat(settings.taxRate || settings.taxPercentage || settings.tax || 0),
    taxType: settings.taxType || 'percentage'
  };
}

/**
 * Update tax configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} taxConfig - Tax configuration { enabled, rate, type }
 * @returns {Promise<object>} Updated tax configuration
 */
async function updateTaxConfiguration(tenantId, taxConfig) {
  const updates = {};
  
  if (taxConfig.enabled !== undefined) {
    updates.taxEnable = taxConfig.enabled;
    updates.taxEnabled = taxConfig.enabled;
  }
  
  if (taxConfig.rate !== undefined) {
    const rate = parseFloat(taxConfig.rate);
    if (isNaN(rate) || rate < 0) {
      throw createError('VALIDATION_ERROR', 'Tax rate must be a non-negative number', 400);
    }
    const type = taxConfig.type || 'percentage';
    if (type === 'percentage' && rate > 100) {
      throw createError('VALIDATION_ERROR', 'Tax rate percentage must be between 0 and 100', 400);
    }
    updates.taxPercentage = rate;
    updates.taxRate = rate;
  }
  
  if (taxConfig.type !== undefined) {
    if (!['percentage', 'fixed'].includes(taxConfig.type)) {
      throw createError('VALIDATION_ERROR', 'Tax type must be "percentage" or "fixed"', 400);
    }
    updates.taxType = taxConfig.type;
  }

  await updateTransactionSettings(tenantId, updates);
  return getTaxConfiguration(tenantId);
}

/**
 * Get service charge configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Service charge configuration
 */
async function getServiceChargeConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  
  return {
    serviceChargeEnable: settings.serviceChargeEnable || settings.serviceChargeEnabled || false,
    serviceChargePercentage: parseFloat(settings.serviceChargeRate || settings.serviceChargePercentage || settings.serviceCharge || 0),
    serviceChargeType: settings.serviceChargeType || 'percentage'
  };
}

/**
 * Update service charge configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} serviceChargeConfig - Service charge configuration { enabled, rate, type }
 * @returns {Promise<object>} Updated service charge configuration
 */
async function updateServiceChargeConfiguration(tenantId, serviceChargeConfig) {
  const updates = {};
  
  if (serviceChargeConfig.enabled !== undefined) {
    updates.serviceChargeEnable = serviceChargeConfig.enabled;
    updates.serviceChargeEnabled = serviceChargeConfig.enabled;
  }
  
  if (serviceChargeConfig.rate !== undefined) {
    if (serviceChargeConfig.rate < 0 || serviceChargeConfig.rate > 100) {
      throw createError('VALIDATION_ERROR', 'Service charge rate must be between 0 and 100', 400);
    }
    updates.serviceChargePercentage = serviceChargeConfig.rate;
    updates.serviceChargeRate = serviceChargeConfig.rate;
  }
  
  if (serviceChargeConfig.type !== undefined) {
    if (!['percentage', 'fixed'].includes(serviceChargeConfig.type)) {
      throw createError('VALIDATION_ERROR', 'Service charge type must be "percentage" or "fixed"', 400);
    }
    updates.serviceChargeType = serviceChargeConfig.type;
  }

  await updateTransactionSettings(tenantId, updates);
  return getServiceChargeConfiguration(tenantId);
}

/**
 * Get currency configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Currency configuration
 */
async function getCurrencyConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  return settings.currency || DEFAULT_TRANSACTION_SETTINGS.currency;
}

/**
 * Update currency configuration for a tenant
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} currencyConfig - Currency configuration
 * @returns {Promise<object>} Updated currency configuration
 */
async function updateCurrencyConfiguration(tenantId, currencyConfig) {
  await updateTransactionSettings(tenantId, { currency: currencyConfig });
  return getCurrencyConfiguration(tenantId);
}

/**
 * Get invoice/document numbering configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Invoice configuration
 */
async function getInvoiceConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  return settings.invoice || DEFAULT_TRANSACTION_SETTINGS.invoice;
}

/**
 * Update invoice/document numbering configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} invoiceConfig - Invoice configuration
 * @returns {Promise<object>} Updated invoice configuration
 */
async function updateInvoiceConfiguration(tenantId, invoiceConfig) {
  // Validate numbering format
  const validFormats = [
    'PREFIX-DATE-NUMBER',
    'PREFIX-NUMBER-DATE',
    'PREFIX-NUMBER',
    'DATE-NUMBER',
    'NUMBER-ONLY'
  ];
  
  if (invoiceConfig.numberingFormat && !validFormats.includes(invoiceConfig.numberingFormat)) {
    throw createError('VALIDATION_ERROR', `Invalid numbering format. Must be one of: ${validFormats.join(', ')}`, 400);
  }

  // Validate date format
  const validDateFormats = ['YYYYMMDD', 'YYYYMM', 'YYYY', 'YY', 'MMDD', 'MM', 'NONE'];
  
  if (invoiceConfig.dateFormat && !validDateFormats.includes(invoiceConfig.dateFormat)) {
    throw createError('VALIDATION_ERROR', `Invalid date format. Must be one of: ${validDateFormats.join(', ')}`, 400);
  }

  await updateTransactionSettings(tenantId, { invoice: invoiceConfig });
  return getInvoiceConfiguration(tenantId);
}

/**
 * Get payment gateway configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Payment configuration
 */
async function getPaymentConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  
  // Mask sensitive data
  const paymentConfig = settings.payment || DEFAULT_TRANSACTION_SETTINGS.payment;
  const paymentMethods = (Array.isArray(paymentConfig.paymentMethods) && paymentConfig.paymentMethods.length
    ? paymentConfig.paymentMethods
    : buildDefaultPaymentMethods()
  ).map((method) => ({
    ...method,
    ...normalizePaymentMethodFee(method),
  }));
  const banks = Array.isArray(paymentConfig.banks) && paymentConfig.banks.length
    ? paymentConfig.banks
    : buildDefaultBanks();
  
  return {
    ...paymentConfig,
    paymentMethods,
    banks,
    midtransConfig: {
      ...paymentConfig.midtransConfig,
      apiKey: paymentConfig.midtransConfig?.apiKey ? '***MASKED***' : '',
      clientKey: paymentConfig.midtransConfig?.clientKey ? '***MASKED***' : ''
    },
    stripeConfig: {
      ...paymentConfig.stripeConfig,
      apiKey: paymentConfig.stripeConfig?.apiKey ? '***MASKED***' : '',
      clientKey: paymentConfig.stripeConfig?.clientKey ? '***MASKED***' : ''
    }
  };
}

/**
 * Update payment gateway configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} paymentConfig - Payment configuration
 * @returns {Promise<object>} Updated payment configuration
 */
async function updatePaymentConfiguration(tenantId, paymentConfig) {
  // Validate enabled gateways
  const validGateways = ['midtrans', 'stripe', 'cash', 'bank_transfer', 'credit_card'];
  
  if (paymentConfig.enabledGateways) {
    const invalid = paymentConfig.enabledGateways.filter(g => !validGateways.includes(g));
    if (invalid.length > 0) {
      throw createError('VALIDATION_ERROR', `Invalid payment gateways: ${invalid.join(', ')}`, 400);
    }
  }

  if (paymentConfig.paymentMethods) {
    validatePaymentMethods(paymentConfig.paymentMethods);
  }

  if (paymentConfig.banks) {
    validateBanks(paymentConfig.banks);
  }

  await updateTransactionSettings(tenantId, { payment: paymentConfig });
  return getPaymentConfiguration(tenantId);
}

/**
 * Get enabled payment methods for a tenant
 *
 * @param {string} tenantId
 * @returns {Promise<Array<object>>}
 */
async function getPaymentMethodsConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  const methods = settings.payment?.paymentMethods;
  return Array.isArray(methods) && methods.length ? methods : buildDefaultPaymentMethods();
}

/**
 * Get configured banks for a tenant
 *
 * @param {string} tenantId
 * @returns {Promise<Array<object>>}
 */
async function getBanksConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  const banks = settings.payment?.banks;
  return Array.isArray(banks) && banks.length ? banks : buildDefaultBanks();
}

/**
 * Resolve enabled bank keys for validation / dropdowns
 *
 * @param {string} tenantId
 * @returns {Promise<Set<string>>}
 */
async function getEnabledBankKeys(tenantId) {
  const banks = await getBanksConfiguration(tenantId);
  return new Set(
    banks
      .filter((bank) => bank.enabled !== false)
      .map((bank) => String(bank.key || '').trim().toUpperCase())
      .filter(Boolean)
  );
}

/**
 * Resolve enabled payment method keys for validation
 *
 * @param {string} tenantId
 * @returns {Promise<Set<string>>}
 */
async function getEnabledPaymentMethodKeys(tenantId) {
  const methods = await getPaymentMethodsConfiguration(tenantId);
  return new Set(
    methods
      .filter((method) => method.enabled !== false)
      .map((method) => String(method.key || '').trim())
      .filter(Boolean)
  );
}

/**
 * Get rounding configuration for a tenant
 *
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Rounding configuration
 */
async function getRoundingConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  return settings.rounding || DEFAULT_TRANSACTION_SETTINGS.rounding;
}

/**
 * Update rounding configuration for a tenant
 *
 * @param {string} tenantId - Tenant UUID
 * @param {object} roundingConfig - { roundingEnable, roundingMethod, roundingValue }
 * @returns {Promise<object>} Updated rounding configuration
 */
async function updateRoundingConfiguration(tenantId, roundingConfig) {
  const validMethods = ['nearest', 'up', 'down'];
  if (roundingConfig.roundingMethod && !validMethods.includes(roundingConfig.roundingMethod)) {
    throw createError('VALIDATION_ERROR', `roundingMethod must be one of: ${validMethods.join(', ')}`, 400);
  }
  if (roundingConfig.roundingValue !== undefined) {
    const v = parseInt(roundingConfig.roundingValue);
    if (isNaN(v) || v < 1) {
      throw createError('VALIDATION_ERROR', 'roundingValue must be a positive integer (e.g. 100, 500, 1000)', 400);
    }
  }
  await updateTransactionSettings(tenantId, { rounding: roundingConfig });
  return getRoundingConfiguration(tenantId);
}

/**
 * Apply rounding to a monetary amount based on rounding config.
 * Returns the rounded amount. If rounding is disabled, returns the original value unchanged.
 *
 * @param {number} amount
 * @param {object} roundingConfig - { roundingEnable, roundingMethod, roundingValue }
 * @returns {number}
 */
function applyRounding(amount, roundingConfig) {
  if (!roundingConfig || !roundingConfig.roundingEnable) return amount;
  const v = roundingConfig.roundingValue || 1;
  switch (roundingConfig.roundingMethod) {
    case 'up':   return Math.ceil(amount / v) * v;
    case 'down': return Math.floor(amount / v) * v;
    default:     return Math.round(amount / v) * v;
  }
}

/**
 * Get discount configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Discount configuration
 */
async function getDiscountConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  return settings.discount || DEFAULT_TRANSACTION_SETTINGS.discount;
}

/**
 * Update discount configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} discountConfig - Discount configuration
 * @returns {Promise<object>} Updated discount configuration
 */
async function updateDiscountConfiguration(tenantId, discountConfig) {
  await updateTransactionSettings(tenantId, { discount: discountConfig });
  return getDiscountConfiguration(tenantId);
}

/**
 * Get shipping configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Shipping configuration
 */
async function getShippingConfiguration(tenantId) {
  const settings = await getTransactionSettings(tenantId);
  return settings.shipping || DEFAULT_TRANSACTION_SETTINGS.shipping;
}

/**
 * Update shipping configuration
 * 
 * @param {string} tenantId - Tenant UUID
 * @param {object} shippingConfig - Shipping configuration
 * @returns {Promise<object>} Updated shipping configuration
 */
async function updateShippingConfiguration(tenantId, shippingConfig) {
  const validTypes = ['FLAT_RATE', 'WEIGHT_BASED', 'DISTANCE_BASED', 'FREE'];
  
  if (shippingConfig.shippingCalculationType && !validTypes.includes(shippingConfig.shippingCalculationType)) {
    throw createError('VALIDATION_ERROR', `Invalid shipping type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  await updateTransactionSettings(tenantId, { shipping: shippingConfig });
  return getShippingConfiguration(tenantId);
}

/**
 * Reset transaction settings to defaults
 * 
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object>} Default transaction settings
 */
async function resetTransactionSettings(tenantId) {
  const tenant = await Tenant.findByPk(tenantId);

  if (!tenant) {
    throw createError('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }

  const currentSettings = tenant.settings || {};
  tenant.settings = {
    ...currentSettings,
    transaction: { ...DEFAULT_TRANSACTION_SETTINGS }
  };

  tenant.changed('settings', true);
  await tenant.save();

  logger.logInfo('Transaction settings reset to defaults', {
      action: 'TRANSACTION_SETTINGS_RESET_TO_DEFAULTS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId
    });

  return DEFAULT_TRANSACTION_SETTINGS;
}

/**
 * Deep merge two objects
 * 
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

/**
 * Merge settings with defaults
 * 
 * @param {object} settings - User settings
 * @returns {object} Merged settings
 */
function mergeWithDefaults(settings) {
  const merged = deepMerge(DEFAULT_TRANSACTION_SETTINGS, settings);

  if (Array.isArray(merged.payment?.paymentMethods)) {
    merged.payment.paymentMethods = merged.payment.paymentMethods.map((method) => ({
      ...method,
      ...normalizePaymentMethodFee(method),
    }));
  }

  return merged;
}

/**
 * Validate transaction settings structure
 * 
 * @param {object} settings - Settings to validate
 * @throws {Error} If validation fails
 */
function validateTransactionSettings(settings) {
  // Validate tax
  if (settings.taxPercentage !== undefined) {
    const tax = parseFloat(settings.taxPercentage);
    if (isNaN(tax) || tax < 0) {
      throw createError('VALIDATION_ERROR', 'Tax value must be a non-negative number', 400);
    }
    const taxType = settings.taxType || 'percentage';
    if (taxType === 'percentage' && tax > 100) {
      throw createError('VALIDATION_ERROR', 'Tax percentage must be between 0 and 100', 400);
    }
  }

  // Validate currency
  if (settings.currency) {
    if (!settings.currency.defaultCurrency) {
      throw createError('VALIDATION_ERROR', 'Default currency is required', 400);
    }
  }

  // Validate payment timeout
  if (settings.payment?.paymentTimeout !== undefined) {
    const timeout = parseInt(settings.payment.paymentTimeout);
    if (isNaN(timeout) || timeout < 0) {
      throw createError('VALIDATION_ERROR', 'Payment timeout must be a positive number', 400);
    }
  }

  if (settings.payment?.paymentMethods) {
    validatePaymentMethods(settings.payment.paymentMethods);
  }

  if (settings.payment?.banks) {
    validateBanks(settings.payment.banks);
  }

  // Validate invoice numbering
  if (settings.invoice?.startingInvoiceNumber !== undefined) {
    const startNum = parseInt(settings.invoice.startingInvoiceNumber);
    if (isNaN(startNum) || startNum < 0) {
      throw createError('VALIDATION_ERROR', 'Starting invoice number must be a positive number', 400);
    }
  }

  return true;
}

function validatePaymentMethods(paymentMethods) {
  if (!Array.isArray(paymentMethods)) {
    throw createError('VALIDATION_ERROR', 'paymentMethods must be an array', 400);
  }

  const seen = new Set();

  for (const method of paymentMethods) {
    const key = String(method?.key || '').trim();
    const label = String(method?.label || '').trim();

    if (!key) {
      throw createError('VALIDATION_ERROR', 'Each payment method must have a key', 400);
    }

    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      throw createError(
        'VALIDATION_ERROR',
        `Invalid payment method key "${key}". Use lowercase snake_case.`,
        400
      );
    }

    if (!label) {
      throw createError('VALIDATION_ERROR', `Payment method "${key}" must have a label`, 400);
    }

    if (seen.has(key)) {
      throw createError('VALIDATION_ERROR', `Duplicate payment method key "${key}"`, 400);
    }

    if (method.feeEnable === true) {
      const feeType = method.feeType;
      if (feeType && feeType !== 'percentage' && feeType !== 'fixed') {
        throw createError(
          'VALIDATION_ERROR',
          `Payment method "${key}" feeType must be "percentage" or "fixed"`,
          400
        );
      }

      const feeValue = Number(method.feeValue);
      if (!Number.isFinite(feeValue) || feeValue < 0) {
        throw createError(
          'VALIDATION_ERROR',
          `Payment method "${key}" feeValue must be a non-negative number`,
          400
        );
      }

      if ((feeType === 'percentage' || !feeType) && feeValue > 100) {
        throw createError(
          'VALIDATION_ERROR',
          `Payment method "${key}" feeValue percentage cannot exceed 100`,
          400
        );
      }
    }

    // Normalize fee fields so they persist consistently
    Object.assign(method, normalizePaymentMethodFee(method));

    seen.add(key);
  }
}

function validateBanks(banks) {
  if (!Array.isArray(banks)) {
    throw createError('VALIDATION_ERROR', 'banks must be an array', 400);
  }

  const seen = new Set();

  for (const bank of banks) {
    const key = String(bank?.key || '').trim().toUpperCase();
    const label = String(bank?.label || '').trim();

    if (!key) {
      throw createError('VALIDATION_ERROR', 'Each bank must have a key', 400);
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      throw createError(
        'VALIDATION_ERROR',
        `Invalid bank key "${key}". Use uppercase letters/numbers/underscore (e.g. BCA, MANDIRI, BRI).`,
        400
      );
    }

    if (!label) {
      throw createError('VALIDATION_ERROR', `Bank "${key}" must have a label`, 400);
    }

    if (seen.has(key)) {
      throw createError('VALIDATION_ERROR', `Duplicate bank key "${key}"`, 400);
    }

    seen.add(key);
  }
}

module.exports = {
  // Main functions
  getTransactionSettings,
  updateTransactionSettings,
  resetTransactionSettings,
  
  // Specific configuration getters/setters
  getTaxConfiguration,
  updateTaxConfiguration,
  getServiceChargeConfiguration,
  updateServiceChargeConfiguration,
  getCurrencyConfiguration,
  updateCurrencyConfiguration,
  getInvoiceConfiguration,
  updateInvoiceConfiguration,
  getPaymentConfiguration,
  updatePaymentConfiguration,
  getPaymentMethodsConfiguration,
  getEnabledPaymentMethodKeys,
  getBanksConfiguration,
  getEnabledBankKeys,
  getDiscountConfiguration,
  updateDiscountConfiguration,
  getShippingConfiguration,
  updateShippingConfiguration,
  getRoundingConfiguration,
  updateRoundingConfiguration,
  applyRounding,
  
  // Defaults
  DEFAULT_TRANSACTION_SETTINGS,
  PAYMENT_METHOD_CATALOG,
  BANK_CATALOG,
  buildDefaultPaymentMethods,
  buildDefaultBanks,
};
