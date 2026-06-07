'use strict';

/**
 * Utility Controller
 * 
 * Admin utilities for psychology module maintenance
 */

const db = require('../../../models');
const { scoringService } = require('../services');
const { PsychologySession, PsychologyOrder, PsychologyTestType, Patient } = db;
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

/**
 * Recalculate session scores
 * POST /psychology/utils/recalculate-scores
 * 
 * Body options:
 * - sessionId: specific session ID
 * - date: YYYY-MM-DD (default: today)
 * - status: ['completed', 'verified'] (default: both)
 * - dryRun: boolean (default: false)
 */
async function recalculateScores(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionId, date, status = ['completed', 'verified'], dryRun = false } = req.body;

    // Build query
    const where = {
      status: { [Op.in]: Array.isArray(status) ? status : [status] },
      answers: { [Op.ne]: null }
    };

    // Add tenant filter if not super admin
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Single session or date range
    if (sessionId) {
      where.id = sessionId;
    } else {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.completedAt = {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay
      };
    }

    // Find sessions
    const sessions = await PsychologySession.findAll({
      where,
      include: [
        { 
          model: PsychologyTestType, 
          as: 'testType',
          attributes: ['id', 'code', 'name', 'questions']
        },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            { 
              model: Patient, 
              as: 'patient',
              attributes: ['id', 'fullName', 'birthDate']
            }
          ]
        }
      ],
      order: [['completedAt', 'ASC']]
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        message: 'No sessions found',
        data: {
          processed: 0,
          updated: 0,
          errors: []
        }
      });
    }

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      sessions: []
    };

    // Process each session
    for (const session of sessions) {
      results.processed++;
      
      try {
        const oldScores = session.scores;
        const oldInterpretation = session.interpretation;

        // Prepare patient info for age-based scoring
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
            questions = [];
          }
        }

        // Recalculate scores
        const scoringResult = scoringService.verifyAndScore(
          session.testType.code,
          session.answers,
          questions,
          patientInfo
        );

        const sessionInfo = {
          id: session.id,
          sessionNumber: session.sessionNumber,
          testType: session.testType.code,
          status: session.status,
          completedAt: session.completedAt,
          patient: session.order?.patient?.fullName,
          oldScores: oldScores,
          newScores: scoringResult.scores,
          oldInterpretation: oldInterpretation,
          newInterpretation: scoringResult.interpretation,
          changed: JSON.stringify(oldScores) !== JSON.stringify(scoringResult.scores)
        };

        if (!dryRun && sessionInfo.changed) {
          session.scores = scoringResult.scores;
          session.interpretation = scoringResult.interpretation;
          await session.save();
          results.updated++;
        } else if (!sessionInfo.changed) {
          results.skipped++;
        }

        results.sessions.push(sessionInfo);
      } catch (error) {
        results.errors.push({
          sessionId: session.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: dryRun 
        ? `Preview: ${results.processed} session(s) would be recalculated, ${results.updated} would change`
        : `Recalculated ${results.processed} session(s), ${results.updated} updated`,
      data: results
    });

    logger.logAudit('Psychology sessions recalculated', {
      action: 'PSYCHOLOGY_UTILS_RECALCULATE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        processed: results.processed, 
        updated: results.updated,
        dryRun,
        sessionId: sessionId || null,
        date: date || 'today'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fix question count (exclude instructions)
 * POST /psychology/utils/fix-question-count
 * 
 * Body options:
 * - testTypeId: specific test type ID
 * - dryRun: boolean (default: false)
 */
async function fixQuestionCount(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { testTypeId, dryRun = false } = req.body;

    // Build query
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (testTypeId) {
      where.id = testTypeId;
    }

    // Get all test types
    const testTypes = await PsychologyTestType.findAll({
      where,
      attributes: ['id', 'tenantId', 'code', 'name', 'questionCount', 'questions']
    });

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      testTypes: []
    };

    for (const testType of testTypes) {
      results.processed++;
      
      const questions = testType.questions || [];
      const actualQuestionCount = questions.filter(q => q.type === 'question').length;
      const totalItems = questions.length;
      const instructionCount = questions.filter(q => q.type === 'instruction').length;
      
      const needsUpdate = testType.questionCount !== actualQuestionCount;
      
      const info = {
        id: testType.id,
        code: testType.code,
        name: testType.name,
        totalItems,
        instructions: instructionCount,
        actualQuestions: actualQuestionCount,
        currentQuestionCount: testType.questionCount,
        needsUpdate,
        newQuestionCount: actualQuestionCount
      };

      if (needsUpdate) {
        if (!dryRun) {
          await testType.update({ questionCount: actualQuestionCount });
          results.updated++;
        }
      } else {
        results.skipped++;
      }

      results.testTypes.push(info);
    }

    res.json({
      success: true,
      message: dryRun
        ? `Preview: ${results.processed} test type(s) checked, ${results.updated} would be updated`
        : `Fixed ${results.processed} test type(s), ${results.updated} updated`,
      data: results
    });

    logger.logAudit('Psychology test types question count fixed', {
      action: 'PSYCHOLOGY_UTILS_FIX_QUESTION_COUNT',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        processed: results.processed, 
        updated: results.updated,
        dryRun,
        testTypeId: testTypeId || 'all'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get session statistics
 * GET /psychology/utils/session-stats
 */
async function getSessionStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    // Get counts by status
    const statusCounts = await PsychologySession.findAll({
      where,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get sessions without scores
    const withoutScores = await PsychologySession.count({
      where: {
        ...where,
        status: { [Op.in]: ['completed', 'verified'] },
        scores: null
      }
    });

    // Get sessions with answers but no interpretation
    const withoutInterpretation = await PsychologySession.count({
      where: {
        ...where,
        status: { [Op.in]: ['completed', 'verified'] },
        answers: { [Op.ne]: null },
        interpretation: null
      }
    });

    // Get sessions by test type
    const byTestType = await PsychologySession.findAll({
      where,
      attributes: [
        [db.sequelize.col('testType.code'), 'testTypeCode'],
        [db.sequelize.col('testType.name'), 'testTypeName'],
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'count']
      ],
      include: [
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: []
        }
      ],
      group: ['testType.code', 'testType.name'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        withoutScores,
        withoutInterpretation,
        byTestType: byTestType.map(item => ({
          code: item.testTypeCode,
          name: item.testTypeName,
          count: parseInt(item.count)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recalculateScores,
  fixQuestionCount,
  getSessionStats
};
