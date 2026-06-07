# Feature Registry System - Quick Reference

## 🎯 What Problem Does This Solve?

**Before**: Setiap add feature baru → Buat migration → Update semua plans → Deploy
**After**: Edit registry → Run sync command (atau klik button di UI) → Done! ✨

---

## 📁 Files Created

```
src/
├── utils/
│   └── featureRegistry.js          # Single source of truth
├── services/
│   └── featureSyncService.js       # Business logic
├── controllers/
│   └── featureSyncController.js    # API endpoints
└── routes/
    └── featureSyncRoutes.js        # Super Admin routes

scripts/
└── syncFeatures.js                 # CLI tool

docs/
└── FEATURE-SYNC-SYSTEM.md          # Full documentation
```

---

## 🚀 Quick Start

### 1. Add New Feature

Edit `src/utils/featureRegistry.js`:
```javascript
modules: {
  // ... existing
  inventory: {
    type: 'boolean',
    default: false,
    label: 'Inventory Management',
    description: 'Track stock & inventory',
    icon: '📦',
    availableIn: ['Enterprise']
  }
}
```

### 2. Sync to Database

**Option A: CLI** (For developers)
```bash
npm run sync:features
```

**Option B: API** (For Super Admin via UI)
```bash
POST /api/v1/admin/features/sync
Authorization: Bearer <super-admin-token>
```

### 3. Use in Code

```javascript
// In routes
router.use(requireModule('inventory'));

// In controllers
if (hasModule(req, 'inventory')) {
  // Feature available
}
```

---

## 📊 API Endpoints (Super Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/features/health` | Check if plans in sync |
| GET | `/api/v1/admin/features/compare` | Compare with registry |
| GET | `/api/v1/admin/features/metadata` | Get all features for UI |
| GET | `/api/v1/admin/features/preview/:plan` | Preview plan features |
| POST | `/api/v1/admin/features/sync` | Sync all plans |
| POST | `/api/v1/admin/features/sync/:planId` | Sync single plan |
| POST | `/api/v1/admin/features/create-missing` | Create missing plans |

---

## 💻 CLI Commands

```bash
# Sync all plans
npm run sync:features

# Compare (dry-run)
npm run sync:features:compare

# Health check
npm run sync:features:health

# Show all features
node scripts/syncFeatures.js --metadata

# Preview specific plan
node scripts/syncFeatures.js --preview Professional
```

---

## 🎨 Frontend Example (Vue.js)

```vue
<template>
  <div>
    <button @click="syncFeatures" :disabled="loading">
      {{ health.healthy ? '✅ In Sync' : '🔄 Sync Features' }}
    </button>
    
    <div v-if="!health.healthy">
      ⚠️ {{ health.outOfSync }} plans need sync
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api/client'

const health = ref({ healthy: true })
const loading = ref(false)

onMounted(async () => {
  const response = await api('/v1/admin/features/health')
  health.value = response.data
})

async function syncFeatures() {
  loading.value = true
  await api('/v1/admin/features/sync', { method: 'POST' })
  const response = await api('/v1/admin/features/health')
  health.value = response.data
  loading.value = false
}
</script>
```

---

## 🔑 Key Benefits

1. ✅ **No Migration** - Add features without database migration
2. ✅ **Dynamic** - Sync anytime via CLI or API
3. ✅ **Safe** - Dry-run mode, health check, validation
4. ✅ **Admin UI** - Super Admin can manage from frontend
5. ✅ **Developer Friendly** - Clear CLI commands
6. ✅ **Future Proof** - Easy to add new features
7. ✅ **Audit Trail** - All sync operations logged
8. ✅ **Backward Compatible** - Won't break existing features

---

## 📚 Full Documentation

See [FEATURE-SYNC-SYSTEM.md](./FEATURE-SYNC-SYSTEM.md) for:
- Complete architecture
- All API endpoints
- Frontend integration examples
- Adding new features guide
- Workflow examples
- Security notes

---

**Questions?** Check the full documentation or run:
```bash
node scripts/syncFeatures.js --help
```
