'use strict';

/**
 * Template Parser Service
 * 
 * Parses receipt templates with variable substitution.
 * Supports {{variable}} syntax for dynamic content.
 * 
 * Available variables:
 * - {{businessName}}, {{businessAddress}}, {{businessPhone}}
 * - {{date}}, {{time}}, {{datetime}}
 * - {{transactionNumber}}, {{cashierName}}
 * - {{customerName}}, {{customerPhone}}
 * - {{items}} - Special loop for items
 * - {{subtotal}}, {{tax}}, {{discount}}, {{total}}
 * - {{paymentMethod}}, {{amountPaid}}, {{change}}
 * 
 * @module services/templateParserService
 */

const logger = require('../utils/logger');

/**
 * ESC/POS Commands
 */
const ESC = '\x1b';
const GS = '\x1d';

const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_SIZE_ON: `${GS}!\x30`,
  NORMAL_SIZE: `${GS}!\x00`,
  LINE_FEED: '\n',
  CUT_PAPER: `${GS}V\x00`,
  FEED_AND_CUT: `${GS}V\x41\x03`,
  OPEN_DRAWER: `${ESC}p\x00\x19\xfa`
};

/**
 * Format currency (Indonesian Rupiah)
 */
function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'Rp 0';
  return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
}

/**
 * Format date (Indonesian format)
 */
function formatDate(date) {
  if (!date) date = new Date();
  if (!(date instanceof Date)) date = new Date(date);
  
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format time (Indonesian format)
 */
function formatTime(date) {
  if (!date) date = new Date();
  if (!(date instanceof Date)) date = new Date(date);
  
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format datetime (Indonesian format)
 */
function formatDateTime(date) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Pad line for alignment
 * @param {string} left - Left text
 * @param {string} right - Right text
 * @param {number} width - Total character width
 * @returns {string}
 */
function padLine(left, right, width = 48) {
  const padding = width - left.length - right.length;
  if (padding < 1) return `${left} ${right}`;
  return `${left}${' '.repeat(padding)}${right}`;
}

/**
 * Create separator line
 * @param {string} char - Character to use (default: '=')
 * @param {number} width - Line width
 * @returns {string}
 */
function createSeparator(char = '=', width = 48) {
  return char.repeat(width);
}

/**
 * Parse template variables
 * @param {string} text - Template text with {{variables}}
 * @param {object} data - Data object for substitution
 * @returns {string}
 */
function parseVariables(text, data) {
  if (!text) return '';
  
  // Replace all {{variable}} with actual values
  return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = data[variable];
    
    // Handle undefined/null
    if (value === undefined || value === null) {
      return '';
    }
    
    // Handle currency variables
    if (['subtotal', 'tax', 'discount', 'total', 'amountPaid', 'change', 'price', 'amount'].includes(variable)) {
      return formatCurrency(value);
    }
    
    // Handle date/time variables
    if (variable === 'date') return formatDate(data.transactionDate || new Date());
    if (variable === 'time') return formatTime(data.transactionDate || new Date());
    if (variable === 'datetime') return formatDateTime(data.transactionDate || new Date());
    
    // Default: return string value
    return String(value);
  });
}

/**
 * Build header section
 * @param {object} template - Template configuration
 * @param {object} data - Transaction data
 * @param {number} width - Paper width
 * @returns {string}
 */
function buildHeader(template, data, width = 48) {
  let content = '';
  const header = template.header || {};
  
  // Center alignment for header
  content += COMMANDS.ALIGN_CENTER;
  
  // Business name (double size if enabled)
  if (header.showBusinessName && data.businessName) {
    content += COMMANDS.DOUBLE_SIZE_ON;
    content += data.businessName + COMMANDS.LINE_FEED;
    content += COMMANDS.NORMAL_SIZE;
    content += COMMANDS.LINE_FEED;
  }
  
  // Business info
  if (header.showBusinessInfo) {
    if (data.businessAddress) {
      content += data.businessAddress + COMMANDS.LINE_FEED;
    }
    if (data.businessPhone) {
      content += `Telp: ${data.businessPhone}` + COMMANDS.LINE_FEED;
    }
    if (data.businessEmail) {
      content += data.businessEmail + COMMANDS.LINE_FEED;
    }
    content += COMMANDS.LINE_FEED;
  }
  
  // Custom header text
  if (header.customText) {
    const parsed = parseVariables(header.customText, data);
    content += parsed + COMMANDS.LINE_FEED;
    content += COMMANDS.LINE_FEED;
  }
  
  return content;
}

/**
 * Build body section (transaction info)
 * @param {object} template - Template configuration
 * @param {object} data - Transaction data
 * @param {number} width - Paper width
 * @returns {string}
 */
function buildBody(template, data, width = 48) {
  let content = '';
  const body = template.body || {};
  
  content += COMMANDS.ALIGN_LEFT;
  content += createSeparator('=', width) + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  // Transaction info
  if (data.transactionNumber) {
    content += padLine('No. Transaksi', data.transactionNumber, width) + COMMANDS.LINE_FEED;
  }
  if (data.transactionDate) {
    content += padLine('Tanggal', formatDateTime(data.transactionDate), width) + COMMANDS.LINE_FEED;
  }
  if (data.cashierName) {
    content += padLine('Kasir', data.cashierName, width) + COMMANDS.LINE_FEED;
  }
  if (data.customerName) {
    content += padLine('Pelanggan', data.customerName, width) + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  
  // Items section
  if (body.showItems && data.items && data.items.length > 0) {
    content += createSeparator('-', width) + COMMANDS.LINE_FEED;
    content += COMMANDS.BOLD_ON + 'ITEM' + COMMANDS.BOLD_OFF + COMMANDS.LINE_FEED;
    content += createSeparator('-', width) + COMMANDS.LINE_FEED;
    content += COMMANDS.LINE_FEED;
    
    data.items.forEach((item, index) => {
      // Item name
      const itemName = `${index + 1}. ${item.name || item.productName}`;
      content += itemName + COMMANDS.LINE_FEED;
      
      // Quantity x Price = Subtotal
      const qty = item.quantity || 1;
      const price = item.price || item.unitPrice || 0;
      const subtotal = qty * price;
      
      const qtyLine = `  ${qty}x ${formatCurrency(price)}`;
      content += padLine(qtyLine, formatCurrency(subtotal), width) + COMMANDS.LINE_FEED;
      
      // Item details (if enabled and available)
      if (body.showItemDetails && item.notes) {
        content += `  Catatan: ${item.notes}` + COMMANDS.LINE_FEED;
      }
      
      content += COMMANDS.LINE_FEED;
    });
  }
  
  // Custom sections from template
  if (body.customSections && body.customSections.length > 0) {
    body.customSections.forEach(section => {
      if (section.content) {
        const parsed = parseVariables(section.content, data);
        content += parsed + COMMANDS.LINE_FEED;
      }
    });
  }
  
  return content;
}

/**
 * Build footer section (totals and payment)
 * @param {object} template - Template configuration
 * @param {object} data - Transaction data
 * @param {number} width - Paper width
 * @returns {string}
 */
function buildFooter(template, data, width = 48) {
  let content = '';
  const body = template.body || {};
  const footer = template.footer || {};
  
  content += createSeparator('-', width) + COMMANDS.LINE_FEED;
  
  // Subtotal
  if (body.showSubtotal && data.subtotal !== undefined) {
    content += padLine('Subtotal', formatCurrency(data.subtotal), width) + COMMANDS.LINE_FEED;
  }
  
  // Discount
  if (body.showDiscount && data.discount) {
    content += padLine('Diskon', `- ${formatCurrency(data.discount)}`, width) + COMMANDS.LINE_FEED;
  }
  
  // Tax
  if (body.showTax && data.tax) {
    content += padLine('Pajak', formatCurrency(data.tax), width) + COMMANDS.LINE_FEED;
  }
  
  // Total
  content += createSeparator('=', width) + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_ON;
  content += padLine('TOTAL', formatCurrency(data.total || 0), width) + COMMANDS.LINE_FEED;
  content += COMMANDS.BOLD_OFF;
  content += createSeparator('=', width) + COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  // Payment info
  if (data.paymentMethod) {
    content += padLine('Metode Bayar', data.paymentMethod, width) + COMMANDS.LINE_FEED;
  }
  if (data.amountPaid !== undefined) {
    content += padLine('Dibayar', formatCurrency(data.amountPaid), width) + COMMANDS.LINE_FEED;
  }
  if (data.change !== undefined && data.change > 0) {
    content += padLine('Kembalian', formatCurrency(data.change), width) + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  
  // Footer text
  content += COMMANDS.ALIGN_CENTER;
  
  if (footer.showThankYou) {
    content += 'Terima kasih atas kunjungan Anda' + COMMANDS.LINE_FEED;
  }
  
  if (footer.customText) {
    const parsed = parseVariables(footer.customText, data);
    content += parsed + COMMANDS.LINE_FEED;
  }
  
  if (footer.showDateTime) {
    content += formatDateTime(new Date()) + COMMANDS.LINE_FEED;
  }
  
  content += COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  content += COMMANDS.LINE_FEED;
  
  return content;
}

/**
 * Parse template and generate receipt content
 * @param {object} template - Receipt template
 * @param {object} data - Transaction/order data
 * @returns {string} ESC/POS formatted receipt content
 */
function parseTemplate(template, data) {
  try {
    const width = template.paperWidth || 48;
    let content = '';
    
    // Initialize printer
    content += COMMANDS.INIT;
    
    // Header section
    content += buildHeader(template, data, width);
    
    // Body section
    content += buildBody(template, data, width);
    
    // Footer section
    content += buildFooter(template, data, width);
    
    // Cut paper
    content += COMMANDS.FEED_AND_CUT;
    
    return content;
    
  } catch (error) {
    logger.logError('Template parsing error', {
      action: 'TEMPLATE_PARSE_ERROR',
      error: error.message,
      templateId: template.id,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get default receipt template
 * @param {string} templateType - Type of receipt (receipt, kitchen, invoice, etc)
 * @returns {object} Default template configuration
 */
function getDefaultTemplate(templateType = 'receipt') {
  return {
    id: 'default',
    name: 'Default Template',
    templateType,
    paperWidth: 48,
    header: {
      showLogo: false,
      showBusinessName: true,
      showBusinessInfo: true,
      customText: null
    },
    body: {
      showItems: true,
      showItemDetails: true,
      showPrices: true,
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
      customSections: []
    },
    footer: {
      showThankYou: true,
      showDateTime: true,
      customText: 'Barang yang sudah dibeli tidak dapat dikembalikan',
      showQRCode: false
    }
  };
}

module.exports = {
  parseTemplate,
  parseVariables,
  getDefaultTemplate,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  padLine,
  createSeparator,
  COMMANDS
};
