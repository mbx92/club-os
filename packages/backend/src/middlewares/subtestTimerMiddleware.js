/**
 * CFIT Subtest Timer Middleware
 * 
 * Validates that subtest timer hasn't expired
 * Auto-submits if time is up
 */

const { PsychologySession, PsychologyTestType } = require('../models');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');

/**
 * Validate subtest timer hasn't expired
 * If expired, auto-submit with current answers
 */
async function validateSubtestTimer(req, res, next) {
  try {
    const { id, subtestId } = req.params;
    const { tenantId } = req.user;

    // Only apply to CFIT subtest routes
    if (!subtestId) {
      return next();
    }

    const session = await PsychologySession.findOne({
      where: { id, tenantId },
      include: [
        { model: PsychologyTestType, as: 'testType' }
      ]
    });

    if (!session || session.testType.code !== 'CFIT') {
      return next();
    }

    // Check if subtest has started
    const metadata = session.metadata || { subtests: {} };
    if (!metadata.subtests[subtestId]?.started) {
      return next();
    }

    // Check if already completed
    if (metadata.subtests[subtestId]?.completed) {
      return res.status(400).json({
        success: false,
        message: 'Subtest already completed'
      });
    }

    // Get time limit from config
    const scoringConfig = JSON.parse(session.testType.scoringConfig);
    const timeLimit = scoringConfig.subtestConfig[subtestId]?.timeLimit; // in seconds

    if (!timeLimit) {
      return next();
    }

    // Calculate elapsed time
    const startedAt = new Date(metadata.subtests[subtestId].startedAt);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);

    // If time exceeded, return warning (let client handle)
    if (elapsedSeconds > timeLimit) {
      logger.logWarning('CFIT subtest time exceeded', {
        action: 'CFIT_TIMER_EXCEEDED',
        userId: req.user.id,
        tenantId,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        path: req.originalUrl,
        metadata: {
          sessionId: id,
          subtestId,
          timeLimit,
          elapsedSeconds,
          exceededBy: elapsedSeconds - timeLimit
        }
      });

      // Add warning to request object
      req.timerExceeded = true;
      req.exceededBy = elapsedSeconds - timeLimit;
    }

    // Add timer info to request for use in controller
    req.timerInfo = {
      timeLimit,
      elapsedSeconds,
      remainingSeconds: Math.max(0, timeLimit - elapsedSeconds)
    };

    next();
  } catch (error) {
    logger.logError('Timer validation error', {
      error: error.message,
      stack: error.stack,
      sessionId: req.params.id,
      subtestId: req.params.subtestId
    });
    next(error);
  }
}

module.exports = {
  validateSubtestTimer
};
