/**
 * Jobs Index
 * 
 * Central export for all scheduled jobs
 */

const cleanupExpiredReports = require('./cleanupExpiredReports');
const hikvisionSyncJob = require('./hikvisionSyncJob');

module.exports = {
  cleanupExpiredReports,
  hikvisionSyncJob
};
