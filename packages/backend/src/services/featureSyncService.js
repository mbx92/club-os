/**
 * Feature Sync Service
 * 
 * Service untuk sync features dari registry ke database subscription plans.
 * 
 * Sync Logic:
 * 1. Standard plans (name = Basic/Professional/Enterprise): sync dari registry
 * 2. Custom plans (name contains "Basic/Professional/Enterprise"): auto-detect base, merge overrides
 * 3. Custom plans (no match): SKIP - features preserved, admin manages manually
 * 
 * @module services/featureSyncService
 */

const { SubscriptionPlan } = require('../models');
const { 
  generateFeaturesForPlan, 
  getAvailablePlans,
  validateFeatures,
  getFeatureMetadata
} = require('../utils/featureRegistry');

class FeatureSyncService {
  /**
   * Deep merge two objects (target overrides source)
   * @private
   */
  static deepMerge(source, overrides) {
    if (!overrides) return { ...source };
    
    const result = { ...source };
    
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(source[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Detect base plan from plan name
   * e.g., "Psikolog Enterprise" -> "Enterprise"
   *       "Basic Plus" -> "Basic"
   *       "Professional Gym" -> "Professional"
   * 
   * @param {string} planName - Plan name
   * @returns {string|null} Detected base plan or null
   */
  static detectBasePlan(planName) {
    const availablePlans = getAvailablePlans(); // ['Basic', 'Professional', 'Enterprise']
    const nameLower = planName.toLowerCase();
    
    // Exact match first
    if (availablePlans.includes(planName)) {
      return planName;
    }
    
    // Check if plan name contains any base plan name
    for (const basePlan of availablePlans) {
      if (nameLower.includes(basePlan.toLowerCase())) {
        return basePlan;
      }
    }
    
    return null;
  }

  /**
   * Compute effective features for a plan
   * 
   * @param {Object} plan - SubscriptionPlan instance
   * @param {boolean} preserveCustom - If true, merge existing features as overrides
   * @returns {Object} Computed features
   */
  static computeFeatures(plan, preserveCustom = false) {
    const availablePlans = getAvailablePlans();
    
    // Case 1: Standard plan (exact name match)
    if (availablePlans.includes(plan.name)) {
      return generateFeaturesForPlan(plan.name);
    }
    
    // Case 2: Custom plan - try to detect base from name
    const detectedBase = this.detectBasePlan(plan.name);
    if (detectedBase) {
      const baseFeatures = generateFeaturesForPlan(detectedBase);
      // Only preserve custom if explicitly requested (not during sync)
      // During sync, we want clean base features to fix any invalid data
      return baseFeatures;
    }
    
    // Case 3: No match - return existing features or empty
    return plan.features || {};
  }

  /**
   * Sync all subscription plans with registry
   * 
   * @returns {Promise<Object>} Sync result
   */
  static async syncAllPlans() {
    const results = {
      success: true,
      synced: [],
      skipped: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      const plans = await SubscriptionPlan.findAll();
      console.log(`[FeatureSync] Found ${plans.length} plans to sync`);

      for (const plan of plans) {
        try {
          const result = await this.syncPlan(plan);
          if (result.skipped) {
            results.skipped.push(result);
          } else {
            results.synced.push(result);
          }
        } catch (error) {
          console.error(`[FeatureSync] Error syncing plan ${plan.name}:`, error.message);
          results.errors.push({
            planId: plan.id,
            planName: plan.name,
            error: error.message
          });
        }
      }

      results.success = results.errors.length === 0;
      console.log(`[FeatureSync] Sync completed: ${results.synced.length} synced, ${results.skipped.length} skipped, ${results.errors.length} errors`);
      
      return results;
    } catch (error) {
      console.error('[FeatureSync] Fatal error:', error);
      throw error;
    }
  }

  /**
   * Sync single plan
   * 
   * @param {Object} plan - SubscriptionPlan instance
   * @returns {Promise<Object>} Sync result
   */
  static async syncPlan(plan) {
    const availablePlans = getAvailablePlans();
    const isStandardPlan = availablePlans.includes(plan.name);
    const detectedBase = this.detectBasePlan(plan.name);
    
    // Custom plan with no detectable base - skip to preserve features
    if (!isStandardPlan && !detectedBase) {
      console.warn(`[FeatureSync] ⚠️  Skipping custom plan "${plan.name}" - cannot detect base plan from name.`);
      return {
        planId: plan.id,
        planName: plan.name,
        oldFeatures: plan.features,
        newFeatures: plan.features,
        changed: false,
        skipped: true,
        reason: `Cannot auto-detect base plan. Name should contain: ${availablePlans.join(', ')}`
      };
    }
    
    const oldFeatures = plan.features;
    const newFeatures = this.computeFeatures(plan);
    
    // Validate features
    const validation = validateFeatures(newFeatures);
    if (!validation.valid) {
      throw new Error(`Feature validation failed: ${validation.errors.join(', ')}`);
    }

    // Update plan
    plan.features = newFeatures;
    await plan.save();

    const syncType = isStandardPlan ? 'standard' : `custom (base: ${detectedBase})`;
    console.log(`[FeatureSync] ✓ Synced plan: ${plan.name} (${syncType})`);

    return {
      planId: plan.id,
      planName: plan.name,
      detectedBase: isStandardPlan ? plan.name : detectedBase,
      syncType,
      oldFeatures,
      newFeatures,
      changed: JSON.stringify(oldFeatures) !== JSON.stringify(newFeatures)
    };
  }

  /**
   * Sync specific plan by ID
   * 
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Sync result
   */
  static async syncPlanById(planId) {
    const plan = await SubscriptionPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    return await this.syncPlan(plan);
  }

  /**
   * Preview features for a plan (without saving)
   * 
   * @param {string} planName - Plan name (Basic, Professional, Enterprise)
   * @returns {Object} Generated features
   */
  static previewFeatures(planName) {
    return generateFeaturesForPlan(planName);
  }

  /**
   * Get feature metadata for admin UI
   * 
   * @returns {Array} Feature metadata
   */
  static getMetadata() {
    return getFeatureMetadata();
  }

  /**
   * Compare current features vs registry
   * 
   * @returns {Promise<Object>} Comparison result
   */
  static async compareWithRegistry() {
    const plans = await SubscriptionPlan.findAll();
    const availablePlans = getAvailablePlans();
    const comparison = [];

    for (const plan of plans) {
      const currentFeatures = plan.features;
      const isStandardPlan = availablePlans.includes(plan.name);
      const detectedBase = this.detectBasePlan(plan.name);
      
      // Custom plan without detectable base - mark as custom (not compared)
      if (!isStandardPlan && !detectedBase) {
        comparison.push({
          planId: plan.id,
          planName: plan.name,
          planType: 'custom',
          inSync: true, // Custom plans are always "in sync" (manually managed)
          isCustom: true,
          differences: [],
          note: `Custom plan - name should contain one of: ${availablePlans.join(', ')}`
        });
        continue;
      }
      
      // Compute expected features
      const expectedFeatures = this.computeFeatures(plan);
      const differences = this.findDifferences(currentFeatures, expectedFeatures);
      
      comparison.push({
        planId: plan.id,
        planName: plan.name,
        planType: isStandardPlan ? 'standard' : `custom (base: ${detectedBase})`,
        detectedBase: isStandardPlan ? plan.name : detectedBase,
        inSync: differences.length === 0,
        isCustom: false,
        differences
      });
    }

    return comparison;
  }

  /**
   * Find differences between two feature objects
   * 
   * @param {Object} current - Current features
   * @param {Object} registry - Registry features
   * @returns {Array} List of differences
   */
  static findDifferences(current, registry) {
    const differences = [];

    // Check for missing categories
    for (const category of Object.keys(registry)) {
      if (!current[category]) {
        differences.push({
          type: 'missing_category',
          category,
          message: `Category "${category}" missing in current features`
        });
        continue;
      }

      // Check for missing features
      for (const featureName of Object.keys(registry[category])) {
        if (!(featureName in current[category])) {
          differences.push({
            type: 'missing_feature',
            category,
            feature: featureName,
            message: `Feature "${category}.${featureName}" missing in current features`
          });
        } else if (current[category][featureName] !== registry[category][featureName]) {
          differences.push({
            type: 'value_mismatch',
            category,
            feature: featureName,
            current: current[category][featureName],
            registry: registry[category][featureName],
            message: `Value mismatch for "${category}.${featureName}"`
          });
        }
      }
    }

    // Check for extra features (not in registry)
    for (const category of Object.keys(current)) {
      if (!registry[category]) {
        differences.push({
          type: 'extra_category',
          category,
          message: `Category "${category}" exists but not in registry`
        });
        continue;
      }

      for (const featureName of Object.keys(current[category])) {
        if (!(featureName in registry[category])) {
          differences.push({
            type: 'extra_feature',
            category,
            feature: featureName,
            message: `Feature "${category}.${featureName}" exists but not in registry`
          });
        }
      }
    }

    return differences;
  }

  /**
   * Create missing plans based on registry
   * 
   * @returns {Promise<Object>} Creation result
   */
  static async createMissingPlans() {
    const availablePlans = getAvailablePlans();
    const existingPlans = await SubscriptionPlan.findAll();
    const existingPlanNames = existingPlans.map(p => p.name);

    const missingPlans = availablePlans.filter(name => !existingPlanNames.includes(name));

    if (missingPlans.length === 0) {
      return {
        success: true,
        message: 'All plans already exist',
        created: []
      };
    }

    const created = [];

    // Default prices (can be customized)
    const defaultPrices = {
      Basic: 0,
      Professional: 500000,
      Enterprise: 1000000
    };

    for (const planName of missingPlans) {
      const features = generateFeaturesForPlan(planName);
      
      const plan = await SubscriptionPlan.create({
        name: planName,
        price: defaultPrices[planName] || 0,
        duration: 30, // 30 days
        features,
        isActive: true
      });

      created.push({
        id: plan.id,
        name: plan.name,
        price: plan.price
      });

      console.log(`[FeatureSync] ✓ Created missing plan: ${planName}`);
    }

    return {
      success: true,
      message: `Created ${created.length} missing plans`,
      created
    };
  }

  /**
   * Health check: Verify all plans are in sync
   * 
   * @returns {Promise<Object>} Health status
   */
  static async healthCheck() {
    const comparison = await this.compareWithRegistry();
    const outOfSync = comparison.filter(c => !c.inSync && !c.isCustom);
    const customPlans = comparison.filter(c => c.isCustom);

    return {
      healthy: outOfSync.length === 0,
      totalPlans: comparison.length,
      standardPlans: comparison.filter(c => !c.isCustom).length,
      customPlans: customPlans.length,
      inSync: comparison.filter(c => c.inSync).length,
      outOfSync: outOfSync.length,
      details: outOfSync,
      customPlanDetails: customPlans
    };
  }

  /**
   * Generate features for a new plan based on name
   * Call this when creating a new subscription plan to auto-generate features
   * 
   * @param {string} planName - Name of the new plan
   * @param {Object} [customOverrides] - Optional feature overrides
   * @returns {Object} Generated features
   */
  static generateFeaturesForNewPlan(planName, customOverrides = null) {
    const availablePlans = getAvailablePlans();
    
    // Standard plan
    if (availablePlans.includes(planName)) {
      const features = generateFeaturesForPlan(planName);
      return customOverrides ? this.deepMerge(features, customOverrides) : features;
    }
    
    // Try to detect base from name
    const detectedBase = this.detectBasePlan(planName);
    if (detectedBase) {
      const baseFeatures = generateFeaturesForPlan(detectedBase);
      console.log(`[FeatureSync] Auto-detected base plan "${detectedBase}" from name "${planName}"`);
      return customOverrides ? this.deepMerge(baseFeatures, customOverrides) : baseFeatures;
    }
    
    // No match - return default (Basic features) or custom overrides
    console.warn(`[FeatureSync] Cannot detect base plan from name "${planName}", using Basic as default`);
    const defaultFeatures = generateFeaturesForPlan('Basic');
    return customOverrides ? this.deepMerge(defaultFeatures, customOverrides) : defaultFeatures;
  }
}

module.exports = FeatureSyncService;
