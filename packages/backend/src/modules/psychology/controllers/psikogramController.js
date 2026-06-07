'use strict';

/**
 * Psikogram Controller
 * 
 * Manages psikogram (psychological evaluation documents)
 */

const { Op } = require('sequelize');
const crypto = require('crypto');
const db = require('../../../models');
const { Psikogram, Patient, PsychologySession, PsychologyTestType, User, Tenant, PsychologySettings } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Calculate age from birthDate
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Generate unique public token
 */
function generatePublicToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get token expiry date (default 7 days from now)
 */
function getTokenExpiry(days = 7) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Create new psikogram
 */
async function create(req, res, next) {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      patientId,
      sessionId,
      examDate,
      participant,
      sections,
      recommendation,
      status = 'draft',
      notes
    } = req.body;

    // Validate patient exists and belongs to tenant
    const patient = await Patient.findOne({
      where: { id: patientId, tenantId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Auto-populate participant data from patient if not provided
    const participantData = participant || {
      name: patient.fullName,
      birthDate: patient.birthDate,
      sex: patient.sex,
      email: patient.email,
      phone: patient.phone,
      ...patient.personalData
    };

    // If sessionId provided, validate session
    if (sessionId) {
      const session = await PsychologySession.findOne({
        where: { id: sessionId, tenantId },
        include: [
          {
            model: db.PsychologyOrder,
            as: 'order',
            attributes: ['patientId']
          }
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Validate session belongs to same patient
      if (session.order?.patientId !== patientId) {
        return res.status(400).json({
          success: false,
          message: 'Session does not belong to the specified patient'
        });
      }

      // Validate session is verified
      if (session.status !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Session must be verified before creating psikogram'
        });
      }
    }

    // Create psikogram
    const psikogram = await Psikogram.create({
      tenantId,
      patientId,
      sessionId,
      examinerId: userId,
      examDate,
      participant: participantData,
      sections,
      recommendation,
      status,
      notes
    });

    // Reload with associations
    const createdPsikogram = await Psikogram.findByPk(psikogram.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Psikogram berhasil dibuat',
      data: formatPsikogramResponse(createdPsikogram)
    });

    logger.logAudit('Psikogram created', {
      action: 'PSIKOGRAM_CREATE',
      userId,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: psikogram.id, patientId, sessionId, status }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all psikograms with pagination and filters
 */
async function getAll(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      patientId,
      examinerId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (status) {
      where.status = status;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (examinerId) {
      where.examinerId = examinerId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.examDate = {};
      if (startDate) {
        where.examDate[Op.gte] = startDate;
      }
      if (endDate) {
        where.examDate[Op.lte] = endDate;
      }
    }

    // Search by participant name
    if (search) {
      where[Op.or] = [
        db.sequelize.where(
          db.sequelize.cast(db.sequelize.col('participant'), 'text'),
          { [Op.iLike]: `%${search}%` }
        )
      ];
    }

    const { count, rows: psikograms } = await Psikogram.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone']
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: psikograms.map(formatPsikogramListResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

    logger.logInfo('Psikograms list retrieved', {
      action: 'PSIKOGRAM_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count, page, filters: { status, patientId, examinerId, search } }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get psikogram by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const psikogram = await Psikogram.findOne({
      where: { id, tenantId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'personalData']
        },
        {
          model: PsychologySession,
          as: 'session',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType',
              attributes: ['id', 'code', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found'
      });
    }

    // Use latest patient data instead of stored participant field
    const responseData = formatPsikogramDetailResponse(psikogram);
    
    // Override participant with current patient data for consistency
    if (psikogram.patient) {
      responseData.participant = {
        name: psikogram.patient.fullName,
        birthDate: psikogram.patient.birthDate,
        age: calculateAge(psikogram.patient.birthDate),
        sex: psikogram.patient.sex,
        email: psikogram.patient.email,
        phone: psikogram.patient.phone,
        ...psikogram.patient.personalData
      };
    }

    res.json({
      success: true,
      data: responseData
    });

    logger.logInfo('Psikogram retrieved', {
      action: 'PSIKOGRAM_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: id }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update psikogram
 */
async function update(req, res, next) {
  try {
    const { tenantId, id: userId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      examDate,
      participant,
      sections,
      recommendation,
      status,
      notes
    } = req.body;

    const psikogram = await Psikogram.findOne({
      where: { id, tenantId }
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found'
      });
    }

    // Check permission: only owner or admin can update final psikogram
    if (psikogram.status === 'final' && psikogram.examinerId !== userId && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the examiner or admin can update final psikogram'
      });
    }

    // Update fields
    const updateData = {};
    if (examDate !== undefined) updateData.examDate = examDate;
    if (participant !== undefined) updateData.participant = participant;
    if (sections !== undefined) updateData.sections = sections;
    if (recommendation !== undefined) updateData.recommendation = recommendation;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await psikogram.update(updateData);

    // Reload with associations
    const updatedPsikogram = await Psikogram.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Psikogram berhasil diupdate',
      data: formatPsikogramResponse(updatedPsikogram)
    });

    logger.logAudit('Psikogram updated', {
      action: 'PSIKOGRAM_UPDATE',
      userId,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: id, changes: Object.keys(updateData) }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete psikogram
 */
async function remove(req, res, next) {
  try {
    const { tenantId, id: userId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const psikogram = await Psikogram.findOne({
      where: { id, tenantId }
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found'
      });
    }

    // Only draft can be deleted by owner, final requires admin
    if (psikogram.status === 'final' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Final psikogram can only be deleted by admin'
      });
    }

    if (psikogram.status === 'draft' && psikogram.examinerId !== userId && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the examiner or admin can delete this psikogram'
      });
    }

    // Soft delete (paranoid: true in model)
    await psikogram.destroy();

    res.json({
      success: true,
      message: 'Psikogram berhasil dihapus'
    });

    logger.logAudit('Psikogram deleted', {
      action: 'PSIKOGRAM_DELETE',
      userId,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: id, status: psikogram.status }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get psikogram print data
 */
async function getPrintData(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const psikogram = await Psikogram.findOne({
      where: { id, tenantId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone']
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'logo', 'address', 'phone', 'email']
        }
      ]
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: psikogram.id,
        examDate: psikogram.examDate,
        participant: {
          ...psikogram.participant,
          age: calculateAge(psikogram.participant?.birthDate)
        },
        sections: psikogram.sections,
        recommendation: psikogram.recommendation,
        recommendationLabel: psikogram.getRecommendationLabel(),
        status: psikogram.status,
        examiner: psikogram.examiner ? {
          name: `${psikogram.examiner.firstName || ''} ${psikogram.examiner.lastName || ''}`.trim(),
          email: psikogram.examiner.email
        } : null,
        organization: psikogram.tenant ? {
          name: psikogram.tenant.name,
          logo: psikogram.tenant.logo,
          address: psikogram.tenant.address,
          phone: psikogram.tenant.phone,
          email: psikogram.tenant.email
        } : null,
        createdAt: psikogram.createdAt,
        updatedAt: psikogram.updatedAt
      }
    });

    logger.logInfo('Psikogram print data retrieved', {
      action: 'PSIKOGRAM_PRINT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: id }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate public share URL for psikogram
 */
async function generateShareUrl(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    // Get expiryDays from body or query, default 30 days
    const expiryDays = parseInt(req.body?.expiryDays || req.query?.expiryDays || 30);

    const psikogram = await Psikogram.findOne({
      where: { id, tenantId }
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found'
      });
    }

    // Only allow sharing for finalized psikograms
    if (psikogram.status !== 'final') {
      return res.status(400).json({
        success: false,
        message: 'Only finalized psikograms can be shared'
      });
    }

    // Generate or reuse existing token
    let token = psikogram.publicToken;
    let tokenExpiry = psikogram.publicTokenExpiry;

    // Generate new token if doesn't exist or expired
    if (!token || !tokenExpiry || new Date(tokenExpiry) < new Date()) {
      token = generatePublicToken();
      tokenExpiry = getTokenExpiry(expiryDays);
      
      await psikogram.update({
        publicToken: token,
        publicTokenExpiry: tokenExpiry
      });
    }

    // Generate public URL
    const publicUrl = `${req.protocol}://${req.get('host')}/api/v1/psychology/public/psikogram/${token}`;

    res.json({
      success: true,
      message: 'Share URL generated successfully',
      data: {
        psikogramId: psikogram.id,
        token,
        publicUrl,
        expiresAt: tokenExpiry,
        whatsappMessage: `Berikut hasil psikogram Anda: ${publicUrl}`
      }
    });

    logger.logInfo('Psikogram share URL generated', {
      action: 'PSIKOGRAM_SHARE_URL',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: id, tokenExpiry }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Response Formatters
// ==========================================

function formatPsikogramResponse(psikogram) {
  return {
    id: psikogram.id,
    patientId: psikogram.patientId,
    sessionId: psikogram.sessionId,
    examDate: psikogram.examDate,
    participant: psikogram.participant,
    sections: psikogram.sections,
    recommendation: psikogram.recommendation,
    status: psikogram.status,
    notes: psikogram.notes,
    examiner: psikogram.examiner ? {
      id: psikogram.examiner.id,
      name: `${psikogram.examiner.firstName || ''} ${psikogram.examiner.lastName || ''}`.trim(),
      email: psikogram.examiner.email
    } : null,
    patient: psikogram.patient ? {
      id: psikogram.patient.id,
      fullName: psikogram.patient.fullName,
      email: psikogram.patient.email
    } : null,
    createdAt: psikogram.createdAt,
    updatedAt: psikogram.updatedAt
  };
}

function formatPsikogramListResponse(psikogram) {
  // Merge participant data with patient info if missing
  const participantData = psikogram.participant || {};
  const enrichedParticipant = {
    ...participantData,
    // Add phone, email, sex from patient if not in participant data
    ...(psikogram.patient && {
      phone: participantData.phone || psikogram.patient.phone,
      email: participantData.email || psikogram.patient.email
    })
  };

  return {
    id: psikogram.id,
    patientId: psikogram.patientId,
    examDate: psikogram.examDate,
    participant: enrichedParticipant,
    recommendation: psikogram.recommendation,
    status: psikogram.status,
    examiner: psikogram.examiner ? {
      id: psikogram.examiner.id,
      name: `${psikogram.examiner.firstName || ''} ${psikogram.examiner.lastName || ''}`.trim()
    } : null,
    createdAt: psikogram.createdAt,
    updatedAt: psikogram.updatedAt
  };
}

function formatPsikogramDetailResponse(psikogram) {
  return {
    id: psikogram.id,
    patientId: psikogram.patientId,
    sessionId: psikogram.sessionId,
    examDate: psikogram.examDate,
    participant: psikogram.participant,
    sections: psikogram.sections,
    recommendation: psikogram.recommendation,
    status: psikogram.status,
    notes: psikogram.notes,
    examiner: psikogram.examiner ? {
      id: psikogram.examiner.id,
      name: `${psikogram.examiner.firstName || ''} ${psikogram.examiner.lastName || ''}`.trim(),
      email: psikogram.examiner.email
    } : null,
    patient: psikogram.patient ? {
      id: psikogram.patient.id,
      fullName: psikogram.patient.fullName,
      email: psikogram.patient.email,
      phone: psikogram.patient.phone,
      birthDate: psikogram.patient.birthDate,
      sex: psikogram.patient.sex,
      personalData: psikogram.patient.personalData
    } : null,
    session: psikogram.session ? {
      id: psikogram.session.id,
      testType: psikogram.session.testType ? {
        id: psikogram.session.testType.id,
        code: psikogram.session.testType.code,
        name: psikogram.session.testType.name
      } : null,
      completedAt: psikogram.session.completedAt,
      verifiedAt: psikogram.session.verifiedAt
    } : null,
    createdAt: psikogram.createdAt,
    updatedAt: psikogram.updatedAt
  };
}

/**
 * Get psikogram by public token (no authentication required)
 */
async function getByPublicToken(req, res, next) {
  try {
    const { token } = req.params;

    // Find psikogram by token
    const psikogram = await Psikogram.findOne({
      where: {
        publicToken: token,
        status: 'final'
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'personalData']
        },
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        }
      ]
    });

    // Get psychology settings for organization data
    const psychologySettings = await PsychologySettings.findOne({
      where: { tenantId: psikogram?.tenantId },
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });

    if (!psikogram) {
      return res.status(404).json({
        success: false,
        message: 'Psikogram not found or token invalid'
      });
    }

    // Check if token expired
    if (psikogram.publicTokenExpiry && new Date(psikogram.publicTokenExpiry) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Share link has expired'
      });
    }

    // Use latest patient data for participant info
    const participantData = psikogram.patient ? {
      name: psikogram.patient.fullName,
      birthDate: psikogram.patient.birthDate,
      age: calculateAge(psikogram.patient.birthDate),
      sex: psikogram.patient.sex,
      email: psikogram.patient.email,
      phone: psikogram.patient.phone,
      ...psikogram.patient.personalData
    } : psikogram.participant;

    // Return psikogram data
    res.json({
      success: true,
      data: {
        id: psikogram.id,
        examDate: psikogram.examDate,
        participant: participantData,
        sections: psikogram.sections,
        recommendation: psikogram.recommendation,
        recommendationLabel: psikogram.getRecommendationLabel(),
        status: psikogram.status,
        examiner: psikogram.examiner ? {
          name: `${psikogram.examiner.firstName || ''} ${psikogram.examiner.lastName || ''}`.trim(),
          email: psikogram.examiner.email
        } : null,
        organization: {
          name: psikogram.tenant?.name || null,
          ...(psychologySettings?.toJSON() || {})
        },
        createdAt: psikogram.createdAt
      }
    });

    logger.logInfo('Psikogram accessed publicly', {
      action: 'PSIKOGRAM_PUBLIC_ACCESS',
      tenantId: psikogram.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { psikogramId: psikogram.id }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getPrintData,
  generateShareUrl,
  getByPublicToken
};

