'use strict';

/**
 * Public Controller
 * 
 * Handles public access for test candidates (via access token)
 * No authentication required - access controlled by token
 * 
 * Flow:
 * 1. Admin creates Invitation (link/QR code)
 * 2. Candidate accesses invitation link → Registration page
 * 3. Candidate registers → Gets access token
 * 4. Candidate uses access token to take tests
 */

const db = require('../../../models');
const { accessTokenService, scoringService } = require('../services');
const {
  PsychologyOrder, PsychologySession, PsychologyTestType, Patient,
  PsychologyInvitation, PsychologyPackage, PsychologyPackageItem
} = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Get actual question count (excluding instructions)
 */
function getActualQuestionCount(questions) {
  if (!Array.isArray(questions)) return 0;
  return questions.filter(q => q.type === 'question').length;
}

/**
 * Validate access token
 */
async function validateToken(req, res, next) {
  try {
    const { token } = req.params;
    
    // Normalize token format
    const normalizedToken = accessTokenService.formatToken(token);
    
    // Find order by token
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'fullName'] },
        {
          model: db.PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name', 'packageType']
        },
        {
          model: PsychologySession,
          as: 'sessions',
          include: [
            {
              model: PsychologyTestType,
              as: 'testType'
            }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Invalid access token',
        error: 'TOKEN_NOT_FOUND',
        hint: 'Please check the URL or contact administrator'
      });
    }
    
    // Check if token expired
    if (!order.isAccessValid()) {
      return res.status(403).json({
        success: false,
        message: 'Access token has expired',
        error: 'TOKEN_EXPIRED',
        expiredAt: order.expiresAt,
        hint: 'Please contact administrator to regenerate access'
      });
    }
    
    // Check payment status - allow paid, in_progress, or completed
    if (!['paid', 'in_progress', 'completed'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: `Order status is '${order.status}'. Access not allowed.`,
        error: 'INVALID_ORDER_STATUS',
        status: order.status,
        hint: order.status === 'pending' ? 'Payment not confirmed yet' : 'Order is cancelled or inactive'
      });
    }
    
    // Calculate progress
    const totalTests = order.sessions.length;
    const completedTests = order.sessions.filter(s => s.status === 'completed').length;
    
    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber
        },
        patient: order.patient,
        package: order.package,
        sessions: order.sessions.map(s => ({
          id: s.id,
          status: s.status,
          testType: {
            id: s.testType?.id,
            code: s.testType?.code,
            name: s.testType?.name,
            estimatedDuration: s.testType?.estimatedDuration,
            timeLimit: s.testType?.config?.timeLimit || null
          },
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          totalQuestions: s.testType?.questionCount || 0,
          answeredQuestions: s.getAnswerCount()
        })),
        progress: {
          total: totalTests,
          completed: completedTests,
          percentage: Math.round((completedTests / totalTests) * 100)
        },
        expiresAt: order.expiresAt,
        remainingTime: accessTokenService.getRemainingTime(order.expiresAt)
      }
    });

    logger.logInfo('Public access token validated', {
      action: 'PSYCHOLOGY_PUBLIC_TOKEN_VALIDATE',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, progress: `${completedTests}/${totalTests}` }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get test questions for session (public access)
 */
async function getQuestions(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    
    // Validate token and get order
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken }
    });
    
    if (!order || !order.isAccessValid() || !['paid', 'in_progress'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access'
      });
    }
    
    // Get session with patient data
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
      include: [
        { model: PsychologyTestType, as: 'testType' },
        {
          model: PsychologyOrder,
          as: 'order',
          include: [
            {
              model: db.Patient,
              as: 'patient',
              attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'address', 'personalData']
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
        message: 'Test already completed'
      });
    }
    
    // Start session if pending
    if (session.status === 'pending') {
      session.status = 'in_progress';
      session.startedAt = new Date();
      session.lastActivityAt = new Date();
      session.ipAddress = req.ip;
      session.userAgent = req.get('user-agent');
      await session.save();
    }
    
    // Parse questions if stored as string
    let questions = session.testType.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }
    
    // Parse config if stored as string
    let config = session.testType.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        config = {};
      }
    }
    
    // Parse scoringConfig if stored as string
    let scoringConfig = session.testType.scoringConfig;
    if (typeof scoringConfig === 'string') {
      try {
        scoringConfig = JSON.parse(scoringConfig);
      } catch (e) {
        scoringConfig = {};
      }
    }
    
    // Calculate patient age if birthDate available
    const calculateAge = (birthDate) => {
      if (!birthDate) return null;
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };
    
    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt
        },
        patient: session.order?.patient ? {
          id: session.order.patient.id,
          fullName: session.order.patient.fullName,
          email: session.order.patient.email,
          phone: session.order.patient.phone,
          birthDate: session.order.patient.birthDate,
          age: calculateAge(session.order.patient.birthDate),
          sex: session.order.patient.sex,
          address: session.order.patient.address,
          personalData: session.order.patient.personalData
        } : null,
        testType: {
          code: session.testType.code,
          name: session.testType.name,
          estimatedMinutes: session.testType.estimatedDuration || 0,
          config: config || {},
          scoringConfig: scoringConfig || {}
        },
        questions,
        savedAnswers: session.answers, // Return any saved progress
        metadata: session.metadata || null // Return metadata for timer restoration
      }
    });

    logger.logInfo('Public test questions retrieved', {
      action: 'PSYCHOLOGY_PUBLIC_GET_QUESTIONS',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, sessionId, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save progress (public access)
 */
async function saveProgress(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    const { answers, metadata } = req.body;
    
    // Validate token
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken }
    });
    
    if (!order || !order.isAccessValid() || !['paid', 'in_progress'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access'
      });
    }
    
    // Get session
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
      include: [{
        model: PsychologyTestType,
        as: 'testType',
        attributes: ['id', 'code', 'config']
      }]
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
        message: 'Cannot modify completed test'
      });
    }
    
    // Save answers
    session.answers = answers;
    session.lastActivityAt = new Date();
    
    // Update metadata if provided (for CFIT subtest timer persistence)
    if (metadata && typeof metadata === 'object') {
      // Validate subtestTimers if present (prevent timer manipulation)
      if (metadata.subtestTimers) {
        const config = typeof session.testType.config === 'string' 
          ? JSON.parse(session.testType.config) 
          : session.testType.config;
        
        const subtests = config?.subtests || [];
        
        // Validate each subtest timer
        Object.keys(metadata.subtestTimers).forEach(subtestCode => {
          const subtest = subtests.find(s => s.code === subtestCode);
          const timerValue = metadata.subtestTimers[subtestCode];
          
          // Prevent timer manipulation: value cannot exceed configured timeLimit
          if (subtest && timerValue > subtest.timeLimit) {
            metadata.subtestTimers[subtestCode] = subtest.timeLimit;
          }
          
          // Timer cannot be negative
          if (timerValue < 0) {
            metadata.subtestTimers[subtestCode] = 0;
          }
        });
      }
      
      // Merge with existing metadata
      session.metadata = {
        ...session.metadata,
        ...metadata,
        lastSavedAt: new Date().toISOString()
      };
    }
    
    await session.save();
    
    // Broadcast progress update to active monitors
    const { broadcastProgressUpdate } = require('./sessionProgressController');
    setImmediate(() => {
      broadcastProgressUpdate(sessionId).catch(err => {
        logger.logError('Failed to broadcast progress update', {
          action: 'BROADCAST_PROGRESS_ERROR',
          metadata: { sessionId },
          error: err.message
        });
      });
    });
    
    res.json({
      success: true,
      message: 'Progress saved',
      data: {
        savedAt: new Date().toISOString(),
        answeredCount: session.getAnswerCount()
      }
    });

    logger.logInfo('Public test progress saved', {
      action: 'PSYCHOLOGY_PUBLIC_SAVE_PROGRESS',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, sessionId, answeredCount: session.getAnswerCount() }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit answers (public access)
 */
async function submitAnswers(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    const { answers, metadata } = req.body;
    
    // Validate token
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'birthDate']
        }
      ]
    });
    
    if (!order || !order.isAccessValid() || !['paid', 'in_progress'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access'
      });
    }
    
    // Get session with test type
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
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
        message: 'Test already completed'
      });
    }
    
    // Parse test type config
    let config = session.testType.config;
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        config = {};
      }
    }
    
    // Ensure config is an object
    if (!config || typeof config !== 'object') {
      config = {};
    }
    
    // Parse questions if stored as string
    let questions = session.testType.questions;
    if (typeof questions === 'string') {
      try {
        questions = JSON.parse(questions);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }
    
    // Validate all questions answered if allowSkip is false or undefined
    const allowSkip = config.allowSkip === true;
    
    if (!allowSkip) {
      const totalQuestions = Array.isArray(questions) ? questions.length : 0;
      const answeredCount = answers ? Object.keys(answers).length : 0;
      
      if (answeredCount < totalQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menyelesaikan tes',
          error: `Masih ada ${totalQuestions - answeredCount} soal yang belum dijawab. Silakan jawab semua soal terlebih dahulu.`,
          data: {
            totalQuestions,
            answeredCount,
            unanswered: totalQuestions - answeredCount
          }
        });
      }
    }
    
    // Save answers and complete
    session.answers = answers;
    session.status = 'completed';
    session.completedAt = new Date();
    
    // Save final metadata if provided (for audit trail)
    if (metadata && typeof metadata === 'object') {
      session.metadata = {
        ...session.metadata,
        ...metadata,
        completedAt: new Date().toISOString()
      };
    }
    
    // Prepare patient info for age-based scoring (CFIT, IST, etc.)
    const patientInfo = {
      birthDate: order.patient?.birthDate,
      testDate: new Date()
    };
    
    // Calculate scores
    const scoringResult = scoringService.verifyAndScore(
      session.testType.code,
      answers,
      questions,
      patientInfo
    );
    
    session.scores = scoringResult.scores;
    session.interpretation = scoringResult.interpretation;
    session.lastActivityAt = new Date();
    // verifiedAt akan diisi saat psikolog/admin memverifikasi hasil
    
    await session.save();
    
    // Check if all sessions are completed to update order status
    const allSessions = await PsychologySession.findAll({
      where: { orderId: order.id },
      attributes: ['id', 'status']
    });
    
    const allCompleted = allSessions.every(s => s.status === 'completed');
    if (allCompleted && order.status === 'in_progress') {
      order.status = 'completed';
      await order.save();
    }
    
    res.json({
      success: true,
      message: 'Test completed',
      data: {
        sessionId: session.id,
        completedAt: session.completedAt,
        duration: session.getDurationMinutes(),
        allTestsCompleted: allCompleted
        // Don't return scores in public endpoint - they view results separately
      }
    });

    logger.logAudit('Public test submitted', {
      action: 'PSYCHOLOGY_PUBLIC_SUBMIT_ANSWERS',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, sessionId, testType: session.testType.code, duration: session.getDurationMinutes() }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get result (public access - limited view)
 */
async function getResult(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    
    // Validate token
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken },
      include: [
        { model: Patient, as: 'patient' }
      ]
    });
    
    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'Invalid access'
      });
    }
    
    // Get session
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
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
    
    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Test not yet completed'
      });
    }
    
    // Return result for print-friendly page
    res.json({
      success: true,
      data: {
        patient: {
          fullName: order.patient.fullName,
          // Limited info for privacy
        },
        testType: {
          code: session.testType.code,
          name: session.testType.name,
          questionCount: session.testType.questionCount || getActualQuestionCount(session.testType.questions)
        },
        session: {
          id: session.id,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          duration: session.getDurationMinutes(),
          durationSeconds: session.timeSpent || (session.getDurationMinutes() ? session.getDurationMinutes() * 60 : null),
          answeredCount: session.getAnswerCount(),
          totalQuestions: session.testType.questionCount || getActualQuestionCount(session.testType.questions)
        },
        scores: session.scores,
        interpretation: session.interpretation
      }
    });

    logger.logInfo('Public test result retrieved', {
      action: 'PSYCHOLOGY_PUBLIC_GET_RESULT',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, sessionId, testType: session.testType.code }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// INVITATION-BASED REGISTRATION FLOW
// ============================================

/**
 * Get invitation info for registration page
 * Public endpoint - no auth required
 */
async function getInvitation(req, res, next) {
  try {
    const { code } = req.params;

    const invitation = await PsychologyInvitation.findOne({
      where: { code: code.toUpperCase() },
      include: [
        {
          model: PsychologyPackage,
          as: 'package',
          include: [
            {
              model: PsychologyPackageItem,
              as: 'items',
              include: [
                {
                  model: PsychologyTestType,
                  as: 'testType'
                }
              ]
            }
          ]
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex']
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'logo']
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Check validity
    if (!invitation.isValid()) {
      return res.status(403).json({
        success: false,
        message: invitation.getValidationError(),
        code: 'INVITATION_INVALID'
      });
    }

    // Prepare test list from package
    const tests = invitation.package?.items?.map(item => ({
      code: item.testType?.code,
      name: item.testType?.name,
      estimatedMinutes: item.testType?.estimatedDuration || 0
    })) || [];

    const totalMinutes = tests.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

    // Build response data
    const responseData = {
      invitation: {
        code: invitation.code,
        invitationType: invitation.invitationType,
        name: invitation.name,
        description: invitation.description,
        welcomeMessage: invitation.welcomeMessage
      },
      organization: {
        name: invitation.tenant?.name,
        logo: invitation.tenant?.logo
      },
      package: {
        name: invitation.package?.name,
        description: invitation.package?.description,
        tests,
        totalTests: tests.length,
        totalMinutes
      },
      registration: {
        requiredFields: invitation.requireFields,
        customFields: invitation.customFields
      },
      remainingSlots: invitation.getRemainingSlots(),
      expiresAt: invitation.expiresAt
    };

    // Add patient data for single_patient invitations
    if (invitation.invitationType === 'single_patient' && invitation.patient) {
      responseData.patient = {
        id: invitation.patient.id,
        name: invitation.patient.fullName,
        email: invitation.patient.email,
        phone: invitation.patient.phone,
        birthDate: invitation.patient.birthDate,
        sex: invitation.patient.sex
      };
    }

    res.json({
      success: true,
      data: responseData
    });

    logger.logInfo('Public invitation info retrieved', {
      action: 'PSYCHOLOGY_PUBLIC_GET_INVITATION',
      tenantId: invitation.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { invitationCode: code, remainingSlots: invitation.getRemainingSlots() }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register candidate via invitation
 * Creates Patient + Order + Sessions, returns access token
 */
async function registerViaInvitation(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { code } = req.params;
    const registrationData = req.body;

    // Find and validate invitation
    const invitation = await PsychologyInvitation.findOne({
      where: { code: code.toUpperCase() },
      include: [
        {
          model: PsychologyPackage,
          as: 'package',
          include: [
            {
              model: PsychologyPackageItem,
              as: 'items',
              include: [
                { model: PsychologyTestType, as: 'testType' }
              ]
            }
          ]
        }
      ],
      transaction
    });

    if (!invitation) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (!invitation.isValid()) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: invitation.getValidationError(),
        code: 'INVITATION_INVALID'
      });
    }

    // Validate required fields
    const missingFields = [];
    for (const field of invitation.requireFields) {
      if (!registrationData[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: missingFields.map(f => ({ field: f, message: `${f} is required` }))
      });
    }

    // Check for duplicate email within same tenant
    if (registrationData.email) {
      const existingPatient = await Patient.findOne({
        where: {
          tenantId: invitation.tenantId,
          email: registrationData.email.toLowerCase()
        },
        transaction
      });

      if (existingPatient) {
        // Check if already has active order for this invitation
        const existingOrder = await PsychologyOrder.findOne({
          where: {
            patientId: existingPatient.id,
            invitationId: invitation.id
          },
          include: [
            {
              model: PsychologySession,
              as: 'sessions',
              include: [
                { 
                  model: PsychologyTestType, 
                  as: 'testType',
                  attributes: ['id', 'code', 'name', 'estimatedDuration', 'config']
                }
              ]
            }
          ],
          transaction
        });

        if (existingOrder) {
          // Check if access token is expired
          const isTokenExpired = !existingOrder.isAccessValid();
          
          // If token expired, regenerate it automatically
          if (isTokenExpired) {
            const newAccessToken = PsychologyOrder.generateAccessToken();
            const newExpiresAt = invitation.getTestExpiryDate();
            
            await existingOrder.update({
              accessToken: newAccessToken,
              expiresAt: newExpiresAt
            }, { transaction });
            
            await transaction.commit();
            
            // Calculate progress
            const totalTests = existingOrder.sessions?.length || 0;
            const completedTests = existingOrder.sessions?.filter(s => s.status === 'completed').length || 0;
            
            logger.logInfo('Access token regenerated for existing invitation order', {
              action: 'PSYCHOLOGY_INVITATION_TOKEN_REGENERATE',
              tenantId: invitation.tenantId,
              ip: getClientIp(req),
              userAgent: getUserAgent(req),
              metadata: { 
                orderId: existingOrder.id, 
                orderNumber: existingOrder.orderNumber,
                invitationCode: code,
                email: existingPatient.email 
              }
            });
            
            return res.status(200).json({
              success: true,
              message: 'Your access token has been renewed. You can continue your test.',
              code: 'TOKEN_RENEWED',
              data: {
                patient: {
                  id: existingPatient.id,
                  fullName: existingPatient.fullName,
                  email: existingPatient.email
                },
                order: {
                  id: existingOrder.id,
                  orderNumber: existingOrder.orderNumber,
                  status: existingOrder.status
                },
                access: {
                  token: newAccessToken,
                  expiresAt: newExpiresAt,
                  url: `${process.env.PUBLIC_URL || ''}/test/${newAccessToken}`,
                  renewed: true,
                  previouslyExpiredAt: existingOrder.expiresAt
                },
                sessions: existingOrder.sessions?.map(s => ({
                  id: s.id,
                  sessionToken: s.sessionToken,
                  status: s.status,
                  startedAt: s.startedAt,
                  completedAt: s.completedAt,
                  testType: {
                    code: s.testType?.code,
                    name: s.testType?.name,
                    estimatedDuration: s.testType?.estimatedDuration,
                    timeLimit: s.testType?.config?.timeLimit || null
                  }
                })) || [],
                progress: {
                  total: totalTests,
                  completed: completedTests,
                  percentage: totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
                },
                totalTests
              }
            });
          }
          
          // Token still valid, return existing access
          await transaction.rollback();
          
          // Calculate progress
          const totalTests = existingOrder.sessions?.length || 0;
          const completedTests = existingOrder.sessions?.filter(s => s.status === 'completed').length || 0;
          
          return res.status(409).json({
            success: false,
            message: 'You have already registered for this test',
            code: 'ALREADY_REGISTERED',
            data: {
              patient: {
                id: existingPatient.id,
                fullName: existingPatient.fullName,
                email: existingPatient.email
              },
              order: {
                id: existingOrder.id,
                orderNumber: existingOrder.orderNumber,
                status: existingOrder.status
              },
              access: {
                token: existingOrder.accessToken,
                expiresAt: existingOrder.expiresAt,
                url: `${process.env.PUBLIC_URL || ''}/test/${existingOrder.accessToken}`
              },
              sessions: existingOrder.sessions?.map(s => ({
                id: s.id,
                sessionToken: s.sessionToken,
                status: s.status,
                startedAt: s.startedAt,
                completedAt: s.completedAt,
                testType: {
                  code: s.testType?.code,
                  name: s.testType?.name,
                  estimatedDuration: s.testType?.estimatedDuration,
                  timeLimit: s.testType?.config?.timeLimit || null
                }
              })) || [],
              progress: {
                total: totalTests,
                completed: completedTests,
                percentage: totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
              },
              totalTests
            }
          });
        }
      }
    }

    // Create or update patient
    let patient;
    if (registrationData.email) {
      patient = await Patient.findOne({
        where: {
          tenantId: invitation.tenantId,
          email: registrationData.email.toLowerCase()
        },
        transaction
      });
    }

    if (!patient) {
      // Build personalData from registration fields
      const personalData = {};
      
      // If personalData object is sent directly, use it as base
      if (registrationData.personalData && typeof registrationData.personalData === 'object') {
        Object.assign(personalData, registrationData.personalData);
      }
      
      // Also check for individual fields (backward compatibility)
      if (registrationData.education) personalData.education = registrationData.education;
      if (registrationData.occupation) personalData.occupation = registrationData.occupation;
      if (registrationData.maritalStatus) personalData.maritalStatus = registrationData.maritalStatus;
      if (registrationData.religion) personalData.religion = registrationData.religion;
      if (registrationData.nationality) personalData.nationality = registrationData.nationality;
      
      // Include any custom fields from invitation
      if (invitation.customFields && Array.isArray(invitation.customFields)) {
        for (const field of invitation.customFields) {
          const fieldName = typeof field === 'string' ? field : field.name;
          if (registrationData[fieldName] !== undefined) {
            personalData[fieldName] = registrationData[fieldName];
          }
        }
      }

      patient = await Patient.create({
        tenantId: invitation.tenantId,
        fullName: registrationData.fullName,
        email: registrationData.email?.toLowerCase(),
        phone: registrationData.phone,
        birthDate: registrationData.birthDate,
        sex: registrationData.sex,
        address: registrationData.address,
        personalData
      }, { transaction });
    } else {
      // Update existing patient info
      const personalDataUpdate = { ...patient.personalData };
      
      // If personalData object is sent directly, merge it
      if (registrationData.personalData && typeof registrationData.personalData === 'object') {
        Object.assign(personalDataUpdate, registrationData.personalData);
      }
      
      // Also check for individual fields (backward compatibility)
      if (registrationData.education) personalDataUpdate.education = registrationData.education;
      if (registrationData.occupation) personalDataUpdate.occupation = registrationData.occupation;
      if (registrationData.maritalStatus) personalDataUpdate.maritalStatus = registrationData.maritalStatus;
      if (registrationData.religion) personalDataUpdate.religion = registrationData.religion;
      if (registrationData.nationality) personalDataUpdate.nationality = registrationData.nationality;

      await patient.update({
        fullName: registrationData.fullName || patient.fullName,
        phone: registrationData.phone || patient.phone,
        birthDate: registrationData.birthDate || patient.birthDate,
        sex: registrationData.sex || patient.sex,
        address: registrationData.address || patient.address,
        personalData: personalDataUpdate
      }, { transaction });
    }

    // Generate access token
    const accessToken = PsychologyOrder.generateAccessToken();
    const expiresAt = invitation.getTestExpiryDate();

    // Get package price (for display purposes, even though payment is waived)
    const packagePrice = parseFloat(invitation.package.basePrice) || 0;

    // Create order
    const order = await PsychologyOrder.create({
      tenantId: invitation.tenantId,
      orderNumber: PsychologyOrder.generateOrderNumber(invitation.tenantId),
      patientId: patient.id,
      packageId: invitation.packageId,
      invitationId: invitation.id,
      baseAmount: packagePrice,           // Original package price
      discountAmount: 0,                  // No discount (to show full value in revenue)
      finalAmount: packagePrice,          // Count as revenue (even though payment is waived)
      status: 'paid',                     // Auto-paid for invitation flow
      paymentMethod: 'invitation',        // Mark as invitation-based (no actual payment)
      paidAt: new Date(),
      accessToken,
      expiresAt,
      registrationData: {
        ...registrationData,
        customFieldValues: extractCustomFields(registrationData, invitation.customFields)
      },
      notes: `Registered via invitation: ${invitation.code} (Payment waived - invitation link)`,
      metadata: {
        invitationCode: invitation.code,
        registeredAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        paymentWaived: true,
        originalPrice: packagePrice,
        isInvitationOrder: true          // Flag untuk identifikasi
      }
    }, { transaction });

    // Create sessions for each test in package
    const sessions = [];
    let sessionNumber = 1;
    for (const item of invitation.package.items) {
      // Generate unique session token
      const sessionToken = accessTokenService.generateAccessToken();
      
      const session = await PsychologySession.create({
        tenantId: invitation.tenantId,
        orderId: order.id,
        testTypeId: item.testTypeId,
        sessionToken,
        sessionNumber: sessionNumber++,
        status: 'pending'
      }, { transaction });
      
      sessions.push({
        id: session.id,
        sessionToken: session.sessionToken,
        testType: {
          code: item.testType.code,
          name: item.testType.name,
          estimatedMinutes: item.testType.estimatedDuration || 0
        },
        status: session.status
      });
    }

    // Increment invitation usage
    await invitation.increment('usedCount', { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: invitation.successMessage || 'Registration successful! You can now start the test.',
      data: {
        patient: {
          id: patient.id,
          fullName: patient.fullName,
          email: patient.email
        },
        order: {
          id: order.id,
          orderNumber: order.orderNumber
        },
        access: {
          token: accessToken,
          expiresAt: expiresAt,
          url: `${process.env.PUBLIC_URL || ''}/test/${accessToken}`
        },
        sessions,
        totalTests: sessions.length
      }
    });

    logger.logAudit('Public registration via invitation completed', {
      action: 'PSYCHOLOGY_PUBLIC_REGISTER_INVITATION',
      tenantId: invitation.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        invitationCode: code, 
        patientId: patient.id, 
        orderId: order.id,
        orderNumber: order.orderNumber,
        sessionsCount: sessions.length 
      }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/**
 * Helper: Extract custom field values
 */
function extractCustomFields(data, customFieldsDef) {
  if (!customFieldsDef || !Array.isArray(customFieldsDef)) return {};
  
  const values = {};
  for (const field of customFieldsDef) {
    const fieldName = typeof field === 'string' ? field : field.name;
    if (data[fieldName] !== undefined) {
      values[fieldName] = data[fieldName];
    }
  }
  return values;
}

/**
 * Start session (public access)
 * Explicitly starts a session - sets status to in_progress
 */
async function startSession(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    
    // Validate token
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken }
    });
    
    if (!order || !order.isAccessValid() || !['paid', 'in_progress'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access'
      });
    }
    
    // Get session
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
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
        message: 'Test already completed'
      });
    }
    
    if (session.status === 'in_progress') {
      // Already started, return current state
      return res.json({
        success: true,
        message: 'Session already started',
        data: {
          sessionId: session.id,
          status: session.status,
          startedAt: session.startedAt,
          testType: {
            code: session.testType?.code,
            name: session.testType?.name,
            estimatedDuration: session.testType?.estimatedDuration,
            timeLimit: session.testType?.config?.timeLimit || null
          },
          savedAnswers: session.answers || {},
          currentQuestion: session.currentQuestion,
          timeSpent: session.timeSpent
        }
      });
    }
    
    // Start the session
    session.status = 'in_progress';
    session.startedAt = new Date();
    session.ipAddress = getClientIp(req);
    session.userAgent = getUserAgent(req);
    await session.save();
    
    // Update order status if this is the first session started
    if (order.status === 'paid') {
      order.status = 'in_progress';
      await order.save();
    }
    
    res.json({
      success: true,
      message: 'Session started',
      data: {
        sessionId: session.id,
        status: session.status,
        startedAt: session.startedAt,
        testType: {
          code: session.testType?.code,
          name: session.testType?.name,
          estimatedDuration: session.testType?.estimatedDuration,
          timeLimit: session.testType?.config?.timeLimit || null
        },
        savedAnswers: {},
        currentQuestion: 0,
        timeSpent: 0
      }
    });

    logger.logInfo('Public session started', {
      action: 'PSYCHOLOGY_PUBLIC_SESSION_START',
      tenantId: order.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { orderId: order.id, sessionId, testType: session.testType?.code }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Invitation-based flow (NEW)
  getInvitation,
  registerViaInvitation,
  
  // Access token flow (existing)
  validateToken,
  startSession,
  getQuestions,
  saveProgress,
  submitAnswers,
  getResult
};
