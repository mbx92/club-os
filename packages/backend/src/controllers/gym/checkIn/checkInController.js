const { CheckIn, Member, ActiveService, ServicePlan, Trainer, sequelize, User } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { withRetry } = require('../../../utils/concurrency');

/**
 * Create check-in
 * Validates member's active service and auto-uses session if applicable
 */
async function createCheckIn(req, res, next) {
  const t = await sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { memberId, serviceType, notes } = req.body;

    // Validate member
    const memberWhere = { id: memberId };
    if (!isSuperAdmin) {
      memberWhere.tenantId = tenantId;
    }

    const member = await Member.findOne({ 
      where: memberWhere,
      transaction: t 
    });

    if (!member) {
      await t.rollback();
      return next(createError('MEMBER_NOT_FOUND', 'Member not found', 404));
    }

    // Check member status
    if (!member.isActive) {
      await t.rollback();
      return next(createError('MEMBER_INACTIVE', 'Member is not active', 400));
    }

    // Find active service for check-in
    let activeService = null;
    let sessionUsed = false;

    if (serviceType) {
      // Specific service type check-in (class_package, pt_package, etc.)
      const serviceWhere = {
        memberId,
        serviceType,
        status: 'active',
        endDate: { [Op.gte]: new Date() }
      };

      if (!isSuperAdmin) {
        serviceWhere.tenantId = tenantId;
      }

      // For session-based services, ensure sessions remaining
      if (['class_package', 'pt_package', 'spa_package', 'custom'].includes(serviceType)) {
        serviceWhere.remainingSessions = { [Op.gt]: 0 };
      }

      activeService = await ActiveService.findOne({
        where: serviceWhere,
        include: [
          { model: ServicePlan, as: 'servicePlan' },
          { model: Trainer, as: 'assignedTrainer' }
        ],
        transaction: t
        // Note: lock: t.LOCK.UPDATE removed - cannot use FOR UPDATE with nullable associations (LEFT OUTER JOIN)
        // The transaction provides sufficient isolation for this operation
      });

      if (!activeService) {
        await t.rollback();
        return next(createError(
          'NO_VALID_SERVICE',
          `No valid ${serviceType} service found. Please purchase a service plan.`,
          400
        ));
      }

      // Validate max check-ins limit from service plan (for specific service types)
      const servicePlan = activeService.servicePlan;
      if (servicePlan && servicePlan.accessControl && servicePlan.accessControl.maxCheckIns) {
        const maxCheckIns = parseInt(servicePlan.accessControl.maxCheckIns);
        
        if (maxCheckIns > 0) {
          // Count check-ins for this service within validity period
          const serviceStartDate = new Date(activeService.startDate);
          const serviceEndDate = new Date(activeService.endDate);
          
          const checkInCount = await CheckIn.count({
            where: {
              activeServiceId: activeService.id,
              checkInTime: {
                [Op.between]: [serviceStartDate, serviceEndDate]
              }
            },
            transaction: t
          });

          if (checkInCount >= maxCheckIns) {
            await t.rollback();
            return next(createError(
              'MAX_CHECKINS_REACHED',
              `Maximum check-ins limit reached (${maxCheckIns} check-ins for ${serviceType}). Please upgrade your service plan.`,
              400
            ));
          }
        }
      }

      // Use session for session-based services
      if (activeService.totalSessions && activeService.remainingSessions > 0) {
        await withRetry(async () => {
          await activeService.useSession(t);
        });
        sessionUsed = true;
      }
    } else {
      // General check-in - find any active membership
      const serviceWhere = {
        memberId,
        serviceType: 'membership',
        status: 'active',
        endDate: { [Op.gte]: new Date() }
      };

      if (!isSuperAdmin) {
        serviceWhere.tenantId = tenantId;
      }

      activeService = await ActiveService.findOne({
        where: serviceWhere,
        include: [{ model: ServicePlan, as: 'servicePlan' }],
        transaction: t
      });

      if (!activeService) {
        await t.rollback();
        return next(createError(
          'NO_ACTIVE_MEMBERSHIP',
          'No active membership found. Please purchase a membership.',
          400
        ));
      }
    }

    // Validate max check-ins limit from service plan
    const servicePlan = activeService.servicePlan;
    if (servicePlan && servicePlan.accessControl && servicePlan.accessControl.maxCheckIns) {
      const maxCheckIns = parseInt(servicePlan.accessControl.maxCheckIns);
      
      if (maxCheckIns > 0) {
        // Count check-ins for this service within validity period
        const serviceStartDate = new Date(activeService.startDate);
        const serviceEndDate = new Date(activeService.endDate);
        
        const checkInCount = await CheckIn.count({
          where: {
            activeServiceId: activeService.id,
            checkInTime: {
              [Op.between]: [serviceStartDate, serviceEndDate]
            }
          },
          transaction: t
        });

        if (checkInCount >= maxCheckIns) {
          await t.rollback();
          return next(createError(
            'MAX_CHECKINS_REACHED',
            `Maximum check-ins limit reached (${maxCheckIns} check-ins). Please upgrade your service plan.`,
            400
          ));
        }
      }
    }

    // Create check-in record
    const checkIn = await CheckIn.create({
      tenantId: isSuperAdmin ? member.tenantId : tenantId,
      memberId,
      activeServiceId: activeService.id,
      checkInTime: new Date(),
      checkedInBy: userId,
      notes: notes || null
    }, { transaction: t });

    await t.commit();

    // Fetch complete check-in data
    const completeCheckIn = await CheckIn.findByPk(checkIn.id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'checkedBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    logger.logInfo('Check-in created', {
      action: 'CHECK_IN_CREATED',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      checkInId: checkIn.id,
      memberId,
      serviceType: activeService.serviceType,
      sessionUsed,
      remainingSessions: activeService.remainingSessions,
      tenantId: isSuperAdmin ? member.tenantId : tenantId,
      userId
    });

    return res.status(201).json({
      message: 'Check-in successful',
      data: {
        checkIn: completeCheckIn,
        activeService: {
          id: activeService.id,
          serviceType: activeService.serviceType,
          servicePlanName: activeService.servicePlan.name,
          remainingSessions: activeService.remainingSessions,
          totalSessions: activeService.totalSessions,
          endDate: activeService.endDate,
          status: activeService.status
        },
        sessionUsed
      }
    });
  } catch (err) {
    if (!t.finished) {
      await t.rollback();
    }
    logger.logSecurity('Error creating check-in', {
      action: 'CREATING_CHECK_IN',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      memberId: req.body?.memberId
    });
    return next(err);
  }
}

/**
 * Get all check-ins with filtering
 */
async function getCheckIns(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      memberId,
      serviceType,
      startDate,
      endDate,
      sortBy = 'checkInTime',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Filter by member
    if (memberId) {
      where.memberId = memberId;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.checkInTime[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const include = [
      {
        model: Member,
        as: 'member',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      },
      {
        model: User,
        as: 'checkedBy',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: ActiveService,
        as: 'activeService',
        attributes: ['id', 'serviceType'],
        required: false,
        ...(serviceType && { where: { serviceType }, required: true })
      }
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: checkIns } = await CheckIn.findAndCountAll({
      where,
      include,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    logger.logInfo('Check-ins retrieved', {
      action: 'GET_CHECK_INS',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: checkIns.length,
      filters: { memberId, serviceType, startDate, endDate },
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      data: checkIns,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: count,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: { memberId, serviceType, startDate, endDate, sortBy, sortOrder }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving check-ins', {
      action: 'RETRIEVING_CHECK_INS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack
    });
    return next(err);
  }
}

/**
 * Get check-in by ID
 */
async function getCheckInById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const checkIn = await CheckIn.findOne({
      where,
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'checkedBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!checkIn) {
      return next(createError('CHECK_IN_NOT_FOUND', 'Check-in record not found', 404));
    }

    logger.logInfo('Check-in retrieved', {
      action: 'GET_CHECK_IN',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      checkInId: id,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({ data: checkIn });
  } catch (err) {
    logger.logSecurity('Error retrieving check-in', {
      action: 'RETRIEVING_CHECK_IN',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      checkInId: req.params.id
    });
    return next(err);
  }
}

/**
 * Update check-in (add checkout time or notes)
 */
async function updateCheckIn(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { checkOutTime, notes } = req.body;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const checkIn = await CheckIn.findOne({ where });

    if (!checkIn) {
      return next(createError('CHECK_IN_NOT_FOUND', 'Check-in record not found', 404));
    }

    // Update fields
    if (checkOutTime !== undefined) {
      checkIn.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    }

    if (notes !== undefined) {
      checkIn.notes = notes;
    }

    await checkIn.save();

    logger.logInfo('Check-in updated', {
      action: 'UPDATE_CHECK_IN',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      checkInId: id,
      updates: { checkOutTime, notes },
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      message: 'Check-in updated successfully',
      data: checkIn
    });
  } catch (err) {
    logger.logSecurity('Error updating check-in', {
      action: 'UPDATING_CHECK_IN',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      checkInId: req.params.id
    });
    return next(err);
  }
}

/**
 * Delete check-in
 */
async function deleteCheckIn(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const checkIn = await CheckIn.findOne({ where });

    if (!checkIn) {
      return next(createError('CHECK_IN_NOT_FOUND', 'Check-in record not found', 404));
    }

    await checkIn.destroy();

    logger.logInfo('Check-in deleted', {
      action: 'DELETE_CHECK_IN',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      checkInId: id,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      message: 'Check-in deleted successfully'
    });
  } catch (err) {
    logger.logSecurity('Error deleting check-in', {
      action: 'DELETING_CHECK_IN',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      checkInId: req.params.id
    });
    return next(err);
  }
}

/**
 * Get check-in statistics
 */
async function getCheckInStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, memberId } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.checkInTime[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const totalCheckIns = await CheckIn.count({ where });

    // Today's check-ins
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: todayStart }
      }
    });

    // This week's check-ins
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: weekStart }
      }
    });

    // This month's check-ins
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthCheckIns = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: monthStart }
      }
    });

    // Unique members checked in today
    const uniqueMembersToday = await CheckIn.count({
      where: {
        ...where,
        checkInTime: { [Op.gte]: todayStart }
      },
      distinct: true,
      col: 'memberId'
    });

    logger.logInfo('Check-in statistics retrieved', {
      action: 'GET_CHECK_IN_STATS',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      data: {
        total: totalCheckIns,
        today: todayCheckIns,
        thisWeek: weekCheckIns,
        thisMonth: monthCheckIns,
        uniqueMembersToday,
        filters: { startDate, endDate, memberId }
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving check-in statistics', {
      action: 'RETRIEVING_CHECK_IN_STATS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack
    });
    return next(err);
  }
}

module.exports = {
  createCheckIn,
  getCheckIns,
  getCheckInById,
  updateCheckIn,
  deleteCheckIn,
  getCheckInStats
};
