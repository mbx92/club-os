'use strict';

/**
 * PrinterSettings Controller (Core Module)
 * 
 * Manages thermal printer configurations stored in tenant.settings.printers JSONB.
 * Supports network (IP), USB, Bluetooth, and serial connections.
 * 
 * @module controllers/core/system/printerSettingsController
 */

const { Tenant, PrintJob } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const printerScanner = require('../../../utils/printerScanner');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const templateParserService = require('../../../services/templateParserService');
const net = require('net');

/**
 * In-memory registry of active SSE connections per printer.
 * Key: `${tenantId}:${printerId}`, Value: Set of res objects.
 * Used to close active streams when a printer config is updated or deleted.
 */
const sseClients = new Map();

function sseKey(tenantId, printerId) {
  return `${tenantId}:${printerId}`;
}

function sseRegister(tenantId, printerId, res) {
  const key = sseKey(tenantId, printerId);
  if (!sseClients.has(key)) sseClients.set(key, new Set());
  sseClients.get(key).add(res);
}

function sseUnregister(tenantId, printerId, res) {
  const key = sseKey(tenantId, printerId);
  const set = sseClients.get(key);
  if (set) {
    set.delete(res);
    if (set.size === 0) sseClients.delete(key);
  }
}

/**
 * Close all active SSE streams for a specific printer.
 * Call this after updating/deleting a printer so clients auto-reconnect with fresh config.
 */
function sseCloseAll(tenantId, printerId, reason = 'config_updated') {
  const key = sseKey(tenantId, printerId);
  const set = sseClients.get(key);
  if (!set || set.size === 0) return;

  for (const res of set) {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: reason, message: 'Printer config changed, reconnecting...' })}\n\n`);
        res.end();
      }
    } catch (_) { /* ignore */ }
  }
  sseClients.delete(key);
}

/**
 * Get all printers from tenant settings
 */
const getAllPrinters = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      printerType,
      connectionType,
      isActive,
      isDefault,
      search
    } = req.query;

    // Get tenant
    const targetTenantId = isSuperAdmin && req.query.tenantId ? req.query.tenantId : tenantId;
    const tenant = await Tenant.findByPk(targetTenantId);

    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Get printers from settings
    let printers = tenant.settings?.printers || [];

    // Apply filters
    if (printerType) {
      printers = printers.filter(p => p.printerType === printerType);
    }

    if (connectionType) {
      printers = printers.filter(p => p.connectionType === connectionType);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      printers = printers.filter(p => p.isActive === activeFilter);
    }

    if (isDefault !== undefined) {
      const defaultFilter = isDefault === 'true';
      printers = printers.filter(p => p.isDefault === defaultFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      printers = printers.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.model?.toLowerCase().includes(searchLower) ||
        p.ipAddress?.toLowerCase().includes(searchLower)
      );
    }

    logger.logInfo('Printers retrieved', {
      action: 'GET_PRINTERS',
      tenantId: targetTenantId,
      userId: req.user.id,
      count: printers.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: printers,
      pagination: {
        total: printers.length
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving printers', {
      action: 'GET_PRINTERS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Get single printer by ID
 */
const getPrinterById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const printers = tenant.settings?.printers || [];
    const printer = printers.find(p => p.id === id);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    logger.logInfo('Printer retrieved', {
      action: 'GET_PRINTER',
      printerId: id,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: printer
    });
  } catch (err) {
    logger.logSecurity('Error retrieving printer', {
      action: 'GET_PRINTER_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Create a new printer configuration
 * 
 * healthStatus possible values:
 * - 'not_checked': Initial state, no health check performed yet
 * - 'healthy': Printer is reachable and responding correctly
 * - 'unhealthy': Printer is unreachable or not responding
 * - 'error': Connection test encountered an error
 */
const createPrinter = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const {
      name,
      printerType = 'receipt',
      printerCategory = 'all',
      connectionType,
      ipAddress,
      port = 9100,
      model,
      manufacturer,
      paperSize = '80mm',
      isActive = true,
      isDefault = false,
      receiptTemplate,
      openCashDrawer = false,
      cashDrawerPin = 0,
      autoCut = true
    } = req.body;

    // Validation
    if (!name || !connectionType) {
      return next(createError('VALIDATION_ERROR', 'Name and connection type are required', 400));
    }

    if (connectionType === 'network' && !ipAddress) {
      return next(createError('VALIDATION_ERROR', 'IP address is required for network printers', 400));
    }
    
    // Validate cashDrawerPin
    if (cashDrawerPin !== undefined && cashDrawerPin !== 0 && cashDrawerPin !== 1) {
      return next(createError('VALIDATION_ERROR', 'Cash drawer pin must be 0 or 1', 400));
    }

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];

    // Generate ID
    const { v4: uuidv4 } = require('uuid');
    const printerId = uuidv4();

    // If setting as default, remove default from others of same type
    if (isDefault) {
      printers.forEach(p => {
        if (p.printerType === printerType) {
          p.isDefault = false;
        }
      });
    }

    const newPrinter = {
      id: printerId,
      name,
      printerType,
      printerCategory,
      connectionType,
      ipAddress: connectionType === 'network' ? ipAddress : null,
      port: connectionType === 'network' ? port : null,
      model: model || null,
      manufacturer: manufacturer || null,
      paperSize,
      isActive,
      isDefault,
      autoCut,
      openCashDrawer,
      cashDrawerPin,
      receiptTemplate: receiptTemplate || {},
      statistics: {
        totalPrintJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        lastPrintJob: null
      },
      lastHealthCheck: null,
      healthStatus: 'not_checked', // Changed from 'unknown' to be more descriptive
      createdAt: new Date(),
      updatedAt: new Date()
    };

    printers.push(newPrinter);
    settings.printers = printers;

    // Mark settings as changed to trigger Sequelize update
    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Printer created', {
      action: 'CREATE_PRINTER',
      printerId,
      tenantId,
      userId: req.user.id,
      printerType,
      connectionType,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.status(201).json({
      success: true,
      message: 'Printer created successfully',
      data: newPrinter
    });
  } catch (err) {
    logger.logSecurity('Error creating printer', {
      action: 'CREATE_PRINTER_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Update printer configuration
 */
const updatePrinter = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];
    const printerIndex = printers.findIndex(p => p.id === id);

    if (printerIndex === -1) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    // If setting as default, remove default from others
    if (updates.isDefault) {
      printers.forEach((p, idx) => {
        if (p.printerType === printers[printerIndex].printerType && idx !== printerIndex) {
          p.isDefault = false;
        }
      });
    }

    // Update printer
    printers[printerIndex] = {
      ...printers[printerIndex],
      ...updates,
      id, // Preserve ID
      updatedAt: new Date()
    };

    settings.printers = printers;
    
    // Mark settings as changed to trigger Sequelize update
    tenant.changed('settings', true);
    await tenant.update({ settings });

    // Close any active SSE streams for this printer so clients reconnect with fresh config
    sseCloseAll(tenantId, id, 'config_updated');

    logger.logInfo('Printer updated', {
      action: 'UPDATE_PRINTER',
      printerId: id,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: 'Printer updated successfully',
      data: printers[printerIndex]
    });
  } catch (err) {
    logger.logSecurity('Error updating printer', {
      action: 'UPDATE_PRINTER_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Delete printer configuration
 */
const deletePrinter = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    let printers = settings.printers || [];
    
    const printerExists = printers.some(p => p.id === id);
    if (!printerExists) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    printers = printers.filter(p => p.id !== id);
    settings.printers = printers;

    // Mark settings as changed to trigger Sequelize update
    tenant.changed('settings', true);
    await tenant.update({ settings });

    // Close any active SSE streams for this printer
    sseCloseAll(tenantId, id, 'printer_deleted');

    logger.logInfo('Printer deleted', {
      action: 'DELETE_PRINTER',
      printerId: id,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: 'Printer deleted successfully'
    });
  } catch (err) {
    logger.logSecurity('Error deleting printer', {
      action: 'DELETE_PRINTER_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Test printer connection and update health status
 */
const testPrinterConnection = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];
    const printerIndex = printers.findIndex(p => p.id === id);

    if (printerIndex === -1) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    const printer = printers[printerIndex];

    if (printer.connectionType !== 'network') {
      return next(createError('VALIDATION_ERROR', 'Connection test only available for network printers', 400));
    }

    // Test connection (non-strict mode: port reachable = healthy)
    const testResult = await printerScanner.verifyPrinter(
      printer.ipAddress,
      printer.port || 9100,
      false  // Don't require ESC/POS response, just port reachability
    );

    // Update health status in database
    const now = new Date();
    const isHealthy = testResult.isValid;
    printers[printerIndex].healthStatus = isHealthy ? 'healthy' : 'unhealthy';
    printers[printerIndex].lastHealthCheck = now;
    printers[printerIndex].updatedAt = now;

    settings.printers = printers;
    tenant.settings = settings;
    
    // Mark settings as changed to trigger Sequelize update
    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Printer connection tested', {
      action: 'TEST_PRINTER_CONNECTION',
      printerId: id,
      tenantId,
      userId: req.user.id,
      success: testResult.isValid,
      healthStatus: printers[printerIndex].healthStatus,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: isHealthy 
        ? 'Printer terhubung dengan baik' 
        : 'Printer tidak dapat dijangkau atau tidak merespon',
      data: {
        connected: testResult.isValid,
        healthStatus: printers[printerIndex].healthStatus,
        lastHealthCheck: printers[printerIndex].lastHealthCheck,
        printer: {
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ipAddress,
          port: printer.port
        },
        testDetails: {
          manufacturer: testResult.manufacturer || null,
          model: testResult.model || null,
          protocol: testResult.protocol || null,
          responseTime: testResult.responseTime || null
        }
      }
    });
  } catch (err) {
    logger.logSecurity('Error testing printer connection', {
      action: 'TEST_PRINTER_CONNECTION_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Bulk health check - Test all active network printers
 */
const bulkHealthCheck = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];
    
    // Filter only active network printers
    const networkPrinters = printers.filter(p => 
      p.isActive && p.connectionType === 'network'
    );

    if (networkPrinters.length === 0) {
      return res.json({
        success: true,
        message: 'No active network printers to check',
        results: []
      });
    }

    // Test all printers
    const results = [];
    const now = new Date();

    for (const printer of networkPrinters) {
      try {
        const testResult = await printerScanner.verifyPrinter(
          printer.ipAddress,
          printer.port || 9100,
          false  // Don't require ESC/POS response, just port reachability
        );

        const printerIndex = printers.findIndex(p => p.id === printer.id);
        const isHealthy = testResult.isValid;
        
        if (printerIndex !== -1) {
          printers[printerIndex].healthStatus = isHealthy ? 'healthy' : 'unhealthy';
          printers[printerIndex].lastHealthCheck = now;
          printers[printerIndex].updatedAt = now;
        }

        results.push({
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ipAddress,
          port: printer.port,
          connected: testResult.isValid,
          healthStatus: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy 
            ? 'Terhubung' 
            : 'Tidak dapat dijangkau',
          lastHealthCheck: now,
          testDetails: isHealthy ? {
            manufacturer: testResult.manufacturer || null,
            model: testResult.model || null,
            responseTime: testResult.responseTime || null
          } : null
        });
      } catch (error) {
        const printerIndex = printers.findIndex(p => p.id === printer.id);
        if (printerIndex !== -1) {
          printers[printerIndex].healthStatus = 'error';
          printers[printerIndex].lastHealthCheck = now;
          printers[printerIndex].updatedAt = now;
        }

        results.push({
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ipAddress,
          port: printer.port,
          connected: false,
          healthStatus: 'error',
          message: 'Error saat test koneksi',
          lastHealthCheck: now,
          error: error.message
        });
      }
    }

    // Save all updates
    settings.printers = printers;
    tenant.settings = settings;
    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Bulk health check completed', {
      action: 'BULK_HEALTH_CHECK',
      tenantId,
      userId: req.user.id,
      totalChecked: results.length,
      healthy: results.filter(r => r.healthStatus === 'healthy').length,
      unhealthy: results.filter(r => r.healthStatus === 'unhealthy').length,
      errors: results.filter(r => r.healthStatus === 'error').length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: `Health check completed for ${results.length} printer(s)`,
      results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.healthStatus === 'healthy').length,
        unhealthy: results.filter(r => r.healthStatus === 'unhealthy').length,
        errors: results.filter(r => r.healthStatus === 'error').length
      }
    });
  } catch (err) {
    logger.logSecurity('Error in bulk health check', {
      action: 'BULK_HEALTH_CHECK_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Scan network for printers
 */
const scanNetworkPrinters = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { ipRange, strictMode = true } = req.query;

    logger.logInfo('Network printer scan started', {
      action: 'SCAN_NETWORK_PRINTERS',
      tenantId,
      userId: req.user.id,
      ipRange,
      strictMode,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    let results;
    if (ipRange) {
      // Scan specific IP or range
      results = await printerScanner.scanIP(ipRange, strictMode === 'true');
      // scanIP returns single result or null, wrap in array
      results = results ? [results] : [];
    } else {
      // Auto-detect from network interfaces
      // Note: autoDetectPrinters doesn't support strictMode yet
      results = await printerScanner.autoDetectPrinters();
    }

    return res.json({
      success: true,
      data: results,
      message: `Found ${results.length} printer(s)`
    });
  } catch (err) {
    logger.logSecurity('Error scanning network printers', {
      action: 'SCAN_NETWORK_PRINTERS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Quick scan common IP ranges
 */
const quickScanPrinters = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    logger.logInfo('Quick printer scan started', {
      action: 'QUICK_SCAN_PRINTERS',
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    const results = await printerScanner.quickScan();

    return res.json({
      success: true,
      data: results,
      message: `Found ${results.length} printer(s)`
    });
  } catch (err) {
    logger.logSecurity('Error in quick printer scan', {
      action: 'QUICK_SCAN_PRINTERS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Get printer statistics
 */
const getPrinterStatistics = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { printerType } = req.query;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    let printers = tenant.settings?.printers || [];

    if (printerType) {
      printers = printers.filter(p => p.printerType === printerType);
    }

    const statistics = {
      total: printers.length,
      active: printers.filter(p => p.isActive).length,
      inactive: printers.filter(p => !p.isActive).length,
      byType: {},
      byConnection: {},
      healthStatus: {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        notChecked: 0
      },
      totalPrintJobs: 0,
      successfulJobs: 0,
      failedJobs: 0
    };

    printers.forEach(p => {
      // By type
      statistics.byType[p.printerType] = (statistics.byType[p.printerType] || 0) + 1;
      
      // By connection
      statistics.byConnection[p.connectionType] = (statistics.byConnection[p.connectionType] || 0) + 1;
      
      // Health status
      const healthStatus = p.healthStatus || 'not_checked';
      if (healthStatus === 'healthy') {
        statistics.healthStatus.healthy++;
      } else if (healthStatus === 'unhealthy' || healthStatus === 'error') {
        statistics.healthStatus.unhealthy++;
      } else if (healthStatus === 'not_checked' || healthStatus === 'unknown') {
        statistics.healthStatus.notChecked++;
      } else {
        // degraded or other status
        statistics.healthStatus.degraded++;
      }
      
      // Job statistics
      if (p.statistics) {
        statistics.totalPrintJobs += p.statistics.totalPrintJobs || 0;
        statistics.successfulJobs += p.statistics.successfulJobs || 0;
        statistics.failedJobs += p.statistics.failedJobs || 0;
      }
    });

    logger.logInfo('Printer statistics retrieved', {
      action: 'GET_PRINTER_STATISTICS',
      tenantId,
      userId: req.user.id,
      total: statistics.total,
      healthy: statistics.healthStatus.healthy,
      unhealthy: statistics.healthStatus.unhealthy,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: statistics
    });
  } catch (err) {
    logger.logSecurity('Error retrieving printer statistics', {
      action: 'GET_PRINTER_STATISTICS_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Helper: Ping printer via TCP socket connection
 * @param {string} ip - Printer IP address
 * @param {number} port - Printer port (default: 9100)
 * @param {number} timeout - Connection timeout in milliseconds (default: 3000)
 * @returns {Promise<{online: boolean, latency?: number, error?: string}>}
 */
const pingPrinter = (ip, port = 9100, timeout = 3000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    
    // Set timeout
    socket.setTimeout(timeout);
    
    socket.connect(port, ip, () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      resolve({ online: true, latency });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ 
        online: false, 
        error: err.code === 'ETIMEDOUT' ? 'Connection timeout' : err.message 
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ online: false, error: 'Connection timeout' });
    });
  });
};

/**
 * Stream real-time printer connection status (SSE)
 * Pings printer every 10 seconds with 3 second timeout
 * GET /api/v1/system/printers/:id/stream/connection
 */
const streamConnection = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    // once=true → single ping then close (JSON response, not SSE)
    // Use this after saving printer to avoid hanging forever
    const once = req.query.once === 'true' || req.query.once === '1';

    // Get tenant and printer
    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];
    const printer = printers.find(p => p.id === id);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    if (printer.connectionType !== 'network') {
      // Non-network printers cannot be pinged — respond immediately
      const payload = {
        printerId: id,
        printerName: printer.name,
        status: 'unknown',
        message: 'Status check only available for network printers',
        timestamp: new Date().toISOString(),
      };
      if (once) return res.json({ success: true, data: payload });
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ type: 'status', ...payload })}\n\n`);
      res.end();
      return;
    }

    // ── ONCE mode: single ping → JSON response ────────────────────────────
    if (once) {
      const result = await pingPrinter(printer.ipAddress, printer.port || 9100, 3000);
      return res.json({
        success: true,
        data: {
          printerId: id,
          printerName: printer.name,
          status: result.online ? 'online' : 'offline',
          timestamp: new Date().toISOString(),
          ...(result.online ? { latency: result.latency } : { error: result.error }),
        }
      });
    }

    // ── SSE streaming mode ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Register this SSE client so updatePrinter/deletePrinter can close it
    sseRegister(tenantId, id, res);

    logger.logInfo('Printer connection stream started', {
      action: 'STREAM_CONNECTION_START',
      printerId: id,
      printerName: printer.name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Send initial connection
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Stream established' })}\n\n`);

    // Ping function
    const doPing = async () => {
      try {
        const result = await pingPrinter(printer.ipAddress, printer.port || 9100, 3000);

        const payload = {
          type: 'status',
          printerId: id,
          printerName: printer.name,
          status: result.online ? 'online' : 'offline',
          timestamp: new Date().toISOString(),
          ...(result.online ? { latency: result.latency } : { error: result.error })
        };

        // Send SSE data
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      } catch (error) {
        logger.logSecurity('Printer ping error', {
          action: 'STREAM_PING_ERROR',
          printerId: id,
          error: error.message,
          tenantId
        });
      }
    };

    // Initial ping
    await doPing();

    // Setup interval (ping every 10 seconds)
    const intervalId = setInterval(doPing, 10000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      sseUnregister(tenantId, id, res);

      logger.logInfo('Printer connection stream closed', {
        action: 'STREAM_CONNECTION_CLOSE',
        printerId: id,
        tenantId,
        userId: req.user.id
      });

      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (err) {
    logger.logSecurity('Error starting printer connection stream', {
      action: 'STREAM_CONNECTION_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Helper: Calculate printer health status based on multiple factors
 * @param {Object} params - Health parameters
 * @returns {Object} Health status with details
 */
const calculateHealthStatus = async (params) => {
  const {
    tenantId,
    printerId,
    isConnected,
    lastSuccessfulPrint,
    consecutiveFailures = 0
  } = params;

  // Get stuck jobs from database
  const stuckJobs = await PrintJob.getStuckJobs(tenantId, printerId);
  const stuckJobsCount = stuckJobs.length;

  // Calculate oldest stuck job age
  let oldestStuckJobAge = 0;
  if (stuckJobsCount > 0) {
    const oldestJob = stuckJobs.reduce((oldest, job) => {
      const jobTime = job.startedAt || job.scheduledAt;
      const oldestTime = oldest.startedAt || oldest.scheduledAt;
      return jobTime < oldestTime ? job : oldest;
    });
    const jobTime = oldestJob.startedAt || oldestJob.scheduledAt;
    oldestStuckJobAge = Math.floor((Date.now() - jobTime) / 1000 / 60); // minutes
  }

  // Determine health status
  let healthStatus = 'unknown';
  let healthMessage = '';

  if (!isConnected) {
    healthStatus = 'unhealthy';
    healthMessage = 'Printer tidak dapat dijangkau';
  } else if (oldestStuckJobAge > 15) {
    healthStatus = 'unhealthy';
    healthMessage = `Job tertunda lebih dari 15 menit (${oldestStuckJobAge} menit)`;
  } else if (consecutiveFailures >= 5) {
    healthStatus = 'unhealthy';
    healthMessage = `Terlalu banyak kegagalan berturut-turut (${consecutiveFailures})`;
  } else if (stuckJobsCount > 0 && oldestStuckJobAge > 5) {
    healthStatus = 'degraded';
    healthMessage = `${stuckJobsCount} job tertunda (tertua: ${oldestStuckJobAge} menit)`;
  } else if (stuckJobsCount > 0) {
    healthStatus = 'degraded';
    healthMessage = `${stuckJobsCount} job dalam antrian`;
  } else {
    healthStatus = 'healthy';
    healthMessage = 'Printer berfungsi normal';
  }

  return {
    healthStatus,
    healthMessage,
    isConnected,
    stuckJobsCount,
    oldestStuckJobAge,
    consecutiveFailures,
    lastSuccessfulPrint,
    stuckJobs: stuckJobs.map(job => ({
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      attempts: job.attempts,
      scheduledAt: job.scheduledAt,
      startedAt: job.startedAt,
      ageMinutes: Math.floor((Date.now() - (job.startedAt || job.scheduledAt)) / 1000 / 60)
    }))
  };
};

/**
 * Stream real-time printer health status (SSE)
 * Monitors stuck jobs and connection health every 10 seconds
 * GET /api/v1/system/printers/:id/stream/health
 */
const streamHealth = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    // once=true → single check, JSON response (not SSE) — use after save to avoid hanging
    const once = req.query.once === 'true' || req.query.once === '1';

    // Get tenant and printer
    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const printers = settings.printers || [];
    const printer = printers.find(p => p.id === id);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    let consecutiveFailures = 0;
    let lastSuccessfulPrint = null;

    // Health check function (shared by once and SSE modes)
    const doHealthCheck = async () => {
      let isConnected = true;
      if (printer.connectionType === 'network') {
        const pingResult = await pingPrinter(printer.ipAddress, printer.port || 9100, 3000);
        isConnected = pingResult.online;
        if (!isConnected) consecutiveFailures++;
        else consecutiveFailures = 0;
      }

      const lastCompletedJob = await PrintJob.findOne({
        where: { tenantId, printerId: id, status: 'completed' },
        order: [['completedAt', 'DESC']],
        attributes: ['completedAt', 'printDuration']
      });
      if (lastCompletedJob) lastSuccessfulPrint = lastCompletedJob.completedAt;

      const healthData = await calculateHealthStatus({
        tenantId, printerId: id, isConnected, lastSuccessfulPrint, consecutiveFailures
      });
      const stats = await PrintJob.getStatistics(tenantId, id);

      return { printerId: id, printerName: printer.name, timestamp: new Date().toISOString(), ...healthData, statistics: stats };
    };

    // ── ONCE mode: single check → JSON response ──────────────────────────
    if (once) {
      const result = await doHealthCheck();
      return res.json({ success: true, data: result });
    }

    // ── SSE streaming mode ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Register this SSE client so updatePrinter/deletePrinter can close it
    sseRegister(tenantId, id, res);

    logger.logInfo('Printer health stream started', {
      action: 'STREAM_HEALTH_START',
      printerId: id,
      printerName: printer.name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Send initial connection
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Health monitoring started' })}\n\n`);

    // Health check function for SSE
    const doHealthCheckSSE = async () => {
      try {
        const payload = { type: 'health', ...(await doHealthCheck()) };
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      } catch (error) {
        logger.logSecurity('Printer health check error', {
          action: 'STREAM_HEALTH_ERROR',
          printerId: id,
          error: error.message,
          tenantId
        });
      }
    };

    // Initial health check
    await doHealthCheckSSE();

    // Setup interval (check every 10 seconds)
    const intervalId = setInterval(doHealthCheckSSE, 10000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      sseUnregister(tenantId, id, res);

      logger.logInfo('Printer health stream closed', {
        action: 'STREAM_HEALTH_CLOSE',
        printerId: id,
        tenantId,
        userId: req.user.id
      });

      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (err) {
    logger.logSecurity('Error starting printer health stream', {
      action: 'STREAM_HEALTH_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Get printer jobs with filtering
 * GET /api/v1/system/printers/:id/jobs
 */
const getPrinterJobs = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { status, limit = 50, offset = 0, includeStuck = false } = req.query;

    // Verify printer exists
    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const printer = tenant.settings?.printers?.find(p => p.id === id);
    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    // Build query
    const { Op } = require('sequelize');
    const where = {
      tenantId,
      printerId: id
    };

    if (status) {
      where.status = status;
    }

    // Get jobs
    const jobs = await PrintJob.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../../../models').User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    // Get stuck jobs if requested
    let stuckJobs = [];
    if (includeStuck === 'true' || includeStuck === true) {
      stuckJobs = await PrintJob.getStuckJobs(tenantId, id);
    }

    logger.logInfo('Printer jobs retrieved', {
      action: 'GET_PRINTER_JOBS',
      printerId: id,
      tenantId,
      userId: req.user.id,
      count: jobs.count,
      stuckCount: stuckJobs.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      data: {
        printer: {
          id: printer.id,
          name: printer.name,
          type: printer.printerType
        },
        jobs: jobs.rows,
        total: jobs.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        stuckJobs: includeStuck ? stuckJobs : undefined
      }
    });

  } catch (err) {
    logger.logSecurity('Error retrieving printer jobs', {
      action: 'GET_PRINTER_JOBS_ERROR',
      error: err.message,
      printerId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Test print with sample receipt
 * Creates a PrintJob and sends test receipt to printer
 * 
 * @route POST /api/v1/system/printers/:id/test-print
 * @access Private (thermalPrinting feature)
 */
const testPrint = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id: printerId } = req.params;
    const { metadata = {} } = req.body;

    // Get tenant
    const targetTenantId = isSuperAdmin && req.query.tenantId ? req.query.tenantId : tenantId;
    const tenant = await Tenant.findByPk(targetTenantId);

    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Find printer
    const printers = tenant.settings?.printers || [];
    const printer = printers.find(p => p.id === printerId);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    // Validate printer
    if (!printer.isActive) {
      return next(createError('VALIDATION_ERROR', 'Printer is not active', 400));
    }

    if (printer.connectionType !== 'network') {
      return next(createError('VALIDATION_ERROR', 'Only network printers supported for test print', 400));
    }

    // Get templates (if any)
    const templates = tenant.settings?.receiptTemplates || [];
    
    // Find template: use default for printer type, or first active template, or fallback to built-in
    let template = templates.find(t => 
      t.isDefault && 
      t.templateType === printer.printerType &&
      t.isActive
    );
    
    if (!template) {
      template = templates.find(t => 
        t.templateType === printer.printerType &&
        t.isActive
      );
    }
    
    // If no template found, use default from service
    if (!template) {
      template = templateParserService.getDefaultTemplate(printer.printerType);
    }

    // Prepare sample data
    const sampleData = {
      businessName: tenant.name || 'Gym Membership System',
      businessAddress: tenant.settings?.businessInfo?.address || 'Jl. Sehat No. 1, Jakarta',
      businessPhone: tenant.settings?.businessInfo?.phone || '021-12345678',
      businessEmail: tenant.settings?.businessInfo?.email || null,
      transactionNumber: `TEST-${Date.now()}`,
      transactionDate: new Date(),
      cashierName: req.user.username || 'Test User',
      customerName: 'Sample Customer',
      items: [
        {
          name: 'Membership Gold (3 Bulan)',
          quantity: 1,
          price: 1500000,
          notes: 'Akses semua fasilitas'
        },
        {
          name: 'Personal Training (12 Sesi)',
          quantity: 2,
          price: 1200000,
          notes: 'Sesi 60 menit'
        }
      ],
      subtotal: 3900000,
      discount: 0,
      tax: 0,
      total: 3900000,
      paymentMethod: 'Tunai',
      amountPaid: 4000000,
      change: 100000
    };

    // Build receipt content using template
    const receiptContent = templateParserService.parseTemplate(template, sampleData);

    // Determine jobType based on printer type
    const jobType = printer.printerType || 'receipt';

    // Create print job
    const printJob = await PrintJob.create({
      tenantId: targetTenantId,
      jobType,
      printerId: printer.id,
      printData: receiptContent,
      status: 'pending',
      createdBy: userId,
      metadata: {
        ...metadata,
        testPrint: true,
        templateId: template.id,
        templateName: template.name,
        printerName: printer.name,
        printerModel: printer.model,
        printerType: printer.printerType,
        ipAddress: printer.ipAddress,
        port: printer.port || 9100
      }
    });

    logger.logInfo('Test print job created', {
      action: 'TEST_PRINT_JOB_CREATED',
      tenantId: targetTenantId,
      printJobId: printJob.id,
      printerId: printer.id,
      printerName: printer.name,
      userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    try {
      // Mark as printing
      await printJob.markStarted();

      // Send to printer
      const startTime = Date.now();
      await sendToPrinter(printer.ipAddress, printer.port || 9100, receiptContent);
      const duration = Date.now() - startTime;

      // Mark as completed
      await printJob.markCompleted({ duration });

      logger.logInfo('Test print successful', {
        action: 'TEST_PRINT_SUCCESS',
        tenantId: targetTenantId,
        printJobId: printJob.id,
        printerId: printer.id,
        printerName: printer.name,
        duration,
        userId,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      res.json({
        success: true,
        message: 'Test print sent successfully',
        data: {
          jobId: printJob.id,
          printer: {
            id: printer.id,
            name: printer.name,
            type: printer.printerType,
            model: printer.model,
            ipAddress: printer.ipAddress,
            port: printer.port || 9100
          },
          status: 'completed',
          duration,
          timestamp: new Date()
        }
      });

    } catch (printError) {
      // Mark as failed
      await printJob.markFailed(printError.message);

      logger.logError('Test print failed', {
        action: 'TEST_PRINT_FAILED',
        tenantId: targetTenantId,
        printJobId: printJob.id,
        printerId: printer.id,
        printerName: printer.name,
        error: printError.message,
        userId,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      return next(createError('PRINTER_ERROR', `Test print failed: ${printError.message}`, 500));
    }

  } catch (err) {
    logger.logSecurity('Test print error', {
      action: 'TEST_PRINT_ERROR',
      error: err.message,
      stack: err.stack,
      printerId: req.params.id,
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    next(err);
  }
};

/**
 * Build test receipt content with ESC/POS commands
 */
function buildTestReceipt(tenant, printer) {
  const ESC = '\x1b';
  const GS = '\x1d';
  
  const INIT = `${ESC}@`;
  const ALIGN_LEFT = `${ESC}a\x00`;
  const ALIGN_CENTER = `${ESC}a\x01`;
  const BOLD_ON = `${ESC}E\x01`;
  const BOLD_OFF = `${ESC}E\x00`;
  const DOUBLE_SIZE_ON = `${GS}!\x30`;
  const NORMAL_SIZE = `${GS}!\x00`;
  const LINE_FEED = '\n';
  const FEED_AND_CUT = `${GS}V\x41\x03`;
  
  const padLine = (left, right, width = 48) => {
    const padding = width - left.length - right.length;
    if (padding < 1) return `${left} ${right}`;
    return `${left}${' '.repeat(padding)}${right}`;
  };
  
  let content = '';
  
  // Initialize
  content += INIT;
  
  // Header
  content += ALIGN_CENTER;
  content += DOUBLE_SIZE_ON;
  content += 'TEST PRINT' + LINE_FEED;
  content += NORMAL_SIZE;
  content += LINE_FEED;
  
  // Tenant info
  content += BOLD_ON + (tenant.name || 'GYM MEMBERSHIP SYSTEM').toUpperCase() + BOLD_OFF + LINE_FEED;
  if (tenant.settings?.businessInfo?.address) {
    content += tenant.settings.businessInfo.address + LINE_FEED;
  }
  if (tenant.settings?.businessInfo?.phone) {
    content += 'Telp: ' + tenant.settings.businessInfo.phone + LINE_FEED;
  }
  content += LINE_FEED;
  
  // Separator
  content += ALIGN_LEFT;
  content += '='.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  // Test info
  content += BOLD_ON + 'TEST INFORMATION' + BOLD_OFF + LINE_FEED;
  content += padLine('Date', new Date().toLocaleString('id-ID'), 48) + LINE_FEED;
  content += padLine('Printer', printer.name, 48) + LINE_FEED;
  content += padLine('Model', printer.model || 'Unknown', 48) + LINE_FEED;
  content += padLine('Type', printer.printerType, 48) + LINE_FEED;
  content += padLine('Connection', `${printer.ipAddress}:${printer.port || 9100}`, 48) + LINE_FEED;
  content += padLine('Status', 'SUCCESS', 48) + LINE_FEED;
  content += LINE_FEED;
  
  // Sample items
  content += '-'.repeat(48) + LINE_FEED;
  content += BOLD_ON + 'SAMPLE ITEMS' + BOLD_OFF + LINE_FEED;
  content += '-'.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  content += '1x Membership Gold (3 Bulan)' + LINE_FEED;
  content += padLine('', 'Rp 1.500.000', 48) + LINE_FEED;
  content += LINE_FEED;
  
  content += '2x PT Session (12 Sesi)' + LINE_FEED;
  content += padLine('', 'Rp 2.400.000', 48) + LINE_FEED;
  content += LINE_FEED;
  
  // Total
  content += '-'.repeat(48) + LINE_FEED;
  content += BOLD_ON;
  content += padLine('TOTAL', 'Rp 3.900.000', 48) + LINE_FEED;
  content += BOLD_OFF;
  content += '='.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  // Footer
  content += ALIGN_CENTER;
  content += 'Terima kasih atas kunjungan Anda' + LINE_FEED;
  content += 'Stay healthy!' + LINE_FEED;
  content += LINE_FEED;
  content += 'Test Print - ' + new Date().toLocaleTimeString('id-ID') + LINE_FEED;
  content += LINE_FEED;
  content += LINE_FEED;
  content += LINE_FEED;
  
  // Cut paper
  content += FEED_AND_CUT;
  
  return content;
}

/**
 * Send data to printer via TCP socket
 */
function sendToPrinter(ipAddress, port, content) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds
    
    socket.setTimeout(timeout);
    
    socket.connect(port, ipAddress, () => {
      // Send data
      socket.write(content, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          // Wait a bit for printer to process
          setTimeout(() => {
            socket.end();
            resolve({ success: true, bytes: content.length });
          }, 1000);
        }
      });
    });
    
    socket.on('error', (err) => {
      reject(err);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

/**
 * Open cash drawer via receipt printer
 */
const openCashDrawer = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const tenant = req.tenant || await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const receiptPrinterService = require('../../../services/receiptPrinterService');
    const result = await receiptPrinterService.openCashDrawer(tenant);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      message: 'Cash drawer opened'
    });
  } catch (err) {
    logger.logSecurity('Error opening cash drawer', {
      action: 'OPEN_CASH_DRAWER_ERROR',
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

module.exports = {
  getAllPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  deletePrinter,
  testPrinterConnection,
  bulkHealthCheck,
  scanNetworkPrinters,
  quickScanPrinters,
  getPrinterStatistics,
  streamConnection,
  streamHealth,
  getPrinterJobs,
  testPrint,
  openCashDrawer
};
