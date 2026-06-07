/**
 * Feature Gate Middleware
 * 
 * Middleware untuk validasi akses fitur berdasarkan subscription plan tenant.
 * Mendukung:
 * - Module access validation (pos, restaurant, classes, dll)
 * - Feature flag validation (combinedBilling, creditCard, dll)
 * - Limit enforcement (maxUsers, maxMembers, dll)
 * - Trial mode override (semua features accessible during trial)
 * 
 * @module middlewares/featureGateMiddleware
 */

const { Subscription, SubscriptionPlan, Tenant } = require('../models');
const { createError } = require('../utils/errorCodes');
const { 
  validateSettingsForPlan, 
  filterSettingsForPlan,
  getAllowedSettingsForPlan 
} = require('../utils/featureRegistry');

/**
 * Middleware untuk validasi akses module
 * 
 * @param {string} moduleName - Nama module yang perlu dicek (e.g., 'pos', 'restaurant')
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.use(requireModule('pos'));
 * router.get('/products', posController.getAllProducts);
 */
const requireModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      // Guard: requireModule must run after authenticate
      if (!req.user) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // Super admin bypasses all module checks
      if (req.user.isSuperAdmin) {
        req.subscriptionFeatures = {}; // Empty = all modules allowed
        return next();
      }
      
      const tenantId = req.user.tenantId;
      
      if (!tenantId) {
        throw createError('TENANT_ID_REQUIRED');
      }
      
      // Check if tenant has active subscription
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      // Check trial period
      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant?.isOnTrial && tenant.trialEndDate && new Date() < new Date(tenant.trialEndDate);

      if (!subscription && !isInTrial) {
        throw createError('SUBSCRIPTION_REQUIRED');
      }

      // Cache tenant on request so controllers don't need to re-query
      req.tenant = tenant;

      // Trial mode: allow all features
      if (isInTrial) {
        req.isInTrial = true;
        req.subscriptionFeatures = {}; // Empty features = all allowed in trial
        return next();
      }

      // Check if module is enabled in plan
      const features = subscription.plan.features || {};
      const moduleAccess = features.modules?.[moduleName];

      if (!moduleAccess) {
        throw createError('MODULE_NOT_AVAILABLE', null, {
          requiredModule: moduleName,
          currentPlan: subscription.plan.name
        });
      }

      // Store features in request for later use
      req.subscriptionFeatures = features;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware untuk validasi feature spesifik
 * 
 * @param {string} category - Kategori feature (e.g., 'transactions', 'payments')
 * @param {string} featureName - Nama feature (e.g., 'combinedBilling', 'creditCard')
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/transactions/combined',
 *   requireFeature('transactions', 'combinedBilling'),
 *   transactionController.createCombinedTransaction
 * );
 */
const requireFeature = (category, featureName) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all feature gates
      if (req.user.isSuperAdmin) {
        req.subscriptionFeatures = {}; // Empty = all features allowed
        return next();
      }
      
      const tenantId = req.user.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }
      
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant?.isTrialActive && new Date() < new Date(tenant.trialEndsAt);

      if (!subscription && !isInTrial) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Cache tenant on request so controllers don't need to re-query
      req.tenant = tenant;

      // Trial mode: allow all features
      if (isInTrial) {
        req.isInTrial = true;
        req.subscriptionFeatures = {};
        return next();
      }

      const features = subscription.plan.features || {};
      const featureEnabled = features[category]?.[featureName];

      if (!featureEnabled) {
        return res.status(403).json({
          success: false,
          message: `Feature '${featureName}' not available in your plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: `${category}.${featureName}`,
          currentPlan: subscription.plan.name
        });
      }

      req.subscriptionFeatures = features;
      next();
    } catch (error) {
      console.error('Feature gate error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating subscription features'
      });
    }
  };
};

/**
 * Middleware untuk enforce limit
 * 
 * @param {string} limitName - Nama limit yang perlu dicek (e.g., 'maxUsers', 'maxMembers')
 * @param {Function} getCurrentCount - Async function yang return current count
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/users',
 *   enforceLimit('maxUsers', async (tenantId) => {
 *     return await User.count({ where: { tenantId } });
 *   }),
 *   userController.createUser
 * );
 */
const enforceLimit = (limitName, getCurrentCount) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all limits
      if (req.user.isSuperAdmin) {
        req.subscriptionFeatures = {}; // Empty = no limits
        return next();
      }
      
      const tenantId = req.user.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }
      
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant?.isTrialActive && new Date() < new Date(tenant.trialEndsAt);

      if (!subscription && !isInTrial) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Trial mode: no limits
      if (isInTrial) {
        req.isInTrial = true;
        req.subscriptionFeatures = {};
        return next();
      }

      const features = subscription.plan.features || {};
      const limit = features.limits?.[limitName];

      // 0 or undefined = unlimited
      if (!limit || limit === 0) {
        req.subscriptionFeatures = features;
        return next();
      }

      // Get current count
      const currentCount = await getCurrentCount(tenantId);

      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `${limitName} limit reached`,
          code: 'LIMIT_REACHED',
          limit: limit,
          current: currentCount,
          currentPlan: subscription.plan.name
        });
      }

      req.subscriptionFeatures = features;
      next();
    } catch (error) {
      console.error('Limit enforcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Error enforcing subscription limits'
      });
    }
  };
};

/**
 * Helper function untuk get features dari request
 * Digunakan di controller untuk conditional logic
 * 
 * @param {Object} req - Express request object
 * @returns {Object} Subscription features object
 * 
 * @example
 * const features = getSubscriptionFeatures(req);
 * if (features.transactions?.vouchers) {
 *   // Apply voucher logic
 * }
 */
const getSubscriptionFeatures = (req) => {
  return req.subscriptionFeatures || {};
};

/**
 * Helper function untuk check feature di controller
 * 
 * @param {Object} req - Express request object
 * @param {string} category - Feature category
 * @param {string} featureName - Feature name
 * @returns {boolean} True if feature is enabled
 * 
 * @example
 * if (hasFeature(req, 'payments', 'creditCard')) {
 *   // Process credit card payment
 * }
 */
const hasFeature = (req, category, featureName) => {
  // Super admin: all features enabled
  if (req.user?.isSuperAdmin) {
    return true;
  }
  
  // Trial mode: all features enabled
  if (req.isInTrial) {
    return true;
  }
  
  const features = req.subscriptionFeatures || {};
  return features[category]?.[featureName] === true;
};

/**
 * Helper function untuk check module di controller
 * 
 * @param {Object} req - Express request object
 * @param {string} moduleName - Module name
 * @returns {boolean} True if module is enabled
 * 
 * @example
 * if (hasModule(req, 'restaurant')) {
 *   // Include restaurant items in response
 * }
 */
const hasModule = (req, moduleName) => {
  // Super admin: all modules enabled
  if (req.user?.isSuperAdmin) {
    return true;
  }
  
  // Trial mode: all modules enabled
  if (req.isInTrial) {
    return true;
  }
  
  const features = req.subscriptionFeatures || {};
  return features.modules?.[moduleName] === true;
};

/**
 * Helper function untuk get specific limit value
 * 
 * @param {Object} req - Express request object
 * @param {string} limitName - Limit name
 * @returns {number} Limit value (0 = unlimited)
 * 
 * @example
 * const maxUsers = getLimit(req, 'maxUsers');
 * console.log(`You can create ${maxUsers} users`);
 */
const getLimit = (req, limitName) => {
  // Super admin: unlimited
  if (req.user?.isSuperAdmin) {
    return 0;
  }
  
  // Trial mode: unlimited
  if (req.isInTrial) {
    return 0;
  }
  
  const features = req.subscriptionFeatures || {};
  return features.limits?.[limitName] || 0;
};

/**
 * Middleware untuk validate settings update berdasarkan subscription plan
 * Blocks settings keys that are not available in tenant's plan
 * 
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.put('/tenants/:id/settings',
 *   validateSettingsAccess(),
 *   tenantController.updateSettings
 * );
 */
const validateSettingsAccess = () => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all settings restrictions
      if (req.user?.isSuperAdmin) {
        return next();
      }

      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        throw createError('TENANT_ID_REQUIRED');
      }

      // Get tenant's subscription
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      // Check trial
      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant?.isOnTrial && tenant.trialEndDate && new Date() < new Date(tenant.trialEndDate);

      if (!subscription && !isInTrial) {
        throw createError('SUBSCRIPTION_REQUIRED');
      }

      // Trial mode: allow all settings
      if (isInTrial) {
        req.isInTrial = true;
        return next();
      }

      const planName = subscription.plan.name;
      const settingsToUpdate = req.body.settings || req.body;

      // Validate settings against plan
      const validation = validateSettingsForPlan(settingsToUpdate, planName);

      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          code: 'SETTINGS_NOT_AVAILABLE',
          message: 'Some settings are not available in your plan',
          errors: validation.errors,
          blockedKeys: validation.blockedKeys,
          currentPlan: planName,
          upgradeRequired: true
        });
      }

      // Store plan info for later use
      req.subscriptionPlan = planName;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware untuk filter settings response berdasarkan plan
 * Use as response middleware to strip unavailable settings
 * 
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/tenants/:id',
 *   filterSettingsResponse(),
 *   tenantController.getTenant
 * );
 */
const filterSettingsResponse = () => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json function
    res.json = async (data) => {
      try {
        // Super admin: return full settings
        if (req.user?.isSuperAdmin) {
          return originalJson(data);
        }

        const tenantId = req.user?.tenantId;

        if (!tenantId || !data) {
          return originalJson(data);
        }

        // Get subscription plan
        const subscription = await Subscription.findOne({
          where: { tenantId, status: 'active' },
          include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        // Check trial
        const tenant = await Tenant.findByPk(tenantId);
        const isInTrial = tenant?.isOnTrial && tenant.trialEndDate && new Date() < new Date(tenant.trialEndDate);

        // Trial mode: return all settings
        if (isInTrial) {
          return originalJson(data);
        }

        if (!subscription) {
          return originalJson(data);
        }

        const planName = subscription.plan.name;

        // Filter settings in response
        if (data.settings && typeof data.settings === 'object') {
          data.settings = filterSettingsForPlan(data.settings, planName);
          data._settingsFiltered = true;
          data._plan = planName;
        }

        // Handle array response (list of tenants)
        if (Array.isArray(data.data)) {
          data.data = data.data.map(item => {
            if (item.settings && typeof item.settings === 'object') {
              item.settings = filterSettingsForPlan(item.settings, planName);
            }
            return item;
          });
        }

        // Handle single object with data property
        if (data.data?.settings && typeof data.data.settings === 'object') {
          data.data.settings = filterSettingsForPlan(data.data.settings, planName);
        }

        return originalJson(data);
      } catch (error) {
        console.error('Error filtering settings response:', error);
        return originalJson(data);
      }
    };

    next();
  };
};

/**
 * Helper function untuk get allowed settings for current request
 * 
 * @param {Object} req - Express request object
 * @returns {string[]} Array of allowed setting keys
 * 
 * @example
 * const allowedSettings = getAllowedSettings(req);
 * console.log('You can configure:', allowedSettings);
 */
const getAllowedSettings = async (req) => {
  // Super admin: all settings
  if (req.user?.isSuperAdmin) {
    return null; // null = all settings allowed
  }

  // Trial mode: all settings
  if (req.isInTrial) {
    return null;
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return [];
  }

  const subscription = await Subscription.findOne({
    where: { tenantId, status: 'active' },
    include: [{ model: SubscriptionPlan, as: 'plan' }]
  });

  if (!subscription) {
    return [];
  }

  return getAllowedSettingsForPlan(subscription.plan.name);
};

/**
 * Helper function untuk check if specific setting is allowed
 * 
 * @param {Object} req - Express request object
 * @param {string} settingKey - Setting key to check
 * @returns {Promise<boolean>} True if setting is allowed
 * 
 * @example
 * if (await canAccessSetting(req, 'smsApiKey')) {
 *   // Allow SMS configuration
 * }
 */
const canAccessSetting = async (req, settingKey) => {
  const allowedSettings = await getAllowedSettings(req);
  
  // null = all settings allowed (super admin or trial)
  if (allowedSettings === null) {
    return true;
  }

  return allowedSettings.includes(settingKey);
};

module.exports = {
  requireModule,
  requireFeature,
  enforceLimit,
  getSubscriptionFeatures,
  hasFeature,
  hasModule,
  getLimit,
  // Settings-related exports
  validateSettingsAccess,
  filterSettingsResponse,
  getAllowedSettings,
  canAccessSetting
};
