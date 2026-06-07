# Dynamic Features System - Auto-Update Features

## 🎯 Masalah Yang Diselesaikan

**Sebelumnya:** Jika backend menambah feature baru, Anda harus update code di 2 tempat:
1. ❌ Update `getDefaultFeatures()` di PlanFormModal.vue
2. ❌ Update template HTML untuk tambah input field

**Sekarang:** Backend tambah feature → Frontend otomatis update! ✨

---

## 🚀 Cara Kerja

### 1. Backend Menyediakan Metadata

Endpoint: `GET /api/v1/admin/features/metadata`

Response example:
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
          "description": "Manage gym memberships and members"
        },
        {
          "key": "pos",
          "label": "Point of Sale",
          "type": "boolean"
        }
        // ... more features
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
          "description": "Maximum staff users (0 = unlimited)"
        }
        // ... more limits
      ]
    }
    // ... 6 more categories
  ]
}
```

### 2. Frontend Fetch & Cache

```javascript
// In PlanFormModal.vue atau parent component
import { useSubscriptionPlans } from '@/composables/useSubscriptionPlans'

const { 
  fetchFeatureMetadata, 
  featureMetadata,
  getDefaultFeatures 
} = useSubscriptionPlans()

// Fetch metadata on component mount (optional, has fallback)
onMounted(async () => {
  if (isSuperAdmin()) {
    await fetchFeatureMetadata() // Cache di composable
  }
})
```

### 3. Dynamic Form Generation

```vue
<template>
  <!-- Loop categories dynamically -->
  <div v-for="category in getAllCategories()" :key="category">
    <div class="collapse">
      <div class="collapse-title">
        {{ getCategoryMetadata(category).icon }} 
        {{ getCategoryMetadata(category).label }}
      </div>
      <div class="collapse-content">
        <!-- Loop features dynamically -->
        <div v-for="feature in getCategoryFeatures(category)" :key="feature.key">
          <!-- Boolean input -->
          <label v-if="feature.type === 'boolean'">
            <input 
              type="checkbox" 
              v-model="formData.features[category][feature.key]"
            />
            {{ feature.label }}
          </label>
          
          <!-- Number input -->
          <div v-else-if="feature.type === 'number'">
            <label>{{ feature.label }}</label>
            <input 
              type="number" 
              v-model.number="formData.features[category][feature.key]"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

---

## 📊 Sistem Fallback

### Jika Backend Tidak Tersedia

System tetap bekerja dengan **hardcoded fallback**:

```javascript
const getDefaultFeatures = () => {
  // 1. Try to use metadata (if loaded)
  if (featureMetadata.value && featureMetadata.value.length > 0) {
    // Build dynamically from metadata ✨
    return buildFromMetadata()
  }

  // 2. Fallback to hardcoded (current structure) ✅
  return {
    modules: { gym: false, pos: false, ... },
    limits: { maxUsers: 0, ... },
    // ... rest of categories
  }
}
```

### Keuntungan Fallback:
- ✅ App tetap berfungsi tanpa backend metadata
- ✅ Tidak ada breaking changes
- ✅ Gradual migration
- ✅ Offline support

---

## 🛠️ API Methods

### Methods di `useSubscriptionPlans.js`

#### 1. `getDefaultFeatures()`
Mendapatkan struktur features default.
- Jika metadata loaded → build from metadata
- Jika tidak → use hardcoded fallback

```javascript
const defaults = getDefaultFeatures()
// Returns: { modules: {...}, limits: {...}, ... }
```

#### 2. `getCategoryMetadata(categoryName)`
Mendapatkan metadata category (icon, label, total).

```javascript
const meta = getCategoryMetadata('modules')
// Returns: { icon: '📦', label: 'Modules', total: 6 }
```

#### 3. `getCategoryFeatures(categoryName)`
Mendapatkan list features dalam category.

```javascript
const features = getCategoryFeatures('modules')
// Returns: [
//   { key: 'gym', label: 'Gym Management', type: 'boolean' },
//   { key: 'pos', label: 'Point of Sale', type: 'boolean' },
//   ...
// ]
```

#### 4. `getAllCategories()`
Mendapatkan list semua categories.

```javascript
const categories = getAllCategories()
// Returns: ['modules', 'limits', 'transactions', ...]
```

#### 5. `fetchFeatureMetadata()`
Fetch metadata dari backend (Super Admin only).

```javascript
await fetchFeatureMetadata()
// Stores result in featureMetadata ref
```

---

## 🎨 Implementation Examples

### Example 1: Load Metadata on Mount

```vue
<script setup>
import { onMounted } from 'vue'
import { useSubscriptionPlans } from '@/composables/useSubscriptionPlans'

const { 
  fetchFeatureMetadata, 
  featureMetadata,
  isSuperAdmin 
} = useSubscriptionPlans()

onMounted(async () => {
  if (isSuperAdmin()) {
    try {
      await fetchFeatureMetadata()
      console.log('Features metadata loaded:', featureMetadata.value)
    } catch (error) {
      console.warn('Could not load metadata, using fallback')
    }
  }
})
</script>
```

### Example 2: Dynamic Category Rendering

```vue
<template>
  <div class="features-section">
    <div 
      v-for="categoryName in getAllCategories()" 
      :key="categoryName"
      class="category"
    >
      <!-- Category Header -->
      <div class="category-header">
        <span>{{ getCategoryMetadata(categoryName).icon }}</span>
        <span>{{ getCategoryMetadata(categoryName).label }}</span>
        <span class="badge">
          {{ enabledCount[categoryName] }}/{{ getCategoryMetadata(categoryName).total }}
        </span>
      </div>
      
      <!-- Features in Category -->
      <div class="category-content">
        <div 
          v-for="feature in getCategoryFeatures(categoryName)" 
          :key="feature.key"
          class="feature-item"
        >
          <!-- Checkbox for boolean -->
          <label v-if="feature.type === 'boolean'">
            <input 
              type="checkbox"
              v-model="formData.features[categoryName][feature.key]"
            />
            <span>{{ feature.label }}</span>
            <span v-if="feature.description" class="tooltip">
              {{ feature.description }}
            </span>
          </label>
          
          <!-- Number input for limits -->
          <div v-else-if="feature.type === 'number'">
            <label>{{ feature.label }}</label>
            <input 
              type="number"
              v-model.number="formData.features[categoryName][feature.key]"
              min="0"
            />
            <span class="hint">0 = unlimited</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSubscriptionPlans } from '@/composables/useSubscriptionPlans'

const { 
  getAllCategories,
  getCategoryMetadata,
  getCategoryFeatures
} = useSubscriptionPlans()
</script>
```

### Example 3: Initialize Form with Dynamic Defaults

```javascript
import { ref } from 'vue'
import { useSubscriptionPlans } from '@/composables/useSubscriptionPlans'

const { getDefaultFeatures } = useSubscriptionPlans()

const formData = ref({
  name: '',
  description: '',
  price: null,
  duration: 30,
  features: getDefaultFeatures() // ✨ Auto-fills with all features
})
```

---

## 🔄 Workflow: Adding New Features

### Backend Side:

1. **Update Feature Registry:**
```javascript
// backend/src/config/featureRegistry.js
export const featureRegistry = {
  modules: {
    // ... existing features
    onlineBooking: {  // ✨ NEW FEATURE
      type: 'boolean',
      label: 'Online Booking',
      description: 'Allow members to book classes online'
    }
  }
}
```

2. **Sync ke Database:**
```bash
POST /api/v1/admin/features/sync
```

### Frontend Side:

**TIDAK PERLU UPDATE CODE!** ✨

Frontend akan otomatis:
1. ✅ Fetch metadata baru saat load
2. ✅ Render input field baru di form
3. ✅ Include feature baru di counter
4. ✅ Submit dengan structure yang benar

---

## ⚡ Performance Optimization

### Caching Strategy:

```javascript
// Metadata di-cache di composable level
const featureMetadata = ref(null)
const metadataLoading = ref(false)

const fetchFeatureMetadata = async () => {
  // Only fetch once per session
  if (featureMetadata.value) {
    return featureMetadata.value
  }
  
  metadataLoading.value = true
  try {
    const response = await api.get('/admin/features/metadata')
    featureMetadata.value = response.categories
    return featureMetadata.value
  } finally {
    metadataLoading.value = false
  }
}
```

### When to Fetch:

1. **On app load** (optional, for better UX)
2. **On Super Admin login** (recommended)
3. **Before opening plan form** (lazy load)

```vue
<script setup>
// Option 1: Eager loading (app.js or layout)
onMounted(async () => {
  if (isSuperAdmin()) {
    await fetchFeatureMetadata()
  }
})

// Option 2: Lazy loading (PlanFormModal.vue)
const openModal = async () => {
  if (!featureMetadata.value && isSuperAdmin()) {
    await fetchFeatureMetadata()
  }
  modal.value?.showModal()
}
</script>
```

---

## 🧪 Testing

### Test with Metadata:
```javascript
// Mock metadata response
vi.mock('@/composables/useSubscriptionPlans', () => ({
  useSubscriptionPlans: () => ({
    featureMetadata: ref([
      {
        name: 'modules',
        features: [
          { key: 'gym', label: 'Gym', type: 'boolean' },
          { key: 'newFeature', label: 'New Feature', type: 'boolean' } // NEW!
        ]
      }
    ]),
    getDefaultFeatures: () => ({
      modules: { gym: false, newFeature: false } // Auto-generated
    })
  })
}))
```

### Test Fallback:
```javascript
// Test without metadata (should use hardcoded)
const { getDefaultFeatures } = useSubscriptionPlans()
const defaults = getDefaultFeatures()
expect(defaults.modules.gym).toBe(false)
```

---

## 📈 Migration Path

### Phase 1: Hybrid (Current) ✅
- Keep hardcoded fallback
- Add metadata fetch (optional)
- Both systems work independently

### Phase 2: Metadata Priority 🎯
- Fetch metadata on app load
- Use hardcoded as fallback only
- Log warnings when fallback used

### Phase 3: Pure Metadata (Future)
- Remove hardcoded definitions
- Require metadata endpoint
- Fail gracefully if unavailable

---

## 💡 Best Practices

### 1. Always Provide Fallback
```javascript
const features = getCategoryFeatures('newCategory') || []
```

### 2. Handle Loading States
```vue
<div v-if="metadataLoading">
  <span class="loading">Loading features...</span>
</div>
<div v-else>
  <!-- Render features -->
</div>
```

### 3. Validate Feature Existence
```javascript
watch(() => formData.value.features, (features) => {
  // Ensure all categories exist
  getAllCategories().forEach(category => {
    if (!features[category]) {
      features[category] = {}
    }
  })
}, { deep: true })
```

### 4. Type Safety
```javascript
// Validate feature types
getCategoryFeatures(category).forEach(feature => {
  const value = formData.value.features[category][feature.key]
  if (feature.type === 'boolean' && typeof value !== 'boolean') {
    formData.value.features[category][feature.key] = false
  }
  if (feature.type === 'number' && typeof value !== 'number') {
    formData.value.features[category][feature.key] = 0
  }
})
```

---

## 🎉 Benefits

### Untuk Backend Developer:
- ✅ Tambah feature tanpa koordinasi frontend
- ✅ Self-service feature registry
- ✅ A/B testing features mudah
- ✅ Feature flags support

### Untuk Frontend Developer:
- ✅ Tidak perlu update code untuk feature baru
- ✅ Type-safe dengan TypeScript
- ✅ Auto-complete support
- ✅ Less maintenance

### Untuk Product Team:
- ✅ Faster feature rollout
- ✅ No deployment dependencies
- ✅ Easy experimentation
- ✅ Better feature governance

---

## 🔗 Related Files

- `src/composables/useSubscriptionPlans.js` - Dynamic feature methods
- `src/components/subscription/PlanFormModal.vue` - Form implementation
- `docs/Backend Instructions/BILLING-SUBSCRIPTION-FRONTEND.md` - API docs

---

## 📞 Support

**Q: Backend belum implement metadata endpoint?**  
A: No problem! System akan pakai hardcoded fallback secara otomatis.

**Q: Gimana cara test dynamic features?**  
A: Mock `featureMetadata.value` di test atau temporary hardcode response.

**Q: Performance impact?**  
A: Minimal. Metadata di-fetch sekali per session dan di-cache.

**Q: Bisa mixed mode (sebagian hardcoded, sebagian dynamic)?**  
A: Ya! System sudah support hybrid mode.

---

**Status:** ✅ Implemented  
**Version:** 2.0  
**Date:** November 22, 2025

🎊 **Sekarang features bisa auto-update tanpa code changes!** 🎊
