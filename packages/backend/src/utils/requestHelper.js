/**
 * Request Helper Utilities
 * Provides reliable methods to extract client information from requests
 */

/**
 * Get client IP address from request
 * Checks multiple sources in order of reliability:
 * 1. X-Client-IP header (custom header from frontend SSR)
 * 2. CF-Connecting-IP header (from Cloudflare)
 * 3. X-Forwarded-For header (from proxy/load balancer)
 * 4. X-Real-IP header (from nginx)
 * 5. req.ip (Express with trust proxy enabled)
 * 6. req.connection.remoteAddress
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  // Check CF-Connecting-IP first (Cloudflare - most reliable)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return cfIp;
  }

  // Check True-Client-IP (Cloudflare Enterprise)
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp) {
    return trueClientIp;
  }

  // Check X-Client-IP (custom header from frontend)
  const clientIp = req.headers['x-client-ip'];
  if (clientIp) {
    return clientIp;
  }

  // Check X-Forwarded-For header (most common behind proxy)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // The first one is the original client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Filter out private/internal IPs if possible
    const publicIp = ips.find(ip => !isPrivateIp(ip));
    return publicIp || ips[0];
  }
  
  // Check X-Real-IP header (used by nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Express req.ip (requires trust proxy setting)
  if (req.ip) {
    // Remove ::ffff: prefix for IPv4-mapped IPv6 addresses
    return req.ip.replace(/^::ffff:/, '');
  }
  
  // Direct connection (no proxy)
  const directIp = req.connection?.remoteAddress || 
                   req.socket?.remoteAddress || 
                   req.connection?.socket?.remoteAddress;
  
  if (directIp) {
    // Remove ::ffff: prefix for IPv4-mapped IPv6 addresses
    return directIp.replace(/^::ffff:/, '');
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Check if IP is private/internal
 * @param {string} ip - IP address to check
 * @returns {boolean} true if private IP
 */
function isPrivateIp(ip) {
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // Check common private IP ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^fc00:/i,                  // IPv6 unique local
    /^fe80:/i,                  // IPv6 link-local
    /^::1$/                     // IPv6 localhost
  ];
  
  return privateRanges.some(range => range.test(cleanIp));
}

/**
 * Get user agent from request
 * 
 * @param {Object} req - Express request object
 * @returns {string} User agent string
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Get client information bundle
 * 
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
function getClientInfo(req) {
  return {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      host: req.headers.host,
      referer: req.headers.referer,
      origin: req.headers.origin
    }
  };
}

/**
 * Check if IP is localhost/private
 * 
 * @param {string} ip - IP address
 * @returns {boolean} True if localhost or private IP
 */
function isLocalhost(ip) {
  if (!ip || ip === 'unknown') return false;
  
  // IPv4 localhost
  if (ip === '127.0.0.1' || ip === 'localhost') return true;
  
  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  
  // Private IP ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (loopback)
    /^169\.254\./               // 169.254.0.0/16 (link-local)
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Sanitize IP for logging (remove sensitive info)
 * 
 * @param {string} ip - IP address
 * @param {boolean} maskPrivate - Whether to mask private IPs
 * @returns {string} Sanitized IP
 */
function sanitizeIp(ip, maskPrivate = false) {
  if (!ip || ip === 'unknown') return ip;
  
  // Optionally mask private IPs
  if (maskPrivate && isLocalhost(ip)) {
    return 'local';
  }
  
  // For public IPs, optionally mask last octet for privacy
  // e.g., 203.0.113.45 -> 203.0.113.xxx
  // Uncomment if needed:
  // return ip.replace(/\.\d+$/, '.xxx');
  
  return ip;
}

/**
 * Create complete logger metadata from request
 * This ensures all fields are populated for database logging
 * 
 * @param {Object} req - Express request object
 * @param {Object} additionalMeta - Additional metadata to include
 * @returns {Object} Complete metadata object
 */
function createLogMeta(req, additionalMeta = {}) {
  return {
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    method: req.method,
    path: req.path || req.originalUrl,
    ...additionalMeta
  };
}

module.exports = {
  getClientIp,
  getUserAgent,
  getClientInfo,
  isLocalhost,
  sanitizeIp,
  createLogMeta
};
