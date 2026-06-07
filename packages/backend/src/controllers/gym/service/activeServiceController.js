const {
  ActiveService,
  ServicePlan,
  Member,
  Tenant,
  Transaction,
  TransactionItem,
  TransactionPayment,
  Trainer,
  TrainerCommission,
  Voucher,
  VoucherUsage,
  sequelize
} = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { createError } = require('../../../utils/errorCodes');
const ConcurrencyUtils = require('../../../utils/concurrency');
const { withRetry } = require('../../../utils/concurrency');
const { normalizePaymentMethod } = require('../../../utils/paymentMethodNormalizer');
const { generateTransactionNumber } = require('../../../services/invoiceNumberService');
const transactionSettingsService = require('../../../services/transactionSettingsService');
const voucherService = require('../../../services/voucherService');
const receiptPrinterService = require('../../../services/receiptPrinterService');

/**
 * Get all walk-in active services (memberId IS NULL)
 */
async function getWalkInActiveServices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { status = 'all', serviceType = 'all', date, page = 1, limit = 50 } = req.query;

    const where = { memberId: null };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (status !== 'all') {
      where.status = status;
    }
    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }
    if (date) {
      where.startDate = date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: activeServices } = await ActiveService.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'durationType', 'price']
        },
        {
          model: Trainer,
          as: 'assignedTrainer',
          required: false,
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Transaction,
          as: 'purchaseTransaction',
          required: false,
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
        }
      ]
    });

    return res.json({
      data: activeServices,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Get all active services for a member
 */
async function getMemberActiveServices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { memberId } = req.params;
    const { status = 'all', serviceType = 'all' } = req.query;

    // Verify member belongs to tenant (include soft-deleted)
    const memberWhere = { id: memberId };
    if (!isSuperAdmin) {
      memberWhere.tenantId = tenantId;
    }

    const member = await Member.findOne({ where: memberWhere, paranoid: false });
    if (!member) {
      return next(createError('MEMBER_NOT_FOUND', 'Member not found', 404));
    }

    const where = { memberId };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Filter by status
    if (status !== 'all') {
      where.status = status;
    }

    // Filter by service type
    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }

    const activeServices = await ActiveService.findAll({
      where,
      order: [['startDate', 'DESC']],
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'durationType', 'price']
        },
        {
          model: Trainer,
          as: 'assignedTrainer',
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        },
        {
          model: Transaction,
          as: 'purchaseTransaction',
          attributes: ['id', 'transactionNumber', 'totalAmount']
        }
      ]
    });

    logger.logInfo('Member active services retrieved', {
      action: 'GET_MEMBER_ACTIVE_SERVICES',
      memberId,
      count: activeServices.length,
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({ data: activeServices });
  } catch (err) {
    logger.logSecurity('Error retrieving member active services', {
      action: 'GET_MEMBER_ACTIVE_SERVICES_ERROR',
      error: err.message,
      stack: err.stack,
      memberId: req.params.memberId,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    return next(err);
  }
}

/**
 * Get a single active service by ID
 */
async function getActiveServiceById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const activeService = await ActiveService.findOne({
      where,
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan'
        },
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Trainer,
          as: 'assignedTrainer',
          attributes: ['id', 'firstName', 'lastName', 'specialization']
        },
        {
          model: Transaction,
          as: 'purchaseTransaction'
        }
      ]
    });

    if (!activeService) {
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Active service not found', 404));
    }

    logger.logInfo('Active service retrieved', {
      action: 'ACTIVE_SERVICE_RETRIEVED',
      userId: req.user?.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      activeServiceId: id,
      tenantId: req.user.tenantId
    });

    return res.json({ data: activeService });
  } catch (err) {
    logger.logSecurity('Error retrieving active service', {
      action: 'RETRIEVING_ACTIVE_SERVICE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      activeServiceId: req.params.id
    });
    return next(err);
  }
}

/**
 * Universal function to purchase service plans (single or bulk)
 * 
 * PRICING FORMULA (Clear & Unambiguous):
 * 1. subtotal = sum of all service plan prices
 * 2. voucherDiscount = discount from voucher code (if provided)
 * 3. amountAfterDiscount = subtotal - voucherDiscount
 * 4. taxAmount = calculate from amountAfterDiscount (percentage or fixed based on tenant settings)
 * 5. totalAmount = amountAfterDiscount + taxAmount
 * 
 * FRONTEND-BACKEND VALIDATION:
 * - Frontend sends: servicePlans, paymentMethods, voucherCode (optional)
 * - Frontend does NOT send totalAmount (backend calculates)
 * - Backend validates: sum(paymentMethods.amount) >= totalAmount
 * - Backend returns: complete breakdown (subtotal, voucherDiscount, taxAmount, totalAmount)
 * 
 * @param {Object} req.body.servicePlans - Array of { servicePlanId, startDate, assignedTrainerId, autoRenew }
 * @param {Object} req.body.paymentMethods - Array of { method, amount }
 * @param {String} req.body.voucherCode - Optional voucher code for discount
 */
async function purchaseServices(req, res, next) {
  const t = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      memberId,
      customerName, // For walk-in customers without a member record
      servicePlans, // Array of { servicePlanId, startDate, assignedTrainerId, autoRenew }
      paymentMethods, // Array of { method, amount } or single { method, amount }
      voucherCode,
      notes
    } = req.body;

    const isWalkIn = !memberId;

    // Normalize input: accept both single and bulk format
    let normalizedServicePlans = [];
    let normalizedPaymentMethods = [];

    // Handle legacy single purchase format
    if (req.body.servicePlanId) {
      normalizedServicePlans = [{
        servicePlanId: req.body.servicePlanId,
        startDate: req.body.startDate,
        assignedTrainerId: req.body.assignedTrainerId,
        autoRenew: req.body.autoRenew || false,
        // Companion members for couple/group plans (pax > 1)
        additionalMemberIds: Array.isArray(req.body.additionalMemberIds) ? req.body.additionalMemberIds : []
      }];
    } else if (servicePlans && Array.isArray(servicePlans)) {
      // Ensure each plan item has additionalMemberIds array
      normalizedServicePlans = servicePlans.map(sp => ({
        ...sp,
        additionalMemberIds: Array.isArray(sp.additionalMemberIds) ? sp.additionalMemberIds : []
      }));
    } else {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('VALIDATION_ERROR', 'servicePlanId or servicePlans array is required', 400));
    }

    // Handle payment methods (legacy single or array)
    if (req.body.paymentMethod) {
      // Legacy single payment format
      if (!req.body.paidAmount || req.body.paidAmount <= 0) {
        if (t && !t.finished) {
          await t.rollback();
        }
        return next(createError('VALIDATION_ERROR', 'paidAmount is required and must be greater than 0', 400));
      }
      normalizedPaymentMethods = [{
        method: req.body.paymentMethod,
        amount: req.body.paidAmount
      }];
    } else if (paymentMethods && Array.isArray(paymentMethods)) {
      // Validate each payment method has amount
      for (let i = 0; i < paymentMethods.length; i++) {
        const pm = paymentMethods[i];
        if (!pm.method) {
          if (t && !t.finished) {
            await t.rollback();
          }
          return next(createError('VALIDATION_ERROR', `paymentMethods[${i}].method is required`, 400));
        }
        if (!pm.amount || pm.amount <= 0) {
          if (t && !t.finished) {
            await t.rollback();
          }
          return next(createError('VALIDATION_ERROR', `paymentMethods[${i}].amount is required and must be greater than 0`, 400));
        }
      }
      normalizedPaymentMethods = paymentMethods;
    } else {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('VALIDATION_ERROR', 'paymentMethod or paymentMethods array is required', 400));
    }

    // Validation
    if ((!memberId && !customerName) || normalizedServicePlans.length === 0 || normalizedPaymentMethods.length === 0) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('VALIDATION_ERROR', 'Missing required fields: memberId (or customerName for walk-in), servicePlans, paymentMethods', 400));
    }

    // Verify member (include soft-deleted) — skip for walk-in
    let member = null;
    if (memberId) {
      member = await Member.findOne({
        where: {
          id: memberId,
          tenantId: isSuperAdmin ? undefined : tenantId
        },
        paranoid: false,
        transaction: t
      });

      if (!member) {
        if (t && !t.finished) {
          await t.rollback();
        }
        return next(createError('MEMBER_NOT_FOUND', 'Member not found', 404));
      }
    }

    const effectiveTenantId = member ? member.tenantId : tenantId;

    // Get tax configuration using transactionSettingsService
    const taxConfig = await transactionSettingsService.getTaxConfiguration(effectiveTenantId);
    const invoiceConfig = await transactionSettingsService.getInvoiceConfiguration(effectiveTenantId);
    const currencyConfig = await transactionSettingsService.getCurrencyConfiguration(effectiveTenantId);

    const taxEnabled = taxConfig.taxEnable;
    const taxRate = taxConfig.taxPercentage;
    const taxType = taxConfig.taxType;

    // Log tax configuration for debugging
    logger.logInfo('Tax configuration loaded', {
      action: 'TAX_CONFIGURATION_LOADED',
      userId: req.user?.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: effectiveTenantId,
      taxEnabled,
      taxRate,
      taxType
    });

    // Fetch all service plans
    const servicePlanIds = normalizedServicePlans.map(sp => sp.servicePlanId);
    const dbServicePlans = await ServicePlan.findAll({
      where: {
        id: servicePlanIds,
        tenantId: isSuperAdmin ? undefined : tenantId,
        isActive: true
      },
      transaction: t
    });

    if (dbServicePlans.length !== servicePlanIds.length) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('SERVICE_PLAN_NOT_FOUND', 'One or more service plans not found or inactive', 404));
    }

    // Check subscription limits (members only)
    if (!isWalkIn) {
      const subscription = await req.user.tenant.getSubscription();
      const planLimits = subscription?.plan?.features?.limits || {};
      const maxActiveServicesPerMember = planLimits.maxActiveServicesPerMember ?? 10;

      const currentActiveCount = await ActiveService.count({
        where: {
          memberId,
          tenantId: effectiveTenantId,
          status: 'active'
        },
        transaction: t
      });

      if (maxActiveServicesPerMember > 0 && (currentActiveCount + normalizedServicePlans.length) > maxActiveServicesPerMember) {
        if (t && !t.finished) {
          await t.rollback();
        }
        return next(createError('LIMIT_EXCEEDED', `Active services limit would be exceeded. Current: ${currentActiveCount}, Limit: ${maxActiveServicesPerMember}`, 403));
      }
    }

    // For walk-in: validate all service plans have allowWalkIn enabled
    if (isWalkIn) {
      const nonWalkInPlans = dbServicePlans.filter(sp => !sp.allowWalkIn);
      if (nonWalkInPlans.length > 0) {
        if (t && !t.finished) await t.rollback();
        return next(createError('VALIDATION_ERROR', `Service plans not available for walk-in: ${nonWalkInPlans.map(sp => sp.name).join(', ')}`, 400));
      }
    }

    // Validate and fetch companion members for couple/group plans (pax > 1)
    const allCompanionMemberIds = [...new Set(
      normalizedServicePlans.flatMap(sp => sp.additionalMemberIds || [])
    )];

    let companionMembersMap = {};
    if (!isWalkIn && allCompanionMemberIds.length > 0) {
      // Validate per-plan companion count matches pax requirement
      for (const sp of normalizedServicePlans) {
        const plan = servicePlanMap[sp.servicePlanId];
        const companions = sp.additionalMemberIds || [];
        const planPax = plan.pax || 1;
        const expectedCompanions = planPax - 1;

        if (companions.length > 0 && companions.length !== expectedCompanions) {
          if (t && !t.finished) await t.rollback();
          return next(createError('VALIDATION_ERROR',
            `Service plan "${plan.name}" (pax=${planPax}) membutuhkan tepat ${expectedCompanions} companion member, diberikan ${companions.length}`,
            400));
        }

        // pax=1 plans cannot have companions
        if (planPax === 1 && companions.length > 0) {
          if (t && !t.finished) await t.rollback();
          return next(createError('VALIDATION_ERROR',
            `Service plan "${plan.name}" adalah paket individual (pax=1) dan tidak mendukung companion member`,
            400));
        }

        // Primary member cannot appear in companion list
        if (memberId && companions.includes(memberId)) {
          if (t && !t.finished) await t.rollback();
          return next(createError('VALIDATION_ERROR', 'Primary member tidak boleh dimasukkan sebagai companion', 400));
        }

        // No duplicate companions within a single plan
        if (new Set(companions).size !== companions.length) {
          if (t && !t.finished) await t.rollback();
          return next(createError('VALIDATION_ERROR',
            `Service plan "${plan.name}" memiliki duplicate companion member ID`,
            400));
        }
      }

      // Fetch all companion member records in a single query
      const companionMembers = await Member.findAll({
        where: {
          id: allCompanionMemberIds,
          tenantId: effectiveTenantId
        },
        transaction: t
      });

      if (companionMembers.length !== allCompanionMemberIds.length) {
        if (t && !t.finished) await t.rollback();
        return next(createError('MEMBER_NOT_FOUND', 'Satu atau lebih companion member tidak ditemukan', 404));
      }

      companionMembers.forEach(m => { companionMembersMap[m.id] = m; });
    }

    // Verify all trainers if provided
    const trainerIds = normalizedServicePlans
      .filter(sp => sp.assignedTrainerId)
      .map(sp => sp.assignedTrainerId);

    if (trainerIds.length > 0) {
      const trainers = await Trainer.findAll({
        where: {
          id: trainerIds,
          tenantId: effectiveTenantId
        },
        transaction: t
      });

      if (trainers.length !== trainerIds.length) {
        if (t && !t.finished) {
          await t.rollback();
        }
        return next(createError('TRAINER_NOT_FOUND', 'One or more trainers not found', 404));
      }
    }

    // Calculate subtotal (with quantity support)
    let subtotal = 0;
    const servicePlanMap = {};

    // Build map first
    dbServicePlans.forEach(sp => {
      servicePlanMap[sp.id] = sp;
    });

    // Sum prices with quantity
    normalizedServicePlans.forEach(sp => {
      const plan = servicePlanMap[sp.servicePlanId];
      const qty = parseInt(sp.quantity) || 1;
      subtotal += parseFloat(plan.price) * qty;
    });

    // Apply voucher discount (centralized voucher service)
    let voucherDiscount = 0;
    let voucherId = null;
    let appliedVoucher = null;

    if (voucherCode) {
      try {
        const { voucher, discount } = await voucherService.applyVoucher(
          voucherCode,
          effectiveTenantId,
          subtotal,
          req.user.id,
          memberId || null,
          t
        );

        voucherDiscount = discount;
        voucherId = voucher.id;
        appliedVoucher = voucher;

        // Increment usage count
        await voucherService.incrementVoucherUsage(voucher, t);
      } catch (voucherError) {
        if (t && !t.finished) {
          await t.rollback();
        }
        return next(voucherError);
      }
    }

    // Calculate after voucher discount
    const amountAfterDiscount = subtotal - voucherDiscount;

    // Calculate tax based on tenant settings
    let taxAmount = 0;
    if (taxEnabled && taxRate > 0) {
      if (taxType === 'percentage') {
        taxAmount = (amountAfterDiscount * taxRate) / 100;
      } else {
        // Fixed tax
        taxAmount = taxRate;
      }
    }

    // Final total (CLEAR FORMULA)
    // totalAmount = subtotal - voucherDiscount + taxAmount
    const totalAmount = amountAfterDiscount + taxAmount;

    // Validate total payment
    const totalPaid = normalizedPaymentMethods.reduce((sum, pm) => sum + parseFloat(pm.amount), 0);

    if (totalPaid < totalAmount) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('INSUFFICIENT_PAYMENT', `Payment insufficient. Required: ${totalAmount.toFixed(2)}, Paid: ${totalPaid.toFixed(2)}`, 400));
    }

    const changeAmount = totalPaid - totalAmount;

    // Get currency from configuration
    const currency = currencyConfig.defaultCurrency;

    // Generate transaction number using invoice number service (race condition safe)
    // Automatically uses tenant's invoice settings for formatting
    const transactionNumber = await generateTransactionNumber(
      effectiveTenantId,
      invoiceConfig,
      t
    );

    const transaction = await Transaction.create({
      tenantId: effectiveTenantId,
      transactionNumber,
      transactionType: 'gym', // Valid ENUM: 'pos', 'restaurant', 'gym', 'psychology'
      customerId: member ? member.id : null,
      customerType: member ? 'member' : 'non-member',
      customerName: member ? null : customerName,
      subtotal,
      tax: taxAmount,
      voucherId: voucherId,
      voucherDiscount: voucherDiscount, // Only voucher discount, no ambiguous 'discount' field
      totalAmount,
      paidAmount: totalPaid,
      changeAmount,
      currency,
      status: 'completed',
      completedAt: new Date(),
      notes,
      createdBy: req.user.id
    }, { transaction: t });

    // Create TransactionItems for each service plan (with quantity support)
    const itemPromises = normalizedServicePlans.map(sp => {
      const plan = servicePlanMap[sp.servicePlanId];
      const itemPrice = parseFloat(plan.price);
      const qty = parseInt(sp.quantity) || 1;

      return TransactionItem.create({
        transactionId: transaction.id,
        itemType: 'service_plan',
        itemId: sp.servicePlanId,
        itemName: plan.name,
        quantity: qty,
        unitPrice: itemPrice,
        subtotal: itemPrice * qty,
        total: itemPrice * qty
      }, { transaction: t });
    });

    await Promise.all(itemPromises);

    // Create TransactionPayments
    const paymentPromises = normalizedPaymentMethods.map(pm =>
      TransactionPayment.create({
        transactionId: transaction.id,
        paymentMethod: normalizePaymentMethod(pm.method),
        amount: pm.amount,
        currency,
        status: 'completed',
        paidAt: new Date(),
        paymentDetails: pm.paymentDetails || {},
      }, { transaction: t })
    );

    await Promise.all(paymentPromises);

    // Create VoucherUsage record for audit trail (using centralized service)
    if (voucherId) {
      await voucherService.createVoucherUsage({
        voucherId,
        transactionId: transaction.id,
        userId: req.user.id,
        memberId,
        discountAmount: voucherDiscount,
        originalAmount: subtotal,
        finalAmount: totalAmount,
        usageDetails: {
          servicePlans: normalizedServicePlans.map(sp => ({
            servicePlanId: sp.servicePlanId,
            servicePlanName: servicePlanMap[sp.servicePlanId].name
          }))
        }
      }, t);
    }

    // Create ActiveServices for all purchases (including walk-in)
    // Uses flatMap to create N ActiveService records when quantity > 1
    const activeServicePromises = normalizedServicePlans.flatMap(sp => {
      const plan = servicePlanMap[sp.servicePlanId];
      const qty = parseInt(sp.quantity) || 1;

      return Array.from({ length: qty }, (_, qtyIndex) => (async () => {
        // Check if member already has active service for this plan (for extension logic — members only)
        // Only check for first item in quantity batch to avoid conflicts
        const existingActiveService = (!isWalkIn && memberId && qtyIndex === 0) ? await ActiveService.findOne({
          where: {
            memberId,
            servicePlanId: sp.servicePlanId,
            tenantId: effectiveTenantId,
            status: 'active',
            endDate: { [Op.gte]: new Date() } // Still has remaining days
          },
          order: [['endDate', 'DESC']], // Get the one that expires last
          transaction: t
        }) : null;

        // Determine start date and end date based on service type
        let start;
        let endDate;
        let totalSessions = plan.sessions;
        let remainingSessions = plan.sessions;
        let serviceNotes = notes;

        const duration = plan.duration || plan.validityDays;
        const isSessionBased = plan.sessions && plan.sessions > 0;

        if (existingActiveService) {
          if (isSessionBased && existingActiveService.remainingSessions > 0) {
            // SESSION-BASED EXTENSION: Add sessions to existing service
            // Update existing service's sessions instead of creating new one
            const sessionsToAdd = plan.sessions * qty; // Add all qty sessions at once
            const newTotalSessions = existingActiveService.totalSessions + sessionsToAdd;
            const newRemainingSessions = existingActiveService.remainingSessions + sessionsToAdd;

            await existingActiveService.update({
              totalSessions: newTotalSessions,
              remainingSessions: newRemainingSessions,
              notes: existingActiveService.notes
                ? `${existingActiveService.notes}\n[${new Date().toISOString().split('T')[0]}] Tambah ${sessionsToAdd} sesi (total: ${newTotalSessions} sesi).`
                : `Tambah ${sessionsToAdd} sesi (total: ${newTotalSessions} sesi).`
            }, { transaction: t });

            // Return the updated existing service (not create new)
            return existingActiveService;
          } else {
            // TIME-BASED EXTENSION: Extend endDate
            start = new Date(existingActiveService.endDate);

            if (duration) {
              endDate = new Date(start);
              endDate.setDate(endDate.getDate() + duration);
            } else {
              endDate = new Date(start);
              endDate.setDate(endDate.getDate() + 30);
            }

            const oldEndDate = new Date(existingActiveService.endDate);
            const formattedDate = oldEndDate.toISOString().split('T')[0];
            serviceNotes = `Perpanjangan dari service aktif hingga ${formattedDate}. ${notes || ''}`.trim();
          }
        } else {
          // NEW SERVICE
          if (sp.startDate) {
            start = new Date(sp.startDate);
            start.setHours(start.getHours() + 7);
          } else {
            start = new Date();
          }

          if (duration) {
            endDate = new Date(start);
            endDate.setDate(endDate.getDate() + duration);
          } else {
            endDate = new Date(start);
            endDate.setDate(endDate.getDate() + 30);
          }
        }

        // Calculate per-item price with proportional discount and tax
        const itemPrice = parseFloat(plan.price);
        const proportionalDiscount = (voucherDiscount / subtotal) * itemPrice;
        const proportionalTax = (taxAmount / subtotal) * itemPrice;
        const itemFinalPrice = itemPrice - proportionalDiscount + proportionalTax;

        return ActiveService.create({
          tenantId: effectiveTenantId,
          memberId: memberId || null,
          customerName: isWalkIn ? customerName : null,
          servicePlanId: sp.servicePlanId,
          serviceType: plan.serviceType,
          startDate: start,
          endDate,
          totalSessions,
          remainingSessions,
          status: 'active',
          autoRenew: sp.autoRenew || false,
          purchaseTransactionId: transaction.id,
          purchaseDate: new Date(),
          assignedTrainerId: sp.assignedTrainerId || null,
          pricePaid: itemFinalPrice,
          currency: plan.currency,
          voucherId: voucherId,
          voucherDiscount: proportionalDiscount,
          notes: serviceNotes
        }, { transaction: t });
      })());
    });

    const activeServices = await Promise.all(activeServicePromises);

    // Create trainer commissions for services with assigned trainers (only if ActiveServices were created)
    const commissionPromises = activeServices.map(async (activeService) => {
      if (activeService.assignedTrainerId) {
        // Fetch trainer to get commission settings
        const trainer = await Trainer.findByPk(activeService.assignedTrainerId, {
          attributes: ['id', 'commissionType', 'commissionValue'],
          transaction: t
        });

        // Only create commission if trainer has commission configured
        if (trainer && trainer.commissionValue > 0) {
          return TrainerCommission.create({
            tenantId: activeService.tenantId,
            trainerId: trainer.id,
            transactionId: transaction.id,
            classId: null, // For service plans, classId is null
            baseAmount: activeService.pricePaid || 0,
            commissionType: trainer.commissionType,
            commissionRate: trainer.commissionValue,
            status: 'pending',
            notes: `Commission for ${activeService.serviceType} service - Service Plan ID: ${activeService.servicePlanId}`
          }, { transaction: t });
        }
      }
      return null;
    });

    await Promise.all(commissionPromises);

    // Create ActiveServices for companion members (couple/group plans where pax > 1)
    const companionActiveServicePromises = [];
    if (!isWalkIn && allCompanionMemberIds.length > 0) {
      for (const sp of normalizedServicePlans) {
        const plan = servicePlanMap[sp.servicePlanId];
        const companions = sp.additionalMemberIds || [];
        if (companions.length === 0) continue;

        const qty = parseInt(sp.quantity) || 1;

        // Determine companion start/end dates (mirror primary member's calculation)
        let companionStart;
        if (sp.startDate) {
          companionStart = new Date(sp.startDate);
          companionStart.setHours(companionStart.getHours() + 7);
        } else {
          companionStart = new Date();
        }

        const duration = plan.duration || plan.validityDays;
        const companionEnd = new Date(companionStart);
        if (duration) {
          companionEnd.setDate(companionEnd.getDate() + duration);
        } else {
          companionEnd.setDate(companionEnd.getDate() + 30);
        }

        const itemPrice = parseFloat(plan.price);
        const proportionalDiscount = subtotal > 0 ? (voucherDiscount / subtotal) * itemPrice : 0;
        const proportionalTax = subtotal > 0 ? (taxAmount / subtotal) * itemPrice : 0;

        for (const companionId of companions) {
          for (let q = 0; q < qty; q++) {
            companionActiveServicePromises.push(
              ActiveService.create({
                tenantId: effectiveTenantId,
                memberId: companionId,
                servicePlanId: sp.servicePlanId,
                serviceType: plan.serviceType,
                startDate: companionStart,
                endDate: companionEnd,
                totalSessions: plan.sessions || null,
                remainingSessions: plan.sessions || null,
                status: 'active',
                autoRenew: sp.autoRenew || false,
                purchaseTransactionId: transaction.id,
                purchaseDate: new Date(),
                assignedTrainerId: sp.assignedTrainerId || null,
                pricePaid: 0, // Companion included in primary price; 0 to avoid double-counting revenue
                currency: plan.currency,
                voucherId: voucherId,
                voucherDiscount: 0,
                notes: `Companion plan (pax=${plan.pax}) — dibeli bersama primary member ID: ${memberId}. Transaksi: ${transaction.transactionNumber}. ${notes || ''}`.trim()
              }, { transaction: t })
            );
          }
        }
      }
    }

    const companionActiveServices = await Promise.all(companionActiveServicePromises);

    // Update membershipStatus for companion members
    if (companionActiveServices.length > 0) {
      const uniqueCompanionIds = [...new Set(companionActiveServices.map(as => as.memberId))];
      await Promise.all(
        uniqueCompanionIds.map(cId => {
          const m = companionMembersMap[cId];
          return m ? m.update({ membershipStatus: 'active' }, { transaction: t }) : Promise.resolve();
        })
      );
    }

    // Update member's membershipStatus to 'active' after successful service purchase
    if (member) {
      await member.update({ membershipStatus: 'active' }, { transaction: t });
    }

    await t.commit();

    // Reload with associations
    const reloadedServices = await Promise.all(
      activeServices.map(as => as.reload({
        include: [
          { model: ServicePlan, as: 'servicePlan' },
          { model: Trainer, as: 'assignedTrainer' }
        ]
      }))
    );

    // Reload companion services with associations
    const reloadedCompanionServices = await Promise.all(
      companionActiveServices.map(as => as.reload({
        include: [
          { model: ServicePlan, as: 'servicePlan' },
          { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
          { model: Trainer, as: 'assignedTrainer' }
        ]
      }))
    );

    logger.logInfo('Service plans purchased', {
      action: 'SERVICE_PLANS_PURCHASED',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: normalizedServicePlans.length,
      memberId: memberId || null,
      customerName: isWalkIn ? customerName : undefined,
      transactionId: transaction.id,
      subtotal,
      voucherDiscount,
      taxAmount,
      totalAmount,
      tenantId: effectiveTenantId,
      userId: req.user.id
    });

    // Auto-print receipt
    const tenantForPrint = await Tenant.findByPk(effectiveTenantId, {
      attributes: ['id', 'name', 'address', 'phone', 'settings']
    });

    const transactionWithPayments = await Transaction.findByPk(transaction.id, {
      include: [
        { model: TransactionPayment, as: 'payments' },
        { model: Voucher, as: 'voucher' }
      ]
    });

    // Print ONE receipt for ALL services in this transaction
    const memberForReceipt = member || { name: customerName };

    try {
      logger.logInfo('Attempting to print combined service receipt', {
        action: 'AUTO_PRINT_COMBINED_SERVICE_RECEIPT',
        transactionId: transaction.id,
        serviceCount: reloadedServices.length,
        tenantId: effectiveTenantId,
        isWalkIn,
        hasPrinterSettings: !!(tenantForPrint?.settings?.printers)
      });

      await receiptPrinterService.printCombinedServiceReceipt(
        reloadedServices,
        memberForReceipt,
        transactionWithPayments,
        tenantForPrint
      );
    } catch (printError) {
      // Log but don't fail the purchase if printing fails
      logger.error('Failed to auto-print combined service receipt', {
        error: printError.message,
        stack: printError.stack,
        transactionId: transaction.id,
        tenantId: effectiveTenantId
      });
    }

    // Calculate total quantity for response message
    const totalQty = normalizedServicePlans.reduce((sum, sp) => sum + (parseInt(sp.quantity) || 1), 0);
    const totalCompanions = reloadedCompanionServices.length;
    const totalPeople = (memberId ? 1 : 0) + (totalCompanions > 0 ? [...new Set(reloadedCompanionServices.map(as => as.memberId))].length : 0);

    return res.status(201).json({
      message: `${totalQty} service(s) purchased successfully${
        totalCompanions > 0 ? ` untuk ${totalPeople} orang (termasuk ${totalCompanions} companion)` : ''
      }`,
      data: {
        activeServices: reloadedServices,
        companionActiveServices: reloadedCompanionServices,
        coupleInfo: totalCompanions > 0 ? {
          totalPeople,
          primaryMemberId: memberId,
          companionMemberIds: [...new Set(reloadedCompanionServices.map(as => as.memberId))]
        } : undefined,
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          subtotal,
          voucherDiscount,
          taxAmount,
          totalAmount,
          paidAmount: totalPaid,
          changeAmount
        }
      }
    });
  } catch (err) {
    if (!t.finished) {
      if (t && !t.finished) {
        await t.rollback();
      }
    }
    logger.logSecurity('Error purchasing service plans', {
      action: 'PURCHASING_SERVICE_PLANS',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });
    return next(err);
  }
}

/**
 * Use a session from an active service (for session-based services)
 */
async function useSession(req, res, next) {
  const t = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { notes } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const activeService = await ActiveService.findOne({
      where,
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!activeService) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Active service not found', 404));
    }

    if (activeService.status !== 'active') {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('SERVICE_NOT_ACTIVE', 'Service is not active', 400));
    }

    if (!activeService.totalSessions) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('NOT_SESSION_BASED', 'This service is not session-based', 400));
    }

    // Use session with retry (optimistic locking)
    await withRetry(async () => {
      await activeService.useSession(t);
    });

    // Update notes if provided
    if (notes) {
      activeService.notes = activeService.notes
        ? `${activeService.notes}\n[${new Date().toISOString()}] ${notes}`
        : `[${new Date().toISOString()}] ${notes}`;
      await activeService.save({ transaction: t });
    }

    await t.commit();

    logger.logInfo('Session used', {
      action: 'SESSION_USED',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      activeServiceId: id,
      remainingSessions: activeService.remainingSessions,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      message: 'Session used successfully',
      data: {
        remainingSessions: activeService.remainingSessions,
        status: activeService.status
      }
    });
  } catch (err) {
    if (!t.finished) {
      if (t && !t.finished) {
        await t.rollback();
      }
    }
    logger.logSecurity('Error using session', {
      action: 'USING_SESSION',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      activeServiceId: req.params.id
    });
    return next(err);
  }
}

/**
 * Cancel an active service (supports optional partial refund)
 * 
 * @param {String} req.params.id - Active service ID
 * @param {String} req.body.reason - Cancellation reason (required)
 * @param {Number} req.body.refundAmount - Optional refund amount (partial or full). 
 *   If provided, creates a refund transaction record for financal tracking.
 *   If omitted, cancels without financial adjustment (admin manual refund handled externally).
 * @param {String} req.body.refundPaymentMethod - Payment method for refund (e.g. 'cash', 'bank_transfer')
 *   Required when refundAmount is provided.
 */
async function cancelActiveService(req, res, next) {
  const t = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { reason, refundAmount, refundPaymentMethod, refundNotes } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const activeService = await ActiveService.findOne({
      where,
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!activeService) {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Active service not found', 404));
    }

    if (activeService.status === 'cancelled') {
      if (t && !t.finished) {
        await t.rollback();
      }
      return next(createError('ALREADY_CANCELLED', 'Service is already cancelled', 400));
    }

    // Validate refund amount
    const parsedRefundAmount = refundAmount ? parseFloat(refundAmount) : null;
    if (parsedRefundAmount !== null) {
      if (isNaN(parsedRefundAmount) || parsedRefundAmount <= 0) {
        if (t && !t.finished) { await t.rollback(); }
        return next(createError('VALIDATION_ERROR', 'refundAmount must be a positive number', 400));
      }
      const pricePaid = parseFloat(activeService.pricePaid || 0);
      if (parsedRefundAmount > pricePaid) {
        if (t && !t.finished) { await t.rollback(); }
        return next(createError('VALIDATION_ERROR', `Refund amount (${parsedRefundAmount}) cannot exceed the amount paid for this service (${pricePaid})`, 400));
      }
      if (!refundPaymentMethod) {
        if (t && !t.finished) { await t.rollback(); }
        return next(createError('VALIDATION_ERROR', 'refundPaymentMethod is required when refundAmount is provided', 400));
      }
    }

    // Cancel the active service
    activeService.status = 'cancelled';
    activeService.notes = activeService.notes
      ? `${activeService.notes}\n[CANCELLED ${new Date().toISOString()}] ${reason || 'No reason provided'}`
      : `[CANCELLED ${new Date().toISOString()}] ${reason || 'No reason provided'}`;

    await activeService.save({ transaction: t });

    // --- Create refund transaction if refundAmount is provided ---
    let refundTransaction = null;
    if (parsedRefundAmount && activeService.purchaseTransactionId) {
      const { generateTransactionNumber } = require('../../../services/invoiceNumberService');
      const transactionSettingsService = require('../../../services/transactionSettingsService');

      const invoiceConfig = await transactionSettingsService.getInvoiceConfiguration(
        isSuperAdmin ? activeService.tenantId : tenantId
      );
      const currencyConfig = await transactionSettingsService.getCurrencyConfiguration(
        isSuperAdmin ? activeService.tenantId : tenantId
      );
      const refundTransactionNumber = await generateTransactionNumber(
        isSuperAdmin ? activeService.tenantId : tenantId,
        invoiceConfig,
        t
      );

      const serviceName = activeService.servicePlan ? activeService.servicePlan.name : `Service #${id}`;
      const refundNote = `[REFUND] ${serviceName} - Cancelled: ${reason || 'No reason provided'}${refundNotes ? '. ' + refundNotes : ''}`;

      refundTransaction = await Transaction.create({
        tenantId: isSuperAdmin ? activeService.tenantId : tenantId,
        transactionNumber: refundTransactionNumber,
        transactionType: 'gym',
        customerId: activeService.memberId,
        customerType: 'member',
        subtotal: -parsedRefundAmount,
        tax: 0,
        totalAmount: -parsedRefundAmount,
        paidAmount: -parsedRefundAmount,
        changeAmount: 0,
        currency: currencyConfig.defaultCurrency || 'IDR',
        status: 'refunded',
        notes: refundNote,
        createdBy: req.user.id,
        metadata: {
          type: 'service_cancellation_refund',
          originalTransactionId: activeService.purchaseTransactionId,
          cancelledActiveServiceId: id,
          servicePlanId: activeService.servicePlanId,
          serviceName
        }
      }, { transaction: t });

      // Create TransactionItem for refund
      await TransactionItem.create({
        transactionId: refundTransaction.id,
        itemType: 'service_plan',
        itemId: activeService.servicePlanId,
        itemName: `[REFUND] ${serviceName}`,
        quantity: 1,
        unitPrice: -parsedRefundAmount,
        subtotal: -parsedRefundAmount,
        total: -parsedRefundAmount,
        notes: refundNote
      }, { transaction: t });

      // Create TransactionPayment for refund
      await TransactionPayment.create({
        transactionId: refundTransaction.id,
        paymentMethod: normalizePaymentMethod(refundPaymentMethod),
        amount: -parsedRefundAmount,
        currency: currencyConfig.defaultCurrency || 'IDR',
        status: 'refunded',
        paidAt: new Date(),
        notes: refundNote
      }, { transaction: t });

      // Also update the status of the corresponding TransactionItem on the original transaction
      const cancelNote = `[CANCELLED: ${(reason || 'No reason provided').replace(/'/g, "''")}]`;
      await TransactionItem.update(
        {
          status: 'cancelled',
          notes: sequelize.literal(`COALESCE(notes, '') || ' ${cancelNote}'`)
        },
        {
          where: {
            transactionId: activeService.purchaseTransactionId,
            itemId: activeService.servicePlanId,
            itemType: 'service_plan'
          },
          transaction: t
        }
      );
    }

    await t.commit();

    logger.logInfo('Active service cancelled', {
      action: 'ACTIVE_SERVICE_CANCELLED',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      activeServiceId: id,
      reason,
      refundAmount: parsedRefundAmount,
      refundTransactionId: refundTransaction?.id,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      message: `Active service cancelled successfully${parsedRefundAmount ? ` with refund of ${parsedRefundAmount}` : ''}`,
      data: {
        activeService,
        refund: refundTransaction ? {
          transactionId: refundTransaction.id,
          transactionNumber: refundTransaction.transactionNumber,
          refundAmount: parsedRefundAmount,
          paymentMethod: refundPaymentMethod,
          status: 'refunded'
        } : null
      }
    });
  } catch (err) {
    if (t && !t.finished) {
      await t.rollback();
    }
    logger.logSecurity('Error cancelling active service', {
      action: 'CANCELLING_ACTIVE_SERVICE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      activeServiceId: req.params.id
    });
    return next(err);
  }
}

/**
 * Assign or update trainer for an active service
 */
async function assignTrainer(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { trainerId } = req.body;

    if (!trainerId) {
      return next(createError('VALIDATION_ERROR', 'trainerId is required', 400));
    }

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const activeService = await ActiveService.findOne({ where });

    if (!activeService) {
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Active service not found', 404));
    }

    // Verify trainer
    const trainer = await Trainer.findOne({
      where: {
        id: trainerId,
        tenantId: activeService.tenantId
      }
    });

    if (!trainer) {
      return next(createError('TRAINER_NOT_FOUND', 'Trainer not found', 404));
    }

    // Get previous trainer ID to handle commission update
    const previousTrainerId = activeService.assignedTrainerId;

    activeService.assignedTrainerId = trainerId;
    await activeService.save();

    // Handle trainer commission
    // If there's a purchase transaction, create/update commission
    if (activeService.purchaseTransactionId) {
      // If trainer is being changed (not first assignment)
      if (previousTrainerId && previousTrainerId !== trainerId) {
        // Cancel previous trainer's commission
        const previousCommission = await TrainerCommission.findOne({
          where: {
            trainerId: previousTrainerId,
            transactionId: activeService.purchaseTransactionId,
            status: 'pending'
          }
        });

        if (previousCommission) {
          await previousCommission.update({
            status: 'cancelled',
            notes: (previousCommission.notes || '') + ' | Cancelled due to trainer reassignment'
          });
        }
      }

      // Create commission for new trainer (if they have commission configured)
      if (trainer.commissionValue > 0) {
        // Check if commission already exists for this trainer and transaction
        const existingCommission = await TrainerCommission.findOne({
          where: {
            trainerId: trainer.id,
            transactionId: activeService.purchaseTransactionId,
            status: { [Op.ne]: 'cancelled' }
          }
        });

        if (!existingCommission) {
          await TrainerCommission.create({
            tenantId: activeService.tenantId,
            trainerId: trainer.id,
            transactionId: activeService.purchaseTransactionId,
            classId: null,
            baseAmount: activeService.pricePaid || 0,
            commissionType: trainer.commissionType,
            commissionRate: trainer.commissionValue,
            status: 'pending',
            notes: `Commission for ${activeService.serviceType} service - Trainer assigned to Service Plan ID: ${activeService.servicePlanId}`
          });
        }
      }
    }

    logger.logInfo('Trainer assigned to active service', {
      action: 'TRAINER_ASSIGNED_TO_ACTIVE_SERVICE',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      activeServiceId: id,
      trainerId,
      previousTrainerId,
      commissionCreated: trainer.commissionValue > 0,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    await activeService.reload({
      include: [{ model: Trainer, as: 'assignedTrainer' }]
    });

    return res.json({
      message: 'Trainer assigned successfully',
      data: activeService
    });
  } catch (err) {
    logger.logSecurity('Error assigning trainer', {
      action: 'ASSIGNING_TRAINER',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      activeServiceId: req.params.id
    });
    return next(err);
  }
}

module.exports = {
  getWalkInActiveServices,
  getMemberActiveServices,
  getActiveServiceById,
  purchaseServices, // Unified purchase function (single/bulk)
  useSession,
  cancelActiveService,
  assignTrainer
};
