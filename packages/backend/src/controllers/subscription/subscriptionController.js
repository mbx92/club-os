const { Subscription, SubscriptionPlan, Tenant, Invoice, Payment } = require("../../models");
const logger = require("../../utils/logger");
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const FeatureSyncService = require("../../services/featureSyncService");

async function getSubscriptionPlans(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'sortOrder', 
      sortOrder = 'ASC',
      search = '',
      isActive = 'true'
    } = req.query;

    // Parse pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = {};
    
    // Filter by isActive
    // if (isActive === 'true') {
    //   whereClause.isActive = true;
    // } else if (isActive === 'false') {
    //   whereClause.isActive = false;
    // }
    // if isActive === 'all', don't filter by isActive

    // Add search condition
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Validate sortBy field
    const allowedSortFields = ['sortOrder', 'price', 'name', 'duration', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    
    // Validate sortOrder
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Build order clause with secondary sort
    const orderClause = [[sortField, order]];
    if (sortField !== 'sortOrder') {
      orderClause.push(['sortOrder', 'ASC']); // Always sort by sortOrder as secondary
    }
    if (sortField !== 'price') {
      orderClause.push(['price', 'ASC']); // Then by price
    }

    // Execute query with pagination
    const { count, rows: plans } = await SubscriptionPlan.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit: limitNum,
      offset: offset
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    logger.logInfo("Subscription plans retrieved", {
      action: 'SUBSCRIPTION_PLANS_RETRIEVED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      count: plans.length,
      totalRecords: count,
      page: pageNum,
      limit: limitNum,
      search,
      sortBy: sortField,
      sortOrder: order,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({
      data: plans,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: count,
        limit: limitNum,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      },
      filters: {
        search,
        isActive,
        sortBy: sortField,
        sortOrder: order
      }
    });
  } catch (err) {
    console.error("Error retrieving subscription plans:", err);
    logger.logSecurity("Error retrieving subscription plans", {
      action: 'RETRIEVING_SUBSCRIPTION_PLANS',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to retrieve subscription plans" });
  }
}

async function getSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findOne({
      where: { id, isActive: true }
    });

    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    logger.logInfo("Subscription plan retrieved", {
      action: 'SUBSCRIPTION_PLAN_RETRIEVED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      planId: id,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json(plan);
  } catch (err) {
    logger.logSecurity("Error retrieving subscription plan", {
      action: 'RETRIEVING_SUBSCRIPTION_PLAN',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to retrieve subscription plan" });
  }
}

async function createSubscriptionPlan(req, res) {
  try {
    const { name, description, price, duration, features, sortOrder } = req.body;
    
    // Check if plan with same name already exists
    const existingPlan = await SubscriptionPlan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(400).json({ message: "Subscription plan with this name already exists" });
    }

    // Auto-generate features based on plan name if not provided or empty
    // This detects base plan from name (e.g., "Psikolog Enterprise" -> Enterprise features)
    let planFeatures = features;
    if (!features || Object.keys(features).length === 0) {
      planFeatures = FeatureSyncService.generateFeaturesForNewPlan(name);
      console.log(`[SubscriptionPlan] Auto-generated features for "${name}" based on detected base plan`);
    } else {
      // If features provided, merge with base plan features
      planFeatures = FeatureSyncService.generateFeaturesForNewPlan(name, features);
    }

    // Create subscription plan
    const plan = await SubscriptionPlan.create({
      name,
      description,
      price,
      duration: duration || 30,
      features: planFeatures,
      sortOrder: sortOrder || 0,
      isActive: true
    });

    logger.logAuth("Subscription plan created", {
      action: 'SUBSCRIPTION_PLAN_CREATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      planId: plan.id,
      name: plan.name,
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.status(201).json(plan);
  } catch (err) {
    logger.logSecurity("Error creating subscription plan", {
      action: 'CREATING_SUBSCRIPTION_PLAN',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to create subscription plan" });
  }
}

async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, duration, features, sortOrder, isActive } = req.body;
    
    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // Check if updating name to an existing name
    if (name && name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({ where: { name } });
      if (existingPlan) {
        return res.status(400).json({ message: "Subscription plan with this name already exists" });
      }
    }

    // Update plan
    await plan.update({
      name: name || plan.name,
      description: description !== undefined ? description : plan.description,
      price: price !== undefined ? price : plan.price,
      duration: duration !== undefined ? duration : plan.duration,
      features: features !== undefined ? features : plan.features,
      sortOrder: sortOrder !== undefined ? sortOrder : plan.sortOrder,
      isActive: isActive !== undefined ? isActive : plan.isActive
    });

    logger.logAuth("Subscription plan updated", {
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      planId: id,
      updates: { name, price, duration, isActive },
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json(plan);
  } catch (err) {
    logger.logSecurity("Error updating subscription plan", {
      action: 'UPDATING_SUBSCRIPTION_PLAN',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to update subscription plan" });
  }
}

async function deleteSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    
    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await Subscription.count({
      where: { 
        planId: id,
        status: 'active'
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({ 
        message: "Cannot delete plan with active subscriptions. Please deactivate instead.",
        activeSubscriptions
      });
    }

    // Soft delete by setting isActive to false
    await plan.update({ isActive: false });

    logger.logAuth("Subscription plan deactivated", {
      action: 'SUBSCRIPTION_PLAN_DEACTIVATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      planId: id,
      planName: plan.name,
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({ message: "Subscription plan deactivated successfully" });
  } catch (err) {
    logger.logSecurity("Error deleting subscription plan", {
      action: 'DELETING_SUBSCRIPTION_PLAN',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      user: req.user,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to delete subscription plan" });
  }
}

async function createSubscription(req, res) {
  try {
    const { tenantId, planId, paymentMethod } = req.body;
    
    // Validate required fields
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId is required" });
    }
    if (!planId) {
      return res.status(400).json({ message: "planId is required" });
    }
    
    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    // Check if tenant already has an active or pending subscription
    const existingSubscription = await Subscription.findOne({
      where: { 
        tenantId,
        status: ['active', 'pending']
      },
      order: [['createdAt', 'DESC']]
    });
    
    if (existingSubscription) {
      return res.status(400).json({ 
        message: "Tenant already has an active or pending subscription",
        existingSubscription: {
          id: existingSubscription.id,
          status: existingSubscription.status,
          startDate: existingSubscription.startDate,
          endDate: existingSubscription.endDate
        }
      });
    }
    
    // Find the plan
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }
    
    if (!plan.isActive) {
      return res.status(400).json({ message: "Subscription plan is not active" });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    // If duration is 0, set to far future (unlimited)
    if (plan.duration === 0) {
      endDate.setFullYear(endDate.getFullYear() + 100); // 100 years = unlimited
    } else {
      endDate.setDate(endDate.getDate() + plan.duration);
    }

    // Create subscription
    const subscription = await Subscription.create({
      tenantId,
      planId,
      startDate,
      endDate,
      status: 'pending',
      price: plan.price,
      paymentMethod
    });

    // Update tenant with subscription
    await Tenant.update(
      { subscriptionId: subscription.id },
      { where: { id: tenantId } }
    );

    logger.logAuth("Subscription created", {
      action: 'SUBSCRIPTION_CREATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: subscription.id,
      tenantId,
      planId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.status(201).json({
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        planId: subscription.planId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        price: subscription.price
      }
    });
  } catch (err) {
    logger.logSecurity("Error creating subscription", {
      action: 'CREATING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to create subscription" });
  }
}

// GET /subscription/current - Get current tenant's subscription with full feature details
async function getCurrentSubscription(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    
    // Get tenant with trial info
    const tenant = await Tenant.findByPk(tenantId);
    
    const subscription = await Subscription.findOne({
      where: { 
        tenantId,
        status: ['active', 'pending', 'trial']
      },
      include: [
        { model: SubscriptionPlan, as: 'plan' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Return graceful response for tenants without subscription
    if (!subscription) {
      // Check if tenant is on trial period
      const isOnTrial = tenant && tenant.isOnTrial && 
                        tenant.trialEndDate && 
                        new Date(tenant.trialEndDate) > new Date();
      
      logger.logInfo("No active subscription found for tenant", {
      action: 'NO_ACTIVE_SUBSCRIPTION_FOUND_FOR_TENANT',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId,
        userId: req.user.id,
        isOnTrial,
        trialEndDate: tenant?.trialEndDate,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
      
      // Empty features structure matching all possible categories
      const emptyFeatures = {
        modules: {},
        limits: {},
        gym: {},
        services: {},
        transactions: {},
        payments: {},
        printing: {},
        restaurant: {},
        integrations: {},
        support: {},
        settings: {}
      };
      
      return res.status(200).json({ 
        success: true,
        data: {
          subscription: null,
          hasSubscription: false,
          features: emptyFeatures,
          isTrialActive: isOnTrial,
          trialEndDate: tenant?.trialEndDate || null
        },
        message: isOnTrial 
          ? "You are currently on a trial period." 
          : "No active subscription found. Please subscribe to a plan."
      });
    }

    const plan = subscription.plan;
    if (!plan) {
      logger.logError("Subscription found but plan is missing", {
      action: 'SUBSCRIPTION_FOUND_BUT_PLAN_IS_MISSING',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: subscription.id,
        tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
      return res.status(500).json({
        success: false,
        message: "Subscription configuration error. Please contact support."
      });
    }

    // Determine if trial is active from subscription status OR tenant trial settings
    const isTrialActive = subscription.status === 'trial' || 
                          (tenant && tenant.isOnTrial && 
                           tenant.trialEndDate && 
                           new Date(tenant.trialEndDate) > new Date());

    // Debug logging
    logger.logInfo("Trial status check", {
      tenantId: req.user?.tenantId,
      action: 'TRIAL_STATUS_CHECK',
      userId: req.user?.id,
      tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionStatus: subscription.status,
      tenantIsOnTrial: tenant?.isOnTrial,
      tenantTrialEndDate: tenant?.trialEndDate,
      now: new Date(),
      isTrialEndDateValid: tenant?.trialEndDate ? new Date(tenant.trialEndDate) > new Date() : false,
      finalIsTrialActive: isTrialActive
    });

    // Build comprehensive feature response
    // Copy ALL feature categories from plan.features dynamically
    const allFeatures = plan.features ? { ...plan.features } : {};
    
    const response = {
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          trialEndDate: tenant?.trialEndDate || null,
          plan: {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            duration: plan.duration,
            features: plan.features
          }
        },
        hasSubscription: true,
        features: allFeatures,
        isTrialActive
      }
    };

    logger.logInfo("Current subscription retrieved", {
      action: 'CURRENT_SUBSCRIPTION_RETRIEVED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: subscription.id,
      tenantId,
      planName: plan.name,
      status: subscription.status,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.json(response);
  } catch (err) {
    logger.logError("Error retrieving current subscription", {
      action: 'RETRIEVING_CURRENT_SUBSCRIPTION',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    next(err);
  }
}

// GET /subscription/plans - Get all available plans for frontend display
async function getAvailablePlans(req, res) {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']],
      attributes: [
        'id', 'name', 'description', 'price', 'duration', 
        'features', 'sortOrder'
      ]
    });

    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration: plan.duration,
      features: {
        modules: plan.features?.modules || {},
        limits: plan.features?.limits || {},
        transactions: plan.features?.transactions || {},
        payments: plan.features?.payments || {},
        reporting: plan.features?.reporting || {},
        integrations: plan.features?.integrations || {},
        support: plan.features?.support || {}
      }
    }));

    return res.json({
      success: true,
      data: formattedPlans
    });
  } catch (err) {
    logger.logSecurity("Error retrieving available plans", {
      action: 'RETRIEVING_AVAILABLE_PLANS',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return res.status(500).json({ 
      success: false,
      message: "Failed to retrieve subscription plans" 
    });
  }
}

// POST /subscription/upgrade - Upgrade to a new plan
async function upgradeSubscription(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { planId, paymentMethod = 'bank_transfer' } = req.body;

    if (!planId) {
      return res.status(400).json({ 
        success: false,
        message: "planId is required" 
      });
    }

    // Get current subscription
    const currentSubscription = await Subscription.findOne({
      where: { 
        tenantId,
        status: ['active', 'pending', 'trial']
      },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });

    // Get target plan
    const targetPlan = await SubscriptionPlan.findByPk(planId);
    if (!targetPlan) {
      return res.status(404).json({ 
        success: false,
        message: "Subscription plan not found" 
      });
    }

    if (!targetPlan.isActive) {
      return res.status(400).json({ 
        success: false,
        message: "Subscription plan is not available" 
      });
    }

    // Validate upgrade (must be higher price or different plan)
    if (currentSubscription) {
      if (currentSubscription.planId === planId) {
        return res.status(400).json({ 
          success: false,
          message: "You are already on this plan. Use renew instead." 
        });
      }

      // Optional: Validate it's an actual upgrade (higher price)
      if (parseFloat(targetPlan.price) < parseFloat(currentSubscription.plan.price)) {
        return res.status(400).json({ 
          success: false,
          message: "Cannot downgrade to a lower-priced plan. Please contact support.",
          currentPlan: currentSubscription.plan.name,
          targetPlan: targetPlan.name
        });
      }
    }

    // Calculate new subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    // If duration is 0, set to far future (unlimited)
    if (targetPlan.duration === 0) {
      endDate.setFullYear(endDate.getFullYear() + 100); // 100 years = unlimited
    } else {
      endDate.setDate(endDate.getDate() + targetPlan.duration);
    }

    // Create new subscription (status: pending until payment)
    const newSubscription = await Subscription.create({
      tenantId,
      planId: targetPlan.id,
      startDate,
      endDate,
      status: 'pending',
      price: targetPlan.price,
      paymentMethod
    });

    // Expire old subscription if exists
    if (currentSubscription) {
      await currentSubscription.update({ 
        status: 'cancelled',
        cancelledAt: new Date()
      });
    }

    logger.logAuth("Subscription upgrade initiated", {
      action: 'SUBSCRIPTION_UPGRADE_INITIATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      tenantId,
      oldPlanId: currentSubscription?.planId,
      newPlanId: targetPlan.id,
      newSubscriptionId: newSubscription.id,
      user: req.user,
    userId: req.user?.id,
    ip: getClientIp(req)
    });

    return res.status(201).json({
      success: true,
      data: {
        subscription: {
          id: newSubscription.id,
          status: newSubscription.status,
          startDate: newSubscription.startDate,
          endDate: newSubscription.endDate,
          plan: {
            id: targetPlan.id,
            name: targetPlan.name,
            description: targetPlan.description,
            price: targetPlan.price,
            duration: targetPlan.duration
          }
        },
        message: "Subscription upgrade initiated. Please complete payment to activate."
      }
    });
  } catch (err) {
    logger.logSecurity("Error upgrading subscription", {
      action: 'UPGRADING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      user: req.user,
      body: req.body,
    userId: req.user?.id,
    ip: getClientIp(req)
    });
    return res.status(500).json({ 
      success: false,
      message: "Failed to upgrade subscription" 
    });
  }
}

async function getTenantSubscription(req, res) {
  try {
    const { tenantId } = req.params;
    
    const subscription = await Subscription.findOne({
      where: { tenantId },
      include: [
        { model: SubscriptionPlan, as: 'plan' }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    logger.logInfo("Tenant subscription retrieved", {
      action: 'TENANT_SUBSCRIPTION_RETRIEVED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: subscription.id,
      tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json(subscription);
  } catch (err) {
    logger.logSecurity("Error retrieving tenant subscription", {
      action: 'RETRIEVING_TENANT_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to retrieve subscription" });
  }
}

async function updateSubscription(req, res) {
  try {
    const { id } = req.params;
    const { status, autoRenew } = req.body;
    
    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Update subscription
    await subscription.update({ status, autoRenew });

    logger.logAuth("Subscription updated", {
      action: 'SUBSCRIPTION_UPDATED',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: id,
      updates: { status, autoRenew },
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({
      id: subscription.id,
      status: subscription.status,
      autoRenew: subscription.autoRenew
    });
  } catch (err) {
    logger.logSecurity("Error updating subscription", {
      action: 'UPDATING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to update subscription" });
  }
}

async function cancelSubscription(req, res) {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Update subscription status to cancelled
    await subscription.update({ status: 'cancelled' });

    // Remove subscription from tenant
    await Tenant.update(
      { subscriptionId: null },
      { where: { id: subscription.tenantId } }
    );

    logger.logAuth("Subscription cancelled", {
      action: 'SUBSCRIPTION_CANCELLED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: id,
      tenantId: subscription.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({ message: "Subscription cancelled successfully" });
  } catch (err) {
    logger.logSecurity("Error cancelling subscription", {
      action: 'CANCELLING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
}

async function renewSubscription(req, res) {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    
    const subscription = await Subscription.findByPk(id, {
      include: [{ model: SubscriptionPlan, as: 'plan' }]
    });
    
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    
    // Check if subscription is eligible for renewal
    if (subscription.status === 'pending') {
      return res.status(400).json({ 
        message: "Cannot renew pending subscription. Please complete payment first." 
      });
    }
    
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot renew cancelled subscription. Please create a new subscription." 
      });
    }
    
    // Check if tenant already has a pending renewal
    const pendingRenewal = await Subscription.findOne({
      where: {
        tenantId: subscription.tenantId,
        status: 'pending'
      }
    });
    
    if (pendingRenewal) {
      return res.status(400).json({ 
        message: "Tenant already has a pending subscription renewal",
        pendingSubscription: {
          id: pendingRenewal.id,
          startDate: pendingRenewal.startDate,
          endDate: pendingRenewal.endDate
        }
      });
    }

    // Calculate new subscription dates
    // If current subscription is expired, start from now
    // Otherwise, start from the end of current subscription
    const now = new Date();
    const currentEndDate = new Date(subscription.endDate);
    const startDate = currentEndDate > now ? currentEndDate : now;
    const endDate = new Date(startDate);
    
    // If duration is 0, set to far future (unlimited)
    if (subscription.plan.duration === 0) {
      endDate.setFullYear(endDate.getFullYear() + 100); // 100 years = unlimited
    } else {
      endDate.setDate(endDate.getDate() + subscription.plan.duration);
    }

    // Create new subscription
    const newSubscription = await Subscription.create({
      tenantId: subscription.tenantId,
      planId: subscription.planId,
      startDate,
      endDate,
      status: 'pending',
      price: subscription.plan.price,
      paymentMethod,
      notes: `Renewal of subscription ${subscription.id}`
    });

    // Update old subscription status if it's still active
    if (subscription.status === 'active') {
      await subscription.update({ 
        autoRenew: false,
        notes: `Renewed with subscription ${newSubscription.id}`
      });
    }

    // Update tenant with new subscription
    await Tenant.update(
      { subscriptionId: newSubscription.id },
      { where: { id: subscription.tenantId } }
    );

    logger.logAuth("Subscription renewed", {
      action: 'SUBSCRIPTION_RENEWED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      oldSubscriptionId: id,
      newSubscriptionId: newSubscription.id,
      tenantId: subscription.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.status(201).json({
      subscription: {
        id: newSubscription.id,
        tenantId: newSubscription.tenantId,
        planId: newSubscription.planId,
        startDate: newSubscription.startDate,
        endDate: newSubscription.endDate,
        status: newSubscription.status,
        price: newSubscription.price
      }
    });
  } catch (err) {
    logger.logSecurity("Error renewing subscription", {
      action: 'RENEWING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to renew subscription" });
  }
}

async function activateSubscription(req, res) {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findByPk(id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });
    
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    
    if (subscription.status === 'active') {
      return res.status(400).json({ 
        message: "Subscription is already active" 
      });
    }
    
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot activate cancelled subscription" 
      });
    }

    // Deactivate any other active subscriptions for this tenant
    await Subscription.update(
      { status: 'expired' },
      { 
        where: { 
          tenantId: subscription.tenantId,
          status: 'active',
          id: { [require('sequelize').Op.ne]: id }
        } 
      }
    );

    // Activate the subscription
    await subscription.update({ 
      status: 'active',
      startDate: new Date() // Update start date to now
    });

    // Ensure tenant is linked to this subscription
    await Tenant.update(
      { 
        subscriptionId: subscription.id,
        isOnTrial: false // End trial if any
      },
      { where: { id: subscription.tenantId } }
    );

    logger.logAuth("Subscription activated", {
      action: 'SUBSCRIPTION_ACTIVATED',
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      subscriptionId: id,
      tenantId: subscription.tenantId,
      userId: req.user?.id,
      ip: getClientIp(req)
    });

    return res.json({
      message: "Subscription activated successfully",
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (err) {
    logger.logSecurity("Error activating subscription", {
      action: 'ACTIVATING_SUBSCRIPTION',
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      ip: getClientIp(req)
    });
    return res.status(500).json({ message: "Failed to activate subscription" });
  }
}

module.exports = {
  getSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createSubscription,
  getTenantSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  activateSubscription,
  getCurrentSubscription,
  getAvailablePlans,
  upgradeSubscription
};