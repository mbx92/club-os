# Feature Gating - Implementation Examples

Contoh implementasi nyata dari feature gating system di berbagai komponen.

---

## Example 1: Protect POS Module Route

```javascript
// src/router/routes.js or route meta definition
{
  path: '/pos',
  name: 'pos',
  component: () => import('@/pages/pos/index.vue'),
  meta: {
    title: 'Point of Sale',
    requiresModule: 'pos',  // ← Feature gating
    layout: 'default'
  }
}

{
  path: '/restaurant',
  name: 'restaurant',
  component: () => import('@/pages/restaurant/index.vue'),
  meta: {
    title: 'Restaurant',
    requiresModule: 'restaurant',  // ← Feature gating
    layout: 'default'
  }
}
```

---

## Example 2: Members Page dengan Limit Warning

```vue
<!-- src/pages/members/index.vue -->
<route lang="yaml">
meta:
  title: Members
  layout: default
</route>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Members</h1>
      
      <!-- Add Member Button with Limit Check -->
      <button 
        @click="addMember" 
        :disabled="isAtMemberLimit"
        class="btn btn-primary"
      >
        <span v-if="isAtMemberLimit">🔒</span>
        Add Member
      </button>
    </div>
    
    <!-- Limit Warning Banner -->
    <div v-if="isApproachingMemberLimit" class="alert alert-warning mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>
        You're using <strong>{{ memberCount }}/{{ maxMembers }}</strong> members.
        <a @click="upgradePlan" class="link link-primary ml-2">Upgrade to add more</a>
      </span>
    </div>
    
    <!-- At Limit Banner -->
    <div v-if="isAtMemberLimit" class="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        Member limit reached! <strong>Upgrade your plan</strong> to add more members.
        <button @click="upgradePlan" class="btn btn-sm btn-primary ml-2">Upgrade Now</button>
      </span>
    </div>
    
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Member list here -->
        <div class="text-sm text-gray-500 mb-4">
          {{ memberCount }} members ({{ maxMembers === 0 ? 'Unlimited' : `max ${maxMembers}` }})
        </div>
        
        <!-- Member list table/grid -->
        <p>Member list - Coming soon</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

const router = useRouter()
const { getLimit, isApproachingLimit, isAtLimit } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

// Get current member count (would come from API)
const memberCount = ref(45)

// Get limit from subscription
const maxMembers = getLimit('maxMembers')

// Check if approaching limit (80% threshold)
const isApproachingMemberLimit = isApproachingLimit('maxMembers', memberCount.value)

// Check if at limit
const isAtMemberLimit = isAtLimit('maxMembers', memberCount.value)

function addMember() {
  if (isAtMemberLimit.value) {
    subscriptionStore.showLimitModal({
      limit: maxMembers.value,
      current: memberCount.value,
      message: 'Member limit reached',
      currentPlan: subscriptionStore.currentPlan
    })
    return
  }
  
  // Navigate to add member form
  router.push('/members/add')
}

function upgradePlan() {
  router.push('/subscription')
}
</script>
```

---

## Example 3: Settings Page dengan Module Tabs

```vue
<!-- src/pages/settings/index.vue -->
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Settings</h1>
    
    <div class="tabs tabs-boxed">
      <!-- Always available -->
      <a class="tab" :class="{ 'tab-active': activeTab === 'general' }" @click="activeTab = 'general'">
        General
      </a>
      
      <!-- Feature-gated tabs -->
      <a 
        v-if="canAccessPOS" 
        class="tab" 
        :class="{ 'tab-active': activeTab === 'pos' }" 
        @click="activeTab = 'pos'"
      >
        POS Settings
      </a>
      
      <a 
        v-else 
        class="tab tab-disabled tooltip tooltip-bottom" 
        data-tip="Upgrade to Professional for POS"
        @click="showPOSUpgrade"
      >
        POS Settings 🔒
      </a>
      
      <a 
        v-if="canAccessRestaurant" 
        class="tab" 
        :class="{ 'tab-active': activeTab === 'restaurant' }" 
        @click="activeTab = 'restaurant'"
      >
        Restaurant Settings
      </a>
      
      <a 
        v-else 
        class="tab tab-disabled tooltip tooltip-bottom" 
        data-tip="Upgrade to Professional for Restaurant"
        @click="showRestaurantUpgrade"
      >
        Restaurant Settings 🔒
      </a>
    </div>
    
    <!-- Tab Content -->
    <div class="mt-6">
      <div v-show="activeTab === 'general'">
        <GeneralSettings />
      </div>
      
      <FeatureGuard module="pos">
        <div v-show="activeTab === 'pos'">
          <POSSettings />
        </div>
      </FeatureGuard>
      
      <FeatureGuard module="restaurant">
        <div v-show="activeTab === 'restaurant'">
          <RestaurantSettings />
        </div>
      </FeatureGuard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'
import GeneralSettings from '@/components/settings/GeneralSettings.vue'
import POSSettings from '@/components/settings/POSSettings.vue'
import RestaurantSettings from '@/components/settings/RestaurantSettings.vue'

const { canAccessModule } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const activeTab = ref('general')

const canAccessPOS = canAccessModule('pos')
const canAccessRestaurant = canAccessModule('restaurant')

function showPOSUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: 'pos',
    message: 'POS module tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}

function showRestaurantUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: 'restaurant',
    message: 'Restaurant module tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}
</script>
```

---

## Example 4: Transaction Form dengan Feature Gating

```vue
<!-- src/pages/transactions/create.vue -->
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Create Transaction</h1>
    
    <form @submit.prevent="submitTransaction" class="space-y-6">
      <!-- Basic fields (always available) -->
      <div class="form-control">
        <label class="label">Member</label>
        <select v-model="form.memberId" class="select select-bordered">
          <option value="">Select Member</option>
          <!-- Options here -->
        </select>
      </div>
      
      <div class="form-control">
        <label class="label">Amount</label>
        <input v-model="form.amount" type="number" class="input input-bordered" />
      </div>
      
      <!-- Combined Billing Feature -->
      <div class="border rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <label class="label">
            <span class="label-text font-semibold">Combined Billing</span>
          </label>
          
          <span v-if="!canUseCombinedBilling" class="badge badge-warning">
            PRO Feature
          </span>
        </div>
        
        <FeatureGuard 
          :feature="{ category: 'transactions', name: 'combinedBilling' }"
          :show-upgrade-prompt="false"
        >
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">Enable Combined Billing</span>
              <input v-model="form.isCombined" type="checkbox" class="toggle toggle-primary" />
            </label>
          </div>
          
          <div v-if="form.isCombined" class="mt-4 space-y-2">
            <!-- Combined billing options -->
            <div class="form-control">
              <label class="label">Add Items</label>
              <!-- Item selection -->
            </div>
          </div>
        </FeatureGuard>
        
        <div v-if="!canUseCombinedBilling" class="alert alert-info mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>
            Combined billing memungkinkan Anda menggabungkan membership dan purchases dalam satu transaksi.
            <a @click="showCombinedBillingUpgrade" class="link link-primary ml-2">Upgrade to unlock</a>
          </span>
        </div>
      </div>
      
      <!-- Payment Methods -->
      <div class="border rounded-lg p-4">
        <label class="label">
          <span class="label-text font-semibold">Payment Method</span>
        </label>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <!-- Cash (always available) -->
          <button
            type="button"
            @click="form.paymentMethod = 'cash'"
            :class="{ 'btn-primary': form.paymentMethod === 'cash' }"
            class="btn btn-outline"
          >
            💵 Cash
          </button>
          
          <!-- Credit Card (feature-gated) -->
          <button
            type="button"
            @click="selectPayment('creditCard')"
            :disabled="!canUseCreditCard"
            :class="{ 'btn-primary': form.paymentMethod === 'creditCard' }"
            class="btn btn-outline"
          >
            💳 Credit Card
            <span v-if="!canUseCreditCard" class="badge badge-xs badge-warning ml-1">PRO</span>
          </button>
          
          <!-- QRIS (feature-gated) -->
          <button
            type="button"
            @click="selectPayment('qris')"
            :disabled="!canUseQRIS"
            :class="{ 'btn-primary': form.paymentMethod === 'qris' }"
            class="btn btn-outline"
          >
            📱 QRIS
            <span v-if="!canUseQRIS" class="badge badge-xs badge-warning ml-1">PRO</span>
          </button>
          
          <!-- E-Wallet (feature-gated) -->
          <button
            type="button"
            @click="selectPayment('eWallet')"
            :disabled="!canUseEWallet"
            :class="{ 'btn-primary': form.paymentMethod === 'eWallet' }"
            class="btn btn-outline"
          >
            🔷 E-Wallet
            <span v-if="!canUseEWallet" class="badge badge-xs badge-warning ml-1">PRO</span>
          </button>
        </div>
      </div>
      
      <!-- Submit -->
      <div class="flex justify-end gap-2">
        <button type="button" @click="cancel" class="btn btn-ghost">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Transaction</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'
import { useApi } from '@/composables/useApi'
import { FeatureGateError } from '@/utils/errors'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const router = useRouter()
const api = useApi()
const { canUseFeature } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const form = ref({
  memberId: '',
  amount: 0,
  isCombined: false,
  paymentMethod: 'cash'
})

// Feature checks
const canUseCombinedBilling = canUseFeature('transactions', 'combinedBilling')
const canUseCreditCard = canUseFeature('payments', 'creditCard')
const canUseQRIS = canUseFeature('payments', 'qris')
const canUseEWallet = canUseFeature('payments', 'eWallet')

function selectPayment(method) {
  // Proactive check before setting
  const featureMap = {
    creditCard: canUseCreditCard,
    qris: canUseQRIS,
    eWallet: canUseEWallet
  }
  
  if (!featureMap[method]?.value) {
    subscriptionStore.showUpgradeModal({
      type: 'feature',
      feature: `payments.${method}`,
      message: `Payment method ${method} tidak tersedia di plan Anda`,
      currentPlan: subscriptionStore.currentPlan
    })
    return
  }
  
  form.value.paymentMethod = method
}

function showCombinedBillingUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: 'feature',
    feature: 'transactions.combinedBilling',
    message: 'Combined billing tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}

async function submitTransaction() {
  try {
    const response = await api.post('/transactions', form.value)
    // Success
    router.push('/transactions')
  } catch (error) {
    if (error instanceof FeatureGateError) {
      // Modal already shown by interceptor
      console.log('Feature not available')
    } else {
      // Handle other errors
      console.error('Transaction failed:', error)
    }
  }
}

function cancel() {
  router.back()
}
</script>
```

---

## Example 5: User Management dengan Limit

```vue
<!-- src/pages/users/index.vue -->
<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Users</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ userCount }} / {{ maxUsersDisplay }} users
        </p>
      </div>
      
      <button 
        @click="addUser" 
        :disabled="isAtUserLimit"
        class="btn btn-primary"
      >
        <span v-if="isAtUserLimit">🔒</span>
        Add User
      </button>
    </div>
    
    <!-- Progress Bar -->
    <div class="mb-6">
      <div class="flex justify-between text-sm mb-1">
        <span>User Limit</span>
        <span :class="{ 'text-error': isAtUserLimit, 'text-warning': isApproachingUserLimit }">
          {{ userPercentage }}%
        </span>
      </div>
      <progress 
        class="progress w-full"
        :class="{
          'progress-error': isAtUserLimit,
          'progress-warning': isApproachingUserLimit,
          'progress-primary': !isApproachingUserLimit
        }"
        :value="userCount" 
        :max="maxUsers"
      ></progress>
    </div>
    
    <!-- User list -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- User rows -->
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

const router = useRouter()
const { getLimit, isApproachingLimit, isAtLimit } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const userCount = ref(8)
const maxUsers = getLimit('maxUsers')

const maxUsersDisplay = computed(() => {
  return maxUsers.value === 0 ? '∞' : maxUsers.value
})

const userPercentage = computed(() => {
  if (maxUsers.value === 0) return 0
  return Math.round((userCount.value / maxUsers.value) * 100)
})

const isApproachingUserLimit = isApproachingLimit('maxUsers', userCount.value)
const isAtUserLimit = isAtLimit('maxUsers', userCount.value)

function addUser() {
  if (isAtUserLimit.value) {
    subscriptionStore.showLimitModal({
      limit: maxUsers.value,
      current: userCount.value,
      message: 'User limit reached',
      currentPlan: subscriptionStore.currentPlan
    })
    return
  }
  
  router.push('/users/add')
}
</script>
```

---

## Example 6: Dashboard dengan Conditional Widgets

```vue
<!-- src/pages/index.vue (Dashboard) -->
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
    
    <!-- Trial Banner -->
    <div v-if="subscriptionStore.isTrialActive" class="alert alert-info mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <div class="font-bold">🎉 Trial Mode Active</div>
        <div class="text-xs">All features unlocked! Subscribe to keep access.</div>
      </div>
      <button @click="goToSubscription" class="btn btn-sm btn-primary">Subscribe Now</button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Always visible - Membership Stats -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Membership</h2>
          <div class="stat-value">150</div>
          <p class="text-sm text-gray-500">Active Members</p>
        </div>
      </div>
      
      <!-- Conditional - POS Stats -->
      <FeatureGuard module="pos" :show-upgrade-prompt="false">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">POS Sales</h2>
            <div class="stat-value text-success">Rp 5.2M</div>
            <p class="text-sm text-gray-500">This Month</p>
          </div>
        </div>
      </FeatureGuard>
      
      <!-- Show locked state for POS -->
      <div v-if="!canAccessPOS" class="card bg-base-100 shadow-xl border-2 border-dashed border-gray-300">
        <div class="card-body items-center text-center opacity-60">
          <div class="text-4xl mb-2">🔒</div>
          <h2 class="card-title">POS Module</h2>
          <p class="text-sm">Unlock POS features</p>
          <button @click="upgradeToPOS" class="btn btn-sm btn-primary mt-2">
            Upgrade
          </button>
        </div>
      </div>
      
      <!-- Conditional - Restaurant Stats -->
      <FeatureGuard module="restaurant" :show-upgrade-prompt="false">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Restaurant</h2>
            <div class="stat-value text-warning">45</div>
            <p class="text-sm text-gray-500">Orders Today</p>
          </div>
        </div>
      </FeatureGuard>
      
      <!-- Show locked state for Restaurant -->
      <div v-if="!canAccessRestaurant" class="card bg-base-100 shadow-xl border-2 border-dashed border-gray-300">
        <div class="card-body items-center text-center opacity-60">
          <div class="text-4xl mb-2">🔒</div>
          <h2 class="card-title">Restaurant Module</h2>
          <p class="text-sm">Unlock Restaurant features</p>
          <button @click="upgradeToRestaurant" class="btn btn-sm btn-primary mt-2">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const router = useRouter()
const { canAccessModule } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const canAccessPOS = canAccessModule('pos')
const canAccessRestaurant = canAccessModule('restaurant')

function goToSubscription() {
  router.push('/subscription')
}

function upgradeToPOS() {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: 'pos',
    message: 'POS module tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}

function upgradeToRestaurant() {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: 'restaurant',
    message: 'Restaurant module tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}
</script>
```

---

## Summary

These examples show:
1. ✅ Route protection dengan meta
2. ✅ Limit warnings dan enforcement
3. ✅ Conditional rendering dengan FeatureGuard
4. ✅ Proactive feature checks
5. ✅ Payment method gating
6. ✅ Progress bars untuk limits
7. ✅ Trial banner
8. ✅ Locked state dengan upgrade CTAs
9. ✅ API error handling

Copy & adapt contoh-contoh ini untuk implementasi di pages Anda!
