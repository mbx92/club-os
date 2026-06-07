'use strict';

/**
 * Patient Controller
 * 
 * Manages patient data for psychological testing
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const { Patient } = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get all patients for tenant
 */
async function getAll(req, res, next) {
  try {
    const { tenantId: userTenantId, isSuperAdmin } = req.user;
    const { search, page = 1, limit = 20, tenantId: queryTenantId } = req.query;
    
    // Super admin can filter by tenantId, regular users see only their tenant
    const tenantId = isSuperAdmin && queryTenantId ? queryTenantId : userTenantId;
    
    const where = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: patients } = await Patient.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

    logger.logInfo('Patients retrieved', {
      action: 'PSYCHOLOGY_PATIENT_LIST',
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
 * Get single patient by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId: userTenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    
    // Build where clause - super admin can access any tenant's patients
    const where = { id };
    if (!isSuperAdmin && userTenantId) {
      where.tenantId = userTenantId;
    }
    
    const patient = await Patient.findOne({
      where,
      include: [
        {
          model: db.PsychologyOrder,
          as: 'orders',
          include: [
            { model: db.PsychologyPackage, as: 'package' }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    res.json({
      success: true,
      data: patient
    });

    logger.logInfo('Patient retrieved', {
      action: 'PSYCHOLOGY_PATIENT_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { patientId: id, patientName: patient.fullName }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new patient
 */
async function create(req, res, next) {
  try {
    const { tenantId: userTenantId, isSuperAdmin } = req.user;
    const {
      fullName, name, email, phone, birthDate, sex, address, personalData,
      tenantId: bodyTenantId
    } = req.body;
    
    // Super admin can specify tenantId, regular users use their own
    const tenantId = isSuperAdmin && bodyTenantId ? bodyTenantId : userTenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // Support both fullName and name field
    const patientName = fullName || name;
    
    // Check for duplicate email if provided
    if (email) {
      const existing = await Patient.findOne({
        where: { tenantId, email }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }
    }
    
    const patient = await Patient.create({
      tenantId,
      fullName: patientName,
      email,
      phone,
      birthDate,
      sex,
      address,
      personalData: personalData || {}
    });
    
    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });

    logger.logAudit('Patient created', {
      action: 'PSYCHOLOGY_PATIENT_CREATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { patientId: patient.id, patientName, email }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update patient
 */
async function update(req, res, next) {
  try {
    const { tenantId: userTenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const {
      fullName, name, email, phone, birthDate, sex, address, personalData
    } = req.body;
    
    // Support both fullName and name field
    const patientName = fullName !== undefined ? fullName : name;
    
    // Build where clause - super admin can access any tenant's patients
    const where = { id };
    if (!isSuperAdmin && userTenantId) {
      where.tenantId = userTenantId;
    }
    
    const patient = await Patient.findOne({ where });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Check for duplicate email if changing
    if (email && email !== patient.email) {
      const existing = await Patient.findOne({
        where: { tenantId: patient.tenantId, email }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }
    }
    
    // Update fields
    if (patientName !== undefined) patient.fullName = patientName;
    if (email !== undefined) patient.email = email;
    if (phone !== undefined) patient.phone = phone;
    if (birthDate !== undefined) patient.birthDate = birthDate;
    if (sex !== undefined) patient.sex = sex;
    if (address !== undefined) patient.address = address;
    if (personalData !== undefined) patient.personalData = personalData;
    
    await patient.save();
    
    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });

    logger.logAudit('Patient updated', {
      action: 'PSYCHOLOGY_PATIENT_UPDATE',
      userId: req.user.id,
      tenantId: patient.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { patientId: id, patientName: patient.fullName }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete patient
 */
async function remove(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const targetTenantId = isSuperAdmin && req.query.tenantId ? req.query.tenantId : tenantId;
    
    const patient = await Patient.findOne({
      where: { id, tenantId: targetTenantId }
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Check for existing orders
    const orderCount = await db.PsychologyOrder.count({
      where: { patientId: id }
    });
    
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: patient has ${orderCount} order(s)`
      });
    }
    
    await patient.destroy();
    
    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });

    logger.logAudit('Patient deleted', {
      action: 'PSYCHOLOGY_PATIENT_DELETE',
      userId: req.user.id,
      tenantId: targetTenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { patientId: id, patientName: patient.fullName }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Search patients (for autocomplete)
 */
async function search(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { q } = req.query;
    const targetTenantId = isSuperAdmin && req.query.tenantId ? req.query.tenantId : tenantId;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const patients = await Patient.findAll({
      where: {
        tenantId: targetTenantId,
        [Op.or]: [
          { fullName: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'phone'],
      limit: 10,
      order: [['fullName', 'ASC']]
    });
    
    res.json({
      success: true,
      data: patients
    });

    logger.logInfo('Patients searched', {
      action: 'PSYCHOLOGY_PATIENT_SEARCH',
      userId: req.user.id,
      tenantId: targetTenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { query: q, resultCount: patients.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get patient test history
 * Returns all orders and sessions for a patient
 */
async function getHistory(req, res, next) {
  try {
    const { tenantId: userTenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Build where clause - super admin can access any tenant's patients
    const where = { id };
    if (!isSuperAdmin && userTenantId) {
      where.tenantId = userTenantId;
    }
    
    // First check if patient exists
    const patient = await Patient.findOne({
      where,
      attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex']
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get orders with sessions
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: orders } = await db.PsychologyOrder.findAndCountAll({
      where: { patientId: id },
      include: [
        {
          model: db.PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name', 'packageType']
        },
        {
          model: db.PsychologySession,
          as: 'sessions',
          include: [
            {
              model: db.PsychologyTestType,
              as: 'testType',
              attributes: ['id', 'code', 'name', 'category', 'questionCount', 'estimatedDuration']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // Calculate statistics
    const allSessions = orders.flatMap(o => o.sessions || []);
    const stats = {
      totalOrders: count,
      totalSessions: allSessions.length,
      completedSessions: allSessions.filter(s => s.status === 'completed').length,
      inProgressSessions: allSessions.filter(s => s.status === 'in_progress').length,
      pendingSessions: allSessions.filter(s => s.status === 'pending').length
    };
    
    // Format response
    const history = orders.map(order => ({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        paidAt: order.paidAt,
        createdAt: order.createdAt
      },
      package: order.package,
      sessions: order.sessions?.map(session => {
        const totalQuestions = session.testType?.questionCount || 0;
        const answeredCount = session.answers ? Object.keys(session.answers).length : 0;
        
        return {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          duration: session.completedAt && session.startedAt 
            ? Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) 
            : null,
          testType: session.testType,
          progress: {
            answered: answeredCount,
            total: totalQuestions,
            percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
          },
          hasScores: !!session.scores
        };
      }) || []
    }));
    
    res.json({
      success: true,
      data: {
        patient,
        history,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

    logger.logInfo('Patient history retrieved', {
      action: 'PSYCHOLOGY_PATIENT_HISTORY',
      userId: req.user.id,
      tenantId: userTenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { patientId: id, ordersCount: count }
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
  search,
  getHistory
};
