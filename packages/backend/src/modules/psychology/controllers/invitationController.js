'use strict';

/**
 * Invitation Controller
 * 
 * Manages test invitations for self-registration flow
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const {
  PsychologyInvitation, PsychologyPackage, PsychologyOrder, User, Patient
} = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all invitations for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { isActive, search, page = 1, limit = 20 } = req.query;

    const where = { tenantId };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await PsychologyInvitation.findAndCountAll({
      where,
      include: [
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name', 'packageType']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: rows.map(inv => ({
        ...inv.toJSON(),
        isValid: inv.isValid(),
        remainingSlots: inv.getRemainingSlots()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

    logger.logInfo('Psychology invitations retrieved', {
      action: 'PSYCHOLOGY_INVITATION_LIST',
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
 * Get single invitation
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invitation = await PsychologyInvitation.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name', 'packageType', 'basePrice']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone']
        },
        {
          model: PsychologyOrder,
          as: 'orders',
          attributes: ['id', 'orderNumber', 'createdAt'],
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...invitation.toJSON(),
        isValid: invitation.isValid(),
        validationError: invitation.getValidationError(),
        remainingSlots: invitation.getRemainingSlots(),
        registrationUrl: `${process.env.PUBLIC_URL || ''}/register/${invitation.code}`
      }
    });

    logger.logInfo('Psychology invitation retrieved', {
      action: 'PSYCHOLOGY_INVITATION_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: id, code: invitation.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create invitation
 */
async function create(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      packageId,
      invitationType = 'open_registration',
      patientId,
      name,
      description,
      maxUses,
      expiresAt,
      testExpiryHours = 72,
      requireFields = ['fullName', 'email', 'phone'],
      customFields,
      welcomeMessage,
      successMessage
    } = req.body;

    // Validate package exists
    const pkg = await PsychologyPackage.findOne({
      where: { id: packageId, tenantId }
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    do {
      code = PsychologyInvitation.generateCode();
      const existing = await PsychologyInvitation.findOne({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const invitation = await PsychologyInvitation.create({
      tenantId,
      code,
      packageId,
      invitationType,
      patientId: patientId || null,
      name,
      description,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      testExpiryHours,
      requireFields,
      customFields,
      welcomeMessage,
      successMessage,
      createdBy: userId
    });

    // Reload with associations
    await invitation.reload({
      include: [
        { model: PsychologyPackage, as: 'package' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Invitation created',
      data: {
        ...invitation.toJSON(),
        registrationUrl: `${process.env.PUBLIC_URL || ''}/register/${invitation.code}`
      }
    });

    logger.logAudit('Psychology invitation created', {
      action: 'PSYCHOLOGY_INVITATION_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: invitation.id, code: invitation.code, packageId }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update invitation
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;
    const updateData = req.body;

    const invitation = await PsychologyInvitation.findOne({
      where: { id, tenantId }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Don't allow changing code or packageId if already used
    if (invitation.usedCount > 0) {
      delete updateData.code;
      delete updateData.packageId;
    }

    await invitation.update(updateData);

    res.json({
      success: true,
      message: 'Invitation updated',
      data: invitation
    });

    logger.logAudit('Psychology invitation updated', {
      action: 'PSYCHOLOGY_INVITATION_UPDATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: id, code: invitation.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle invitation active status
 */
async function toggleActive(req, res, next) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invitation = await PsychologyInvitation.findOne({
      where: { id, tenantId }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    invitation.isActive = !invitation.isActive;
    await invitation.save();

    res.json({
      success: true,
      message: `Invitation ${invitation.isActive ? 'activated' : 'deactivated'}`,
      data: { isActive: invitation.isActive }
    });

    logger.logAudit(`Psychology invitation ${invitation.isActive ? 'activated' : 'deactivated'}`, {
      action: invitation.isActive ? 'PSYCHOLOGY_INVITATION_ACTIVATE' : 'PSYCHOLOGY_INVITATION_DEACTIVATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: id, code: invitation.code, isActive: invitation.isActive }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete invitation
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invitation = await PsychologyInvitation.findOne({
      where: { id, tenantId }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Check if has registrations
    if (invitation.usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invitation with existing registrations. Deactivate instead.'
      });
    }

    await invitation.destroy();

    res.json({
      success: true,
      message: 'Invitation deleted'
    });

    logger.logAudit('Psychology invitation deleted', {
      action: 'PSYCHOLOGY_INVITATION_DELETE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: id, code: invitation.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get invitation statistics
 */
async function getStats(req, res, next) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invitation = await PsychologyInvitation.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PsychologyOrder,
          as: 'orders',
          include: [
            {
              model: db.PsychologySession,
              as: 'sessions',
              attributes: ['id', 'status', 'completedAt']
            }
          ]
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    const orders = invitation.orders || [];
    const allSessions = orders.flatMap(o => o.sessions || []);
    
    const stats = {
      totalRegistrations: invitation.usedCount,
      remainingSlots: invitation.getRemainingSlots(),
      orders: {
        total: orders.length,
        paid: orders.filter(o => o.status === 'paid').length,
        pending: orders.filter(o => o.status === 'pending').length
      },
      sessions: {
        total: allSessions.length,
        completed: allSessions.filter(s => s.status === 'completed').length,
        inProgress: allSessions.filter(s => s.status === 'in_progress').length,
        pending: allSessions.filter(s => s.status === 'pending').length
      },
      completionRate: allSessions.length > 0 
        ? Math.round((allSessions.filter(s => s.status === 'completed').length / allSessions.length) * 100)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });

    logger.logInfo('Psychology invitation stats retrieved', {
      action: 'PSYCHOLOGY_INVITATION_STATS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationId: id, stats }
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
  toggleActive,
  remove,
  getStats
};
