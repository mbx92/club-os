# 🔒 AGGRESSIVE SUBSCRIPTION PROTECTION SYSTEM

Sistem proteksi berlapis yang **sangat ketat** untuk mencegah akses fitur tanpa subscription aktif.

## 🛡️ 5 Layer Proteksi

### 1️⃣ Navigation Guard (Router Level)
**Lokasi:** `src/router/index.js`

**Cara Kerja:**
- Memblokir akses ke semua route kecuali `/subscription`, `/auth`, `/errors`
- **HARD REDIRECT** ke `/subscription` jika tidak ada subscription aktif
- Memblokir module yang tidak ter-subscribe dengan redirect paksa

```javascript
// Route akan otomatis di-block dan redirect
router.push('/members') // ❌ BLOCKED → Redirect to /subscription
```

**Fitur:**
- ✅ Redirect paksa (tidak bisa di-cancel)
- ✅ Modal warning muncul
- ✅ Super admin bypass

---

### 2️⃣ API Request Guard (Network Level)
**Lokasi:** `src/plugins/api.js`

**Cara Kerja:**
- Memvalidasi subscription **SEBELUM** setiap API request dikirim
- Throw error dan blokir request jika tidak ada subscription
- Hanya bypass untuk endpoint `/auth/*` dan `/subscription/current`

```javascript
// API call akan diblokir sebelum sampai ke server
await api.get('/members') // ❌ BLOCKED → Error thrown
// Error: 'SUBSCRIPTION_REQUIRED: Active subscription needed'
```

**Fitur:**
- ✅ Block di client side (hemat bandwidth)
- ✅ Modal muncul otomatis
- ✅ Console error log untuk debugging
- ✅ Super admin bypass

---

### 3️⃣ Feature Access Control (Composable Level)
**Lokasi:** `src/composables/useFeatureAccess.js`

**Cara Kerja:**
- Centralized access control untuk module dan feature
- Auto-redirect setelah 1.5 detik
- Track violation count → Force logout setelah 3x pelanggaran
- Watch subscription changes secara real-time

```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const { guardFeature, validateLimit } = useFeatureAccess()

// Guard module access
const allowed = guardFeature({ 
  module: 'pos',
  redirect: '/subscription',
  showModal: true
})

if (!allowed) {
  // Auto-redirect dalam 1.5 detik
  // Modal muncul
  // Violation count bertambah
}

// Validate limit
const canAdd = validateLimit('maxMembers', currentCount)
if (!canAdd) {
  // Throw error
  // Modal limit muncul
}
```

**Fitur:**
- ✅ Auto-redirect dengan timer
- ✅ Violation tracking (max 3x)
- ✅ Auto-logout setelah terlalu banyak violation
- ✅ Watch subscription changes
- ✅ Force logout function

---

### 4️⃣ Feature Guard Component (UI Level)
**Lokasi:** `src/components/shared/FeatureGuard.vue`

**Cara Kerja:**
- Conditional rendering untuk UI elements
- Auto-redirect setelah 5 detik (dengan countdown)
- Menampilkan UI locked state dengan tombol upgrade

```vue
<template>
  <FeatureGuard 
    module="pos" 
    :autoRedirect="true" 
    :redirectDelay="5000"
  >
    <!-- Content ini hanya tampil jika punya akses -->
    <POSInterface />
  </FeatureGuard>
</template>
```

**Fitur:**
- ✅ Conditional rendering
- ✅ Auto-redirect dengan countdown timer
- ✅ Locked UI placeholder
- ✅ Upgrade button
- ✅ Configurable redirect delay

---

### 5️⃣ Session Monitoring (Background Level)
**Lokasi:** `src/composables/useSubscriptionMonitor.js`

**Cara Kerja:**
- Background monitoring setiap 30 detik
- Re-fetch subscription dari server
- Auto-logout jika subscription expired/invalid
- Track error count (max 3x gagal check = logout)

```javascript
// Sudah otomatis dijalankan di App.vue
const { startMonitoring } = useSubscriptionMonitor({
  interval: 30000,      // Check every 30 seconds
  enabled: true,        // Auto-start
  autoLogout: true,     // Force logout if invalid
  strictMode: true      // Immediate logout (no warning)
})
```

**Monitoring:**
- ✅ Periodic subscription check (30s)
- ✅ Auto-logout on subscription loss
- ✅ Trial expiry warning (24 hours before)
- ✅ Subscription expiry warning (3 days before)
- ✅ Error resilience (max 3 errors)
- ✅ Cleared session storage on logout

---

## 🚫 Bonus: v-feature-lock Directive

**Lokasi:** `src/directives/featureLock.js`

**Cara Kerja:**
- Disable dan lock UI elements berdasarkan subscription
- Tambahkan overlay lock icon
- Block click events
- Show modal on click attempt

```vue
<template>
  <!-- Lock button untuk module -->
  <button v-feature-lock:module="'pos'">
    POS Module
  </button>
  
  <!-- Lock button untuk feature dengan overlay -->
  <button v-feature-lock:feature.overlay="{ category: 'transactions', name: 'combinedBilling' }">
    Combined Billing
  </button>
  
  <!-- Lock entire section -->
  <div v-feature-lock:subscription>
    <!-- Content requires subscription -->
  </div>
</template>
```

**Fitur:**
- ✅ Disable interactive elements
- ✅ Visual opacity (50%)
- ✅ Cursor not-allowed
- ✅ Lock icon overlay (optional)
- ✅ Block click events
- ✅ Show modal on click attempt
- ✅ Super admin bypass

---

## 📊 Protection Flow

```
User attempts to access feature
         ↓
1. Router Guard checks
   ❌ No subscription → Redirect to /subscription
         ↓
2. Component renders (if passed router)
   ❌ FeatureGuard blocks UI → Show locked state → Auto-redirect (5s)
         ↓
3. User tries API call
   ❌ API Guard blocks request → Throw error → Show modal
         ↓
4. Violation tracked (3x max)
   ❌ Too many violations → Force logout
         ↓
5. Background monitor checks (every 30s)
   ❌ Subscription invalid → Force logout immediately
```

---

## 🔥 Tingkat "Menyebalkan"

### Level 1: Basic (Default Sekarang)
- ✅ Route blocked dengan redirect
- ✅ API call blocked
- ✅ UI elements disabled
- ✅ Background monitoring
- ✅ Auto-redirect 5 detik

### Level 2: Annoying (Opsional)
Ubah di `useSubscriptionMonitor`:
```javascript
interval: 10000,  // Check setiap 10 detik (lebih sering)
strictMode: true  // Logout langsung tanpa warning
```

Ubah di `FeatureGuard`:
```javascript
redirectDelay: 3000  // Redirect lebih cepat (3 detik)
```

### Level 3: Maximum Annoyance (Extreme)
Ubah di `useFeatureAccess`:
```javascript
const MAX_VIOLATIONS = 1  // Logout setelah 1x violation
```

Ubah di `useSubscriptionMonitor`:
```javascript
interval: 5000,    // Check setiap 5 detik
strictMode: true,  // Immediate logout
autoLogout: true   // Force logout enabled
```

Tambahkan di `App.vue`:
```vue
// Show permanent banner
<div v-if="!hasSubscription" class="fixed top-0 w-full bg-red-500 text-white p-2 z-50">
  ⚠️ NO SUBSCRIPTION - ACCESS RESTRICTED
</div>
```

---

## 🎯 Super Admin Bypass

**SEMUA proteksi otomatis di-bypass untuk super admin:**

```javascript
const isSuperAdmin = authStore.user?.isSuperAdmin === true
```

| Layer | Super Admin Behavior |
|-------|---------------------|
| Navigation Guard | ✅ Full access to all routes |
| API Guard | ✅ All requests allowed |
| Feature Access | ✅ All modules & features accessible |
| Limits | ✅ Unlimited (returns 0) |
| Modals | ✅ NEVER shown |
| Violation Tracking | ✅ NEVER tracked |
| Force Logout | ✅ NEVER triggered |
| Session Monitor | ✅ Checks but ignores issues |

**Console logs untuk super admin:**
```
[Router Guard] ✅ Super admin - Full access granted
[API Guard] ✅ Super admin - Request allowed
[FeatureAccess] ✅ Super admin - Full access granted
[SubscriptionStore] Modal NOT shown - user is super admin
```

Lihat dokumentasi lengkap: [SUPER-ADMIN-BYPASS.md](./SUPER-ADMIN-BYPASS.md)

---

## 🛠️ Testing

### Test Scenario 1: No Subscription
1. Login dengan tenant tanpa subscription
2. Coba akses `/members` → **BLOCKED** → Redirect to `/subscription`
3. Close modal dan coba lagi → **BLOCKED** lagi
4. Coba API call → **BLOCKED** before request sent

### Test Scenario 2: Subscription Expires
1. Login dengan active subscription
2. Backend manually expire subscription
3. Wait 30 seconds (monitoring check)
4. User akan **FORCE LOGOUT** otomatis

### Test Scenario 3: Multiple Violations
1. Login tanpa subscription
2. Coba akses 3x route berbeda
3. Setelah 3x violation → **FORCE LOGOUT**

---

## 🔧 Configuration

### Customize Protection Levels

**Router Guard:**
```javascript
// src/router/index.js
const allowedWithoutSubscription = [
  '/subscription',
  '/auth',
  '/errors'
  // Add more if needed
]
```

**Session Monitor:**
```javascript
// src/App.vue
useSubscriptionMonitor({
  interval: 30000,      // How often to check (ms)
  enabled: true,        // Enable/disable monitoring
  autoLogout: true,     // Force logout on invalid
  strictMode: true      // Immediate vs gradual enforcement
})
```

**Feature Guard:**
```vue
<FeatureGuard 
  module="pos"
  :autoRedirect="true"
  :redirectDelay="5000"  <!-- Delay before redirect (ms) -->
>
```

**API Guard:**
```javascript
// src/plugins/api.js
const isAuthEndpoint = url.includes('/auth/') || url.includes('/subscription/current')
// Add more exceptions if needed
```

---

## ⚠️ Important Notes

1. **Super admin** always bypasses all checks
2. **Trial users** considered as having valid subscription
3. **Background monitoring** runs globally (App.vue)
4. **Violation tracking** resets on successful access
5. **Force logout** clears all storage (localStorage + sessionStorage)

---

## 🚀 Usage Examples

### Protect a Route
```javascript
// router/index.js
{
  path: '/pos',
  component: POSPage,
  meta: {
    requiresModule: 'pos'  // Will be checked by navigation guard
  }
}
```

### Protect a Component
```vue
<template>
  <FeatureGuard module="pos">
    <POSInterface />
  </FeatureGuard>
</template>
```

### Protect a Button
```vue
<template>
  <button v-feature-lock:module="'pos'">
    Access POS
  </button>
</template>
```

### Protect Programmatically
```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const { guardFeature } = useFeatureAccess()

function handleClick() {
  if (!guardFeature({ module: 'pos' })) {
    return // Access denied, handled automatically
  }
  
  // Continue with action
  openPOSModule()
}
```

### Validate Limit
```javascript
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const { validateLimit } = useFeatureAccess()

async function addMember() {
  const currentCount = members.value.length
  
  if (!validateLimit('maxMembers', currentCount)) {
    return // Limit reached, modal shown
  }
  
  // Continue adding member
  await createMember(data)
}
```

---

## 📈 Monitoring & Debugging

Console logs untuk tracking:
- `[Router Guard]` - Navigation blocking
- `[API Guard]` - Request blocking  
- `[FeatureAccess]` - Access control violations
- `[FeatureGuard]` - Component-level blocks
- `[SubscriptionMonitor]` - Background checks
- `[v-feature-lock]` - Directive blocks

---

## 🎯 Summary

Sistem ini memberikan **5 layer proteksi berlapis**:
1. ✅ Router level (navigation)
2. ✅ API level (network)
3. ✅ Composable level (logic)
4. ✅ Component level (UI)
5. ✅ Background level (monitoring)

Plus **bonus directive** untuk UI locking.

Semua layer bekerja **independent** tapi **saling melengkapi** untuk memastikan tidak ada celah akses tanpa subscription.

**Target:** Membuat user tanpa subscription **tidak bisa mengakses apapun** bahkan jika mereka menutup modal atau mencoba bypass frontend.
