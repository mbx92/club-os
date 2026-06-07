'use strict';

/**
 * Session Log Controller
 * 
 * Handles test session logging for both public (test-takers) and admin access
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { PsychologySession, PsychologyOrder, TestSessionLog } = db;
const { accessTokenService } = require('../services');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

// Configuration
const MAX_BATCH_SIZE = 100; // Maximum logs per batch request
const MAX_LOG_SIZE_KB = 50; // Maximum size per log data field in KB

// Valid event types for client logging
const VALID_EVENT_TYPES = [
  // Session lifecycle
  'test_started',
  'test_resumed',
  'test_paused',
  'test_submitted',
  'test_completed',
  'test_timeout',
  
  // Question interaction
  'question_viewed',
  'question_answered',
  'question_changed',
  'question_skipped',
  
  // Navigation
  'page_navigation',
  'section_started',
  'section_completed',
  
  // Focus/visibility
  'page_focus',
  'page_blur',
  'tab_hidden',
  'tab_visible',
  'window_minimized',
  'window_restored',
  
  // Warnings/violations
  'focus_warning',
  'time_warning',
  'copy_attempt',
  'paste_attempt',
  'screenshot_attempt',
  
  // Client events
  'client_error',
  'network_error',
  'auto_save',
  'manual_save',
  
  // Custom
  'custom'
];

/**
 * Create session log (public access via token)
 * POST /psychology/public/access/:token/session/:sessionId/log
 */
async function createPublicLog(req, res, next) {
  try {
    const { token, sessionId } = req.params;
    const { level = 'info', eventType, message, data, clientTimestamp, logs } = req.body;

    // Validate token
    const normalizedToken = accessTokenService.formatToken(token);
    
    const order = await PsychologyOrder.findOne({
      where: { accessToken: normalizedToken },
      attributes: ['id', 'tenantId', 'status', 'expiresAt']
    });

    if (!order || !order.isAccessValid() || !['paid', 'in_progress', 'completed'].includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Verify session belongs to this order
    const session = await PsychologySession.findOne({
      where: { id: sessionId, orderId: order.id },
      attributes: ['id', 'tenantId', 'status']
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Handle batch logs
    if (Array.isArray(logs) && logs.length > 0) {
      // Validate batch size to prevent stack overflow
      if (logs.length > MAX_BATCH_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Batch size too large. Maximum ${MAX_BATCH_SIZE} logs per request`,
          data: { maxBatchSize: MAX_BATCH_SIZE, received: logs.length }
        });
      }

      // Validate and sanitize log entries
      const logEntries = [];
      for (const log of logs) {
        // Validate data size to prevent memory issues
        const dataSize = JSON.stringify(log.data || {}).length / 1024;
        if (dataSize > MAX_LOG_SIZE_KB) {
          logger.logWarn('Log data too large, truncating', {
            action: 'SESSION_LOG_SIZE_WARNING',
            sessionId: session.id,
            dataSize: `${dataSize.toFixed(2)}KB`,
            maxSize: `${MAX_LOG_SIZE_KB}KB`
          });
          continue; // Skip oversized logs
        }

        logEntries.push({
          sessionId: session.id,
          tenantId: session.tenantId,
          level: ['debug', 'info', 'warn', 'error'].includes(log.level) ? log.level : 'info',
          eventType: VALID_EVENT_TYPES.includes(log.eventType) ? log.eventType : 'custom',
          message: log.message || null,
          data: log.data || {},
          clientTimestamp: log.clientTimestamp ? new Date(log.clientTimestamp) : null,
          ipAddress,
          userAgent
        });
      }

      if (logEntries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid logs to create'
        });
      }

      const createdLogs = await TestSessionLog.bulkCreate(logEntries, { returning: true });

      // Broadcast logs in smaller chunks to prevent stack overflow
      const BROADCAST_CHUNK_SIZE = 20;
      for (let i = 0; i < createdLogs.length; i += BROADCAST_CHUNK_SIZE) {
        const chunk = createdLogs.slice(i, i + BROADCAST_CHUNK_SIZE);
        
        // Use setImmediate to prevent blocking event loop
        setImmediate(() => {
          chunk.forEach(log => {
            broadcastLogToSession(session.id, {
              id: log.id,
              level: log.level,
              eventType: log.eventType,
              message: log.message,
              data: log.data,
              clientTimestamp: log.clientTimestamp,
              ipAddress: log.ipAddress,
              createdAt: log.createdAt
            });
          });
        });
      }

      return res.status(201).json({
        success: true,
        message: `${logEntries.length} logs created`,
        data: { 
          count: logEntries.length,
          skipped: logs.length - logEntries.length 
        }
      });
    }

    // Handle single log
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'eventType is required'
      });
    }

    // Validate data size for single log
    const dataSize = JSON.stringify(data || {}).length / 1024;
    if (dataSize > MAX_LOG_SIZE_KB) {
      return res.status(400).json({
        success: false,
        message: `Log data too large. Maximum ${MAX_LOG_SIZE_KB}KB per log`,
        data: { maxSize: MAX_LOG_SIZE_KB, received: dataSize.toFixed(2) }
      });
    }

    const logEntry = await TestSessionLog.create({
      sessionId: session.id,
      tenantId: session.tenantId,
      level: ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info',
      eventType: VALID_EVENT_TYPES.includes(eventType) ? eventType : 'custom',
      message: message || null,
      data: data || {},
      clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : null,
      ipAddress,
      userAgent
    });

    // Broadcast to SSE connections
    broadcastLogToSession(session.id, {
      id: logEntry.id,
      level: logEntry.level,
      eventType: logEntry.eventType,
      message: logEntry.message,
      data: logEntry.data,
      clientTimestamp: logEntry.clientTimestamp,
      ipAddress: logEntry.ipAddress,
      createdAt: logEntry.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Log created',
      data: {
        id: logEntry.id,
        createdAt: logEntry.createdAt
      }
    });

  } catch (err) {
    logger.logError('Failed to create public session log', {
      action: 'SESSION_LOG_CREATE_PUBLIC_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Get session logs (admin access)
 * GET /psychology/session-logs
 */
async function getSessionLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 50,
      sessionId,
      orderId,
      level,
      eventType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    // Tenant filter (unless super admin)
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Session filter
    if (sessionId) {
      where.sessionId = sessionId;
    }

    // Level filter
    if (level) {
      const levels = level.split(',').filter(l => ['debug', 'info', 'warn', 'error'].includes(l));
      if (levels.length > 0) {
        where.level = { [Op.in]: levels };
      }
    }

    // Event type filter
    if (eventType) {
      const eventTypes = eventType.split(',');
      where.eventType = { [Op.in]: eventTypes };
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

    // If orderId provided, get all sessions for that order first
    if (orderId) {
      const sessions = await PsychologySession.findAll({
        where: { orderId },
        attributes: ['id']
      });
      const sessionIds = sessions.map(s => s.id);
      where.sessionId = { [Op.in]: sessionIds };
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['createdAt', 'level', 'eventType', 'clientTimestamp'];
    const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get logs with session info
    const { rows: logs, count: total } = await TestSessionLog.findAndCountAll({
      where,
      include: [
        {
          model: PsychologySession,
          as: 'session',
          attributes: ['id', 'status', 'sessionNumber', 'subject'],
          include: [
            {
              model: db.PsychologyTestType,
              as: 'testType',
              attributes: ['id', 'code', 'name']
            },
            {
              model: PsychologyOrder,
              as: 'order',
              attributes: ['id', 'orderNumber', 'accessToken'],
              include: [
                {
                  model: db.Patient,
                  as: 'patient',
                  attributes: ['id', 'fullName', 'email']
                }
              ]
            }
          ]
        }
      ],
      order: [[orderColumn, orderDirection]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        logs: logs.map(log => {
          const session = log.session;
          const order = session?.order;
          const patient = order?.patient;
          
          // Get patient name from order.patient or session.subject
          const patientName = patient?.fullName || session?.subject?.name || session?.subject?.fullName || null;
          
          return {
            id: log.id,
            sessionId: log.sessionId,
            level: log.level,
            eventType: log.eventType,
            message: log.message,
            data: log.data,
            clientTimestamp: log.clientTimestamp,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            createdAt: log.createdAt,
            session: session ? {
              id: session.id,
              status: session.status,
              sessionNumber: session.sessionNumber,
              testType: session.testType,
              orderNumber: order?.orderNumber || null,
              accessToken: order?.accessToken || null,
              patientName,
              patientEmail: patient?.email || session?.subject?.email || null
            } : null
          };
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (err) {
    logger.logError('Failed to get session logs', {
      action: 'SESSION_LOG_GET_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Get logs for specific session (admin access)
 * GET /psychology/sessions/:sessionId/logs
 */
async function getLogsForSession(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionId } = req.params;
    const { level, eventType, limit = 100 } = req.query;

    // Verify session access
    const sessionWhere = { id: sessionId };
    if (!isSuperAdmin) {
      sessionWhere.tenantId = tenantId;
    }

    const session = await PsychologySession.findOne({
      where: sessionWhere,
      attributes: ['id', 'status', 'sessionNumber', 'subject'],
      include: [
        { model: db.PsychologyTestType, as: 'testType', attributes: ['id', 'code', 'name'] },
        { 
          model: PsychologyOrder, 
          as: 'order', 
          attributes: ['id', 'orderNumber', 'accessToken'],
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

    // Get patient info
    const order = session.order;
    const patient = order?.patient;
    const patientName = patient?.fullName || session.subject?.name || session.subject?.fullName || null;

    // Build log filter
    const logWhere = { sessionId };

    if (level) {
      const levels = level.split(',').filter(l => ['debug', 'info', 'warn', 'error'].includes(l));
      if (levels.length > 0) {
        logWhere.level = { [Op.in]: levels };
      }
    }

    if (eventType) {
      const eventTypes = eventType.split(',');
      logWhere.eventType = { [Op.in]: eventTypes };
    }

    const logs = await TestSessionLog.findAll({
      where: logWhere,
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    // Calculate summary
    const summary = {
      total: logs.length,
      byLevel: {},
      byEventType: {}
    };

    logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byEventType[log.eventType] = (summary.byEventType[log.eventType] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          sessionNumber: session.sessionNumber,
          testType: session.testType,
          orderNumber: order?.orderNumber || null,
          accessToken: order?.accessToken || null,
          patientName,
          patientEmail: patient?.email || session.subject?.email || null
        },
        logs: logs.map(log => ({
          id: log.id,
          level: log.level,
          eventType: log.eventType,
          message: log.message,
          data: log.data,
          clientTimestamp: log.clientTimestamp,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt
        })),
        summary
      }
    });

  } catch (err) {
    logger.logError('Failed to get logs for session', {
      action: 'SESSION_LOG_GET_FOR_SESSION_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Get log statistics (admin access)
 * GET /psychology/session-logs/stats
 */
async function getLogStats(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate, sessionId } = req.query;

    // Build where clause
    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // Get counts by level
    const levelCounts = await TestSessionLog.findAll({
      where,
      attributes: [
        'level',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['level'],
      raw: true
    });

    // Get counts by event type
    const eventTypeCounts = await TestSessionLog.findAll({
      where,
      attributes: [
        'eventType',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['eventType'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      limit: 20,
      raw: true
    });

    // Get total count
    const totalCount = await TestSessionLog.count({ where });

    // Get unique sessions
    const uniqueSessions = await TestSessionLog.count({
      where,
      distinct: true,
      col: 'sessionId'
    });

    res.json({
      success: true,
      data: {
        total: totalCount,
        uniqueSessions,
        byLevel: levelCounts.reduce((acc, curr) => {
          acc[curr.level] = parseInt(curr.count);
          return acc;
        }, {}),
        byEventType: eventTypeCounts.map(e => ({
          eventType: e.eventType,
          count: parseInt(e.count)
        }))
      }
    });

  } catch (err) {
    logger.logError('Failed to get log stats', {
      action: 'SESSION_LOG_STATS_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Delete old logs (admin/cleanup)
 * DELETE /psychology/session-logs/cleanup
 */
async function cleanupOldLogs(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { olderThanDays = 90 } = req.body;

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can cleanup logs'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));

    const where = {
      createdAt: { [Op.lt]: cutoffDate }
    };

    // Only cleanup debug and info logs, keep warn and error
    where.level = { [Op.in]: ['debug', 'info'] };

    const deletedCount = await TestSessionLog.destroy({ where });

    logger.logInfo('Session logs cleanup completed', {
      action: 'SESSION_LOG_CLEANUP',
      metadata: { deletedCount, olderThanDays, cutoffDate }
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} old logs`,
      data: {
        deletedCount,
        cutoffDate
      }
    });

  } catch (err) {
    logger.logError('Failed to cleanup logs', {
      action: 'SESSION_LOG_CLEANUP_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

// Store active SSE connections per session
const activeConnections = new Map();

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
 * Stream session logs in real-time (SSE)
 * GET /psychology/sessions/:sessionId/logs/stream
 * 
 * Supports auth via:
 * - req.user (from authenticate middleware)
 * - ?token=JWT (query parameter for EventSource)
 */
async function streamSessionLogs(req, res, next) {
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
    const { level } = req.query;

    // Verify session access
    const sessionWhere = { id: sessionId };
    if (!isSuperAdmin) {
      sessionWhere.tenantId = tenantId;
    }

    const session = await PsychologySession.findOne({
      where: sessionWhere,
      attributes: ['id', 'status', 'sessionNumber', 'subject'],
      include: [
        { model: db.PsychologyTestType, as: 'testType', attributes: ['id', 'code', 'name'] },
        { 
          model: PsychologyOrder, 
          as: 'order', 
          attributes: ['id', 'orderNumber', 'accessToken'],
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

    // Get patient info
    const order = session.order;
    const patient = order?.patient;
    const patientName = patient?.fullName || session.subject?.name || session.subject?.fullName || null;

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

    // Send initial connection message with session info
    const sessionInfo = {
      type: 'connected',
      session: {
        id: session.id,
        status: session.status,
        sessionNumber: session.sessionNumber,
        testType: session.testType,
        orderNumber: order?.orderNumber || null,
        accessToken: order?.accessToken || null,
        patientName,
        patientEmail: patient?.email || session.subject?.email || null
      },
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(sessionInfo)}\n\n`);

    // Create connection ID
    const connectionId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store connection info
    if (!activeConnections.has(sessionId)) {
      activeConnections.set(sessionId, new Map());
    }
    
    const levelFilter = level ? level.split(',').filter(l => ['debug', 'info', 'warn', 'error'].includes(l)) : null;
    
    activeConnections.get(sessionId).set(connectionId, {
      res,
      levelFilter,
      connectedAt: new Date()
    });

    logger.logInfo('SSE connection established for session logs', {
      action: 'SESSION_LOG_STREAM_CONNECTED',
      metadata: { sessionId, connectionId, levelFilter }
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Cleanup on connection close
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      
      if (activeConnections.has(sessionId)) {
        activeConnections.get(sessionId).delete(connectionId);
        if (activeConnections.get(sessionId).size === 0) {
          activeConnections.delete(sessionId);
        }
      }

      logger.logInfo('SSE connection closed for session logs', {
        action: 'SESSION_LOG_STREAM_DISCONNECTED',
        metadata: { sessionId, connectionId }
      });
    });

  } catch (err) {
    logger.logError('Failed to setup session log stream', {
      action: 'SESSION_LOG_STREAM_ERROR',
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Broadcast new log to all active SSE connections for a session
 * Called internally when a new log is created
 */
function broadcastLogToSession(sessionId, logData) {
  if (!activeConnections.has(sessionId)) {
    return;
  }

  const connections = activeConnections.get(sessionId);
  const event = {
    type: 'log',
    data: logData,
    timestamp: new Date().toISOString()
  };
  const message = `data: ${JSON.stringify(event)}\n\n`;

  for (const [connectionId, connection] of connections) {
    try {
      // Check level filter
      if (connection.levelFilter && !connection.levelFilter.includes(logData.level)) {
        continue;
      }
      connection.res.write(message);
    } catch (err) {
      // Remove broken connection
      connections.delete(connectionId);
      logger.logError('Failed to broadcast to SSE connection', {
        action: 'SESSION_LOG_BROADCAST_ERROR',
        metadata: { sessionId, connectionId },
        error: err.message
      });
    }
  }
}

/**
 * Get active stream connections count
 * GET /psychology/session-logs/streams
 */
async function getActiveStreams(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;

    const streams = [];
    for (const [sessionId, connections] of activeConnections) {
      for (const [connectionId, connection] of connections) {
        streams.push({
          sessionId,
          connectionId,
          connectedAt: connection.connectedAt,
          levelFilter: connection.levelFilter
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalConnections: streams.length,
        totalSessions: activeConnections.size,
        streams
      }
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPublicLog,
  getSessionLogs,
  getLogsForSession,
  getLogStats,
  cleanupOldLogs,
  streamSessionLogs,
  broadcastLogToSession,
  getActiveStreams,
  VALID_EVENT_TYPES
};
