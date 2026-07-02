/**
 * Feature Gate Middleware
 *
 * Middleware untuk validasi akses fitur berdasarkan subscription plan tenant.
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

// ─── Trial helpers — single consistent source ────────────────────────────────

const trialFields = { onTrial: 'isOnTrial', endDate: 'trialEndDate' };

function isInTrial(tenant) {
  return !!(tenant?.[trialFields.onTrial] && tenant?.[trialFields.endDate] && new Date() < new Date(tenant[trialFields.endDate]));
}

// ─── Admin bypass helper ──────────────────────────────────────────────────────

const { isTenantAdmin } = require('../utils/rbacUtils');
const isAdmin = (user) => isTenantAdmin(user);

// ─── Registry lookup: resolve flat name → category ───────────────────────────

const { FEATURE_REGISTRY } = require('../utils/featureRegistry');

function resolveFeatureCategory(flatKey) {
  for (const [category, catFeatures] of Object.entries(FEATURE_REGISTRY)) {
    if (catFeatures[flatKey]) return category;
  }
  return null;
}

// ─── Middleware core ──────────────────────────────────────────────────────────

async function loadSubscription(req) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw createError('TENANT_ID_REQUIRED');

  const subscription = await Subscription.findOne({
    where: { tenantId, status: 'active' },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });

  const tenant = await Tenant.findByPk(tenantId);
  req.tenant = tenant;

  const trial = isInTrial(tenant);
  if (trial) {
    req.isInTrial = true;
    req.subscriptionFeatures = {};
    return { trial: true };
  }

  if (!subscription) {
    return { missing: true };
  }

  req.subscriptionFeatures = subscription.plan.features || {};
  return { ok: true, planName: subscription.plan.name };
}

/**
 * Require a module (e.g. 'pos', 'restaurant').
 */
const requireModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
      if (isAdmin(req.user)) { req.subscriptionFeatures = {}; return next(); }

      const status = await loadSubscription(req);
      if (status.trial) return next();
      if (status.missing) throw createError('SUBSCRIPTION_REQUIRED');

      const features = req.subscriptionFeatures;
      if (!features.modules?.[moduleName]) {
        throw createError('MODULE_NOT_AVAILABLE', null, { requiredModule: moduleName, currentPlan: status.planName });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require a feature.
 *
 * Accepts:
 *   requireFeature('vouchers')            — flat key, searches registry
 *   requireFeature('services.sessionTracking') — dotted, split to category.name
 *
 * @param {string} key - Flat feature name or "category.name" dotted path
 */
const requireFeature = (key) => {
  return async (req, res, next) => {
    try {
      if (isAdmin(req.user)) { req.subscriptionFeatures = {}; return next(); }

      const status = await loadSubscription(req);
      if (status.trial) return next();
      if (status.missing) {
        return res.status(402).json({ success: false, message: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' });
      }

      // Resolve key → category + featureName
      let category, featureName;
      const dotIdx = key.indexOf('.');
      if (dotIdx >= 0) {
        // "services.sessionTracking" → category=services, name=sessionTracking
        category = key.slice(0, dotIdx);
        featureName = key.slice(dotIdx + 1);
      } else {
        // "vouchers" → search registry for category
        category = resolveFeatureCategory(key);
        featureName = key;
      }

      if (!category) {
        return res.status(400).json({ success: false, message: `Unknown feature: ${key}`, code: 'INVALID_FEATURE' });
      }

      const features = req.subscriptionFeatures;
      const enabled = features[category]?.[featureName] === true;
      if (!enabled) {
        return res.status(403).json({
          success: false,
          message: `Feature '${key}' not available in your plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: key,
          currentPlan: status.planName,
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate error:', error);
      res.status(500).json({ success: false, message: 'Error validating subscription features' });
    }
  };
};

/**
 * Enforce a count limit.
 */
const enforceLimit = (limitName, getCurrentCount) => {
  return async (req, res, next) => {
    try {
      if (isAdmin(req.user)) { req.subscriptionFeatures = {}; return next(); }

      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID is required', code: 'TENANT_ID_REQUIRED' });

      const status = await loadSubscription(req);
      if (status.trial) return next();
      if (status.missing) return res.status(402).json({ success: false, message: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' });

      const features = req.subscriptionFeatures;
      const limit = features.limits?.[limitName];
      if (!limit || limit === 0) return next();

      const currentCount = await getCurrentCount(tenantId);
      if (currentCount >= limit) {
        return res.status(403).json({
          success: false, code: 'LIMIT_REACHED',
          message: `${limitName} limit reached`,
          limit, current: currentCount, currentPlan: status.planName,
        });
      }

      next();
    } catch (error) {
      console.error('Limit enforcement error:', error);
      res.status(500).json({ success: false, message: 'Error enforcing subscription limits' });
    }
  };
};

// ─── Controller helpers ─────────────────────────────────────────────────────

const getSubscriptionFeatures = (req) => req.subscriptionFeatures || {};

const hasFeature = (req, key) => {
  if (isAdmin(req.user) || req.isInTrial) return true;
  const features = req.subscriptionFeatures || {};
  const dotIdx = key.indexOf('.');
  if (dotIdx >= 0) {
    const cat = key.slice(0, dotIdx);
    const name = key.slice(dotIdx + 1);
    return features[cat]?.[name] === true;
  }
  const cat = resolveFeatureCategory(key);
  return cat ? features[cat]?.[key] === true : false;
};

const hasModule = (req, moduleName) => {
  if (isAdmin(req.user) || req.isInTrial) return true;
  return (req.subscriptionFeatures || {}).modules?.[moduleName] === true;
};

const getLimit = (req, limitName) => {
  if (isAdmin(req.user) || req.isInTrial) return 0;
  return (req.subscriptionFeatures || {}).limits?.[limitName] || 0;
};

// ─── Settings ────────────────────────────────────────────────────────────────

const validateSettingsAccess = () => {
  return async (req, res, next) => {
    try {
      if (isAdmin(req.user)) return next();

      const status = await loadSubscription(req);
      if (status.trial) { req.isInTrial = true; return next(); }
      if (status.missing) throw createError('SUBSCRIPTION_REQUIRED');

      const settingsToUpdate = req.body.settings || req.body;
      const validation = validateSettingsForPlan(settingsToUpdate, status.planName);
      if (!validation.valid) {
        return res.status(403).json({
          success: false, code: 'SETTINGS_NOT_AVAILABLE',
          message: 'Some settings are not available in your plan',
          errors: validation.errors, blockedKeys: validation.blockedKeys,
          currentPlan: status.planName, upgradeRequired: true,
        });
      }
      req.subscriptionPlan = status.planName;
      next();
    } catch (error) { next(error); }
  };
};

const filterSettingsResponse = () => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        if (isAdmin(req.user)) return originalJson(data);
        const tenantId = req.user?.tenantId;
        if (!tenantId || !data) return originalJson(data);

        const status = await loadSubscription(req);
        if (status.trial || status.missing) return originalJson(data);

        if (data.settings && typeof data.settings === 'object') {
          data.settings = filterSettingsForPlan(data.settings, status.planName);
          data._settingsFiltered = true;
          data._plan = status.planName;
        }
        if (Array.isArray(data.data)) {
          data.data = data.data.map(item => {
            if (item.settings && typeof item.settings === 'object')
              item.settings = filterSettingsForPlan(item.settings, status.planName);
            return item;
          });
        }
        if (data.data?.settings && typeof data.data.settings === 'object')
          data.data.settings = filterSettingsForPlan(data.data.settings, status.planName);

        return originalJson(data);
      } catch (error) { return originalJson(data); }
    };
    next();
  };
};

const getAllowedSettings = async (req) => {
  if (isAdmin(req.user) || req.isInTrial) return null;
  const tenantId = req.user?.tenantId;
  if (!tenantId) return [];
  const subscription = await Subscription.findOne({
    where: { tenantId, status: 'active' },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });
  return subscription ? getAllowedSettingsForPlan(subscription.plan.name) : [];
};

const canAccessSetting = async (req, settingKey) => {
  const allowed = await getAllowedSettings(req);
  return allowed === null ? true : allowed.includes(settingKey);
};

module.exports = {
  requireModule,
  requireFeature,
  enforceLimit,
  getSubscriptionFeatures,
  hasFeature,
  hasModule,
  getLimit,
  validateSettingsAccess,
  filterSettingsResponse,
  getAllowedSettings,
  canAccessSetting,
};
