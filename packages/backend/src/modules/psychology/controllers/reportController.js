'use strict';

/**
 * Report Controller
 * 
 * Provides detailed reports for psychology module with export capabilities
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const {
  PsychologyOrder, PsychologySession, PsychologyPackage,
  PsychologyTestType, Patient
} = db;
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const reportExportService = require('../services/reportExportService');

/**
 * Helper: Build tenant filter for queries
 */
function buildTenantFilter(req) {
  const { tenantId, isSuperAdmin } = req.user;
  if (!isSuperAdmin) {
    return { tenantId };
  }
  if (req.query.tenantId) {
    return { tenantId: req.query.tenantId };
  }
  return {};
}

/**
 * Helper: Build date range filter
 */
function buildDateFilter(startDate, endDate, field = 'createdAt') {
  const filter = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) {
      filter[field][Op.gte] = new Date(startDate);
    }
    if (endDate) {
      filter[field][Op.lte] = new Date(endDate + 'T23:59:59.999Z');
    }
  }
  return filter;
}

/**
 * Order Report - Detailed order listing with filters
 */
async function getOrderReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { 
      startDate, endDate, status,
      packageId, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'DESC'
    } = req.query;

    const where = {
      ...buildTenantFilter(req),
      ...buildDateFilter(startDate, endDate)
    };

    if (status) where.status = status;
    if (packageId) where.packageId = packageId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: orders } = await PsychologyOrder.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'fullName', 'email', 'phone', 'sex', 'birthDate']
        },
        {
          model: PsychologyPackage,
          as: 'package',
          attributes: ['id', 'name', 'code', 'packageType', 'basePrice']
        },
        {
          model: PsychologySession,
          as: 'sessions',
          attributes: ['id', 'status', 'startedAt', 'completedAt'],
          include: [{
            model: PsychologyTestType,
            as: 'testType',
            attributes: ['id', 'name', 'code']
          }]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate summary
    const summary = await PsychologyOrder.findOne({
      where,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
        [db.sequelize.fn('SUM', db.sequelize.col('finalAmount')), 'totalRevenue'],
        [db.sequelize.fn('AVG', db.sequelize.col('finalAmount')), 'averageOrderValue']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: orders,
      summary: {
        totalOrders: parseInt(summary.totalOrders) || 0,
        totalRevenue: parseFloat(summary.totalRevenue) || 0,
        averageOrderValue: parseFloat(summary.averageOrderValue) || 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      filters: { startDate, endDate, status, packageId }
    });

    logger.logInfo('Psychology order report generated', {
      action: 'PSYCHOLOGY_REPORT_ORDERS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { filters: { startDate, endDate, status }, resultCount: count }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Revenue Report - Revenue breakdown by period, package, payment method
 */
async function getRevenueReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate, groupBy = 'daily' } = req.query;

    const where = {
      ...buildTenantFilter(req),
      ...buildDateFilter(startDate, endDate),
      status: 'paid'
    };

    // Determine date truncation
    let dateTrunc;
    switch (groupBy) {
      case 'weekly': dateTrunc = 'week'; break;
      case 'monthly': dateTrunc = 'month'; break;
      case 'yearly': dateTrunc = 'year'; break;
      default: dateTrunc = 'day';
    }

    // Revenue by period
    const revenueByPeriod = await PsychologyOrder.findAll({
      where,
      attributes: [
        [db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt')), 'period'],
        [db.sequelize.fn('SUM', db.sequelize.col('finalAmount')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount']
      ],
      group: [db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE_TRUNC', dateTrunc, db.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Revenue by package
    const revenueByPackage = await PsychologyOrder.findAll({
      where,
      attributes: [
        'packageId',
        [db.sequelize.fn('SUM', db.sequelize.col('PsychologyOrder.finalAmount')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologyOrder.id')), 'orderCount']
      ],
      include: [{
        model: PsychologyPackage,
        as: 'package',
        attributes: ['name', 'code']
      }],
      group: ['packageId', 'package.id', 'package.name', 'package.code'],
      order: [[db.sequelize.literal('SUM("PsychologyOrder"."finalAmount")'), 'DESC']],
      raw: true
    });

    // Total summary
    const totalSummary = await PsychologyOrder.findOne({
      where,
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('finalAmount')), 'totalRevenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
        [db.sequelize.fn('AVG', db.sequelize.col('finalAmount')), 'averageOrderValue'],
        [db.sequelize.fn('MIN', db.sequelize.col('finalAmount')), 'minOrderValue'],
        [db.sequelize.fn('MAX', db.sequelize.col('finalAmount')), 'maxOrderValue']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalSummary.totalRevenue) || 0,
          totalOrders: parseInt(totalSummary.totalOrders) || 0,
          averageOrderValue: parseFloat(totalSummary.averageOrderValue) || 0,
          minOrderValue: parseFloat(totalSummary.minOrderValue) || 0,
          maxOrderValue: parseFloat(totalSummary.maxOrderValue) || 0
        },
        revenueByPeriod: revenueByPeriod.map(item => ({
          period: item.period,
          revenue: parseFloat(item.revenue) || 0,
          orderCount: parseInt(item.orderCount) || 0
        })),
        revenueByPackage: revenueByPackage.map(item => ({
          packageId: item.packageId,
          packageName: item['package.name'],
          packageCode: item['package.code'],
          revenue: parseFloat(item.revenue) || 0,
          orderCount: parseInt(item.orderCount) || 0
        }))
      },
      filters: { startDate, endDate, groupBy }
    });

    logger.logInfo('Psychology revenue report generated', {
      action: 'PSYCHOLOGY_REPORT_REVENUE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { filters: { startDate, endDate, groupBy } }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Test Completion Report - Test session completion statistics
 */
async function getTestCompletionReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate, testTypeId, status } = req.query;

    const orderWhere = {
      ...buildTenantFilter(req),
      ...buildDateFilter(startDate, endDate)
    };

    const sessionWhere = {};
    if (status) sessionWhere.status = status;

    // Session statistics by status
    const sessionsByStatus = await PsychologySession.findAll({
      where: sessionWhere,
      attributes: [
        [db.sequelize.col('PsychologySession.status'), 'status'],
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'count']
      ],
      include: [{
        model: PsychologyOrder,
        as: 'order',
        attributes: [],
        where: orderWhere,
        required: true
      }],
      group: [db.sequelize.col('PsychologySession.status')],
      raw: true
    });

    // Session statistics by test type
    const testTypeWhere = testTypeId ? { id: testTypeId } : {};
    const sessionsByTestType = await PsychologySession.findAll({
      where: sessionWhere,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'total'],
        [db.sequelize.fn('SUM', db.sequelize.literal(`CASE WHEN "PsychologySession"."status" = 'completed' THEN 1 ELSE 0 END`)), 'completed'],
        [db.sequelize.fn('AVG', db.sequelize.literal(`EXTRACT(EPOCH FROM ("PsychologySession"."completedAt" - "PsychologySession"."startedAt"))`)), 'avgDurationSeconds']
      ],
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          attributes: [],
          where: orderWhere,
          required: true
        },
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: ['id', 'name', 'code', 'estimatedDuration'],
          where: testTypeWhere
        }
      ],
      group: ['testType.id', 'testType.name', 'testType.code', 'testType.estimatedDuration'],
      raw: true
    });

    // Calculate overall statistics
    const totalSessions = sessionsByStatus.reduce((sum, s) => sum + parseInt(s.count), 0);
    const completedSessions = sessionsByStatus.find(s => s.status === 'completed');
    const completionRate = totalSessions > 0 
      ? ((parseInt(completedSessions?.count || 0) / totalSessions) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalSessions,
          completedSessions: parseInt(completedSessions?.count || 0),
          completionRate: parseFloat(completionRate)
        },
        byStatus: sessionsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        byTestType: sessionsByTestType.map(item => ({
          testTypeId: item['testType.id'],
          testTypeName: item['testType.name'],
          testTypeCode: item['testType.code'],
          estimatedDuration: item['testType.estimatedDuration'],
          total: parseInt(item.total) || 0,
          completed: parseInt(item.completed) || 0,
          completionRate: item.total > 0 
            ? ((parseInt(item.completed) / parseInt(item.total)) * 100).toFixed(1)
            : 0,
          avgDurationMinutes: item.avgDurationSeconds 
            ? (parseFloat(item.avgDurationSeconds) / 60).toFixed(1)
            : null
        }))
      },
      filters: { startDate, endDate, testTypeId, status }
    });

    logger.logInfo('Psychology test completion report generated', {
      action: 'PSYCHOLOGY_REPORT_TEST_COMPLETION',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { filters: { startDate, endDate, testTypeId, status } }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Patient Report - Patient demographics and test history
 */
async function getPatientReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { 
      startDate, endDate, sex, ageMin, ageMax,
      page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'DESC'
    } = req.query;

    const tenantFilter = buildTenantFilter(req);
    const where = {
      ...tenantFilter,
      ...buildDateFilter(startDate, endDate)
    };

    if (sex) where.sex = sex;

    // Age filter (calculate from birthDate)
    if (ageMin || ageMax) {
      const today = new Date();
      if (ageMax) {
        const minBirthDate = new Date(today.getFullYear() - parseInt(ageMax) - 1, today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, [Op.gte]: minBirthDate };
      }
      if (ageMin) {
        const maxBirthDate = new Date(today.getFullYear() - parseInt(ageMin), today.getMonth(), today.getDate());
        where.birthDate = { ...where.birthDate, [Op.lte]: maxBirthDate };
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: patients } = await Patient.findAndCountAll({
      where,
      include: [{
        model: PsychologyOrder,
        as: 'orders',
        attributes: ['id', 'status', 'finalAmount', 'createdAt'],
        required: false
      }],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Sex distribution
    const sexDistribution = await Patient.findAll({
      where: tenantFilter,
      attributes: [
        'sex',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['sex'],
      raw: true
    });

    // Age distribution
    const ageDistribution = await Patient.findAll({
      where: { ...tenantFilter, birthDate: { [Op.ne]: null } },
      attributes: [
        [db.sequelize.literal(`
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) < 18 THEN 'Under 18'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 36 AND 45 THEN '36-45'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 46 AND 55 THEN '46-55'
            ELSE '55+'
          END
        `), 'ageGroup'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: [db.sequelize.literal(`
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 18 AND 25 THEN '18-25'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 26 AND 35 THEN '26-35'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 36 AND 45 THEN '36-45'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "birthDate")) BETWEEN 46 AND 55 THEN '46-55'
          ELSE '55+'
        END
      `)],
      raw: true
    });

    // Format patients with order summary
    const formattedPatients = patients.map(patient => {
      const orders = patient.orders || [];
      return {
        ...patient.toJSON(),
        orderSummary: {
          totalOrders: orders.length,
          completedOrders: orders.filter(o => o.status === 'completed').length,
          totalSpent: orders.reduce((sum, o) => sum + (parseFloat(o.finalAmount) || 0), 0)
        }
      };
    });

    res.json({
      success: true,
      data: formattedPatients,
      demographics: {
        sexDistribution: sexDistribution.reduce((acc, item) => {
          acc[item.sex || 'unknown'] = parseInt(item.count);
          return acc;
        }, {}),
        ageDistribution: ageDistribution.reduce((acc, item) => {
          acc[item.ageGroup] = parseInt(item.count);
          return acc;
        }, {})
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      filters: { startDate, endDate, sex, ageMin, ageMax }
    });

    logger.logInfo('Psychology patient report generated', {
      action: 'PSYCHOLOGY_REPORT_PATIENTS',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { filters: { startDate, endDate, sex }, resultCount: count }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Package Performance Report
 */
async function getPackagePerformanceReport(req, res, next) {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;

    const tenantFilter = buildTenantFilter(req);
    const orderDateFilter = buildDateFilter(startDate, endDate);

    const packages = await PsychologyPackage.findAll({
      where: tenantFilter,
      include: [{
        model: PsychologyOrder,
        as: 'orders',
        attributes: [],
        where: { ...orderDateFilter, status: 'paid' },
        required: false
      }],
      attributes: [
        'id',
        'name',
        'code',
        'packageType',
        'basePrice',
        'isActive',
        [db.sequelize.fn('COUNT', db.sequelize.col('orders.id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('orders.finalAmount')), 'totalRevenue'],
        [db.sequelize.fn('AVG', db.sequelize.col('orders.finalAmount')), 'avgOrderValue']
      ],
      group: ['PsychologyPackage.id'],
      order: [[db.sequelize.literal('COALESCE(SUM("orders"."finalAmount"), 0)'), 'DESC']],
      subQuery: false
    });

    const formattedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      code: pkg.code,
      packageType: pkg.packageType,
      basePrice: parseFloat(pkg.basePrice) || 0,
      isActive: pkg.isActive,
      performance: {
        orderCount: parseInt(pkg.dataValues.orderCount) || 0,
        totalRevenue: parseFloat(pkg.dataValues.totalRevenue) || 0,
        avgOrderValue: parseFloat(pkg.dataValues.avgOrderValue) || 0
      }
    }));

    // Calculate totals
    const totalRevenue = formattedPackages.reduce((sum, p) => sum + p.performance.totalRevenue, 0);
    const totalOrders = formattedPackages.reduce((sum, p) => sum + p.performance.orderCount, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalPackages: packages.length,
          activePackages: packages.filter(p => p.isActive).length,
          totalRevenue,
          totalOrders
        },
        packages: formattedPackages
      },
      filters: { startDate, endDate }
    });

    logger.logInfo('Psychology package performance report generated', {
      action: 'PSYCHOLOGY_REPORT_PACKAGE_PERFORMANCE',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { filters: { startDate, endDate } }
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// PDF REPORT GENERATION
// ============================================

const pdfGeneratorService = require('../services/pdfGeneratorService');
const reportCacheService = require('../services/reportCacheService');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF report for a psychology session
 * POST /api/v1/psychology/reports/:sessionId/pdf
 */
async function generatePDFReport(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { 
      reportType = 'full', 
      forceRegenerate = false, 
      options = {} 
    } = req.body;
    const tenantId = req.user.tenantId;

    // 1. Validate session exists and belongs to tenant
    const session = await PsychologySession.findOne({
      where: { id: sessionId, tenantId },
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          include: [{
            model: Patient,
            as: 'patient',
            attributes: ['id', 'fullName', 'email', 'phone', 'sex', 'birthDate']
          }]
        },
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: ['id', 'name', 'code', 'description']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Psychology session not found'
      });
    }

    // Check session is completed
    if (session.status !== 'completed' && session.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate report for incomplete session. Session must be completed or verified.',
        currentStatus: session.status
      });
    }

    // 2. Check cache (unless force regenerate)
    if (!forceRegenerate) {
      const cachedReport = await reportCacheService.getCachedReport(sessionId, reportType);
      
      if (cachedReport) {
        // Verify file still exists
        const fileExists = await pdfGeneratorService.fileExists(cachedReport.filePath);
        
        if (fileExists) {
          logger.logInfo('Returning cached PDF report', {
            action: 'PDF_REPORT_CACHE_HIT',
            sessionId,
            reportType,
            cacheId: cachedReport.id,
            userId: req.user.id,
            tenantId,
            ip: getClientIp(req),
            userAgent: getUserAgent(req)
          });

          return res.json({
            success: true,
            data: {
              downloadUrl: `/api/v1/psychology/reports/download/${cachedReport.id}`,
              fileName: cachedReport.fileName,
              fileSize: cachedReport.fileSize,
              fileSizeFormatted: cachedReport.getFileSizeFormatted(),
              expiresAt: cachedReport.expiresAt,
              expiresIn: cachedReport.getTimeUntilExpiry(),
              cached: true,
              downloadCount: cachedReport.downloadCount
            }
          });
        }
      }
    }

    // 3. Prepare session data for template
    const sessionData = prepareSessionDataForPDF(session);
    
    logger.logInfo('Generating new PDF report', {
      action: 'PDF_REPORT_GENERATING',
      sessionId,
      reportType,
      options,
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // 4. Generate PDF
    const pdfBuffer = await pdfGeneratorService.generateReport(sessionData, {
      reportType,
      includeCharts: options.includeCharts !== false,
      includeRawScores: options.includeRawScores || false,
      language: options.language || 'id'
    });

    // 5. Save to disk
    const participantName = session.order?.patient?.fullName || 'Unknown';
    const { filePath, fileName, fileSize } = await pdfGeneratorService.saveToDisk(
      pdfBuffer,
      tenantId,
      sessionId,
      reportType,
      participantName
    );

    // 6. Create cache record
    const cache = await reportCacheService.createCacheRecord({
      tenantId,
      sessionId,
      reportType,
      filePath,
      fileName,
      fileSize,
      metadata: {
        participantName,
        testTypeName: session.testType?.name,
        generatedBy: req.user.id,
        options
      }
    });

    logger.logInfo('PDF report generated successfully', {
      action: 'PDF_REPORT_GENERATED',
      sessionId,
      reportType,
      cacheId: cache.id,
      fileSize,
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: {
        downloadUrl: `/api/v1/psychology/reports/download/${cache.id}`,
        fileName,
        fileSize,
        fileSizeFormatted: cache.getFileSizeFormatted(),
        expiresAt: cache.expiresAt,
        expiresIn: cache.getTimeUntilExpiry(),
        cached: false
      }
    });

  } catch (err) {
    logger.logError('Error generating PDF report', {
      action: 'PDF_REPORT_ERROR',
      sessionId: req.params.sessionId,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    next(err);
  }
}

/**
 * Download PDF file
 * GET /api/v1/psychology/reports/download/:cacheId
 */
async function downloadPDFReport(req, res, next) {
  try {
    const { cacheId } = req.params;
    const tenantId = req.user.tenantId;

    const cache = await reportCacheService.getCacheById(cacheId, tenantId);

    if (!cache) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or access denied'
      });
    }

    // Check if expired
    if (cache.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'Report has expired. Please regenerate.',
        expiredAt: cache.expiresAt
      });
    }

    // Check file exists
    const fileExists = await pdfGeneratorService.fileExists(cache.filePath);
    if (!fileExists) {
      return res.status(410).json({
        success: false,
        message: 'Report file not found. Please regenerate.'
      });
    }

    // Increment download count
    await reportCacheService.incrementDownloadCount(cacheId);

    logger.logInfo('PDF report downloaded', {
      action: 'PDF_REPORT_DOWNLOADED',
      cacheId,
      sessionId: cache.sessionId,
      downloadCount: cache.downloadCount + 1,
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Stream file
    res.setHeader('Content-Type', cache.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cache.fileName}"`);
    res.setHeader('Content-Length', cache.fileSize);

    const fileStream = fs.createReadStream(cache.filePath);
    fileStream.pipe(res);

  } catch (err) {
    logger.logError('Error downloading PDF report', {
      action: 'PDF_DOWNLOAD_ERROR',
      cacheId: req.params.cacheId,
      error: err.message,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    next(err);
  }
}

/**
 * Get report cache status for a session
 * GET /api/v1/psychology/reports/:sessionId/status
 */
async function getReportStatus(req, res, next) {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user.tenantId;

    // Verify session belongs to tenant
    const session = await PsychologySession.findOne({
      where: { id: sessionId, tenantId },
      attributes: ['id', 'status']
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const caches = await reportCacheService.getAllCachedReports(sessionId);

    const reports = caches.map(cache => ({
      cacheId: cache.id,
      reportType: cache.reportType,
      fileName: cache.fileName,
      fileSize: cache.fileSize,
      fileSizeFormatted: cache.getFileSizeFormatted(),
      generatedAt: cache.generatedAt,
      expiresAt: cache.expiresAt,
      isExpired: cache.isExpired(),
      expiresIn: cache.getTimeUntilExpiry(),
      downloadCount: cache.downloadCount,
      lastDownloadedAt: cache.lastDownloadedAt,
      downloadUrl: cache.isExpired() ? null : `/api/v1/psychology/reports/download/${cache.id}`
    }));

    return res.json({
      success: true,
      data: {
        sessionId,
        sessionStatus: session.status,
        canGenerateReport: session.status === 'completed' || session.status === 'verified',
        reports,
        availableReportTypes: ['full', 'summary']
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Delete cached reports for a session
 * DELETE /api/v1/psychology/reports/:sessionId/cache
 */
async function deleteReportCache(req, res, next) {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user.tenantId;

    // Verify session belongs to tenant
    const session = await PsychologySession.findOne({
      where: { id: sessionId, tenantId },
      attributes: ['id']
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const deletedCount = await reportCacheService.deleteCacheBySession(sessionId);

    logger.logInfo('PDF report cache deleted', {
      action: 'PDF_CACHE_DELETED',
      sessionId,
      deletedCount,
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: `Deleted ${deletedCount} cached report(s)`
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Get cache statistics for tenant
 * GET /api/v1/psychology/reports/cache/stats
 */
async function getCacheStats(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const stats = await reportCacheService.getStats(tenantId);

    return res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Helper: Prepare session data for PDF template
 */
function prepareSessionDataForPDF(session) {
  const participant = session.order?.patient || {};
  const testType = session.testType || {};
  
  // Process scores for display
  const scores = [];
  if (session.scores) {
    // Handle different score formats (PAPI, EPPS, etc.)
    if (typeof session.scores === 'object') {
      for (const [key, value] of Object.entries(session.scores)) {
        const score = typeof value === 'object' ? value.score || value.raw || value : value;
        const percentile = typeof value === 'object' ? value.percentile : null;
        const maxScore = typeof value === 'object' ? value.maxScore || getMaxScoreForTest(testType.code, key) : getMaxScoreForTest(testType.code, key);
        
        scores.push({
          name: key,
          score: score,
          maxScore: maxScore,
          percentile: percentile || calculatePercentile(score, maxScore),
          category: getScoreCategory(percentile || calculatePercentile(score, maxScore)),
          categoryClass: getScoreCategoryClass(percentile || calculatePercentile(score, maxScore)),
          description: getScaleDescription(key, testType.code)
        });
      }
    }
  }

  // Build aspect analysis (grouped by psychological aspects)
  const aspectAnalysis = buildAspectAnalysis(scores, testType.code);

  // Extract interpretations
  const interpretations = [];
  if (session.interpretation) {
    if (Array.isArray(session.interpretation)) {
      interpretations.push(...session.interpretation);
    } else if (typeof session.interpretation === 'object') {
      for (const [title, description] of Object.entries(session.interpretation)) {
        if (typeof description === 'string') {
          interpretations.push({ title, description });
        }
      }
    }
  }

  // Build chart data
  const chartData = {
    labels: scores.slice(0, 10).map(s => s.name), // Limit to 10 for radar chart
    datasets: [{
      label: 'Skor',
      data: scores.slice(0, 10).map(s => s.percentile || s.score),
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(102, 126, 234, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
    }]
  };

  // Calculate duration
  let duration = 0;
  if (session.startedAt && session.completedAt) {
    duration = Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / (1000 * 60));
  }

  // Count questions
  const totalQuestions = session.answers ? 
    (Array.isArray(session.answers) ? session.answers.length : Object.keys(session.answers).length) : 0;

  return {
    id: session.id,
    participant: {
      name: participant.fullName || 'N/A',
      email: participant.email || null,
      gender: participant.sex || null,
      age: participant.birthDate ? calculateAge(participant.birthDate) : null
    },
    testType: {
      name: testType.name || 'Psychology Test',
      code: testType.code || '',
      description: testType.description || ''
    },
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    duration,
    status: session.status,
    totalQuestions,
    answeredQuestions: totalQuestions,
    scores,
    aspectAnalysis,
    interpretations,
    recommendations: [], // Can be populated based on scores
    keyFindings: generateKeyFindings(scores),
    chartData
  };
}

/**
 * Helper: Get max score for a test type and scale
 */
function getMaxScoreForTest(testCode, scaleName) {
  const maxScores = {
    'PAPI': 9,         // PAPI Kostick uses 0-9 scale
    'PAPI-KOSTICK': 9,
    'EPPS': 28,        // EPPS uses 0-28 scale
    'DISC': 100,       // DISC uses percentage
    'MBTI': 100,       // MBTI uses percentage
    'BIG5': 100,       // Big Five uses percentage
  };

  // Check if test code matches any known pattern
  if (testCode) {
    const upperCode = testCode.toUpperCase();
    for (const [key, value] of Object.entries(maxScores)) {
      if (upperCode.includes(key)) {
        return value;
      }
    }
  }

  // Default max score
  return 10;
}

/**
 * Helper: Calculate percentile from raw score
 */
function calculatePercentile(score, maxScore = 10) {
  // Calculate percentile based on raw score and max score
  if (typeof score !== 'number') return 50;
  
  // Convert raw score to percentile (0-100)
  const percentile = Math.round((score / maxScore) * 100);
  return Math.min(100, Math.max(0, percentile));
}

/**
 * Helper: Get score category based on percentile
 */
function getScoreCategory(percentile) {
  if (percentile >= 80) return 'Tinggi';
  if (percentile >= 60) return 'Sedang-Tinggi';
  if (percentile >= 40) return 'Sedang';
  if (percentile >= 20) return 'Sedang-Rendah';
  return 'Rendah';
}

/**
 * Helper: Get score category CSS class
 */
function getScoreCategoryClass(percentile) {
  if (percentile >= 80) return 'high';
  if (percentile >= 60) return 'medium-high';
  if (percentile >= 40) return 'medium';
  if (percentile >= 20) return 'medium-low';
  return 'low';
}

/**
 * Helper: Get scale description (can be expanded)
 */
function getScaleDescription(scaleName, testCode) {
  // Add descriptions for common scales
  const descriptions = {
    // PAPI scales
    'G': 'Need for Achievement - Kebutuhan untuk berprestasi',
    'L': 'Leadership Role - Peran kepemimpinan',
    'I': 'Ease in Decision Making - Kemudahan mengambil keputusan',
    'T': 'Pace - Kecepatan kerja',
    'V': 'Vigorous Type - Tipe yang bersemangat',
    // Add more as needed
  };
  return descriptions[scaleName] || '';
}

/**
 * Helper: Calculate age from birthdate
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Helper: Generate key findings from scores
 */
function generateKeyFindings(scores) {
  const findings = [];
  
  if (scores.length === 0) return findings;

  // Find highest scores
  const sortedByScore = [...scores].sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
  const highest = sortedByScore.slice(0, 3);
  const lowest = sortedByScore.slice(-3);

  if (highest.length > 0) {
    findings.push(`Dimensi tertinggi: ${highest.map(s => s.name).join(', ')}`);
  }

  if (lowest.length > 0 && lowest[0].percentile < 40) {
    findings.push(`Area pengembangan: ${lowest.filter(s => s.percentile < 40).map(s => s.name).join(', ')}`);
  }

  // Add count summary
  const highCount = scores.filter(s => s.percentile >= 60).length;
  const lowCount = scores.filter(s => s.percentile < 40).length;
  
  if (highCount > 0) {
    findings.push(`${highCount} dimensi berada di kategori sedang-tinggi atau tinggi`);
  }

  return findings;
}

// =================================================================
// ASPECT MAPPING FOR PSYCHOLOGICAL GROUPING
// =================================================================

/**
 * Aspect mapping by test type
 * Groups individual scales into broader psychological aspects
 */
const ASPECT_MAPPING = {
  // PAPI Kostick Aspect Mapping
  'PAPI': {
    'Intelegensi': {
      description: 'Kemampuan berpikir analitis dan pemecahan masalah',
      scales: ['G', 'I', 'N']
    },
    'Stabilitas Emosi': {
      description: 'Kemampuan mengendalikan emosi dan tetap tenang di bawah tekanan',
      scales: ['E', 'S', 'K']
    },
    'Kepercayaan Diri': {
      description: 'Keyakinan terhadap kemampuan diri sendiri',
      scales: ['L', 'P', 'I']
    },
    'Kepemimpinan': {
      description: 'Kemampuan memimpin dan mempengaruhi orang lain',
      scales: ['L', 'P', 'A']
    },
    'Hubungan Sosial': {
      description: 'Kemampuan berinteraksi dan bekerja sama dengan orang lain',
      scales: ['O', 'B', 'X']
    },
    'Motivasi Kerja': {
      description: 'Dorongan untuk mencapai prestasi dan hasil kerja',
      scales: ['G', 'A', 'T', 'V']
    },
    'Pengendalian Diri': {
      description: 'Kemampuan mengontrol impuls dan perilaku',
      scales: ['C', 'R', 'D']
    },
    'Ketahanan Kerja': {
      description: 'Kemampuan bekerja keras dan konsisten',
      scales: ['T', 'V', 'W']
    },
    'Kerjasama Tim': {
      description: 'Kemampuan bekerja dalam tim',
      scales: ['B', 'O', 'F']
    },
    'Kepatuhan': {
      description: 'Kesesuaian dengan aturan dan prosedur',
      scales: ['C', 'F', 'W']
    }
  },
  
  // EPPS (Edwards Personal Preference Schedule) Aspect Mapping
  'EPPS': {
    'Motivasi Prestasi': {
      description: 'Kebutuhan untuk berprestasi dan unggul',
      scales: ['Achievement', 'ach']
    },
    'Hubungan Interpersonal': {
      description: 'Kemampuan menjalin hubungan dengan orang lain',
      scales: ['Affiliation', 'aff', 'Nurturance', 'nur']
    },
    'Kepemimpinan': {
      description: 'Kebutuhan untuk memimpin dan mengarahkan',
      scales: ['Dominance', 'dom', 'Exhibition', 'exh']
    },
    'Kemandirian': {
      description: 'Kebutuhan untuk mandiri dan otonom',
      scales: ['Autonomy', 'aut']
    },
    'Keteraturan': {
      description: 'Kebutuhan untuk teratur dan terorganisir',
      scales: ['Order', 'ord']
    },
    'Daya Tahan': {
      description: 'Kemampuan bertahan dalam menyelesaikan tugas',
      scales: ['Endurance', 'end']
    },
    'Introspeksi': {
      description: 'Kemampuan memahami diri sendiri',
      scales: ['Intraception', 'int']
    },
    'Kepatuhan': {
      description: 'Kecenderungan untuk patuh pada aturan',
      scales: ['Deference', 'def', 'Abasement', 'aba']
    },
    'Perubahan': {
      description: 'Keterbukaan terhadap perubahan dan hal baru',
      scales: ['Change', 'chg']
    },
    'Agresivitas': {
      description: 'Kecenderungan untuk asertif atau agresif',
      scales: ['Aggression', 'agg']
    }
  },

  // DISC Aspect Mapping
  'DISC': {
    'Dominance': {
      description: 'Gaya kepemimpinan dan pengambilan keputusan',
      scales: ['D', 'Dominance']
    },
    'Influence': {
      description: 'Kemampuan mempengaruhi dan berkomunikasi',
      scales: ['I', 'Influence']
    },
    'Steadiness': {
      description: 'Stabilitas dan konsistensi dalam bekerja',
      scales: ['S', 'Steadiness']
    },
    'Compliance': {
      description: 'Kepatuhan pada aturan dan standar',
      scales: ['C', 'Compliance']
    }
  },

  // Generic/Default Aspect Mapping (used when test type doesn't have specific mapping)
  'DEFAULT': {
    'Kognitif': {
      description: 'Kemampuan berpikir dan analisis',
      scales: ['cognitive', 'analytical', 'problem_solving', 'intelligence']
    },
    'Emosional': {
      description: 'Pengelolaan emosi dan stabilitas',
      scales: ['emotional', 'stability', 'stress', 'anxiety']
    },
    'Sosial': {
      description: 'Kemampuan berinteraksi sosial',
      scales: ['social', 'interpersonal', 'communication']
    },
    'Motivasi': {
      description: 'Dorongan dan semangat kerja',
      scales: ['motivation', 'drive', 'achievement']
    }
  }
};

/**
 * Build aspect analysis from scores
 * Groups scores by psychological aspects based on test type
 */
function buildAspectAnalysis(scores, testTypeCode) {
  if (!scores || scores.length === 0) {
    return [];
  }

  // Determine which mapping to use
  let mapping = ASPECT_MAPPING[testTypeCode] || ASPECT_MAPPING['DEFAULT'];
  
  // Try to match partial test type code (e.g., 'PAPI-KOSTICK' should use 'PAPI')
  if (!ASPECT_MAPPING[testTypeCode]) {
    for (const key of Object.keys(ASPECT_MAPPING)) {
      if (testTypeCode && testTypeCode.toUpperCase().includes(key)) {
        mapping = ASPECT_MAPPING[key];
        break;
      }
    }
  }

  const aspects = [];

  for (const [aspectName, aspectConfig] of Object.entries(mapping)) {
    // Find scores that match this aspect's scales
    const matchedScales = scores.filter(score => {
      const scaleName = score.name.toUpperCase();
      return aspectConfig.scales.some(s => 
        scaleName === s.toUpperCase() || 
        scaleName.includes(s.toUpperCase()) ||
        s.toUpperCase().includes(scaleName)
      );
    });

    if (matchedScales.length > 0) {
      // Calculate average score for this aspect
      const avgPercentile = Math.round(
        matchedScales.reduce((sum, s) => sum + (s.percentile || 50), 0) / matchedScales.length
      );

      aspects.push({
        name: aspectName,
        description: aspectConfig.description,
        averageScore: avgPercentile,
        category: getScoreCategory(avgPercentile),
        scales: matchedScales.map(s => ({
          name: s.name,
          description: s.description || getScaleDescription(s.name, testTypeCode),
          score: s.score,
          maxScore: s.maxScore,
          percentile: s.percentile,
          category: s.category
        }))
      });
    }
  }

  // Sort aspects by average score (highest first)
  aspects.sort((a, b) => b.averageScore - a.averageScore);

  // If no aspects matched, create auto-grouped aspects
  if (aspects.length === 0 && scores.length > 0) {
    // Group all scores into one generic aspect
    const avgPercentile = Math.round(
      scores.reduce((sum, s) => sum + (s.percentile || 50), 0) / scores.length
    );

    aspects.push({
      name: 'Profil Psikologis',
      description: 'Hasil analisis keseluruhan dari tes psikologi',
      averageScore: avgPercentile,
      category: getScoreCategory(avgPercentile),
      scales: scores.map(s => ({
        name: s.name,
        description: s.description,
        score: s.score,
        maxScore: s.maxScore,
        percentile: s.percentile,
        category: s.category
      }))
    });
  }

  return aspects;
}

/**
 * Export Session Report to XLSX
 * GET /psychology/reports/session/:sessionId/export/xlsx
 */
async function exportSessionToXLSX(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionId } = req.params;

    // Build where clause
    const where = { id: sessionId };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Get session with all related data
    const session = await PsychologySession.findOne({
      where,
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'address']
            }
          ]
        },
        {
          model: PsychologyTestType,
          as: 'testType'
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is completed or verified
    if (!['completed', 'verified'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Session must be completed or verified to export report'
      });
    }

    // Get patient and test type data
    const patient = session.order?.patient;
    const testType = session.testType;
    const questions = testType?.questions;

    // Generate XLSX
    const buffer = await reportExportService.exportToXLSX(session, patient, testType, questions);
    const filename = reportExportService.generateFilename(session, patient, 'xlsx', testType);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    logger.logInfo('Session report exported to XLSX', {
      action: 'PSYCHOLOGY_REPORT_EXPORT_XLSX',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId, testType: testType?.code, filename }
    });

    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Export Session Report to PDF
 * GET /psychology/reports/session/:sessionId/export/pdf
 */
async function exportSessionToPDF(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { sessionId } = req.params;

    // Build where clause
    const where = { id: sessionId };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Get session with all related data
    const session = await PsychologySession.findOne({
      where,
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'fullName', 'email', 'phone', 'birthDate', 'sex', 'address']
            }
          ]
        },
        {
          model: PsychologyTestType,
          as: 'testType'
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is completed or verified
    if (!['completed', 'verified'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: 'Session must be completed or verified to export report'
      });
    }

    // Get patient and test type data
    const patient = session.order?.patient;
    const testType = session.testType;
    const questions = testType?.questions;

    if (session.answers) {
      const answersPreview = typeof session.answers === 'string' 
        ? session.answers.substring(0, 100) 
        : JSON.stringify(session.answers).substring(0, 100);
      console.log('  - Answers preview:', answersPreview);
    }

    // Generate PDF
    const buffer = await reportExportService.exportToPDF(session, patient, testType, questions);
    const filename = reportExportService.generateFilename(session, patient, 'pdf', testType);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    logger.logInfo('Session report exported to PDF', {
      action: 'PSYCHOLOGY_REPORT_EXPORT_PDF',
      userId: req.user.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { sessionId, testType: testType?.code, filename }
    });

    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Test Usage Billing Report
 * Laporan detail penggunaan test untuk keperluan penagihan/invoice
 * Berdasarkan session yang sudah completed dan verified
 */
async function getTestUsageBillingReport(req, res, next) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { 
      startDate, 
      endDate, 
      testTypeId,
      verified = 'all', // 'verified', 'unverified', 'all'
      page = 1, 
      limit = 100,
      groupBy = 'test-type', // 'test-type', 'patient', 'daily'
      export: exportFormat // 'csv', 'xlsx', 'pdf'
    } = req.query;

    // Build filters
    const sessionWhere = {
      // Include both 'completed' and 'verified' status
      // Both represent sessions that have been completed (have completedAt)
      status: { [Op.in]: ['completed', 'verified'] },
      ...buildDateFilter(startDate, endDate, 'completedAt')
    };

    if (testTypeId) sessionWhere.testTypeId = testTypeId;

    // Filter by verification status
    if (verified === 'verified') {
      sessionWhere.verifiedAt = { [Op.ne]: null };
    } else if (verified === 'unverified') {
      sessionWhere.verifiedAt = null;
    }

    const orderWhere = buildTenantFilter(req);

    // Get detailed session data
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: sessions } = await PsychologySession.findAndCountAll({
      where: sessionWhere,
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          where: orderWhere,
          required: true,
          attributes: ['id', 'orderNumber', 'createdAt', 'finalAmount'],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'code', 'fullName', 'email', 'phone']
            },
            {
              model: PsychologyPackage,
              as: 'package',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: ['id', 'code', 'name', 'category', 'questionCount']
        },
        {
          model: db.User,
          as: 'verifier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['completedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate summary statistics by test type
    const summaryByTestType = await PsychologySession.findAll({
      where: sessionWhere,
      include: [
        {
          model: PsychologyOrder,
          as: 'order',
          where: orderWhere,
          required: true,
          attributes: []
        },
        {
          model: PsychologyTestType,
          as: 'testType',
          attributes: ['id', 'code', 'name', 'category']
        }
      ],
      attributes: [
        'testTypeId',
        [db.sequelize.fn('COUNT', db.sequelize.col('PsychologySession.id')), 'totalTests'],
        [db.sequelize.fn('COUNT', db.sequelize.literal("CASE WHEN \"PsychologySession\".\"verifiedAt\" IS NOT NULL THEN 1 END")), 'verifiedTests'],
        [db.sequelize.fn('AVG', db.sequelize.col('PsychologySession.timeSpent')), 'avgDuration'],
        [db.sequelize.fn('MIN', db.sequelize.col('PsychologySession.completedAt')), 'firstTest'],
        [db.sequelize.fn('MAX', db.sequelize.col('PsychologySession.completedAt')), 'lastTest']
      ],
      group: ['testTypeId', 'testType.id', 'testType.code', 'testType.name', 'testType.category'],
      raw: true
    });

    // Format detailed session data
    const formattedSessions = sessions.map(session => ({
      sessionId: session.id,
      orderNumber: session.order.orderNumber,
      patientName: session.order.patient.fullName,
      patientEmail: session.order.patient.email,
      patientCode: session.order.patient.code,
      testType: {
        code: session.testType.code,
        name: session.testType.name,
        category: session.testType.category
      },
      packageName: session.order.package?.name || '-',
      completedAt: session.completedAt,
      duration: session.timeSpent ? Math.round(session.timeSpent / 60) : null, // in minutes
      questionsAnswered: session.getAnswerCount(),
      totalQuestions: session.testType.questionCount,
      verified: {
        isVerified: !!session.verifiedAt,
        verifiedAt: session.verifiedAt,
        verifiedBy: session.verifier ? `${session.verifier.firstName} ${session.verifier.lastName}` : null
      },
      scores: session.scores,
      hasInterpretation: !!session.interpretation
    }));

    // Format summary
    const formattedSummary = summaryByTestType.map(item => ({
      testType: {
        id: item.testTypeId,
        code: item['testType.code'],
        name: item['testType.name'],
        category: item['testType.category']
      },
      totalTests: parseInt(item.totalTests),
      verifiedTests: parseInt(item.verifiedTests),
      unverifiedTests: parseInt(item.totalTests) - parseInt(item.verifiedTests),
      avgDurationMinutes: item.avgDuration ? Math.round(item.avgDuration / 60) : null,
      period: {
        firstTest: item.firstTest,
        lastTest: item.lastTest
      }
    }));

    // Overall summary
    const overallSummary = {
      totalTests: formattedSummary.reduce((sum, item) => sum + item.totalTests, 0),
      verifiedTests: formattedSummary.reduce((sum, item) => sum + item.verifiedTests, 0),
      unverifiedTests: formattedSummary.reduce((sum, item) => sum + item.unverifiedTests, 0),
      uniqueTestTypes: formattedSummary.length,
      periodCovered: {
        startDate: startDate || (sessions.length > 0 ? sessions[sessions.length - 1].completedAt : null),
        endDate: endDate || (sessions.length > 0 ? sessions[0].completedAt : null)
      }
    };

    // Return response
    const response = {
      success: true,
      data: {
        sessions: formattedSessions,
        summaryByTestType: formattedSummary,
        overallSummary
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      filters: { startDate, endDate, testTypeId, verified },
      metadata: {
        reportType: 'test-usage-billing',
        generatedAt: new Date(),
        generatedBy: req.user.email,
        tenantId: isSuperAdmin ? req.query.tenantId || 'all' : tenantId
      }
    };

    res.json(response);

    logger.logInfo('Psychology test usage billing report generated', {
      action: 'PSYCHOLOGY_REPORT_USAGE_BILLING',
      userId: req.user.id,
      tenantId: isSuperAdmin ? req.query.tenantId : tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { 
        filters: { startDate, endDate, testTypeId, verified }, 
        resultCount: count,
        totalTests: overallSummary.totalTests
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrderReport,
  getRevenueReport,
  getTestCompletionReport,
  getPatientReport,
  getPackagePerformanceReport,
  getTestUsageBillingReport,
  // PDF Report functions
  generatePDFReport,
  downloadPDFReport,
  getReportStatus,
  deleteReportCache,
  getCacheStats,
  // Export functions
  exportSessionToXLSX,
  exportSessionToPDF
};
