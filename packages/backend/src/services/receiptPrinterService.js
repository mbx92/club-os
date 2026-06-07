'use strict';

/**
 * Receipt Printer Service
 * 
 * Handles printing receipts/bills to thermal printers.
 * Supports network printers via ESC/POS commands.
 * 
 * @module services/receiptPrinterService
 */

const net = require('net');
const logger = require('../utils/logger');
const { PrintJob } = require('../models');

/**
 * ESC/POS Commands
 */
const ESC = '\x1b';
const GS = '\x1d';
const COMMANDS = {
  INIT: `${ESC}@`,                    // Initialize printer
  ALIGN_LEFT: `${ESC}a\x00`,          // Align left
  ALIGN_CENTER: `${ESC}a\x01`,        // Align center
  ALIGN_RIGHT: `${ESC}a\x02`,         // Align right
  BOLD_ON: `${ESC}E\x01`,             // Bold on
  BOLD_OFF: `${ESC}E\x00`,            // Bold off
  DOUBLE_HEIGHT_ON: `${GS}!\x10`,     // Double height
  DOUBLE_WIDTH_ON: `${GS}!\x20`,      // Double width
  DOUBLE_SIZE_ON: `${GS}!\x30`,       // Double width and height
  NORMAL_SIZE: `${GS}!\x00`,          // Normal size
  UNDERLINE_ON: `${ESC}-\x01`,        // Underline on
  UNDERLINE_OFF: `${ESC}-\x00`,       // Underline off
  LINE_FEED: '\n',                     // Line feed
  CUT_PAPER: `${GS}V\x00`,            // Full cut
  PARTIAL_CUT: `${GS}V\x01`,          // Partial cut
  FEED_AND_CUT: `${GS}V\x41\x03`,     // Feed 3 lines and cut
  OPEN_DRAWER_PIN2: `${ESC}p\x00\x19\xfa`, // Open cash drawer - Pin 2 (default)
  OPEN_DRAWER_PIN5: `${ESC}p\x01\x19\xfa`, // Open cash drawer - Pin 5
};

/**
 * Format currency to Indonesian Rupiah
 */
const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  return `Rp ${formatted}`;
};

/**
 * Format date to Indonesian format
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Create separator line based on paper width
 */
const createSeparator = (char = '-', width = 48) => {
  return char.repeat(width);
};

/**
 * Pad string for receipt alignment (left and right on same line)
 */
const padLine = (left, right, width = 48) => {
  // Ensure left and right are strings
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const padding = width - leftStr.length - rightStr.length;
  if (padding < 1) return `${leftStr} ${rightStr}`;
  return `${leftStr}${' '.repeat(padding)}${rightStr}`;
};

/**
 * Build order receipt content
 */
const buildOrderReceipt = (order, tenant, template = {}) => {
  const headerTemplate = template.header || {};
  const bodyTemplate = template.body || {};
  const footerTemplate = template.footer || {};
  
  const paperWidth = template.paperWidth || 48; // 80mm paper = ~48 characters
  let content = '';
  
  // Initialize printer
  content += COMMANDS.INIT;
  
  // ===== HEADER =====
  content += COMMANDS.ALIGN_CENTER;
  
  // Custom header text (before business name)
  if (headerTemplate.customHeaderText) {
    content += headerTemplate.customHeaderText + COMMANDS.LINE_FEED;
  }
  
  // Business name
  if (headerTemplate.showBusinessName !== false) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += (headerTemplate.businessNameOverride || tenant.name || 'Restaurant') + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  // Address
  if (headerTemplate.showAddress !== false && (headerTemplate.addressOverride || tenant.address)) {
    const address = headerTemplate.addressOverride || tenant.address;
    content += address + COMMANDS.LINE_FEED;
  }
  
  // Phone
  if (headerTemplate.showPhone !== false && (headerTemplate.phoneOverride || tenant.phone)) {
    const phone = headerTemplate.phoneOverride || tenant.phone;
    content += `Tel: ${phone}` + COMMANDS.LINE_FEED;
  }
  
  // Tax/NPWP info
  if (headerTemplate.showTaxNumber && headerTemplate.taxNumber) {
    content += `NPWP: ${headerTemplate.taxNumber}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== ORDER INFO =====
  content += COMMANDS.ALIGN_LEFT;
  content += COMMANDS.BOLD_ON;
  content += padLine(
    bodyTemplate.orderLabel || 'No. Transaksi:',
    order?.transactionNumber || order?.id || '-',
    paperWidth
  ) + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  
  content += padLine(
    bodyTemplate.dateLabel || 'Tanggal:',
    order?.createdAt ? formatDate(order.createdAt) : '-',
    paperWidth
  ) + COMMANDS.LINE_FEED;
  
  if (order.orderType && bodyTemplate.showOrderType !== false) {
    const orderTypeLabel = {
      'dine-in': bodyTemplate.dineInLabel || 'Dine In',
      'takeaway': bodyTemplate.takeawayLabel || 'Take Away',
      'delivery': bodyTemplate.deliveryLabel || 'Delivery'
    }[order.orderType] || order.orderType;
    content += padLine(
      bodyTemplate.typeLabel || 'Tipe:',
      orderTypeLabel,
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }
  
  if (order.table?.tableNumber && bodyTemplate.showTable !== false) {
    const tableDisplay = order.table.tableName
      ? `${order.table.tableNumber} - ${order.table.tableName}`
      : order.table.tableNumber;
    content += COMMANDS.BOLD_ON;
    content += padLine(
      bodyTemplate.tableLabel || 'Meja:',
      tableDisplay,
      paperWidth
    ) + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
  }
  
  if (order.customerName && bodyTemplate.showCustomer !== false) {
    content += padLine(
      bodyTemplate.customerLabel || 'Pelanggan:',
      order.customerName,
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }
  
  if (order.createdByUser?.name && bodyTemplate.showCashier !== false) {
    content += padLine(
      bodyTemplate.cashierLabel || 'Kasir:',
      order.createdByUser.name,
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== ITEMS =====
  const items = order.items || order.transactionItems || [];
  
  for (const item of items) {
    const itemName = item.itemName || item.product?.name || 'Item';
    const qty = item.quantity || 1;
    const price = parseFloat(item.unitPrice || 0);
    const basePrice = parseFloat(item.itemDetails?.basePrice || price);
    const total = parseFloat(item.totalPrice || item.subtotal || price * qty);
    
    // Item name with base unit price on right
    content += padLine(`${qty}x ${itemName}`, formatCurrency(basePrice), paperWidth) + COMMANDS.LINE_FEED;
    
    // SKU
    if (bodyTemplate.showItemCode && item.product?.sku) {
      content += `   [${item.product.sku}]` + COMMANDS.LINE_FEED;
    }
    
    // Show qty breakdown before extras when qty > 1
    if (qty > 1) {
      content += padLine(`   @${formatCurrency(basePrice)}`, formatCurrency(basePrice * qty), paperWidth) + COMMANDS.LINE_FEED;
    }
    
    // Show extras if present
    let extrasTotal = 0;
    if (item.itemDetails?.extras && Array.isArray(item.itemDetails.extras) && item.itemDetails.extras.length > 0) {
      for (const extra of item.itemDetails.extras) {
        const extraQty = extra.quantity || 1;
        const extraPrice = parseFloat(extra.price || 0);
        const extraName = extra.name || 'Extra';
        extrasTotal += extraPrice * extraQty;
        
        if (extraQty > 1) {
          content += padLine(`   + ${extraName} x${extraQty}`, formatCurrency(extraPrice * extraQty), paperWidth) + COMMANDS.LINE_FEED;
        } else {
          content += padLine(`   + ${extraName}`, formatCurrency(extraPrice), paperWidth) + COMMANDS.LINE_FEED;
        }
      }
    }
    
    content += COMMANDS.LINE_FEED;
    
    // Item notes
    if (item.notes) {
      content += `   * ${item.notes}` + COMMANDS.LINE_FEED;
    }
  }
  
  content += createSeparator('-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TOTALS =====
  const subtotal = parseFloat(order.subtotal || 0);
  const tax = parseFloat(order.tax || 0);
  const serviceCharge = parseFloat(order.serviceCharge || 0);
  const discount = parseFloat(order.voucherDiscount || 0);
  const total = parseFloat(order.totalAmount || 0);
  
  content += padLine(bodyTemplate.subtotalLabel || 'Subtotal:', formatCurrency(subtotal), paperWidth) + COMMANDS.LINE_FEED;
  
  if (bodyTemplate.showDiscount !== false && discount > 0) {
    const discountLabel = order.voucher?.code 
      ? `${bodyTemplate.discountLabel || 'Diskon'} (${order.voucher.code}):`
      : `${bodyTemplate.discountLabel || 'Diskon'}:`;
    content += padLine(discountLabel, `-${formatCurrency(discount)}`, paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Show service charge if applicable (restaurant only)
  if (bodyTemplate.showServiceCharge !== false && serviceCharge > 0) {
    const serviceChargePercentage = tenant?.settings?.transaction?.serviceChargePercentage || 0;
    const serviceChargeLabel = serviceChargePercentage > 0 
      ? `${bodyTemplate.serviceChargeLabel || 'Service'} (${serviceChargePercentage}%):`
      : `${bodyTemplate.serviceChargeLabel || 'Service'}:`;
    content += padLine(serviceChargeLabel, formatCurrency(serviceCharge), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  if (bodyTemplate.showTax !== false && tax > 0) {
    const taxPercentage = tenant?.settings?.transaction?.taxPercentage || 0;
    const taxLabel = taxPercentage > 0 
      ? `${bodyTemplate.taxLabel || 'Pajak'} (${taxPercentage}%):`
      : `${bodyTemplate.taxLabel || 'Pajak'}:`;
    content += padLine(taxLabel, formatCurrency(tax), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  content += COMMANDS.BOLD_ON;
  if (bodyTemplate.totalDoubleSize !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
  }
  content += padLine(bodyTemplate.totalLabel || 'TOTAL:', formatCurrency(total), paperWidth) + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.BOLD_OFF;
  
  // ===== PAYMENT INFO (if completed) =====
  if (order.status === 'completed' || order.status === 'paid') {
    const payments = order.payments || [];
    const paidAmount = parseFloat(order.paidAmount || 0);
    const changeAmount = parseFloat(order.changeAmount || 0);
    
    if ((bodyTemplate.showPayment !== false) && (payments.length > 0 || paidAmount > 0)) {
      content += COMMANDS.LINE_FEED;
      content += `${bodyTemplate.paymentLabel || 'Pembayaran'}:` + COMMANDS.LINE_FEED;
      
      // Show payment methods breakdown
      if (bodyTemplate.showPaymentBreakdown !== false) {
        for (const payment of payments) {
          const methodLabel = bodyTemplate.paymentMethodLabels?.[payment.paymentMethod] || {
            'cash': 'Tunai',
            'debit': 'Debit',
            'credit': 'Kredit',
            'qris': 'QRIS',
            'transfer': 'Transfer'
          }[payment.paymentMethod] || payment.paymentMethod;
          
          content += padLine(`  ${methodLabel}:`, formatCurrency(payment.amount), paperWidth) + COMMANDS.LINE_FEED;
        }
      }
      
      // Show total paid and change if applicable
      if (paidAmount > 0 && bodyTemplate.showPaidAmount !== false) {
        content += padLine(bodyTemplate.paidLabel || 'Dibayar:', formatCurrency(paidAmount), paperWidth) + COMMANDS.LINE_FEED;
        
        if (changeAmount > 0 && bodyTemplate.showChange !== false) {
          content += padLine(bodyTemplate.changeLabel || 'Kembalian:', formatCurrency(changeAmount), paperWidth) + COMMANDS.LINE_FEED;
        }
      }
    }
  }
  
  content += createSeparator(footerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== FOOTER =====
  content += COMMANDS.ALIGN_CENTER;
  
  if (footerTemplate.showThankYou !== false) {
    content += COMMANDS.LINE_FEED;
    content += (footerTemplate.thankYouMessage || 'Terima kasih atas kunjungan Anda!') + COMMANDS.LINE_FEED;
  }
  
  // Custom footer text
  if (footerTemplate.customFooterText) {
    content += COMMANDS.LINE_FEED;
    content += footerTemplate.customFooterText + COMMANDS.LINE_FEED;
  }
  
  // Social media
  if (footerTemplate.showSocialMedia !== false && (footerTemplate.socialMedia || tenant.socialMedia)) {
    const social = footerTemplate.socialMedia || tenant.socialMedia;
    content += COMMANDS.LINE_FEED;
    if (social.instagram) {
      content += `${footerTemplate.instagramLabel || 'IG'}: ${social.instagram}` + COMMANDS.LINE_FEED;
    }
    if (social.facebook) {
      content += `${footerTemplate.facebookLabel || 'FB'}: ${social.facebook}` + COMMANDS.LINE_FEED;
    }
    if (social.whatsapp) {
      content += `${footerTemplate.whatsappLabel || 'WA'}: ${social.whatsapp}` + COMMANDS.LINE_FEED;
    }
  }
  
  // Website
  if (footerTemplate.showWebsite && footerTemplate.website) {
    content += COMMANDS.LINE_FEED;
    content += footerTemplate.website + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  // Cut paper
  if (footerTemplate.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
};

/**
 * Build kitchen order ticket (simplified for kitchen display)
 */
const buildKitchenTicket = (order, items, tenant = null, template = {}) => {
  const headerTemplate = template.header || {};
  const bodyTemplate = template.body || {};
  const footerTemplate = template.footer || {};
  
  const paperWidth = template.paperWidth || 48;
  let content = '';
  
  content += COMMANDS.INIT;
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.DOUBLE_SIZE_ON;
  content += (headerTemplate.customHeaderText || '** KITCHEN ORDER **') + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.LINE_FEED;
  
  content += COMMANDS.ALIGN_LEFT;
  content += COMMANDS.BOLD_ON;
  content += `${bodyTemplate.orderLabel || 'No. Transaksi'}: ${order?.transactionNumber || order?.id || '-'}` + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  
  // Table number (larger if present)
  if (order.table?.tableNumber && bodyTemplate.showTable !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
    content += `${bodyTemplate.tableLabel || 'MEJA'}: ${order.table.tableNumber}` + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  // Order type
  if (order.orderType && bodyTemplate.showOrderType !== false) {
    const orderTypeLabel = {
      'dine-in': bodyTemplate.dineInLabel || 'Dine In',
      'takeaway': bodyTemplate.takeawayLabel || 'Take Away',
      'delivery': bodyTemplate.deliveryLabel || 'Delivery'
    }[order.orderType] || order.orderType;
    content += `${bodyTemplate.typeLabel || 'Tipe'}: ${orderTypeLabel}` + COMMANDS.LINE_FEED;
  }
  
  // Customer name
  if (order.customerName && bodyTemplate.showCustomer !== false) {
    content += `${bodyTemplate.customerLabel || 'Atas Nama'}: ${order.customerName}` + COMMANDS.LINE_FEED;
  }
  
  content += `${bodyTemplate.dateLabel || 'Waktu'}: ${formatDate(order.createdAt || new Date())}` + COMMANDS.LINE_FEED;
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // Items - larger font for item names
  for (const item of items) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
    content += `${item.quantity}x ${item.itemName || item.product?.name}` + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
    
    // Product extras (important for kitchen)
    if (item.itemDetails?.extras && Array.isArray(item.itemDetails.extras) && item.itemDetails.extras.length > 0) {
      content += COMMANDS.BOLD_ON;
      for (const extra of item.itemDetails.extras) {
        const extraQty = extra.quantity || 1;
        const extraName = extra.name || 'Extra';
        
        if (extraQty > 1) {
          content += `   ++ ${extraName} x${extraQty}` + COMMANDS.LINE_FEED;
        } else {
          content += `   ++ ${extraName}` + COMMANDS.LINE_FEED;
        }
      }
      content += COMMANDS.BOLD_OFF;
    }
    
    // Notes (important for kitchen)
    if (item.notes && bodyTemplate.showNotes !== false) {
      content += COMMANDS.BOLD_ON;
      content += `   >> ${item.notes}` + COMMANDS.LINE_FEED;
      content += COMMANDS.BOLD_OFF;
    }
    
    // Modifiers
    if (item.modifiers && item.modifiers.length > 0 && bodyTemplate.showModifiers !== false) {
      for (const mod of item.modifiers) {
        content += `   + ${mod}` + COMMANDS.LINE_FEED;
      }
    }
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // Footer
  if (footerTemplate.customFooterText) {
    content += COMMANDS.ALIGN_CENTER;
    content += COMMANDS.BOLD_ON;
    content += footerTemplate.customFooterText + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
  }
  
  content += COMMANDS.LINE_FEED;
  
  if (footerTemplate.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
};

/**
 * Send data to network printer
 */
const sendToPrinter = (ipAddress, port, data, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Printer connection timeout: ${ipAddress}:${port}`));
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`Printer error: ${err.message}`));
    });
    
    socket.connect(port, ipAddress, () => {
      socket.write(data, 'binary', (err) => {
        if (err) {
          socket.destroy();
          reject(new Error(`Failed to send data: ${err.message}`));
        } else {
          // Small delay to ensure data is sent
          setTimeout(() => {
            socket.end();
            resolve({ success: true, message: 'Print job sent successfully' });
          }, 100);
        }
      });
    });
  });
};

/**
 * Get receipt printer from tenant settings
 */
const getReceiptPrinter = (tenant) => {
  const printers = tenant.settings?.printers || [];
  
  // Find default receipt printer
  let printer = printers.find(p => 
    p.printerType === 'receipt' && 
    p.isDefault === true && 
    p.isActive === true
  );
  
  // If no default, find any active receipt printer
  if (!printer) {
    printer = printers.find(p => 
      p.printerType === 'receipt' && 
      p.isActive === true
    );
  }
  
  return printer;
};

/**
 * Get kitchen printer from tenant settings
 */
const getKitchenPrinter = (tenant) => {
  const printers = tenant.settings?.printers || [];
  
  // Find kitchen printer
  let printer = printers.find(p => 
    p.printerType === 'kitchen' && 
    p.isActive === true
  );
  
  return printer;
};

/**
 * Print order receipt
 */
const printOrderReceipt = async (order, tenant, options = {}) => {
  try {
    const printer = getReceiptPrinter(tenant);
    const copies = options.copies || 1;
    
    if (!printer) {
      logger.logInfo('No receipt printer configured', {
        action: 'PRINT_RECEIPT_SKIP',
        tenantId: tenant.id,
        orderId: order.id
      });
      return { success: false, message: 'No receipt printer configured', skipped: true };
    }
    
    if (printer.connectionType !== 'network') {
      logger.logInfo('Printer is not network type', {
        action: 'PRINT_RECEIPT_SKIP',
        tenantId: tenant.id,
        printerId: printer.id,
        connectionType: printer.connectionType
      });
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template from tenant settings (v2: multi-template)
    // Auto-load from tenant.settings.receiptTemplates, fallback to hardcode default
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates.receipt || getDefaultOrderReceiptTemplate();
    
    // Build receipt content
    const receiptContent = buildOrderReceipt(order, tenant, template);
    
    // Create print job record
    let printJob;
    try {
      printJob = await PrintJob.create({
        tenantId: tenant.id,
        printerId: printer.id,
        jobType: 'receipt',
        printData: receiptContent,
        status: 'pending',
        metadata: {
          orderId: order.id,
          orderNumber: order.transactionNumber,
          orderType: order.orderType,
          printerName: printer.name,
          copies
        }
      });
      
      logger.logInfo('PrintJob created for receipt', {
        action: 'PRINT_JOB_CREATED',
        printJobId: printJob.id,
        orderId: order.id,
        printerId: printer.id,
        tenantId: tenant.id,
        copies
      });
    } catch (jobError) {
      logger.logSecurity('Failed to create PrintJob', {
        action: 'PRINT_JOB_CREATE_ERROR',
        error: jobError.message,
        stack: jobError.stack,
        orderId: order.id,
        printerId: printer.id,
        printerName: printer.name,
        tenantId: tenant.id
      });
      // Continue anyway, print directly
      printJob = null;
    }
    
    try {
      // Send to printer — repeat for each copy
      let result;
      for (let i = 0; i < copies; i++) {
        if (i > 0) {
          // Small delay between copies so printer buffer doesn't overflow
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        result = await sendToPrinter(
          printer.ipAddress,
          printer.port || 9100,
          receiptContent
        );
      }
      
      // Mark as completed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      logger.logInfo('Receipt printed successfully', {
        action: 'PRINT_RECEIPT_SUCCESS',
        tenantId: tenant.id,
        orderId: order.id,
        orderNumber: order.transactionNumber,
        printerId: printer.id,
        printerName: printer.name,
        printJobId: printJob?.id,
        copies
      });
      
      return { ...result, printJobId: printJob?.id, copies };
    } catch (printError) {
      // Mark as failed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'failed',
          errorMessage: printError.message,
          completedAt: new Date()
        });
      }
      throw printError;
    }
  } catch (error) {
    logger.logSecurity('Receipt print failed', {
      action: 'PRINT_RECEIPT_ERROR',
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message
    });
    
    return { success: false, message: error.message, error: true };
  }
};

/**
 * Print kitchen ticket
 */
const printKitchenTicket = async (order, items, tenant) => {
  try {
    const printer = getKitchenPrinter(tenant);
    
    if (!printer) {
      return { success: false, message: 'No kitchen printer configured', skipped: true };
    }
    
    if (printer.connectionType !== 'network') {
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template from tenant settings (v2: multi-template)
    // Auto-load from tenant.settings.receiptTemplates, fallback to hardcode default
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates.kitchen || getDefaultKitchenTicketTemplate();
    
    const ticketContent = buildKitchenTicket(order, items, tenant, template);
    
    // Create print job record
    let printJob;
    try {
      printJob = await PrintJob.create({
        tenantId: tenant.id,
        printerId: printer.id,
        jobType: 'kitchen',
        printData: ticketContent,
        status: 'pending',
        metadata: {
          orderId: order.id,
          orderNumber: order.transactionNumber,
          itemCount: items.length,
          printerName: printer.name
        }
      });
      
      logger.logInfo('PrintJob created for kitchen', {
        action: 'PRINT_JOB_CREATED',
        printJobId: printJob.id,
        orderId: order.id,
        printerId: printer.id,
        tenantId: tenant.id
      });
    } catch (jobError) {
      logger.logSecurity('Failed to create PrintJob', {
        action: 'PRINT_JOB_CREATE_ERROR',
        error: jobError.message,
        stack: jobError.stack,
        orderId: order.id,
        printerId: printer.id,
        printerName: printer.name,
        tenantId: tenant.id
      });
      // Continue anyway, print directly
      printJob = null;
    }
    
    try {
      const result = await sendToPrinter(
        printer.ipAddress,
        printer.port || 9100,
        ticketContent
      );
      
      // Mark as completed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      logger.logInfo('Kitchen ticket printed', {
        action: 'PRINT_KITCHEN_TICKET',
        tenantId: tenant.id,
        orderId: order.id,
        printerId: printer.id,
        printJobId: printJob?.id
      });
      
      return { ...result, printJobId: printJob?.id };
    } catch (printError) {
      // Mark as failed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'failed',
          errorMessage: printError.message,
          completedAt: new Date()
        });
      }
      throw printError;
    }
  } catch (error) {
    logger.logSecurity('Kitchen ticket print failed', {
      action: 'PRINT_KITCHEN_ERROR',
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message
    });
    
    return { success: false, message: error.message, error: true };
  }
};

/**
 * Open cash drawer (if supported)
 * Uses printer.cashDrawerPin setting to determine which pin to trigger
 * @param {Object} tenant - Tenant object with settings
 * @returns {Promise<Object>} - Result object with success status
 */
const openCashDrawer = async (tenant) => {
  try {
    const printer = getReceiptPrinter(tenant);
    
    if (!printer) {
      logger.logWarning('No receipt printer configured for cash drawer', {
        action: 'OPEN_CASH_DRAWER_NO_PRINTER',
        tenantId: tenant.id
      });
      return { success: false, message: 'No receipt printer configured' };
    }
    
    if (printer.connectionType !== 'network') {
      logger.logWarning('Cash drawer only supported for network printers', {
        action: 'OPEN_CASH_DRAWER_NON_NETWORK',
        tenantId: tenant.id,
        printerId: printer.id,
        connectionType: printer.connectionType
      });
      return { success: false, message: 'Cash drawer only supported for network printers' };
    }
    
    // Check if cash drawer is enabled for this printer
    if (printer.openCashDrawer === false) {
      logger.logInfo('Cash drawer disabled in printer settings', {
        action: 'OPEN_CASH_DRAWER_DISABLED',
        tenantId: tenant.id,
        printerId: printer.id,
        printerName: printer.name
      });
      return { success: false, message: 'Cash drawer disabled for this printer' };
    }
    
    // Determine which pin to use (0 = Pin 2, 1 = Pin 5)
    const cashDrawerPin = printer.cashDrawerPin || 0;
    const drawerCommand = cashDrawerPin === 1 
      ? COMMANDS.OPEN_DRAWER_PIN5 
      : COMMANDS.OPEN_DRAWER_PIN2;
    
    logger.logInfo('Attempting to open cash drawer', {
      action: 'OPEN_CASH_DRAWER_ATTEMPT',
      tenantId: tenant.id,
      printerId: printer.id,
      printerName: printer.name,
      printerIp: printer.ipAddress,
      printerPort: printer.port || 9100,
      cashDrawerPin: cashDrawerPin,
      commandType: cashDrawerPin === 1 ? 'PIN5' : 'PIN2'
    });
    
    const result = await sendToPrinter(
      printer.ipAddress,
      printer.port || 9100,
      drawerCommand
    );
    
    if (result.success) {
      logger.logInfo('Cash drawer opened successfully', {
        action: 'OPEN_CASH_DRAWER_SUCCESS',
        tenantId: tenant.id,
        printerId: printer.id,
        printerName: printer.name,
        cashDrawerPin: cashDrawerPin
      });
    }
    
    return result;
  } catch (error) {
    logger.logSecurity('Failed to open cash drawer', {
      action: 'OPEN_CASH_DRAWER_ERROR',
      tenantId: tenant?.id,
      error: error.message,
      stack: error.stack
    });
    return { success: false, message: error.message };
  }
};

/**
 * Get default order receipt template
 */
const getDefaultOrderReceiptTemplate = () => {
  return {
    paperWidth: 48,
    header: { showBusinessName: true, showAddress: true, showCity: true, showPhone: true, separatorChar: '=' },
    body: {
      orderLabel: 'Order', dateLabel: 'Tanggal', typeLabel: 'Tipe',
      dineInLabel: 'Dine In', takeawayLabel: 'Take Away', deliveryLabel: 'Delivery',
      tableLabel: 'Meja', customerLabel: 'Pelanggan', cashierLabel: 'Kasir',
      subtotalLabel: 'Subtotal', discountLabel: 'Diskon', taxLabel: 'Pajak',
      totalLabel: 'TOTAL', totalDoubleSize: true,
      paymentLabel: 'Pembayaran', paidLabel: 'Dibayar', changeLabel: 'Kembalian',
      showPaymentBreakdown: true,
      paymentMethodLabels: { cash: 'Tunai', debit: 'Debit', credit: 'Kredit', qris: 'QRIS', transfer: 'Transfer' },
      separatorChar: '-'
    },
    footer: {
      showThankYou: true,
      thankYouMessage: 'Terima kasih atas kunjungan Anda!',
      separatorChar: '=',
      autoCut: true
    }
  };
};

/**
 * Get default kitchen ticket template
 */
const getDefaultKitchenTicketTemplate = () => {
  return {
    paperWidth: 48,
    header: { customHeaderText: '=== DAPUR ===', separatorChar: '=' },
    body: {
      orderLabel: 'Order', dateLabel: 'Waktu', typeLabel: 'Tipe',
      dineInLabel: 'Dine In', takeawayLabel: 'Take Away', deliveryLabel: 'Delivery',
      tableLabel: 'Meja', customerLabel: 'Atas Nama',
      showModifiers: true, showNotes: true, notesLabel: 'Catatan',
      showPrices: false,
      separatorChar: '-'
    },
    footer: { customFooterText: 'SEGERA PROSES!', autoCut: true }
  };
};

/**
 * Build service purchase receipt (Membership, Class, PT)
 */
const buildServiceReceipt = (activeService, member, transaction, tenant, template = {}) => {
  const headerTemplate = template.header || {};
  const bodyTemplate = template.body || {};
  const footerTemplate = template.footer || {};
  
  const paperWidth = template.paperWidth || 48;
  let content = '';
  
  // Initialize printer
  content += COMMANDS.INIT;
  
  // ===== HEADER =====
  content += COMMANDS.ALIGN_CENTER;
  
  if (headerTemplate.customHeaderText) {
    content += headerTemplate.customHeaderText + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (headerTemplate.showBusinessName !== false) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += (headerTemplate.businessNameOverride || tenant.name || 'Gym') + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  if (headerTemplate.showAddress !== false && (headerTemplate.addressOverride || tenant.address)) {
    const address = headerTemplate.addressOverride || tenant.address;
    content += address + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showPhone !== false && (headerTemplate.phoneOverride || tenant.phone)) {
    const phone = headerTemplate.phoneOverride || tenant.phone;
    content += `Tel: ${phone}` + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showTaxNumber && headerTemplate.taxNumber) {
    content += `NPWP: ${headerTemplate.taxNumber}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== RECEIPT LABEL =====
  content += COMMANDS.ALIGN_CENTER;
  const receiptLabel = bodyTemplate.receiptLabel || 
    (activeService.serviceType === 'membership' ? 'BUKTI PEMBELIAN MEMBERSHIP' :
     activeService.serviceType === 'class' ? 'BUKTI PEMBELIAN CLASS' :
     'BUKTI PEMBELIAN PERSONAL TRAINING');
  content += COMMANDS.BOLD_ON;
  content += receiptLabel + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.ALIGN_LEFT;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TRANSACTION INFO =====
  content += padLine(
    bodyTemplate.receiptNumberLabel || 'No. Transaksi:', 
    transaction?.transactionNumber || '-', 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  content += padLine(
    bodyTemplate.dateLabel || 'Tanggal:', 
    transaction?.createdAt ? formatDate(transaction.createdAt) : '-', 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== MEMBER INFO =====
  const memberName = member?.firstName && member?.lastName 
    ? `${member.firstName} ${member.lastName}`
    : member?.name || '-';
  
  content += padLine(
    bodyTemplate.memberLabel || 'Member:', 
    memberName, 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== SERVICE DETAILS =====
  content += COMMANDS.BOLD_ON;
  content += (bodyTemplate.packageLabel || 'Paket') + ':' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += activeService.servicePlan?.name || 'Service' + COMMANDS.LINE_FEED;
  
  // Show trainer if assigned
  if (activeService.assignedTrainer && bodyTemplate.showTrainer !== false) {
    const trainerLabel = activeService.serviceType === 'personalTraining' ? 
      (bodyTemplate.trainerLabel || 'Trainer') : 
      (bodyTemplate.instructorLabel || 'Instruktur');
    const trainerName = activeService.assignedTrainer.firstName && activeService.assignedTrainer.lastName
      ? `${activeService.assignedTrainer.firstName} ${activeService.assignedTrainer.lastName}`
      : activeService.assignedTrainer.name || '-';
    content += padLine(`${trainerLabel}:`, trainerName, paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Time-based or Session-based
  if (activeService.serviceType === 'membership' || 
      (activeService.serviceType === 'class' && bodyTemplate.durationType !== 'session')) {
    // Add line break before validity period
    content += COMMANDS.LINE_FEED;
    
    // Time-based - format as single line with s/d
    const startDateStr = activeService?.startDate ? formatDate(activeService.startDate) : '-';
    const endDateStr = activeService?.endDate ? formatDate(activeService.endDate) : '-';
    content += `${bodyTemplate.validityLabel || 'Berlaku'}: ${startDateStr} s/d ${endDateStr}` + COMMANDS.LINE_FEED;
  }
  
  // Session info for session-based services
  if ((activeService.serviceType === 'class' || activeService.serviceType === 'personalTraining') && 
      activeService.totalSessions) {
    // Add line break before session info
    content += COMMANDS.LINE_FEED;
    
    if (bodyTemplate.showSessionInfo !== false) {
      content += padLine(
        bodyTemplate.totalSessionsLabel || 'Total Sesi:', 
        `${activeService.totalSessions} ${bodyTemplate.sessionsLabel || 'Sesi'}`,
        paperWidth
      ) + COMMANDS.LINE_FEED;
      
      // Show remaining sessions
      if (activeService.remainingSessions !== null && activeService.remainingSessions !== undefined) {
        content += padLine(
          bodyTemplate.remainingSessionsLabel || 'Sisa Sesi:', 
          `${activeService.remainingSessions} ${bodyTemplate.sessionsLabel || 'Sesi'}`,
          paperWidth
        ) + COMMANDS.LINE_FEED;
      }
    }
    
    if (bodyTemplate.showPricePerSession && activeService.servicePlan?.price && activeService.totalSessions) {
      const pricePerSession = parseFloat(activeService.servicePlan.price) / activeService.totalSessions;
      content += padLine(
        bodyTemplate.pricePerSessionLabel || 'Harga per Sesi:', 
        formatCurrency(pricePerSession),
        paperWidth
      ) + COMMANDS.LINE_FEED;
    }
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== PRICING =====
  const itemSubtotal = parseFloat(activeService.servicePlan?.price || 0);
  const itemDiscount = parseFloat(activeService.voucherDiscount || 0);
  
  // Calculate proportional tax and service charge for this item
  const totalTransactionTax = parseFloat(transaction?.tax || transaction?.taxAmount || 0);
  const totalTransactionServiceCharge = parseFloat(transaction?.serviceCharge || 0);
  const totalTransactionSubtotal = parseFloat(transaction?.subtotal || 1);
  const itemTax = totalTransactionSubtotal > 0 
    ? (totalTransactionTax * itemSubtotal) / totalTransactionSubtotal 
    : 0;
  const itemServiceCharge = totalTransactionSubtotal > 0 
    ? (totalTransactionServiceCharge * itemSubtotal) / totalTransactionSubtotal 
    : 0;
  
  const itemTotal = parseFloat(activeService.pricePaid || itemSubtotal);
  
  content += padLine(bodyTemplate.priceLabel || 'Harga:', formatCurrency(itemSubtotal), paperWidth) + COMMANDS.LINE_FEED;
  
  // Show discount with voucher name if applicable
  if (bodyTemplate.showDiscount !== false && itemDiscount > 0) {
    const voucherName = activeService.voucher?.name || transaction?.voucher?.name;
    const discountLabel = voucherName 
      ? `${bodyTemplate.discountLabel || 'Diskon'} (${voucherName}):`
      : `${bodyTemplate.discountLabel || 'Diskon'}:`;
    content += padLine(discountLabel, `-${formatCurrency(itemDiscount)}`, paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Show service charge if applicable (gym services don't have service charge, but show if present)
  if (bodyTemplate.showServiceCharge !== false && itemServiceCharge > 0) {
    const serviceChargePercentage = tenant?.settings?.transaction?.serviceChargePercentage || 0;
    const serviceChargeLabel = serviceChargePercentage > 0 
      ? `${bodyTemplate.serviceChargeLabel || 'Service'} (${serviceChargePercentage}%):`
      : `${bodyTemplate.serviceChargeLabel || 'Service'}:`;
    content += padLine(serviceChargeLabel, formatCurrency(itemServiceCharge), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Show tax if tenant has tax enabled - correct path: tenant.settings.transaction.taxEnable
  const taxEnabled = tenant?.settings?.transaction?.taxEnable;
  const taxPercentage = tenant?.settings?.transaction?.taxPercentage || 0;
  if (taxEnabled && itemTax > 0) {
    const taxLabel = taxPercentage > 0 
      ? `${bodyTemplate.taxLabel || 'Pajak'} (${taxPercentage}%):`
      : `${bodyTemplate.taxLabel || 'Pajak'}:`;
    content += padLine(taxLabel, formatCurrency(itemTax), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  content += COMMANDS.BOLD_ON;
  if (bodyTemplate.totalDoubleSize !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
  }
  content += padLine(bodyTemplate.totalLabel || 'TOTAL BAYAR:', formatCurrency(itemTotal), paperWidth) + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.BOLD_OFF;
  
  // ===== PAYMENT INFO =====
  if (transaction?.payments && transaction.payments.length > 0 && bodyTemplate.showPaymentBreakdown !== false) {
    content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
    content += (bodyTemplate.paymentMethodLabel || 'Metode Pembayaran') + ':' + COMMANDS.LINE_FEED;
    
    for (const payment of transaction.payments) {
      const methodLabel = bodyTemplate.paymentMethodLabels?.[payment.paymentMethod] || {
        'cash': 'Tunai',
        'debit': 'Debit',
        'credit': 'Kredit',
        'qris': 'QRIS',
        'transfer': 'Transfer'
      }[payment.paymentMethod] || payment.paymentMethod;
      
      content += padLine(`  ${methodLabel}:`, formatCurrency(payment?.amount || 0), paperWidth) + COMMANDS.LINE_FEED;
    }
  }
  
  // ===== FOOTER =====
  content += COMMANDS.ALIGN_CENTER;
  content += createSeparator(footerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (footerTemplate.showThankYou && footerTemplate.thankYouMessage) {
    content += footerTemplate.thankYouMessage + COMMANDS.LINE_FEED;
  }
  
  if (footerTemplate.customFooterText) {
    footerTemplate.customFooterText.split('\n').forEach(line => {
      content += line + COMMANDS.LINE_FEED;
    });
  }
  
  if (footerTemplate.showSocialMedia && tenant.settings?.socialMedia) {
    const sm = tenant.settings.socialMedia;
    if (sm.instagram) {
      content += `${footerTemplate.instagramLabel || 'IG'}: ${sm.instagram}` + COMMANDS.LINE_FEED;
    }
    if (sm.facebook) {
      content += `${footerTemplate.facebookLabel || 'FB'}: ${sm.facebook}` + COMMANDS.LINE_FEED;
    }
    if (sm.whatsapp) {
      content += `${footerTemplate.whatsappLabel || 'WA'}: ${sm.whatsapp}` + COMMANDS.LINE_FEED;
    }
  }
  
  if (footerTemplate.showWebsite && tenant.website) {
    content += `${footerTemplate.websiteLabel || 'Web'}: ${tenant.website}` + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(footerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  content += COMMANDS.LINE_FEED;
  
  if (footerTemplate.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
};

/**
 * Print service purchase receipt
 */
const printServiceReceipt = async (activeService, member, transaction, tenant) => {
  try {
    // Log initial state
    logger.logInfo('Print service receipt - Starting', {
      action: 'PRINT_SERVICE_RECEIPT_START',
      tenantId: tenant?.id,
      activeServiceId: activeService?.id,
      transactionId: transaction?.id,
      serviceType: activeService?.serviceType,
      hasTenantSettings: !!(tenant?.settings),
      hasPrinters: !!(tenant?.settings?.printers),
      printerCount: tenant?.settings?.printers?.length || 0
    });
    
    const printer = getReceiptPrinter(tenant);
    
    if (!printer) {
      logger.logInfo('No receipt printer configured', {
        action: 'PRINT_SERVICE_RECEIPT_SKIP',
        tenantId: tenant?.id,
        activeServiceId: activeService?.id,
        reason: 'No printer configured'
      });
      return { success: false, message: 'No receipt printer configured', skipped: true };
    }
    
    if (printer.connectionType !== 'network') {
      logger.logInfo('Non-network printer skipped', {
        action: 'PRINT_SERVICE_RECEIPT_SKIP',
        tenantId: tenant?.id,
        activeServiceId: activeService?.id,
        printerType: printer.connectionType,
        reason: 'Only network printers supported'
      });
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template type based on service type
    const templateType = activeService.serviceType === 'membership' ? 'membership' :
                        activeService.serviceType === 'class' ? 'class' :
                        'personalTraining';
    
    // Get template from tenant settings
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates[templateType] || {};
    
    logger.logInfo('Building service receipt', {
      action: 'BUILD_SERVICE_RECEIPT',
      tenantId: tenant.id,
      activeServiceId: activeService.id,
      serviceType: activeService.serviceType,
      templateType,
      hasCustomTemplate: Object.keys(template).length > 0,
      printerIp: printer.ipAddress,
      printerPort: printer.port || 9100,
      taxEnabled: tenant?.settings?.transaction?.taxEnable,
      taxPercentage: tenant?.settings?.transaction?.taxPercentage,
      transactionTax: transaction?.tax || transaction?.taxAmount,
      transactionSubtotal: transaction?.subtotal
    });
    
    const receiptContent = buildServiceReceipt(activeService, member, transaction, tenant, template);
    
    // Send to printer
    const result = await sendToPrinter(
      printer.ipAddress,
      printer.port || 9100,
      receiptContent
    );
    
    logger.logInfo('Service receipt printed successfully', {
      action: 'PRINT_SERVICE_RECEIPT_SUCCESS',
      tenantId: tenant.id,
      activeServiceId: activeService.id,
      transactionId: transaction.id,
      serviceType: activeService.serviceType,
      printerId: printer.id,
      printerName: printer.name
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to print service receipt', {
      action: 'PRINT_SERVICE_RECEIPT_ERROR',
      error: error.message,
      stack: error.stack,
      activeServiceId: activeService?.id,
      transactionId: transaction?.id,
      tenantId: tenant?.id
    });
    // Don't throw - printing failure shouldn't break the purchase
    return { success: false, message: error.message };
  }
};

/**
 * Build combined service purchase receipt (multiple services in one receipt)
 */
const buildCombinedServiceReceipt = (activeServices, member, transaction, tenant, template = {}) => {
  const headerTemplate = template.header || {};
  const bodyTemplate = template.body || {};
  const footerTemplate = template.footer || {};
  
  const paperWidth = template.paperWidth || 48;
  let content = '';
  
  // Initialize printer
  content += COMMANDS.INIT;
  
  // ===== HEADER =====
  content += COMMANDS.ALIGN_CENTER;
  
  if (headerTemplate.customHeaderText) {
    content += headerTemplate.customHeaderText + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (headerTemplate.showBusinessName !== false) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += (headerTemplate.businessNameOverride || tenant.name || 'Gym') + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  if (headerTemplate.showAddress !== false && (headerTemplate.addressOverride || tenant.address)) {
    const address = headerTemplate.addressOverride || tenant.address;
    content += address + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showPhone !== false && (headerTemplate.phoneOverride || tenant.phone)) {
    const phone = headerTemplate.phoneOverride || tenant.phone;
    content += `Tel: ${phone}` + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showTaxNumber && headerTemplate.taxNumber) {
    content += `NPWP: ${headerTemplate.taxNumber}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== RECEIPT LABEL =====
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.BOLD_ON;
  content += (bodyTemplate.receiptLabel || 'BUKTI PEMBELIAN SERVICES') + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.ALIGN_LEFT;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TRANSACTION INFO =====
  content += padLine(
    bodyTemplate.receiptNumberLabel || 'No. Transaksi:', 
    transaction?.transactionNumber || '-', 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  content += padLine(
    bodyTemplate.dateLabel || 'Tanggal:', 
    transaction?.createdAt ? formatDate(transaction.createdAt) : '-', 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== MEMBER INFO =====
  const memberName = member?.firstName && member?.lastName 
    ? `${member.firstName} ${member.lastName}`
    : member?.name || '-';
  
  content += padLine(
    bodyTemplate.memberLabel || 'Member:', 
    memberName, 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== SERVICES LIST =====
  content += COMMANDS.BOLD_ON;
  content += (bodyTemplate.servicesLabel || 'PAKET YANG DIBELI') + ':' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.LINE_FEED;
  
  for (let i = 0; i < activeServices.length; i++) {
    const activeService = activeServices[i];
    const servicePlan = activeService.servicePlan;
    
    // Service number and name
    content += `${i + 1}. ${servicePlan?.name || 'Service'}` + COMMANDS.LINE_FEED;
    
    // Trainer if assigned
    if (activeService.assignedTrainer && bodyTemplate.showTrainer !== false) {
      const trainerLabel = activeService.serviceType === 'personalTraining' ? 
        (bodyTemplate.trainerLabel || 'Trainer') : 
        (bodyTemplate.instructorLabel || 'Instruktur');
      const trainerName = activeService.assignedTrainer.firstName && activeService.assignedTrainer.lastName
        ? `${activeService.assignedTrainer.firstName} ${activeService.assignedTrainer.lastName}`
        : activeService.assignedTrainer.name || '-';
      content += `   ${trainerLabel}: ${trainerName}` + COMMANDS.LINE_FEED;
    }
    
    // Time-based info (membership)
    if (activeService.serviceType === 'membership') {
      content += `   ${bodyTemplate.validityLabel || 'Berlaku'}:` + COMMANDS.LINE_FEED;
      const startDateStr = activeService?.startDate ? formatDate(activeService.startDate) : '-';
      const endDateStr = activeService?.endDate ? formatDate(activeService.endDate) : '-';
      content += `   ${startDateStr} s/d ${endDateStr}` + COMMANDS.LINE_FEED;
    }
    
    // Session-based info
    if (activeService.totalSessions) {
      content += `   Total Sesi: ${activeService.totalSessions} Sesi` + COMMANDS.LINE_FEED;
      if (activeService.remainingSessions !== null && activeService.remainingSessions !== undefined) {
        content += `   Sisa Sesi: ${activeService.remainingSessions} Sesi` + COMMANDS.LINE_FEED;
      }
      
      // Show validity period for session-based (from validityDays)
      if (activeService.serviceType === 'class' && (activeService.startDate || activeService.endDate)) {
        content += `   Berlaku s/d:` + COMMANDS.LINE_FEED;
        const endDateStr = activeService?.endDate ? formatDate(activeService.endDate) : '-';
        content += `   ${endDateStr}` + COMMANDS.LINE_FEED;
      }
    }
    
    // Price
    const itemPrice = parseFloat(servicePlan?.price || 0);
    content += padLine(`   ${bodyTemplate.priceLabel || 'Harga'}:`, formatCurrency(itemPrice), paperWidth) + COMMANDS.LINE_FEED;
    
    // Add spacing between services
    if (i < activeServices.length - 1) {
      content += COMMANDS.LINE_FEED;
    }
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TOTAL PRICING =====
  const subtotal = parseFloat(transaction?.subtotal || 0);
  const discount = parseFloat(transaction?.voucherDiscount || 0);
  const serviceCharge = parseFloat(transaction?.serviceCharge || 0);
  const tax = parseFloat(transaction?.tax || transaction?.taxAmount || 0);
  const total = parseFloat(transaction?.totalAmount || 0);
  
  content += padLine(bodyTemplate.subtotalLabel || 'Subtotal:', formatCurrency(subtotal), paperWidth) + COMMANDS.LINE_FEED;
  
  // Show discount with voucher name
  if (bodyTemplate.showDiscount !== false && discount > 0) {
    const voucherName = transaction?.voucher?.name;
    const discountLabel = voucherName 
      ? `${bodyTemplate.discountLabel || 'Diskon'} (${voucherName}):`
      : `${bodyTemplate.discountLabel || 'Diskon'}:`;
    content += padLine(discountLabel, `-${formatCurrency(discount)}`, paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Show service charge if applicable (gym services don't have service charge, but show if present)
  if (bodyTemplate.showServiceCharge !== false && serviceCharge > 0) {
    const serviceChargePercentage = tenant?.settings?.transaction?.serviceChargePercentage || 0;
    const serviceChargeLabel = serviceChargePercentage > 0 
      ? `${bodyTemplate.serviceChargeLabel || 'Service'} (${serviceChargePercentage}%):`
      : `${bodyTemplate.serviceChargeLabel || 'Service'}:`;
    content += padLine(serviceChargeLabel, formatCurrency(serviceCharge), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Show tax if enabled - correct path: tenant.settings.transaction.taxEnable
  const taxEnabled = tenant?.settings?.transaction?.taxEnable;
  const taxPercentage = tenant?.settings?.transaction?.taxPercentage || 0;
  if (taxEnabled && tax > 0) {
    const taxLabel = taxPercentage > 0 
      ? `${bodyTemplate.taxLabel || 'Pajak'} (${taxPercentage}%):`
      : `${bodyTemplate.taxLabel || 'Pajak'}:`;
    content += padLine(taxLabel, formatCurrency(tax), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  content += COMMANDS.BOLD_ON;
  if (bodyTemplate.totalDoubleSize !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
  }
  content += padLine(bodyTemplate.totalLabel || 'TOTAL BAYAR:', formatCurrency(total), paperWidth) + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.BOLD_OFF;
  
  // ===== PAYMENT INFO =====
  if (transaction?.payments && transaction.payments.length > 0 && bodyTemplate.showPaymentBreakdown !== false) {
    content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
    content += (bodyTemplate.paymentMethodLabel || 'Metode Pembayaran') + ':' + COMMANDS.LINE_FEED;
    
    for (const payment of transaction.payments) {
      const methodLabel = bodyTemplate.paymentMethodLabels?.[payment.paymentMethod] || {
        'cash': 'Tunai',
        'debit': 'Debit',
        'credit': 'Kredit',
        'qris': 'QRIS',
        'transfer': 'Transfer'
      }[payment.paymentMethod] || payment.paymentMethod;
      
      content += padLine(`  ${methodLabel}:`, formatCurrency(payment?.amount || 0), paperWidth) + COMMANDS.LINE_FEED;
    }
  }
  
  // ===== FOOTER =====
  content += COMMANDS.ALIGN_CENTER;
  content += createSeparator(footerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (footerTemplate.showThankYou && footerTemplate.thankYouMessage) {
    content += footerTemplate.thankYouMessage + COMMANDS.LINE_FEED;
  }
  
  if (footerTemplate.customFooterText) {
    footerTemplate.customFooterText.split('\n').forEach(line => {
      content += line + COMMANDS.LINE_FEED;
    });
  }
  
  if (footerTemplate.showSocialMedia && tenant.settings?.socialMedia) {
    const social = tenant.settings.socialMedia;
    if (social.instagram) content += `IG: @${social.instagram}` + COMMANDS.LINE_FEED;
    if (social.facebook) content += `FB: ${social.facebook}` + COMMANDS.LINE_FEED;
    if (social.twitter) content += `Twitter: @${social.twitter}` + COMMANDS.LINE_FEED;
  }
  
  // Auto-cut
  if (footerTemplate.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
};

/**
 * Print combined service purchase receipt (all services in one receipt)
 */
const printCombinedServiceReceipt = async (activeServices, member, transaction, tenant) => {
  try {
    logger.logInfo('Print combined service receipt - Starting', {
      action: 'PRINT_COMBINED_SERVICE_RECEIPT_START',
      tenantId: tenant?.id,
      transactionId: transaction?.id,
      serviceCount: activeServices?.length || 0,
      hasTenantSettings: !!(tenant?.settings),
      hasPrinters: !!(tenant?.settings?.printers)
    });
    
    const printer = getReceiptPrinter(tenant);
    
    if (!printer) {
      logger.logInfo('No receipt printer configured', {
        action: 'PRINT_COMBINED_SERVICE_RECEIPT_SKIP',
        tenantId: tenant?.id,
        transactionId: transaction?.id,
        reason: 'No printer configured'
      });
      return { success: false, message: 'No receipt printer configured', skipped: true };
    }
    
    if (printer.connectionType !== 'network') {
      logger.logInfo('Non-network printer skipped', {
        action: 'PRINT_COMBINED_SERVICE_RECEIPT_SKIP',
        tenantId: tenant?.id,
        transactionId: transaction?.id,
        printerType: printer.connectionType,
        reason: 'Only network printers supported'
      });
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template - use first service type as base template
    const templateType = activeServices[0]?.serviceType === 'membership' ? 'membership' :
                        activeServices[0]?.serviceType === 'class' ? 'class' :
                        'personalTraining';
    
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates[templateType] || {};
    
    logger.logInfo('Building combined service receipt', {
      action: 'BUILD_COMBINED_SERVICE_RECEIPT',
      tenantId: tenant.id,
      transactionId: transaction.id,
      serviceCount: activeServices.length,
      templateType,
      hasCustomTemplate: Object.keys(template).length > 0,
      printerIp: printer.ipAddress,
      printerPort: printer.port || 9100,
      taxEnabled: tenant?.settings?.transaction?.taxEnable,
      taxPercentage: tenant?.settings?.transaction?.taxPercentage
    });
    
    const receiptContent = buildCombinedServiceReceipt(activeServices, member, transaction, tenant, template);
    
    // Send to printer
    const result = await sendToPrinter(
      printer.ipAddress,
      printer.port || 9100,
      receiptContent
    );
    
    logger.logInfo('Combined service receipt printed successfully', {
      action: 'PRINT_COMBINED_SERVICE_RECEIPT_SUCCESS',
      tenantId: tenant.id,
      transactionId: transaction.id,
      serviceCount: activeServices.length,
      printerId: printer.id,
      printerName: printer.name
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to print combined service receipt', {
      action: 'PRINT_COMBINED_SERVICE_RECEIPT_ERROR',
      error: error.message,
      stack: error.stack,
      transactionId: transaction?.id,
      tenantId: tenant?.id
    });
    return { success: false, message: error.message };
  }
};

/**
 * Get kitchen printer for specific product category
 * @param {object} tenant - Tenant object with settings
 * @param {string} category - Product category: 'food' | 'beverage'
 * @returns {object|null} Printer configuration
 */
const getKitchenPrinterByCategory = (tenant, category = 'food') => {
  const printers = tenant.settings?.printers || [];
  
  // First, find printer specific to this category
  let printer = printers.find(p => 
    p.printerType === 'kitchen' && 
    p.printerCategory === category &&
    p.isActive === true
  );
  
  // Fallback: Find printer that handles 'all' categories
  if (!printer) {
    printer = printers.find(p => 
      p.printerType === 'kitchen' && 
      p.printerCategory === 'all' &&
      p.isActive === true
    );
  }
  
  // Last fallback: Any active kitchen printer
  if (!printer) {
    printer = printers.find(p => 
      p.printerType === 'kitchen' && 
      p.isActive === true
    );
  }
  
  return printer;
};

/**
 * Print kitchen ticket for specific category
 * @param {object} order - Order object
 * @param {array} items - Filtered items for this category
 * @param {object} tenant - Tenant object
 * @param {object} printer - Printer configuration
 * @param {string} headerLabel - Header label (KITCHEN/BAR)
 * @returns {object} Print result
 */
const printKitchenTicketForCategory = async (order, items, tenant, printer, headerLabel = 'KITCHEN') => {
  try {
    if (printer.connectionType !== 'network') {
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template from tenant settings
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates.kitchen || getDefaultKitchenTicketTemplate();
    
    // Override header text with category-specific label
    const categoryTemplate = {
      ...template,
      header: {
        ...template.header,
        customHeaderText: `= ${headerLabel} =`
      }
    };
    
    const ticketContent = buildKitchenTicket(order, items, tenant, categoryTemplate);
    
    // Create print job record
    let printJob;
    try {
      printJob = await PrintJob.create({
        tenantId: tenant.id,
        printerId: printer.id,
        jobType: 'kitchen',
        printData: ticketContent,
        status: 'pending',
        metadata: {
          orderId: order.id,
          orderNumber: order.transactionNumber,
          itemCount: items.length,
          printerName: printer.name,
          category: headerLabel.toLowerCase()
        }
      });
      
      logger.logInfo(`PrintJob created for ${headerLabel}`, {
        action: 'PRINT_JOB_CREATED',
        printJobId: printJob.id,
        orderId: order.id,
        printerId: printer.id,
        category: headerLabel,
        tenantId: tenant.id
      });
    } catch (jobError) {
      logger.logSecurity('Failed to create PrintJob', {
        action: 'PRINT_JOB_CREATE_ERROR',
        error: jobError.message,
        orderId: order.id,
        printerId: printer.id,
        category: headerLabel,
        tenantId: tenant.id
      });
      printJob = null;
    }
    
    try {
      const result = await sendToPrinter(
        printer.ipAddress,
        printer.port || 9100,
        ticketContent
      );
      
      // Mark as completed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      logger.logInfo(`${headerLabel} ticket printed`, {
        action: `PRINT_${headerLabel}_SUCCESS`,
        tenantId: tenant.id,
        orderId: order.id,
        printerId: printer.id,
        printJobId: printJob?.id
      });
      
      return { 
        ...result, 
        printJobId: printJob?.id,
        printerId: printer.id,
        category: headerLabel.toLowerCase()
      };
    } catch (printError) {
      // Mark as failed if job was created
      if (printJob) {
        await printJob.update({ 
          status: 'failed',
          errorMessage: printError.message,
          completedAt: new Date()
        });
      }
      throw printError;
    }
  } catch (error) {
    logger.logSecurity(`${headerLabel} ticket print failed`, {
      action: `PRINT_${headerLabel}_ERROR`,
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message
    });
    
    return { success: false, message: error.message, error: true };
  }
};

/**
 * Print kitchen tickets split by product category (food/beverage)
 * @param {object} order - Order object
 * @param {array} items - Order items with product details
 * @param {object} tenant - Tenant object with settings
 * @returns {object} Print results per category
 */
const printKitchenTicketsSplit = async (order, items, tenant) => {
  try {
    // Group items by productType
    const foodItems = [];
    const beverageItems = [];
    const otherItems = [];
    
    items.forEach(item => {
      const productType = item.product?.productType || 'food';
      
      logger.logInfo('Split print item classification', {
        action: 'SPLIT_PRINT_CLASSIFY',
        itemName: item.product?.name || item.name || 'unknown',
        productType,
        rawProductType: item.product?.productType,
        hasProduct: !!item.product,
        productId: item.product?.id || item.productId,
        orderId: order.id
      });
      
      if (productType === 'food') {
        foodItems.push(item);
      } else if (productType === 'beverage') {
        beverageItems.push(item);
      } else {
        otherItems.push(item);
      }
    });
    
    logger.logInfo('Split print summary', {
      action: 'SPLIT_PRINT_SUMMARY',
      orderId: order.id,
      foodCount: foodItems.length,
      beverageCount: beverageItems.length,
      otherCount: otherItems.length,
      tenantId: tenant.id
    });
    
    const results = {
      food: null,
      beverage: null,
      other: null,
      success: false,
      errors: []
    };
    
    // Print food items to kitchen printer
    if (foodItems.length > 0) {
      try {
        const kitchenPrinter = getKitchenPrinterByCategory(tenant, 'food');
        
        if (kitchenPrinter) {
          results.food = await printKitchenTicketForCategory(
            order, 
            foodItems, 
            tenant, 
            kitchenPrinter,
            'KITCHEN'
          );
        } else {
          results.food = { 
            success: false, 
            message: 'No kitchen printer configured',
            skipped: true 
          };
        }
      } catch (error) {
        results.errors.push({ category: 'food', error: error.message });
        results.food = { success: false, message: error.message };
      }
    }
    
    // Print beverage items to bar printer
    if (beverageItems.length > 0) {
      try {
        const barPrinter = getKitchenPrinterByCategory(tenant, 'beverage');
        
        if (barPrinter) {
          // Add delay if food was printed to same printer
          if (results.food?.success && barPrinter.id === results.food.printerId) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          results.beverage = await printKitchenTicketForCategory(
            order, 
            beverageItems, 
            tenant, 
            barPrinter,
            'BAR'
          );
        } else {
          results.beverage = { 
            success: false, 
            message: 'No bar printer configured',
            skipped: true 
          };
        }
      } catch (error) {
        results.errors.push({ category: 'beverage', error: error.message });
        results.beverage = { success: false, message: error.message };
      }
    }
    
    // Print other items to default kitchen printer
    if (otherItems.length > 0) {
      try {
        const printer = getKitchenPrinter(tenant);
        
        if (printer) {
          // Add delay if previous prints were sent to same printer
          if ((results.food?.success || results.beverage?.success) && 
              (printer.id === results.food?.printerId || printer.id === results.beverage?.printerId)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          results.other = await printKitchenTicketForCategory(
            order, 
            otherItems, 
            tenant, 
            printer,
            'KITCHEN'
          );
        }
      } catch (error) {
        results.errors.push({ category: 'other', error: error.message });
        results.other = { success: false, message: error.message };
      }
    }
    
    // Overall success if at least one print succeeded
    results.success = results.food?.success || results.beverage?.success || results.other?.success;
    
    logger.logInfo('Split kitchen tickets printed', {
      action: 'PRINT_KITCHEN_SPLIT',
      tenantId: tenant.id,
      orderId: order.id,
      foodItems: foodItems.length,
      beverageItems: beverageItems.length,
      otherItems: otherItems.length,
      results: {
        food: results.food?.success || false,
        beverage: results.beverage?.success || false,
        other: results.other?.success || false
      }
    });
    
    return results;
    
  } catch (error) {
    logger.logSecurity('Split kitchen print failed', {
      action: 'PRINT_KITCHEN_SPLIT_ERROR',
      tenantId: tenant.id,
      orderId: order?.id,
      error: error.message,
      stack: error.stack
    });
    
    return { 
      success: false, 
      message: error.message, 
      error: true,
      errors: [error.message]
    };
  }
};

/**
 * Build pre-print payment receipt (bill/invoice before or after payment)
 * Works for any transaction type (service, product, membership, etc.)
 * 
 * @param {Object} transaction - Transaction with transactionItems, payments, member/customer
 * @param {Object} tenant - Tenant object with settings
 * @param {Object} template - Receipt template overrides
 * @returns {String} ESC/POS formatted receipt content
 */
const buildPaymentReceipt = (transaction, tenant, template = {}) => {
  const headerTemplate = template.header || {};
  const bodyTemplate = template.body || {};
  const footerTemplate = template.footer || {};
  
  const paperWidth = template.paperWidth || 48;
  let content = '';
  
  // Initialize printer
  content += COMMANDS.INIT;
  
  // ===== HEADER =====
  content += COMMANDS.ALIGN_CENTER;
  
  if (headerTemplate.customHeaderText) {
    content += headerTemplate.customHeaderText + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (headerTemplate.showBusinessName !== false) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += (headerTemplate.businessNameOverride || tenant.name || 'Gym') + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
  }
  
  if (headerTemplate.showAddress !== false && (headerTemplate.addressOverride || tenant.address)) {
    const address = headerTemplate.addressOverride || tenant.address;
    content += address + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showPhone !== false && (headerTemplate.phoneOverride || tenant.phone)) {
    const phone = headerTemplate.phoneOverride || tenant.phone;
    content += `Tel: ${phone}` + COMMANDS.LINE_FEED;
  }
  
  if (headerTemplate.showTaxNumber && headerTemplate.taxNumber) {
    content += `NPWP: ${headerTemplate.taxNumber}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += createSeparator(headerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== RECEIPT LABEL =====
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.BOLD_ON;
  const isPaid = transaction.status === 'completed' || transaction.status === 'paid';
  const receiptLabel = bodyTemplate.receiptLabel || (isPaid ? 'BUKTI PEMBAYARAN' : 'PRE-PRINT PEMBAYARAN');
  content += receiptLabel + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.ALIGN_LEFT;
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TRANSACTION INFO =====
  content += padLine(
    bodyTemplate.receiptNumberLabel || 'No. Transaksi:', 
    transaction?.transactionNumber || '-', 
    paperWidth
  ) + COMMANDS.LINE_FEED;
  content += padLine(
    bodyTemplate.dateLabel || 'Tanggal:', 
    transaction?.createdAt ? formatDate(transaction.createdAt) : formatDate(new Date()), 
    paperWidth
  ) + COMMANDS.LINE_FEED;

  // Order type (dine-in / takeaway / delivery)
  if (transaction.orderType && bodyTemplate.showOrderType !== false) {
    const orderTypeLabel = {
      'dine-in': bodyTemplate.dineInLabel || 'Dine In',
      'takeaway': bodyTemplate.takeawayLabel || 'Take Away',
      'delivery': bodyTemplate.deliveryLabel || 'Delivery'
    }[transaction.orderType] || transaction.orderType;
    content += padLine(
      bodyTemplate.typeLabel || 'Tipe:',
      orderTypeLabel,
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }

  // Table number
  if (transaction.table?.tableNumber && bodyTemplate.showTable !== false) {
    const tableDisplay = transaction.table.tableName
      ? `${transaction.table.tableNumber} - ${transaction.table.tableName}`
      : transaction.table.tableNumber;
    content += COMMANDS.BOLD_ON;
    content += padLine(
      bodyTemplate.tableLabel || 'Meja:',
      tableDisplay,
      paperWidth
    ) + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
  }
  
  // Cashier info
  if (transaction.creator && bodyTemplate.showCashier !== false) {
    const cashierName = transaction.creator.firstName && transaction.creator.lastName
      ? `${transaction.creator.firstName} ${transaction.creator.lastName}`
      : transaction.creator.name || transaction.creator.email || '-';
    content += padLine(
      bodyTemplate.cashierLabel || 'Kasir:',
      cashierName,
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== CUSTOMER/MEMBER INFO =====
  if (transaction.member) {
    const memberName = transaction.member.firstName && transaction.member.lastName
      ? `${transaction.member.firstName} ${transaction.member.lastName}`
      : transaction.member.name || '-';
    content += padLine(
      bodyTemplate.memberLabel || 'Member:',
      memberName,
      paperWidth
    ) + COMMANDS.LINE_FEED;
    
    if (transaction.member.phone && bodyTemplate.showMemberPhone !== false) {
      content += padLine(
        bodyTemplate.memberPhoneLabel || 'Telp:',
        transaction.member.phone,
        paperWidth
      ) + COMMANDS.LINE_FEED;
    }
  } else if (transaction.customerType === 'non-member') {
    content += padLine(
      bodyTemplate.customerLabel || 'Pelanggan:',
      bodyTemplate.nonMemberLabel || 'Non-Member',
      paperWidth
    ) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== ITEMS =====
  content += COMMANDS.BOLD_ON;
  content += (bodyTemplate.itemsLabel || 'DAFTAR ITEM') + ':' + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += COMMANDS.LINE_FEED;
  
  const items = transaction.transactionItems || [];
  
  for (const item of items) {
    // Skip discount/tax line items
    if (item.itemType === 'discount' || item.itemType === 'tax') continue;
    
    const itemName = item.itemName || item.product?.name || item.membership?.type || 'Item';
    const qty = item.quantity || 1;
    const price = parseFloat(item.unitPrice || 0);
    const basePrice = parseFloat(item.itemDetails?.basePrice || price);
    const total = parseFloat(item.total || item.subtotal || price * qty);
    
    // Item name with base unit price on right
    content += padLine(`${qty}x ${itemName}`, formatCurrency(basePrice), paperWidth) + COMMANDS.LINE_FEED;
    
    // SKU if enabled
    if (bodyTemplate.showItemCode && item.product?.sku) {
      content += `   [${item.product.sku}]` + COMMANDS.LINE_FEED;
    }
    
    // Show qty breakdown before extras when qty > 1
    if (qty > 1) {
      content += padLine(`   @${formatCurrency(basePrice)}`, formatCurrency(basePrice * qty), paperWidth) + COMMANDS.LINE_FEED;
    }
    
    // Extras (add-ons) if present
    let extrasTotal = 0;
    if (item.itemDetails?.extras && Array.isArray(item.itemDetails.extras) && item.itemDetails.extras.length > 0) {
      for (const extra of item.itemDetails.extras) {
        const extraQty = extra.quantity || 1;
        const extraPrice = parseFloat(extra.price || 0);
        const extraName = extra.name || 'Extra';
        extrasTotal += extraPrice * extraQty;
        if (extraQty > 1) {
          content += padLine(`   + ${extraName} x${extraQty}`, formatCurrency(extraPrice * extraQty), paperWidth) + COMMANDS.LINE_FEED;
        } else {
          content += padLine(`   + ${extraName}`, formatCurrency(extraPrice), paperWidth) + COMMANDS.LINE_FEED;
        }
      }
    }
    
    content += COMMANDS.LINE_FEED;
    
    // Item notes
    if (item.notes) {
      content += `   * ${item.notes}` + COMMANDS.LINE_FEED;
    }
    
    // Active service info (start/end dates, sessions)
    if (item.activeServiceId && bodyTemplate.showServiceDetails !== false) {
      if (item.startDate) {
        const startDateStr = formatDate(item.startDate);
        const endDateStr = item.endDate ? formatDate(item.endDate) : '-';
        content += `   Berlaku: ${startDateStr} s/d ${endDateStr}` + COMMANDS.LINE_FEED;
      }
      if (item.totalSessions) {
        content += `   Sesi: ${item.totalSessions} sesi` + COMMANDS.LINE_FEED;
      }
    }
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // ===== TOTALS =====
  const subtotal = parseFloat(transaction.subtotal || 0);
  const discount = parseFloat(transaction.voucherDiscount || 0);
  const serviceCharge = parseFloat(transaction.serviceCharge || 0);
  const tax = parseFloat(transaction.tax || transaction.taxAmount || 0);
  const total = parseFloat(transaction.totalAmount || 0);
  
  content += padLine(bodyTemplate.subtotalLabel || 'Subtotal:', formatCurrency(subtotal), paperWidth) + COMMANDS.LINE_FEED;
  
  // Show discount with voucher info and percentage
  if (bodyTemplate.showDiscount !== false && discount > 0) {
    const voucher = transaction.voucher;
    const voucherName = voucher?.name || voucher?.code;
    const isPercentage = voucher?.type === 'percentage';
    const percentageValue = isPercentage ? parseFloat(voucher?.value || 0) : null;

    let discountLabel;
    if (voucherName && percentageValue) {
      discountLabel = `${bodyTemplate.discountLabel || 'Diskon'} ${percentageValue}% (${voucherName}):`;
    } else if (percentageValue) {
      discountLabel = `${bodyTemplate.discountLabel || 'Diskon'} ${percentageValue}%:`;
    } else if (voucherName) {
      discountLabel = `${bodyTemplate.discountLabel || 'Diskon'} (${voucherName}):`;
    } else {
      discountLabel = `${bodyTemplate.discountLabel || 'Diskon'}:`;
    }
    content += padLine(discountLabel, `-${formatCurrency(discount)}`, paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Service charge
  if (bodyTemplate.showServiceCharge !== false && serviceCharge > 0) {
    const serviceChargePercentage = tenant?.settings?.transaction?.serviceChargePercentage || 0;
    const serviceChargeLabel = serviceChargePercentage > 0
      ? `${bodyTemplate.serviceChargeLabel || 'Service'} (${serviceChargePercentage}%):`
      : `${bodyTemplate.serviceChargeLabel || 'Service'}:`;
    content += padLine(serviceChargeLabel, formatCurrency(serviceCharge), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  // Tax
  const taxEnabled = tenant?.settings?.transaction?.taxEnable;
  const taxPercentage = tenant?.settings?.transaction?.taxPercentage || 0;
  if (taxEnabled && tax > 0) {
    const taxLabel = taxPercentage > 0
      ? `${bodyTemplate.taxLabel || 'Pajak'} (${taxPercentage}%):`
      : `${bodyTemplate.taxLabel || 'Pajak'}:`;
    content += padLine(taxLabel, formatCurrency(tax), paperWidth) + COMMANDS.LINE_FEED;
  }
  
  content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
  
  // TOTAL
  content += COMMANDS.BOLD_ON;
  if (bodyTemplate.totalDoubleSize !== false) {
    content += COMMANDS.DOUBLE_HEIGHT_ON;
  }
  content += padLine(bodyTemplate.totalLabel || 'TOTAL:', formatCurrency(total), paperWidth) + COMMANDS.LINE_FEED;
  content += COMMANDS.NORMAL_SIZE;
  content += COMMANDS.BOLD_OFF;
  
  // ===== PAYMENT INFO (if paid) =====
  const payments = transaction.payments || [];
  if (payments.length > 0 && bodyTemplate.showPaymentBreakdown !== false) {
    content += createSeparator(bodyTemplate.separatorChar || '-', paperWidth) + COMMANDS.LINE_FEED;
    content += (bodyTemplate.paymentMethodLabel || 'Metode Pembayaran') + ':' + COMMANDS.LINE_FEED;
    
    for (const payment of payments) {
      const methodLabel = bodyTemplate.paymentMethodLabels?.[payment.paymentMethod] || {
        'cash': 'Tunai',
        'debit': 'Debit',
        'credit': 'Kredit',
        'qris': 'QRIS',
        'transfer': 'Transfer'
      }[payment.paymentMethod] || payment.paymentMethod;
      
      content += padLine(`  ${methodLabel}:`, formatCurrency(payment?.amount || 0), paperWidth) + COMMANDS.LINE_FEED;
    }
    
    // Total paid and change
    const paidAmount = parseFloat(transaction.paidAmount || payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0));
    const changeAmount = parseFloat(transaction.changeAmount || 0);
    
    if (paidAmount > 0 && bodyTemplate.showPaidAmount !== false) {
      content += padLine(bodyTemplate.paidLabel || 'Dibayar:', formatCurrency(paidAmount), paperWidth) + COMMANDS.LINE_FEED;
      
      if (changeAmount > 0 && bodyTemplate.showChange !== false) {
        content += padLine(bodyTemplate.changeLabel || 'Kembalian:', formatCurrency(changeAmount), paperWidth) + COMMANDS.LINE_FEED;
      }
    }
  } else if (!isPaid) {
    // Pre-print: show amount due
    content += COMMANDS.LINE_FEED;
    content += COMMANDS.ALIGN_CENTER;
    content += COMMANDS.BOLD_ON;
    content += '** BELUM LUNAS **' + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_OFF;
    content += COMMANDS.ALIGN_LEFT;
  }
  
  // ===== FOOTER =====
  content += COMMANDS.ALIGN_CENTER;
  content += createSeparator(footerTemplate.separatorChar || '=', paperWidth) + COMMANDS.LINE_FEED;
  
  if (footerTemplate.showThankYou !== false) {
    content += COMMANDS.LINE_FEED;
    content += (footerTemplate.thankYouMessage || 'Terima kasih atas kunjungan Anda!') + COMMANDS.LINE_FEED;
  }
  
  if (footerTemplate.customFooterText) {
    content += COMMANDS.LINE_FEED;
    const footerLines = footerTemplate.customFooterText.split('\n');
    footerLines.forEach(line => {
      content += line + COMMANDS.LINE_FEED;
    });
  }
  
  if (footerTemplate.showSocialMedia && tenant.settings?.socialMedia) {
    const social = tenant.settings.socialMedia;
    content += COMMANDS.LINE_FEED;
    if (social.instagram) content += `IG: @${social.instagram}` + COMMANDS.LINE_FEED;
    if (social.facebook) content += `FB: ${social.facebook}` + COMMANDS.LINE_FEED;
    if (social.whatsapp) content += `WA: ${social.whatsapp}` + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  // Cut paper
  if (footerTemplate.autoCut !== false) {
    content += COMMANDS.FEED_AND_CUT;
  }
  
  return content;
};

/**
 * Print payment receipt (pre-print or post-payment)
 * Sends the payment receipt to the configured thermal printer
 * 
 * @param {Object} transaction - Transaction with includes
 * @param {Object} tenant - Tenant with settings (printers, templates)
 * @returns {Promise<Object>} Print result
 */
const printPaymentReceipt = async (transaction, tenant) => {
  try {
    const printer = getReceiptPrinter(tenant);
    
    if (!printer) {
      logger.logInfo('No receipt printer configured for payment receipt', {
        action: 'PRINT_PAYMENT_RECEIPT_SKIP',
        tenantId: tenant?.id,
        transactionId: transaction?.id
      });
      return { success: false, message: 'No receipt printer configured', skipped: true };
    }
    
    if (printer.connectionType !== 'network') {
      return { success: false, message: 'Only network printers are supported', skipped: true };
    }
    
    // Get template
    const templates = tenant.settings?.receiptTemplates || {};
    const template = templates.payment || templates.receipt || getDefaultOrderReceiptTemplate();
    
    logger.logInfo('Building payment receipt', {
      action: 'BUILD_PAYMENT_RECEIPT',
      tenantId: tenant.id,
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      status: transaction.status,
      printerIp: printer.ipAddress,
      printerPort: printer.port || 9100
    });
    
    const receiptContent = buildPaymentReceipt(transaction, tenant, template);
    
    // Create print job record
    let printJob;
    try {
      printJob = await PrintJob.create({
        tenantId: tenant.id,
        printerId: printer.id,
        jobType: 'payment_receipt',
        printData: receiptContent,
        status: 'pending',
        metadata: {
          transactionId: transaction.id,
          transactionNumber: transaction.transactionNumber,
          transactionStatus: transaction.status,
          printerName: printer.name
        }
      });
    } catch (jobError) {
      logger.logSecurity('Failed to create PrintJob for payment receipt', {
        action: 'PRINT_JOB_CREATE_ERROR',
        error: jobError.message,
        transactionId: transaction.id,
        tenantId: tenant.id
      });
      printJob = null;
    }
    
    try {
      const result = await sendToPrinter(
        printer.ipAddress,
        printer.port || 9100,
        receiptContent
      );
      
      if (printJob) {
        await printJob.update({ 
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      logger.logInfo('Payment receipt printed successfully', {
        action: 'PRINT_PAYMENT_RECEIPT_SUCCESS',
        tenantId: tenant.id,
        transactionId: transaction.id,
        transactionNumber: transaction.transactionNumber,
        printJobId: printJob?.id
      });
      
      return { ...result, printJobId: printJob?.id };
    } catch (printError) {
      if (printJob) {
        await printJob.update({ 
          status: 'failed',
          errorMessage: printError.message,
          completedAt: new Date()
        });
      }
      throw printError;
    }
  } catch (error) {
    logger.logSecurity('Payment receipt print failed', {
      action: 'PRINT_PAYMENT_RECEIPT_ERROR',
      tenantId: tenant?.id,
      transactionId: transaction?.id,
      error: error.message,
      stack: error.stack
    });
    return { success: false, message: error.message, error: true };
  }
};

module.exports = {
  printOrderReceipt,
  printKitchenTicket,
  printKitchenTicketsSplit,
  printKitchenTicketForCategory,
  openCashDrawer,
  buildOrderReceipt,
  buildKitchenTicket,
  buildServiceReceipt,
  printServiceReceipt,
  buildCombinedServiceReceipt,
  printCombinedServiceReceipt,
  buildPaymentReceipt,
  printPaymentReceipt,
  getReceiptPrinter,
  getKitchenPrinter,
  getKitchenPrinterByCategory,
  sendToPrinter,
  getDefaultOrderReceiptTemplate,
  getDefaultKitchenTicketTemplate,
  COMMANDS
};
