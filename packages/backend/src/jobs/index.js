/**
 * Jobs Index
 * 
 * Central export for all scheduled jobs
 */

const cleanupExpiredReports = require('./cleanupExpiredReports');
const sessionCleanupJob = require('./sessionCleanupJob');
const hikvisionSyncJob = require('./hikvisionSyncJob');

module.exports = {
  cleanupExpiredReports,
  sessionCleanupJob,
  hikvisionSyncJob
};
