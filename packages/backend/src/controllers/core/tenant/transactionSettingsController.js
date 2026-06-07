const transactionSettingsService = require('../../../services/transactionSettingsService');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all transaction settings
 */
async function getTransactionSettings(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const settings = await transactionSettingsService.getTransactionSettings(targetTenantId);

    logger.logInfo('Transaction settings retrieved', {
      action: 'TRANSACTION_SETTINGS_RETRIEVED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    logger.logSecurity('Error retrieving transaction settings', {
      action: 'RETRIEVING_TRANSACTION_SETTINGS',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Update transaction settings
 */
async function updateTransactionSettings(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const settings = await transactionSettingsService.updateTransactionSettings(
      targetTenantId,
      req.body
    );

    logger.logInfo('Transaction settings updated', {
      action: 'TRANSACTION_SETTINGS_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
      updatedFields: Object.keys(req.body),
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Transaction settings updated successfully',
      data: settings
    });
  } catch (err) {
    logger.logSecurity('Error updating transaction settings', {
      action: 'UPDATING_TRANSACTION_SETTINGS',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return next(err);
  }
}

/**
 * Get tax configuration
 */
async function getTaxConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const taxConfig = await transactionSettingsService.getTaxConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: taxConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update tax configuration
 */
async function updateTaxConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const taxConfig = await transactionSettingsService.updateTaxConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Tax configuration updated', {
      action: 'TAX_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Tax configuration updated successfully',
      data: taxConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get service charge configuration
 */
async function getServiceChargeConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const serviceChargeConfig = await transactionSettingsService.getServiceChargeConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: serviceChargeConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update service charge configuration
 */
async function updateServiceChargeConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const serviceChargeConfig = await transactionSettingsService.updateServiceChargeConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Service charge configuration updated', {
      action: 'SERVICE_CHARGE_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Service charge configuration updated successfully',
      data: serviceChargeConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get currency configuration
 */
async function getCurrencyConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const currencyConfig = await transactionSettingsService.getCurrencyConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: currencyConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update currency configuration
 */
async function updateCurrencyConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const currencyConfig = await transactionSettingsService.updateCurrencyConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Currency configuration updated', {
      action: 'CURRENCY_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Currency configuration updated successfully',
      data: currencyConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get invoice configuration
 */
async function getInvoiceConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const invoiceConfig = await transactionSettingsService.getInvoiceConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: invoiceConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update invoice configuration
 */
async function updateInvoiceConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const invoiceConfig = await transactionSettingsService.updateInvoiceConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Invoice configuration updated', {
      action: 'INVOICE_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Invoice configuration updated successfully',
      data: invoiceConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get payment configuration
 */
async function getPaymentConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const paymentConfig = await transactionSettingsService.getPaymentConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: paymentConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update payment configuration
 */
async function updatePaymentConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const paymentConfig = await transactionSettingsService.updatePaymentConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Payment configuration updated', {
      action: 'PAYMENT_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Payment configuration updated successfully',
      data: paymentConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get discount configuration
 */
async function getDiscountConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const discountConfig = await transactionSettingsService.getDiscountConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: discountConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update discount configuration
 */
async function updateDiscountConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const discountConfig = await transactionSettingsService.updateDiscountConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Discount configuration updated', {
      action: 'DISCOUNT_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Discount configuration updated successfully',
      data: discountConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get shipping configuration
 */
async function getShippingConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const shippingConfig = await transactionSettingsService.getShippingConfiguration(targetTenantId);

    return res.json({
      success: true,
      data: shippingConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update shipping configuration
 */
async function updateShippingConfiguration(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const shippingConfig = await transactionSettingsService.updateShippingConfiguration(
      targetTenantId,
      req.body
    );

    logger.logInfo('Shipping configuration updated', {
      action: 'SHIPPING_CONFIGURATION_UPDATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Shipping configuration updated successfully',
      data: shippingConfig
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Reset transaction settings to defaults
 */
async function resetTransactionSettings(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const targetTenantId = isSuperAdmin && req.params.tenantId 
      ? req.params.tenantId 
      : tenantId;

    const settings = await transactionSettingsService.resetTransactionSettings(targetTenantId);

    logger.logInfo('Transaction settings reset to defaults', {
      action: 'TRANSACTION_SETTINGS_RESET_TO_DEFAULTS',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: targetTenantId,
      userId: req.user.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json({
      success: true,
      message: 'Transaction settings reset to defaults successfully',
      data: settings
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getTransactionSettings,
  updateTransactionSettings,
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
  getDiscountConfiguration,
  updateDiscountConfiguration,
  getShippingConfiguration,
  updateShippingConfiguration,
  resetTransactionSettings
};
