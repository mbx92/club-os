# FRONTEND INTEGRATION GUIDE
## Feature Gating & Subscription Management

**Target Frontend**: Vue.js 3 + Composition API  
**API Handler**: ofetch  
**State Management**: Pinia  
**Last Updated**: 2025-11-22

---

## 📋 Table of Contents

1. [Setup](#setup)
2. [API Client Configuration](#api-client-configuration)
3. [Pinia Store](#pinia-store)
4. [Composables](#composables)
5. [API Error Codes](#api-error-codes)
6. [Error Handling](#error-handling)
7. [UI Components](#ui-components)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

---

## Setup

### Install Dependencies

```bash
npm install ofetch pinia
```

### Project Structure

```
src/
├── api/
│   ├── client.js          # ofetch instance + interceptors
│   └── modules/
│       ├── transactions.js
│       ├── pos.js
│       └── restaurant.js
├── stores/
│   ├── auth.js
│   └── subscription.js    # Feature-gating store
├── composables/
│   └── useFeatureGate.js  # Feature detection composable
└── components/
    ├── UpgradeModal.vue
    ├── LimitModal.vue
    └── FeatureGuard.vue
```

---

## API Client Configuration

### Create API Instance with Error Handling

```javascript
// src/api/client.js
import { ofetch } from 'ofetch'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'

// Custom error classes
export class FeatureGateError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'FeatureGateError'
    this.code = data.code
    this.requiredModule = data.requiredModule
    this.requiredFeature = data.requiredFeature
    this.currentPlan = data.currentPlan
  }
}

export class LimitReachedError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'LimitReachedError'
    this.code = data.code
    this.limit = data.limit
    this.current = data.current
    this.currentPlan = data.currentPlan
  }
}

export class SubscriptionRequiredError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'SubscriptionRequiredError'
    this.code = data.code
  }
}

// Create API instance
export const api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  
  // Interceptor: Add auth token
  async onRequest({ options }) {
    const authStore = useAuthStore()
    
    if (authStore.token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${authStore.token}`
      }
    }
  },
  
  // Interceptor: Handle feature-gating errors
  async onResponseError({ response }) {
    const subscriptionStore = useSubscriptionStore()
    const data = response._data
    
    // 403 - Feature Gating Errors
    if (response.status === 403) {
      if (data.code === 'MODULE_NOT_AVAILABLE') {
        subscriptionStore.showUpgradeModal({
          type: 'module',
          module: data.requiredModule,
          message: data.message,
          currentPlan: data.currentPlan
        })
        throw new FeatureGateError(data)
      }
      
      if (data.code === 'FEATURE_NOT_AVAILABLE') {
        subscriptionStore.showUpgradeModal({
          type: 'feature',
          feature: data.requiredFeature,
          message: data.message,
          currentPlan: data.currentPlan
        })
        throw new FeatureGateError(data)
      }
      
      if (data.code === 'LIMIT_REACHED') {
        subscriptionStore.showLimitModal({
          limit: data.limit,
          current: data.current,
          message: data.message,
          currentPlan: data.currentPlan
        })
        throw new LimitReachedError(data)
      }
    }
    
    // 402 - Subscription Required
    if (response.status === 402) {
      subscriptionStore.showSubscriptionRequiredModal()
      throw new SubscriptionRequiredError(data)
    }
  }
})
```

---

## Pinia Store

### Subscription Store (Pinia)

```javascript
// src/stores/subscription.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const subscription = ref(null)
  const features = ref(null)
  const isTrialActive = ref(false)
  
  // Modal states
  const upgradeModal = ref({
    visible: false,
    type: null, // 'module' | 'feature'
    module: null,
    feature: null,
    message: '',
    currentPlan: ''
  })
  
  const limitModal = ref({
    visible: false,
    limit: 0,
    current: 0,
    message: '',
    currentPlan: ''
  })
  
  const subscriptionRequiredModal = ref({
    visible: false
  })
  
  // Getters
  const currentPlan = computed(() => subscription.value?.plan?.name || 'No Plan')
  const isActive = computed(() => subscription.value?.status === 'active')
  
  // Module access checks
  const hasModule = computed(() => (moduleName) => {
    if (isTrialActive.value) return true
    return features.value?.modules?.[moduleName] === true
  })
  
  // Feature access checks
  const hasFeature = computed(() => (category, featureName) => {
    if (isTrialActive.value) return true
    return features.value?.[category]?.[featureName] === true
  })
  
  // Limit checks
  const getLimit = computed(() => (limitName) => {
    if (isTrialActive.value) return 999999
    return features.value?.limits?.[limitName] || 0
  })
  
  // Actions
  async function fetchSubscription() {
    try {
      const response = await api('/subscription/current')
      subscription.value = response.data.subscription
      features.value = response.data.features
      isTrialActive.value = response.data.isTrialActive
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }
  
  function showUpgradeModal(payload) {
    upgradeModal.value = {
      visible: true,
      ...payload
    }
  }
  
  function hideUpgradeModal() {
    upgradeModal.value.visible = false
  }
  
  function showLimitModal(payload) {
    limitModal.value = {
      visible: true,
      ...payload
    }
  }
  
  function hideLimitModal() {
    limitModal.value.visible = false
  }
  
  function showSubscriptionRequiredModal() {
    subscriptionRequiredModal.value.visible = true
  }
  
  function hideSubscriptionRequiredModal() {
    subscriptionRequiredModal.value.visible = false
  }
  
  return {
    // State
    subscription,
    features,
    isTrialActive,
    upgradeModal,
    limitModal,
    subscriptionRequiredModal,
    
    // Getters
    currentPlan,
    isActive,
    hasModule,
    hasFeature,
    getLimit,
    
    // Actions
    fetchSubscription,
    showUpgradeModal,
    hideUpgradeModal,
    showLimitModal,
    hideLimitModal,
    showSubscriptionRequiredModal,
    hideSubscriptionRequiredModal
  }
})
```

---

## Composables

### Feature Gate Composable

```javascript
// src/composables/useFeatureGate.js
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'

export function useFeatureGate() {
  const subscriptionStore = useSubscriptionStore()
  
  // Check module access
  const canAccessModule = (moduleName) => {
    return computed(() => subscriptionStore.hasModule.value(moduleName))
  }
  
  // Check feature access
  const canUseFeature = (category, featureName) => {
    return computed(() => subscriptionStore.hasFeature.value(category, featureName))
  }
  
  // Check limit
  const getLimit = (limitName) => {
    return computed(() => subscriptionStore.getLimit.value(limitName))
  }
  
  // Check if approaching limit
  const isApproachingLimit = (limitName, currentCount) => {
    return computed(() => {
      const limit = subscriptionStore.getLimit.value(limitName)
      if (limit === 0) return false // Unlimited
      return currentCount >= limit * 0.8 // 80% threshold
    })
  }
  
  return {
    canAccessModule,
    canUseFeature,
    getLimit,
    isApproachingLimit
  }
}
```

---

## API Error Codes

### 1. SUBSCRIPTION_REQUIRED (402)

**Kondisi**: Tenant tidak memiliki active subscription dan trial sudah expired

```json
{
  "success": false,
  "message": "Subscription required",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

**Action**: Redirect ke halaman billing/subscription

---

### 2. MODULE_NOT_AVAILABLE (403)

**Kondisi**: Tenant mencoba akses module yang tidak termasuk di plan mereka

```json
{
  "success": false,
  "message": "Module 'pos' not available in your plan",
  "code": "MODULE_NOT_AVAILABLE",
  "requiredModule": "pos",
  "currentPlan": "Basic"
}
```

**Action**: Show upgrade modal dengan informasi module yang dibutuhkan

---

### 3. FEATURE_NOT_AVAILABLE (403)

**Kondisi**: Tenant mencoba use feature yang disabled di plan mereka

```json
{
  "success": false,
  "message": "Feature 'combinedBilling' not available in your plan",
  "code": "FEATURE_NOT_AVAILABLE",
  "requiredFeature": "transactions.combinedBilling",
  "currentPlan": "Professional"
}
```

**Action**: Show upgrade modal atau disable UI element

---

### 4. LIMIT_REACHED (403)

**Kondisi**: Tenant sudah mencapai limit (users, members, products, dll)

```json
{
  "success": false,
  "message": "maxUsers limit reached",
  "code": "LIMIT_REACHED",
  "limit": 5,
  "current": 5,
  "currentPlan": "Basic"
}
```

**Action**: Show limit reached modal dengan upgrade CTA

---

## Error Handling

### React Example

```javascript
import axios from 'axios';

// API client dengan error interceptor
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Authorization': `Bearer ${getToken()}`
  }
});

// Error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    const errorData = error.response?.data;
    
    if (!errorData) {
      return Promise.reject(error);
    }
    
    // Handle subscription errors
    switch (errorData.code) {
      case 'SUBSCRIPTION_REQUIRED':
        handleSubscriptionRequired();
        break;
        
      case 'MODULE_NOT_AVAILABLE':
        handleModuleNotAvailable(errorData);
        break;
        
      case 'FEATURE_NOT_AVAILABLE':
        handleFeatureNotAvailable(errorData);
        break;
        
      case 'LIMIT_REACHED':
        handleLimitReached(errorData);
        break;
        
      default:
        // Handle other errors
        break;
    }
    
    return Promise.reject(error);
  }
);

// Handler functions
function handleSubscriptionRequired() {
  // Redirect to billing page
  window.location.href = '/billing/subscribe';
}

function handleModuleNotAvailable(errorData) {
  // Show upgrade modal
  showUpgradeModal({
    title: 'Module Not Available',
    message: `The ${errorData.requiredModule} module is not included in your ${errorData.currentPlan} plan.`,
    requiredModule: errorData.requiredModule,
    currentPlan: errorData.currentPlan
  });
}

function handleFeatureNotAvailable(errorData) {
  // Show feature upgrade modal
  showUpgradeModal({
    title: 'Feature Not Available',
    message: `The ${errorData.requiredFeature} feature is not included in your ${errorData.currentPlan} plan.`,
    requiredFeature: errorData.requiredFeature,
    currentPlan: errorData.currentPlan
  });
}

function handleLimitReached(errorData) {
  // Show limit reached modal
  showLimitModal({
    title: 'Limit Reached',
    message: errorData.message,
    limit: errorData.limit,
    current: errorData.current,
    currentPlan: errorData.currentPlan
  });
}

export default api;
```

### Vue Example

```javascript
import axios from 'axios';
import store from './store';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL
});

api.interceptors.response.use(
  response => response,
  error => {
    const errorData = error.response?.data;
    
    if (errorData?.code === 'MODULE_NOT_AVAILABLE') {
      store.dispatch('modals/showUpgradeModal', {
        module: errorData.requiredModule,
        plan: errorData.currentPlan
      });
    }
    
    if (errorData?.code === 'LIMIT_REACHED') {
      store.dispatch('modals/showLimitModal', errorData);
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## UI Components

### 1. UpgradeModal Component

```vue
<!-- src/components/UpgradeModal.vue -->
<template>
  <div v-if="subscriptionStore.upgradeModal.visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="icon-warning">
          <svg><!-- Lock icon --></svg>
        </div>
        
        <p class="message">{{ subscriptionStore.upgradeModal.message }}</p>
        
        <div v-if="subscriptionStore.upgradeModal.type === 'module'" class="details">
          <p>
            Module <strong>{{ subscriptionStore.upgradeModal.module }}</strong> tidak tersedia 
            di plan <strong>{{ subscriptionStore.upgradeModal.currentPlan }}</strong>.
          </p>
        </div>
        
        <div v-else-if="subscriptionStore.upgradeModal.type === 'feature'" class="details">
          <p>
            Fitur <strong>{{ subscriptionStore.upgradeModal.feature }}</strong> tidak tersedia 
            di plan <strong>{{ subscriptionStore.upgradeModal.currentPlan }}</strong>.
          </p>
        </div>
        
        <div class="plans-comparison">
          <h3>Upgrade ke plan yang lebih tinggi:</h3>
          <div class="plans-grid">
            <div class="plan-card">
              <h4>Professional</h4>
              <p class="price">Rp 500.000/bulan</p>
              <ul>
                <li>✓ POS Module</li>
                <li>✓ Restaurant Module</li>
                <li>✓ Combined Billing</li>
                <li>✓ Unlimited Products</li>
              </ul>
              <button @click="upgradeToPlan('professional')" class="btn-upgrade">
                Upgrade Now
              </button>
            </div>
            
            <div class="plan-card featured">
              <span class="badge">Recommended</span>
              <h4>Enterprise</h4>
              <p class="price">Rp 1.000.000/bulan</p>
              <ul>
                <li>✓ All Professional features</li>
                <li>✓ Advanced Analytics</li>
                <li>✓ Priority Support</li>
                <li>✓ Custom Integrations</li>
              </ul>
              <button @click="upgradeToPlan('enterprise')" class="btn-upgrade primary">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary">Nanti Saja</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useRouter } from 'vue-router'

const subscriptionStore = useSubscriptionStore()
const router = useRouter()

const title = computed(() => {
  if (subscriptionStore.upgradeModal.type === 'module') {
    return 'Module Tidak Tersedia'
  }
  return 'Fitur Tidak Tersedia'
})

function close() {
  subscriptionStore.hideUpgradeModal()
}

function upgradeToPlan(plan) {
  close()
  router.push(`/billing/upgrade?plan=${plan}`)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.icon-warning {
  text-align: center;
  margin-bottom: 16px;
}

.message {
  text-align: center;
  font-size: 16px;
  color: #374151;
  margin-bottom: 24px;
}

.details {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.plan-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  position: relative;
}

.plan-card.featured {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  margin: 8px 0;
}

.plan-card ul {
  list-style: none;
  padding: 0;
  margin: 16px 0;
}

.plan-card li {
  padding: 8px 0;
  color: #4b5563;
}

.btn-upgrade {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: #6b7280;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-upgrade:hover {
  background: #4b5563;
}

.btn-upgrade.primary {
  background: #3b82f6;
}

.btn-upgrade.primary:hover {
  background: #2563eb;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #6b7280;
  cursor: pointer;
}
</style>
```

### 2. LimitModal Component

```vue
<!-- src/components/LimitModal.vue -->
<template>
  <div v-if="subscriptionStore.limitModal.visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Limit Tercapai</h2>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="icon-limit">
          <svg><!-- Alert icon --></svg>
        </div>
        
        <p class="message">{{ subscriptionStore.limitModal.message }}</p>
        
        <div class="limit-details">
          <div class="limit-bar">
            <div class="limit-progress" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <p class="limit-text">
            <strong>{{ subscriptionStore.limitModal.current }}</strong> / 
            {{ subscriptionStore.limitModal.limit }} 
            ({{ progressPercentage }}%)
          </p>
        </div>
        
        <div class="alert-box">
          <p>
            Anda sudah mencapai batas maksimal di plan 
            <strong>{{ subscriptionStore.limitModal.currentPlan }}</strong>.
          </p>
          <p>Upgrade ke plan yang lebih tinggi untuk meningkatkan limit Anda.</p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary">Tutup</button>
        <button @click="upgrade" class="btn-primary">Upgrade Plan</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useRouter } from 'vue-router'

const subscriptionStore = useSubscriptionStore()
const router = useRouter()

const progressPercentage = computed(() => {
  const { current, limit } = subscriptionStore.limitModal
  return Math.round((current / limit) * 100)
})

function close() {
  subscriptionStore.hideLimitModal()
}

function upgrade() {
  close()
  router.push('/billing/upgrade')
}
</script>

<style scoped>
/* Similar styling to UpgradeModal */
.limit-bar {
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
}

.limit-progress {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  transition: width 0.3s ease;
}

.limit-text {
  text-align: center;
  font-size: 18px;
  color: #374151;
  margin: 8px 0;
}

.alert-box {
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-left: 8px;
}

.btn-primary:hover {
  background: #2563eb;
}
</style>
```

### 3. FeatureGuard Component (Conditional Rendering)

```vue
<!-- src/components/FeatureGuard.vue -->
<template>
  <div v-if="hasAccess">
    <slot></slot>
  </div>
  <div v-else-if="showUpgradePrompt" class="feature-locked">
    <div class="lock-icon">🔒</div>
    <p>{{ lockedMessage }}</p>
    <button @click="showUpgrade" class="btn-unlock">Unlock This Feature</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

const props = defineProps({
  module: String,
  feature: Object, // { category: 'transactions', name: 'combinedBilling' }
  showUpgradePrompt: {
    type: Boolean,
    default: true
  }
})

const { canAccessModule, canUseFeature } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const hasAccess = computed(() => {
  if (props.module) {
    return canAccessModule(props.module).value
  }
  if (props.feature) {
    return canUseFeature(props.feature.category, props.feature.name).value
  }
  return false
})

const lockedMessage = computed(() => {
  if (props.module) {
    return `Module ${props.module} tidak tersedia di plan Anda`
  }
  if (props.feature) {
    return `Fitur ini tidak tersedia di plan Anda`
  }
  return 'Fitur ini dikunci'
})

function showUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: props.module ? 'module' : 'feature',
    module: props.module,
    feature: props.feature ? `${props.feature.category}.${props.feature.name}` : null,
    message: lockedMessage.value,
    currentPlan: subscriptionStore.currentPlan
  })
}
</script>

<style scoped>
.feature-locked {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: #f9fafb;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.btn-unlock {
  margin-top: 16px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-unlock:hover {
  background: #2563eb;
}
</style>
```

---

## Usage Examples

### Step 1: Detect Locked Feature

User mencoba akses feature yang locked:

```javascript
async function createCombinedTransaction(data) {
  try {
    const response = await api.post('/transactions/combined', data);
    return response.data;
  } catch (error) {
    if (error.response?.data?.code === 'FEATURE_NOT_AVAILABLE') {
      // Feature locked, show upgrade path
      const requiredFeature = error.response.data.requiredFeature;
      const currentPlan = error.response.data.currentPlan;
      
      // Show modal dengan informasi upgrade
      showUpgradeModal({
        feature: requiredFeature,
        currentPlan: currentPlan,
        availableIn: ['Professional', 'Enterprise'] // Get from plan comparison
      });
    }
    throw error;
  }
}
```

### Step 2: Show Upgrade Modal

```jsx
// React Component
import React from 'react';
import { useNavigate } from 'react-router-dom';

function UpgradeModal({ isOpen, feature, currentPlan, onClose }) {
  const navigate = useNavigate();
  
  const handleUpgrade = () => {
    navigate('/billing/upgrade', { 
      state: { 
        feature,
        currentPlan 
      } 
    });
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="upgrade-modal">
        <h2>🔒 Feature Locked</h2>
        <p>
          The <strong>{feature}</strong> feature is not available 
          in your <strong>{currentPlan}</strong> plan.
        </p>
        <p>
          Upgrade to <strong>Professional</strong> or <strong>Enterprise</strong> 
          to unlock this feature.
        </p>
        
        <div className="modal-actions">
          <button onClick={onClose}>Maybe Later</button>
          <button onClick={handleUpgrade} className="primary">
            View Plans
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

### Step 3: Redirect to Upgrade Page

```jsx
function UpgradePage() {
  const location = useLocation();
  const { feature, currentPlan } = location.state || {};
  
  return (
    <div className="upgrade-page">
      <h1>Upgrade Your Plan</h1>
      
      {feature && (
        <div className="upgrade-reason">
          You need <strong>{feature}</strong> which is available in:
        </div>
      )}
      
      <PlanComparison 
        currentPlan={currentPlan} 
        highlightFeature={feature}
      />
    </div>
  );
}
```

---

## Feature Detection

### Fetch Subscription Info

```javascript
// Get current subscription dengan features
async function fetchSubscription() {
  const response = await api.get('/billing/subscription');
  return response.data;
}

// Example response
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "plan": {
      "name": "Professional",
      "features": {
        "modules": {
          "gym": true,
          "pos": true,
          "restaurant": true,
          "classes": true
        },
        "limits": {
          "maxUsers": 10,
          "maxMembers": 500,
          "maxProducts": 0
        },
        "transactions": {
          "combinedBilling": true,
          "installments": true,
          "vouchers": true
        },
        "payments": {
          "cash": true,
          "creditCard": true,
          "eWallet": true
        }
      }
    }
  }
}
```

### Store Features in State

```javascript
// React Context
import React, { createContext, useContext, useState, useEffect } from 'react';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [features, setFeatures] = useState(null);
  
  useEffect(() => {
    fetchSubscription().then(data => {
      setSubscription(data.data);
      setFeatures(data.data.plan.features);
    });
  }, []);
  
  // Helper functions
  const hasModule = (moduleName) => {
    return features?.modules?.[moduleName] === true;
  };
  
  const hasFeature = (category, featureName) => {
    return features?.[category]?.[featureName] === true;
  };
  
  const getLimit = (limitName) => {
    return features?.limits?.[limitName] || 0;
  };
  
  return (
    <SubscriptionContext.Provider value={{
      subscription,
      features,
      hasModule,
      hasFeature,
      getLimit
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
```

### Use in Components

```jsx
import { useSubscription } from './SubscriptionContext';

function POSButton() {
  const { hasModule } = useSubscription();
  
  // Hide button if module not available
  if (!hasModule('pos')) {
    return null;
  }
  
  return (
    <button onClick={goToPOS}>
      Open POS
    </button>
  );
}

function CombinedBillingButton() {
  const { hasFeature } = useSubscription();
  
  if (!hasFeature('transactions', 'combinedBilling')) {
    return (
      <button disabled className="locked">
        🔒 Combined Billing (Professional Plan)
      </button>
    );
  }
  
  return (
    <button onClick={createCombinedBill}>
      Create Combined Bill
    </button>
  );
}

function UserLimitIndicator() {
  const { getLimit } = useSubscription();
  const [currentUsers, setCurrentUsers] = useState(0);
  
  const maxUsers = getLimit('maxUsers');
  const isUnlimited = maxUsers === 0;
  
  return (
    <div className="limit-indicator">
      Users: {currentUsers} / {isUnlimited ? '∞' : maxUsers}
    </div>
  );
}
```

---

## UI Components

### Locked Feature Badge

```jsx
function LockedFeatureBadge({ planRequired }) {
  return (
    <span className="locked-badge">
      🔒 {planRequired} Plan
    </span>
  );
}

// Usage
<button disabled>
  Advanced Reports <LockedFeatureBadge planRequired="Enterprise" />
</button>
```

### Plan Comparison Table

```jsx
function PlanComparison({ currentPlan, highlightFeature }) {
  const plans = [
    {
      name: 'Basic',
      price: 99000,
      features: {
        modules: ['gym', 'reports'],
        limits: { maxUsers: 3, maxMembers: 50 },
        transactions: [],
        payments: ['cash']
      }
    },
    {
      name: 'Professional',
      price: 299000,
      features: {
        modules: ['gym', 'pos', 'restaurant', 'classes', 'reports'],
        limits: { maxUsers: 10, maxMembers: 500 },
        transactions: ['combinedBilling', 'installments', 'vouchers', 'refunds'],
        payments: ['cash', 'creditCard', 'bankTransfer', 'eWallet', 'qris']
      }
    },
    {
      name: 'Enterprise',
      price: 999000,
      features: {
        modules: ['gym', 'pos', 'restaurant', 'classes', 'reports', 'advancedReports'],
        limits: { maxUsers: 0, maxMembers: 0 }, // Unlimited
        transactions: ['combinedBilling', 'installments', 'vouchers', 'refunds', 'loyaltyPoints'],
        payments: ['cash', 'creditCard', 'bankTransfer', 'eWallet', 'qris']
      }
    }
  ];
  
  return (
    <div className="plan-comparison">
      {plans.map(plan => (
        <PlanCard 
          key={plan.name}
          plan={plan}
          isCurrent={plan.name === currentPlan}
          highlightFeature={highlightFeature}
        />
      ))}
    </div>
  );
}
```

---

## Usage Examples

### Example 1: Protected Route (Router Guard)

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscription'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/pos',
      component: () => import('@/views/POS.vue'),
      meta: { requiresModule: 'pos' }
    },
    {
      path: '/restaurant',
      component: () => import('@/views/Restaurant.vue'),
      meta: { requiresModule: 'restaurant' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const subscriptionStore = useSubscriptionStore()
  
  if (to.meta.requiresModule) {
    const hasAccess = subscriptionStore.hasModule.value(to.meta.requiresModule)
    
    if (!hasAccess) {
      subscriptionStore.showUpgradeModal({
        type: 'module',
        module: to.meta.requiresModule,
        message: `Module ${to.meta.requiresModule} tidak tersedia di plan Anda`,
        currentPlan: subscriptionStore.currentPlan
      })
      return next(false)
    }
  }
  
  next()
})

export default router
```

### Example 2: API Call with Error Handling

```vue
<!-- src/views/Transactions.vue -->
<template>
  <div>
    <button @click="createCombinedBill" :disabled="!canUseCombinedBilling">
      Create Combined Bill
    </button>
    
    <p v-if="!canUseCombinedBilling" class="feature-hint">
      Combined billing tidak tersedia di plan Anda. 
      <a @click="showUpgrade">Upgrade</a>
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { api, FeatureGateError } from '@/api/client'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

const { canUseFeature } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const canUseCombinedBilling = canUseFeature('transactions', 'combinedBilling')

async function createCombinedBill() {
  try {
    const response = await api('/transactions/combined', {
      method: 'POST',
      body: {
        items: [
          { type: 'membership', id: 123, price: 500000 },
          { type: 'pos', id: 456, price: 50000, quantity: 2 }
        ],
        payments: [
          { method: 'cash', amount: 300000 },
          { method: 'card', amount: 300000 }
        ]
      }
    })
    
    console.log('Transaction created:', response.data)
  } catch (error) {
    if (error instanceof FeatureGateError) {
      // Error modal sudah ditampilkan oleh interceptor
      console.log('Feature not available:', error.code)
    } else {
      console.error('Transaction failed:', error)
    }
  }
}

function showUpgrade() {
  subscriptionStore.showUpgradeModal({
    type: 'feature',
    feature: 'transactions.combinedBilling',
    message: 'Combined billing tidak tersedia di plan Anda',
    currentPlan: subscriptionStore.currentPlan
  })
}
</script>
```

### Example 3: Conditional UI with FeatureGuard

```vue
<!-- src/views/Dashboard.vue -->
<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    
    <!-- Always visible -->
    <section>
      <h2>Membership Management</h2>
      <MembershipStats />
    </section>
    
    <!-- Only visible if POS module available -->
    <FeatureGuard module="pos">
      <section>
        <h2>Point of Sale</h2>
        <POSStats />
      </section>
    </FeatureGuard>
    
    <!-- Only visible if restaurant module available -->
    <FeatureGuard module="restaurant">
      <section>
        <h2>Restaurant Orders</h2>
        <RestaurantStats />
      </section>
    </FeatureGuard>
    
    <!-- Only visible if advanced reports feature available -->
    <FeatureGuard :feature="{ category: 'reports', name: 'advancedReports' }">
      <section>
        <h2>Advanced Analytics</h2>
        <AdvancedReports />
      </section>
    </FeatureGuard>
  </div>
</template>

<script setup>
import FeatureGuard from '@/components/FeatureGuard.vue'
import MembershipStats from '@/components/MembershipStats.vue'
import POSStats from '@/components/POSStats.vue'
import RestaurantStats from '@/components/RestaurantStats.vue'
import AdvancedReports from '@/components/AdvancedReports.vue'
</script>
```

### Example 4: Limit Enforcement on Create

```vue
<!-- src/views/Users.vue -->
<template>
  <div>
    <button @click="createUser" :disabled="isAtLimit">
      Add User
    </button>
    
    <p v-if="isApproachingLimit" class="warning">
      ⚠️ You're approaching your user limit ({{ userCount }}/{{ maxUsers }})
    </p>
    
    <p v-if="isAtLimit" class="error">
      🚫 User limit reached. Please upgrade to add more users.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, LimitReachedError } from '@/api/client'
import { useFeatureGate } from '@/composables/useFeatureGate'

const { getLimit, isApproachingLimit } = useFeatureGate()
const userCount = ref(0)

const maxUsers = getLimit('maxUsers')
const isAtLimit = computed(() => userCount.value >= maxUsers.value)
const isApproachingLimitComputed = isApproachingLimit('maxUsers', userCount.value)

onMounted(async () => {
  // Fetch current user count
  const response = await api('/users/count')
  userCount.value = response.data.count
})

async function createUser() {
  try {
    const response = await api('/users', {
      method: 'POST',
      body: {
        name: 'New User',
        email: 'newuser@example.com',
        role: 'staff'
      }
    })
    
    userCount.value++
    console.log('User created:', response.data)
  } catch (error) {
    if (error instanceof LimitReachedError) {
      // Limit modal sudah ditampilkan oleh interceptor
      console.log('User limit reached')
    } else {
      console.error('Failed to create user:', error)
    }
  }
}
</script>
```

### Example 5: Proactive Feature Check (Before API Call)

```vue
<!-- src/views/Payments.vue -->
<template>
  <div>
    <h2>Payment Methods</h2>
    
    <div class="payment-methods">
      <button @click="selectPayment('cash')" :class="{ active: method === 'cash' }">
        💵 Cash
      </button>
      
      <button 
        @click="selectPayment('card')" 
        :disabled="!canUseCreditCard"
        :class="{ active: method === 'card' }"
      >
        💳 Credit Card
        <span v-if="!canUseCreditCard" class="badge-pro">PRO</span>
      </button>
      
      <button 
        @click="selectPayment('qris')" 
        :disabled="!canUseQRIS"
        :class="{ active: method === 'qris' }"
      >
        📱 QRIS
        <span v-if="!canUseQRIS" class="badge-pro">PRO</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

const { canUseFeature } = useFeatureGate()
const subscriptionStore = useSubscriptionStore()

const method = ref('cash')

const canUseCreditCard = canUseFeature('payments', 'creditCard')
const canUseQRIS = canUseFeature('payments', 'qris')

function selectPayment(paymentMethod) {
  // Proactive check before setting
  if (paymentMethod === 'card' && !canUseCreditCard.value) {
    subscriptionStore.showUpgradeModal({
      type: 'feature',
      feature: 'payments.creditCard',
      message: 'Credit card payment tidak tersedia di plan Anda',
      currentPlan: subscriptionStore.currentPlan
    })
    return
  }
  
  if (paymentMethod === 'qris' && !canUseQRIS.value) {
    subscriptionStore.showUpgradeModal({
      type: 'feature',
      feature: 'payments.qris',
      message: 'QRIS payment tidak tersedia di plan Anda',
      currentPlan: subscriptionStore.currentPlan
    })
    return
  }
  
  method.value = paymentMethod
}
</script>

<style scoped>
.payment-methods {
  display: flex;
  gap: 12px;
}

button {
  position: relative;
  padding: 12px 24px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.badge-pro {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #f59e0b;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
</style>
```

---

## Best Practices

### 1. ✅ Fetch Subscription on App Mount

```javascript
// src/App.vue
<script setup>
import { onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await subscriptionStore.fetchSubscription()
  }
})
</script>
```

### 2. ✅ Proactive UI Hiding

Jangan tunggu error dari API, hide/disable UI elements proactively:

```vue
<template>
  <!-- Bad: User clicks, gets error -->
  <button @click="createPOSTransaction">POS Sale</button>
  
  <!-- Good: Button disabled + tooltip -->
  <button 
    @click="createPOSTransaction" 
    :disabled="!canAccessPOS"
    :title="canAccessPOS ? '' : 'POS module tidak tersedia di plan Anda'"
  >
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

### 3. ✅ Graceful Degradation

Jika fitur tidak available, provide alternative atau hide gracefully:

```vue
<template>
  <div>
    <!-- Show advanced chart if available -->
    <AdvancedChart v-if="hasAdvancedReports" />
    
    <!-- Fallback to basic chart -->
    <BasicChart v-else />
  </div>
</template>
```

### 4. ✅ Show Upgrade CTA Strategically

Jangan spam user dengan upgrade prompts. Show di tempat yang relevan:

```vue
<template>
  <div class="sidebar">
    <router-link to="/dashboard">Dashboard</router-link>
    <router-link to="/members">Members</router-link>
    
    <!-- Module locked: Show upgrade hint -->
    <div v-if="!canAccessPOS" class="locked-menu-item" @click="showPOSUpgrade">
      <span>POS</span>
      <span class="lock-badge">🔒 PRO</span>
    </div>
    <router-link v-else to="/pos">POS</router-link>
  </div>
</template>
```

### 5. ✅ Handle Limit Approaching

Warn user sebelum limit reached:

```vue
<template>
  <div v-if="isApproachingLimit" class="alert-warning">
    ⚠️ You're using {{ userCount }}/{{ maxUsers }} users. 
    <a @click="upgrade">Upgrade</a> to add more.
  </div>
</template>
```

### 6. ✅ Cache Subscription Data

Hindari fetch subscription di setiap component. Cache di Pinia store:

```javascript
// Good: Single source of truth in Pinia
const subscriptionStore = useSubscriptionStore()
const features = subscriptionStore.features

// Bad: Fetch in every component
const fetchFeatures = async () => {
  const response = await api('/subscription/features')
  // ...
}
```

### 7. ✅ Error Boundary for Feature Gates

```vue
<template>
  <ErrorBoundary>
    <FeatureGuard module="pos">
      <POSModule />
    </FeatureGuard>
  </ErrorBoundary>
</template>
```

### 8. ✅ Trial Mode Indication

Show trial status clearly:

```vue
<template>
  <div v-if="isInTrial" class="trial-banner">
    🎉 You're in trial mode! All features unlocked until {{ trialEndsAt }}
    <button @click="subscribe">Subscribe Now</button>
  </div>
</template>
```

### 9. ⛔ Don't Trust Client-Side Only

**NEVER** rely only on frontend checks. Backend MUST enforce:

```javascript
// Bad: Only check on frontend
if (canUseCreditCard.value) {
  // Process payment - ANYONE can bypass this with DevTools
}

// Good: Check on frontend for UX, backend enforces
if (canUseCreditCard.value) {
  try {
    await api.post('/payments/credit-card', data)
    // Backend will return 403 if feature not available
  } catch (error) {
    // Handle error
  }
}
```

### 10. ✅ Analytics Tracking

Track feature gate encounters untuk insights:

```javascript
// src/composables/useFeatureGate.js
import { analytics } from '@/utils/analytics'

function canAccessModule(moduleName) {
  return computed(() => {
    const hasAccess = subscriptionStore.hasModule.value(moduleName)
    
    if (!hasAccess) {
      analytics.track('feature_gate_hit', {
        type: 'module',
        module: moduleName,
        plan: subscriptionStore.currentPlan
      })
    }
    
    return hasAccess
  })
}
```

---

## API Endpoints Reference

### GET /subscription/current

Fetch current subscription dan features:

```javascript
const response = await api('/subscription/current')

// Response:
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "status": "active",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "plan": {
        "name": "Professional",
        "price": 500000,
        "features": { /* full features object */ }
      }
    },
    "features": {
      "modules": {
        "gym": true,
        "pos": true,
        "restaurant": true
      },
      "limits": {
        "maxUsers": 20,
        "maxMembers": 500
      },
      // ... all features
    },
    "isTrialActive": false
  }
}
```

### GET /subscription/plans

Fetch available plans untuk upgrade page:

```javascript
const response = await api('/subscription/plans')

// Response:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Basic",
        "price": 0,
        "features": { /* ... */ }
      },
      {
        "id": "uuid",
        "name": "Professional",
        "price": 500000,
        "features": { /* ... */ }
      },
      {
        "id": "uuid",
        "name": "Enterprise",
        "price": 1000000,
        "features": { /* ... */ }
      }
    ]
  }
}
```

---

## Testing

### Unit Test for Composable

```javascript
// tests/composables/useFeatureGate.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { useSubscriptionStore } from '@/stores/subscription'

describe('useFeatureGate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should allow access to enabled module', () => {
    const subscriptionStore = useSubscriptionStore()
    subscriptionStore.features = {
      modules: { pos: true }
    }
    
    const { canAccessModule } = useFeatureGate()
    const canAccessPOS = canAccessModule('pos')
    
    expect(canAccessPOS.value).toBe(true)
  })
  
  it('should deny access to disabled module', () => {
    const subscriptionStore = useSubscriptionStore()
    subscriptionStore.features = {
      modules: { pos: false }
    }
    
    const { canAccessModule } = useFeatureGate()
    const canAccessPOS = canAccessModule('pos')
    
    expect(canAccessPOS.value).toBe(false)
  })
  
  it('should allow all modules during trial', () => {
    const subscriptionStore = useSubscriptionStore()
    subscriptionStore.isTrialActive = true
    subscriptionStore.features = {
      modules: { pos: false }
    }
    
    const { canAccessModule } = useFeatureGate()
    const canAccessPOS = canAccessModule('pos')
    
    expect(canAccessPOS.value).toBe(true)
  })
})
```

### Component Test

```javascript
// tests/components/FeatureGuard.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FeatureGuard from '@/components/FeatureGuard.vue'
import { useSubscriptionStore } from '@/stores/subscription'

describe('FeatureGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should render slot when module is available', () => {
    const subscriptionStore = useSubscriptionStore()
    subscriptionStore.features = {
      modules: { pos: true }
    }
    
    const wrapper = mount(FeatureGuard, {
      props: { module: 'pos' },
      slots: {
        default: '<div>POS Content</div>'
      }
    })
    
    expect(wrapper.text()).toContain('POS Content')
  })
  
  it('should show locked message when module not available', () => {
    const subscriptionStore = useSubscriptionStore()
    subscriptionStore.features = {
      modules: { pos: false }
    }
    
    const wrapper = mount(FeatureGuard, {
      props: { 
        module: 'pos',
        showUpgradePrompt: true
      },
      slots: {
        default: '<div>POS Content</div>'
      }
    })
    
    expect(wrapper.text()).not.toContain('POS Content')
    expect(wrapper.text()).toContain('tidak tersedia')
  })
})
```

---

## Troubleshooting

### Issue: Modal Tidak Muncul

**Symptom**: Error 403 tapi modal upgrade tidak muncul

**Solution**:
1. Check interceptor terpasang di API client
2. Check subscription store sudah di-import
3. Check modal component sudah di-mount di App.vue:

```vue
<!-- App.vue -->
<template>
  <div>
    <RouterView />
    
    <!-- Mount modals globally -->
    <UpgradeModal />
    <LimitModal />
  </div>
</template>
```

### Issue: Features Always Null

**Symptom**: `subscriptionStore.features` selalu null

**Solution**:
1. Panggil `fetchSubscription()` on app mount
2. Check API endpoint `/subscription/current` return correct format
3. Check authentication token valid

### Issue: Trial Mode Tidak Terdeteksi

**Symptom**: Trial user tidak bisa akses fitur premium

**Solution**:
1. Backend harus return `isTrialActive: true` di response
2. Check logic di composable: `if (isTrialActive.value) return true`
3. Check tenant `trialEndsAt` date masih valid

---

## Summary

### Key Points

1. ✅ **Setup ofetch** dengan error interceptor
2. ✅ **Create Pinia store** untuk subscription state
3. ✅ **Use composables** untuk reusable feature checks
4. ✅ **Build UI components** (UpgradeModal, LimitModal, FeatureGuard)
5. ✅ **Proactive UI hiding** sebelum API call
6. ✅ **Graceful error handling** dengan clear upgrade path
7. ✅ **Never trust frontend only** - backend must enforce

### Frontend Responsibilities

- ✅ Detect feature availability
- ✅ Hide/disable UI proactively
- ✅ Show helpful upgrade prompts
- ✅ Handle API errors gracefully
- ✅ Track analytics

### Backend Responsibilities

- ✅ Enforce feature gates (middleware)
- ✅ Return clear error codes
- ✅ Provide subscription/features API
- ✅ Handle limit checking
- ✅ Log feature gate hits

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2025-11-22  
**For Questions**: Contact backend team



### 1. Graceful Degradation

```javascript
// ❌ BAD: Hard fail
async function createOrder() {
  const response = await api.post('/restaurant/orders', data);
  // Throws error if module not available
}

// ✅ GOOD: Check first, fallback gracefully
async function createOrder() {
  if (!hasModule('restaurant')) {
    toast.error('Restaurant module not available in your plan');
    showUpgradePrompt('restaurant');
    return null;
  }
  
  try {
    const response = await api.post('/restaurant/orders', data);
    return response.data;
  } catch (error) {
    if (error.response?.data?.code === 'MODULE_NOT_AVAILABLE') {
      showUpgradePrompt('restaurant');
    }
    throw error;
  }
}
```

### 2. Preemptive UI Hiding

```jsx
// ❌ BAD: Show button, fail on click
function RestaurantButton() {
  return (
    <button onClick={goToRestaurant}>
      Restaurant
    </button>
  );
}

// ✅ GOOD: Hide if not available
function RestaurantButton() {
  const { hasModule } = useSubscription();
  
  if (!hasModule('restaurant')) {
    return null; // or show locked state
  }
  
  return (
    <button onClick={goToRestaurant}>
      Restaurant
    </button>
  );
}
```

### 3. Clear Upgrade CTAs

```jsx
// ✅ GOOD: Clear, actionable upgrade prompts
function LimitReachedModal({ limit, current, onUpgrade }) {
  return (
    <Modal>
      <h2>User Limit Reached</h2>
      <p>
        You've reached your limit of <strong>{limit} users</strong>.
      </p>
      <p>
        Upgrade to <strong>Professional</strong> for up to 10 users, 
        or <strong>Enterprise</strong> for unlimited users.
      </p>
      <button onClick={onUpgrade}>
        View Upgrade Options
      </button>
    </Modal>
  );
}
```

### 4. Cache Subscription Data

```javascript
// Cache subscription data untuk reduce API calls
const CACHE_KEY = 'subscription_features';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getSubscriptionFeatures() {
  const cached = localStorage.getItem(CACHE_KEY);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  
  const response = await api.get('/billing/subscription');
  const features = response.data.data.plan.features;
  
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: features,
    timestamp: Date.now()
  }));
  
  return features;
}
```

### 5. Handle Trial Mode

```javascript
function SubscriptionBanner() {
  const { subscription } = useSubscription();
  
  // Show trial banner
  if (subscription?.isInTrial) {
    const daysLeft = calculateDaysLeft(subscription.trialEndsAt);
    
    return (
      <div className="trial-banner">
        ⏰ Trial: {daysLeft} days left. 
        <a href="/billing/subscribe">Subscribe now</a> to keep access.
      </div>
    );
  }
  
  return null;
}
```

---

## Testing

### Mock API Responses

```javascript
// For testing locked features
const mockLockedFeatureResponse = {
  success: false,
  message: "Feature 'combinedBilling' not available in your plan",
  code: 'FEATURE_NOT_AVAILABLE',
  requiredFeature: 'transactions.combinedBilling',
  currentPlan: 'Basic'
};

// For testing limit reached
const mockLimitReachedResponse = {
  success: false,
  message: "maxUsers limit reached",
  code: 'LIMIT_REACHED',
  limit: 5,
  current: 5,
  currentPlan: 'Basic'
};
```

---

## Summary

**Frontend Responsibilities**:
1. ✅ Detect API error codes
2. ✅ Handle errors gracefully
3. ✅ Show upgrade prompts
4. ✅ Hide locked features
5. ✅ Cache subscription data
6. ✅ Display trial status

**Key Points**:
- Use error interceptors untuk handle subscription errors
- Fetch subscription features on app load
- Store features di global state (Context/Redux/Vuex)
- Hide UI elements untuk locked features
- Show clear upgrade CTAs
- Cache features untuk performance

---

**Questions?** Contact backend team untuk detail API responses.
