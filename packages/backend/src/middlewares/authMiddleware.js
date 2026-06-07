const { verifyToken } = require('../utils/jwt');
const { User, Tenant, Role } = require('../models');
const { createError } = require('../utils/errorCodes');

async function authenticate(req, res, next) {
  try {
    // Skip authentication for OPTIONS preflight requests (CORS)
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw createError('NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw createError('INVALID_TOKEN_FORMAT');
    }

    const decoded = verifyToken(token);

    // load user with tenant + role
    const user = await User.findOne({
      where: { id: decoded.id },
      include: [
        { model: Tenant, as: 'tenant', required: false },
        { model: Role, as: 'role', required: true }
      ]
    });

    if (!user) {
      throw createError('USER_NOT_FOUND');
    }

    // Check if tenant is active (only for non-super-admin users)
    if (!user.isSuperAdmin && user.tenant) {
      if (!user.tenant.isActive) {
        throw createError('TENANT_INACTIVE');
      }
    }

    req.user = user;
    next();
  } catch (err) {
    // Check if the error is due to token expiration
    if (err.name === 'TokenExpiredError') {
      return next(createError('TOKEN_EXPIRED'));
    }
    
    // If already a standardized error, pass it through
    if (err.isOperational) {
      return next(err);
    }
    
    // Otherwise, wrap as unauthorized
    return next(createError('UNAUTHORIZED'));
  }
}

/**
 * Authenticate for SSE connections
 * Supports token from query parameter (for EventSource which can't set headers)
 * Usage: GET /endpoint?token=xxx
 */
async function authenticateSSE(req, res, next) {
  try {
    // Try Authorization header first, then query param
    const authHeader = req.headers['authorization'];
    let token = null;
    
    if (authHeader) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      throw createError('NO_TOKEN');
    }

    const decoded = verifyToken(token);

    // load user with tenant + role
    const user = await User.findOne({
      where: { id: decoded.id },
      include: [
        { model: Tenant, as: 'tenant', required: false },
        { model: Role, as: 'role', required: true }
      ]
    });

    if (!user) {
      throw createError('USER_NOT_FOUND');
    }

    // Check if tenant is active (only for non-super-admin users)
    if (!user.isSuperAdmin && user.tenant) {
      if (!user.tenant.isActive) {
        throw createError('TENANT_INACTIVE');
      }
    }

    req.user = user;
    next();
  } catch (err) {
    // Check if the error is due to token expiration
    if (err.name === 'TokenExpiredError') {
      return next(createError('TOKEN_EXPIRED'));
    }
    
    // If already a standardized error, pass it through
    if (err.isOperational) {
      return next(err);
    }
    
    // Otherwise, wrap as unauthorized
    return next(createError('UNAUTHORIZED'));
  }
}

module.exports = { authenticate, authenticateSSE };
