'use strict';

/**
 * Pricing Service
 * 
 * Calculates package prices with discounts and price rules.
 * Handles package pricing, bulk discounts, promo codes, etc.
 */

const { Op } = require('sequelize');

/**
 * Calculate final price for a package
 * 
 * @param {Object} package - PsychologyPackage instance
 * @param {Object} options - Calculation options
 * @param {string} options.promoCode - Optional promo code
 * @param {number} options.quantity - Quantity (for bulk discount)
 * @param {boolean} options.isMember - Is customer a gym member
 * @param {Object} models - Sequelize models
 * @returns {Object} Price breakdown
 */
async function calculatePrice(pkg, options = {}, models) {
  const { promoCode, quantity = 1, isMember = false } = options;
  const { PsychologyPriceRule } = models;
  
  // Base price from package (uses basePrice field, not singlePrice)
  let unitPrice = parseFloat(pkg.basePrice) || 0;
  let subtotal = unitPrice * quantity;
  
  // Find applicable price rules
  const applicableRules = [];
  let totalDiscount = 0;
  
  // 1. Package-specific discount (from discountType/discountValue fields)
  if (pkg.discountType && pkg.discountType !== 'none' && pkg.discountValue > 0) {
    let packageDiscount = 0;
    const discountValue = parseFloat(pkg.discountValue) || 0;
    
    if (pkg.discountType === 'percentage') {
      packageDiscount = subtotal * discountValue / 100;
    } else if (pkg.discountType === 'fixed') {
      packageDiscount = discountValue * quantity;
    }
    
    totalDiscount += packageDiscount;
    applicableRules.push({
      type: 'package_discount',
      name: 'Package Discount',
      discountType: pkg.discountType,
      discountValue: discountValue,
      discountAmount: packageDiscount
    });
  }
  
  // 2. Look for active price rules
  const now = new Date();
  const activeRules = await PsychologyPriceRule.findAll({
    where: {
      tenantId: pkg.tenantId,
      isActive: true,
      [Op.or]: [
        { packageId: null },  // Global rules
        { packageId: pkg.id } // Package-specific rules
      ],
      [Op.and]: [
        {
          [Op.or]: [
            { validFrom: null },
            { validFrom: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { validUntil: null },
            { validUntil: { [Op.gte]: now } }
          ]
        }
      ]
    },
    order: [['priority', 'DESC']]
  });
  
  // 3. Apply promo code if provided
  if (promoCode) {
    const promoRule = activeRules.find(r => 
      r.ruleType === 'promo_code' && 
      r.code?.toLowerCase() === promoCode.toLowerCase() &&
      r.hasRemainingUsage()
    );
    
    if (promoRule) {
      const promoDiscount = promoRule.calculateDiscount(subtotal - totalDiscount);
      totalDiscount += promoDiscount;
      applicableRules.push({
        type: 'promo_code',
        name: promoRule.name,
        code: promoRule.code,
        ruleId: promoRule.id,
        discountType: promoRule.discountType,
        discountValue: parseFloat(promoRule.discountValue),
        discountAmount: promoDiscount
      });
    }
  }
  
  // 4. Apply bulk discount if quantity meets minimum
  const bulkRule = activeRules.find(r => 
    r.ruleType === 'bulk_discount' && 
    quantity >= (r.minQuantity || 1)
  );
  
  if (bulkRule) {
    const bulkDiscount = bulkRule.calculateDiscount(subtotal - totalDiscount);
    totalDiscount += bulkDiscount;
    applicableRules.push({
      type: 'bulk_discount',
      name: bulkRule.name,
      ruleId: bulkRule.id,
      minQuantity: bulkRule.minQuantity,
      discountType: bulkRule.discountType,
      discountValue: parseFloat(bulkRule.discountValue),
      discountAmount: bulkDiscount
    });
  }
  
  // 5. Apply member discount if applicable
  if (isMember) {
    const memberRule = activeRules.find(r => r.ruleType === 'member_discount');
    
    if (memberRule) {
      const memberDiscount = memberRule.calculateDiscount(subtotal - totalDiscount);
      totalDiscount += memberDiscount;
      applicableRules.push({
        type: 'member_discount',
        name: memberRule.name,
        ruleId: memberRule.id,
        discountType: memberRule.discountType,
        discountValue: parseFloat(memberRule.discountValue),
        discountAmount: memberDiscount
      });
    }
  }
  
  // Calculate final total
  const total = Math.max(0, subtotal - totalDiscount);
  
  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageType: pkg.packageType,
    quantity,
    unitPrice,
    subtotal,
    discounts: applicableRules,
    totalDiscount,
    total,
    currency: 'IDR'
  };
}

/**
 * Validate promo code
 */
async function validatePromoCode(tenantId, code, models) {
  const { PsychologyPriceRule } = models;
  
  const now = new Date();
  const rule = await PsychologyPriceRule.findOne({
    where: {
      tenantId,
      code: { [Op.iLike]: code },
      ruleType: 'promo_code',
      isActive: true,
      [Op.and]: [
        {
          [Op.or]: [
            { validFrom: null },
            { validFrom: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { validUntil: null },
            { validUntil: { [Op.gte]: now } }
          ]
        }
      ]
    }
  });
  
  if (!rule) {
    return { valid: false, error: 'Invalid or expired promo code' };
  }
  
  if (!rule.hasRemainingUsage()) {
    return { valid: false, error: 'Promo code usage limit reached' };
  }
  
  return {
    valid: true,
    rule: {
      id: rule.id,
      name: rule.name,
      code: rule.code,
      discountType: rule.discountType,
      discountValue: parseFloat(rule.discountValue),
      validUntil: rule.validUntil
    }
  };
}

/**
 * Apply promo code (increment usage)
 */
async function applyPromoCode(ruleId, models) {
  const { PsychologyPriceRule } = models;
  
  const rule = await PsychologyPriceRule.findByPk(ruleId);
  if (rule) {
    await rule.incrementUsage();
  }
}

/**
 * Format price for display
 */
function formatPrice(amount, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

module.exports = {
  calculatePrice,
  validatePromoCode,
  applyPromoCode,
  formatPrice
};
