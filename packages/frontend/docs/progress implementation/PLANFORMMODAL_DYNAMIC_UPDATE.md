# PlanFormModal - Dynamic Feature Update

## 🎯 Problem Yang Diselesaikan

**BEFORE**: Modal hardcode semua feature categories dan inputs. Ketika backend menambah feature baru, frontend harus manual update code.

**AFTER**: Modal fetch metadata dari endpoint `/admin/features/metadata` dan generate form fields secara dinamis.

---

## ✨ Key Changes

### 1. **Dynamic Import dari Composable**
```vue
import { useSubscriptionPlans } from "@/composables/useSubscriptionPlans";

const {
  featureMetadata,        // Metadata dari backend
  metadataLoading,        // Loading state
  fetchFeatureMetadata,   // Fetch metadata
  getDefaultFeatures,     // Get default structure
  formatFeatureKey,       // Format labels
  isSuperAdmin
} = useSubscriptionPlans();
```

### 2. **Fetch Metadata on Modal Open**
```javascript
const openModal = async () => {
  errors.value = {};
  await loadMetadata(); // ← Fetch before opening
  modal.value?.showModal();
};

const loadMetadata = async () => {
  if (isSuperAdmin()) {
    try {
      await fetchFeatureMetadata();
      if (featureMetadata.value && featureMetadata.value.length > 0) {
        categoriesData.value = featureMetadata.value;
      }
    } catch (error) {
      console.warn('Could not load feature metadata, using fallback');
    }
  }
  initializeExpandedCategories();
}
```

### 3. **Dynamic Form Rendering**
```vue
<template>
  <!-- Loop through metadata categories -->
  <div v-for="category in categoriesData" :key="category.name">
    <div>{{ category.icon }} {{ category.label }} ({{ count }}/{{ total }})</div>
    
    <!-- Loop through features in category -->
    <template v-for="feature in category.features" :key="feature.key">
      <!-- Boolean checkbox -->
      <label v-if="feature.type === 'boolean'">
        <input type="checkbox" v-model="formData.features[category.name][feature.key]" />
        {{ feature.label }}
      </label>
      
      <!-- Number input for limits -->
      <div v-else-if="feature.type === 'number'">
        <input type="number" v-model.number="formData.features[category.name][feature.key]" />
      </div>
    </template>
  </div>
</template>
```

### 4. **Fallback Support**
Jika metadata gagal di-load atau user bukan Super Admin, form tetap berfungsi dengan struktur hardcoded fallback dari `getDefaultFeatures()`.

```vue
<template v-else>
  <!-- Static fallback -->
  <div v-for="categoryName in Object.keys(formData.features)">
    <!-- Render dari existing formData structure -->
  </div>
</template>
```

---

## 🔄 Data Flow

```
┌─────────────────┐
│ Modal Opens     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ loadMetadata()          │
│ - Check isSuperAdmin    │
│ - Fetch metadata        │
│ - Initialize categories │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐     ┌─────────────────────┐
│ featureMetadata loaded?      │────>│ YES: Dynamic render │
│                              │     │ from metadata       │
└────────┬─────────────────────┘     └─────────────────────┘
         │
         │ NO
         ▼
┌─────────────────────┐
│ Fallback: Static    │
│ render from         │
│ getDefaultFeatures()│
└─────────────────────┘
```

---

## 📦 Backend Metadata Structure

Endpoint: `GET /api/v1/admin/features/metadata`

```json
{
  "categories": [
    {
      "name": "modules",
      "label": "Modules",
      "icon": "📦",
      "features": [
        {
          "key": "gym",
          "label": "Gym Management",
          "type": "boolean",
          "description": "Manage gym memberships"
        },
        {
          "key": "newModule",  // ← Backend adds new feature
          "label": "New Module",
          "type": "boolean"
        }
      ]
    },
    {
      "name": "limits",
      "label": "Resource Limits",
      "icon": "📊",
      "features": [
        {
          "key": "maxUsers",
          "label": "Max Users",
          "type": "number",
          "description": "0 = unlimited"
        }
      ]
    }
  ]
}
```

---

## ✅ Benefits

1. **Auto-Update**: Backend menambah feature → Frontend otomatis show tanpa code changes
2. **Centralized Source of Truth**: Metadata dari backend jadi single source
3. **Backward Compatible**: Fallback ke struktur lama jika metadata unavailable
4. **Type-Safe**: Support boolean (checkbox) dan number (input) types
5. **Super Admin Only**: Metadata fetch hanya untuk Super Admin (security)

---

## 🧪 Testing

### Test Case 1: Metadata Loaded
1. Login sebagai Super Admin
2. Open PlanFormModal
3. ✅ Should see dynamic categories from backend metadata
4. ✅ Should see all features with proper labels
5. ✅ New features from backend should appear automatically

### Test Case 2: Metadata Failed / Not Super Admin
1. Login sebagai Tenant Admin
2. Open PlanFormModal
3. ✅ Should see static fallback categories
4. ✅ Form should work normally with hardcoded structure
5. ✅ No errors in console

### Test Case 3: Edit Existing Plan
1. Open modal to edit a plan
2. ✅ Plan data should populate correctly
3. ✅ All existing features should show as enabled/disabled
4. ✅ New features (not in plan) should default to false/0

---

## 📝 Notes

- `getDefaultFeatures()` sekarang berasal dari composable, bukan hardcoded di modal
- Metadata di-cache di composable level (tidak fetch ulang setiap modal open)
- `formatFeatureKey()` untuk convert camelCase → Title Case di fallback mode
- Metadata hanya available untuk Super Admin (tenant admin tidak perlu)

---

## 🔗 Related Files

- `src/components/subscription/PlanFormModal.vue` - Modal component (updated)
- `src/composables/useSubscriptionPlans.js` - Composable with metadata methods
- `docs/DYNAMIC_FEATURES_SYSTEM.md` - Full documentation

---

**Status**: ✅ Implemented & Ready for Testing
**Date**: November 23, 2025
