'use strict';

/**
 * Printer Settings Routes (Core Module)
 * 
 * API endpoints for thermal printer configuration management.
 * Supports receipt printers, kitchen printers, and label printers.
 * 
 * @module routes/core/system/printerSettings.routes
 */

const express = require('express');
const router = express.Router();
const printerSettingsController = require('../../../controllers/core/system/printerSettingsController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and thermalPrinting feature
router.use(authenticate);
router.use(requireFeature('thermalPrinting'));

/**
 * @route GET /api/v1/system/printers
 * @desc Get all printer configurations with filters
 * @query printerType - Filter by type (receipt, kitchen, label, invoice, report)
 * @query connectionType - Filter by connection (network, usb, bluetooth, serial)
 * @query isActive - Filter by active status
 * @query isDefault - Filter default printers
 * @query search - Search by name, model, or IP address
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.getAllPrinters
);

/**
 * @route GET /api/v1/system/printers/statistics
 * @desc Get printer usage statistics
 * @query printerType - Filter by type
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/statistics',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.getPrinterStatistics
);

/**
 * @route GET /api/v1/system/printers/scan
 * @desc Scan network for available printers
 * @query ipRange - Specific IP or range to scan (optional)
 * @query strictMode - Enable strict ESC/POS validation (default: true)
 * @access Private - requires 'create' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/scan',
  authorize('create', 'PrinterSettings'),
  printerSettingsController.scanNetworkPrinters
);

/**
 * @route GET /api/v1/system/printers/scan/quick
 * @desc Quick scan common IP ranges for printers
 * @access Private - requires 'create' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/scan/quick',
  authorize('create', 'PrinterSettings'),
  printerSettingsController.quickScanPrinters
);

/**
 * @route GET /api/v1/system/printers/:id
 * @desc Get single printer configuration by ID
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/:id',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.getPrinterById
);

/**
 * @route POST /api/v1/system/printers
 * @desc Create new printer configuration
 * @body { name, printerType, connectionType, ipAddress, port, model, manufacturer, paperSize, isDefault, receiptTemplate }
 * @access Private - requires 'create' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.post('/',
  authorize('create', 'PrinterSettings'),
  printerSettingsController.createPrinter
);

/**
 * @route PUT /api/v1/system/printers/:id
 * @desc Update printer configuration
 * @body Partial printer configuration fields
 * @access Private - requires 'update' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.put('/:id',
  authorize('update', 'PrinterSettings'),
  printerSettingsController.updatePrinter
);

/**
 * @route DELETE /api/v1/system/printers/:id
 * @desc Delete printer configuration
 * @access Private - requires 'delete' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.delete('/:id',
  authorize('delete', 'PrinterSettings'),
  printerSettingsController.deletePrinter
);

/**
 * @route POST /api/v1/system/printers/:id/test
 * @desc Test single printer connection and update health status
 * @access Private - requires 'update' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.post('/:id/test',
  authorize('update', 'PrinterSettings'),
  printerSettingsController.testPrinterConnection
);

/**
 * @route POST /api/v1/system/printers/health-check/bulk
 * @desc Test all active network printers and update health status
 * @access Private - requires 'update' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.post('/health-check/bulk',
  authorize('update', 'PrinterSettings'),
  printerSettingsController.bulkHealthCheck
);

/**
 * @route POST /api/v1/system/printers/cash-drawer/open
 * @desc Open cash drawer connected to receipt printer
 * @access Private - requires 'update' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.post('/cash-drawer/open',
  authorize('update', 'PrinterSettings'),
  printerSettingsController.openCashDrawer
);

/**
 * @route GET /api/v1/system/printers/:id/stream/connection
 * @desc Stream real-time printer connection status via Server-Sent Events (SSE)
 * @desc Pings printer every 10 seconds with 3 second timeout
 * @response Content-Type: text/event-stream
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/:id/stream/connection',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.streamConnection
);

/**
 * @route GET /api/v1/system/printers/:id/stream/health
 * @desc Stream real-time printer health status via Server-Sent Events (SSE)
 * @query once=true  → Single health check, returns JSON (not SSE). Use this after
 *                     saving printer config to avoid the connection hanging indefinitely.
 * @response Content-Type: text/event-stream (default) | application/json (once=true)
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/:id/stream/health',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.streamHealth
);

/**
 * @route GET /api/v1/system/printers/:id/jobs
 * @desc Get printer jobs with filtering
 * @query status - Filter by status (pending, printing, completed, failed, cancelled)
 * @query limit - Number of jobs to return (default: 50)
 * @query offset - Pagination offset (default: 0)
 * @query includeStuck - Include stuck jobs analysis (default: false)
 * @access Private - requires 'read' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.get('/:id/jobs',
  authorize('read', 'PrinterSettings'),
  printerSettingsController.getPrinterJobs
);

/**
 * @route POST /api/v1/system/printers/:id/test-print
 * @desc Send test receipt to printer
 * @desc Creates a PrintJob and sends sample receipt with tenant info
 * @desc Job type is automatically determined from printer type
 * @body metadata - Optional metadata object for job tracking
 * @access Private - requires 'update' permission on 'PrinterSettings' + thermalPrinting feature
 */
router.post('/:id/test-print',
  authorize('update', 'PrinterSettings'),
  printerSettingsController.testPrint
);

module.exports = router;

