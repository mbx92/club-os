const { 
  ActiveService, 
  ServicePlan, 
  Member, 
  Trainer,
  TrainerCommission,
  Transaction,
  sequelize 
} = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get all active services across all members with interactive info
 * Displays remaining sessions, expiry dates, and filters
 * @route GET /service/management/list
 */
async function getAllActiveServices(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      serviceType = 'all',
      status = 'all',
      trainerId = null,
      expiringInDays = null, // Alert: services expiring in X days
      lowSessionsThreshold = null, // Alert: services with remaining sessions below threshold
      sortBy = 'endDate',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Filter by service type
    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }

    // Filter by status
    if (status !== 'all') {
      if (status === 'active') {
        // Show only non-expired records: either status='active' or records incorrectly
        // auto-marked 'expired' due to DATEONLY/UTC timezone issue but still within date range.
        // endDate >= CURRENT_DATE ensures truly past entries are excluded at DB level
        // so pagination count stays correct.
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ endDate: { [Op.gte]: sequelize.literal('CURRENT_DATE') } });
        where[Op.and].push({ status: { [Op.in]: ['active', 'expired'] } });
      } else {
        where.status = status;
      }
    }

    // Filter by trainer
    if (trainerId) {
      where.assignedTrainerId = trainerId;
    }

    // Alert: Services expiring soon
    if (expiringInDays) {
      const daysAhead = parseInt(expiringInDays);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      where.endDate = {
        [Op.between]: [new Date(), futureDate]
      };
      where.status = 'active'; // Only active services
    }

    // Alert: Services with low remaining sessions
    if (lowSessionsThreshold) {
      const threshold = parseInt(lowSessionsThreshold);
      where.remainingSessions = {
        [Op.lte]: threshold,
        [Op.gt]: 0
      };
      where.status = 'active';
    }

    // Search by member name / email, or by customerName (day pass walk-in)
    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(sequelize.literal(
        `("ActiveService"."customerName" ILIKE '%${escapedSearch}%' ` +
        `OR EXISTS (SELECT 1 FROM "Members" m WHERE m.id = "ActiveService"."memberId" ` +
        `AND (m."firstName" ILIKE '%${escapedSearch}%' OR m."lastName" ILIKE '%${escapedSearch}%' OR m."email" ILIKE '%${escapedSearch}%')))`
      ));
    }

    const include = [
      {
        model: Member,
        as: 'member',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'deletedAt', 'isActive'],
        paranoid: false, // Include soft-deleted members
        required: false  // LEFT JOIN — day passes without a member must still appear
      },
      {
        model: ServicePlan,
        as: 'servicePlan',
        attributes: ['id', 'name', 'serviceType', 'durationType', 'price', 'sessions']
      },
      {
        model: Trainer,
        as: 'assignedTrainer',
        attributes: ['id', 'firstName', 'lastName', 'specializations'],
        required: false
      },
      {
        model: Transaction,
        as: 'purchaseTransaction',
        attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt']
      }
    ];

    // Get total count
    const totalCount = await ActiveService.count({ 
      where,
      distinct: true
    });

    // Get paginated results
    const activeServices = await ActiveService.findAll({
      where,
      include,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    // Add computed fields for interactive display
    const enrichedServices = activeServices.map(service => {
      const serviceData = service.toJSON();
      const now = new Date();
      // Use date-only comparison to avoid timezone issues with DATEONLY fields.
      // new Date('2026-03-04') = midnight UTC, which in WIB (UTC+7) means it reads
      // as expired after 7am on that day. Instead, compare date strings directly.
      const endDateStr = String(service.endDate); // 'YYYY-MM-DD'
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const endDateLocal = new Date(`${endDateStr}T00:00:00`); // parse as local midnight
      const todayLocal = new Date(`${todayStr}T00:00:00`);
      const daysUntilExpiry = Math.ceil((endDateLocal - todayLocal) / (1000 * 60 * 60 * 24));

      // Calculate usage percentage
      let usagePercentage = 0;
      if (service.totalSessions && service.totalSessions > 0) {
        const usedSessions = service.totalSessions - (service.remainingSessions || 0);
        usagePercentage = ((usedSessions / service.totalSessions) * 100).toFixed(2);
      }

      // Resolve display name: prefer member's full name, fall back to customerName (day pass walk-in)
      const memberFullName = serviceData.member
        ? `${serviceData.member.firstName || ''} ${serviceData.member.lastName || ''}`.trim()
        : null;
      const displayName = memberFullName || serviceData.customerName || null;

      return {
        ...serviceData,
        displayName,
        memberName: displayName, // Alias: member full name or customerName for walk-ins
        // Interactive info
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry >= 0,
        isExpired: daysUntilExpiry < 0,
        usagePercentage,
        isLowSessions: service.remainingSessions && service.remainingSessions <= 3,
        // Alerts
        alerts: {
          expiryWarning: daysUntilExpiry === 0 ?
            `Layanan berakhir hari ini` :
            daysUntilExpiry <= 7 && daysUntilExpiry > 0 ?
            `Layanan akan berakhir dalam ${daysUntilExpiry} hari` : null,
          lowSessionsWarning: service.remainingSessions && service.remainingSessions <= 3 && service.remainingSessions > 0 ?
            `Hanya tersisa ${service.remainingSessions} sesi` : null,
          expiredMessage: daysUntilExpiry < 0 ? 
            `Layanan sudah berakhir ${Math.abs(daysUntilExpiry)} hari yang lalu` : null
        }
      };
    });

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalItems: totalCount,
      itemsPerPage: parseInt(limit)
    };

    logger.logInfo('Service management list retrieved', {
      action: 'GET_ALL_ACTIVE_SERVICES',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: enrichedServices.length,
      filters: { serviceType, status, trainerId, expiringInDays, lowSessionsThreshold },
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({ 
      data: enrichedServices,
      pagination
    });
  } catch (err) {
    logger.logSecurity('Error retrieving service management list', {
      action: 'GET_ALL_ACTIVE_SERVICES_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    next(err);
  }
}

/**
 * Get services calendar view for a specific month
 * Useful for frontend calendar display
 * @route GET /service/management/calendar
 */
async function getServicesCalendar(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      year, 
      month, 
      serviceType = 'all',
      memberId = null
    } = req.query;

    // Validate year and month
    if (!year || !month) {
      return next(createError('VALIDATION_ERROR', 'Year and month are required', 400));
    }

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Calculate start and end of month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const where = {
      [Op.or]: [
        // Services starting this month
        {
          startDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        // Services ending this month
        {
          endDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        // Services active throughout the month
        {
          startDate: { [Op.lte]: startDate },
          endDate: { [Op.gte]: endDate }
        }
      ]
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    const services = await ActiveService.findAll({
      where,
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'phone'],
          required: true
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'durationType']
        },
        {
          model: Trainer,
          as: 'assignedTrainer',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['startDate', 'ASC']]
    });

    // Group by dates for calendar display
    const calendarEvents = [];
    services.forEach(service => {
      if (!service.member || !service.servicePlan) return;
      const memberName = `${service.member.firstName} ${service.member.lastName}`;
      const trainerName = service.assignedTrainer
        ? `${service.assignedTrainer.firstName} ${service.assignedTrainer.lastName}`
        : null;
      const serviceStart = new Date(service.startDate);
      const serviceEnd = new Date(service.endDate);

      // Add start date event
      if (serviceStart >= startDate && serviceStart <= endDate) {
        calendarEvents.push({
          date: serviceStart.toISOString().split('T')[0],
          type: 'start',
          eventType: 'service_start',
          title: `${memberName} - ${service.servicePlan.name}`,
          serviceId: service.id,
          memberId: service.memberId,
          memberName,
          serviceName: service.servicePlan.name,
          serviceType: service.serviceType,
          status: service.status,
          remainingSessions: service.remainingSessions,
          trainerName
        });
      }

      // Add end date event
      if (serviceEnd >= startDate && serviceEnd <= endDate) {
        calendarEvents.push({
          date: serviceEnd.toISOString().split('T')[0],
          type: 'end',
          eventType: 'service_end',
          title: `[Berakhir] ${memberName} - ${service.servicePlan.name}`,
          serviceId: service.id,
          memberId: service.memberId,
          memberName,
          serviceName: service.servicePlan.name,
          serviceType: service.serviceType,
          status: service.status,
          remainingSessions: service.remainingSessions,
          trainerName
        });
      }
    });

    // Sort by date
    calendarEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    logger.logInfo('Service calendar retrieved', {
      action: 'GET_SERVICES_CALENDAR',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      year: targetYear,
      month: targetMonth,
      eventsCount: calendarEvents.length,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({ 
      data: {
        year: targetYear,
        month: targetMonth,
        events: calendarEvents,
        summary: {
          totalServices: services.length,
          activeServices: services.filter(s => s.status === 'active').length,
          expiringThisMonth: services.filter(s => {
            const end = new Date(s.endDate);
            return end >= startDate && end <= endDate;
          }).length
        }
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving service calendar', {
      action: 'GET_SERVICES_CALENDAR_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    next(err);
  }
}

/**
 * Assign or reassign trainer to an active service
 * @route POST /service/management/:serviceId/assign-trainer
 */
async function assignTrainerToService(req, res, next) {
  const t = await sequelize.transaction();
  
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { serviceId } = req.params;
    const { trainerId } = req.body;

    // Validate trainer
    const trainerWhere = { id: trainerId };
    if (!isSuperAdmin) {
      trainerWhere.tenantId = tenantId;
    }

    const trainer = await Trainer.findOne({ where: trainerWhere });
    if (!trainer) {
      await t.rollback();
      return next(createError('TRAINER_NOT_FOUND', 'Trainer tidak ditemukan', 404));
    }

    // Find active service
    const serviceWhere = { id: serviceId };
    if (!isSuperAdmin) {
      serviceWhere.tenantId = tenantId;
    }

    const activeService = await ActiveService.findOne({ 
      where: serviceWhere,
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['firstName', 'lastName'],
          paranoid: false
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['name', 'serviceType']
        }
      ],
      transaction: t 
    });

    if (!activeService) {
      await t.rollback();
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Layanan aktif tidak ditemukan', 404));
    }

    // Update trainer assignment
    const previousTrainerId = activeService.assignedTrainerId;
    activeService.assignedTrainerId = trainerId;
    await activeService.save({ transaction: t });

    // Handle commission: cancel old trainer's commission, create for new trainer
    let commissionCreated = false;
    if (activeService.purchaseTransactionId) {
      // Cancel previous trainer's pending commission if trainer is being changed
      if (previousTrainerId && previousTrainerId !== trainerId) {
        const previousCommission = await TrainerCommission.findOne({
          where: {
            trainerId: previousTrainerId,
            transactionId: activeService.purchaseTransactionId,
            status: 'pending'
          },
          transaction: t
        });
        if (previousCommission) {
          await previousCommission.update({
            status: 'cancelled',
            notes: (previousCommission.notes || '') + ' | Cancelled due to trainer reassignment'
          }, { transaction: t });
        }
      }

      // Create commission for the new trainer (only if they have commission configured)
      if (trainer.commissionValue > 0) {
        const existingCommission = await TrainerCommission.findOne({
          where: {
            trainerId: trainer.id,
            transactionId: activeService.purchaseTransactionId,
            status: { [Op.ne]: 'cancelled' }
          },
          transaction: t
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
            notes: `Commission for ${activeService.servicePlan?.serviceType || 'service'} - Assigned via service management`
          }, { transaction: t });
          commissionCreated = true;
        }
      }
    }

    await t.commit();

    logger.logInfo('Trainer assigned to service', {
      action: 'ASSIGN_TRAINER_TO_SERVICE',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      serviceId,
      trainerId,
      previousTrainerId,
      commissionCreated,
      memberId: activeService.memberId,
      serviceName: activeService.servicePlan.name,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      message: 'Trainer berhasil ditugaskan ke layanan',
      data: {
        serviceId: activeService.id,
        trainerId: trainer.id,
        trainerName: `${trainer.firstName} ${trainer.lastName}`,
        memberName: activeService.member
          ? `${activeService.member.firstName} ${activeService.member.lastName}`
          : null,
        serviceName: activeService.servicePlan.name,
        commissionCreated
      }
    });
  } catch (err) {
    if (!t.finished) {
      await t.rollback();
    }
    logger.logSecurity('Error assigning trainer to service', {
      action: 'ASSIGN_TRAINER_TO_SERVICE_ERROR',
      error: err.message,
      stack: err.stack,
      serviceId: req.params.serviceId,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    next(err);
  }
}

/**
 * Get services with expiration alerts
 * @route GET /service/management/alerts
 */
async function getServiceAlerts(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { daysThreshold = 7, lowSessionsThreshold = 3 } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    where.status = 'active'; // Only active services

    const daysAhead = parseInt(daysThreshold);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Services expiring soon
    const expiringServices = await ActiveService.findAll({
      where: {
        ...where,
        endDate: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ],
      order: [['endDate', 'ASC']]
    });

    // Services with low sessions
    const lowSessionServices = await ActiveService.findAll({
      where: {
        ...where,
        remainingSessions: {
          [Op.lte]: parseInt(lowSessionsThreshold),
          [Op.gt]: 0
        }
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ],
      order: [['remainingSessions', 'ASC']]
    });

    const alerts = {
      expiring: expiringServices.map(service => {
        const daysUntilExpiry = Math.ceil((new Date(service.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return {
          type: 'expiring',
          severity: daysUntilExpiry <= 3 ? 'high' : 'medium',
          serviceId: service.id,
          memberId: service.memberId,
          memberName: service.member ? `${service.member.firstName} ${service.member.lastName}` : (service.customerName || 'Unknown Member'),
          memberPhone: service.member ? service.member.phone : null,
          serviceName: service.servicePlan ? service.servicePlan.name : 'Unknown Service',
          serviceType: service.serviceType,
          endDate: service.endDate,
          daysUntilExpiry,
          message: `Layanan akan berakhir dalam ${daysUntilExpiry} hari`
        };
      }),
      lowSessions: lowSessionServices.map(service => ({
        type: 'low_sessions',
        severity: service.remainingSessions === 1 ? 'high' : 'medium',
        serviceId: service.id,
        memberId: service.memberId,
        memberName: service.member ? `${service.member.firstName} ${service.member.lastName}` : (service.customerName || 'Unknown Member'),
        memberPhone: service.member ? service.member.phone : null,
        serviceName: service.servicePlan ? service.servicePlan.name : 'Unknown Service',
        serviceType: service.serviceType,
        remainingSessions: service.remainingSessions,
        totalSessions: service.totalSessions,
        message: `Hanya tersisa ${service.remainingSessions} sesi`
      }))
    };

    logger.logInfo('Service alerts retrieved', {
      action: 'GET_SERVICE_ALERTS',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      expiringCount: alerts.expiring.length,
      lowSessionsCount: alerts.lowSessions.length,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      data: alerts,
      summary: {
        totalAlerts: alerts.expiring.length + alerts.lowSessions.length,
        expiringServices: alerts.expiring.length,
        lowSessionServices: alerts.lowSessions.length,
        highSeverity: [...alerts.expiring, ...alerts.lowSessions].filter(a => a.severity === 'high').length
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving service alerts', {
      action: 'GET_SERVICE_ALERTS_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    next(err);
  }
}

/**
 * Get service statistics for dashboard
 * @route GET /service/management/stats
 */
async function getServiceStatistics(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = {};
    
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Count by status
    const statusCounts = await ActiveService.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['status'],
      raw: true
    });

    // Count by service type
    const serviceTypeCounts = await ActiveService.findAll({
      attributes: [
        'serviceType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['serviceType'],
      raw: true
    });

    // Services expiring in next 7 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const expiringCount = await ActiveService.count({
      where: {
        ...where,
        status: 'active',
        endDate: {
          [Op.between]: [new Date(), futureDate]
        }
      }
    });

    // Services with low sessions (<=3)
    const lowSessionsCount = await ActiveService.count({
      where: {
        ...where,
        status: 'active',
        remainingSessions: {
          [Op.lte]: 3,
          [Op.gt]: 0
        }
      }
    });

    logger.logInfo('Service statistics retrieved', {
      action: 'GET_SERVICE_STATISTICS',
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId: req.user.tenantId,
      userId: req.user.id
    });

    return res.json({
      data: {
        byStatus: statusCounts,
        byServiceType: serviceTypeCounts,
        alerts: {
          expiring: expiringCount,
          lowSessions: lowSessionsCount
        }
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving service statistics', {
      action: 'GET_SERVICE_STATISTICS_ERROR',
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
    next(err);
  }
}

/**
 * Get all active services for a specific member
 * @route GET /service/management/member/:memberId
 */
async function getServicesByMemberId(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { memberId } = req.params;
    const { 
      status = 'all',
      serviceType = 'all',
      includeExpired = false
    } = req.query;

    // Check if member exists (include soft-deleted for service history)
    const memberWhere = { id: memberId };
    if (!isSuperAdmin) {
      memberWhere.tenantId = tenantId;
    }

    const member = await Member.findOne({
      where: memberWhere,
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'membershipStatus', 'deletedAt', 'isActive'],
      paranoid: false // Include soft-deleted members
    });

    if (!member) {
      return next(createError('MEMBER_NOT_FOUND', 'Member not found', 404));
    }

    // Build where clause for active services
    const where = { memberId };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Filter by status
    if (status !== 'all') {
      where.status = status;
    } else if (!includeExpired) {
      // By default, exclude expired services unless explicitly requested
      where.status = {
        [Op.in]: ['active', 'suspended', 'depleted']
      };
    }

    // Filter by service type
    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }

    const services = await ActiveService.findAll({
      where,
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType', 'durationType', 'price', 'sessions', 'validityDays']
        },
        {
          model: Trainer,
          as: 'assignedTrainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'specializations'],
          required: false
        },
        {
          model: Transaction,
          as: 'purchaseTransaction',
          attributes: ['id', 'transactionNumber', 'totalAmount', 'createdAt'],
          required: false
        }
      ],
      order: [
        ['status', 'ASC'], // active first
        ['endDate', 'ASC']  // expiring soon first
      ]
    });

    // Calculate additional info for each service
    const servicesWithInfo = services.map(service => {
      const serviceData = service.toJSON();
      const now = new Date();
      const endDate = new Date(service.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      return {
        ...serviceData,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
        hasLowSessions: service.remainingSessions <= 3 && service.remainingSessions > 0,
        usagePercentage: service.totalSessions 
          ? ((service.totalSessions - service.remainingSessions) / service.totalSessions * 100).toFixed(2)
          : null,
        pricePerSession: service.totalSessions 
          ? (service.pricePaid / service.totalSessions).toFixed(2)
          : null
      };
    });

    // Summary statistics
    const summary = {
      totalServices: services.length,
      activeCount: services.filter(s => s.status === 'active').length,
      expiredCount: services.filter(s => s.status === 'expired').length,
      depletedCount: services.filter(s => s.status === 'depleted').length,
      suspendedCount: services.filter(s => s.status === 'suspended').length,
      totalRemainingSessions: services
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.remainingSessions || 0), 0)
    };

    logger.logInfo('Member services retrieved', {
      action: 'GET_SERVICES_BY_MEMBER',
      memberId,
      count: services.length,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({
      data: {
        member: {
          id: member.id,
          fullName: `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone,
          membershipStatus: member.membershipStatus
        },
        services: servicesWithInfo,
        summary
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving services by member', {
      action: 'GET_SERVICES_BY_MEMBER_ERROR',
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
    next(err);
  }
}

module.exports = {
  getAllActiveServices,
  getServicesCalendar,
  assignTrainerToService,
  getServiceAlerts,
  getServiceStatistics,
  getServicesByMemberId
};
