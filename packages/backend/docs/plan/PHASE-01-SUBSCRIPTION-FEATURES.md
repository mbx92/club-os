# FASE 1: SUBSCRIPTION FEATURE-GATING
## Kontrol Fitur Berdasarkan Plan Subscription

**Status**: 📋 Planning  
**Prioritas**: 🔴 High  
**Estimasi**: 2 minggu  
**Dependencies**: None (Foundation Phase)

---

## 🎯 Tujuan Fase Ini

Mengimplementasikan sistem **feature-gating** yang memungkinkan backend membatasi akses fitur berdasarkan subscription plan yang dimiliki tenant. Sistem ini akan:

1. Validasi apakah tenant memiliki akses ke fitur tertentu berdasarkan plan mereka
2. Membatasi API endpoint sesuai dengan subscription plan
3. Enforce limits (max users, max members, max products, dll) per plan
4. Terintegrasi seamless dengan middleware chain yang sudah ada
5. Mudah dikonfigurasi dan di-maintain oleh admin

---

## 📊 Arsitektur Saat Ini

### Model `SubscriptionPlan` yang Ada

```javascript
// models/subscriptionPlan.js
SubscriptionPlan.init({
  id: { type: DataTypes.UUID, primaryKey: true },
  name: DataTypes.STRING,            // "Basic", "Professional", "Enterprise"
  description: DataTypes.TEXT,
  durationDays: DataTypes.INTEGER,   // 30, 365, dll
  price: DataTypes.DECIMAL(10, 2),
  currency: DataTypes.STRING,
  features: DataTypes.JSONB,         // ⭐ FIELD KUNCI untuk feature-gating
  isActive: DataTypes.BOOLEAN,
  // ...timestamps
});
```

### Current `features` JSON Structure (Minimal)

Saat ini field `features` mungkin masih sederhana atau kosong. Contoh existing:

```json
{
  "maxUsers": 5,
  "maxMembers": 100
}
```

---

## 🏗️ Desain Solusi

### 1. Enhanced `features` JSON Schema

Perlu ekspansi schema `features` untuk support fitur-fitur yang akan dikembangkan:

```json
{
  // === MODULE ACCESS ===
  "modules": {
    "gym": true,              // Gym management (membership, check-in)
    "pos": false,             // Point of Sale
    "restaurant": false,      // Restaurant/Café
    "classes": false,         // Class scheduling & booking
    "reports": true,          // Basic reports
    "advancedReports": false  // Advanced analytics
  },
  
  // === LIMITS ===
  "limits": {
    "maxUsers": 5,            // Max staff accounts
    "maxMembers": 100,        // Max gym members
    "maxProducts": 0,         // Max POS products (0 = unlimited jika module enabled)
    "maxLocations": 1,        // Max gym locations
    "maxPrinters": 1,         // Max thermal printers
    "maxTables": 0,           // Max restaurant tables
    "maxIntegrations": 2      // Max third-party integrations
  },
  
  // === TRANSACTION FEATURES ===
  "transactions": {
    "combinedBilling": false,     // Membership + POS + Classes in 1 bill
    "installments": false,        // Payment installments
    "vouchers": true,             // Discount vouchers
    "loyaltyPoints": false,       // Loyalty program
    "refunds": true               // Refund processing
  },
  
  // === PAYMENT FEATURES ===
  "payments": {
    "cash": true,
    "creditCard": false,
    "bankTransfer": true,
    "eWallet": false,
    "qris": false,
    "paymentGateway": false       // Midtrans integration
  },
  
  // === PRINTING FEATURES ===
  "printing": {
    "thermalPrinter": false,      // Thermal printer support
    "customTemplates": false,     // Custom receipt templates
    "autoPrint": false,           // Auto-print after transaction
    "logo": true                  // Logo on receipt
  },
  
  // === RESTAURANT FEATURES ===
  "restaurant": {
    "tableManagement": false,
    "kitchenDisplay": false,
    "customTableLayout": false,
    "touchscreenMode": false
  },
  
  // === INTEGRATION FEATURES ===
  "integrations": {
    "sms": false,                 // Twilio SMS
    "whatsapp": false,            // WhatsApp notifications
    "email": true,                // Email notifications
    "paymentGateway": false,      // Midtrans/Xendit
    "accounting": false           // Accounting software integration
  },
  
  // === SUPPORT & MAINTENANCE ===
  "support": {
    "prioritySupport": false,
    "dedicatedAccount": false,
    "customization": false
  }
}
```

### 2. Database Migration

Perlu update existing subscription plans dengan feature schema baru:

```javascript
// migrations/YYYYMMDDHHMMSS-update-subscription-plan-features.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update existing plans dengan features baru
    const plans = await queryInterface.sequelize.query(
      'SELECT id, name, features FROM "SubscriptionPlans"',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      let newFeatures = {};
      
      // Tentukan features based on plan name/tier
      if (plan.name === 'Basic') {
        newFeatures = {
          modules: {
            gym: true,
            pos: false,
            restaurant: false,
            classes: false,
            reports: true,
            advancedReports: false
          },
          limits: {
            maxUsers: 3,
            maxMembers: 50,
            maxProducts: 0,
            maxLocations: 1,
            maxPrinters: 0,
            maxTables: 0,
            maxIntegrations: 0
          },
          transactions: {
            combinedBilling: false,
            installments: false,
            vouchers: false,
            loyaltyPoints: false,
            refunds: false
          },
          payments: {
            cash: true,
            creditCard: false,
            bankTransfer: false,
            eWallet: false,
            qris: false,
            paymentGateway: false
          },
          printing: {
            thermalPrinter: false,
            customTemplates: false,
            autoPrint: false,
            logo: false
          },
          restaurant: {
            tableManagement: false,
            kitchenDisplay: false,
            customTableLayout: false,
            touchscreenMode: false
          },
          integrations: {
            sms: false,
            whatsapp: false,
            email: true,
            paymentGateway: false,
            accounting: false
          },
          support: {
            prioritySupport: false,
            dedicatedAccount: false,
            customization: false
          }
        };
      } else if (plan.name === 'Professional') {
        newFeatures = {
          modules: {
            gym: true,
            pos: true,
            restaurant: true,
            classes: true,
            reports: true,
            advancedReports: false
          },
          limits: {
            maxUsers: 10,
            maxMembers: 500,
            maxProducts: 0,
            maxLocations: 3,
            maxPrinters: 3,
            maxTables: 20,
            maxIntegrations: 5
          },
          transactions: {
            combinedBilling: true,
            installments: true,
            vouchers: true,
            loyaltyPoints: false,
            refunds: true
          },
          payments: {
            cash: true,
            creditCard: true,
            bankTransfer: true,
            eWallet: true,
            qris: true,
            paymentGateway: true
          },
          printing: {
            thermalPrinter: true,
            customTemplates: false,
            autoPrint: true,
            logo: true
          },
          restaurant: {
            tableManagement: true,
            kitchenDisplay: false,
            customTableLayout: false,
            touchscreenMode: true
          },
          integrations: {
            sms: true,
            whatsapp: false,
            email: true,
            paymentGateway: true,
            accounting: false
          },
          support: {
            prioritySupport: false,
            dedicatedAccount: false,
            customization: false
          }
        };
      } else if (plan.name === 'Enterprise') {
        newFeatures = {
          modules: {
            gym: true,
            pos: true,
            restaurant: true,
            classes: true,
            reports: true,
            advancedReports: true
          },
          limits: {
            maxUsers: 0,        // Unlimited
            maxMembers: 0,      // Unlimited
            maxProducts: 0,     // Unlimited
            maxLocations: 0,    // Unlimited
            maxPrinters: 0,     // Unlimited
            maxTables: 0,       // Unlimited
            maxIntegrations: 0  // Unlimited
          },
          transactions: {
            combinedBilling: true,
            installments: true,
            vouchers: true,
            loyaltyPoints: true,
            refunds: true
          },
          payments: {
            cash: true,
            creditCard: true,
            bankTransfer: true,
            eWallet: true,
            qris: true,
            paymentGateway: true
          },
          printing: {
            thermalPrinter: true,
            customTemplates: true,
            autoPrint: true,
            logo: true
          },
          restaurant: {
            tableManagement: true,
            kitchenDisplay: true,
            customTableLayout: true,
            touchscreenMode: true
          },
          integrations: {
            sms: true,
            whatsapp: true,
            email: true,
            paymentGateway: true,
            accounting: true
          },
          support: {
            prioritySupport: true,
            dedicatedAccount: true,
            customization: true
          }
        };
      }

      await queryInterface.sequelize.query(
        'UPDATE "SubscriptionPlans" SET features = :features WHERE id = :id',
        {
          replacements: { features: JSON.stringify(newFeatures), id: plan.id }
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback ke features lama (simple version)
    await queryInterface.sequelize.query(
      'UPDATE "SubscriptionPlans" SET features = \'{"maxUsers": 5, "maxMembers": 100}\''
    );
  }
};
```

### 3. Feature Gate Middleware

Buat middleware baru `featureGateMiddleware.js`:

```javascript
// middlewares/featureGateMiddleware.js
const { Subscription, SubscriptionPlan, Tenant } = require('../models');

/**
 * Middleware untuk validasi akses module
 * @param {string} moduleName - Nama module yang perlu dicek (e.g., 'pos', 'restaurant')
 */
const requireModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Check if tenant has active subscription
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      // Check trial period
      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant.isTrialActive && new Date() < new Date(tenant.trialEndsAt);

      if (!subscription && !isInTrial) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Trial mode: allow all features
      if (isInTrial) {
        return next();
      }

      // Check if module is enabled in plan
      const features = subscription.plan.features || {};
      const moduleAccess = features.modules?.[moduleName];

      if (!moduleAccess) {
        return res.status(403).json({
          success: false,
          message: `Module '${moduleName}' not available in your plan`,
          code: 'MODULE_NOT_AVAILABLE',
          requiredModule: moduleName,
          currentPlan: subscription.plan.name
        });
      }

      // Store features in request for later use
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
 * Middleware untuk validasi feature spesifik
 * @param {string} category - Kategori feature (e.g., 'transactions', 'payments')
 * @param {string} featureName - Nama feature (e.g., 'combinedBilling', 'creditCard')
 */
const requireFeature = (category, featureName) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant.isTrialActive && new Date() < new Date(tenant.trialEndsAt);

      if (!subscription && !isInTrial) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      if (isInTrial) {
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
 * @param {string} limitName - Nama limit yang perlu dicek (e.g., 'maxUsers', 'maxMembers')
 * @param {Function} getCurrentCount - Async function yang return current count
 */
const enforceLimit = (limitName, getCurrentCount) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      
      const subscription = await Subscription.findOne({
        where: { tenantId, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      const tenant = await Tenant.findByPk(tenantId);
      const isInTrial = tenant.isTrialActive && new Date() < new Date(tenant.trialEndsAt);

      if (!subscription && !isInTrial) {
        return res.status(402).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      if (isInTrial) {
        return next();
      }

      const features = subscription.plan.features || {};
      const limit = features.limits?.[limitName];

      // 0 or undefined = unlimited
      if (!limit || limit === 0) {
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
 * (Digunakan di controller untuk conditional logic)
 */
const getSubscriptionFeatures = (req) => {
  return req.subscriptionFeatures || {};
};

/**
 * Helper function untuk check feature di controller
 */
const hasFeature = (req, category, featureName) => {
  const features = req.subscriptionFeatures || {};
  return features[category]?.[featureName] === true;
};

/**
 * Helper function untuk check module di controller
 */
const hasModule = (req, moduleName) => {
  const features = req.subscriptionFeatures || {};
  return features.modules?.[moduleName] === true;
};

module.exports = {
  requireModule,
  requireFeature,
  enforceLimit,
  getSubscriptionFeatures,
  hasFeature,
  hasModule
};
```

### 4. Integrasi dengan Routes

Contoh penggunaan di routes:

```javascript
// routes/v1/posRoutes.js (NEW FILE)
const express = require('express');
const router = express.Router();
const posController = require('../../controllers/posController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireModule, requireFeature, enforceLimit } = require('../../middlewares/featureGateMiddleware');
const { Product } = require('../../models');

// Semua routes POS butuh module 'pos'
router.use(authMiddleware.authenticate);
router.use(requireModule('pos'));

// GET all products - basic access
router.get('/products', posController.getAllProducts);

// POST new product - enforce maxProducts limit
router.post('/products', 
  enforceLimit('maxProducts', async (tenantId) => {
    return await Product.count({ where: { tenantId } });
  }),
  posController.createProduct
);

// POST transaction with credit card - require payment feature
router.post('/transactions/credit-card',
  requireFeature('payments', 'creditCard'),
  posController.processCreditCardTransaction
);

module.exports = router;
```

```javascript
// routes/v1/transactionRoutes.js (EXISTING - UPDATE)
const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/transactionController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireFeature, hasFeature } = require('../../middlewares/featureGateMiddleware');

router.use(authMiddleware.authenticate);

// Regular transaction - available for all
router.post('/transactions', transactionController.createTransaction);

// Combined billing - requires feature
router.post('/transactions/combined',
  requireFeature('transactions', 'combinedBilling'),
  transactionController.createCombinedTransaction
);

// Installment payment - requires feature
router.post('/transactions/:id/installment',
  requireFeature('transactions', 'installments'),
  transactionController.createInstallment
);

// Refund - requires feature
router.post('/transactions/:id/refund',
  requireFeature('transactions', 'refunds'),
  transactionController.processRefund
);

module.exports = router;
```

### 5. Update Existing Subscription Middleware

Refactor `subscriptionMiddleware.js` untuk compatibility:

```javascript
// middlewares/subscriptionMiddleware.js (UPDATE)
const { Subscription, SubscriptionPlan, Tenant } = require('../models');

/**
 * Validate active subscription (keep existing logic)
 */
const validateSubscription = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check trial
    const isInTrial = tenant.isTrialActive && new Date() < new Date(tenant.trialEndsAt);
    
    if (isInTrial) {
      req.isInTrial = true;
      return next();
    }

    // Check active subscription
    const subscription = await Subscription.findOne({
      where: { tenantId, status: 'active' },
      include: [{ model: SubscriptionPlan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(402).json({
        success: false,
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    req.subscription = subscription;
    req.subscriptionFeatures = subscription.plan.features || {};
    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating subscription'
    });
  }
};

// Keep existing functions for backward compatibility
const checkFeature = (featureName) => {
  return async (req, res, next) => {
    // Deprecated: Use featureGateMiddleware instead
    console.warn('checkFeature is deprecated, use featureGateMiddleware.requireFeature instead');
    next();
  };
};

const enforceUserLimit = async (req, res, next) => {
  // Deprecated: Use featureGateMiddleware.enforceLimit instead
  console.warn('enforceUserLimit is deprecated, use featureGateMiddleware.enforceLimit instead');
  next();
};

module.exports = {
  validateSubscription,
  checkFeature,
  enforceUserLimit
};
```

---

## 📝 Implementation Checklist

### Week 1: Foundation & Middleware

- [ ] **Day 1-2: Schema Design & Migration**
  - [ ] Finalize `features` JSON schema
  - [ ] Create migration untuk update existing SubscriptionPlans
  - [ ] Seed database dengan 3 plans: Basic, Professional, Enterprise
  - [ ] Test migration up/down

- [ ] **Day 3-4: Feature Gate Middleware**
  - [ ] Implement `requireModule()` function
  - [ ] Implement `requireFeature()` function
  - [ ] Implement `enforceLimit()` function
  - [ ] Implement helper functions (hasFeature, hasModule, etc.)
  - [ ] Unit tests untuk middleware (trial mode, active subscription, expired subscription)

- [ ] **Day 5: Integration with Existing System**
  - [ ] Update `subscriptionMiddleware.js` untuk compatibility
  - [ ] Add `req.subscriptionFeatures` ke existing validateSubscription
  - [ ] Test integration dengan existing routes

### Week 2: Route Implementation & Testing

- [ ] **Day 6-7: Apply to Routes**
  - [ ] Update transaction routes dengan feature gates
  - [ ] Update user routes dengan limit enforcement
  - [ ] Create new POS routes dengan module gates (placeholder untuk Fase 2)
  - [ ] Create new restaurant routes dengan module gates (placeholder untuk Fase 2)

- [ ] **Day 8: Controller Logic**
  - [ ] Update controllers untuk conditional logic berdasarkan features
  - [ ] Add feature checks di transaction processing
  - [ ] Add feature checks di payment processing

- [ ] **Day 9: Testing**
  - [ ] Integration tests untuk semua feature gates
  - [ ] Test limit enforcement dengan edge cases
  - [ ] Test trial mode override
  - [ ] Test subscription expiry scenarios
  - [ ] Load testing untuk middleware performance

- [ ] **Day 10: Documentation & Deployment**
  - [ ] Update API documentation dengan feature requirements
  - [ ] Create Postman collection dengan examples per plan
  - [ ] Update role-permission documentation
  - [ ] Deploy ke staging
  - [ ] UAT dengan sample tenants

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// tests/middlewares/featureGateMiddleware.test.js
const { requireModule, requireFeature, enforceLimit } = require('../../middlewares/featureGateMiddleware');

describe('Feature Gate Middleware', () => {
  describe('requireModule', () => {
    it('should allow access when module is enabled in plan', async () => {
      // Mock req with tenant who has 'pos' module
      // Assert next() is called
    });

    it('should deny access when module is not in plan', async () => {
      // Mock req with tenant who doesn't have 'pos' module
      // Assert 403 response
    });

    it('should allow access during trial period', async () => {
      // Mock req with tenant in trial
      // Assert next() is called
    });

    it('should require subscription when trial expired', async () => {
      // Mock req with expired trial
      // Assert 402 response
    });
  });

  describe('requireFeature', () => {
    it('should allow access when feature is enabled', async () => {
      // Test
    });

    it('should deny access when feature is disabled', async () => {
      // Test
    });
  });

  describe('enforceLimit', () => {
    it('should allow when under limit', async () => {
      // Test
    });

    it('should deny when at limit', async () => {
      // Test
    });

    it('should allow unlimited when limit is 0', async () => {
      // Test
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/featureGating.test.js
describe('Feature Gating Integration', () => {
  it('should prevent POS access for Basic plan tenant', async () => {
    // Create tenant with Basic plan
    // Attempt to access /api/v1/pos/products
    // Assert 403 response
  });

  it('should allow POS access for Professional plan tenant', async () => {
    // Create tenant with Professional plan
    // Access /api/v1/pos/products
    // Assert 200 response
  });

  it('should enforce maxUsers limit', async () => {
    // Create tenant with Basic plan (maxUsers: 3)
    // Create 3 users
    // Attempt to create 4th user
    // Assert 403 LIMIT_REACHED
  });

  it('should allow all features during trial', async () => {
    // Create tenant in trial mode
    // Access all endpoints (POS, Restaurant, etc.)
    // Assert all succeed
  });
});
```

---

## 📊 Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Product Name"
  }
}
```

### Module Not Available
```json
{
  "success": false,
  "message": "Module 'pos' not available in your plan",
  "code": "MODULE_NOT_AVAILABLE",
  "requiredModule": "pos",
  "currentPlan": "Basic"
}
```

### Feature Not Available
```json
{
  "success": false,
  "message": "Feature 'combinedBilling' not available in your plan",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredFeature": "transactions.combinedBilling",
  "currentPlan": "Professional"
}
```

### Limit Reached
```json
{
  "success": false,
  "message": "maxUsers limit reached",
  "code": "LIMIT_REACHED",
  "limit": 5,
  "current": 5,
  "currentPlan": "Basic"
}
```

### Subscription Required
```json
{
  "success": false,
  "message": "Subscription required",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

---

## 🎨 Frontend Integration

Frontend perlu menangani error codes dan menampilkan upgrade prompt:

```javascript
// Example frontend handling
try {
  const response = await api.post('/transactions/combined', data);
} catch (error) {
  if (error.response?.data?.code === 'MODULE_NOT_AVAILABLE') {
    // Show upgrade modal
    showUpgradeModal({
      message: error.response.data.message,
      requiredModule: error.response.data.requiredModule,
      currentPlan: error.response.data.currentPlan
    });
  } else if (error.response?.data?.code === 'LIMIT_REACHED') {
    // Show limit reached modal
    showLimitModal({
      message: error.response.data.message,
      limit: error.response.data.limit,
      current: error.response.data.current
    });
  }
}
```

---

## 🔄 Migration Path

### Existing Tenants
1. Semua existing tenant akan di-assign ke plan sesuai dengan current subscription mereka
2. Jika belum ada subscription, default ke "Basic" plan
3. Trial tenants tetap bisa akses semua features sampai trial expired

### Rollback Plan
Jika terjadi critical issue:
1. Disable feature gate middleware di routes (comment out)
2. Rollback migration jika perlu
3. Existing functionality tetap jalan karena backward compatible

---

## 📈 Success Metrics

### Technical Metrics
- Middleware overhead < 10ms per request
- Zero false positives (allow when should deny)
- Zero false negatives (deny when should allow)

### Business Metrics
- Clear upgrade path untuk tenants
- Reduced support tickets tentang "feature not working" (karena clear error messages)
- Increased conversion dari Basic ke Professional plan

---

## 🚀 Next Steps After Fase 1

Setelah feature-gating implemented:
1. **Fase 2** dapat dimulai dengan confidence bahwa POS module hanya accessible untuk tenant yang eligible
2. **Fase 3** thermal printing sudah ter-gate dengan `printing.thermalPrinter` feature
3. **Fase 4** restaurant UI sudah ter-gate dengan `restaurant.touchscreenMode` feature

---

## 📚 Referensi

- [Subscription Middleware Existing](../../src/middlewares/subscriptionMiddleware.js)
- [SubscriptionPlan Model](../../src/models/subscriptionPlan.js)
- [CASL Middleware](../../src/middlewares/caslMiddleware.js) - Untuk pattern reference

---

**Status Update**: Ready for implementation ✅

**Next**: [PHASE-02-POS-RESTAURANT.md](./PHASE-02-POS-RESTAURANT.md)
