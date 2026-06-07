# Feature Gating - Quick Reference

Panduan singkat untuk menggunakan feature gating system.

---

## 🚀 Quick Start

### 1. Protect a Route

```javascript
// src/router/index.js atau route definition
{
  path: '/pos',
  component: POSView,
  meta: {
    requiresModule: 'pos'  // Auto-check saat navigasi
  }
}
```

### 2. Conditional Rendering

```vue
<template>
  <!-- Option 1: Hide if not available -->
  <FeatureGuard module="pos">
    <POSComponent />
  </FeatureGuard>
  
  <!-- Option 2: Check in v-if -->
  <div v-if="canAccessPOS">
    <POSComponent />
  </div>
  
  <!-- Option 3: Disable button -->
  <button :disabled="!canAccessPOS">
    Open POS
  </button>
</template>

<script setup>
import { useFeatureGate } from '@/composables/useFeatureGate'

const { canAccessModule } = useFeatureGate()
const canAccessPOS = canAccessModule('pos')
</script>
```

### 3. Check in Logic

```javascript
import { useFeatureGate } from '@/composables/useFeatureGate'

const { canAccessModule, canUseFeature, getLimit } = useFeatureGate()

// Check module
if (canAccessModule('pos').value) {
  // User dapat akses POS
}

// Check feature
if (canUseFeature('transactions', 'combinedBilling').value) {
  // User dapat pakai combined billing
}

// Check limit
const maxUsers = getLimit('maxUsers').value
if (currentUsers >= maxUsers) {
  // At limit
}
```

### 4. API Call with Auto-Modal

```javascript
import { api } from '@/plugins/api'

async function createTransaction() {
  try {
    const response = await api.post('/transactions/combined', data)
    // Success
  } catch (error) {
    // Modal upgrade sudah muncul otomatis jika 403/402
  }
}
```

---

## 📦 Available Composables

### useFeatureGate()

```javascript
const {
  canAccessModule,      // (moduleName) => computed<boolean>
  canUseFeature,        // (category, name) => computed<boolean>
  getLimit,             // (limitName) => computed<number>
  isApproachingLimit,   // (limitName, current) => computed<boolean>
  isAtLimit             // (limitName, current) => computed<boolean>
} = useFeatureGate()
```

### useSubscriptionStore()

```javascript
const subscriptionStore = useSubscriptionStore()

// State
subscriptionStore.subscription      // Current subscription data
subscriptionStore.features          // Available features
subscriptionStore.isTrialActive     // Boolean
subscriptionStore.currentPlan       // Plan name
subscriptionStore.isActive          // Boolean

// Actions
subscriptionStore.fetchSubscription()
subscriptionStore.showUpgradeModal({ type, module, feature, message })
subscriptionStore.showLimitModal({ limit, current, message })
```

---

## 🎯 Common Patterns

### Pattern 1: Module Gate pada Navigation

```vue
<!-- Sidebar/Menu -->
<template>
  <nav>
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/members">Members</router-link>
    
    <!-- Show POS only if available -->
    <router-link v-if="canAccessPOS" to="/pos">
      POS
    </router-link>
    
    <!-- Or show locked state -->
    <div v-else class="menu-item-locked" @click="showPOSUpgrade">
      POS 🔒
    </div>
  </nav>
</template>
```

### Pattern 2: Feature Gate pada Form

```vue
<template>
  <form>
    <!-- Always available -->
    <input v-model="form.name" />
    
    <!-- Feature-gated -->
    <div v-if="canUseCombinedBilling">
      <CombinedBillingOptions />
    </div>
    
    <!-- Show upgrade prompt -->
    <div v-else class="feature-hint">
      Combined billing tidak tersedia. 
      <a @click="upgrade">Upgrade</a>
    </div>
  </form>
</template>
```

### Pattern 3: Limit Warning

```vue
<template>
  <div>
    <!-- Warning when approaching limit -->
    <div v-if="isNearLimit" class="alert alert-warning">
      ⚠️ You're using {{ userCount }}/{{ maxUsers }} users
    </div>
    
    <!-- Disable button at limit -->
    <button 
      @click="addUser" 
      :disabled="atLimit"
    >
      Add User
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFeatureGate } from '@/composables/useFeatureGate'

const { getLimit, isApproachingLimit, isAtLimit } = useFeatureGate()

const userCount = ref(8)
const maxUsers = getLimit('maxUsers')

const isNearLimit = isApproachingLimit('maxUsers', userCount.value)
const atLimit = isAtLimit('maxUsers', userCount.value)
</script>
```

### Pattern 4: Proactive Check Before API

```javascript
async function createUser(userData) {
  const { isAtLimit } = useFeatureGate()
  const subscriptionStore = useSubscriptionStore()
  
  // Check limit BEFORE API call
  if (isAtLimit('maxUsers', currentUserCount).value) {
    subscriptionStore.showLimitModal({
      limit: maxUsers,
      current: currentUserCount,
      message: 'User limit reached'
    })
    return
  }
  
  // Proceed with API call
  try {
    await api.post('/users', userData)
  } catch (error) {
    // Handle error
  }
}
```

---

## 🎨 UI Components

### FeatureGuard

```vue
<!-- Basic usage -->
<FeatureGuard module="pos">
  <POSComponent />
</FeatureGuard>

<!-- With feature check -->
<FeatureGuard :feature="{ category: 'transactions', name: 'combinedBilling' }">
  <CombinedBillingForm />
</FeatureGuard>

<!-- Without upgrade prompt -->
<FeatureGuard module="pos" :show-upgrade-prompt="false">
  <POSComponent />
</FeatureGuard>
```

---

## 🔑 Available Modules & Features

### Modules
- `gym` - Gym management
- `pos` - Point of Sale
- `restaurant` - Restaurant/F&B
- `classes` - Class management
- `reports` - Basic reports
- `advancedReports` - Advanced analytics

### Features (by category)

**transactions**
- `combinedBilling` - Combined billing
- `installments` - Installment payments
- `vouchers` - Voucher support
- `refunds` - Refund handling

**payments**
- `cash` - Cash payments
- `creditCard` - Credit card
- `bankTransfer` - Bank transfer
- `eWallet` - E-wallet
- `qris` - QRIS

**limits**
- `maxUsers` - User limit
- `maxMembers` - Member limit
- `maxProducts` - Product limit (0 = unlimited)

---

## 🐛 Troubleshooting

### Modal Tidak Muncul

```javascript
// 1. Pastikan modal mounted di App.vue
// 2. Pastikan subscription store reference di-set
import { api } from '@/plugins/api'
import { useSubscriptionStore } from '@/stores/subscription'

const subscriptionStore = useSubscriptionStore()
api.setSubscriptionStore(subscriptionStore)
```

### Features Selalu Null

```javascript
// Fetch subscription on app mount
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await subscriptionStore.fetchSubscription()
  }
})
```

### Router Guard Tidak Jalan

```javascript
// Pastikan route meta ada
{
  path: '/pos',
  meta: {
    requiresModule: 'pos'  // ← Harus ada ini
  }
}
```

---

## 📊 Testing Tips

### Mock Subscription Data

```javascript
// For testing, set manual subscription data
const subscriptionStore = useSubscriptionStore()

subscriptionStore.features = {
  modules: {
    gym: true,
    pos: false,  // Test locked module
    restaurant: false
  },
  limits: {
    maxUsers: 5,
    maxMembers: 100
  },
  transactions: {
    combinedBilling: false  // Test locked feature
  }
}
```

### Test Different Plans

```javascript
// Test as Basic user
subscriptionStore.subscription = { plan: { name: 'Basic' } }
subscriptionStore.features = { modules: { gym: true, pos: false } }

// Test as trial user
subscriptionStore.isTrialActive = true
// All features should be accessible
```

---

## 🎯 Best Practices

1. ✅ **Check BEFORE API call** - Proactive checking untuk better UX
2. ✅ **Use FeatureGuard** - Untuk conditional rendering
3. ✅ **Add requiresModule** - Ke route meta untuk protection
4. ✅ **Show locked features** - Jangan hide completely, show dengan 🔒
5. ✅ **Clear messaging** - Tell user WHY locked dan HOW to unlock
6. ✅ **Cache subscription** - Jangan fetch terus-menerus
7. ⛔ **Never trust frontend only** - Backend MUST enforce

---

## 📞 Support

Lihat dokumentasi lengkap:
- [Feature Gating Implementation](./FEATURE_GATING_IMPLEMENTATION.md)
- [Backend Feature Gating Guide](../Backend%20Intructions/FEATURE-GATING-GUIDE.md)
