'use strict';

/**
 * Access Token Service
 * 
 * Manages access tokens for psychology test candidates.
 * Generates QR codes and validates token-based access.
 */

const crypto = require('crypto');

/**
 * Generate access token
 * Format: XXXX-XXXX-XXXX (12 chars, easy to type)
 */
function generateAccessToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let token = '';
  
  for (let i = 0; i < 12; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  
  // Format: XXXX-XXXX-XXXX
  return `${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
}

/**
 * Generate QR code data URL
 * Uses simple base64 encoding for QR content
 * Frontend will use a QR library to render
 */
function generateQRData(accessUrl) {
  // Return the URL that will be encoded in QR
  // Frontend uses qrcode library to generate actual QR image
  return {
    url: accessUrl,
    content: accessUrl
  };
}

/**
 * Generate complete access credentials for an order
 */
function generateAccessCredentials(orderId, tenantSlug, expiresInHours = 72) {
  const token = generateAccessToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  // Public access URL (frontend route)
  const accessUrl = `/psikotes/${tenantSlug}/access/${token}`;
  
  return {
    token,
    expiresAt,
    accessUrl,
    qrData: generateQRData(accessUrl)
  };
}

/**
 * Validate access token format
 */
function validateTokenFormat(token) {
  // Format: XXXX-XXXX-XXXX
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(token);
}

/**
 * Normalize token (remove dashes, uppercase)
 */
function normalizeToken(token) {
  return token
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Format token for display
 */
function formatToken(token) {
  const normalized = normalizeToken(token);
  if (normalized.length !== 12) return token;
  
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

/**
 * Calculate remaining time for token
 */
function getRemainingTime(expiresAt) {
  if (!expiresAt) return null;
  
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;
  
  if (diff <= 0) return { expired: true, remaining: 0 };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    remaining: diff,
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`
  };
}

/**
 * Extend token expiration
 */
function extendExpiration(currentExpiresAt, additionalHours = 24) {
  const base = currentExpiresAt ? new Date(currentExpiresAt) : new Date();
  const newExpires = new Date(base);
  newExpires.setHours(newExpires.getHours() + additionalHours);
  return newExpires;
}

module.exports = {
  generateAccessToken,
  generateQRData,
  generateAccessCredentials,
  validateTokenFormat,
  normalizeToken,
  formatToken,
  isTokenExpired,
  getRemainingTime,
  extendExpiration
};
