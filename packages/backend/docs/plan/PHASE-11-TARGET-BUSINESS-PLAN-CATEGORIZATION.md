# Phase 11: Target Business Plan Categorization

## Overview

Menambahkan sistem kategorisasi subscription plan berdasarkan target bisnis (gym, restaurant, psychology, clinic, multi). Ini memungkinkan filtering plan yang relevan untuk tenant berdasarkan jenis bisnis mereka tanpa membatasi upgrade path.

## Business Problem

Saat ini semua subscription plan ditampilkan ke semua tenant, meskipun tenant gym tidak memerlukan fitur restaurant. Ini menyebabkan:
- UX yang membingungkan bagi tenant baru
- Plan yang tidak relevan ditampilkan
- Sulit untuk membuat pricing strategy per segmen bisnis

## Solution: Plan Categorization dengan `targetBusiness`

### Konsep Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION PLANS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  targetBusiness: 'gym'                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Gym Basic   │  │ Gym Pro     │  │ Gym Enter.  │             │
│  │ Rp 99.000   │  │ Rp 199.000  │  │ Rp 499.000  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  targetBusiness: 'restaurant'                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Resto Basic │  │ Resto Pro   │  │ Resto Enter.│             │
│  │ Rp 149.000  │  │ Rp 299.000  │  │ Rp 599.000  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  targetBusiness: 'psychology'                                   │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Psych Basic │  │ Psych Pro   │                               │
│  │ Rp 199.000  │  │ Rp 399.000  │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                  │
│  targetBusiness: 'multi' (All-in-One)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Multi Basic │  │ Multi Pro   │  │ Multi Enter.│             │
│  │ Rp 299.000  │  │ Rp 499.000  │  │ Rp 999.000  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Keuntungan Pendekatan Ini

| Aspek | Benefit |
|-------|---------|
| **No Breaking Changes** | Existing plans tetap bekerja (default: 'all') |
| **Flexible Upgrade** | Tenant bisa pindah dari gym plan ke multi plan |
| **Clear Pricing** | Harga per segmen bisnis lebih masuk akal |
| **Better UX** | Tenant hanya lihat plan yang relevan |
| **Marketing Ready** | Bisa target marketing per segmen |

---

## Database Schema

### Migration: Add targetBusiness to SubscriptionPlans

```javascript
// migrations/YYYYMMDDHHMMSS-add-target-business-to-subscription-plans.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add targetBusiness column
    await queryInterface.addColumn('SubscriptionPlans', 'targetBusiness', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'all',
      comment: 'Target business type: gym, restaurant, psychology, clinic, multi, all'
    });

    // Add index for filtering
    await queryInterface.addIndex('SubscriptionPlans', ['targetBusiness'], {
      name: 'idx_subscription_plans_target_business'
    });

    // Add composite index for common queries
    await queryInterface.addIndex('SubscriptionPlans', ['targetBusiness', 'isActive', 'sortOrder'], {
      name: 'idx_subscription_plans_target_active_sort'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('SubscriptionPlans', 'idx_subscription_plans_target_active_sort');
    await queryInterface.removeIndex('SubscriptionPlans', 'idx_subscription_plans_target_business');
    await queryInterface.removeColumn('SubscriptionPlans', 'targetBusiness');
  }
};
```

### Model Update: SubscriptionPlan

```javascript
// models/SubscriptionPlan.js - additions
targetBusiness: {
  type: DataTypes.STRING(50),
  allowNull: false,
  defaultValue: 'all',
  validate: {
    isIn: {
      args: [['gym', 'restaurant', 'psychology', 'clinic', 'multi', 'all']],
      msg: 'targetBusiness must be one of: gym, restaurant, psychology, clinic, multi, all'
    }
  },
  comment: 'Target business type for this plan'
}
```

---

## Target Business Types

| Value | Description | Primary Modules |
|-------|-------------|-----------------|
| `gym` | Fitness centers, gyms | gym, pos, services |
| `restaurant` | Restaurants, cafes | restaurant, pos |
| `psychology` | Psychology clinics | psychology, services |
| `clinic` | Health clinics | psychology, services, gym |
| `multi` | Multi-business (bundle) | All modules |
| `all` | Legacy/universal plans | Depends on plan |

---

## API Changes

### 1. GET /subscription/plans - Add Filter

```javascript
// Query params
GET /api/v1/subscription/plans?targetBusiness=gym
GET /api/v1/subscription/plans?targetBusiness=gym,multi  // Multiple values

// Response
{
  "data": [
    {
      "id": "...",
      "name": "Gym Basic",
      "targetBusiness": "gym",
      "price": "99.99",
      "features": { ... }
    },
    {
      "id": "...",
      "name": "Multi Professional",
      "targetBusiness": "multi",
      "price": "499.99",
      "features": { ... }
    }
  ],
  "pagination": { ... },
  "filters": {
    "targetBusiness": ["gym", "multi"]
  }
}
```

### 2. Controller Update

```javascript
// subscriptionController.js - getSubscriptionPlans
async function getSubscriptionPlans(req, res) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'sortOrder', 
    sortOrder = 'ASC',
    search = '',
    isActive = 'true',
    targetBusiness  // NEW: filter by target business
  } = req.query;

  const whereClause = {};

  // Filter by targetBusiness
  if (targetBusiness) {
    const targets = targetBusiness.split(',').map(t => t.trim());
    // Always include 'all' plans as they're universal
    whereClause.targetBusiness = {
      [Op.in]: [...targets, 'all']
    };
  }

  // ... rest of query
}
```

### 3. POST /subscription/plans - Create with targetBusiness

```javascript
// Request body
{
  "name": "Gym Professional",
  "description": "For growing fitness businesses",
  "price": 199.99,
  "duration": 30,
  "targetBusiness": "gym",  // NEW
  "features": {
    "modules": {
      "gym": true,
      "pos": true,
      "restaurant": false,
      "psychology": false
    },
    // ... other features
  }
}
```

---

## Feature Registry Update

### Add targetBusiness to Plan Configurations

```javascript
// src/utils/featureRegistry.js

const PLAN_CONFIGURATIONS = {
  // GYM PLANS
  'Gym Basic': {
    targetBusiness: 'gym',
    price: 99.99,
    duration: 30,
    sortOrder: 10,
    description: 'Essential features for small gyms',
    features: {
      modules: { gym: true, pos: true, restaurant: false, psychology: false },
      limits: { maxMembers: 100, maxUsers: 3 }
    }
  },
  'Gym Professional': {
    targetBusiness: 'gym',
    price: 199.99,
    duration: 30,
    sortOrder: 11,
    description: 'Advanced features for growing gyms',
    features: {
      modules: { gym: true, pos: true, restaurant: false, psychology: false },
      limits: { maxMembers: 500, maxUsers: 10 }
    }
  },
  
  // RESTAURANT PLANS
  'Restaurant Basic': {
    targetBusiness: 'restaurant',
    price: 149.99,
    duration: 30,
    sortOrder: 20,
    description: 'Essential POS for restaurants',
    features: {
      modules: { gym: false, pos: true, restaurant: true, psychology: false },
      limits: { maxTables: 10, maxProducts: 100 }
    }
  },
  
  // PSYCHOLOGY PLANS
  'Psychology Basic': {
    targetBusiness: 'psychology',
    price: 199.99,
    duration: 30,
    sortOrder: 30,
    description: 'Psychology testing platform',
    features: {
      modules: { gym: false, pos: false, restaurant: false, psychology: true },
      limits: { maxPsychologists: 5 }
    }
  },
  
  // MULTI/BUNDLE PLANS
  'Multi Professional': {
    targetBusiness: 'multi',
    price: 499.99,
    duration: 30,
    sortOrder: 50,
    description: 'All-in-one business solution',
    features: {
      modules: { gym: true, pos: true, restaurant: true, psychology: true },
      limits: { maxMembers: 500, maxTables: 20, maxProducts: 500 }
    }
  },
  
  // LEGACY PLANS (backward compatible)
  'Basic': {
    targetBusiness: 'all',  // Shows to everyone
    price: 99.99,
    // ...existing config
  },
  'Professional': {
    targetBusiness: 'all',
    price: 199.99,
    // ...existing config
  },
  'Enterprise': {
    targetBusiness: 'all',
    price: 499.99,
    // ...existing config
  }
};
```

### Get Available Target Businesses

```javascript
// New function in featureRegistry.js
function getAvailableTargetBusinesses() {
  return [
    { value: 'gym', label: 'Gym & Fitness', icon: 'mdi-dumbbell' },
    { value: 'restaurant', label: 'Restaurant & Cafe', icon: 'mdi-silverware-fork-knife' },
    { value: 'psychology', label: 'Psychology Clinic', icon: 'mdi-brain' },
    { value: 'clinic', label: 'Health Clinic', icon: 'mdi-hospital-building' },
    { value: 'multi', label: 'Multi-Business', icon: 'mdi-view-grid' },
    { value: 'all', label: 'Universal', icon: 'mdi-all-inclusive' }
  ];
}

module.exports = {
  // ...existing exports
  getAvailableTargetBusinesses
};
```

---

## Frontend Integration

### Business Type Selection Flow

```
┌────────────────────────────────────────────────────────────┐
│                    WELCOME TO GYMAPP                        │
│                                                             │
│   What type of business are you?                           │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │   🏋️ GYM    │  │ 🍽️ RESTO   │  │  🧠 PSYCH   │       │
│   │   Fitness   │  │  Restaurant │  │  Psychology │       │
│   │   Center    │  │    & Cafe   │  │   Clinic    │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐                         │
│   │  🏥 CLINIC  │  │  📦 MULTI   │                         │
│   │   Health    │  │  All-in-One │                         │
│   │   Clinic    │  │   Business  │                         │
│   └─────────────┘  └─────────────┘                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│            CHOOSE YOUR GYM PLAN                             │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ GYM BASIC   │  │  GYM PRO    │  │GYM ENTERPRISE│       │
│   │  Rp 99.000  │  │ Rp 199.000  │  │  Rp 499.000  │       │
│   │             │  │             │  │              │       │
│   │ ✓ 100 members│ │ ✓ 500 members│ │ ✓ Unlimited  │       │
│   │ ✓ 3 users   │  │ ✓ 10 users  │  │ ✓ Unlimited  │       │
│   │ ✓ Basic POS │  │ ✓ Full POS  │  │ ✓ All features│      │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│   💡 Want more? Check out our Multi-Business plans →       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Vue.js Implementation Example

```javascript
// composables/useSubscriptionPlans.js
import { ref, computed } from 'vue'
import { api } from '@/services/api'

export function useSubscriptionPlans() {
  const plans = ref([])
  const selectedBusinessType = ref(null)
  const loading = ref(false)

  const filteredPlans = computed(() => {
    if (!selectedBusinessType.value) return plans.value
    return plans.value.filter(p => 
      p.targetBusiness === selectedBusinessType.value || 
      p.targetBusiness === 'all'
    )
  })

  async function fetchPlans(targetBusiness = null) {
    loading.value = true
    try {
      const params = {}
      if (targetBusiness) {
        params.targetBusiness = targetBusiness
      }
      const response = await api.get('/subscription/plans', { params })
      plans.value = response.data.data
    } finally {
      loading.value = false
    }
  }

  function selectBusinessType(type) {
    selectedBusinessType.value = type
    fetchPlans(type)
  }

  return {
    plans,
    filteredPlans,
    selectedBusinessType,
    loading,
    fetchPlans,
    selectBusinessType
  }
}
```

---

## Migration Strategy

### Step 1: Add Column with Default

```sql
-- Existing plans get 'all' as default (backward compatible)
ALTER TABLE "SubscriptionPlans" 
ADD COLUMN "targetBusiness" VARCHAR(50) NOT NULL DEFAULT 'all';
```

### Step 2: Update Existing Plans (Optional)

```sql
-- Categorize existing plans based on their features
UPDATE "SubscriptionPlans"
SET "targetBusiness" = 'gym'
WHERE name LIKE '%Gym%' OR (features->'modules'->>'gym' = 'true' AND features->'modules'->>'restaurant' = 'false');

UPDATE "SubscriptionPlans"
SET "targetBusiness" = 'restaurant'
WHERE name LIKE '%Restaurant%' OR name LIKE '%Resto%';

-- Plans with multiple modules = multi
UPDATE "SubscriptionPlans"
SET "targetBusiness" = 'multi'
WHERE features->'modules'->>'gym' = 'true' 
  AND features->'modules'->>'restaurant' = 'true';
```

### Step 3: Create New Categorized Plans

Gunakan endpoint `POST /admin/features/create-missing` atau seed script untuk membuat plan baru per kategori bisnis.

---

## API Endpoints Summary

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/subscription/plans?targetBusiness=gym` | Get plans filtered by business type | Public |
| GET | `/admin/features/target-businesses` | Get available business types | Super Admin |
| POST | `/subscription/plans` | Create plan with targetBusiness | Super Admin |
| PUT | `/subscription/plans/:id` | Update plan targetBusiness | Super Admin |

---

## Testing Checklist

### Unit Tests

- [ ] Filter plans by single targetBusiness
- [ ] Filter plans by multiple targetBusiness values
- [ ] Include 'all' plans in filtered results
- [ ] Validate targetBusiness enum values
- [ ] Create plan with targetBusiness
- [ ] Update plan targetBusiness

### Integration Tests

- [ ] API returns correct plans for targetBusiness filter
- [ ] Existing plans (targetBusiness: 'all') still work
- [ ] Frontend business type selection flow
- [ ] Plan upgrade from gym to multi

### E2E Tests

- [ ] New tenant signup with business type selection
- [ ] Plan filtering matches selected business
- [ ] Upgrade path from specialized to multi plan

---

## Rollback Plan

Jika ada masalah:

1. **Immediate**: Set semua plans ke `targetBusiness = 'all'`
2. **Frontend**: Remove business type filter, show all plans
3. **Database**: Column bisa di-drop karena ada default value

```sql
-- Emergency: Reset all to 'all'
UPDATE "SubscriptionPlans" SET "targetBusiness" = 'all';

-- Or remove column entirely
ALTER TABLE "SubscriptionPlans" DROP COLUMN "targetBusiness";
```

---

## Implementation Order

1. **Migration** - Add targetBusiness column
2. **Model** - Update SubscriptionPlan model
3. **Feature Registry** - Add targetBusiness to PLAN_CONFIGURATIONS
4. **Controller** - Add filter to getSubscriptionPlans
5. **Routes** - No changes needed (existing endpoints)
6. **Seed/Sync** - Update existing plans
7. **API Docs** - Document new filter parameter
8. **Frontend** - Add business type selection flow

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Migration & Model | 1 hour |
| Feature Registry Update | 2 hours |
| Controller & API | 2 hours |
| Testing | 2 hours |
| Frontend Integration | 4 hours |
| Documentation | 1 hour |
| **Total** | **~12 hours** |

---

## Related Documents

- [SUBSCRIPTION-PLAN-PAYLOAD-EXAMPLES.md](../frontend-integration/SUBSCRIPTION-PLAN-PAYLOAD-EXAMPLES.md)
- [FEATURE-GATING-GUIDE.md](../frontend-integration/FEATURE-GATING-GUIDE.md)
- [BILLING-SUBSCRIPTION-FRONTEND.md](../frontend-integration/BILLING-SUBSCRIPTION-FRONTEND.md)
