'use strict';

/**
 * Session Cleanup Service
 * 
 * Handles automatic status updates for abandoned/timed-out psychology sessions.
 * Sessions that remain in 'in_progress' or 'started' status without activity
 * will be marked as 'timeout' or 'abandoned'.
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { PsychologySession, PsychologyOrder } = db;
const logger = require('../../../utils/logger');

class SessionCleanupService {
  /**
   * Default timeout thresholds (in hours)
   */
  static THRESHOLDS = {
    // Sessions with no activity for 24 hours -> timeout
    TIMEOUT_HOURS: 24,
    // Sessions with no activity for 7 days -> abandoned
    ABANDONED_DAYS: 7,
    // Batch size for processing
    BATCH_SIZE: 100
  };

  /**
   * Mark sessions as timeout if no activity within threshold
   * @param {Object} options - Options
   * @param {number} options.timeoutHours - Hours of inactivity before timeout (default: 24)
   * @param {string} options.tenantId - Optional tenant filter
   * @returns {Promise<Object>} Cleanup stats
   */
  async markTimedOutSessions(options = {}) {
    const { 
      timeoutHours = SessionCleanupService.THRESHOLDS.TIMEOUT_HOURS,
      tenantId = null 
    } = options;

    const timeoutThreshold = new Date();
    timeoutThreshold.setHours(timeoutThreshold.getHours() - timeoutHours);

    const where = {
      status: ['started', 'in_progress', 'paused'],
      [Op.or]: [
        { lastActivityAt: { [Op.lt]: timeoutThreshold } },
        // Also check startedAt if lastActivityAt is null
        {
          lastActivityAt: null,
          startedAt: { [Op.lt]: timeoutThreshold }
        },
        // For sessions that never started, check createdAt
        {
          lastActivityAt: null,
          startedAt: null,
          createdAt: { [Op.lt]: timeoutThreshold }
        }
      ]
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    try {
      const [updatedCount] = await PsychologySession.update(
        { 
          status: 'timeout',
          updatedAt: new Date()
        },
        { where }
      );

      if (updatedCount > 0) {
        logger.info(`[SessionCleanup] Marked ${updatedCount} sessions as timeout (threshold: ${timeoutHours}h)`);
      }

      return {
        status: 'timeout',
        updatedCount,
        threshold: `${timeoutHours} hours`
      };
    } catch (error) {
      logger.error('[SessionCleanup] Error marking timed out sessions:', error);
      throw error;
    }
  }

  /**
   * Mark sessions as abandoned if no activity for extended period
   * @param {Object} options - Options
   * @param {number} options.abandonedDays - Days of inactivity before abandoned (default: 7)
   * @param {string} options.tenantId - Optional tenant filter
   * @returns {Promise<Object>} Cleanup stats
   */
  async markAbandonedSessions(options = {}) {
    const { 
      abandonedDays = SessionCleanupService.THRESHOLDS.ABANDONED_DAYS,
      tenantId = null 
    } = options;

    const abandonedThreshold = new Date();
    abandonedThreshold.setDate(abandonedThreshold.getDate() - abandonedDays);

    const where = {
      status: ['started', 'in_progress', 'paused', 'timeout'],
      [Op.or]: [
        { lastActivityAt: { [Op.lt]: abandonedThreshold } },
        {
          lastActivityAt: null,
          startedAt: { [Op.lt]: abandonedThreshold }
        },
        {
          lastActivityAt: null,
          startedAt: null,
          createdAt: { [Op.lt]: abandonedThreshold }
        }
      ]
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    try {
      const [updatedCount] = await PsychologySession.update(
        { 
          status: 'abandoned',
          updatedAt: new Date()
        },
        { where }
      );

      if (updatedCount > 0) {
        logger.info(`[SessionCleanup] Marked ${updatedCount} sessions as abandoned (threshold: ${abandonedDays} days)`);
      }

      return {
        status: 'abandoned',
        updatedCount,
        threshold: `${abandonedDays} days`
      };
    } catch (error) {
      logger.error('[SessionCleanup] Error marking abandoned sessions:', error);
      throw error;
    }
  }

  /**
   * Run full cleanup process
   * @param {Object} options - Options
   * @param {string} options.tenantId - Optional tenant filter
   * @param {number} options.timeoutHours - Hours threshold for timeout
   * @param {number} options.abandonedDays - Days threshold for abandoned
   * @returns {Promise<Object>} Full cleanup stats
   */
  async runCleanup(options = {}) {
    const startTime = Date.now();
    
    logger.info('[SessionCleanup] Starting session cleanup process...');

    try {
      // First mark as timeout
      const timeoutResult = await this.markTimedOutSessions(options);
      
      // Then mark older ones as abandoned
      const abandonedResult = await this.markAbandonedSessions(options);

      const duration = Date.now() - startTime;
      
      const result = {
        success: true,
        duration: `${duration}ms`,
        results: {
          timeout: timeoutResult,
          abandoned: abandonedResult
        },
        totalUpdated: timeoutResult.updatedCount + abandonedResult.updatedCount,
        executedAt: new Date().toISOString()
      };

      logger.info(`[SessionCleanup] Completed in ${duration}ms. Total updated: ${result.totalUpdated}`);
      
      return result;
    } catch (error) {
      logger.error('[SessionCleanup] Cleanup process failed:', error);
      throw error;
    }
  }

  /**
   * Get sessions that are candidates for cleanup (preview)
   * @param {Object} options - Options
   * @param {string} options.tenantId - Optional tenant filter
   * @returns {Promise<Object>} Preview of sessions to be cleaned
   */
  async getCleanupPreview(options = {}) {
    const { 
      tenantId = null,
      timeoutHours = SessionCleanupService.THRESHOLDS.TIMEOUT_HOURS,
      abandonedDays = SessionCleanupService.THRESHOLDS.ABANDONED_DAYS
    } = options;

    const timeoutThreshold = new Date();
    timeoutThreshold.setHours(timeoutThreshold.getHours() - timeoutHours);

    const abandonedThreshold = new Date();
    abandonedThreshold.setDate(abandonedThreshold.getDate() - abandonedDays);

    const baseWhere = tenantId ? { tenantId } : {};

    // Get timeout candidates
    const timeoutCandidates = await PsychologySession.findAll({
      where: {
        ...baseWhere,
        status: ['started', 'in_progress', 'paused'],
        [Op.or]: [
          { lastActivityAt: { [Op.lt]: timeoutThreshold } },
          {
            lastActivityAt: null,
            startedAt: { [Op.lt]: timeoutThreshold }
          },
          {
            lastActivityAt: null,
            startedAt: null,
            createdAt: { [Op.lt]: timeoutThreshold }
          }
        ]
      },
      attributes: ['id', 'sessionToken', 'status', 'startedAt', 'lastActivityAt', 'createdAt'],
      limit: 50
    });

    // Get abandoned candidates
    const abandonedCandidates = await PsychologySession.findAll({
      where: {
        ...baseWhere,
        status: ['started', 'in_progress', 'paused', 'timeout'],
        [Op.or]: [
          { lastActivityAt: { [Op.lt]: abandonedThreshold } },
          {
            lastActivityAt: null,
            startedAt: { [Op.lt]: abandonedThreshold }
          },
          {
            lastActivityAt: null,
            startedAt: null,
            createdAt: { [Op.lt]: abandonedThreshold }
          }
        ]
      },
      attributes: ['id', 'sessionToken', 'status', 'startedAt', 'lastActivityAt', 'createdAt'],
      limit: 50
    });

    // Get current stats
    const stats = await PsychologySession.findAll({
      where: baseWhere,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    return {
      currentStats: stats.reduce((acc, s) => {
        acc[s.status] = parseInt(s.count);
        return acc;
      }, {}),
      thresholds: {
        timeout: `${timeoutHours} hours`,
        abandoned: `${abandonedDays} days`
      },
      candidates: {
        timeout: {
          count: timeoutCandidates.length,
          samples: timeoutCandidates.slice(0, 10).map(s => ({
            id: s.id,
            sessionToken: s.sessionToken,
            currentStatus: s.status,
            lastActivity: s.lastActivityAt || s.startedAt || s.createdAt
          }))
        },
        abandoned: {
          count: abandonedCandidates.length,
          samples: abandonedCandidates.slice(0, 10).map(s => ({
            id: s.id,
            sessionToken: s.sessionToken,
            currentStatus: s.status,
            lastActivity: s.lastActivityAt || s.startedAt || s.createdAt
          }))
        }
      }
    };
  }

  /**
   * Update lastActivityAt for a session (call this when subject interacts)
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success
   */
  async updateLastActivity(sessionId) {
    try {
      await PsychologySession.update(
        { lastActivityAt: new Date() },
        { where: { id: sessionId } }
      );
      return true;
    } catch (error) {
      logger.error(`[SessionCleanup] Error updating lastActivityAt for session ${sessionId}:`, error);
      return false;
    }
  }
}

module.exports = new SessionCleanupService();
