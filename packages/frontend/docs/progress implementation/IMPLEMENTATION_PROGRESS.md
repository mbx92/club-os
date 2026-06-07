# Subscription Plans Implementation Progress

**Date Started:** November 22, 2025  
**Backend API Version:** v1  
**New Features Structure:** 8 Categories System

---

## 📋 Overview

Implementing the new 8-category features structure for subscription plans as per backend specifications:
- **modules** (6 features) - Module access control
- **limits** (7 features) - Resource limitations  
- **transactions** (5 features) - Transaction capabilities
- **payments** (6 features) - Payment methods
- **printing** (4 features) - Printing features
- **restaurant** (4 features) - Restaurant-specific
- **integrations** (5 features) - Third-party integrations
- **support** (3 features) - Support levels

**Total:** 40 configurable features across 8 categories

---

## ✅ Completed Tasks

### 1. Project Setup
- [x] Created `docs/progress implementation` directory
- [x] Analyzed current codebase structure
- [x] Reviewed backend documentation

---

## 🚧 In Progress

### 1. Code Analysis Phase
- [x] Reviewed `useSubscriptionPlans.js` composable
- [x] Reviewed `plans.vue` page component
- [x] Reviewed `PlanFormModal.vue` component
- [ ] Identify all areas requiring updates

**Findings:**
- Current implementation uses flat `features` object with boolean values
- Missing 8-category structure (modules, limits, transactions, payments, printing, restaurant, integrations, support)
- No integration with `/api/v1/admin/features/metadata` endpoint
- Form modal needs complete redesign for new structure
- Display logic needs update to show categorized features

---

## 📝 Pending Tasks

### 2. Update useSubscriptionPlans.js
- [ ] Add `fetchFeatureMetadata()` method
- [ ] Update `formatFeatures()` to handle 8 categories
- [ ] Add category-specific formatting utilities
- [ ] Add validation for new features structure
- [ ] Add helper methods for feature checking

### 3. Redesign PlanFormModal.vue
- [ ] Replace flat features list with 8-category accordion/tabs
- [ ] Implement dynamic form building using metadata
- [ ] Add category-specific sections:
  - [ ] Modules (checkboxes)
  - [ ] Limits (number inputs with 0=unlimited)
  - [ ] Transactions (checkboxes)
  - [ ] Payments (checkboxes)
  - [ ] Printing (checkboxes)
  - [ ] Restaurant (checkboxes)
  - [ ] Integrations (checkboxes)
  - [ ] Support (checkboxes)
- [ ] Add visual indicators (icons, descriptions)
- [ ] Update form validation for new structure
- [ ] Maintain backward compatibility

### 4. Update plans.vue Display
- [ ] Update features column to show categorized view
- [ ] Add tooltip/modal for detailed features view
- [ ] Update feature count display
- [ ] Add category badges/chips
- [ ] Implement collapsible features display

### 5. API Integration
- [ ] Add feature metadata caching
- [ ] Implement `GET /api/v1/admin/features/metadata`
- [ ] Add error handling for metadata fetch
- [ ] Add loading states

### 6. Testing & Validation
- [ ] Test create plan with new structure
- [ ] Test update plan (partial & full)
- [ ] Test backward compatibility
- [ ] Test form validation
- [ ] Test display rendering

### 7. Documentation
- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Document breaking changes
- [ ] Create migration guide

---

## 🔄 Changes Required

### File: `src/composables/useSubscriptionPlans.js`

#### Add New Methods:
```javascript
// Fetch feature metadata from backend
const fetchFeatureMetadata = async () => { ... }

// Format features by category
const formatFeaturesByCategory = (features) => { ... }

// Get feature count by category
const getFeatureCounts = (features) => { ... }

// Check if feature is enabled
const isFeatureEnabled = (features, category, feature) => { ... }

// Get all enabled features as flat array
const getEnabledFeatures = (features) => { ... }
```

#### Update Existing Methods:
- `formatFeatures()` - Update to handle nested structure
- `validatePlanData()` - Add validation for 8 categories

---

### File: `src/components/subscription/PlanFormModal.vue`

#### Complete Redesign Needed:

**New Structure:**
```vue
<template>
  <!-- Basic Info Section (unchanged) -->
  
  <!-- Pricing & Limits (move limits to features section) -->
  
  <!-- Features Section (NEW) -->
  <div class="features-section">
    <!-- Category: Modules -->
    <div class="category-section">
      <h5>Modules</h5>
      <div class="grid">
        <label v-for="module in modules">
          <input type="checkbox" v-model="formData.features.modules[module.key]">
          {{ module.label }}
        </label>
      </div>
    </div>
    
    <!-- Category: Limits -->
    <div class="category-section">
      <h5>Limits</h5>
      <div class="grid">
        <div v-for="limit in limits">
          <label>{{ limit.label }}</label>
          <input type="number" v-model="formData.features.limits[limit.key]">
          <span>0 = unlimited</span>
        </div>
      </div>
    </div>
    
    <!-- Repeat for other 6 categories -->
  </div>
</template>
```

**Features Object Structure:**
```javascript
formData.value = {
  name: '',
  description: '',
  price: null,
  duration: 30,
  sortOrder: 0,
  isActive: true,
  features: {
    modules: {
      gym: false,
      pos: false,
      restaurant: false,
      classes: false,
      reports: false,
      advancedReports: false
    },
    limits: {
      maxUsers: 0,
      maxMembers: 0,
      maxProducts: 0,
      maxLocations: 0,
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
      cash: false,
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
      email: false,
      paymentGateway: false,
      accounting: false
    },
    support: {
      prioritySupport: false,
      dedicatedAccount: false,
      customization: false
    }
  }
}
```

---

### File: `src/pages/subscription/plans.vue`

#### Features Column Update:
```vue
<!-- OLD -->
<td>
  <div class="badge" v-for="[key] in Object.entries(plan.features)">
    {{ formatFeatureKey(key) }}
  </div>
</td>

<!-- NEW -->
<td>
  <button @click="showFeaturesModal(plan)">
    <span>{{ getEnabledFeaturesCount(plan.features) }} features</span>
    <IconChevronRight />
  </button>
  
  <!-- Or inline badges grouped by category -->
  <div class="features-preview">
    <div v-for="category in featureCategories">
      <span class="badge">{{ category }}: {{ countCategory(plan.features[category]) }}</span>
    </div>
  </div>
</td>
```

---

## 📊 Feature Breakdown

### Category 1: Modules (Boolean) - 6 features
- `gym` - Gym membership management
- `pos` - Point of Sale system
- `restaurant` - Restaurant management
- `classes` - Class scheduling
- `reports` - Basic reporting
- `advancedReports` - Advanced analytics

### Category 2: Limits (Number, 0=unlimited) - 7 features
- `maxUsers` - Maximum staff users
- `maxMembers` - Maximum gym members
- `maxProducts` - Maximum POS products
- `maxLocations` - Maximum locations
- `maxPrinters` - Maximum printers
- `maxTables` - Maximum restaurant tables
- `maxIntegrations` - Maximum integrations

### Category 3: Transactions (Boolean) - 5 features
- `combinedBilling` - Combined billing
- `installments` - Installment payments
- `vouchers` - Voucher system
- `loyaltyPoints` - Loyalty points
- `refunds` - Refund processing

### Category 4: Payments (Boolean) - 6 features
- `cash` - Cash payments
- `creditCard` - Credit card
- `bankTransfer` - Bank transfer
- `eWallet` - E-wallet
- `qris` - QRIS
- `paymentGateway` - Payment gateway

### Category 5: Printing (Boolean) - 4 features
- `thermalPrinter` - Thermal printer support
- `customTemplates` - Custom templates
- `autoPrint` - Auto-print
- `logo` - Custom logo

### Category 6: Restaurant (Boolean) - 4 features
- `tableManagement` - Table management
- `kitchenDisplay` - Kitchen display
- `customTableLayout` - Custom layout
- `touchscreenMode` - Touchscreen mode

### Category 7: Integrations (Boolean) - 5 features
- `sms` - SMS notifications
- `whatsapp` - WhatsApp
- `email` - Email
- `paymentGateway` - Payment gateway
- `accounting` - Accounting software

### Category 8: Support (Boolean) - 3 features
- `prioritySupport` - Priority support
- `dedicatedAccount` - Dedicated account
- `customization` - Custom development

---

## 🔗 API Endpoints to Integrate

### New Endpoints:
1. `GET /api/v1/admin/features/metadata` - Get feature definitions
2. `GET /api/v1/admin/features/preview/:planName` - Preview features
3. `POST /api/v1/admin/features/sync` - Sync features
4. `GET /api/v1/admin/features/health` - Check sync status

### Existing Endpoints (ensure compatibility):
1. `GET /api/v1/billing/plans` - List plans
2. `GET /api/v1/billing/plans/:id` - Get plan
3. `POST /api/v1/billing/plans` - Create plan
4. `PUT /api/v1/billing/plans/:id` - Update plan
5. `DELETE /api/v1/billing/plans/:id` - Delete plan

---

## ⚠️ Breaking Changes

### Backward Compatibility Notes:
- Old flat `features` object still supported
- `maxUsers` and `maxMembers` available at root level
- New structure uses `features.limits.maxUsers`
- Forms should default to new structure
- Display should handle both old and new formats

---

## 🎯 Next Steps

1. **Immediate (Today):**
   - [ ] Update useSubscriptionPlans.js with new methods
   - [ ] Start PlanFormModal redesign

2. **Short-term (This Week):**
   - [ ] Complete modal form with all 8 categories
   - [ ] Update plans.vue display
   - [ ] Integrate feature metadata endpoint

3. **Testing:**
   - [ ] Create test plans with new structure
   - [ ] Verify backward compatibility
   - [ ] Test all CRUD operations

---

## 📚 Reference Documents

- `docs/Backend Intructions/BILLING-SUBSCRIPTION-FRONTEND.md` - Complete API docs
- `docs/Backend Intructions/SUBSCRIPTION-PLAN-PAYLOAD-EXAMPLES.md` - Payload examples
- Backend Feature Registry - 40 features across 8 categories

---

## 💡 Design Decisions

### Form Layout:
- Use accordion/collapse for 8 categories
- Each category has distinct section
- Visual indicators (icons) for each feature
- Inline help text for complex features

### Data Management:
- Cache feature metadata on load
- Default all booleans to false
- Default all limits to 0 (unlimited)
- Validate before submit

### Display Strategy:
- Show feature count by category
- Expandable details modal
- Category badges with counts
- Color coding by feature type

---

**Last Updated:** November 22, 2025, 00:00 UTC
**Status:** Initial analysis complete, ready to implement
