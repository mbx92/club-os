const { User, Tenant, Role, Subscription, SubscriptionPlan } = require('../../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');

async function getUsers(req, res, next) {
  try {
    const { role } = req.query;

    let queryOptions = {
      attributes: { exclude: ['password'] },
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Role, as: 'role' }
      ],
      where: {},
    };
    
    // If user is not superadmin, only show users from the same tenant
    if (req.user && !req.user.isSuperAdmin) {
      queryOptions.where.tenantId = req.user.tenantId;
    }
    
    // Filter by role name (e.g. ?role=admin, ?role=cashier)
    if (role) {
      queryOptions.include = queryOptions.include.map((inc) => {
        if (inc.as === 'role') {
          return { ...inc, where: { name: role }, required: true };
        }
        return inc;
      });
    }
    
    const users = await User.findAll(queryOptions);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Role, as: 'role' }
      ]
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if user is authorized to access this user
    if (req.user && !req.user.isSuperAdmin && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Forbidden: you can only access users from your own tenant' });
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  // Declare variables outside try block so they're accessible in catch
  let email, password, roleId, tenantId, finalTenantId;
  
  try {
    ({ email, password, roleId, tenantId } = req.body);
    
    // If user is not superadmin, force tenantId to be the same as the user's tenant
    finalTenantId = (req.user && !req.user.isSuperAdmin) ? req.user.tenantId : tenantId;
    
    // Validate subscription requirement
    // Tenant must have active subscription/plan to create users
    // EXCEPT: SuperAdmin can create the first admin user for a tenant without subscription
    if (finalTenantId) {
      const tenant = await Tenant.findByPk(finalTenantId);
      
      if (!tenant) {
        return res.status(404).json({ 
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
      }
      
      // Check if this is SuperAdmin creating an admin user
      const isSuperAdminCreating = req.user && req.user.isSuperAdmin;
      const role = await Role.findByPk(roleId);
      const isCreatingAdmin = role && role.name === 'admin';
      
      // Count existing users for this tenant
      const existingUserCount = await User.count({
        where: { tenantId: finalTenantId }
      });
      
      // If this is the first admin being created by SuperAdmin, skip subscription check
      const isFirstAdminBySuper = isSuperAdminCreating && isCreatingAdmin && existingUserCount === 0;
      
      if (!isFirstAdminBySuper) {
        // Check if tenant is on trial
        let hasAccess = false;
        
        if (tenant.isOnTrial && tenant.trialEndDate) {
          const now = new Date();
          if (now <= tenant.trialEndDate) {
            hasAccess = true; // Trial is active
          }
        }
        
        // Check if tenant has active subscription
        if (!hasAccess) {
          const now = new Date();
          
          const subscription = await Subscription.findOne({
            where: { 
              tenantId: finalTenantId, 
              status: 'active',
              startDate: { [Op.lte]: now },  // Must have started
              endDate: { [Op.gte]: now }     // Must not have expired
            },
            include: [{ model: SubscriptionPlan, as: 'plan' }],
            order: [['endDate', 'DESC']]  // Prioritize longest subscription
          });
          
          if (subscription) {
            const startDate = subscription.startDate ? new Date(subscription.startDate) : null;
            const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
            
            // Log subscription details for debugging
            logger.logInfo('Valid subscription found', {
              action: 'SUBSCRIPTION_CHECK',
              subscriptionId: subscription.id,
              status: subscription.status,
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
              currentDate: now.toISOString(),
              tenantId: finalTenantId
            });
            
            hasAccess = true;
          } else {
            logger.logWarn('No active valid subscription found', {
              action: 'NO_VALID_SUBSCRIPTION_FOUND',
              tenantId: finalTenantId,
              currentDate: now.toISOString()
            });
          }
        }
        
        // If no access, deny user creation
        if (!hasAccess) {
          logger.logSecurity("User creation denied - no active subscription", {
            action: 'USER_CREATION_DENIED_NO_ACTIVE_SUBSCRIPTION',
            userId: req.user?.id,
            tenantId: finalTenantId,
            user: req.user,
            request: {
              method: req.method,
              path: req.path,
              ip: getClientIp(req),
              userAgent: getUserAgent(req),
              body: { email, roleId, tenantId: finalTenantId }
            }
          });
          
          return res.status(403).json({ 
            success: false,
            message: 'Access denied. Tenant must have an active subscription or trial to create users.',
            code: 'NO_ACTIVE_SUBSCRIPTION',
            details: 'Please activate a subscription plan to add more users to your organization.',
            debug: process.env.NODE_ENV === 'development' ? {
              tenantId: finalTenantId,
              isOnTrial: tenant.isOnTrial,
              trialEndDate: tenant.trialEndDate,
              hint: 'Check subscription status and date range in logs above'
            } : undefined
          });
        }
      }
    }
    
    const user = await User.create({
      email,
      password, // Model setter will hash this
      roleId,
      tenantId: finalTenantId,
      firstName: req.body.firstName || null,
      lastName: req.body.lastName || null,
      phone: req.body.phone || null,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      deviceEmployeeNo: req.body.deviceEmployeeNo || null,
    });
    
    logger.logAudit("User created successfully", {
      action: 'USER_CREATED_SUCCESSFULLY',
      userId: req.user?.id,
      user: req.user,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
        body: { email, roleId, tenantId: finalTenantId }
      },
      response: {
        statusCode: 201
      }
    });
    
    const plainUser = user.get({ plain: true });
    delete plainUser.password;
    res.status(201).json(plainUser);
  } catch (err) {
    logger.logSecurity("User creation failed", {
      action: 'USER_CREATION_FAILED',
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
        body: { email, roleId, tenantId }
      }
    });
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { email, password, roleId, firstName, lastName, phone, isActive, deviceEmployeeNo } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user is authorized to update this user
    if (req.user && !req.user.isSuperAdmin && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Forbidden: you can only update users from your own tenant' });
    }

    if (email !== undefined) user.email = email;
    if (password) user.password = password; // Model setter will hash this
    if (roleId !== undefined) user.roleId = roleId;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (deviceEmployeeNo !== undefined) user.deviceEmployeeNo = deviceEmployeeNo;

    await user.save();
    
    logger.logAudit("User updated successfully", {
      action: 'USER_UPDATED_SUCCESSFULLY',
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
        body: { email, roleId, firstName, lastName, phone, isActive, deviceEmployeeNo }
      },
      response: {
        statusCode: 200
      }
    });
    
    const plainUser = user.get({ plain: true });
    delete plainUser.password;
    res.json(plainUser);
  } catch (err) {
    logger.logSecurity("User update failed", {
      action: 'USER_UPDATE_FAILED',
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
        body: { email, roleId }
      }
    });
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user is authorized to delete this user
    if (req.user && !req.user.isSuperAdmin && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Forbidden: you can only delete users from your own tenant' });
    }

    await user.destroy();
    
    logger.logAudit("User deleted successfully", {
      action: 'USER_DELETED_SUCCESSFULLY',
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
    
    res.json({ message: 'User deleted' });
  } catch (err) {
    logger.logSecurity("User deletion failed", {
      action: 'USER_DELETION_FAILED',
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

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
