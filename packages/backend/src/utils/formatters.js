/**
 * Formatting utilities for currency, numbers, dates, etc.
 * Supports tenant-specific settings (currency, locale)
 */

/**
 * Format amount as currency based on tenant settings
 * @param {number} amount - Amount to format
 * @param {object} tenant - Tenant object with settings
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, tenant) {
  const currency = tenant?.settings?.currency || 'IDR';
  const locale = tenant?.settings?.locale || 'id-ID';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format number with thousand separators
 * @param {number} number - Number to format
 * @param {object} tenant - Tenant object with settings
 * @returns {string} Formatted number string
 */
function formatNumber(number, tenant) {
  const locale = tenant?.settings?.locale || 'id-ID';
  
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, decimals = 2) {
  return `${parseFloat(value).toFixed(decimals)}%`;
}

/**
 * Format date based on tenant locale
 * @param {Date|string} date - Date to format
 * @param {object} tenant - Tenant object with settings
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDate(date, tenant, options = {}) {
  const locale = tenant?.settings?.locale || 'id-ID';
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
}

/**
 * Format date and time based on tenant locale
 * @param {Date|string} date - Date to format
 * @param {object} tenant - Tenant object with settings
 * @returns {string} Formatted date and time string
 */
function formatDateTime(date, tenant) {
  const locale = tenant?.settings?.locale || 'id-ID';
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

module.exports = {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime
};
