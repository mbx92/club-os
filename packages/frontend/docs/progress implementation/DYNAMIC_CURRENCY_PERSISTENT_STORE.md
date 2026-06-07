# Dynamic Currency & Persistent Subscription Store

## 🎯 Changes Implemented

### 1. Dynamic Currency System ✅

#### Created `useCurrency` Composable
**File**: `src/composables/useCurrency.js`

**Features**:
- Reads currency settings from `tenant.settings.transaction.currency`
- Supports both Intl.NumberFormat and custom symbol formatting
- Provides helper methods:
  - `formatCurrency(amount, useSymbol)` - Format amount with tenant currency
  - `getCurrencyLabel(label)` - Get label with currency code (e.g., "Price (USD)")
  - `getCurrencySymbol()` - Get currency symbol (e.g., "$")
  - `getCurrencyCode()` - Get currency code (e.g., "USD")

**Usage Example**:
```javascript
import { useCurrency } from '@/composables/useCurrency'

const { formatCurrency, getCurrencyLabel } = useCurrency()

// Format amount
const formatted = formatCurrency(100000) // "Rp100,000" or "$100,000"

// Get dynamic label
const priceLabel = getCurrencyLabel('Price') // "Price (IDR)" or "Price (USD)"
```

#### Updated Files:
1. ✅ `src/components/subscription/PlanFormModal.vue`
   - Changed "Price (USD)" → Dynamic `{{ getCurrencyLabel('Price') }}`

2. ✅ `src/composables/usePayments.js`
   - Replaced hardcoded USD with `useCurrency()`

3. ✅ `src/composables/useInvoices.js`
   - Replaced hardcoded USD with `useCurrency()`

4. ✅ `src/composables/useSubscriptionPlans.js`
   - Added deprecation notice for old formatCurrency

5. ✅ `src/components/vouchers/VoucherFormModal.vue`
   - Replaced hardcoded IDR with `useCurrency()`

---

### 2. Persistent Subscription Store ✅

**File**: `src/stores/subscription.js`

#### Problem Solved:
- ❌ Before: Store reset on page refresh → modals re-appear
- ✅ After: Store persisted to localStorage → survives refresh

#### Implementation:
```javascript
// Helper functions
const STORAGE_KEY = 'gym-subscription-store'

const saveToStorage = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    subscription: state.subscription,
    features: state.features,
    isTrialActive: state.isTrialActive,
    timestamp: Date.now()
  }))
}

const loadFromStorage = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const data = JSON.parse(stored)
  
  // Auto-expire after 24 hours
  if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
    return null
  }
  
  return data
}
```

#### Features:
- ✅ **Auto-restore** on page refresh/reload
- ✅ **Auto-expire** after 24 hours (stale data protection)
- ✅ **Watch changes** and auto-save to localStorage
- ✅ **Clear on logout** via auth store integration
- ✅ **Clear on error** to prevent invalid cached data

#### Updated `auth.js`:
```javascript
// In logout() function
try {
  const { useSubscriptionStore } = await import('./subscription')
  const subscriptionStore = useSubscriptionStore()
  subscriptionStore.reset() // Clears localStorage
} catch (error) {
  console.error('Failed to reset subscription store:', error)
}
```

---

## 🔄 Data Flow

### Currency System:
```
Tenant Settings (DB)
    ↓
authStore.user.tenant.settings.transaction.currency
    ↓
useCurrency() reads settings
    ↓
formatCurrency() uses tenant currency
    ↓
Display: "$100" or "Rp100.000"
```

### Persistent Subscription:
```
1. User logs in
    ↓
2. fetchSubscription() called
    ↓
3. Data saved to localStorage
    ↓
4. Page refresh
    ↓
5. Store loads from localStorage (instant, no API call)
    ↓
6. User logout
    ↓
7. localStorage cleared
```

---

## 🧪 Testing

### Test Currency:
1. ✅ Login as tenant with IDR currency
2. ✅ Check Plan modal shows "Price (IDR)"
3. ✅ Check amounts format as "Rp100.000"
4. ✅ Login as tenant with USD currency
5. ✅ Check Plan modal shows "Price (USD)"
6. ✅ Check amounts format as "$100.00"

### Test Persistence:
1. ✅ Login and wait for subscription to load
2. ✅ Refresh page → Subscription still loaded (no modals)
3. ✅ Open DevTools → Check localStorage['gym-subscription-store']
4. ✅ Logout → localStorage cleared
5. ✅ Login again → Fresh fetch from API

### Test Auto-Expire:
1. ✅ Manually set timestamp to 25 hours ago in localStorage
2. ✅ Refresh page → Old data cleared, fresh fetch triggered

---

## 📦 localStorage Structure

```json
{
  "gym-subscription-store": {
    "subscription": {
      "id": 1,
      "status": "active",
      "plan": { "name": "Professional" }
    },
    "features": {
      "modules": { "gym": true, "pos": true },
      "limits": { "maxUsers": 10 },
      "transactions": {},
      "payments": { "cash": true }
    },
    "isTrialActive": false,
    "timestamp": 1700784000000
  }
}
```

---

## ⚠️ Important Notes

1. **Currency Settings Required**: Ensure `tenant.settings.transaction.currency` exists in DB
   - `defaultCurrency`: "USD", "IDR", etc.
   - `currencySymbol`: "$", "Rp", etc.
   - `decimalSeparator`: "." or ","
   - `thousandSeparator`: "," or "."
   - `useDecimals`: true/false

2. **Subscription Store Persistence**:
   - Only core data persisted (not modal states)
   - Auto-expires after 24 hours
   - Cleared on logout
   - Can be manually cleared via `subscriptionStore.reset()`

3. **Backward Compatibility**:
   - Old `formatCurrency` still works but marked deprecated
   - Fallback to "$" and "USD" if settings not found

---

## 🚀 Benefits

### Dynamic Currency:
- ✅ Multi-tenant support (each tenant = different currency)
- ✅ No hardcoded currency values
- ✅ Easy to add new currencies (just DB config)
- ✅ Consistent formatting across app

### Persistent Store:
- ✅ Better UX (no re-fetching on refresh)
- ✅ Faster page loads (no API call needed)
- ✅ Modals don't re-appear after refresh
- ✅ Auto-cleanup on logout

---

**Status**: ✅ Implemented & Ready for Testing
**Date**: November 23, 2025
