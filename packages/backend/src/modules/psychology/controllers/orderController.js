'use strict';

/**
 * Order Controller
 * 
 * Manages psychology test orders and payment processing
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const { pricingService, accessTokenService } = require('../services');
const {
  PsychologyOrder, PsychologySession, PsychologyPackage,
  PsychologyPackageItem, PsychologyTestType, Patient
} = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all orders for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { status, page = 1, limit = 20, search } = req.query;
    
    const where = { tenantId };
    if (status) {
      where.status = status;
    }
    
    // Build include for patient search
    const include = [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'fullName', 'email', 'phone'],
        where: search ? {
          [Op.or]: [
            { fullName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
          ]
        } : undefined
      },
      {
        model: PsychologyPackage,
        as: 'package',
        attributes: ['id', 'name', 'packageType']
      }
    ];
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: orders } = await PsychologyOrder.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

    logger.logInfo('Psychology orders retrieved', {
      action: 'PSYCHOLOGY_ORDER_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single order by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const order = await PsychologyOrder.findOne({
      where: { id, tenantId },
      include: [
        { 
          model: Patient, 
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex']
        },
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'code', 'name', 'packageType', 'basePrice', 'finalPrice', 'estimatedDuration'],
          include: [
            {
              model: PsychologyPackageItem,
              as: 'items',
              attributes: ['id', 'sortOrder'],
              include: [
                { 
                  model: PsychologyTestType, 
                  as: 'testType',
                  attributes: ['id', 'code', 'name', 'category', 'estimatedDuration']
                }
              ]
            }
          ]
        },
        {
          model: PsychologySession,
          as: 'sessions',
          attributes: ['id', 'sessionNumber', 'status', 'sessionToken', 'startedAt', 'completedAt', 'timeSpent', 'verifiedAt', 'verifiedBy', 'scores'],
          include: [
            { 
              model: PsychologyTestType, 
              as: 'testType',
              attributes: ['id', 'code', 'name', 'category', 'estimatedDuration']
            }
          ]
        },
        { 
          model: db.PsychologyPriceRule, 
          as: 'priceRule',
          attributes: ['id', 'name', 'code', 'discountType', 'discountValue']
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Format response
    const formattedResponse = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      accessToken: order.accessToken,
      pricing: {
        baseAmount: parseFloat(order.baseAmount),
        discountAmount: parseFloat(order.discountAmount),
        finalAmount: parseFloat(order.finalAmount),
        currency: 'IDR'
      },
      patient: order.patient ? {
        id: order.patient.id,
        name: order.patient.fullName,
        email: order.patient.email,
        phone: order.patient.phone,
        birthDate: order.patient.birthDate,
        sex: order.patient.sex
      } : null,
      package: order.package ? {
        id: order.package.id,
        code: order.package.code,
        name: order.package.name,
        type: order.package.packageType,
        price: parseFloat(order.package.finalPrice),
        duration: order.package.estimatedDuration,
        items: order.package.items?.map(item => ({
          id: item.id,
          sortOrder: item.sortOrder,
          testType: item.testType ? {
            id: item.testType.id,
            code: item.testType.code,
            name: item.testType.name,
            category: item.testType.category,
            duration: item.testType.estimatedDuration
          } : null
        })) || []
      } : null,
      sessions: order.sessions?.map(s => ({
        id: s.id,
        sessionToken: s.sessionToken,
        sessionNumber: s.sessionNumber,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        duration: s.timeSpent || null,
        verifiedAt: s.verifiedAt,
        verifier: s.verifiedBy,
        hasScores: !!(s.scores && Object.keys(s.scores).length > 0),
        testType: s.testType ? {
          id: s.testType.id,
          code: s.testType.code,
          name: s.testType.name,
          category: s.testType.category
        } : null
      })) || [],
      priceRule: order.priceRule ? {
        id: order.priceRule.id,
        name: order.priceRule.name,
        code: order.priceRule.code,
        discountType: order.priceRule.discountType,
        discountValue: parseFloat(order.priceRule.discountValue)
      } : null,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      notes: order.notes,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
    
    res.json({
      success: true,
      data: formattedResponse
    });

    logger.logInfo('Psychology order retrieved', {
      action: 'PSYCHOLOGY_ORDER_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: id, orderNumber: order.orderNumber }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new order
 */
async function create(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    const {
      patientId, packageId, promoCode, paymentMethod,
      notes, expiresAt
    } = req.body;
    
    // Validate patient
    const patient = await Patient.findOne({
      where: { id: patientId, tenantId }
    });
    
    if (!patient) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Validate package
    const pkg = await PsychologyPackage.findOne({
      where: { id: packageId, tenantId, isActive: true },
      include: [
        {
          model: PsychologyPackageItem,
          as: 'items',
          include: [
            { model: PsychologyTestType, as: 'testType' }
          ]
        }
      ]
    });
    
    if (!pkg) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Package not found or inactive'
      });
    }
    
    // Calculate pricing
    const priceBreakdown = await pricingService.calculatePrice(
      pkg,
      { promoCode },
      db
    );
    
    // Get promo rule ID if used
    let priceRuleId = null;
    const promoDiscount = priceBreakdown.discounts.find(d => d.type === 'promo_code');
    if (promoDiscount) {
      priceRuleId = promoDiscount.ruleId;
    }
    
    // Generate order number
    const orderNumber = PsychologyOrder.generateOrderNumber(tenantId);
    
    // Create order
    const order = await PsychologyOrder.create({
      tenantId,
      orderNumber,
      patientId,
      packageId,
      priceRuleId,
      baseAmount: priceBreakdown.subtotal,
      discountAmount: priceBreakdown.totalDiscount,
      finalAmount: priceBreakdown.total,
      paymentMethod,
      notes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user.id,
      metadata: {
        priceBreakdown
      }
    }, { transaction });
    
    // Create sessions for each test in package
    const sessionsData = pkg.items.map((item, index) => ({
      tenantId,
      orderId: order.id,
      testTypeId: item.testTypeId,
      sessionToken: accessTokenService.generateAccessToken(),
      sessionNumber: index + 1,
      status: 'pending'
    }));
    
    await PsychologySession.bulkCreate(sessionsData, { transaction });
    
    // Apply promo code usage if used
    if (priceRuleId) {
      await pricingService.applyPromoCode(priceRuleId, db);
    }
    
    await transaction.commit();
    
    // Reload with associations
    const result = await PsychologyOrder.findByPk(order.id, {
      include: [
        { 
          model: Patient, 
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex']
        },
        { 
          model: PsychologyPackage, 
          as: 'package',
          attributes: ['id', 'code', 'name', 'packageType', 'basePrice', 'finalPrice', 'estimatedDuration']
        },
        {
          model: PsychologySession,
          as: 'sessions',
          attributes: ['id', 'sessionNumber', 'status', 'sessionToken', 'startedAt', 'completedAt', 'timeSpent', 'verifiedAt', 'verifiedBy', 'scores'],
          include: [
            { 
              model: PsychologyTestType, 
              as: 'testType',
              attributes: ['id', 'code', 'name', 'category', 'estimatedDuration']
            }
          ]
        }
      ]
    });
    
    // Format simplified response
    const formattedResponse = {
      id: result.id,
      orderNumber: result.orderNumber,
      status: result.status,
      accessToken: result.accessToken,
      // Pricing - simplified (baseAmount from package.basePrice, finalAmount = calculated)
      pricing: {
        baseAmount: parseFloat(result.baseAmount),
        discountAmount: parseFloat(result.discountAmount),
        finalAmount: parseFloat(result.finalAmount),
        currency: 'IDR'
      },
      // Patient info - simplified
      patient: result.patient ? {
        id: result.patient.id,
        name: result.patient.fullName,
        email: result.patient.email,
        phone: result.patient.phone
      } : null,
      // Package info - simplified
      package: result.package ? {
        id: result.package.id,
        code: result.package.code,
        name: result.package.name,
        type: result.package.packageType,
        price: parseFloat(result.package.finalPrice),
        duration: result.package.estimatedDuration
      } : null,
      // Sessions - simplified
      sessions: result.sessions?.map(s => ({
        id: s.id,
        sessionToken: s.sessionToken,
        sessionNumber: s.sessionNumber,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        duration: s.timeSpent || null,
        verifiedAt: s.verifiedAt,
        verifier: s.verifiedBy,
        hasScores: !!(s.scores && Object.keys(s.scores).length > 0),
        testType: s.testType ? {
          id: s.testType.id,
          code: s.testType.code,
          name: s.testType.name,
          category: s.testType.category
        } : null
      })) || [],
      // Timestamps
      expiresAt: result.expiresAt,
      createdAt: result.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: formattedResponse
    });

    logger.logAudit('Psychology order created', {
      action: 'PSYCHOLOGY_ORDER_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        orderId: order.id, 
        orderNumber: order.orderNumber, 
        patientId, 
        packageId,
        total: priceBreakdown.total
      }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Update payment status
 */
async function updatePayment(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { status, paymentMethod } = req.body;
    
    const order = await PsychologyOrder.findOne({
      where: { id, tenantId }
    });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update payment status
    order.status = status;
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    
    // If paid, generate access token
    if (status === 'paid' && !order.accessToken) {
      // Get tenant slug for URL
      const tenant = await db.Tenant.findByPk(tenantId);
      const tenantSlug = tenant?.slug || tenantId;
      
      const credentials = accessTokenService.generateAccessCredentials(
        order.id,
        tenantSlug,
        72 // 72 hours default
      );
      
      order.accessToken = credentials.token;
      order.expiresAt = credentials.expiresAt;
      order.paidAt = new Date();
      order.qrCode = credentials.qrData.url; // Store URL, frontend generates QR
    }
    
    await order.save({ transaction });
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Payment status updated',
      data: order
    });

    logger.logAudit('Psychology order payment updated', {
      action: 'PSYCHOLOGY_ORDER_PAYMENT_UPDATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: id, orderNumber: order.orderNumber, status, paymentMethod }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Regenerate access token
 */
async function regenerateToken(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { expiresInHours = 72 } = req.body;
    
    const order = await PsychologyOrder.findOne({
      where: { id, tenantId }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate token for unpaid order'
      });
    }
    
    // Get tenant slug
    const tenant = await db.Tenant.findByPk(tenantId);
    const tenantSlug = tenant?.slug || tenantId;
    
    const credentials = accessTokenService.generateAccessCredentials(
      order.id,
      tenantSlug,
      expiresInHours
    );
    
    order.accessToken = credentials.token;
    order.expiresAt = credentials.expiresAt;
    order.qrCode = credentials.qrData.url;
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Access token regenerated',
      data: {
        accessToken: order.accessToken,
        expiresAt: order.expiresAt,
        accessUrl: credentials.accessUrl
      }
    });

    logger.logAudit('Psychology order access token regenerated', {
      action: 'PSYCHOLOGY_ORDER_TOKEN_REGENERATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: id, orderNumber: order.orderNumber, expiresInHours }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel order
 */
async function cancel(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const order = await PsychologyOrder.findOne({
      where: { id, tenantId },
      include: [{ model: PsychologySession, as: 'sessions' }]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if any session is completed
    const hasCompleted = order.sessions.some(s => s.status === 'completed');
    if (hasCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order with completed sessions'
      });
    }
    
    order.status = 'cancelled';
    order.accessToken = null;
    order.expiresAt = null;
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Order cancelled',
      data: order
    });

    logger.logAudit('Psychology order cancelled', {
      action: 'PSYCHOLOGY_ORDER_CANCEL',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: id, orderNumber: order.orderNumber }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  updatePayment,
  regenerateToken,
  cancel
};
