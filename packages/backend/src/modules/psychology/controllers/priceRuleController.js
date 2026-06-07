'use strict';

/**
 * Price Rule Controller
 * 
 * Manages discount rules, promo codes, bulk discounts, etc.
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const { PsychologyPriceRule, PsychologyPackage } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all price rules for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { isActive, ruleType } = req.query;
    
    const where = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (ruleType) {
      where.ruleType = ruleType;
    }
    
    const rules = await PsychologyPriceRule.findAll({
      where,
      include: [
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name']
        }
      ],
      order: [['priority', 'DESC'], ['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: rules
    });

    logger.logInfo('Price rules retrieved', {
      action: 'PSYCHOLOGY_PRICE_RULE_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count: rules.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single price rule by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const rule = await PsychologyPriceRule.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PsychologyPackage,
          as: 'package'
        }
      ]
    });
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Price rule not found'
      });
    }
    
    res.json({
      success: true,
      data: rule
    });

    logger.logInfo('Price rule retrieved', {
      action: 'PSYCHOLOGY_PRICE_RULE_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { ruleId: id, ruleName: rule.name }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new price rule
 */
async function create(req, res, next) {
  try {
    const { tenantId } = req.user;
    const {
      name, code, ruleType, packageId, discountType,
      discountValue, minQuantity, maxUsage, validFrom,
      validUntil, isActive, priority
    } = req.body;
    
    // Check for duplicate promo code
    if (code && ruleType === 'promo_code') {
      const existing = await PsychologyPriceRule.findOne({
        where: {
          tenantId,
          code: { [Op.iLike]: code }
        }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Promo code "${code}" already exists`
        });
      }
    }
    
    // Validate package if specified
    if (packageId) {
      const pkg = await PsychologyPackage.findOne({
        where: { id: packageId, tenantId }
      });
      
      if (!pkg) {
        return res.status(400).json({
          success: false,
          message: 'Package not found'
        });
      }
    }
    
    const rule = await PsychologyPriceRule.create({
      tenantId,
      name,
      code: code?.toUpperCase(),
      ruleType,
      packageId,
      discountType,
      discountValue,
      minQuantity: minQuantity || 1,
      maxUsage,
      validFrom,
      validUntil,
      isActive: isActive !== false,
      priority: priority || 0
    });
    
    res.status(201).json({
      success: true,
      message: 'Price rule created successfully',
      data: rule
    });

    logger.logAudit('Price rule created', {
      action: 'PSYCHOLOGY_PRICE_RULE_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { ruleId: rule.id, ruleName: name, ruleType, code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update price rule
 */
async function update(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const {
      name, code, ruleType, packageId, discountType,
      discountValue, minQuantity, maxUsage, validFrom,
      validUntil, isActive, priority
    } = req.body;
    
    const rule = await PsychologyPriceRule.findOne({
      where: { id, tenantId }
    });
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Price rule not found'
      });
    }
    
    // Check for duplicate promo code if changing
    if (code && code !== rule.code) {
      const existing = await PsychologyPriceRule.findOne({
        where: {
          tenantId,
          code: { [Op.iLike]: code },
          id: { [Op.ne]: id }
        }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Promo code "${code}" already exists`
        });
      }
    }
    
    // Update fields
    if (name !== undefined) rule.name = name;
    if (code !== undefined) rule.code = code?.toUpperCase();
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (packageId !== undefined) rule.packageId = packageId;
    if (discountType !== undefined) rule.discountType = discountType;
    if (discountValue !== undefined) rule.discountValue = discountValue;
    if (minQuantity !== undefined) rule.minQuantity = minQuantity;
    if (maxUsage !== undefined) rule.maxUsage = maxUsage;
    if (validFrom !== undefined) rule.validFrom = validFrom;
    if (validUntil !== undefined) rule.validUntil = validUntil;
    if (isActive !== undefined) rule.isActive = isActive;
    if (priority !== undefined) rule.priority = priority;
    
    await rule.save();
    
    res.json({
      success: true,
      message: 'Price rule updated successfully',
      data: rule
    });

    logger.logAudit('Price rule updated', {
      action: 'PSYCHOLOGY_PRICE_RULE_UPDATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { ruleId: id, ruleName: rule.name }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete price rule
 */
async function remove(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const rule = await PsychologyPriceRule.findOne({
      where: { id, tenantId }
    });
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Price rule not found'
      });
    }
    
    // Check if rule has been used
    if (rule.usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: rule has been used ${rule.usageCount} time(s). Deactivate instead.`
      });
    }
    
    await rule.destroy();
    
    res.json({
      success: true,
      message: 'Price rule deleted successfully'
    });

    logger.logAudit('Price rule deleted', {
      action: 'PSYCHOLOGY_PRICE_RULE_DELETE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { ruleId: id, ruleName: rule.name }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle active status
 */
async function toggleActive(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const rule = await PsychologyPriceRule.findOne({
      where: { id, tenantId }
    });
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Price rule not found'
      });
    }
    
    rule.isActive = !rule.isActive;
    await rule.save();
    
    res.json({
      success: true,
      message: `Price rule ${rule.isActive ? 'activated' : 'deactivated'}`,
      data: rule
    });

    logger.logAudit(`Price rule ${rule.isActive ? 'activated' : 'deactivated'}`, {
      action: rule.isActive ? 'PSYCHOLOGY_PRICE_RULE_ACTIVATE' : 'PSYCHOLOGY_PRICE_RULE_DEACTIVATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { ruleId: id, ruleName: rule.name, isActive: rule.isActive }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  toggleActive
};
