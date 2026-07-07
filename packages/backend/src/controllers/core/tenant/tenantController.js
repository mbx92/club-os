const { Tenant, User, Role } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { sequelize } = require('../../../models');
const { getAdminPassword } = require('../../../utils/passwordGenerator');
const { isTenantAdmin } = require('../../../utils/rbacUtils');

function assertSameTenant(req, tenantId) {
  if (!req.user?.isSuperAdmin && req.user?.tenantId !== tenantId) {
    return 'Forbidden: you can only access your own tenant data';
  }
  return null;
}

async function getTenants(req, res, next) {
  try {
    // Query params: page, limit, isActive, search, sortBy, order
    const { page = 1, limit = 10, isActive, search, sortBy, order = 'DESC' } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    
    // Non-superadmin can only see their own tenant
    if (req.user && !req.user.isSuperAdmin) {
      where.id = req.user.tenantId;
    }
    
    if (typeof isActive !== 'undefined') {
      // Accept 'true'/'false' strings as well as 1/0
      if (typeof isActive === 'string') {
        where.isActive = isActive.toLowerCase() === 'true' || isActive === '1';
      } else {
        where.isActive = !!isActive;
      }
    }

    if (search) {
      // Search by name or domain (case-insensitive)
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { domain: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Build order clause
    let orderClause = [['isActive', 'DESC'], ['name', 'ASC']];
    if (sortBy) {
      // Defensive: allow only certain columns to sort by to avoid SQL injection
      const allowed = ['name', 'createdAt', 'domain', 'isActive'];
      if (allowed.includes(sortBy)) {
        const dir = (order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        orderClause = [[sortBy, dir]];
      }
    }

    // Get total separately (keeps count correct even when using subqueries)
    const total = await Tenant.count({ where });

    // Return tenants with user count only (no user data)
    const tenants = await Tenant.findAll({
      where,
      attributes: {
        include: [
          [
            // Subquery to count users per tenant
            sequelize.literal(`(SELECT COUNT(*) FROM "Users" WHERE "Users"."tenantId" = "Tenant"."id")`),
            'userCount'
          ]
        ]
      },
      order: orderClause,
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      data: tenants,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getTenant(req, res, next) {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Attach user count (do not include user data)
    const userCount = await User.count({ where: { tenantId: tenant.id } });
    // Add virtual field so response contains userCount
    tenant.dataValues.userCount = userCount;
    
    
    // Any authenticated member of the tenant may read their own tenant record.
    // Fine-grained write access is enforced on PUT/PATCH/DELETE routes.
    const tenantAccessError = assertSameTenant(req, req.params.id);
    if (tenantAccessError) {
      return res.status(403).json({ message: tenantAccessError });
    }
    
    res.json(tenant);
  } catch (err) {
    next(err);
  }
}

async function createTenant(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      name, 
      domain, 
      address, 
      phone, 
      email, 
      logo, 
      settings, 
      isActive, 
      isOnTrial, 
      trialEndDate 
    } = req.body;
    
    // Validate domain is provided
    if (!domain) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({ message: 'Domain is required for tenant creation' });
    }
    
    const tenantData = { 
      name, 
      domain,
      ...(address && { address }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(logo && { logo }),
      ...(settings && { settings }),
      ...(typeof isActive !== 'undefined' && { isActive })
    };
    
    // Only super admin can set trial fields
    if (req.user && req.user.isSuperAdmin) {
      if (typeof isOnTrial !== 'undefined') {
        tenantData.isOnTrial = typeof isOnTrial === 'string' 
          ? isOnTrial.toLowerCase() === 'true' 
          : !!isOnTrial;
      }
      if (trialEndDate) {
        tenantData.trialEndDate = new Date(trialEndDate);
      }
    }
    
    // Create tenant
    const tenant = await Tenant.create(tenantData, { transaction });
    
    // Find admin role
    const adminRole = await Role.findOne({ 
      where: { name: 'admin' },
      transaction 
    });
    
    if (!adminRole) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(500).json({ message: 'Admin role not found in the system' });
    }
    
    // Auto-generate admin account for the tenant
    const adminEmail = `admin@${domain}`;
    const adminPassword = getAdminPassword();
    
    const adminUser = await User.create({
      email: adminEmail,
      password: adminPassword, // Will be hashed by the User model setter
      firstName: 'Admin',
      lastName: name,
      tenantId: tenant.id,
      roleId: adminRole.id,
      isActive: true,
      isSuperAdmin: false,
    }, { transaction });
    
    await transaction.commit();
    
    logger.logAudit("Tenant created successfully with auto-generated admin account", {
      action: 'TENANT_CREATED_SUCCESSFULLY_WITH_AUTOGENERATED_ADM',
      userId: req.user?.id,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { name, domain, isOnTrial, trialEndDate }
      },
      response: {
        statusCode: 201,
        tenantId: tenant.id,
        adminEmail: adminEmail
      }
    });
    
    res.status(201).json({
      tenant,
      admin: {
        email: adminEmail,
        password: adminPassword, // Return password in response for SuperAdmin to share with tenant
        message: process.env.ENABLE_AUTO_PASSWORD_GENERATE === 'true' 
          ? 'Admin account created with auto-generated password. Please share credentials securely.' 
          : 'Admin account created with default password. User should change password after first login.'
      }
    });
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity("Tenant creation failed", {
      action: 'TENANT_CREATION_FAILED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        body: { name: req.body?.name, domain: req.body?.domain }
      }
    });
    next(err);
  }
}

async function updateTenant(req, res, next) {
  try {
    const { name, domain, isActive, phone, email, address, logo, currency, timezone, isOnTrial, trialEndDate, settings } = req.body;
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Check if user is authorized to update this tenant
    if (req.user && !req.user.isSuperAdmin) {
      const tenantAccessError = assertSameTenant(req, tenant.id);
      if (tenantAccessError) {
        return res.status(403).json({ message: tenantAccessError.replace('access', 'update') });
      }
      if (!isTenantAdmin(req.user)) {
        return res.status(403).json({ message: 'Forbidden: only tenant admins can update tenant data' });
      }
    }

    // Update basic fields
    if (name) tenant.name = name;
    if (domain) tenant.domain = domain;
    if (phone) tenant.phone = phone;
    if (email) tenant.email = email;
    if (address) tenant.address = address;
    if (logo) tenant.logo = logo;
    
    // Only update isActive when explicitly provided in the request body
    if (typeof isActive !== 'undefined') {
      // Coerce string 'true'/'false' to boolean when necessary
      if (typeof isActive === 'string') {
        tenant.isActive = isActive.toLowerCase() === 'true';
      } else {
        tenant.isActive = !!isActive;
      }
    }
    
    // Update trial fields
    // Super admin can set these freely
    // Regular admin can only set for their own tenant
    if (typeof isOnTrial !== 'undefined') {
      if (req.user.isSuperAdmin || req.user.tenantId === tenant.id) {
        tenant.isOnTrial = typeof isOnTrial === 'string' 
          ? isOnTrial.toLowerCase() === 'true' 
          : !!isOnTrial;
      }
    }
    if (trialEndDate) {
      if (req.user.isSuperAdmin || req.user.tenantId === tenant.id) {
        tenant.trialEndDate = new Date(trialEndDate);
      }
    }
    
    // Update settings - merge with existing or replace completely
    if (settings && typeof settings === 'object') {
      // If settings object is provided, merge it with existing settings
      const currentSettings = tenant.settings || {};
      tenant.settings = {
        ...currentSettings,
        ...settings
      };
    } else if (currency || timezone) {
      // Legacy support: update individual settings fields
      const currentSettings = tenant.settings || {};
      tenant.settings = {
        ...currentSettings,
        ...(currency && { currency }),
        ...(timezone && { timezone })
      };
    }
    
    await tenant.save();
    
    logger.logAudit("Tenant updated successfully", {
      action: 'TENANT_UPDATED_SUCCESSFULLY',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { name, domain, isActive, phone, email, address, logo, currency, timezone, isOnTrial, trialEndDate, settings }
      },
      response: {
        statusCode: 200
      }
    });

    res.json(tenant);
  } catch (err) {
    logger.logSecurity("Tenant update failed", {
      action: 'TENANT_UPDATE_FAILED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { name, domain }
      }
    });
    next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Check if user is authorized to delete this tenant
    // Only superadmin and users with admin role can delete tenant data
    if (req.user && !req.user.isSuperAdmin) {
      const tenantAccessError = assertSameTenant(req, tenant.id);
      if (tenantAccessError) {
        return res.status(403).json({ message: tenantAccessError.replace('access', 'delete') });
      }
      if (!isTenantAdmin(req.user)) {
        return res.status(403).json({ message: 'Forbidden: only tenant admins can delete tenant data' });
      }
    }

    await tenant.destroy();
    
    logger.logAudit("Tenant deleted successfully", {
      action: 'TENANT_DELETED_SUCCESSFULLY',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      },
      response: {
        statusCode: 200
      }
    });
    
    res.json({ message: 'Tenant deleted' });
  } catch (err) {
    logger.logSecurity("Tenant deletion failed", {
      action: 'TENANT_DELETION_FAILED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
      }
    });
    next(err);
  }
}

async function updateTenantSettings(req, res, next) {
  try {
    // Extract tenantId from body (for super admin)
    const { tenantId, ...settingsData } = req.body;
    
    // Determine which tenant to update
    let targetTenantId;
    
    if (req.user.isSuperAdmin) {
      // Super Admin can update any tenant's settings
      // If tenantId provided in body, use that; otherwise error
      if (!tenantId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Super Admin must provide tenantId in request body' 
        });
      }
      targetTenantId = tenantId;
    } else {
      // Regular users can only update their own tenant
      if (!req.user.tenantId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized: No tenant associated with user' 
        });
      }
      
      // Check if user is authorized to update settings
      // Only admin or owner can update tenant settings
      if (!isTenantAdmin(req.user)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: only tenant admins can update tenant settings' 
        });
      }
      
      targetTenantId = req.user.tenantId;
    }

    const tenant = await Tenant.findByPk(targetTenantId);
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    // Merge all settings from request body into existing settings
    // This allows frontend to send any structure (theme, transaction, workingHours, etc.)
    // and preserves other settings that are not being updated
    const currentSettings = tenant.settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...settingsData
    };

    tenant.settings = updatedSettings;
    
    // Mark settings as changed to ensure Sequelize saves the JSONB field
    tenant.changed('settings', true);
    
    await tenant.save();
    
    logger.logAudit('Tenant settings updated successfully', {
      action: 'TENANT_SETTINGS_UPDATED_SUCCESSFULLY',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      user: req.user,
      tenant: { id: targetTenantId, name: tenant.name },
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: settingsData
      },
      response: {
        statusCode: 200
      }
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          settings: tenant.settings
        }
      }
    });
  } catch (err) {
    logger.logSecurity('Tenant settings update failed', {
      action: 'TENANT_SETTINGS_UPDATE_FAILED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: req.body
      }
    });
    next(err);
  }
}

module.exports = { getTenants, getTenant, createTenant, updateTenant, deleteTenant, updateTenantSettings };
