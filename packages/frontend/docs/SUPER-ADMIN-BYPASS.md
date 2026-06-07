# 👑 Super Admin - Full Bypass System

## ✅ Super Admin dikecualikan dari SEMUA proteksi subscription

Super admin memiliki **akses penuh unlimited** tanpa perlu subscription aktif.

---

## 🛡️ Layer Proteksi yang Di-Bypass

### 1. Navigation Guard (Router)
```javascript
// src/router/index.js
const isSuperAdmin = auth.user?.isSuperAdmin === true
// ✅ Super admin bypass - bisa akses semua route
```

### 2. API Request Guard
```javascript
// src/plugins/api.js - onRequest interceptor
const isSuperAdmin = this.authStore.user?.isSuperAdmin === true
if (isSuperAdmin) {
  console.log('[API Guard] ✅ Super admin - Request allowed')
  return // Bypass validation
}
```

### 3. Subscription Store (Pinia)
```javascript
// src/stores/subscription.js
const hasModule = computed(() => (moduleName) => {
  if (isSuperAdmin()) return true // ✅ Bypass
  // ... normal checks
})

const hasFeature = computed(() => (category, featureName) => {
  if (isSuperAdmin()) return true // ✅ Bypass
  // ... normal checks
})

const getLimit = computed(() => (limitName) => {
  if (isSuperAdmin()) return 0 // ✅ 0 = unlimited
  // ... normal checks
})
```

### 4. Feature Access Control
```javascript
// src/composables/useFeatureAccess.js

// hasValidAccess
const isSuperAdmin = authStore.user?.isSuperAdmin === true
if (isSuperAdmin) return true // ✅ Always valid

// guardFeature
if (isSuperAdmin) {
  console.log('[FeatureAccess] ✅ Super admin - Full access granted')
  return true
}

// validateLimit
if (isSuperAdmin) {
  console.log('[FeatureAccess] ✅ Super admin - Unlimited access')
  return true // ✅ Unlimited
}

// forceLogout
if (isSuperAdmin) {
  console.warn('[FeatureAccess] ⚠️ Logout prevented - User is super admin')
  return // ✅ NEVER logout super admin
}
```

### 5. Subscription Monitor
```javascript
// src/composables/useSubscriptionMonitor.js

// checkSubscriptionStatus
if (isSuperAdmin) {
  errorCount.value = 0 // Reset error count
  return true // ✅ Always valid
}

// handleSubscriptionLoss
if (isSuperAdmin) {
  console.warn('[SubscriptionMonitor] ⚠️ Subscription loss ignored - User is super admin')
  return // ✅ NEVER handle subscription loss
}
```

### 6. Feature Guard Component
```vue
<!-- src/components/shared/FeatureGuard.vue -->
<!-- Component menggunakan canAccessModule/canUseFeature yang sudah bypass -->
<slot></slot> <!-- ✅ Always render untuk super admin -->
```

### 7. Upgrade Modal & Limit Modal
```javascript
// src/stores/subscription.js

function showUpgradeModal(payload) {
  if (isSuperAdmin()) {
    console.log('[SubscriptionStore] Upgrade modal NOT shown - user is super admin')
    return // ✅ Modal tidak pernah muncul
  }
  // ... show modal
}

function showLimitModal(payload) {
  if (isSuperAdmin()) {
    console.log('[SubscriptionStore] Limit modal NOT shown - user is super admin')
    return // ✅ Modal tidak pernah muncul
  }
  // ... show modal
}

function showSubscriptionRequiredModal() {
  if (!hasSubscription.value && !isTrialActive.value && !isSuperAdmin()) {
    // ... show modal
  } else {
    console.log('[SubscriptionStore] Modal NOT shown - super admin/active subscription')
  }
}
```

### 8. v-feature-lock Directive
```javascript
// src/directives/featureLock.js

mounted(el, binding) {
  const isSuperAdmin = authStore.user?.isSuperAdmin === true
  if (isSuperAdmin) return // ✅ Tidak lock element
  
  // ... lock logic
}
```

---

## 🎯 Cara Kerja

### Deteksi Super Admin
```javascript
const isSuperAdmin = authStore.user?.isSuperAdmin === true
```

**Syarat:**
- User harus login
- `authStore.user` harus ada
- Property `isSuperAdmin` harus `true` (boolean strict)

### Console Logs
Super admin akan melihat log khusus:
```
[Router Guard] ✅ Super admin - Full access granted
[API Guard] ✅ Super admin - Request allowed
[FeatureAccess] ✅ Super admin - Full access granted
[FeatureAccess] ✅ Super admin - Unlimited access
[SubscriptionStore] Modal NOT shown - user is super admin
```

---

## 📊 Super Admin Capabilities

| Capability | Regular User | Super Admin |
|------------|-------------|-------------|
| Access all routes | ❌ Needs subscription | ✅ Always |
| API calls | ❌ Blocked without sub | ✅ Always allowed |
| Access all modules | ❌ Based on plan | ✅ All modules |
| Access all features | ❌ Based on plan | ✅ All features |
| Resource limits | ⚠️ Based on plan | ✅ Unlimited (0) |
| Violation tracking | ✅ Max 3x violations | ✅ Never tracked |
| Auto-logout | ⚠️ After violations | ✅ NEVER |
| Session monitoring | ✅ Active | ✅ Bypassed |
| Modals | ⚠️ Shows when needed | ✅ NEVER shows |

---

## 🔒 Security Notes

1. **Server-side validation tetap penting** - Frontend bypass hanya untuk UX, backend harus validasi ulang
2. **Super admin flag harus secure** - Jangan bisa dimanipulasi dari client
3. **Token validation** - Super admin tetap perlu token valid
4. **Audit logging** - Track super admin actions di backend

---

## 🧪 Testing Super Admin

### Scenario 1: No Subscription
```javascript
// User: Super Admin
// Tenant: No active subscription

// Result:
✅ Can access all routes
✅ Can make API calls
✅ No modals shown
✅ No redirects
✅ Full access to all features
```

### Scenario 2: Subscription Expired
```javascript
// User: Super Admin
// Tenant: Subscription just expired

// Result:
✅ Session monitor detects but ignores (super admin)
✅ No logout
✅ No modal
✅ Continue working normally
```

### Scenario 3: Multiple Violations
```javascript
// User: Super Admin
// Actions: Try accessing locked features 10x

// Result:
✅ No violations tracked
✅ No force logout
✅ All access granted
```

---

## 🎯 Implementation Checklist

- [x] Router guard bypass
- [x] API guard bypass
- [x] Store getters bypass (hasModule, hasFeature, getLimit)
- [x] useFeatureAccess bypass (guardFeature, validateLimit)
- [x] forceLogout protection (never logout)
- [x] Session monitor bypass
- [x] handleSubscriptionLoss protection
- [x] Modal show prevention (upgrade, limit, subscription)
- [x] v-feature-lock directive bypass
- [x] FeatureGuard component bypass (via store)
- [x] authStore connected to API service
- [x] Violation tracking skip
- [x] Watch subscription changes skip

---

## 📝 Summary

**Super Admin = GOD MODE** 👑

Semua proteksi subscription **otomatis di-bypass** untuk super admin:
- ✅ Unlimited access
- ✅ No restrictions
- ✅ No modals
- ✅ No redirects
- ✅ No logout
- ✅ No tracking

**Testing:** Login sebagai super admin → Semua fitur accessible tanpa perlu subscription.
