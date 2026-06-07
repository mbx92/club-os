'use strict';

/**
 * Receipt Settings Controller
 * 
 * Manages receipt template settings in tenant.settings.receiptTemplate
 * Provides flexible customization for receipt printing
 * 
 * @module controllers/core/system/receiptSettingsController
 */

const { Tenant } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const receiptPrinterService = require('../../../services/receiptPrinterService');

/**
 * ESC/POS Commands for thermal printer
 */
const ESC = '\x1b';
const GS = '\x1d';
const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  CUT_PAPER: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  FEED_AND_CUT: `${GS}V\x41\x03`,
  LINE_FEED: '\n'
};

/**
 * Get receipt template settings
 * GET /api/v1/system/receipt-settings?type=orderReceipt|kitchenTicket|membershipReceipt
 */
const getReceiptSettings = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type } = req.query; // receipt, kitchen, label, invoice, report

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    let settings;
    if (type) {
      // Get specific template type
      const templates = tenant.settings?.receiptTemplates || {};
      settings = templates[type] || getDefaultTemplate(type);
    } else {
      // Get all templates
      settings = tenant.settings?.receiptTemplates || getAllDefaultTemplates();
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new receipt template
 * POST /api/v1/system/receipt-settings
 * Body: { type: 'receipt', name: 'Custom Receipt', settings: {...} }
 */
const createReceiptTemplate = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type, name, settings: templateSettings } = req.body;

    if (!type) {
      return next(createError('VALIDATION_ERROR', 'Template type is required', 400));
    }

    const validTypes = ['receipt', 'kitchen', 'label', 'invoice', 'report'];
    if (!validTypes.includes(type)) {
      return next(createError('VALIDATION_ERROR', `Invalid template type. Valid types: ${validTypes.join(', ')}`, 400));
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Check if template already exists
    const currentSettings = tenant.settings || {};
    const currentTemplates = currentSettings.receiptTemplates || {};
    
    if (currentTemplates[type]) {
      return next(createError('CONFLICT', `Template type '${type}' already exists. Use PUT to update.`, 409));
    }

    // Create new template with default values
    const newTemplate = {
      ...getDefaultTemplate(type),
      ...templateSettings,
      name: name || `${type} Template`,
      createdAt: new Date().toISOString()
    };

    const updatedSettings = {
      ...currentSettings,
      receiptTemplates: {
        ...currentTemplates,
        [type]: newTemplate
      }
    };

    await tenant.update({ settings: updatedSettings });

    logger.logAudit(`Receipt template created: ${type}`, {
      action: 'CREATE_RECEIPT_TEMPLATE',
      templateType: type,
      templateName: name,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      message: `Receipt template created successfully: ${type}`,
      data: updatedSettings.receiptTemplates[type]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update receipt template settings
 * PUT /api/v1/system/receipt-settings
 * Body: { type: 'receipt', settings: {...} }
 */
const updateReceiptSettings = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type, settings: templateSettings } = req.body;

    if (!type) {
      return next(createError('VALIDATION_ERROR', 'Template type is required', 400));
    }

    const validTypes = ['receipt', 'kitchen', 'label', 'invoice', 'report', 'membership', 'class', 'personalTraining'];
    if (!validTypes.includes(type)) {
      return next(createError('VALIDATION_ERROR', `Invalid template type. Valid types: ${validTypes.join(', ')}`, 400));
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Merge with existing settings
    const currentSettings = tenant.settings || {};
    const currentTemplates = currentSettings.receiptTemplates || {};
    
    const updatedSettings = {
      ...currentSettings,
      receiptTemplates: {
        ...currentTemplates,
        [type]: {
          ...currentTemplates[type],
          ...templateSettings
        }
      }
    };

    await tenant.update({ settings: updatedSettings });

    logger.logAudit(`Receipt template settings updated: ${type}`, {
      action: 'UPDATE_RECEIPT_SETTINGS',
      templateType: type,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: `Receipt template settings updated successfully: ${type}`,
      data: updatedSettings.receiptTemplates[type]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset receipt template settings to default
 * POST /api/v1/system/receipt-settings/reset?type=orderReceipt
 */
const resetReceiptSettings = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type } = req.query;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    const currentSettings = tenant.settings || {};
    let updatedSettings;

    if (type) {
      // Reset specific template
      const currentTemplates = currentSettings.receiptTemplates || {};
      updatedSettings = {
        ...currentSettings,
        receiptTemplates: {
          ...currentTemplates,
          [type]: getDefaultTemplate(type)
        }
      };
    } else {
      // Reset all templates
      updatedSettings = {
        ...currentSettings,
        receiptTemplates: getAllDefaultTemplates()
      };
    }

    await tenant.update({ settings: updatedSettings });

    logger.logAudit(`Receipt template settings reset to default${type ? `: ${type}` : ' (all)'}`, {
      action: 'RESET_RECEIPT_SETTINGS',
      templateType: type || 'all',
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: `Receipt template settings reset to default${type ? `: ${type}` : ' (all templates)'}`,
      data: type ? updatedSettings.receiptTemplates[type] : updatedSettings.receiptTemplates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all default receipt templates
 */
function getAllDefaultTemplates() {
  return {
    receipt: getDefaultTemplate('receipt'),
    kitchen: getDefaultTemplate('kitchen'),
    label: getDefaultTemplate('label'),
    invoice: getDefaultTemplate('invoice'),
    report: getDefaultTemplate('report'),
    membership: getDefaultTemplate('membership'),
    class: getDefaultTemplate('class'),
    personalTraining: getDefaultTemplate('personalTraining')
  };
}

/**
 * Get default receipt template settings by type
 */
function getDefaultTemplate(type = 'receipt') {
  const templates = {
    // Restaurant order receipt (Customer receipt)
    receipt: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: true,
        addressOverride: null,
        showCity: true,
        showPhone: true,
        phoneOverride: null,
        showTaxNumber: false,
        taxNumber: null,
        customHeaderText: null,
        separatorChar: '='
      },
      body: {
        orderLabel: 'Order',
        dateLabel: 'Tanggal',
        showOrderType: true,
        typeLabel: 'Tipe',
        dineInLabel: 'Dine In',
        takeawayLabel: 'Take Away',
        deliveryLabel: 'Delivery',
        showTable: true,
        tableLabel: 'Meja',
        showCustomer: true,
        customerLabel: 'Pelanggan',
        showCashier: true,
        cashierLabel: 'Kasir',
        showItemCode: false,
        subtotalLabel: 'Subtotal',
        showDiscount: true,
        discountLabel: 'Diskon',
        showTax: true,
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL',
        totalDoubleSize: true,
        showPayment: true,
        paymentLabel: 'Pembayaran',
        showPaymentBreakdown: true,
        paymentMethodLabels: {
          cash: 'Tunai',
          debit: 'Debit',
          credit: 'Kredit',
          qris: 'QRIS',
          transfer: 'Transfer'
        },
        showPaidAmount: true,
        paidLabel: 'Dibayar',
        showChange: true,
        changeLabel: 'Kembalian',
        separatorChar: '-'
      },
      footer: {
        showThankYou: true,
        thankYouMessage: 'Terima kasih atas kunjungan Anda!',
        customFooterText: null,
        showSocialMedia: false,
        socialMedia: null,
        instagramLabel: 'IG',
        facebookLabel: 'FB',
        whatsappLabel: 'WA',
        showWebsite: false,
        website: null,
        separatorChar: '=',
        autoCut: true
      }
    },

    // Kitchen order ticket (shorter, focus on preparation)
    kitchen: {
      paperWidth: 48,
      header: {
        showBusinessName: false,
        showAddress: false,
        showCity: false,
        showPhone: false,
        customHeaderText: '=== DAPUR ===',
        separatorChar: '='
      },
      body: {
        orderLabel: 'Order',
        dateLabel: 'Waktu',
        showOrderType: true,
        typeLabel: 'Tipe',
        dineInLabel: 'Dine In',
        takeawayLabel: 'Take Away',
        deliveryLabel: 'Delivery',
        showTable: true,
        tableLabel: 'Meja',
        showCustomer: true,
        customerLabel: 'Atas Nama',
        showCashier: false,
        showItemCode: false,
        showQuantity: true,
        showModifiers: true,
        showNotes: true,
        notesLabel: 'Catatan',
        showPrices: false,  // Kitchen tidak perlu lihat harga
        separatorChar: '-'
      },
      footer: {
        showThankYou: false,
        customFooterText: 'SEGERA PROSES!',
        autoCut: true
      }
    },

    // Report receipt (summary/statistics)
    report: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: false,
        showCity: false,
        showPhone: false,
        customHeaderText: '=== LAPORAN ===',
        separatorChar: '='
      },
      body: {
        reportLabel: 'Laporan',
        reportTypeLabel: 'Jenis',
        periodLabel: 'Periode',
        dateLabel: 'Tanggal',
        timeLabel: 'Waktu',
        printedByLabel: 'Dicetak oleh',
        showSummary: true,
        summaryLabel: 'Ringkasan',
        totalLabel: 'Total',
        totalDoubleSize: false,
        separatorChar: '-'
      },
      footer: {
        showThankYou: false,
        customFooterText: 'Dokumen ini dicetak otomatis',
        separatorChar: '=',
        autoCut: true
      }
    },

    // Membership receipt (Time-based service)
    membership: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: true,
        addressOverride: null,
        showCity: true,
        showPhone: true,
        phoneOverride: null,
        showTaxNumber: false,
        taxNumber: null,
        customHeaderText: null,
        separatorChar: '='
      },
      body: {
        receiptLabel: 'BUKTI PEMBELIAN MEMBERSHIP',
        receiptNumberLabel: 'No. Transaksi',
        dateLabel: 'Tanggal',
        timeLabel: 'Waktu',
        memberLabel: 'Member',
        memberIdLabel: 'ID Member',
        packageLabel: 'Paket',
        serviceTypeLabel: 'Jenis Layanan',
        membershipLabel: 'Membership',
        // Time-based fields
        durationType: 'time',
        durationLabel: 'Durasi',
        startDateLabel: 'Berlaku Dari',
        endDateLabel: 'Berlaku Sampai',
        validityPeriodLabel: 'Masa Aktif',
        showValidityPeriod: true,
        // Payment fields
        priceLabel: 'Harga',
        discountLabel: 'Diskon',
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL BAYAR',
        totalDoubleSize: true,
        paymentMethodLabel: 'Metode Pembayaran',
        showPaymentBreakdown: true,
        paymentMethodLabels: {
          cash: 'Tunai',
          debit: 'Debit',
          credit: 'Kredit',
          qris: 'QRIS',
          transfer: 'Transfer'
        },
        separatorChar: '-'
      },
      footer: {
        showThankYou: true,
        thankYouMessage: 'Selamat bergabung! Nikmati fasilitas kami.',
        customFooterText: 'Simpan struk ini sebagai bukti pembelian.\nTunjukkan saat check-in.',
        showSocialMedia: false,
        socialMedia: null,
        instagramLabel: 'IG',
        facebookLabel: 'FB',
        whatsappLabel: 'WA',
        showWebsite: false,
        website: null,
        separatorChar: '=',
        autoCut: true
      }
    },

    // Class receipt (Time-based OR Session-based)
    class: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: true,
        addressOverride: null,
        showCity: true,
        showPhone: true,
        phoneOverride: null,
        showTaxNumber: false,
        taxNumber: null,
        customHeaderText: null,
        separatorChar: '='
      },
      body: {
        receiptLabel: 'BUKTI PEMBELIAN CLASS',
        receiptNumberLabel: 'No. Transaksi',
        dateLabel: 'Tanggal',
        timeLabel: 'Waktu',
        memberLabel: 'Member',
        memberIdLabel: 'ID Member',
        packageLabel: 'Paket Class',
        serviceTypeLabel: 'Jenis Layanan',
        classLabel: 'Class',
        instructorLabel: 'Instruktur',
        showInstructor: true,
        // Dual support: time OR session
        durationType: 'hybrid', // 'time', 'session', or 'hybrid'
        // Time-based fields
        durationLabel: 'Durasi',
        startDateLabel: 'Berlaku Dari',
        endDateLabel: 'Berlaku Sampai',
        validityPeriodLabel: 'Masa Aktif',
        showValidityPeriod: true,
        // Session-based fields
        sessionLabel: 'Jumlah Sesi',
        sessionsLabel: 'Sesi',
        totalSessionsLabel: 'Total Sesi',
        remainingSessionsLabel: 'Sisa Sesi',
        showSessionInfo: true,
        // Payment fields
        priceLabel: 'Harga',
        pricePerSessionLabel: 'Harga per Sesi',
        showPricePerSession: true,
        discountLabel: 'Diskon',
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL BAYAR',
        totalDoubleSize: true,
        paymentMethodLabel: 'Metode Pembayaran',
        showPaymentBreakdown: true,
        paymentMethodLabels: {
          cash: 'Tunai',
          debit: 'Debit',
          credit: 'Kredit',
          qris: 'QRIS',
          transfer: 'Transfer'
        },
        separatorChar: '-'
      },
      footer: {
        showThankYou: true,
        thankYouMessage: 'Selamat! Siap untuk class pertama Anda?',
        customFooterText: 'Reservasi class melalui aplikasi atau front desk.\nDatang 10 menit sebelum class dimulai.',
        showSocialMedia: false,
        socialMedia: null,
        instagramLabel: 'IG',
        facebookLabel: 'FB',
        whatsappLabel: 'WA',
        showWebsite: false,
        website: null,
        separatorChar: '=',
        autoCut: true
      }
    },

    // Personal Training receipt (Session-based service)
    personalTraining: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: true,
        addressOverride: null,
        showCity: true,
        showPhone: true,
        phoneOverride: null,
        showTaxNumber: false,
        taxNumber: null,
        customHeaderText: null,
        separatorChar: '='
      },
      body: {
        receiptLabel: 'BUKTI PEMBELIAN PERSONAL TRAINING',
        receiptNumberLabel: 'No. Transaksi',
        dateLabel: 'Tanggal',
        timeLabel: 'Waktu',
        memberLabel: 'Member',
        memberIdLabel: 'ID Member',
        packageLabel: 'Paket PT',
        serviceTypeLabel: 'Jenis Layanan',
        ptLabel: 'Personal Training',
        trainerLabel: 'Trainer',
        showTrainer: true,
        // Session-based fields
        durationType: 'session',
        sessionLabel: 'Jumlah Sesi',
        sessionsLabel: 'Sesi',
        totalSessionsLabel: 'Total Sesi',
        sessionDurationLabel: 'Durasi per Sesi',
        showSessionDuration: true,
        remainingSessionsLabel: 'Sisa Sesi',
        showSessionInfo: true,
        // Validity period (session expire date)
        validUntilLabel: 'Berlaku Sampai',
        showValidUntil: true,
        // Payment fields
        priceLabel: 'Harga',
        pricePerSessionLabel: 'Harga per Sesi',
        showPricePerSession: true,
        discountLabel: 'Diskon',
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL BAYAR',
        totalDoubleSize: true,
        paymentMethodLabel: 'Metode Pembayaran',
        showPaymentBreakdown: true,
        paymentMethodLabels: {
          cash: 'Tunai',
          debit: 'Debit',
          credit: 'Kredit',
          qris: 'QRIS',
          transfer: 'Transfer'
        },
        separatorChar: '-'
      },
      footer: {
        showThankYou: true,
        thankYouMessage: 'Sukses dimulai dari langkah pertama!',
        customFooterText: 'Hubungi trainer untuk jadwal sesi pertama.\nKonsultasi nutrisi gratis untuk member PT.',
        showSocialMedia: false,
        socialMedia: null,
        instagramLabel: 'IG',
        facebookLabel: 'FB',
        whatsappLabel: 'WA',
        showWebsite: false,
        website: null,
        separatorChar: '=',
        autoCut: true
      }
    },

    // Invoice receipt (detailed billing)
    invoice: {
      paperWidth: 48,
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: true,
        addressOverride: null,
        showCity: true,
        showPhone: true,
        phoneOverride: null,
        showTaxNumber: true,
        taxNumber: null,
        customHeaderText: 'INVOICE',
        separatorChar: '='
      },
      body: {
        invoiceLabel: 'Invoice',
        dateLabel: 'Tanggal',
        dueLabel: 'Jatuh Tempo',
        customerLabel: 'Pelanggan',
        addressLabel: 'Alamat',
        showItemCode: true,
        itemCodeLabel: 'Kode',
        descriptionLabel: 'Deskripsi',
        qtyLabel: 'Qty',
        priceLabel: 'Harga',
        amountLabel: 'Jumlah',
        subtotalLabel: 'Subtotal',
        showDiscount: true,
        discountLabel: 'Diskon',
        showTax: true,
        taxLabel: 'Pajak',
        totalLabel: 'TOTAL',
        totalDoubleSize: true,
        separatorChar: '-'
      },
      footer: {
        showThankYou: true,
        thankYouMessage: 'Terima kasih atas kepercayaan Anda',
        customFooterText: 'Pembayaran dapat dilakukan via transfer atau tunai',
        showBankInfo: true,
        bankInfo: 'Bank: BCA 1234567890 a.n. PT Example',
        separatorChar: '=',
        autoCut: true
      }
    },

    // Label receipt (minimal info for packaging)
    label: {
      paperWidth: 32,  // Smaller label paper
      header: {
        showBusinessName: true,
        businessNameOverride: null,
        showAddress: false,
        showCity: false,
        showPhone: true,
        phoneOverride: null,
        separatorChar: '-'
      },
      body: {
        orderLabel: 'Order',
        dateLabel: 'Tanggal',
        typeLabel: 'Tipe',
        takeawayLabel: 'Take Away',
        deliveryLabel: 'Delivery',
        customerLabel: 'Untuk',
        showItemSummary: true,
        showPrices: false,
        separatorChar: '-'
      },
      footer: {
        showThankYou: false,
        autoCut: true
      }
    }
  };

  return templates[type] || templates.receipt;
}

/**
 * Test print receipt template
 * POST /api/v1/system/receipt-settings/test-print
 * Body: { type: 'receipt', mockData?: {...} }
 */
const testPrintReceipt = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type, mockData } = req.body;

    if (!type) {
      return next(createError('VALIDATION_ERROR', 'Template type is required', 400));
    }

    const validTypes = ['receipt', 'kitchen', 'label', 'invoice', 'report', 'membership', 'class', 'personalTraining'];
    if (!validTypes.includes(type)) {
      return next(createError('VALIDATION_ERROR', `Invalid template type. Valid types: ${validTypes.join(', ')}`, 400));
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Get template settings
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates[type] || getDefaultTemplate(type);

    // Generate mock data based on type
    const testData = mockData || generateMockData(type, tenant, req.user);

    // Generate receipt text preview
    const receiptText = generateReceiptPreview(template, testData, type);

    logger.logAudit(`Receipt template test print: ${type}`, {
      action: 'TEST_PRINT_RECEIPT',
      templateType: type,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: `Test preview generated for ${type} template`,
      data: {
        type,
        template,
        mockData: testData,
        preview: receiptText,
        note: 'This is a preview. Actual print may vary based on printer settings.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test print receipt template to actual printer
 * POST /api/v1/system/receipt-settings/test-print-actual
 * Body: { type: 'receipt', printerId: 'uuid', mockData?: {...} }
 */
const testPrintActual = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { type, printerId, mockData } = req.body;

    if (!type) {
      return next(createError('VALIDATION_ERROR', 'Template type is required', 400));
    }

    if (!printerId) {
      return next(createError('VALIDATION_ERROR', 'Printer ID is required', 400));
    }

    const validTypes = ['receipt', 'kitchen', 'label', 'invoice', 'report', 'membership', 'class', 'personalTraining'];
    if (!validTypes.includes(type)) {
      return next(createError('VALIDATION_ERROR', `Invalid template type. Valid types: ${validTypes.join(', ')}`, 400));
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return next(createError('NOT_FOUND', 'Tenant not found', 404));
    }

    // Get printers from tenant settings (stored as JSON array)
    const printers = tenant.settings?.printers || [];
    const printer = printers.find(p => p.id === printerId);

    if (!printer) {
      logger.warn('Printer not found for test print', {
        printerId,
        tenantId,
        userId: req.user.id,
        availablePrinters: printers.map(p => ({ id: p.id, name: p.name }))
      });
      
      return next(createError('NOT_FOUND', 'Printer not found', 404));
    }

    if (!printer.isActive) {
      return next(createError('VALIDATION_ERROR', 'Printer is not active', 400));
    }

    // Get template settings
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates[type] || getDefaultTemplate(type);

    // Generate mock data based on type
    const testData = mockData || generateMockData(type, tenant, req.user);

    // Generate receipt text using service (same format as actual orders)
    let receiptText;
    
    if (type === 'receipt') {
      // Use buildOrderReceipt from service for consistent formatting
      const orderMockData = {
        transactionNumber: testData.orderNumber,
        createdAt: new Date(),
        orderType: testData.orderType === 'Dine In' ? 'dine-in' : testData.orderType === 'Take Away' ? 'takeaway' : 'delivery',
        table: testData.table ? { tableNumber: testData.table } : null,
        customerName: testData.customer,
        createdByUser: { name: testData.cashier },
        items: testData.items?.map(item => ({
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.total,
          notes: item.notes
        })) || [],
        subtotal: testData.subtotal,
        tax: testData.tax,
        voucherDiscount: testData.discount,
        totalAmount: testData.total,
        status: 'completed',
        payments: testData.payments?.map(p => ({
          paymentMethod: p.method,
          amount: p.amount
        })) || [],
        paidAmount: testData.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
        changeAmount: testData.change || 0
      };
      
      receiptText = receiptPrinterService.buildOrderReceipt(orderMockData, tenant, template);
    } else if (type === 'kitchen') {
      // Use buildKitchenTicket for kitchen orders
      const kitchenItems = testData.items?.map(item => ({
        itemName: item.name,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers
      })) || [];
      
      const kitchenMockData = {
        transactionNumber: testData.orderNumber,
        createdAt: new Date(),
        orderType: testData.orderType === 'Dine In' ? 'dine-in' : 'takeaway',
        table: testData.table ? { tableNumber: testData.table } : null,
        customerName: testData.customer
      };
      
      receiptText = receiptPrinterService.buildKitchenTicket(kitchenMockData, kitchenItems, tenant, template);
    } else {
      // For other types (membership, class, PT, label, invoice, report), use custom preview
      receiptText = generateReceiptPreview(template, testData, type);
    }

    // Send to printer via TCP socket
    try {
      await receiptPrinterService.sendToPrinter(
        printer.ipAddress,
        printer.port,
        receiptText,
        5000 // 5 second timeout
      );

      logger.logAudit(`Receipt template test print to printer: ${type}`, {
        action: 'TEST_PRINT_ACTUAL',
        templateType: type,
        printerId,
        printerName: printer.name,
        printerIp: printer.ipAddress,
        tenantId,
        userId: req.user.id,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      res.json({
        success: true,
        message: `Test print sent to printer: ${printer.name}`,
        data: {
          type,
          printer: {
            id: printer.id,
            name: printer.name,
            ipAddress: printer.ipAddress,
            port: printer.port
          },
          mockData: testData,
          note: 'Print job sent successfully. Check your printer.'
        }
      });
    } catch (printError) {
      logger.error('Failed to print to actual printer', {
        error: printError.message,
        stack: printError.stack,
        printerId,
        printerIp: printer.ipAddress,
        tenantId
      });

      return next(createError('PRINTER_ERROR', `Failed to print: ${printError.message}`, 500));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Generate mock data for test printing
 */
function generateMockData(type, tenant, user) {
  const baseData = {
    businessName: tenant.name || 'Nama Bisnis',
    address: tenant.address || 'Alamat Bisnis',
    city: tenant.city || 'Kota',
    phone: tenant.phone || '081234567890',
    date: new Date().toLocaleDateString('id-ID'),
    time: new Date().toLocaleTimeString('id-ID'),
    cashier: user.name || 'Kasir'
  };

  const mockDataByType = {
    receipt: {
      ...baseData,
      orderNumber: 'ORD-2025-001',
      orderType: 'Dine In',
      table: '5',
      customer: 'Pelanggan Contoh',
      items: [
        { name: 'Nasi Goreng Spesial', quantity: 2, price: 35000, total: 70000, notes: 'Pedas sedang' },
        { name: 'Es Teh Manis', quantity: 2, price: 5000, total: 10000 },
        { name: 'Ayam Bakar', quantity: 1, price: 45000, total: 45000, notes: 'Matang' }
      ],
      subtotal: 125000,
      discount: 12500,
      tax: 11250,
      total: 123750,
      payments: [
        { method: 'cash', amount: 150000 }
      ],
      change: 26250
    },

    kitchen: {
      ...baseData,
      orderNumber: 'ORD-2025-001',
      orderType: 'Dine In',
      table: '5',
      items: [
        { name: 'Nasi Goreng Spesial', quantity: 2, notes: 'Pedas sedang', modifiers: ['Tanpa bawang', 'Extra cabe'] },
        { name: 'Ayam Bakar', quantity: 1, notes: 'Matang', modifiers: ['Extra sambal'] }
      ]
    },

    label: {
      ...baseData,
      orderNumber: 'ORD-2025-001',
      orderType: 'Take Away',
      customer: 'Pelanggan Contoh',
      items: [
        { name: 'Nasi Goreng Spesial', quantity: 2 },
        { name: 'Es Teh Manis', quantity: 2 }
      ]
    },

    invoice: {
      ...baseData,
      invoiceNumber: 'INV-2025-001',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
      customer: 'PT Example Indonesia',
      customerAddress: 'Jl. Contoh No. 123, Jakarta',
      taxNumber: 'NPWP: 01.234.567.8-901.000',
      items: [
        { code: 'PRD-001', description: 'Paket Catering 50 pax', quantity: 1, price: 2500000, total: 2500000 },
        { code: 'PRD-002', description: 'Snack Box 50 pax', quantity: 1, price: 500000, total: 500000 }
      ],
      subtotal: 3000000,
      discount: 150000,
      tax: 285000,
      total: 3135000,
      bankInfo: 'Bank BCA 1234567890 a.n. PT Example'
    },

    report: {
      ...baseData,
      reportType: 'Laporan Penjualan Harian',
      period: '08 Desember 2025',
      printedBy: user.name,
      summary: {
        totalOrders: 45,
        totalRevenue: 4567000,
        totalDiscount: 234000,
        totalTax: 433300,
        netRevenue: 4766300
      }
    },

    membership: {
      ...baseData,
      transactionNumber: 'TRX-MBR-2025-001',
      member: 'John Doe',
      memberId: 'MBR-12345',
      packageName: 'Gold Membership - 6 Bulan',
      serviceType: 'Membership',
      durationType: 'time',
      startDate: new Date().toLocaleDateString('id-ID'),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
      validityPeriod: '6 Bulan',
      price: 2500000,
      discount: 250000,
      tax: 225000,
      total: 2475000,
      payments: [
        { method: 'credit', amount: 2475000 }
      ]
    },

    class: {
      ...baseData,
      transactionNumber: 'TRX-CLS-2025-001',
      member: 'Jane Smith',
      memberId: 'MBR-67890',
      packageName: 'Yoga Class - 10 Sesi',
      serviceType: 'Class',
      instructor: 'Sarah Instructor',
      durationType: 'hybrid',
      totalSessions: 10,
      remainingSessions: 10,
      startDate: new Date().toLocaleDateString('id-ID'),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
      validityPeriod: '60 Hari',
      price: 1500000,
      pricePerSession: 150000,
      discount: 0,
      tax: 150000,
      total: 1650000,
      payments: [
        { method: 'debit', amount: 1650000 }
      ]
    },

    personalTraining: {
      ...baseData,
      transactionNumber: 'TRX-PT-2025-001',
      member: 'Mike Johnson',
      memberId: 'MBR-11111',
      packageName: 'Personal Training - 8 Sesi',
      serviceType: 'Personal Training',
      trainer: 'Coach Alex',
      durationType: 'session',
      totalSessions: 8,
      remainingSessions: 8,
      sessionDuration: '60 menit',
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
      price: 2400000,
      pricePerSession: 300000,
      discount: 240000,
      tax: 216000,
      total: 2376000,
      payments: [
        { method: 'transfer', amount: 2376000 }
      ]
    }
  };

  return mockDataByType[type] || mockDataByType.receipt;
}

/**
 * Generate receipt text preview with ESC/POS commands
 */
function generateReceiptPreview(template, data, type) {
  const { paperWidth = 48 } = template;
  const { header, body, footer } = template;
  let text = '';

  // Initialize printer
  text += COMMANDS.INIT;

  // Helper functions
  const line = (char = '=') => char.repeat(paperWidth) + COMMANDS.LINE_FEED;
  const center = (str) => {
    const padding = Math.max(0, Math.floor((paperWidth - str.length) / 2));
    return ' '.repeat(padding) + str + COMMANDS.LINE_FEED;
  };
  const leftRight = (left, right) => {
    const space = paperWidth - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right + COMMANDS.LINE_FEED;
  };

  // Header
  if (header) {
    text += COMMANDS.ALIGN_CENTER;
    
    if (header.customHeaderText) {
      text += header.customHeaderText + COMMANDS.LINE_FEED;
    }
    
    text += line(header.separatorChar || '=');
    
    if (header.showBusinessName) {
      const businessName = header.businessNameOverride || data.businessName || '';
      text += `${businessName}${COMMANDS.LINE_FEED}`;
    }
    
    if (header.showAddress) {
      text += (header.addressOverride || data.address || '') + COMMANDS.LINE_FEED;
    }
    if (header.showCity) {
      text += (data.city || '') + COMMANDS.LINE_FEED;
    }
    if (header.showPhone) {
      text += (header.phoneOverride || data.phone || '') + COMMANDS.LINE_FEED;
    }
    if (header.showTaxNumber && header.taxNumber) {
      text += header.taxNumber + COMMANDS.LINE_FEED;
    }
    
    text += COMMANDS.LINE_FEED;
    text += line(header.separatorChar || '=');
  }

  // Body - Switch to left align
  text += COMMANDS.ALIGN_LEFT;

  // Body - Dynamic based on type
  if (body) {
    text += COMMANDS.LINE_FEED;

    if (type === 'receipt') {
      text += leftRight(body.orderLabel || 'Order', data.orderNumber || '');
      text += leftRight(body.dateLabel || 'Tanggal', `${data.date} ${data.time}`);
      if (body.showOrderType) {
        text += leftRight(body.typeLabel || 'Tipe', data.orderType || '');
      }
      if (body.showTable && data.table) {
        text += leftRight(body.tableLabel || 'Meja', data.table);
      }
      if (body.showCustomer) {
        text += leftRight(body.customerLabel || 'Pelanggan', data.customer || '-');
      }
      if (body.showCashier) {
        text += leftRight(body.cashierLabel || 'Kasir', data.cashier || '');
      }
      text += line(body.separatorChar || '-');

      // Items
      data.items?.forEach(item => {
        text += `${item.name}${COMMANDS.LINE_FEED}`;
        text += leftRight(`  ${item.quantity} x ${item.price.toLocaleString('id-ID')}`, item.total.toLocaleString('id-ID'));
        if (item.notes) {
          text += `  Note: ${item.notes}${COMMANDS.LINE_FEED}`;
        }
      });

      text += line(body.separatorChar || '-');
      text += leftRight(body.subtotalLabel || 'Subtotal', data.subtotal.toLocaleString('id-ID'));
      if (body.showDiscount && data.discount) {
        text += leftRight(body.discountLabel || 'Diskon', `-${data.discount.toLocaleString('id-ID')}`);
      }
      if (body.showTax && data.tax) {
        text += leftRight(body.taxLabel || 'Pajak', data.tax.toLocaleString('id-ID'));
      }
      text += line(body.separatorChar || '-');
      const totalText = body.totalLabel || 'TOTAL';
      text += leftRight(totalText, data.total.toLocaleString('id-ID'));
      
      // Payment
      if (body.showPayment && data.payments) {
        text += line(body.separatorChar || '-');
        data.payments.forEach(payment => {
          const methodLabel = body.paymentMethodLabels?.[payment.method] || payment.method;
          text += leftRight(methodLabel, payment.amount.toLocaleString('id-ID'));
        });
        if (data.change) {
          text += leftRight('Kembalian', data.change.toLocaleString('id-ID'));
        }
      }

    } else if (type === 'membership') {
      text += COMMANDS.ALIGN_CENTER;
      text += (body.receiptLabel || 'BUKTI PEMBELIAN MEMBERSHIP') + COMMANDS.LINE_FEED;
      text += COMMANDS.ALIGN_LEFT;
      text += line(body.separatorChar || '-');
      text += leftRight(body.receiptNumberLabel || 'No. Transaksi', data.transactionNumber || '');
      text += leftRight(body.dateLabel || 'Tanggal', `${data.date} ${data.time}`);
      text += line(body.separatorChar || '-');
      text += leftRight(body.memberLabel || 'Member', data.member || '');
      text += leftRight(body.memberIdLabel || 'ID Member', data.memberId || '');
      text += line(body.separatorChar || '-');
      text += `${body.packageLabel || 'Paket'}: ${data.packageName}${COMMANDS.LINE_FEED}`;
      text += leftRight(body.startDateLabel || 'Berlaku Dari', data.startDate || '');
      text += leftRight(body.endDateLabel || 'Berlaku Sampai', data.endDate || '');
      if (body.showValidityPeriod) {
        text += leftRight(body.validityPeriodLabel || 'Masa Aktif', data.validityPeriod || '');
      }
      text += line(body.separatorChar || '-');
      text += leftRight(body.priceLabel || 'Harga', data.price.toLocaleString('id-ID'));
      if (data.discount) {
        text += leftRight(body.discountLabel || 'Diskon', `-${data.discount.toLocaleString('id-ID')}`);
      }
      text += leftRight(body.taxLabel || 'Pajak', data.tax.toLocaleString('id-ID'));
      text += line(body.separatorChar || '-');
      text += leftRight(body.totalLabel || 'TOTAL BAYAR', data.total.toLocaleString('id-ID'));
      
      if (body.showPaymentBreakdown && data.payments) {
        text += line(body.separatorChar || '-');
        data.payments.forEach(payment => {
          const methodLabel = body.paymentMethodLabels?.[payment.method] || payment.method;
          text += leftRight(methodLabel, payment.amount.toLocaleString('id-ID'));
        });
      }

    } else if (type === 'class') {
      text += COMMANDS.ALIGN_CENTER;
      text += (body.receiptLabel || 'BUKTI PEMBELIAN CLASS') + COMMANDS.LINE_FEED;
      text += COMMANDS.ALIGN_LEFT;
      text += line(body.separatorChar || '-');
      text += leftRight(body.receiptNumberLabel || 'No. Transaksi', data.transactionNumber || '');
      text += leftRight(body.dateLabel || 'Tanggal', `${data.date} ${data.time}`);
      text += line(body.separatorChar || '-');
      text += leftRight(body.memberLabel || 'Member', data.member || '');
      text += leftRight(body.memberIdLabel || 'ID Member', data.memberId || '');
      text += line(body.separatorChar || '-');
      text += `${body.packageLabel || 'Paket Class'}: ${data.packageName}${COMMANDS.LINE_FEED}`;
      if (body.showInstructor) {
        text += leftRight(body.instructorLabel || 'Instruktur', data.instructor || '');
      }
      if (body.showSessionInfo) {
        text += leftRight(body.totalSessionsLabel || 'Total Sesi', `${data.totalSessions} ${body.sessionsLabel || 'Sesi'}`);
        text += leftRight(body.remainingSessionsLabel || 'Sisa Sesi', `${data.remainingSessions} ${body.sessionsLabel || 'Sesi'}`);
      }
      if (body.durationType === 'hybrid' || body.durationType === 'time') {
        text += leftRight(body.startDateLabel || 'Berlaku Dari', data.startDate || '');
        text += leftRight(body.endDateLabel || 'Berlaku Sampai', data.endDate || '');
      }
      text += line(body.separatorChar || '-');
      text += leftRight(body.priceLabel || 'Harga', data.price.toLocaleString('id-ID'));
      if (body.showPricePerSession) {
        text += leftRight(body.pricePerSessionLabel || 'Harga per Sesi', data.pricePerSession.toLocaleString('id-ID'));
      }
      if (data.discount) {
        text += leftRight(body.discountLabel || 'Diskon', `-${data.discount.toLocaleString('id-ID')}`);
      }
      text += leftRight(body.taxLabel || 'Pajak', data.tax.toLocaleString('id-ID'));
      text += line(body.separatorChar || '-');
      text += leftRight(body.totalLabel || 'TOTAL BAYAR', data.total.toLocaleString('id-ID'));

    } else if (type === 'personalTraining') {
      text += COMMANDS.ALIGN_CENTER;
      text += (body.receiptLabel || 'BUKTI PEMBELIAN PERSONAL TRAINING') + COMMANDS.LINE_FEED;
      text += COMMANDS.ALIGN_LEFT;
      text += line(body.separatorChar || '-');
      text += leftRight(body.receiptNumberLabel || 'No. Transaksi', data.transactionNumber || '');
      text += leftRight(body.dateLabel || 'Tanggal', `${data.date} ${data.time}`);
      text += line(body.separatorChar || '-');
      text += leftRight(body.memberLabel || 'Member', data.member || '');
      text += leftRight(body.memberIdLabel || 'ID Member', data.memberId || '');
      text += line(body.separatorChar || '-');
      text += `${body.packageLabel || 'Paket PT'}: ${data.packageName}${COMMANDS.LINE_FEED}`;
      if (body.showTrainer) {
        text += leftRight(body.trainerLabel || 'Trainer', data.trainer || '');
      }
      if (body.showSessionInfo) {
        text += leftRight(body.totalSessionsLabel || 'Total Sesi', `${data.totalSessions} ${body.sessionsLabel || 'Sesi'}`);
        if (body.showSessionDuration) {
          text += leftRight(body.sessionDurationLabel || 'Durasi per Sesi', data.sessionDuration || '');
        }
        text += leftRight(body.remainingSessionsLabel || 'Sisa Sesi', `${data.remainingSessions} ${body.sessionsLabel || 'Sesi'}`);
      }
      if (body.showValidUntil) {
        text += leftRight(body.validUntilLabel || 'Berlaku Sampai', data.validUntil || '');
      }
      text += line(body.separatorChar || '-');
      text += leftRight(body.priceLabel || 'Harga', data.price.toLocaleString('id-ID'));
      if (body.showPricePerSession) {
        text += leftRight(body.pricePerSessionLabel || 'Harga per Sesi', data.pricePerSession.toLocaleString('id-ID'));
      }
      if (data.discount) {
        text += leftRight(body.discountLabel || 'Diskon', `-${data.discount.toLocaleString('id-ID')}`);
      }
      text += leftRight(body.taxLabel || 'Pajak', data.tax.toLocaleString('id-ID'));
      text += line(body.separatorChar || '-');
      text += leftRight(body.totalLabel || 'TOTAL BAYAR', data.total.toLocaleString('id-ID'));

    } else {
      // Generic preview for other types
      text += center(`Preview for ${type} template`);
      text += line(body.separatorChar || '-');
      text += 'Template configuration loaded successfully.\n';
      text += 'Use specific mock data for detailed preview.\n';
    }
  }

  // Footer
  if (footer) {
    text += COMMANDS.ALIGN_CENTER;
    text += line(footer.separatorChar || '=');
    if (footer.showThankYou && footer.thankYouMessage) {
      text += footer.thankYouMessage + COMMANDS.LINE_FEED;
    }
    if (footer.customFooterText) {
      footer.customFooterText.split('\n').forEach(lineText => {
        text += lineText + COMMANDS.LINE_FEED;
      });
    }
    if (footer.showBankInfo && footer.bankInfo) {
      text += footer.bankInfo + COMMANDS.LINE_FEED;
    }
    text += line(footer.separatorChar || '=');
    
    // Add ESC/POS auto cut command
    if (footer.autoCut) {
      text += COMMANDS.LINE_FEED;
      text += COMMANDS.LINE_FEED;
      text += COMMANDS.LINE_FEED;
      text += COMMANDS.FEED_AND_CUT; // Feed 3 lines and cut
    }
  }

  return text;
}

module.exports = {
  getReceiptSettings,
  createReceiptTemplate,
  updateReceiptSettings,
  resetReceiptSettings,
  testPrintReceipt,
  testPrintActual,
  getDefaultTemplate,
  getAllDefaultTemplates
};
