# Feature Sync System

Sistem untuk mengelola features subscription plans menggunakan **Feature Registry** sebagai single source of truth.

## 📋 Overview

Sistem ini memungkinkan Anda menambah/modify features tanpa perlu migration. Features didefinisikan di `utils/featureRegistry.js` dan dapat di-sync ke database melalui:

1. **CLI Command** (developer)
2. **Super Admin API** (frontend UI)
3. **Startup Script** (auto-sync on deploy)

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  featureRegistry.js             │  ← Single Source of Truth
│  (Features Definition)          │
└────────────────┬────────────────┘
                 │
                 ├─────────────────────────────────┐
                 │                                 │
                 ▼                                 ▼
┌────────────────────────────┐   ┌────────────────────────────┐
│  CLI Script                │   │  Super Admin API           │
│  (Developer Tool)          │   │  (Frontend UI)             │
└────────────┬───────────────┘   └───────────┬────────────────┘
             │                               │
             │                               │
             ▼                               ▼
     ┌───────────────────────────────────────────────┐
     │        FeatureSyncService                     │
     │        (Business Logic)                       │
     └───────────────┬───────────────────────────────┘
                     │
                     ▼
             ┌───────────────┐
             │   Database    │
             │ (SubscriptionPlans)
             └───────────────┘
```

---

## 🚀 Usage

### 1. CLI Commands (Recommended for Developers)

```bash
# Sync all plans
npm run sync:features

# Compare features (dry-run)
npm run sync:features:compare

# Health check
npm run sync:features:health

# Preview features for specific plan
node scripts/syncFeatures.js --preview Professional

# Create missing plans
node scripts/syncFeatures.js --create

# Show all available features
node scripts/syncFeatures.js --metadata
```

### 2. API Endpoints (For Frontend/Super Admin)

**Base URL**: `/api/v1/admin/features`

#### Health Check
```bash
GET /api/v1/admin/features/health
```
Response:
```json
{
  "success": true,
  "data": {
    "healthy": false,
    "totalPlans": 3,
    "inSync": 2,
    "outOfSync": 1,
    "details": [
      {
        "planName": "Professional",
        "inSync": false,
        "differences": [
          {
            "type": "missing_feature",
            "category": "modules",
            "feature": "classes",
            "message": "Feature 'modules.classes' missing in current features"
          }
        ]
      }
    ]
  }
}
```

#### Compare Features (Dry-Run)
```bash
GET /api/v1/admin/features/compare
```

#### Sync All Plans
```bash
POST /api/v1/admin/features/sync
```
Response:
```json
{
  "success": true,
  "message": "Synced 3 plans successfully",
  "data": {
    "synced": [
      {
        "planId": "uuid",
        "planName": "Basic",
        "changed": true
      }
    ],
    "errors": []
  }
}
```

#### Sync Single Plan
```bash
POST /api/v1/admin/features/sync/:planId
```

#### Preview Features
```bash
GET /api/v1/admin/features/preview/Professional
```

#### Get Feature Metadata (For UI Rendering)
```bash
GET /api/v1/admin/features/metadata
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "category": "modules",
      "name": "pos",
      "type": "boolean",
      "label": "Point of Sale",
      "description": "POS system untuk retail & merchandise",
      "icon": "🏪",
      "availableIn": ["Professional", "Enterprise"]
    }
  ]
}
```

---

## ➕ Adding New Features

### Step 1: Update Registry

Edit `src/utils/featureRegistry.js`:

```javascript
const FEATURE_REGISTRY = {
  modules: {
    // ... existing modules
    
    // NEW MODULE
    inventory: {
      type: 'boolean',
      default: false,
      label: 'Inventory Management',
      description: 'Track stock & inventory',
      icon: '📦',
      availableIn: ['Enterprise']
    }
  },
  
  limits: {
    // ... existing limits
    
    // NEW LIMIT
    maxWarehouses: {
      type: 'number',
      default: 0,
      label: 'Maximum Warehouses',
      description: 'Maximum warehouse locations',
      unit: 'warehouses',
      plans: {
        Basic: 0,
        Professional: 1,
        Enterprise: 0 // unlimited
      }
    }
  }
};
```

### Step 2: Sync to Database

**Option A: CLI (Recommended for dev)**
```bash
npm run sync:features
```

**Option B: API (Super Admin UI)**
```bash
POST /api/admin/features/sync
```

### Step 3: Use in Middleware

```javascript
router.use(requireModule('inventory'));
```

**Done!** No migration needed. 🎉

---

## 🔄 Workflow Examples

### Scenario 1: Adding New Module (Developer Workflow)

```bash
# 1. Edit featureRegistry.js (add 'inventory' module)
# 2. Compare changes
npm run sync:features:compare

# 3. Review output
# 4. Sync to database
npm run sync:features

# 5. Verify
npm run sync:features:health
```

### Scenario 2: Super Admin via Frontend

```
1. User opens Admin Panel
2. Click "Feature Management"
3. System calls GET /api/v1/admin/features/health
4. Shows "⚠️ 1 plan out of sync"
5. User clicks "Sync Now" button
6. Frontend calls POST /api/v1/admin/features/sync
7. Success notification
```

### Scenario 3: Deployment Auto-Sync

Add to `src/server.js`:

```javascript
const FeatureSyncService = require('./services/featureSyncService');

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Auto-sync features on startup (production only)
  if (process.env.NODE_ENV === 'production') {
    try {
      const health = await FeatureSyncService.healthCheck();
      if (!health.healthy) {
        console.log('⚠️  Features out of sync, syncing...');
        await FeatureSyncService.syncAllPlans();
        console.log('✓ Features synced');
      }
    } catch (error) {
      console.error('❌ Feature sync failed:', error.message);
    }
  }
});
```

---

## 📊 Feature Types

### Boolean Features
Used for on/off features:
```javascript
pos: {
  type: 'boolean',
  default: false,
  availableIn: ['Professional', 'Enterprise']
}
```

### Number Features (Limits)
Used for quotas/limits:
```javascript
maxUsers: {
  type: 'number',
  default: 5,
  plans: {
    Basic: 3,
    Professional: 10,
    Enterprise: 0  // 0 = unlimited
  }
}
```

---

## 🎨 Frontend Integration Example (Vue.js)

```vue
<template>
  <div class="admin-features">
    <h2>Feature Management</h2>
    
    <div v-if="!health.healthy" class="alert warning">
      ⚠️ {{ health.outOfSync }} plans out of sync
      <button @click="syncAll">Sync Now</button>
    </div>
    
    <div v-else class="alert success">
      ✅ All plans in sync
    </div>
    
    <h3>Available Features</h3>
    <div v-for="category in categories" :key="category">
      <h4>{{ category }}</h4>
      <div v-for="feature in featuresByCategory[category]" :key="feature.name">
        {{ feature.icon }} {{ feature.label }}
        <span class="badge">{{ feature.availableIn.join(', ') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '@/api/client'

const health = ref({ healthy: true, outOfSync: 0 })
const metadata = ref([])

const categories = computed(() => {
  return [...new Set(metadata.value.map(f => f.category))]
})

const featuresByCategory = computed(() => {
  const grouped = {}
  metadata.value.forEach(f => {
    if (!grouped[f.category]) grouped[f.category] = []
    grouped[f.category].push(f)
  })
  return grouped
})

onMounted(async () => {
  health.value = await api('/admin/features/health')
  metadata.value = await api('/admin/features/metadata')
})

async function syncAll() {
  await api('/admin/features/sync', { method: 'POST' })
  health.value = await api('/admin/features/health')
}
</script>
```

---

## ⚠️ Important Notes

1. **No Migration Required**: Features defined in registry can be synced anytime
2. **Backward Compatible**: Existing features won't be removed
3. **Validation**: All features validated against registry schema
4. **Audit Trail**: Sync operations logged
5. **Safe Rollback**: Compare before sync, rollback if needed

---

## 🔒 Security

- All endpoints require **Super Admin** role
- Feature sync operations logged
- Dry-run mode available (`--compare`)
- Health check doesn't modify data

---

## 📚 Related Documentation

- [Feature Gating Guide](../docs/frontend-integration/FEATURE-GATING-GUIDE.md)
- [Subscription Middleware](../src/middlewares/featureGateMiddleware.js)
- [Phase 1 Plan](../docs/plan/PHASE-01-SUBSCRIPTION-FEATURES.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-22
