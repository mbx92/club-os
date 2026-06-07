'use strict';

/**
 * Receipt Settings Routes
 * 
 * API endpoints for managing receipt template settings
 * 
 * @module routes/core/system/receiptSettings.routes
 */

const express = require('express');
const router = express.Router();
const receiptSettingsController = require('../../../controllers/core/system/receiptSettingsController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/system/receipt-settings
 * @desc Get current receipt template settings (all or specific type)
 * @query type - Optional template type: receipt, kitchen, label, invoice, report, membership, class, personalTraining
 * @access Private - requires 'read' permission on 'SystemSettings'
 */
router.get('/',
  authorizeCasl('read', 'SystemSettings'),
  receiptSettingsController.getReceiptSettings
);

/**
 * @route POST /api/v1/system/receipt-settings/test-print
 * @desc Test print receipt template with mock data
 * @body { type: 'receipt|kitchen|label|invoice|report|membership|class|personalTraining', mockData?: {...} }
 * @access Private - requires 'read' permission on 'SystemSettings'
 */
router.post('/test-print',
  authorizeCasl('read', 'SystemSettings'),
  receiptSettingsController.testPrintReceipt
);

/**
 * @route POST /api/v1/system/receipt-settings/test-print-actual
 * @desc Test print receipt template to actual thermal printer
 * @body { type: 'receipt|kitchen|label|invoice|report|membership|class|personalTraining', printerId: 'uuid', mockData?: {...} }
 * @access Private - requires 'read' permission on 'SystemSettings'
 */
router.post('/test-print-actual',
  authorizeCasl('read', 'SystemSettings'),
  receiptSettingsController.testPrintActual
);

/**
 * @route POST /api/v1/system/receipt-settings
 * @desc Create new receipt template
 * @body { type: 'receipt', name: 'Custom Receipt', settings: {...} }
 * @access Private - requires 'create' permission on 'SystemSettings'
 */
router.post('/',
  authorizeCasl('create', 'SystemSettings'),
  receiptSettingsController.createReceiptTemplate
);

/**
 * @route PUT /api/v1/system/receipt-settings
 * @desc Update receipt template settings
 * @body { type: 'receipt', settings: {...} }
 * @access Private - requires 'update' permission on 'SystemSettings'
 */
router.put('/',
  authorizeCasl('update', 'SystemSettings'),
  receiptSettingsController.updateReceiptSettings
);

/**
 * @route POST /api/v1/system/receipt-settings/reset
 * @desc Reset receipt template settings to default
 * @query type - Optional template type to reset
 * @access Private - requires 'update' permission on 'SystemSettings'
 */
router.post('/reset',
  authorizeCasl('update', 'SystemSettings'),
  receiptSettingsController.resetReceiptSettings
);

module.exports = router;
