const { Member, ServicePlan, ActiveService, Transaction, TransactionItem, TransactionPayment, sequelize } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');
const { generateUniqueSequence } = require('../../utils/concurrency');
const { normalizePaymentMethod } = require('../../utils/paymentMethodNormalizer');

/**
 * Get all available service plans
 */
async function getAvailableServices(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const { type } = req.query; // optional filter by type

    const whereClause = {
      tenantId,
      isActive: true
    };

    if (type) {
      whereClause.serviceType = type;
    }

    const services = await ServicePlan.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'serviceType', 'description', 'price', 'duration', 'durationType', 'sessions', 'validityDays', 'isActive'],
      order: [['serviceType', 'ASC'], ['price', 'ASC']]
    });

    // Group by type
    const groupedServices = {
      membership: services.filter(s => s.serviceType === 'membership'),
      classes: services.filter(s => s.serviceType === 'class_package'),
      personal_training: services.filter(s => s.serviceType === 'pt_package')
    };

    logger.logInfo('Available services retrieved', {
      action: 'MEMBER_SERVICES_LIST',
      userId: req.user.id,
      tenantId,
      count: services.length
    });

    res.json({
      status: 'success',
      message: 'Available services retrieved successfully',
      data: {
        all: services,
        grouped: groupedServices
      }
    });

  } catch (err) {
    logger.logError('Error retrieving available services', {
      action: 'MEMBER_SERVICES_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Get membership plans only
 */
async function getMembershipPlans(req, res, next) {
  try {
    const tenantId = req.user.tenantId;

    const memberships = await ServicePlan.findAll({
      where: {
        tenantId,
        serviceType: 'membership',
        isActive: true
      },
      attributes: ['id', 'name', 'description', 'price', 'duration', 'durationType', 'accessControl', 'isPopular'],
      order: [['price', 'ASC']]
    });

    logger.logInfo('Membership plans retrieved', {
      action: 'MEMBER_MEMBERSHIPS_LIST',
      userId: req.user.id,
      tenantId,
      count: memberships.length
    });

    res.json({
      status: 'success',
      message: 'Membership plans retrieved successfully',
      data: memberships
    });

  } catch (err) {
    logger.logError('Error retrieving membership plans', {
      action: 'MEMBER_MEMBERSHIPS_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Get class packages only
 */
async function getClassPackages(req, res, next) {
  try {
    const tenantId = req.user.tenantId;

    const classes = await ServicePlan.findAll({
      where: {
        tenantId,
        serviceType: 'class_package',
        isActive: true
      },
      attributes: ['id', 'name', 'description', 'price', 'sessions', 'validityDays', 'durationType', 'accessControl', 'isPopular'],
      order: [['price', 'ASC']]
    });

    logger.logInfo('Class packages retrieved', {
      action: 'MEMBER_CLASSES_LIST',
      userId: req.user.id,
      tenantId,
      count: classes.length
    });

    res.json({
      status: 'success',
      message: 'Class packages retrieved successfully',
      data: classes
    });

  } catch (err) {
    logger.logError('Error retrieving class packages', {
      action: 'MEMBER_CLASSES_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Get personal training packages only
 */
async function getPTPackages(req, res, next) {
  try {
    const tenantId = req.user.tenantId;

    const ptPackages = await ServicePlan.findAll({
      where: {
        tenantId,
        serviceType: 'pt_package',
        isActive: true
      },
      attributes: ['id', 'name', 'description', 'price', 'sessions', 'validityDays', 'durationType', 'accessControl', 'trainerId', 'isPopular'],
      order: [['price', 'ASC']]
    });

    logger.logInfo('PT packages retrieved', {
      action: 'MEMBER_PT_LIST',
      userId: req.user.id,
      tenantId,
      count: ptPackages.length
    });

    res.json({
      status: 'success',
      message: 'Personal training packages retrieved successfully',
      data: ptPackages
    });

  } catch (err) {
    logger.logError('Error retrieving PT packages', {
      action: 'MEMBER_PT_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Subscribe to a service (self-service purchase)
 */
async function subscribeToService(req, res, next) {
  const t = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { servicePlanId, paymentMethod } = req.body;

    // Security: Warn if customerId is sent in payload (should not be trusted)
    if (req.body.customerId) {
      logger.logWarning('Ignored customerId from payload - using JWT token userId instead', {
        action: 'SUBSCRIBE_SECURITY_WARNING',
        userId,
        tenantId,
        sentCustomerId: req.body.customerId,
        actualUserId: userId
      });
    }

    // Validate required fields
    if (!servicePlanId) {
      await t.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: {
          servicePlanId: 'Service plan ID is required'
        }
      });
    }

    if (!paymentMethod) {
      await t.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: {
          paymentMethod: 'Payment method is required'
        }
      });
    }

    // Find member
    const member = await Member.findOne({
      where: { userId, tenantId },
      transaction: t
    });

    if (!member) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    // Find service plan
    const servicePlan = await ServicePlan.findOne({
      where: {
        id: servicePlanId,
        tenantId,
        isActive: true
      },
      transaction: t
    });

    if (!servicePlan) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Service not found or not available'
      });
    }

    // Log service plan details for debugging
    logger.logInfo('Service plan found', {
      action: 'SERVICE_PLAN_FOUND',
      servicePlanId,
      serviceType: servicePlan.serviceType,
      price: servicePlan.price,
      durationType: servicePlan.durationType,
      sessions: servicePlan.sessions
    });

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    // For time-based services, duration is in days
    if (servicePlan.durationType === 'time_based' && servicePlan.duration) {
      endDate.setDate(endDate.getDate() + servicePlan.duration);
    } 
    // For session-based services, use validityDays
    else if (servicePlan.durationType === 'session_based' && servicePlan.validityDays) {
      endDate.setDate(endDate.getDate() + servicePlan.validityDays);
    }
    // Default to 30 days if not specified
    else {
      endDate.setDate(endDate.getDate() + 30);
    }

    // Prepare active service data
    const activeServiceData = {
      tenantId,
      memberId: member.id,
      servicePlanId: servicePlan.id,
      serviceType: servicePlan.serviceType, // Required field
      startDate,
      endDate,
      totalSessions: servicePlan.sessions || null,
      remainingSessions: servicePlan.sessions || null,
      pricePaid: servicePlan.price, // Required field - snapshot of price at purchase
      currency: 'IDR',
      status: 'suspended' // Suspended until payment is confirmed, then will be activated
    };

    // Log data before creating ActiveService
    logger.logInfo('Creating ActiveService with data', {
      action: 'ACTIVE_SERVICE_CREATE_ATTEMPT',
      data: activeServiceData
    });

    // Create active service
    const activeService = await ActiveService.create(activeServiceData, { transaction: t });

    // Generate transaction number using date-based format
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Find last transaction for today
    const lastTransaction = await Transaction.findOne({
      where: {
        tenantId,
        transactionNumber: {
          [Op.like]: `GYM-${dateStr}-%`
        }
      },
      order: [['transactionNumber', 'DESC']],
      transaction: t
    });

    let sequence = 1;
    if (lastTransaction) {
      const lastSeq = lastTransaction.transactionNumber.split('-')[2];
      sequence = parseInt(lastSeq) + 1;
    }

    const transactionNumber = `GYM-${dateStr}-${String(sequence).padStart(3, '0')}`;

    // Create transaction with proper customer information
    const transaction = await Transaction.create({
      tenantId,
      transactionNumber,
      transactionDate: new Date(),
      type: 'service_purchase',
      category: 'service',
      customerId: userId, // Link to User (who is also Member)
      customerName: member.fullName, // Denormalized for display
      customerType: 'member', // Mark as member transaction
      totalAmount: servicePlan.price,
      status: 'pending',
      notes: `Self-service purchase: ${servicePlan.name}`,
      metadata: {
        source: 'member_portal',
        memberId: member.id,
        memberName: member.fullName,
        selfService: true
      }
    }, { transaction: t });

    // Create transaction item
    await TransactionItem.create({
      tenantId,
      transactionId: transaction.id,
      itemType: 'service_plan',
      itemId: servicePlan.id,
      itemName: servicePlan.name,
      quantity: 1,
      unitPrice: servicePlan.price,
      subtotal: servicePlan.price,
      total: servicePlan.price // Total = subtotal for single item without discount
    }, { transaction: t });

    // Create payment record (pending)
    await TransactionPayment.create({
      tenantId,
      transactionId: transaction.id,
      paymentMethod: normalizePaymentMethod(paymentMethod || 'pending'),
      amount: servicePlan.price,
      paymentDate: new Date(),
      status: 'pending',
      notes: 'Awaiting payment confirmation'
    }, { transaction: t });

    await t.commit();

    logger.logInfo('Member subscribed to service', {
      action: 'MEMBER_SERVICE_SUBSCRIBE',
      userId,
      tenantId,
      memberId: member.id,
      servicePlanId,
      transactionId: transaction.id,
      amount: servicePlan.price
    });

    res.status(201).json({
      status: 'success',
      message: 'Service subscription created. Please complete payment to activate.',
      data: {
        activeService: {
          id: activeService.id,
          serviceName: servicePlan.name,
          startDate: activeService.startDate,
          endDate: activeService.endDate,
          status: activeService.status
        },
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          amount: transaction.totalAmount,
          status: transaction.status,
          customerName: transaction.customerName,
          customerType: transaction.customerType
        },
        paymentInstructions: {
          message: 'Please complete payment to activate your service',
          amount: servicePlan.price,
          methods: ['cash', 'transfer', 'credit_card'] // Based on tenant settings
        }
      }
    });

  } catch (err) {
    await t.rollback();
    logger.logError('Error subscribing to service', {
      action: 'MEMBER_SERVICE_SUBSCRIBE_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Get member's active services
 */
async function getMyActiveServices(req, res, next) {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find member
    const member = await Member.findOne({
      where: { userId, tenantId }
    });

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    const activeServices = await ActiveService.findAll({
      where: {
        memberId: member.id,
        tenantId
      },
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'description', 'price', 'duration', 'durationType', 'sessions', 'validityDays']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Separate by status
    const active = activeServices.filter(s => s.status === 'active' && new Date(s.endDate) >= new Date());
    const expired = activeServices.filter(s => s.status === 'expired' || new Date(s.endDate) < new Date());
    const suspended = activeServices.filter(s => s.status === 'suspended'); // Waiting for payment confirmation
    const cancelled = activeServices.filter(s => s.status === 'cancelled');

    logger.logInfo('Member active services retrieved', {
      action: 'MEMBER_ACTIVE_SERVICES_LIST',
      userId,
      tenantId,
      memberId: member.id,
      count: activeServices.length
    });

    res.json({
      status: 'success',
      message: 'Active services retrieved successfully',
      data: {
        active: active.map(s => ({
          id: s.id,
          servicePlan: s.servicePlan,
          startDate: s.startDate,
          endDate: s.endDate,
          remainingSessions: s.remainingSessions,
          status: s.status
        })),
        suspended: suspended.map(s => ({
          id: s.id,
          servicePlan: s.servicePlan,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status,
          note: 'Waiting for payment confirmation'
        })),
        expired: expired.map(s => ({
          id: s.id,
          servicePlan: s.servicePlan,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status
        })),
        cancelled: cancelled.map(s => ({
          id: s.id,
          servicePlan: s.servicePlan,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status
        })),
        summary: {
          totalActive: active.length,
          totalSuspended: suspended.length,
          totalExpired: expired.length,
          totalCancelled: cancelled.length
        }
      }
    });

  } catch (err) {
    logger.logError('Error retrieving active services', {
      action: 'MEMBER_ACTIVE_SERVICES_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

module.exports = {
  getAvailableServices,
  getMembershipPlans,
  getClassPackages,
  getPTPackages,
  subscribeToService,
  getMyActiveServices
};
