const { Voucher, VoucherUsage, Member } = require('../models');
const { Op } = require('sequelize');
const { createError } = require('../utils/errorCodes');
const logger = require('../utils/logger');

/**
 * Voucher Service
 * Centralized voucher validation, discount calculation, and usage tracking
 * Used globally across all transaction types (service purchase, POS, restaurant, etc.)
 */

/**
 * Validate and retrieve voucher with all business rules
 * @param {string} voucherCode - Voucher code to validate
 * @param {string} tenantId - Tenant ID for scope validation
 * @param {number} amount - Purchase amount for min purchase validation
 * @param {string} userId - User ID for per-user limit check (optional)
 * @param {string} memberId - Member ID for member-specific vouchers (optional)
 * @param {object} transaction - Sequelize transaction object
 * @returns {Promise<object>} Validated voucher object with lock
 */
async function validateVoucher(voucherCode, tenantId, amount, userId = null, memberId = null, transaction) {
  if (!voucherCode) {
    return null;
  }

  // Find voucher with pessimistic lock to prevent race conditions
  const voucher = await Voucher.findOne({
    where: {
      code: voucherCode,
      isActive: true,
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() },
      [Op.or]: [
        { tenantId: tenantId }, // Tenant-specific voucher
        { tenantId: null, scope: 'subscription' } // Global superadmin voucher
      ]
    },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!voucher) {
    throw createError('VOUCHER_INVALID', 'Voucher not found, expired, or not applicable to your account', 404);
  }

  // Check if voucher is still valid (not expired, within date range)
  if (!voucher.isValid()) {
    throw createError('VOUCHER_EXPIRED', 'Voucher has expired or reached usage limit', 400);
  }

  // Check usage limit
  if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
    throw createError('VOUCHER_LIMIT_REACHED', 'Voucher usage limit has been reached', 400);
  }

  // Check minimum purchase amount
  if (voucher.minPurchaseAmount && amount < parseFloat(voucher.minPurchaseAmount)) {
    throw createError(
      'VOUCHER_MIN_PURCHASE', 
      `Minimum purchase amount is ${voucher.minPurchaseAmount}. Current amount: ${amount}`, 
      400
    );
  }

  // Check per-user usage limit
  if (userId && voucher.userUsageLimit) {
    const userUsageCount = await VoucherUsage.count({
      where: {
        voucherId: voucher.id,
        userId: userId
      },
      transaction
    });

    if (userUsageCount >= voucher.userUsageLimit) {
      throw createError(
        'VOUCHER_USER_LIMIT_REACHED', 
        `You have reached the maximum usage limit (${voucher.userUsageLimit}) for this voucher`, 
        400
      );
    }
  }

  // Check per-member usage limit (if applicable)
  if (memberId && voucher.userUsageLimit) {
    const memberUsageCount = await VoucherUsage.count({
      where: {
        voucherId: voucher.id,
        memberId: memberId
      },
      transaction
    });

    if (memberUsageCount >= voucher.userUsageLimit) {
      throw createError(
        'VOUCHER_MEMBER_LIMIT_REACHED', 
        `Member has reached the maximum usage limit (${voucher.userUsageLimit}) for this voucher`, 
        400
      );
    }
  }

  logger.logInfo('Voucher validated successfully', {
    action: 'VOUCHER_VALIDATED_SUCCESSFULLY',
    voucherCode,
    voucherId: voucher.id,
    tenantId,
    amount,
    userId,
    memberId,
    usageCount: voucher.usageCount,
    usageLimit: voucher.usageLimit
  });

  return voucher;
}

/**
 * Calculate discount amount based on voucher type and rules
 * @param {object} voucher - Voucher object from validateVoucher
 * @param {number} amount - Amount to calculate discount on
 * @returns {number} Discount amount
 */
function calculateDiscount(voucher, amount) {
  if (!voucher) {
    return 0;
  }

  let discount = 0;

  if (voucher.type === 'percentage') {
    // Percentage discount
    discount = (amount * parseFloat(voucher.value)) / 100;
    
    // Apply max discount cap if configured
    if (voucher.maxDiscountAmount && discount > parseFloat(voucher.maxDiscountAmount)) {
      discount = parseFloat(voucher.maxDiscountAmount);
    }
  } else if (voucher.type === 'fixed') {
    // Fixed amount discount
    discount = parseFloat(voucher.value);
    
    // Discount cannot exceed the purchase amount
    if (discount > amount) {
      discount = amount;
    }
  }

  logger.logInfo('Discount calculated', {
    action: 'DISCOUNT_CALCULATED',
    voucherId: voucher.id,
    voucherCode: voucher.code,
    type: voucher.type,
    value: voucher.value,
    amount,
    discount
  });

  return discount;
}

/**
 * Apply voucher: validate + calculate discount in one call
 * @param {string} voucherCode - Voucher code
 * @param {string} tenantId - Tenant ID
 * @param {number} amount - Purchase amount
 * @param {string} userId - User ID (optional)
 * @param {string} memberId - Member ID (optional)
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<object>} { voucher, discount }
 */
async function applyVoucher(voucherCode, tenantId, amount, userId = null, memberId = null, transaction) {
  if (!voucherCode) {
    return { voucher: null, discount: 0 };
  }

  // Validate voucher with all business rules
  const voucher = await validateVoucher(voucherCode, tenantId, amount, userId, memberId, transaction);
  
  // Calculate discount
  const discount = calculateDiscount(voucher, amount);

  return { voucher, discount };
}

/**
 * Increment voucher usage count (with optimistic locking via version field)
 * @param {object} voucher - Voucher object (must be locked in transaction)
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<void>}
 */
async function incrementVoucherUsage(voucher, transaction) {
  if (!voucher) {
    return;
  }

  // Increment usage count
  voucher.usageCount += 1;
  
  // Save with version check (optimistic locking)
  await voucher.save({ transaction });

  logger.logInfo('Voucher usage incremented', {
    action: 'VOUCHER_USAGE_INCREMENTED',
    voucherId: voucher.id,
    voucherCode: voucher.code,
    newUsageCount: voucher.usageCount,
    usageLimit: voucher.usageLimit
  });
}

/**
 * Create voucher usage record for audit trail
 * @param {object} params - Usage parameters
 * @param {string} params.voucherId - Voucher ID
 * @param {string} params.transactionId - Transaction ID
 * @param {string} params.userId - User ID (optional)
 * @param {string} params.memberId - Member ID (optional)
 * @param {number} params.discountAmount - Discount amount applied
 * @param {number} params.originalAmount - Original amount before discount
 * @param {number} params.finalAmount - Final amount after discount
 * @param {object} params.usageDetails - Additional usage details (optional)
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<object>} Created VoucherUsage record
 */
async function createVoucherUsage(params, transaction) {
  const {
    voucherId,
    transactionId,
    userId = null,
    memberId = null,
    discountAmount,
    originalAmount,
    finalAmount,
    usageDetails = {}
  } = params;

  const voucherUsage = await VoucherUsage.create({
    voucherId,
    transactionId,
    userId,
    memberId,
    discountAmount,
    originalAmount,
    finalAmount,
    usageDetails,
    usedAt: new Date()
  }, { transaction });

  logger.logInfo('Voucher usage recorded', {
    action: 'VOUCHER_USAGE_RECORDED',
    voucherId,
    transactionId,
    userId,
    memberId,
    discountAmount,
    voucherUsageId: voucherUsage.id
  });

  return voucherUsage;
}

/**
 * Complete voucher application: validate, calculate, increment, and record
 * This is the all-in-one function for most use cases
 * @param {object} params - Voucher application parameters
 * @param {string} params.voucherCode - Voucher code
 * @param {string} params.tenantId - Tenant ID
 * @param {number} params.amount - Purchase amount (before discount)
 * @param {string} params.transactionId - Transaction ID for usage recording
 * @param {string} params.userId - User ID (optional)
 * @param {string} params.memberId - Member ID (optional)
 * @param {object} params.usageDetails - Additional usage details (optional)
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<object>} { voucher, discount, voucherUsage }
 */
async function processVoucher(params, transaction) {
  const {
    voucherCode,
    tenantId,
    amount,
    transactionId,
    userId = null,
    memberId = null,
    usageDetails = {}
  } = params;

  if (!voucherCode) {
    return { voucher: null, discount: 0, voucherUsage: null };
  }

  // Step 1: Validate and calculate discount
  const { voucher, discount } = await applyVoucher(
    voucherCode,
    tenantId,
    amount,
    userId,
    memberId,
    transaction
  );

  if (!voucher || discount === 0) {
    return { voucher: null, discount: 0, voucherUsage: null };
  }

  // Step 2: Increment usage count
  await incrementVoucherUsage(voucher, transaction);

  // Step 3: Record usage for audit trail
  const voucherUsage = await createVoucherUsage({
    voucherId: voucher.id,
    transactionId,
    userId,
    memberId,
    discountAmount: discount,
    originalAmount: amount,
    finalAmount: amount - discount,
    usageDetails
  }, transaction);

  logger.logInfo('Voucher processed successfully', {
    action: 'VOUCHER_PROCESSED_SUCCESSFULLY',
    voucherCode,
    voucherId: voucher.id,
    discount,
    transactionId,
    userId,
    memberId,
    voucherUsageId: voucherUsage.id
  });

  return { voucher, discount, voucherUsage };
}

/**
 * Check if a specific voucher code is applicable to a given item type and ID
 * @param {object} voucher - Voucher object
 * @param {string} applicableTo - Item type (e.g., 'membership', 'product', 'service_plan')
 * @param {string} itemId - Item ID (optional)
 * @returns {boolean} True if applicable
 */
function isApplicableToItem(voucher, applicableTo, itemId = null) {
  if (!voucher) {
    return false;
  }

  // Check if voucher applies to all items
  if (voucher.applicableTo === 'all') {
    return true;
  }

  // Check if voucher applies to specific item type
  if (voucher.applicableTo === applicableTo) {
    // If no specific items configured, applies to all items of this type
    if (!voucher.applicableItems || voucher.applicableItems.length === 0) {
      return true;
    }

    // If specific items configured, check if item ID is in the list
    if (itemId && voucher.applicableItems.includes(itemId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get voucher details without validation (for preview/display purposes)
 * @param {string} voucherCode - Voucher code
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object|null>} Voucher object or null
 */
async function getVoucherByCode(voucherCode, tenantId) {
  if (!voucherCode) {
    return null;
  }

  const voucher = await Voucher.findOne({
    where: {
      code: voucherCode,
      [Op.or]: [
        { tenantId: tenantId },
        { tenantId: null, scope: 'subscription' }
      ]
    }
  });

  return voucher;
}

module.exports = {
  validateVoucher,
  calculateDiscount,
  applyVoucher,
  incrementVoucherUsage,
  createVoucherUsage,
  processVoucher,
  isApplicableToItem,
  getVoucherByCode
};
