'use strict';

/**
 * Receipt Template Routes (Core Module)
 * 
 * API endpoints for receipt template management.
 * 
 * @module routes/core/system/receiptTemplate.routes
 */

const express = require('express');
const router = express.Router();
const receiptTemplateController = require('../../../controllers/core/system/receiptTemplateController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/permissionMiddleware');
const { requireFeature } = require('../../../middlewares/featureGateMiddleware');

// All routes require authentication and thermalPrinting feature
router.use(authenticate);
router.use(requireFeature('thermalPrinting'));

/**
 * @route GET /api/v1/system/receipt-templates
 * @desc Get all receipt templates with filters
 * @query templateType - Filter by type (receipt, kitchen, invoice, etc)
 * @query isActive - Filter by active status (true/false)
 * @query isDefault - Filter default templates (true/false)
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.get('/',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.getAllTemplates
);

/**
 * @route GET /api/v1/system/receipt-templates/:id
 * @desc Get single receipt template by ID
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.get('/:id',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.getTemplateById
);

/**
 * @route POST /api/v1/system/receipt-templates
 * @desc Create new receipt template
 * @body name - Template name (required)
 * @body templateType - Type: receipt, kitchen, label, invoice, report (default: receipt)
 * @body paperWidth - Character width for 80mm/58mm paper (default: 48)
 * @body header - Header configuration object
 * @body body - Body configuration object (required)
 * @body footer - Footer configuration object
 * @body isActive - Active status (default: true)
 * @body isDefault - Set as default template (default: false)
 * @access Private - requires 'create' permission on 'ReceiptTemplate'
 */
router.post('/',
  authorize('create', 'ReceiptTemplate'),
  receiptTemplateController.createTemplate
);

/**
 * @route PATCH /api/v1/system/receipt-templates/:id
 * @desc Update receipt template
 * @body Any template field to update
 * @access Private - requires 'update' permission on 'ReceiptTemplate'
 */
router.patch('/:id',
  authorize('update', 'ReceiptTemplate'),
  receiptTemplateController.updateTemplate
);

/**
 * @route DELETE /api/v1/system/receipt-templates/:id
 * @desc Delete receipt template
 * @access Private - requires 'delete' permission on 'ReceiptTemplate'
 */
router.delete('/:id',
  authorize('delete', 'ReceiptTemplate'),
  receiptTemplateController.deleteTemplate
);

/**
 * @route POST /api/v1/system/receipt-templates/:id/duplicate
 * @desc Duplicate existing template
 * @body name - New template name (optional, defaults to "Original Name (Copy)")
 * @access Private - requires 'create' permission on 'ReceiptTemplate'
 */
router.post('/:id/duplicate',
  authorize('create', 'ReceiptTemplate'),
  receiptTemplateController.duplicateTemplate
);

/**
 * @route POST /api/v1/system/receipt-templates/preview-draft
 * @desc Preview draft template without saving (for live preview in form)
 * @body template - Template object with configuration (required)
 * @body data - Optional custom sample data
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.post('/preview-draft',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.previewDraftTemplate
);

/**
 * @route POST /api/v1/system/receipt-templates/:id/preview
 * @desc Preview saved template with sample data
 * @body sampleData - Optional custom sample data, uses defaults if not provided
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.post('/:id/preview',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.previewTemplate
);

/**
 * @route POST /api/v1/system/receipt-templates/:id/test-print
 * @desc Test print template to actual printer
 * @body printerId - Printer ID (required)
 * @body data - Optional custom sample data
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.post('/:id/test-print',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.testPrintTemplate
);

/**
 * @route POST /api/v1/system/receipt-templates/test-print-draft
 * @desc Test print draft template without saving
 * @body printerId - Printer ID (required)
 * @body template - Draft template object
 * @body data - Optional custom sample data
 * @access Private - requires 'read' permission on 'ReceiptTemplate'
 */
router.post('/test-print-draft',
  authorize('read', 'ReceiptTemplate'),
  receiptTemplateController.testPrintDraftTemplate
);

module.exports = router;
