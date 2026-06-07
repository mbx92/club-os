'use strict';

/**
 * Session Controller
 * 
 * Manages test sessions and answer submissions
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { scoringService } = require('../services');
const { PsychologySession, PsychologyOrder, PsychologyTestType, Patient: PsychologyPatient } = db;
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
 * Get actual question count (excluding instructions)
 */
function getActualQuestionCount(questions) {
  if (!Array.isArray(questions)) return 0;
  return questions.filter(q => q.type === 'question').length;
}

/**
 * Get all sessions (admin)
 */
async function getAll(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      testTypeId, 
      orderId,
      patientId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Valid status values
    const validStatuses = ['pending', 'started', 'in_progress', 'paused', 'completed', 'verified', 'abandoned', 'timeout'];
    
    // Build where clause
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status value. Valid values: ${validStatuses.join(', ')}`
        });
      }
      where.status = status;
    }
    if (testTypeId) {
      where.testTypeId = testTypeId;
    }
    if (orderId) {
      where.orderId = orderId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }
    
    // Build order include with patient filter
    // Include full patient data when filtering by verified status
    const patientAttributes = status === 'verified' 
      ? ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'address', 'personalData']
      : ['id', 'fullName', 'email', 'birthDate', 'sex'];
    
    const orderInclude = {
      model: PsychologyOrder,
      as: 'order',
      include: [
        { model: db.Patient, as: 'patient', attributes: patientAttributes }
      ]
    };
    
    if (patientId) {
      orderInclude.where = { patientId };
    }
    
    // Search filter - support both sessionToken and patient name/email
    if (search) {
      // Create OR condition that includes both session and patient search
      where[Op.or] = [
        { sessionToken: { [Op.iLike]: `%${search}%` } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "PsychologyOrders" po
          INNER JOIN "Patients" p ON po."patientId" = p.id
          WHERE po.id = "PsychologySession"."orderId"
          AND (p."fullName" ILIKE '%${search.replace(/'/g, "''")}%' OR p.email ILIKE '%${search.replace(/'/g, "''")}%')
        )`)
      ];
    }
    
    const { count, rows: sessions } = await PsychologySession.findAndCountAll({
      where,
      include: [
        orderInclude,
        { 
          model: PsychologyTestType, 
          as: 'testType',
          attributes: ['id', 'code', 'name', 'category', 'estimatedDuration', 'questionCount']
        },
        {
          model: db.User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calculate statistics
    const stats = await PsychologySession.findAll({
      where: !isSuperAdmin ? { tenantId } : {},
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, { pending: 0, in_progress: 0, completed: 0, verified: 0, abandoned: 0, timeout: 0 });
    
    res.json({
      success: true,
      data: {
        sessions: sessions.map(s => {
          // Calculate progress
          const totalQuestions = s.testType?.questionCount || 0;
          const answeredCount = s.getAnswerCount ? s.getAnswerCount() : (s.answers ? Object.keys(s.answers).length : 0);
          const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
          
          return {
            id: s.id,
            sessionToken: s.sessionToken,
            sessionNumber: s.sessionNumber,
            status: s.status,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            duration: s.getDurationMinutes ? s.getDurationMinutes() : null,
            verifiedAt: s.verifiedAt,
            verifier: s.verifier ? {
              id: s.verifier.id,
              name: `${s.verifier.firstName || ''} ${s.verifier.lastName || ''}`.trim(),
              email: s.verifier.email
            } : null,
            order: s.order ? {
              id: s.order.id,
              orderNumber: s.order.orderNumber,
              patient: s.order.patient ? {
                id: s.order.patient.id,
                fullName: s.order.patient.fullName,
                email: s.order.patient.email,
                phone: s.order.patient.phone,
                sex: s.order.patient.sex,
                birthDate: s.order.patient.birthDate,
                age: s.order.patient.birthDate ? calculateAge(s.order.patient.birthDate) : null,
                address: s.order.patient.address,
                personalData: s.order.patient.personalData
              } : null
            } : null,
            testType: s.testType ? {
              id: s.testType.id,
              code: s.testType.code,
              name: s.testType.name,
              category: s.testType.category,
              estimatedDuration: s.testType.estimatedDuration,
              questionCount: s.testType.questionCount
            } : null,
            progress: {
              answered: answeredCount,
              total: totalQuestions,
              percentage: progressPercentage
            },
            hasScores: !!s.scores,
            createdAt: s.createdAt
          };
        }),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        stats: statusStats
      }
    });

    logger.logInfo('Psychology sessions list retrieved', {
      action: 'PSYCHOLOGY_SESSION_LIST',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { count, page, filters: { status, testTypeId, orderId, patientId, search } }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get session by ID
 */
async function getById(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { includeAnswers } = req.query; // Optional: include answers for psikogram analysis
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          attributes: ['id', 'orderNumber', 'status', 'accessToken', 'expiresAt'],
          include: [
            { 
              model: db.Patient, 
              as: 'patient',
              attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'address', 'personalData']
            }
          ]
        },
        { 
          model: PsychologyTestType, 
          as: 'testType',
          attributes: ['id', 'code', 'name', 'category', 'estimatedDuration', 'config', 'questions', 'questionCount']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Format response
    const formattedResponse = {
      id: session.id,
      sessionToken: session.sessionToken,
      sessionNumber: session.sessionNumber,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      duration: session.timeSpent || session.getDurationMinutes() ? session.getDurationMinutes() * 60 : null, // in seconds
      durationMinutes: session.getDurationMinutes(),
      currentQuestion: session.currentQuestion,
      answeredCount: session.getAnswerCount(),
      verifiedAt: session.verifiedAt,
      hasScores: !!(session.scores && Object.keys(session.scores).length > 0),
      hasInterpretation: !!(session.interpretation && Object.keys(session.interpretation).length > 0),
      order: session.order ? {
        id: session.order.id,
        orderNumber: session.order.orderNumber,
        status: session.order.status,
        patient: session.order.patient ? {
          id: session.order.patient.id,
          fullName: session.order.patient.fullName,
          email: session.order.patient.email,
          phone: session.order.patient.phone,
          birthDate: session.order.patient.birthDate,
          sex: session.order.patient.sex,
          age: session.order.patient.birthDate ? calculateAge(session.order.patient.birthDate) : null,
          address: session.order.patient.address,
          personalData: session.order.patient.personalData
        } : null
      } : null,
      testType: session.testType ? {
        id: session.testType.id,
        code: session.testType.code,
        name: session.testType.name,
        category: session.testType.category,
        estimatedDuration: session.testType.estimatedDuration,
        questionCount: session.testType.questionCount || getActualQuestionCount(session.testType.questions),
        timeLimit: session.testType.config?.timeLimit || null,
        // Include questions for completed/verified sessions or when explicitly requested
        questions: (['completed', 'verified'].includes(session.status) || includeAnswers === 'true') ? (
          typeof session.testType.questions === 'string' ? JSON.parse(session.testType.questions) : session.testType.questions
        ) : undefined
      } : null,
      // Include answers for completed/verified sessions or when explicitly requested
      answers: (['completed', 'verified'].includes(session.status) || includeAnswers === 'true') ? session.answers : undefined,
      scores: session.scores,
      interpretation: session.interpretation,
      ipAddress: session.ipAddress,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
    
    res.json({
      success: true,
      data: formattedResponse
    });

    logger.logInfo('Psychology session retrieved', {
      action: 'PSYCHOLOGY_SESSION_GET',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, status: session.status }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Start session
 */
async function start(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        { model: PsychologyTestType, as: 'testType' }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed'
      });
    }
    
    session.status = 'in_progress';
    session.startedAt = new Date();
    session.lastActivityAt = new Date();
    session.ipAddress = req.ip;
    session.userAgent = req.get('user-agent');
    
    await session.save();
    
    // Parse questions if stored as string
    let questions = session.testType.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }
    
    res.json({
      success: true,
      message: 'Session started',
      data: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        testType: session.testType,
        questions
      }
    });

    logger.logAudit('Psychology session started', {
      action: 'PSYCHOLOGY_SESSION_START',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save progress (partial answers)
 */
async function saveProgress(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { answers } = req.body;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId }
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify completed session'
      });
    }
    
    session.answers = answers;
    session.lastActivityAt = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: 'Progress saved',
      data: {
        answeredCount: session.getAnswerCount()
      }
    });

    logger.logInfo('Psychology session progress saved', {
      action: 'PSYCHOLOGY_SESSION_SAVE_PROGRESS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, answeredCount: session.getAnswerCount() }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit answers and complete session
 */
async function submit(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { answers } = req.body;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        { model: PsychologyTestType, as: 'testType' },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            { 
              model: PsychologyPatient, 
              as: 'patient',
              attributes: ['id', 'birthDate']
            }
          ]
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed'
      });
    }
    
    // Save answers
    session.answers = answers;
    session.status = 'completed';
    session.completedAt = new Date();
    session.lastActivityAt = new Date();
    
    // Prepare patient info for age-based scoring (CFIT, IST, etc.)
    const patientInfo = {
      birthDate: session.order?.patient?.birthDate,
      testDate: new Date()
    };
    
    // Parse questions if stored as string
    let questions = session.testType.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }
    
    // Calculate scores (but NOT verified yet - admin needs to verify manually)
    const scoringResult = scoringService.verifyAndScore(
      session.testType.code,
      answers,
      questions,
      patientInfo
    );
    
    session.scores = scoringResult.scores;
    session.interpretation = scoringResult.interpretation;
    // verifiedAt akan diisi saat admin hit endpoint verify
    
    await session.save();
    
    // Check if all sessions are completed to update order status
    const order = await PsychologyOrder.findByPk(session.orderId);
    if (order && order.status === 'in_progress') {
      const allSessions = await PsychologySession.findAll({
        where: { orderId: order.id },
        attributes: ['id', 'status']
      });
      
      const allCompleted = allSessions.every(s => s.status === 'completed');
      if (allCompleted) {
        order.status = 'completed';
        await order.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Session completed',
      data: {
        id: session.id,
        status: session.status,
        completedAt: session.completedAt,
        duration: session.getDurationMinutes(),
        scores: session.scores,
        interpretation: session.interpretation
      }
    });

    logger.logAudit('Psychology session submitted', {
      action: 'PSYCHOLOGY_SESSION_SUBMIT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, testType: session.testType.code, duration: session.getDurationMinutes() }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get session result (scores and interpretation)
 */
async function getResult(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          include: [
            { model: db.Patient, as: 'patient' }
          ]
        },
        { model: PsychologyTestType, as: 'testType' },
        { model: db.User, as: 'verifier', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Allow viewing results for completed or verified sessions
    if (!['completed', 'verified'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Session not yet completed'
      });
    }
    
    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          duration: session.getDurationMinutes(),
          verifiedAt: session.verifiedAt
        },
        patient: session.order.patient,
        testType: {
          code: session.testType.code,
          name: session.testType.name,
          category: session.testType.category
        },
        scores: session.scores,
        interpretation: session.interpretation,
        answers: session.answers // Include for verification
      }
    });

    logger.logInfo('Psychology session result retrieved', {
      action: 'PSYCHOLOGY_SESSION_RESULT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Recalculate scores (admin function)
 */
async function recalculate(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        { model: PsychologyTestType, as: 'testType' },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            { 
              model: PsychologyPatient, 
              as: 'patient',
              attributes: ['id', 'birthDate']
            }
          ]
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (!session.answers) {
      return res.status(400).json({
        success: false,
        message: 'No answers to score'
      });
    }
    
    // Prepare patient info for age-based scoring (CFIT, IST, etc.)
    const patientInfo = {
      birthDate: session.order?.patient?.birthDate,
      testDate: session.completedAt || new Date()
    };
    
    // Parse questions if stored as string
    let questions = session.testType.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }
    
    // Recalculate scores
    const scoringResult = scoringService.verifyAndScore(
      session.testType.code,
      session.answers,
      questions,
      patientInfo
    );
    
    session.scores = scoringResult.scores;
    session.interpretation = scoringResult.interpretation;
    session.verifiedAt = new Date();
    session.verifiedBy = req.user.id;
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Scores recalculated',
      data: {
        scores: session.scores,
        interpretation: session.interpretation,
        verifiedAt: session.verifiedAt
      }
    });

    logger.logAudit('Psychology session scores recalculated', {
      action: 'PSYCHOLOGY_SESSION_RECALCULATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify session result (admin marks as verified)
 * Also recalculates scores and interpretation to ensure accuracy
 */
async function verify(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { notes, skipRecalculate = false } = req.body;
    
    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        { model: PsychologyTestType, as: 'testType' },
        {
          model: PsychologyOrder,
          as: 'order',
          include: [
            { model: db.Patient, as: 'patient' }
          ]
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session must be completed before verification'
      });
    }
    
    if (session.verifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'Session already verified',
        data: {
          verifiedAt: session.verifiedAt,
          verifiedBy: session.verifiedBy
        }
      });
    }
    
    // Recalculate scores before verification (unless explicitly skipped)
    if (!skipRecalculate && session.answers) {
      // Prepare patient info for age-based scoring (CFIT, IST, etc.)
      const patientInfo = {
        birthDate: session.order?.patient?.birthDate,
        testDate: session.completedAt || new Date()
      };
      
      // Parse questions if stored as string
      let questions = session.testType.questions;
      if (typeof questions === 'string') {
        try {
          questions = JSON.parse(questions);
        } catch (e) {
          // Keep as is if parsing fails
        }
      }
      
      // Recalculate scores and interpretation
      const scoringResult = scoringService.verifyAndScore(
        session.testType.code,
        session.answers,
        questions,
        patientInfo
      );
      
      session.scores = scoringResult.scores;
      session.interpretation = scoringResult.interpretation;
    }
    
    // Mark as verified
    session.status = 'verified';
    session.verifiedAt = new Date();
    session.verifiedBy = req.user.id;
    if (notes) {
      session.metadata = {
        ...session.metadata,
        verificationNotes: notes
      };
    }
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session verified successfully',
      data: {
        id: session.id,
        status: session.status,
        verifiedAt: session.verifiedAt,
        verifiedBy: req.user.id,
        scores: session.scores,
        interpretation: session.interpretation
      }
    });

    logger.logAudit('Psychology session verified', {
      action: 'PSYCHOLOGY_SESSION_VERIFY',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get cleanup preview - sessions that would be affected
 */
async function getCleanupPreview(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionCleanupService } = require('../services');
    
    const effectiveTenantId = isSuperAdmin ? null : tenantId;
    const preview = await sessionCleanupService.getCleanupPreview(effectiveTenantId);
    
    res.json({
      success: true,
      message: 'Cleanup preview retrieved successfully',
      data: preview
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Run session cleanup - mark timeout/abandoned sessions
 */
async function runCleanup(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionCleanupService } = require('../services');
    
    const effectiveTenantId = isSuperAdmin ? null : tenantId;
    const result = await sessionCleanupService.runCleanup(effectiveTenantId);
    
    res.json({
      success: true,
      message: 'Session cleanup completed',
      data: result
    });

    logger.logAudit('Psychology session cleanup executed', {
      action: 'PSYCHOLOGY_SESSION_CLEANUP',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        timedOut: result.timedOut?.length || 0,
        abandoned: result.abandoned?.length || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manually mark session as abandoned
 */
async function markAsAbandoned(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { reason } = req.body;
    
    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    
    const session = await PsychologySession.findOne({ where });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Only allow marking non-completed sessions as abandoned
    if (['completed', 'verified', 'abandoned', 'timeout'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark session with status '${session.status}' as abandoned`
      });
    }
    
    await session.update({
      status: 'abandoned',
      metadata: {
        ...session.metadata,
        abandonedReason: reason || 'Manually marked by admin',
        abandonedAt: new Date().toISOString(),
        abandonedBy: req.user.id
      }
    });
    
    res.json({
      success: true,
      message: 'Session marked as abandoned',
      data: {
        id: session.id,
        status: session.status
      }
    });

    logger.logAudit('Psychology session marked as abandoned', {
      action: 'PSYCHOLOGY_SESSION_ABANDON',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId: id, reason }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  start,
  saveProgress,
  submit,
  getResult,
  recalculate,
  verify,
  getCleanupPreview,
  runCleanup,
  markAsAbandoned
};
