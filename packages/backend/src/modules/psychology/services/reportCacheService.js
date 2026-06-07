/**
 * Report Cache Service
 * 
 * Manages psychology report PDF cache records.
 * Handles cache lookup, creation, and cleanup.
 * 
 * @module modules/psychology/services/reportCacheService
 */

const { PsychologyReportCache, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const logger = require('../../../utils/logger');

// Cache duration in hours
const CACHE_DURATION_HOURS = 24;

class ReportCacheService {
  /**
   * Get cached report if exists and not expired
   * @param {string} sessionId - Session ID
   * @param {string} reportType - Report type
   * @returns {Object|null} Cache record or null
   */
  async getCachedReport(sessionId, reportType = 'full') {
    const cache = await PsychologyReportCache.findOne({
      where: {
        sessionId,
        reportType,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    return cache;
  }

  /**
   * Get all cached reports for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Array of cache records
   */
  async getAllCachedReports(sessionId) {
    return await PsychologyReportCache.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Create or update cache record for new PDF
   * @param {Object} data - Cache data
   * @returns {Object} Cache record
   */
  async createCacheRecord(data) {
    const { 
      tenantId, 
      sessionId, 
      reportType = 'full', 
      filePath, 
      fileName, 
      fileSize, 
      metadata = {} 
    } = data;
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    // Check if record exists
    const existing = await PsychologyReportCache.findOne({
      where: { sessionId, reportType }
    });

    if (existing) {
      // Delete old file if it exists
      try {
        await fs.unlink(existing.filePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }

      // Update existing record
      await existing.update({
        filePath,
        fileName,
        fileSize,
        generatedAt: new Date(),
        expiresAt,
        downloadCount: 0,
        lastDownloadedAt: null,
        metadata
      });

      logger.logInfo('Report cache updated', {
        action: 'REPORT_CACHE_UPDATED',
        cacheId: existing.id,
        sessionId,
        reportType
      });

      return existing;
    }

    // Create new record
    const cache = await PsychologyReportCache.create({
      tenantId,
      sessionId,
      reportType,
      filePath,
      fileName,
      fileSize,
      generatedAt: new Date(),
      expiresAt,
      downloadCount: 0,
      metadata
    });

    logger.logInfo('Report cache created', {
      action: 'REPORT_CACHE_CREATED',
      cacheId: cache.id,
      sessionId,
      reportType,
      expiresAt
    });

    return cache;
  }

  /**
   * Increment download count for cache record
   * @param {string} cacheId - Cache ID
   */
  async incrementDownloadCount(cacheId) {
    await PsychologyReportCache.update({
      downloadCount: sequelize.literal('"downloadCount" + 1'),
      lastDownloadedAt: new Date()
    }, {
      where: { id: cacheId }
    });
  }

  /**
   * Get cache record by ID
   * @param {string} cacheId - Cache ID
   * @param {string} tenantId - Tenant ID (for security check)
   * @returns {Object|null} Cache record
   */
  async getCacheById(cacheId, tenantId = null) {
    const where = { id: cacheId };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return await PsychologyReportCache.findOne({ where });
  }

  /**
   * Delete cache by session
   * @param {string} sessionId - Session ID
   * @returns {number} Number of deleted records
   */
  async deleteCacheBySession(sessionId) {
    const caches = await PsychologyReportCache.findAll({
      where: { sessionId }
    });

    let deletedCount = 0;

    for (const cache of caches) {
      // Delete file from disk
      try {
        await fs.unlink(cache.filePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
      
      // Delete record
      await cache.destroy();
      deletedCount++;
    }

    logger.logInfo('Report caches deleted', {
      action: 'REPORT_CACHE_DELETED',
      sessionId,
      deletedCount
    });

    return deletedCount;
  }

  /**
   * Delete single cache record
   * @param {string} cacheId - Cache ID
   */
  async deleteCache(cacheId) {
    const cache = await PsychologyReportCache.findByPk(cacheId);
    
    if (!cache) return false;

    // Delete file from disk
    try {
      await fs.unlink(cache.filePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
    
    await cache.destroy();
    return true;
  }

  /**
   * Get all expired cache records
   * @returns {Array} Expired cache records
   */
  async getExpiredCaches() {
    return await PsychologyReportCache.findAll({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    });
  }

  /**
   * Cleanup expired caches (used by scheduler)
   * @returns {Object} Cleanup stats
   */
  async cleanupExpired() {
    const stats = {
      filesDeleted: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      errors: []
    };

    const expiredRecords = await this.getExpiredCaches();

    for (const record of expiredRecords) {
      try {
        // Delete file
        try {
          const fileStat = await fs.stat(record.filePath);
          stats.bytesFreed += fileStat.size;
          await fs.unlink(record.filePath);
          stats.filesDeleted++;
        } catch (err) {
          if (err.code !== 'ENOENT') {
            stats.errors.push({
              type: 'file_delete',
              recordId: record.id,
              error: err.message
            });
          }
        }

        // Delete record
        await record.destroy();
        stats.recordsDeleted++;

      } catch (err) {
        stats.errors.push({
          type: 'record_delete',
          recordId: record.id,
          error: err.message
        });
      }
    }

    return stats;
  }

  /**
   * Get cache statistics for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Stats
   */
  async getStats(tenantId) {
    const stats = await PsychologyReportCache.findAll({
      where: { tenantId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReports'],
        [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize'],
        [sequelize.fn('SUM', sequelize.col('downloadCount')), 'totalDownloads']
      ],
      raw: true
    });

    const result = stats[0] || {};

    return {
      totalReports: parseInt(result.totalReports) || 0,
      totalSize: parseInt(result.totalSize) || 0,
      totalSizeFormatted: this.formatBytes(parseInt(result.totalSize) || 0),
      totalDownloads: parseInt(result.totalDownloads) || 0
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

module.exports = new ReportCacheService();
