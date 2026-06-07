'use strict';

/**
 * Receipt Template Controller (Core Module)
 * 
 * Manages receipt templates for thermal printing.
 * Templates stored in tenant.settings.receiptTemplates JSONB array.
 * 
 * @module controllers/core/system/receiptTemplateController
 */

const { Tenant } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { v4: uuidv4 } = require('uuid');
const templateParserService = require('../../../services/templateParserService');

/**
 * Get all receipt templates
 * GET /api/v1/system/receipt-templates
 */
const getAllTemplates = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { templateType, isActive, isDefault } = req.query;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    let templates = tenant.settings?.receiptTemplates || [];

    // Apply filters
    if (templateType) {
      templates = templates.filter(t => t.templateType === templateType);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      templates = templates.filter(t => t.isActive === activeFilter);
    }

    if (isDefault !== undefined) {
      const defaultFilter = isDefault === 'true';
      templates = templates.filter(t => t.isDefault === defaultFilter);
    }

    logger.logInfo('Receipt templates retrieved', {
      action: 'GET_RECEIPT_TEMPLATES',
      tenantId,
      userId: req.user.id,
      count: templates.length,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: templates,
      pagination: {
        total: templates.length
      }
    });
  } catch (err) {
    logger.logSecurity('Error retrieving receipt templates', {
      action: 'GET_RECEIPT_TEMPLATES_ERROR',
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
 * Get single template by ID
 * GET /api/v1/system/receipt-templates/:id
 */
const getTemplateById = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const templates = tenant.settings?.receiptTemplates || [];
    const template = templates.find(t => t.id === id);

    if (!template) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    logger.logInfo('Receipt template retrieved', {
      action: 'GET_RECEIPT_TEMPLATE',
      templateId: id,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: template
    });
  } catch (err) {
    logger.logSecurity('Error retrieving receipt template', {
      action: 'GET_RECEIPT_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Create new receipt template
 * POST /api/v1/system/receipt-templates
 */
const createTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const {
      name,
      templateType = 'receipt',
      paperWidth = 48,
      header,
      body,
      footer,
      isActive = true,
      isDefault = false
    } = req.body;

    // Validation
    if (!name) {
      return next(createError('VALIDATION_ERROR', 'Template name is required', 400));
    }

    if (!body) {
      return next(createError('VALIDATION_ERROR', 'Template body is required', 400));
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const templates = settings.receiptTemplates || [];

    // If setting as default, remove default from others of same type
    if (isDefault) {
      templates.forEach(t => {
        if (t.templateType === templateType) {
          t.isDefault = false;
        }
      });
    }

    const templateId = uuidv4();
    const newTemplate = {
      id: templateId,
      name,
      templateType,
      paperWidth,
      header: header || {
        showLogo: false,
        showBusinessName: true,
        showBusinessInfo: true,
        customText: null
      },
      body: body || {
        showItems: true,
        showItemDetails: true,
        showPrices: true,
        showSubtotal: true,
        showTax: true,
        showDiscount: true,
        customSections: []
      },
      footer: footer || {
        showThankYou: true,
        showDateTime: true,
        customText: null,
        showQRCode: false
      },
      isActive,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    templates.push(newTemplate);
    settings.receiptTemplates = templates;

    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Receipt template created', {
      action: 'CREATE_RECEIPT_TEMPLATE',
      templateId,
      templateName: name,
      templateType,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate
    });
  } catch (err) {
    logger.logSecurity('Error creating receipt template', {
      action: 'CREATE_RECEIPT_TEMPLATE_ERROR',
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
 * Update receipt template
 * PATCH /api/v1/system/receipt-templates/:id
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const templates = settings.receiptTemplates || [];
    const templateIndex = templates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    // If setting as default, remove default from others
    if (updates.isDefault) {
      templates.forEach((t, idx) => {
        if (t.templateType === templates[templateIndex].templateType && idx !== templateIndex) {
          t.isDefault = false;
        }
      });
    }

    // Update template
    templates[templateIndex] = {
      ...templates[templateIndex],
      ...updates,
      id, // Preserve ID
      updatedAt: new Date()
    };

    settings.receiptTemplates = templates;
    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Receipt template updated', {
      action: 'UPDATE_RECEIPT_TEMPLATE',
      templateId: id,
      templateName: templates[templateIndex].name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: 'Template updated successfully',
      data: templates[templateIndex]
    });
  } catch (err) {
    logger.logSecurity('Error updating receipt template', {
      action: 'UPDATE_RECEIPT_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Delete receipt template
 * DELETE /api/v1/system/receipt-templates/:id
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    let templates = settings.receiptTemplates || [];

    const templateExists = templates.some(t => t.id === id);
    if (!templateExists) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    templates = templates.filter(t => t.id !== id);
    settings.receiptTemplates = templates;

    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Receipt template deleted', {
      action: 'DELETE_RECEIPT_TEMPLATE',
      templateId: id,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (err) {
    logger.logSecurity('Error deleting receipt template', {
      action: 'DELETE_RECEIPT_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Duplicate template
 * POST /api/v1/system/receipt-templates/:id/duplicate
 */
const duplicateTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { name } = req.body;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const templates = settings.receiptTemplates || [];
    const sourceTemplate = templates.find(t => t.id === id);

    if (!sourceTemplate) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    const newTemplateId = uuidv4();
    const duplicatedTemplate = {
      ...sourceTemplate,
      id: newTemplateId,
      name: name || `${sourceTemplate.name} (Copy)`,
      isDefault: false, // Duplicate is never default
      createdAt: new Date(),
      updatedAt: new Date()
    };

    templates.push(duplicatedTemplate);
    settings.receiptTemplates = templates;

    tenant.changed('settings', true);
    await tenant.update({ settings });

    logger.logInfo('Receipt template duplicated', {
      action: 'DUPLICATE_RECEIPT_TEMPLATE',
      sourceTemplateId: id,
      newTemplateId,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: duplicatedTemplate
    });
  } catch (err) {
    logger.logSecurity('Error duplicating receipt template', {
      action: 'DUPLICATE_RECEIPT_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Preview template with sample data
 * POST /api/v1/system/receipt-templates/:id/preview
 */
const previewTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { sampleData } = req.body;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const templates = tenant.settings?.receiptTemplates || [];
    const template = templates.find(t => t.id === id);

    if (!template) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    // Use provided sample data or generate default
    const data = sampleData || {
      businessName: tenant.name || 'Demo Business',
      businessAddress: tenant.settings?.businessInfo?.address || 'Jl. Demo No. 123, Jakarta',
      businessPhone: tenant.settings?.businessInfo?.phone || '021-12345678',
      businessEmail: tenant.settings?.businessInfo?.email || 'info@demo.com',
      transactionNumber: 'TRX-PREVIEW-001',
      transactionDate: new Date(),
      cashierName: req.user.username || 'Demo Cashier',
      customerName: 'Sample Customer',
      customerPhone: '0812-3456-7890',
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
          notes: 'Sesi 60 menit per pertemuan'
        }
      ],
      subtotal: 3900000,
      discount: 0,
      tax: 390000,
      total: 4290000,
      paymentMethod: 'Tunai',
      amountPaid: 4500000,
      change: 210000
    };

    // Parse template
    const receiptContent = templateParserService.parseTemplate(template, data);

    // Convert to readable format for preview (escape ESC/POS commands)
    const previewText = receiptContent
      .replace(/\x1b/g, '[ESC]')
      .replace(/\x1d/g, '[GS]')
      .replace(/\x00/g, '[NULL]')
      .replace(/\x01/g, '[SOH]')
      .replace(/\x02/g, '[STX]')
      .replace(/\x03/g, '[ETX]');

    logger.logInfo('Template previewed', {
      action: 'PREVIEW_TEMPLATE',
      templateId: id,
      templateName: template.name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          type: template.templateType
        },
        preview: {
          raw: receiptContent, // Original ESC/POS content
          readable: previewText, // Human-readable with command markers
          length: receiptContent.length
        },
        sampleData: data
      }
    });
  } catch (err) {
    logger.logSecurity('Error previewing template', {
      action: 'PREVIEW_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Preview draft template (without saving)
 * POST /api/v1/system/receipt-templates/preview-draft
 * Body: { template, data? }
 */
const previewDraftTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { template, data: customData } = req.body;

    // Validate template structure - allow empty for initial preview
    if (!template) {
      return next(createError('VALIDATION_ERROR', 'Template data is required', 400));
    }

    // Set defaults for missing template fields
    const defaultTemplate = {
      name: template.name || 'Draft Template',
      templateType: template.templateType || 'receipt',
      paperWidth: template.paperWidth || 48,
      header: template.header || {
        showLogo: false,
        showBusinessName: true,
        showBusinessInfo: true,
        customText: null
      },
      body: template.body || {
        showItems: true,
        showItemDetails: true,
        showPrices: true,
        showSubtotal: true,
        showTax: true,
        showDiscount: true,
        customSections: []
      },
      footer: template.footer || {
        showThankYou: true,
        showDateTime: true,
        showQRCode: false,
        customText: null
      },
      isActive: template.isActive !== undefined ? template.isActive : true,
      isDefault: template.isDefault !== undefined ? template.isDefault : false
    };

    // Merge with provided template data
    const mergedTemplate = {
      ...defaultTemplate,
      ...template,
      header: { ...defaultTemplate.header, ...template.header },
      body: { ...defaultTemplate.body, ...template.body },
      footer: { ...defaultTemplate.footer, ...template.footer }
    };

    // Get tenant for business info
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Use custom data if provided, otherwise use sample data
    const data = customData || {
      businessName: tenant.name || 'Your Business Name',
      businessAddress: tenant.settings?.businessAddress || 'Business Address',
      businessPhone: tenant.settings?.businessPhone || '021-12345678',
      transactionNumber: 'DRAFT-001',
      transactionDate: new Date().toISOString(),
      cashierName: req.user.name || 'Cashier',
      items: [
        {
          name: 'Sample Product 1',
          quantity: 2,
          price: 150000,
          total: 300000
        },
        {
          name: 'Sample Product 2',
          quantity: 1,
          price: 250000,
          total: 250000
        }
      ],
      subtotal: 550000,
      discount: 50000,
      tax: 50000,
      total: 550000,
      paymentMethod: 'Cash',
      amountPaid: 600000,
      change: 50000
    };

    // Parse template
    const receiptContent = templateParserService.parseTemplate(mergedTemplate, data);

    // Convert to readable format for preview
    const previewText = receiptContent
      .replace(/\x1b/g, '[ESC]')
      .replace(/\x1d/g, '[GS]')
      .replace(/\x00/g, '[NULL]')
      .replace(/\x01/g, '[SOH]')
      .replace(/\x02/g, '[STX]')
      .replace(/\x03/g, '[ETX]');

    logger.logInfo('Draft template previewed', {
      action: 'PREVIEW_DRAFT_TEMPLATE',
      templateName: mergedTemplate.name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      data: {
        template: {
          name: mergedTemplate.name,
          type: mergedTemplate.templateType
        },
        preview: {
          raw: receiptContent,
          readable: previewText,
          length: receiptContent.length
        },
        sampleData: data
      }
    });
  } catch (err) {
    logger.logSecurity('Error previewing draft template', {
      action: 'PREVIEW_DRAFT_TEMPLATE_ERROR',
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
 * Test print template
 * POST /api/v1/system/receipt-templates/:id/test-print
 * Body: { printerId, data? }
 */
const testPrintTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { printerId, data: customData } = req.body;

    if (!printerId) {
      return next(createError('VALIDATION_ERROR', 'printerId is required', 400));
    }

    // Get template
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};
    const templates = settings.receiptTemplates || [];
    const template = templates.find(t => t.id === id);

    if (!template) {
      return next(createError('NOT_FOUND', 'Template not found', 404));
    }

    // Get printer settings
    const printers = settings.printers || [];
    const printer = printers.find(p => p.id === printerId);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    // Use custom data if provided, otherwise use sample data
    const data = customData || {
      businessName: tenant.name || 'Your Business Name',
      businessAddress: settings.businessAddress || 'Business Address',
      businessPhone: settings.businessPhone || '021-12345678',
      transactionNumber: `TEST-${Date.now()}`,
      transactionDate: new Date().toISOString(),
      cashierName: req.user.name || 'Cashier',
      items: [
        {
          name: 'Test Product 1',
          quantity: 2,
          price: 150000,
          total: 300000
        },
        {
          name: 'Test Product 2',
          quantity: 1,
          price: 250000,
          total: 250000
        }
      ],
      subtotal: 550000,
      discount: 50000,
      tax: 50000,
      total: 550000,
      paymentMethod: 'Cash',
      amountPaid: 600000,
      change: 50000
    };

    // Parse template
    const receiptContent = templateParserService.parseTemplate(template, data);

    // Create print job
    const PrintJob = require('../../../models').PrintJob;
    const printJob = await PrintJob.create({
      tenantId,
      printerId,
      jobType: template.templateType, // Use template type (receipt, kitchen, etc)
      printData: receiptContent,
      status: 'pending',
      metadata: {
        templateId: template.id,
        templateName: template.name,
        testPrint: true,
        triggeredBy: req.user.id,
        triggeredAt: new Date().toISOString()
      }
    });

    // Send to printer via TCP socket
    const net = require('net');
    const client = new net.Socket();
    const timeoutMs = 5000;

    const printPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Print timeout'));
      }, timeoutMs);

      client.connect(printer.port, printer.ipAddress, async () => {
        clearTimeout(timeout);
        client.write(Buffer.from(receiptContent, 'binary'));
        
        await printJob.markCompleted();
        
        logger.logInfo('Template test print successful', {
          action: 'TEST_PRINT_TEMPLATE',
          templateId: template.id,
          templateName: template.name,
          printerId,
          printerName: printer.name,
          printJobId: printJob.id,
          tenantId,
          userId: req.user.id,
          ip: getClientIp(req),
          userAgent: getUserAgent(req)
        });

        client.end();
        resolve();
      });

      client.on('error', async (err) => {
        clearTimeout(timeout);
        await printJob.markFailed(err.message);
        reject(err);
      });

      client.on('close', () => {
        clearTimeout(timeout);
      });
    });

    await printPromise;

    return res.json({
      success: true,
      message: 'Template test print sent successfully',
      data: {
        printJobId: printJob.id,
        templateId: template.id,
        templateName: template.name,
        printerId,
        printerName: printer.name,
        status: 'completed'
      }
    });

  } catch (err) {
    logger.logSecurity('Error test printing template', {
      action: 'TEST_PRINT_TEMPLATE_ERROR',
      error: err.message,
      templateId: req.params.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });
    return next(err);
  }
};

/**
 * Test print draft template (without saving)
 * POST /api/v1/system/receipt-templates/test-print-draft
 * Body: { printerId, template, data? }
 */
const testPrintDraftTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { printerId, template: draftTemplate, data: customData } = req.body;

    if (!printerId) {
      return next(createError('VALIDATION_ERROR', 'printerId is required', 400));
    }

    // Get tenant
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const settings = tenant.settings || {};

    // Get printer settings
    const printers = settings.printers || [];
    const printer = printers.find(p => p.id === printerId);

    if (!printer) {
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    // Use draft template or create default
    const defaultTemplate = {
      id: `draft-${Date.now()}`,
      name: draftTemplate?.name || 'Draft Template',
      templateType: draftTemplate?.templateType || 'receipt',
      paperSize: draftTemplate?.paperSize || { width: 58, unit: 'mm' },
      headerContent: draftTemplate?.headerContent || '{{businessName}}\n{{businessAddress}}\n{{businessPhone}}\n================================',
      bodyContent: draftTemplate?.bodyContent || '{{transactionNumber}}\n{{transactionDate}}\n--------------------------------\n{{#items}}\n{{name}} x{{quantity}}\n  @{{price}} = {{total}}\n{{/items}}\n--------------------------------\nSubtotal: {{subtotal}}\nDiscount: {{discount}}\nTax: {{tax}}\n================================\nTOTAL: {{total}}',
      footerContent: draftTemplate?.footerContent || 'Payment: {{paymentMethod}}\nPaid: {{amountPaid}}\nChange: {{change}}\n\nThank you for your business!\n================================',
      styling: draftTemplate?.styling || {
        alignment: 'left',
        fontSize: 'normal',
        fontStyle: 'normal',
        lineSpacing: 1
      }
    };

    const template = draftTemplate ? { ...defaultTemplate, ...draftTemplate } : defaultTemplate;

    // Use custom data if provided, otherwise use sample data
    const data = customData || {
      businessName: tenant.name || 'Your Business Name',
      businessAddress: settings.businessAddress || 'Business Address',
      businessPhone: settings.businessPhone || '021-12345678',
      transactionNumber: `TEST-${Date.now()}`,
      transactionDate: new Date().toISOString(),
      cashierName: req.user.name || 'Cashier',
      items: [
        {
          name: 'Test Product 1',
          quantity: 2,
          price: 150000,
          total: 300000
        },
        {
          name: 'Test Product 2',
          quantity: 1,
          price: 250000,
          total: 250000
        }
      ],
      subtotal: 550000,
      discount: 50000,
      tax: 50000,
      total: 550000,
      paymentMethod: 'Cash',
      amountPaid: 600000,
      change: 50000
    };

    // Parse template
    const receiptContent = templateParserService.parseTemplate(template, data);

    // Create print job
    const PrintJob = require('../../../models').PrintJob;
    const printJob = await PrintJob.create({
      tenantId,
      printerId,
      jobType: template.templateType,
      printData: receiptContent,
      status: 'pending',
      metadata: {
        templateName: template.name,
        testPrint: true,
        draftPrint: true,
        triggeredBy: req.user.id,
        triggeredAt: new Date().toISOString()
      }
    });

    // Send to printer via TCP socket
    const net = require('net');
    const client = new net.Socket();
    const timeoutMs = 5000;

    const printPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Print timeout'));
      }, timeoutMs);

      client.connect(printer.port, printer.ipAddress, async () => {
        clearTimeout(timeout);
        client.write(Buffer.from(receiptContent, 'binary'));
        
        await printJob.markCompleted();
        
        logger.logInfo('Draft template test print successful', {
          action: 'TEST_PRINT_DRAFT_TEMPLATE',
          templateName: template.name,
          printerId,
          printerName: printer.name,
          printJobId: printJob.id,
          tenantId,
          userId: req.user.id,
          ip: getClientIp(req),
          userAgent: getUserAgent(req)
        });

        client.end();
        resolve();
      });

      client.on('error', async (err) => {
        clearTimeout(timeout);
        await printJob.markFailed(err.message);
        reject(err);
      });

      client.on('close', () => {
        clearTimeout(timeout);
      });
    });

    await printPromise;

    return res.json({
      success: true,
      message: 'Draft template test print sent successfully',
      data: {
        printJobId: printJob.id,
        templateName: template.name,
        printerId,
        printerName: printer.name,
        status: 'completed'
      }
    });

  } catch (err) {
    logger.logSecurity('Error test printing draft template', {
      action: 'TEST_PRINT_DRAFT_TEMPLATE_ERROR',
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
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  previewTemplate,
  previewDraftTemplate,
  testPrintTemplate,
  testPrintDraftTemplate
};
