# QUICK START GUIDE
## Frontend Feature-Gating Integration (Vue.js 3)

**⏱️ Setup Time**: ~30 minutes  
**Stack**: Vue 3 + Composition API + ofetch + Pinia

---

## 📦 Step 1: Install Dependencies (2 min)

```bash
npm install ofetch pinia
```

---

## 🔌 Step 2: Setup API Client (5 min)

Create `src/api/client.js`:

```javascript
import { ofetch } from 'ofetch'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'

export const api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  
  async onRequest({ options }) {
    const authStore = useAuthStore()
    if (authStore.token) {
      options.headers = { ...options.headers, Authorization: `Bearer ${authStore.token}` }
    }
  },
  
  async onResponseError({ response }) {
    const subscriptionStore = useSubscriptionStore()
    const data = response._data
    
    if (response.status === 403) {
      if (data.code === 'MODULE_NOT_AVAILABLE') {
        subscriptionStore.showUpgradeModal({ type: 'module', ...data })
      }
      if (data.code === 'LIMIT_REACHED') {
        subscriptionStore.showLimitModal(data)
      }
    }
  }
})
```

---

## 📦 Step 3: Create Subscription Store (10 min)

Create `src/stores/subscription.js`:

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'

export const useSubscriptionStore = defineStore('subscription', () => {
  const features = ref(null)
  const isTrialActive = ref(false)
  const upgradeModal = ref({ visible: false })
  const limitModal = ref({ visible: false })
  
  const hasModule = computed(() => (moduleName) => {
    if (isTrialActive.value) return true
    return features.value?.modules?.[moduleName] === true
  })
  
  const hasFeature = computed(() => (category, featureName) => {
    if (isTrialActive.value) return true
    return features.value?.[category]?.[featureName] === true
  })
  
  async function fetchSubscription() {
    const response = await api('/subscription/current')
    features.value = response.data.features
    isTrialActive.value = response.data.isTrialActive
  }
  
  function showUpgradeModal(payload) {
    upgradeModal.value = { visible: true, ...payload }
  }
  
  function showLimitModal(payload) {
    limitModal.value = { visible: true, ...payload }
  }
  
  return { 
    features, isTrialActive, upgradeModal, limitModal,
    hasModule, hasFeature, fetchSubscription, 
    showUpgradeModal, showLimitModal 
  }
})
```

---

## 🎣 Step 4: Create Composable (5 min)

Create `src/composables/useFeatureGate.js`:

```javascript
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

export function useFeatureGate() {
  const subscriptionStore = useSubscriptionStore()
  
  const canAccessModule = (moduleName) => {
    return computed(() => subscriptionStore.hasModule.value(moduleName))
  }
  
  const canUseFeature = (category, featureName) => {
    return computed(() => subscriptionStore.hasFeature.value(category, featureName))
  }
  
  return { canAccessModule, canUseFeature }
}
```

---

## 🎨 Step 5: Create Modal Components (5 min)

Copy from full guide:
- `src/components/UpgradeModal.vue`
- `src/components/LimitModal.vue`
- `src/components/FeatureGuard.vue`

See [FEATURE-GATING-GUIDE.md](./FEATURE-GATING-GUIDE.md#ui-components)

---

## 🚀 Step 6: Initialize in App.vue (3 min)

```vue
<!-- src/App.vue -->
<script setup>
import { onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import UpgradeModal from '@/components/UpgradeModal.vue'
import LimitModal from '@/components/LimitModal.vue'

const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await subscriptionStore.fetchSubscription()
  }
})
</script>

<template>
  <RouterView />
  <UpgradeModal />
  <LimitModal />
</template>
```

---

## ✅ Step 7: Usage Examples

### A. Protected Route

```javascript
// router/index.js
router.beforeEach((to, from, next) => {
  const subscriptionStore = useSubscriptionStore()
  
  if (to.meta.requiresModule) {
    const hasAccess = subscriptionStore.hasModule.value(to.meta.requiresModule)
    if (!hasAccess) {
      subscriptionStore.showUpgradeModal({
        type: 'module',
        module: to.meta.requiresModule
      })
      return next(false)
    }
  }
  
  next()
})
```

### B. Conditional UI

```vue
<template>
  <FeatureGuard module="pos">
    <POSModule />
  </FeatureGuard>
</template>
```

### C. Disabled Button

```vue
<template>
  <button :disabled="!canAccessPOS">
    POS Sale
    <span v-if="!canAccessPOS">🔒</span>
  </button>
</template>

<script setup>
import { useFeatureGate } from '@/composables/useFeatureGate'

const { canAccessModule } = useFeatureGate()
const canAccessPOS = canAccessModule('pos')
</script>
```

### D. API Call with Error Handling

```vue
<script setup>
import { api } from '@/api/client'

async function createTransaction() {
  try {
    await api('/transactions/combined', {
      method: 'POST',
      body: { /* ... */ }
    })
  } catch (error) {
    // Modal automatically shown by interceptor
    console.log('Transaction failed')
  }
}
</script>
```

---

## 🧪 Testing Checklist

- [ ] Install dependencies
- [ ] Create API client with interceptor
- [ ] Create subscription store
- [ ] Create composable
- [ ] Create modal components
- [ ] Mount modals in App.vue
- [ ] Fetch subscription on app mount
- [ ] Test protected route (should redirect)
- [ ] Test disabled button (should show lock icon)
- [ ] Test API call error (should show modal)
- [ ] Test trial mode (should allow all features)

---

## 📚 Full Documentation

See [FEATURE-GATING-GUIDE.md](./FEATURE-GATING-GUIDE.md) for:
- Detailed API reference
- All UI components code
- Advanced usage examples
- Best practices
- Troubleshooting

---

## 🆘 Common Issues

### Modal Not Showing?
- Check `UpgradeModal` mounted in App.vue
- Check interceptor added to API client
- Check store imported correctly

### Features Always Null?
- Check `fetchSubscription()` called on mount
- Check API endpoint returns correct format
- Check authentication token valid

### Trial Not Working?
- Backend must return `isTrialActive: true`
- Check trial date still valid
- Check composable: `if (isTrialActive.value) return true`

---

**Setup Complete!** 🎉

Your frontend now handles feature-gating gracefully.

**Next**: Test with different subscription plans to verify all flows work correctly.
