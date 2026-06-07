const bcrypt = require("bcrypt");
const { User, Tenant, Role } = require("../../../models");
const { generateToken, generateRefreshToken, verifyToken } = require("../../../utils/jwt");
const logger = require("../../../utils/logger");
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { loginCounter, loggedInUsersGauge } = require("../../../utils/metrics");
const { createError } = require("../../../utils/errorCodes");
const { buildUserPermissions } = require('../../../services/permissionService');

async function register(req, res) {
  try {
    const { tenantDomain, email, password, roleName, isSuperAdmin } = req.body;

    // Handle superadmin registration (no tenant required)
    if (isSuperAdmin) {
      const superAdminRole = await Role.findOne({ where: { name: "admin" } });
      if (!superAdminRole) {
        logger.logAuth("Superadmin registration failed: Admin role not found", {
      action: 'SUPERADMIN_REGISTRATION_FAILED_ADMIN_ROLE_NOT_FOUN',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      request: {
            method: req.method,
            path: req.path,
            ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
            body: { email, isSuperAdmin }
          }
    });
        return res.status(400).json({ message: "Admin role not found" });
      }

      const user = await User.create({
        tenantId: null, // Superadmin has no tenant
        email,
        password, // Model setter will hash this
        roleId: superAdminRole.id,
        isSuperAdmin: true,
      });

      const token = generateToken({
        id: user.id,
        tenantId: null,
        role: superAdminRole.name,
        isSuperAdmin: true,
      });

      logger.logAuth("Superadmin registration successful", {
      action: 'SUPERADMIN_REGISTRATION_SUCCESSFUL',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: { email, role: superAdminRole.name, isSuperAdmin: true },
        request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
        }
    });

      return res.status(201).json({ token });
    }

    // Regular user registration
    const tenant = await Tenant.findOne({ where: { domain: tenantDomain } });
    if (!tenant) {
      logger.logAuth("User registration failed: Tenant not found", {
      action: 'USER_REGISTRATION_FAILED_TENANT_NOT_FOUND',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
          body: { email, tenantDomain }
        }
    });
      return res.status(400).json({ message: "Tenant not found" });
    }

    const role = await Role.findOne({ where: { name: roleName || "user" } });
    if (!role) {
      logger.logAuth("User registration failed: Role not found", {
      action: 'USER_REGISTRATION_FAILED_ROLE_NOT_FOUND',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
          body: { email, roleName }
        }
    });
      return res.status(400).json({ message: "Role not found" });
    }

    const user = await User.create({
      tenantId: tenant.id,
      email,
      password, // Model setter will hash this
      roleId: role.id,
      isSuperAdmin: false,
    });

    const token = generateToken({
      id: user.id,
      tenantId: tenant.id,
      role: role.name,
      isSuperAdmin: false,
    });

    logger.logAuth("User registration successful", {
      action: 'USER_REGISTRATION_SUCCESSFUL',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: { email, role: role.name, tenant: tenant.name },
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    return res.status(201).json({ token });
  } catch (err) {
    logger.logSecurity("Registration error", {
      action: 'REGISTRATION_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { email, tenantDomain, isSuperAdmin: req.body.isSuperAdmin }
      }
    });
    console.error(err);
    return res.status(500).json({ message: "Register failed" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [
        { model: Role, as: "role" },
        { model: Tenant, as: "tenant" },
      ],
    });

    if (!user) {
      // Track failed login attempt
      loginCounter.inc({ status: 'failed', tenant: 'unknown' });
      
      logger.logSecurity("Login failed: User not found", {
      action: 'LOGIN_FAILED_USER_NOT_FOUND',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
          body: { email }
        }
    });
      throw createError('INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Track failed login attempt
      loginCounter.inc({ status: 'failed', tenant: user.tenant?.name || 'unknown' });
      
      logger.logSecurity("Login failed: Invalid password", {
      action: 'LOGIN_FAILED_INVALID_PASSWORD',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: { email },
        request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
        }
    });
      throw createError('INVALID_CREDENTIALS');
    }

    // Check if tenant is active (only for non-super-admin users)
    if (!user.isSuperAdmin && user.tenant) {
      if (!user.tenant.isActive) {
        // Track failed login attempt
        loginCounter.inc({ status: 'failed', tenant: user.tenant.name || 'unknown' });
        
        logger.logSecurity("Login failed: Tenant is not active", {
      action: 'LOGIN_FAILED_TENANT_IS_NOT_ACTIVE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: { email },
          tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
            isActive: user.tenant.isActive
          },
          request: {
            method: req.method,
            path: req.path,
            ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
          }
    });
        throw createError('TENANT_INACTIVE');
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin || false,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // Save refresh token to user
    await user.update({ refreshToken });

    // Track successful login
    loginCounter.inc({ status: 'success', tenant: user.tenant?.name || 'unknown' });
    
    // Update last login time
    await user.update({ lastLogin: new Date() });
    
    // Update logged-in users gauge
    // Note: In a real system, you would need to track active sessions
    // This is a simplified version that just increments the counter
    loggedInUsersGauge.inc({
      tenant: user.tenant?.name || 'unknown',
      role: user.role.name
    });

    logger.logAuth("Login successful", {
      action: 'LOGIN_SUCCESSFUL',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: {
        email,
        role: user.role.name,
        tenant: user.tenant?.name
      },
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    // Build permissions payload (CASL rules, uiFlags, menu, subscription)
    let permissions = null;
    try {
      permissions = await buildUserPermissions(user.id);
    } catch (permErr) {
      logger.error('Failed to build permissions on login', { error: permErr.message, userId: user.id });
    }

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        isSuperAdmin: user.isSuperAdmin || false,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          domain: user.tenant.domain,
        } : null,
      },
      permissions,
    });
  } catch (err) {
    // Track failed login due to error
    loginCounter.inc({ status: 'failed', tenant: 'unknown' });
    
    logger.logSecurity("Login error", {
      action: 'LOGIN_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      code: err.code,
      stack: err.stack,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { email: req.body.email }
      }
    });
    
    // If it's already a standardized error, pass it through
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message
      });
    }
    
    // Otherwise, return generic error
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Terjadi kesalahan saat login',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user by ID from decoded token
    const user = await User.findOne({
      where: { id: decoded.id },
      include: [
        { model: Role, as: "role" },
        { model: Tenant, as: "tenant" },
      ],
    });

    if (!user || user.refreshToken !== refreshToken) {
      logger.logSecurity("Refresh token failed: Invalid token or user not found", {
      action: 'REFRESH_TOKEN_FAILED_INVALID_TOKEN_OR_USER_NOT_FOU',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        }
    });
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin || false,
    });

    logger.logAuth("Token refreshed successfully", {
      action: 'TOKEN_REFRESHED_SUCCESSFULLY',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: {
        email: user.email,
        role: user.role.name,
        tenant: user.tenant?.name
      },
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });

    // Refresh permissions alongside new token
    let permissions = null;
    try {
      permissions = await buildUserPermissions(user.id);
    } catch (permErr) {
      logger.error('Failed to build permissions on token refresh', { error: permErr.message, userId: user.id });
    }

    return res.json({
      token: newToken,
      permissions,
    });
  } catch (err) {
    logger.logSecurity("Refresh token error", {
      action: 'REFRESH_TOKEN_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Find user by refresh token
    const user = await User.findOne({ where: { refreshToken } });
    
    if (user) {
      // Clear refresh token
      await user.update({ refreshToken: null });
      
      logger.logAuth("Logout successful", {
      action: 'LOGOUT_SUCCESSFUL',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: {
          email: user.email,
          role: user.role?.name,
          tenant: user.tenant?.name
        },
        request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
        }
    });
    }

    return res.json({ message: "Logout successful" });
  } catch (err) {
    logger.logSecurity("Logout error", {
      action: 'LOGOUT_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { hasRefreshToken: !!req.body.refreshToken }
      }
    });
    return res.status(500).json({ message: "Logout failed" });
  }
}

module.exports = { register, login, refreshToken, logout };
