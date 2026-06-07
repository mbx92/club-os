const { Subscription, SubscriptionPlan, Tenant } = require('../models');
const logger = require('../utils/logger');
const { getClientIp } = require('../utils/requestHelper');

/**
 * Middleware to check if tenant has an active subscription
 * 
 * Updated to support new feature-gating system:
 * - Attaches subscription features to req.subscriptionFeatures
 * - Compatible with featureGateMiddleware
 */
async function checkSubscription(req, res, next) {
  try {
    // Get tenantId from authenticated user
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      return res.status(403).json({ 
        message: 'Access denied. Tenant not found.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    // Get tenant
    const tenant = await Tenant.findByPk(tenantId);
    
    if (!tenant) {
      return res.status(403).json({ 
        message: 'Access denied. Tenant not found.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    // Check if tenant is on trial
    if (tenant.isOnTrial && tenant.trialEndDate) {
      const now = new Date();
      if (now <= tenant.trialEndDate) {
        // Trial is still active, allow access with all features
        req.tenant = tenant;
        req.isInTrial = true;
        req.subscriptionFeatures = {}; // Empty = all features allowed in trial
        return next();
      }
    }
    
    // Get active subscription with plan (get the most recent one)
    const subscription = await Subscription.findOne({
      where: { tenantId, status: 'active' },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['startDate', 'DESC']] // Get the newest subscription first
    });
    
    if (!subscription) {
      return res.status(403).json({ 
        message: 'Access denied. No active subscription.',
        code: 'NO_SUBSCRIPTION'
      });
    }
    
    const now = new Date();
    
    // Check subscription dates
    if (now < subscription.startDate || now > subscription.endDate) {
      return res.status(403).json({ 
        message: 'Access denied. Subscription expired or inactive.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }
    
    // Attach tenant, subscription, and features to request
    req.tenant = tenant;
    req.subscription = subscription;
    req.subscriptionFeatures = subscription.plan.features || {};
    
    next();
  } catch (err) {
    logger.logSecurity('Subscription check error', {
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });
    
    return res.status(500).json({ 
      message: 'Internal server error',
      code: 'SUBSCRIPTION_CHECK_ERROR'
    });
  }
}

/**
 * Middleware to check subscription plan features
 * 
 * @deprecated Use featureGateMiddleware.requireFeature() instead
 * Kept for backward compatibility
 */
function checkPlanFeature(featureName) {
  console.warn('checkPlanFeature is deprecated, use featureGateMiddleware.requireFeature instead');
  
  return (req, res, next) => {
    try {
      if (!req.subscription || !req.subscription.plan) {
        return res.status(403).json({ 
          message: 'Access denied. No subscription plan found.',
          code: 'NO_PLAN'
        });
      }
      
      const plan = req.subscription.plan;
      const features = plan.features || {};
      
      if (!features[featureName]) {
        return res.status(403).json({ 
          message: `Access denied. Your plan does not include ${featureName}.`,
          code: 'FEATURE_NOT_INCLUDED'
        });
      }
      
      next();
    } catch (err) {
      logger.logSecurity('Feature check error', {
        error: err.message,
        featureName,
        request: {
          method: req.method,
          path: req.path,
          ip: getClientIp(req)
        }
      });
      
      return res.status(500).json({ 
        message: 'Internal server error',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware to check user limit in subscription
 * 
 * @deprecated Use featureGateMiddleware.enforceLimit('maxUsers', ...) instead
 * Kept for backward compatibility
 */
async function checkUserLimit(req, res, next) {
  console.warn('checkUserLimit is deprecated, use featureGateMiddleware.enforceLimit instead');
  
  try {
    if (!req.subscription || !req.subscription.plan) {
      return res.status(403).json({ 
        message: 'Access denied. No subscription plan found.',
        code: 'NO_PLAN'
      });
    }
    
    const plan = req.subscription.plan;
    const tenantId = req.tenant.id;
    
    // Check new features structure first
    const features = plan.features || {};
    const maxUsers = features.limits?.maxUsers;
    
    // If unlimited (0 or undefined), skip check
    if (!maxUsers || maxUsers === 0) {
      return next();
    }
    
    // Count current users for this tenant
    const { User } = require('../models');
    const userCount = await User.count({
      where: { tenantId, isActive: true }
    });
    
    if (userCount >= maxUsers) {
      return res.status(403).json({ 
        message: `Access denied. You have reached the maximum number of users (${maxUsers}) for your plan.`,
        code: 'USER_LIMIT_EXCEEDED'
      });
    }
    
    next();
  } catch (err) {
    logger.logSecurity('User limit check error', {
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });
    
    return res.status(500).json({ 
      message: 'Internal server error',
      code: 'USER_LIMIT_CHECK_ERROR'
    });
  }
}

/**
 * Middleware to check member limit in subscription
 * 
 * @deprecated Use featureGateMiddleware.enforceLimit('maxMembers', ...) instead
 * Kept for backward compatibility
 */
async function checkMemberLimit(req, res, next) {
  console.warn('checkMemberLimit is deprecated, use featureGateMiddleware.enforceLimit instead');
  
  try {
    if (!req.subscription || !req.subscription.plan) {
      return res.status(403).json({ 
        message: 'Access denied. No subscription plan found.',
        code: 'NO_PLAN'
      });
    }
    
    const plan = req.subscription.plan;
    const tenantId = req.tenant.id;
    
    // Check new features structure first
    const features = plan.features || {};
    const maxMembers = features.limits?.maxMembers;
    
    // If unlimited (0 or undefined), skip check
    if (!maxMembers || maxMembers === 0) {
      return next();
    }
    
    // Count current members for this tenant
    const { Member } = require('../models');
    const memberCount = await Member.count({
      where: { tenantId }
    });
    
    if (memberCount >= maxMembers) {
      return res.status(403).json({ 
        message: `Access denied. You have reached the maximum number of members (${maxMembers}) for your plan.`,
        code: 'MEMBER_LIMIT_EXCEEDED'
      });
    }
    
    next();
  } catch (err) {
    logger.logSecurity('Member limit check error', {
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });
    
    return res.status(500).json({ 
      message: 'Internal server error',
      code: 'MEMBER_LIMIT_CHECK_ERROR'
    });
  }
}

module.exports = {
  checkSubscription,
  checkPlanFeature,
  checkUserLimit,
  checkMemberLimit
};