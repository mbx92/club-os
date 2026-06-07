# 🎯 Contoh Implementasi Proteksi Subscription

## 1. Protect Halaman Members

### router/index.js
```javascript
{
  path: '/members',
  component: () => import('@/pages/members/index.vue'),
  meta: {
    requiresModule: 'members',  // 🔒 Otomatis diblock di navigation guard
    title: 'Members Management'
  }
}
```

### pages/members/index.vue
```vue
<template>
  <div>
    <!-- 🔒 Double protection dengan FeatureGuard -->
    <FeatureGuard module="members">
      <div class="members-page">
        <h1>Members Management</h1>
        
        <!-- 🔒 Button untuk add member -->
        <button 
          @click="handleAddMember"
          v-feature-lock:module="'members'"
          class="btn btn-primary"
        >
          Add Member
        </button>
        
        <!-- Member list -->
        <MemberList />
      </div>
    </FeatureGuard>
  </div>
</template>

<script setup>
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const { guardFeature, validateLimit } = useFeatureAccess()

const handleAddMember = async () => {
  // 🔒 Proteksi 1: Check module access
  if (!guardFeature({ module: 'members' })) {
    return
  }
  
  // 🔒 Proteksi 2: Check member limit
  const currentCount = members.value.length
  if (!validateLimit('maxMembers', currentCount)) {
    return
  }
  
  // Safe to proceed
  await addMemberModal.open()
}
</script>
```

**Result:**
- ❌ Route blocked di navigation guard → redirect
- ❌ UI tidak render (FeatureGuard)
- ❌ Button disabled (v-feature-lock)
- ❌ Click handler blocked (guardFeature)
- ❌ API call blocked (validateLimit)

---

## 2. Protect Fitur Combined Billing

### pages/payments/create.vue
```vue
<template>
  <div class="payment-form">
    <!-- Normal payment form -->
    <div class="form-group">
      <label>Payment Method</label>
      <select v-model="paymentMethod">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
      </select>
    </div>
    
    <!-- 🔒 Combined Billing feature locked -->
    <div class="form-group">
      <label>
        Combined Billing
        <span class="badge badge-premium">Premium</span>
      </label>
      
      <FeatureGuard 
        :feature="{ category: 'transactions', name: 'combinedBilling' }"
        :autoRedirect="false"
      >
        <input 
          v-model="useCombinedBilling" 
          type="checkbox"
          class="checkbox"
        >
      </FeatureGuard>
    </div>
    
    <button 
      @click="handleSubmit"
      class="btn btn-primary"
    >
      Process Payment
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const { guardFeature } = useFeatureAccess()

const paymentMethod = ref('cash')
const useCombinedBilling = ref(false)

const handleSubmit = async () => {
  // 🔒 Check if combined billing is enabled
  if (useCombinedBilling.value) {
    const allowed = guardFeature({
      feature: { category: 'transactions', name: 'combinedBilling' }
    })
    
    if (!allowed) {
      useCombinedBilling.value = false
      return
    }
  }
  
  // Process payment
  await processPayment({
    method: paymentMethod.value,
    combinedBilling: useCombinedBilling.value
  })
}
</script>
```

**Result:**
- ✅ Basic payment tetap bisa diakses
- ❌ Combined billing checkbox tidak tampil (FeatureGuard)
- ❌ Jika somehow di-enable, guardFeature akan block

---

## 3. Protect POS Module (Aggressive)

### pages/pos/index.vue
```vue
<template>
  <!-- 🔒 Triple protection! -->
  <FeatureGuard 
    module="pos"
    :autoRedirect="true"
    :redirectDelay="3000"
  >
    <div class="pos-interface">
      <h1>POS System</h1>
      
      <!-- POS content -->
      <div class="pos-grid">
        <!-- Products, Cart, etc -->
      </div>
      
      <!-- 🔒 All buttons protected -->
      <button 
        v-feature-lock:module.overlay="'pos'"
        @click="processTransaction"
        class="btn btn-success btn-lg"
      >
        Process Transaction
      </button>
    </div>
  </FeatureGuard>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const router = useRouter()
const { guardFeature } = useFeatureAccess()

// 🔒 Check on mount
onMounted(() => {
  const allowed = guardFeature({ 
    module: 'pos',
    redirect: '/subscription',
    showModal: true,
    throwError: false
  })
  
  if (!allowed) {
    console.warn('POS access denied')
    // Will auto-redirect via guardFeature
  }
})

const processTransaction = async () => {
  // 🔒 Final check before API call
  if (!guardFeature({ module: 'pos' })) {
    return
  }
  
  // 🔒 API call also protected by API Guard
  try {
    await api.post('/pos/transactions', transactionData)
  } catch (error) {
    if (error.message.includes('SUBSCRIPTION_REQUIRED')) {
      console.error('Blocked by API Guard')
    }
  }
}
</script>
```

**Result:**
- ❌ Route blocked (navigation guard)
- ❌ UI tidak render (FeatureGuard)
- ❌ Auto-redirect dalam 3 detik
- ❌ Button disabled dengan overlay lock icon
- ❌ onMounted check blocked
- ❌ API call blocked

---

## 4. Protect Admin Settings

### pages/settings/index.vue
```vue
<template>
  <div class="settings-page">
    <h1>Settings</h1>
    
    <div class="tabs">
      <button @click="activeTab = 'general'">General</button>
      <button @click="activeTab = 'subscription'">Subscription</button>
      
      <!-- 🔒 Advanced settings requires subscription -->
      <button 
        @click="activeTab = 'advanced'"
        v-feature-lock:subscription
        :disabled="!hasValidAccess"
      >
        Advanced Settings
        <span v-if="!hasValidAccess" class="badge badge-warning">Premium</span>
      </button>
    </div>
    
    <div v-if="activeTab === 'general'">
      <!-- General settings (always accessible) -->
    </div>
    
    <div v-if="activeTab === 'subscription'">
      <!-- Subscription management (always accessible) -->
    </div>
    
    <div v-if="activeTab === 'advanced'">
      <!-- 🔒 Protected content -->
      <FeatureGuard 
        :autoRedirect="false"
        :feature="{ category: 'settings', name: 'advanced' }"
      >
        <AdvancedSettings />
      </FeatureGuard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const { hasValidAccess } = useFeatureAccess()
const activeTab = ref('general')

// Watch for tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'advanced' && !hasValidAccess.value) {
    // Prevent switching to advanced tab
    activeTab.value = 'general'
  }
})
</script>
```

**Result:**
- ✅ General & subscription tabs selalu accessible
- ❌ Advanced tab button disabled
- ❌ Tab switch blocked di watch
- ❌ Content tidak render (FeatureGuard)

---

## 5. Component dengan Graceful Degradation

### components/PaymentMethodSelector.vue
```vue
<template>
  <div class="payment-methods">
    <h3>Select Payment Method</h3>
    
    <!-- 💰 Cash - Always available -->
    <div class="method-card">
      <input 
        v-model="selected" 
        type="radio" 
        value="cash"
        id="cash"
      >
      <label for="cash">
        💵 Cash
        <span class="badge badge-success">Available</span>
      </label>
    </div>
    
    <!-- 💳 Card - Requires payment feature -->
    <div 
      class="method-card"
      :class="{ 'locked': !hasCardPayment }"
    >
      <input 
        v-model="selected" 
        type="radio" 
        value="card"
        id="card"
        :disabled="!hasCardPayment"
        v-feature-lock:feature="{ category: 'payments', name: 'card' }"
      >
      <label for="card">
        💳 Credit/Debit Card
        <span v-if="!hasCardPayment" class="badge badge-warning">Premium</span>
      </label>
    </div>
    
    <!-- 🏦 Bank Transfer - Requires payment feature -->
    <div 
      class="method-card"
      :class="{ 'locked': !hasBankTransfer }"
    >
      <input 
        v-model="selected" 
        type="radio" 
        value="bank"
        id="bank"
        :disabled="!hasBankTransfer"
        v-feature-lock:feature="{ category: 'payments', name: 'bankTransfer' }"
      >
      <label for="bank">
        🏦 Bank Transfer
        <span v-if="!hasBankTransfer" class="badge badge-warning">Premium</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

const subscriptionStore = useSubscriptionStore()
const selected = ref('cash')

const hasCardPayment = computed(() => 
  subscriptionStore.hasFeature('payments', 'card')
)

const hasBankTransfer = computed(() => 
  subscriptionStore.hasFeature('payments', 'bankTransfer')
)
</script>
```

**Result:**
- ✅ Component tetap render dan usable
- ✅ Cash payment selalu available (basic)
- ❌ Card/Bank options disabled jika tidak ter-subscribe
- 🎨 Visual indication (badge, locked style)

---

## 6. Programmatic Access Check

### composables/useMembers.js
```javascript
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

export function useMembers() {
  const api = useApi()
  const { guardFeature, validateLimit } = useFeatureAccess()
  
  const members = ref([])
  const loading = ref(false)
  
  const fetchMembers = async () => {
    // 🔒 Check module access
    if (!guardFeature({ module: 'members', showModal: false })) {
      throw new Error('Members module not available')
    }
    
    loading.value = true
    try {
      // 🔒 API call protected by API Guard
      const response = await api.get('/members')
      members.value = response.data
    } finally {
      loading.value = false
    }
  }
  
  const createMember = async (memberData) => {
    // 🔒 Check module access
    if (!guardFeature({ module: 'members' })) {
      return null
    }
    
    // 🔒 Check member limit
    if (!validateLimit('maxMembers', members.value.length)) {
      return null
    }
    
    // 🔒 API call protected
    try {
      const response = await api.post('/members', memberData)
      members.value.push(response.data)
      return response.data
    } catch (error) {
      if (error.message.includes('SUBSCRIPTION_REQUIRED')) {
        console.error('Blocked by API Guard')
      }
      throw error
    }
  }
  
  return {
    members,
    loading,
    fetchMembers,
    createMember
  }
}
```

---

## 7. Global App Protection

### App.vue (Already implemented)
```vue
<script setup>
import { useSubscriptionMonitor } from '@/composables/useSubscriptionMonitor'

// 🔒 Start background monitoring
const { startMonitoring } = useSubscriptionMonitor({
  interval: 30000,      // Check every 30 seconds
  enabled: true,
  autoLogout: true,     // Force logout if invalid
  strictMode: true      // Immediate enforcement
})

onMounted(() => {
  if (authStore.isAuthenticated) {
    await subscriptionStore.fetchSubscription()
    startMonitoring()  // 🔒 Start watching
  }
})
</script>
```

**Background Process:**
```
Every 30 seconds:
  ├─ Fetch subscription from server
  ├─ Check if still valid
  ├─ If invalid → Show modal + Force logout
  ├─ If trial expiring → Show warning
  └─ Track error count (3x = logout)
```

---

## 🎯 Summary Protection Levels

| Feature | Navigation | UI Render | Button | API Call | Background |
|---------|-----------|-----------|--------|----------|------------|
| Members | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Monitored |
| POS | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Monitored |
| Payments | ➖ Partial | ➖ Partial | ✅ Blocked | ✅ Blocked | ✅ Monitored |
| Settings | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Monitored |

**Legend:**
- ✅ Blocked = Fully protected, no access
- ➖ Partial = Basic access, premium features locked
- ✅ Monitored = Watched by background monitor

---

## 🚀 Quick Start Checklist

- [x] Router guard setup (index.js)
- [x] API guard setup (api.js)
- [x] useFeatureAccess composable created
- [x] useSubscriptionMonitor composable created
- [x] FeatureGuard component updated
- [x] v-feature-lock directive registered
- [x] App.vue monitoring started
- [x] All super admin bypasses in place

**Sistem siap digunakan!** 🎉
