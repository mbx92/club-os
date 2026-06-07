'use strict';

/**
 * Session Progress Monitor Controller
 * 
 * Real-time monitoring untuk progress test session (especially CFIT)
 * Menampilkan:
 * - Jumlah soal terjawab
 * - Sisa timer subtest
 * - Current position
 * - Last activity
 */

const db = require('../../../models');
const { PsychologySession, PsychologyOrder, PsychologyTestType } = db;
const logger = require('../../../utils/logger');

// Store active SSE connections per session
const activeProgressMonitors = new Map();

/**
 * Verify JWT token from query parameter (for SSE which doesn't support headers)
 */
async function verifyTokenFromQuery(token) {
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await db.User.findByPk(decoded.id, {
      include: [
        { model: db.Tenant, as: 'tenant' },
        { model: db.Role, as: 'role' }
      ]
    });
    
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Get current session progress data
 */
async function getSessionProgress(session) {
  // Parse config and questions
  let config = session.testType.config;
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (e) {
      config = {};
    }
  }

  let questions = session.testType.questions;
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch (e) {
      questions = [];
    }
  }

  // Count questions (exclude instructions)
  const totalQuestions = Array.isArray(questions) 
    ? questions.filter(q => q.type === 'question').length 
    : 0;

  // Count answered questions
  const answers = session.answers || {};
  const answeredCount = typeof answers === 'object' ? Object.keys(answers).length : 0;

  // Get metadata (for CFIT timer info)
  const metadata = session.metadata || {};
  const subtestTimers = metadata.subtestTimers || null;
  const currentSubtest = metadata.currentSubtest || null;
  const currentQuestionIndex = metadata.currentQuestionIndex || 0;
  const lastSavedAt = metadata.lastSavedAt || null;

  // Calculate progress percentage
  const progressPercentage = totalQuestions > 0 
    ? Math.round((answeredCount / totalQuestions) * 100) 
    : 0;

  // Get elapsed time
  const startedAt = session.startedAt ? new Date(session.startedAt) : null;
  const now = new Date();
  const elapsedSeconds = startedAt 
    ? Math.floor((now - startedAt) / 1000) 
    : 0;

  return {
    sessionId: session.id,
    status: session.status,
    testType: {
      code: session.testType.code,
      name: session.testType.name
    },
    patient: session.order?.patient ? {
      fullName: session.order.patient.fullName,
      email: session.order.patient.email
    } : null,
    progress: {
      totalQuestions,
      answeredCount,
      unansweredCount: totalQuestions - answeredCount,
      progressPercentage
    },
    timing: {
      startedAt: session.startedAt,
      elapsedSeconds,
      lastActivityAt: session.lastActivityAt,
      lastSavedAt
    },
    cfit: {
      currentSubtest,
      currentQuestionIndex,
      subtestTimers // { series: 540, classification: 600, ... }
    },
    updatedAt: session.updatedAt
  };
}

/**
 * Stream session progress in real-time (SSE)
 * GET /psychology/sessions/:sessionId/progress/stream
 * 
 * Admin can monitor test progress in real-time:
 * - How many questions answered
 * - Current subtest timer (for CFIT)
 * - Last activity timestamp
 * - Auto-update when session data changes
 * 
 * @access Private (Admin) - Auth via query token (?token=JWT)
 */
async function streamSessionProgress(req, res, next) {
  try {
    // Get user from middleware or from query token
    let user = req.user;
    
    if (!user && req.query.token) {
      user = await verifyTokenFromQuery(req.query.token);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - token required'
      });
    }
    
    const { tenantId, isSuperAdmin } = user;
    const { sessionId } = req.params;

    // Verify session access
    const sessionWhere = { id: sessionId };
    if (!isSuperAdmin) {
      sessionWhere.tenantId = tenantId;
    }

    const session = await PsychologySession.findOne({
      where: sessionWhere,
      include: [
        { model: PsychologyTestType, as: 'testType' },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            {
              model: db.Patient,
              as: 'patient',
              attributes: ['id', 'fullName', 'email']
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

    // Set SSE headers with CORS support
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial progress data
    const initialProgress = await getSessionProgress(session);
    const initialEvent = {
      type: 'connected',
      data: initialProgress,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

    // Create connection ID
    const connectionId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store connection info
    if (!activeProgressMonitors.has(sessionId)) {
      activeProgressMonitors.set(sessionId, new Map());
    }
    
    activeProgressMonitors.get(sessionId).set(connectionId, {
      res,
      connectedAt: new Date(),
      lastUpdate: new Date()
    });

    logger.logInfo('SSE progress monitor connected', {
      action: 'SESSION_PROGRESS_MONITOR_CONNECTED',
      metadata: { sessionId, connectionId, testType: session.testType.code }
    });

    // Send periodic updates every 5 seconds
    const updateInterval = setInterval(async () => {
      try {
        // Reload session to get latest data
        await session.reload({
          include: [
            { model: PsychologyTestType, as: 'testType' },
            { 
              model: PsychologyOrder, 
              as: 'order',
              include: [
                {
                  model: db.Patient,
                  as: 'patient',
                  attributes: ['id', 'fullName', 'email']
                }
              ]
            }
          ]
        });

        const progressData = await getSessionProgress(session);
        const progressEvent = {
          type: 'progress',
          data: progressData,
          timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
      } catch (err) {
        clearInterval(updateInterval);
        logger.logError('Error sending progress update', {
          action: 'SESSION_PROGRESS_UPDATE_ERROR',
          metadata: { sessionId, connectionId },
          error: err.message
        });
      }
    }, 5000); // Update every 5 seconds

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
        clearInterval(updateInterval);
      }
    }, 30000);

    // Cleanup on connection close
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      clearInterval(updateInterval);
      
      if (activeProgressMonitors.has(sessionId)) {
        activeProgressMonitors.get(sessionId).delete(connectionId);
        if (activeProgressMonitors.get(sessionId).size === 0) {
          activeProgressMonitors.delete(sessionId);
        }
      }

      logger.logInfo('SSE progress monitor disconnected', {
        action: 'SESSION_PROGRESS_MONITOR_DISCONNECTED',
        metadata: { sessionId, connectionId }
      });
    });

  } catch (err) {
    logger.logError('Failed to setup progress monitor stream', {
      action: 'SESSION_PROGRESS_MONITOR_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Broadcast progress update to all active monitors for a session
 * Called internally when session is updated (e.g., after save progress)
 */
async function broadcastProgressUpdate(sessionId) {
  if (!activeProgressMonitors.has(sessionId)) {
    return;
  }

  try {
    // Get session data
    const session = await PsychologySession.findOne({
      where: { id: sessionId },
      include: [
        { model: PsychologyTestType, as: 'testType' },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            {
              model: db.Patient,
              as: 'patient',
              attributes: ['id', 'fullName', 'email']
            }
          ]
        }
      ]
    });

    if (!session) return;

    const progressData = await getSessionProgress(session);
    const event = {
      type: 'progress',
      data: progressData,
      timestamp: new Date().toISOString()
    };
    const message = `data: ${JSON.stringify(event)}\n\n`;

    const connections = activeProgressMonitors.get(sessionId);
    for (const [connectionId, connection] of connections) {
      try {
        connection.res.write(message);
        connection.lastUpdate = new Date();
      } catch (err) {
        // Remove broken connection
        connections.delete(connectionId);
        logger.logError('Failed to broadcast progress update', {
          action: 'SESSION_PROGRESS_BROADCAST_ERROR',
          metadata: { sessionId, connectionId },
          error: err.message
        });
      }
    }
  } catch (err) {
    logger.logError('Failed to broadcast progress update', {
      action: 'SESSION_PROGRESS_BROADCAST_ERROR',
      metadata: { sessionId },
      error: err.message
    });
  }
}

/**
 * Get active progress monitor connections
 * GET /psychology/session-progress/monitors
 */
async function getActiveMonitors(req, res, next) {
  try {
    const monitors = [];
    for (const [sessionId, connections] of activeProgressMonitors) {
      for (const [connectionId, connection] of connections) {
        monitors.push({
          sessionId,
          connectionId,
          connectedAt: connection.connectedAt,
          lastUpdate: connection.lastUpdate
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalConnections: monitors.length,
        totalSessions: activeProgressMonitors.size,
        monitors
      }
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  streamSessionProgress,
  broadcastProgressUpdate,
  getActiveMonitors
};
