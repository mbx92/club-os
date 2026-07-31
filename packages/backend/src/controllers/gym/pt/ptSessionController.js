'use strict';

const { PTSession, ActiveService, Trainer, Member, CheckIn, ServicePlan, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { createError } = require('../../../utils/errorCodes');
const { getTenantTimezone } = require('../../../utils/tenantTimezone');
const { mergeDateRangeInto } = require('../../../utils/dateRange');

// -----------------------------------------------------------------
// Shared include builder
// -----------------------------------------------------------------
function buildIncludes(full = false) {
  const includes = [
    {
      model: Trainer,
      as: 'trainer',
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
    },
    {
      model: Member,
      as: 'member',
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
    },
    {
      model: ActiveService,
      as: 'activeService',
      attributes: ['id', 'status', 'remainingSessions', 'totalSessions'],
      include: [
        {
          model: ServicePlan,
          as: 'servicePlan',
          attributes: ['id', 'name', 'serviceType']
        }
      ]
    }
  ];

  if (full) {
    includes.push({
      model: CheckIn,
      as: 'checkIn',
      attributes: ['id', 'checkInTime', 'checkOutTime'],
      required: false
    });
  }

  return includes;
}

// -----------------------------------------------------------------
// GET /gym/pt-sessions
// -----------------------------------------------------------------
async function getAllPTSessions(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      trainerId,
      memberId,
      activeServiceId,
      status,
      startDate,
      endDate,
      sortBy = 'sessionDate',
      sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (!isSuperAdmin) where.tenantId = tenantId;
    if (trainerId)     where.trainerId = trainerId;
    if (memberId)      where.memberId = memberId;
    if (activeServiceId) where.activeServiceId = activeServiceId;
    if (status)        where.status = status;

    if (startDate || endDate) {
      where.sessionDate = {};
      mergeDateRangeInto(where, 'sessionDate', startDate, endDate, Op, getTenantTimezone(req));
    }

    const validSort = ['sessionDate', 'status', 'createdAt', 'durationMinutes'];
    const orderCol = validSort.includes(sortBy) ? sortBy : 'sessionDate';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await PTSession.findAndCountAll({
      where,
      include: buildIncludes(false),
      order: [[orderCol, orderDir]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    return res.json({
      success: true,
      data: {
        sessions: rows,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// -----------------------------------------------------------------
// GET /gym/pt-sessions/:id
// -----------------------------------------------------------------
async function getPTSessionById(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = { id: req.params.id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const session = await PTSession.findOne({ where, include: buildIncludes(true) });
    if (!session) return next(createError('PT_SESSION_NOT_FOUND', 'PT session not found', 404));

    return res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

// -----------------------------------------------------------------
// POST /gym/pt-sessions
// -----------------------------------------------------------------
async function createPTSession(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { activeServiceId, trainerId, memberId, sessionDate, durationMinutes = 60, notes, exerciseLog } = req.body;

    if (!activeServiceId || !trainerId || !memberId || !sessionDate) {
      await t.rollback();
      return next(createError('VALIDATION_ERROR', 'activeServiceId, trainerId, memberId, and sessionDate are required', 400));
    }

    // Verify active service belongs to tenant and member
    const activeServiceWhere = { id: activeServiceId, memberId };
    if (!isSuperAdmin) activeServiceWhere.tenantId = tenantId;

    const activeService = await ActiveService.findOne({ where: activeServiceWhere, transaction: t });
    if (!activeService) {
      await t.rollback();
      return next(createError('ACTIVE_SERVICE_NOT_FOUND', 'Active service not found or does not belong to this member', 404));
    }

    if (activeService.status !== 'active') {
      await t.rollback();
      return next(createError('SERVICE_INACTIVE', `Active service status is '${activeService.status}'. Only active services can have PT sessions scheduled.`, 400));
    }

    // Verify trainer belongs to tenant
    const trainerWhere = { id: trainerId };
    if (!isSuperAdmin) trainerWhere.tenantId = tenantId;
    const trainer = await Trainer.findOne({ where: trainerWhere, transaction: t });
    if (!trainer) {
      await t.rollback();
      return next(createError('TRAINER_NOT_FOUND', 'Trainer not found', 404));
    }

    const session = await PTSession.create({
      tenantId: isSuperAdmin ? activeService.tenantId : tenantId,
      activeServiceId,
      trainerId,
      memberId,
      sessionDate: new Date(sessionDate),
      durationMinutes,
      status: 'scheduled',
      sessionUsed: false,
      notes,
      exerciseLog: exerciseLog || null,
      createdBy: req.user.id
    }, { transaction: t });

    await t.commit();

    const reloaded = await session.reload({ include: buildIncludes(false) });

    logger.logInfo('PT session created', {
      action: 'PT_SESSION_CREATED',
      sessionId: session.id,
      activeServiceId,
      trainerId,
      memberId,
      userId: req.user.id,
      tenantId: session.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.status(201).json({ success: true, message: 'PT session created successfully', data: reloaded });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    next(err);
  }
}

// -----------------------------------------------------------------
// PUT /gym/pt-sessions/:id
// -----------------------------------------------------------------
async function updatePTSession(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = { id: req.params.id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const session = await PTSession.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
    if (!session) {
      await t.rollback();
      return next(createError('PT_SESSION_NOT_FOUND', 'PT session not found', 404));
    }

    if (session.status === 'cancelled') {
      await t.rollback();
      return next(createError('SESSION_CANCELLED', 'Cannot update a cancelled session', 400));
    }

    const { sessionDate, durationMinutes, notes, exerciseLog, status, cancelReason } = req.body;

    // Handle status transition to completed — optionally deduct a session
    if (status === 'completed' && session.status !== 'completed') {
      const { deductSession = true } = req.body;
      if (deductSession && !session.sessionUsed) {
        const activeService = await ActiveService.findByPk(session.activeServiceId, { transaction: t, lock: t.LOCK.UPDATE });
        if (activeService && activeService.remainingSessions > 0) {
          await activeService.useSession(t);
          session.sessionUsed = true;
        }
      }
    }

    // Handle cancellation
    if (status === 'cancelled' && session.status !== 'cancelled') {
      session.cancelledAt = new Date();
      session.cancelReason = cancelReason || null;
      // Refund session if it was already used
      if (session.sessionUsed) {
        const activeService = await ActiveService.findByPk(session.activeServiceId, { transaction: t, lock: t.LOCK.UPDATE });
        if (activeService) {
          await activeService.refundSession(t);
          session.sessionUsed = false;
        }
      }
    }

    if (sessionDate !== undefined) session.sessionDate = new Date(sessionDate);
    if (durationMinutes !== undefined) session.durationMinutes = durationMinutes;
    if (notes !== undefined) session.notes = notes;
    if (exerciseLog !== undefined) session.exerciseLog = exerciseLog;
    if (status !== undefined) session.status = status;

    await session.save({ transaction: t });
    await t.commit();

    const reloaded = await session.reload({ include: buildIncludes(true) });

    logger.logInfo('PT session updated', {
      action: 'PT_SESSION_UPDATED',
      sessionId: session.id,
      newStatus: session.status,
      userId: req.user.id,
      tenantId: session.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({ success: true, message: 'PT session updated successfully', data: reloaded });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    next(err);
  }
}

// -----------------------------------------------------------------
// DELETE /gym/pt-sessions/:id
// -----------------------------------------------------------------
async function deletePTSession(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const where = { id: req.params.id };
    if (!isSuperAdmin) where.tenantId = tenantId;

    const session = await PTSession.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
    if (!session) {
      await t.rollback();
      return next(createError('PT_SESSION_NOT_FOUND', 'PT session not found', 404));
    }

    // If session was used, refund the session back to active service
    if (session.sessionUsed) {
      const activeService = await ActiveService.findByPk(session.activeServiceId, { transaction: t, lock: t.LOCK.UPDATE });
      if (activeService) {
        await activeService.refundSession(t);
      }
    }

    await session.destroy({ transaction: t });
    await t.commit();

    logger.logInfo('PT session deleted', {
      action: 'PT_SESSION_DELETED',
      sessionId: req.params.id,
      userId: req.user.id,
      tenantId: isSuperAdmin ? session.tenantId : tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.json({ success: true, message: 'PT session deleted successfully' });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    next(err);
  }
}

module.exports = {
  getAllPTSessions,
  getPTSessionById,
  createPTSession,
  updatePTSession,
  deletePTSession
};
