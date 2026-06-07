# Subscription API Endpoints for Frontend Integration

## Overview
This document provides complete API documentation for the subscription management endpoints required by the frontend application.

---

## Base URL
```
http://localhost:3000/api/v1/billing
```

---

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Get Current Subscription

**Endpoint:** `GET /subscription/current`

**Description:** Retrieves the current tenant's active subscription with comprehensive feature details.

**Authorization:** Authenticated users

**Request:**
```http
GET /api/v1/billing/subscription/current
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid-here",
      "status": "active",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z",
      "plan": {
        "id": "plan-uuid",
        "name": "Professional",
        "description": "Complete gym management solution",
        "price": "499000.00",
        "duration": 365,
        "features": {
          "modules": {
            "gym": true,
            "pos": true,
            "restaurant": true
          }
        }
      }
    },
    "features": {
      "modules": {
        "gym": true,
        "pos": true,
        "restaurant": true,
        "inventory": true,
        "reporting": true
      },
      "limits": {
        "maxUsers": 10,
        "maxMembers": 500,
        "maxProducts": 1000,
        "maxTransactionsPerMonth": 5000,
        "maxStorageGB": 20
      },
      "transactions": {
        "combinedBilling": true,
        "splitPayments": true,
        "refunds": true
      },
      "payments": {
        "cash": true,
        "creditCard": true,
        "debitCard": true,
        "bankTransfer": true,
        "eWallet": true
      },
      "reporting": {
        "salesReports": true,
        "membershipReports": true,
        "inventoryReports": true,
        "customReports": true,
        "exportPDF": true,
        "exportExcel": true
      },
      "integrations": {
        "thermalPrinter": true,
        "whatsapp": true,
        "email": true,
        "sms": false
      },
      "support": {
        "priority": "high",
        "responseTime": "2-4 hours",
        "channels": ["email", "chat", "phone"]
      }
    },
    "isTrialActive": false
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No active subscription found"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (invalid/missing token)
- `404`: No active subscription found
- `500`: Server error

---

### 2. Get Available Plans

**Endpoint:** `GET /subscription/plans`

**Description:** Retrieves all available subscription plans for display on upgrade/selection pages.

**Authorization:** Authenticated users

**Request:**
```http
GET /api/v1/billing/subscription/plans
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan-uuid-1",
      "name": "Basic",
      "description": "Essential gym membership management",
      "price": "99000.00",
      "duration": 30,
      "limits": {
        "maxUsers": 3,
        "maxMembers": 100,
        "maxProducts": 50,
        "maxTransactionsPerMonth": 500,
        "maxStorageGB": 5
      },
      "features": {
        "modules": {
          "gym": true,
          "pos": false,
          "restaurant": false,
          "inventory": false,
          "reporting": true
        },
        "transactions": {
          "combinedBilling": false,
          "splitPayments": false,
          "refunds": false
        },
        "payments": {
          "cash": true,
          "creditCard": false,
          "debitCard": false,
          "bankTransfer": true,
          "eWallet": false
        },
        "reporting": {
          "salesReports": true,
          "membershipReports": true,
          "inventoryReports": false,
          "customReports": false,
          "exportPDF": true,
          "exportExcel": false
        },
        "integrations": {
          "thermalPrinter": false,
          "whatsapp": false,
          "email": true,
          "sms": false
        },
        "support": {
          "priority": "standard",
          "responseTime": "24-48 hours",
          "channels": ["email"]
        }
      }
    },
    {
      "id": "plan-uuid-2",
      "name": "Professional",
      "description": "Complete gym management solution",
      "price": "499000.00",
      "duration": 365,
      "limits": {
        "maxUsers": 10,
        "maxMembers": 500,
        "maxProducts": 1000,
        "maxTransactionsPerMonth": 5000,
        "maxStorageGB": 20
      },
      "features": {
        "modules": {
          "gym": true,
          "pos": true,
          "restaurant": true,
          "inventory": true,
          "reporting": true
        },
        "transactions": {
          "combinedBilling": true,
          "splitPayments": true,
          "refunds": true
        },
        "payments": {
          "cash": true,
          "creditCard": true,
          "debitCard": true,
          "bankTransfer": true,
          "eWallet": true
        },
        "reporting": {
          "salesReports": true,
          "membershipReports": true,
          "inventoryReports": true,
          "customReports": true,
          "exportPDF": true,
          "exportExcel": true
        },
        "integrations": {
          "thermalPrinter": true,
          "whatsapp": true,
          "email": true,
          "sms": false
        },
        "support": {
          "priority": "high",
          "responseTime": "2-4 hours",
          "channels": ["email", "chat", "phone"]
        }
      }
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 3. Upgrade Subscription

**Endpoint:** `POST /subscription/upgrade`

**Description:** Upgrades the current subscription to a new plan. Creates a pending subscription that will be activated after payment confirmation.

**Authorization:** Authenticated users with Subscription management permission

**Request:**
```http
POST /api/v1/billing/subscription/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "plan-uuid-here",
  "paymentMethod": "bank_transfer"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| planId | string (UUID) | Yes | ID of the target subscription plan |
| paymentMethod | string | No | Payment method: `bank_transfer`, `credit_card`, `e_wallet` (default: `bank_transfer`) |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "new-subscription-uuid",
      "status": "pending",
      "startDate": "2025-11-22T00:00:00.000Z",
      "endDate": "2026-11-22T23:59:59.999Z",
      "plan": {
        "id": "plan-uuid",
        "name": "Professional",
        "description": "Complete gym management solution",
        "price": "499000.00",
        "duration": 365
      }
    },
    "message": "Subscription upgrade initiated. Please complete payment to activate."
  }
}
```

**Response (400 Bad Request - Same Plan):**
```json
{
  "success": false,
  "message": "You are already on this plan. Use renew instead."
}
```

**Response (400 Bad Request - Downgrade Attempt):**
```json
{
  "success": false,
  "message": "Cannot downgrade to a lower-priced plan. Please contact support.",
  "currentPlan": "Professional",
  "targetPlan": "Basic"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Subscription plan not found"
}
```

**Status Codes:**
- `201`: Upgrade initiated successfully
- `400`: Invalid request (same plan, downgrade, or missing planId)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Plan not found
- `500`: Server error

---

## Complete Workflow Example

### 1. Display Current Subscription on Dashboard

```javascript
// Fetch current subscription on dashboard load
const response = await fetch('/api/v1/billing/subscription/current', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

// Display subscription info
console.log(`Plan: ${data.subscription.plan.name}`);
console.log(`Status: ${data.subscription.status}`);
console.log(`Expires: ${data.subscription.endDate}`);
console.log(`Max Users: ${data.features.limits.maxUsers}`);
console.log(`Max Members: ${data.features.limits.maxMembers}`);

// Check feature access
if (data.features.modules.pos) {
  // Enable POS module in UI
}

if (data.isTrialActive) {
  // Show trial banner
}
```

### 2. Show Upgrade Options

```javascript
// Fetch available plans
const plansResponse = await fetch('/api/v1/billing/subscription/plans', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: plans } = await plansResponse.json();

// Display plans in UI
plans.forEach(plan => {
  console.log(`${plan.name} - Rp ${plan.price}/${plan.duration} days`);
  console.log(`Users: ${plan.limits.maxUsers}`);
  console.log(`Members: ${plan.limits.maxMembers}`);
});
```

### 3. Process Upgrade

```javascript
// User selects a plan and clicks upgrade
const upgradeResponse = await fetch('/api/v1/billing/subscription/upgrade', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: selectedPlanId,
    paymentMethod: 'bank_transfer'
  })
});

const { data } = await upgradeResponse.json();

if (upgradeResponse.ok) {
  // Redirect to payment page
  console.log('New subscription created:', data.subscription.id);
  console.log('Status:', data.subscription.status); // "pending"
  
  // Next: Create invoice and process payment
  // After payment: Call /billing/subscriptions/:id/activate
}
```

### 4. Activate After Payment

```javascript
// After payment is confirmed, activate the subscription
const activateResponse = await fetch(
  `/api/v1/billing/subscriptions/${subscriptionId}/activate`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

if (activateResponse.ok) {
  // Subscription is now active
  // Refresh current subscription data
  window.location.href = '/dashboard';
}
```

---

## Frontend UI Components Needed

### Vue.js 3 Implementation

#### 1. **Types & Interfaces** (`types/subscription.ts`)
```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: number;
  features: {
    modules: Record<string, boolean>;
    transactions: Record<string, boolean>;
    payments: Record<string, boolean>;
    reporting: Record<string, boolean>;
    integrations: Record<string, boolean>;
    support: Record<string, any>;
  };
  limits: {
    maxUsers: number;
    maxMembers: number;
    maxProducts: number | null;
    maxTransactionsPerMonth: number | null;
    maxStorageGB: number | null;
  };
}

export interface Subscription {
  id: string;
  status: 'trial' | 'pending' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  plan: {
    id: string;
    name: string;
    description: string;
    price: string;
    duration: number;
    features: Record<string, any>;
  };
}

export interface CurrentSubscriptionData {
  subscription: Subscription;
  features: {
    modules: Record<string, boolean>;
    limits: {
      maxUsers: number;
      maxMembers: number;
      maxProducts: number | null;
      maxTransactionsPerMonth: number | null;
      maxStorageGB: number | null;
    };
    transactions: Record<string, boolean>;
    payments: Record<string, boolean>;
    reporting: Record<string, boolean>;
    integrations: Record<string, boolean>;
    support: Record<string, any>;
  };
  isTrialActive: boolean;
}
```

#### 2. **API Service** (`services/subscriptionService.ts`)
```typescript
import axios from 'axios';
import type { SubscriptionPlan, CurrentSubscriptionData } from '@/types/subscription';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const subscriptionService = {
  /**
   * Get current tenant's subscription
   */
  async getCurrentSubscription(): Promise<CurrentSubscriptionData> {
    const response = await apiClient.get('/billing/subscription/current');
    return response.data.data;
  },

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.get('/billing/subscription/plans');
    return response.data.data;
  },

  /**
   * Upgrade to a new subscription plan
   */
  async upgradeSubscription(planId: string, paymentMethod: string = 'bank_transfer') {
    const response = await apiClient.post('/billing/subscription/upgrade', {
      planId,
      paymentMethod,
    });
    return response.data.data;
  },
};
```

#### 3. **Composable for State Management** (`composables/useSubscription.ts`)
```typescript
import { ref, computed } from 'vue';
import { subscriptionService } from '@/services/subscriptionService';
import type { CurrentSubscriptionData, SubscriptionPlan } from '@/types/subscription';

export function useSubscription() {
  const currentSubscription = ref<CurrentSubscriptionData | null>(null);
  const availablePlans = ref<SubscriptionPlan[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const isTrialActive = computed(() => currentSubscription.value?.isTrialActive ?? false);
  const currentPlan = computed(() => currentSubscription.value?.subscription.plan);
  const features = computed(() => currentSubscription.value?.features);
  const subscriptionStatus = computed(() => currentSubscription.value?.subscription.status);

  /**
   * Fetch current subscription
   */
  async function fetchCurrentSubscription() {
    isLoading.value = true;
    error.value = null;
    try {
      currentSubscription.value = await subscriptionService.getCurrentSubscription();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch subscription';
      if (err.response?.status === 404) {
        error.value = 'No active subscription found';
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch available plans
   */
  async function fetchAvailablePlans() {
    isLoading.value = true;
    error.value = null;
    try {
      availablePlans.value = await subscriptionService.getAvailablePlans();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch plans';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Upgrade subscription
   */
  async function upgradeSubscription(planId: string, paymentMethod: string = 'bank_transfer') {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await subscriptionService.upgradeSubscription(planId, paymentMethod);
      await fetchCurrentSubscription(); // Refresh current subscription
      return result;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to upgrade subscription';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Format price in Rupiah
   */
  function formatPrice(price: string | number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(price));
  }

  /**
   * Format date
   */
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return {
    currentSubscription,
    availablePlans,
    isLoading,
    error,
    isTrialActive,
    currentPlan,
    features,
    subscriptionStatus,
    fetchCurrentSubscription,
    fetchAvailablePlans,
    upgradeSubscription,
    formatPrice,
    formatDate,
  };
}
```

#### 4. **Subscription Dashboard Card** (`components/SubscriptionCard.vue`)
```vue
<template>
  <div class="subscription-card">
    <div v-if="isLoading" class="loading">
      <span>Loading subscription...</span>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchCurrentSubscription">Retry</button>
    </div>

    <div v-else-if="currentSubscription" class="card-content">
      <!-- Trial Banner -->
      <div v-if="isTrialActive" class="trial-banner">
        <span class="icon">⏰</span>
        <div class="message">
          <strong>Trial Mode Active</strong>
          <p>All features unlocked until {{ formatDate(currentSubscription.subscription.endDate) }}</p>
        </div>
        <button @click="showUpgradeModal = true" class="btn-upgrade">Upgrade Now</button>
      </div>

      <!-- Subscription Info -->
      <div class="subscription-info">
        <div class="plan-header">
          <h2>{{ currentPlan?.name }}</h2>
          <span 
            class="status-badge" 
            :class="`status-${subscriptionStatus}`"
          >
            {{ subscriptionStatus }}
          </span>
        </div>
        
        <p class="description">{{ currentPlan?.description }}</p>
        
        <div class="dates">
          <div class="date-item">
            <span class="label">Start Date:</span>
            <span class="value">{{ formatDate(currentSubscription.subscription.startDate) }}</span>
          </div>
          <div class="date-item">
            <span class="label">End Date:</span>
            <span class="value">{{ formatDate(currentSubscription.subscription.endDate) }}</span>
          </div>
        </div>

        <div class="price">
          <span class="amount">{{ formatPrice(currentPlan?.price || 0) }}</span>
          <span class="duration">/ {{ currentPlan?.duration }} days</span>
        </div>

        <button @click="showUpgradeModal = true" class="btn-primary">
          Upgrade Plan
        </button>
      </div>

      <!-- Feature Limits -->
      <div class="limits-section">
        <h3>Usage Limits</h3>
        <div class="limit-item">
          <div class="limit-header">
            <span>Users</span>
            <span class="limit-value">{{ currentUsers }} / {{ features?.limits.maxUsers }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentUsers / (features?.limits.maxUsers || 1)) * 100}%` }"
              :class="{ 'progress-warning': currentUsers >= (features?.limits.maxUsers || 0) * 0.8 }"
            ></div>
          </div>
        </div>

        <div class="limit-item">
          <div class="limit-header">
            <span>Members</span>
            <span class="limit-value">{{ currentMembers }} / {{ features?.limits.maxMembers }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentMembers / (features?.limits.maxMembers || 1)) * 100}%` }"
              :class="{ 'progress-warning': currentMembers >= (features?.limits.maxMembers || 0) * 0.8 }"
            ></div>
          </div>
        </div>

        <div v-if="features?.limits.maxProducts" class="limit-item">
          <div class="limit-header">
            <span>Products</span>
            <span class="limit-value">{{ currentProducts }} / {{ features?.limits.maxProducts }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentProducts / (features?.limits.maxProducts || 1)) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Active Modules -->
      <div class="modules-section">
        <h3>Active Modules</h3>
        <div class="modules-grid">
          <div 
            v-for="(enabled, moduleName) in features?.modules" 
            :key="moduleName"
            class="module-item"
            :class="{ 'module-enabled': enabled, 'module-disabled': !enabled }"
          >
            <span class="module-icon">{{ enabled ? '✅' : '❌' }}</span>
            <span class="module-name">{{ formatModuleName(moduleName) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upgrade Modal -->
    <PlanUpgradeModal 
      v-if="showUpgradeModal" 
      @close="showUpgradeModal = false"
      @upgrade-success="handleUpgradeSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSubscription } from '@/composables/useSubscription';
import PlanUpgradeModal from './PlanUpgradeModal.vue';

const {
  currentSubscription,
  isLoading,
  error,
  isTrialActive,
  currentPlan,
  features,
  subscriptionStatus,
  fetchCurrentSubscription,
  formatPrice,
  formatDate,
} = useSubscription();

const showUpgradeModal = ref(false);

// Mock current usage data (replace with actual API calls)
const currentUsers = ref(5);
const currentMembers = ref(120);
const currentProducts = ref(45);

onMounted(() => {
  fetchCurrentSubscription();
});

function formatModuleName(name: string): string {
  return name
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function handleUpgradeSuccess() {
  showUpgradeModal.value = false;
  fetchCurrentSubscription();
}
</script>

<style scoped>
.subscription-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.loading, .error {
  text-align: center;
  padding: 40px;
}

.trial-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 24px;
}

.trial-banner .icon {
  font-size: 32px;
}

.trial-banner .message {
  flex: 1;
}

.trial-banner .message strong {
  display: block;
  margin-bottom: 4px;
}

.subscription-info {
  margin-bottom: 24px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-header h2 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-trial {
  background: #fff3cd;
  color: #856404;
}

.status-pending {
  background: #cce5ff;
  color: #004085;
}

.status-expired {
  background: #f8d7da;
  color: #721c24;
}

.description {
  color: #6c757d;
  margin-bottom: 16px;
}

.dates {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-item .label {
  font-size: 12px;
  color: #6c757d;
}

.date-item .value {
  font-weight: 600;
  color: #2c3e50;
}

.price {
  margin-bottom: 16px;
}

.price .amount {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
}

.price .duration {
  font-size: 14px;
  color: #6c757d;
}

.limits-section, .modules-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

.limits-section h3, .modules-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #2c3e50;
}

.limit-item {
  margin-bottom: 16px;
}

.limit-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.limit-value {
  font-weight: 600;
  color: #2c3e50;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.3s ease;
}

.progress-fill.progress-warning {
  background: #ffc107;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
}

.module-item.module-enabled {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.module-item.module-disabled {
  opacity: 0.5;
}

.module-name {
  font-size: 14px;
  font-weight: 500;
}

.btn-primary, .btn-upgrade {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  width: 100%;
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-upgrade {
  background: #28a745;
  color: white;
}

.btn-upgrade:hover {
  background: #218838;
}
</style>
```

#### 5. **Plan Upgrade Modal** (`components/PlanUpgradeModal.vue`)
```vue
<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Choose Your Plan</h2>
          <button class="btn-close" @click="$emit('close')">✕</button>
        </div>

        <div v-if="isLoading" class="loading">
          <span>Loading plans...</span>
        </div>

        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
          <button @click="fetchAvailablePlans">Retry</button>
        </div>

        <div v-else class="plans-grid">
          <div 
            v-for="plan in availablePlans" 
            :key="plan.id"
            class="plan-card"
            :class="{ 'plan-current': isCurrentPlan(plan.id) }"
          >
            <div class="plan-header">
              <h3>{{ plan.name }}</h3>
              <div v-if="isCurrentPlan(plan.id)" class="badge-current">Current Plan</div>
            </div>

            <p class="plan-description">{{ plan.description }}</p>

            <div class="plan-price">
              <span class="price-amount">{{ formatPrice(plan.price) }}</span>
              <span class="price-duration">/ {{ plan.duration }} days</span>
            </div>

            <div class="plan-features">
              <h4>Features</h4>
              <ul>
                <li v-for="(enabled, module) in plan.features.modules" :key="module">
                  <span :class="enabled ? 'check' : 'cross'">
                    {{ enabled ? '✓' : '✗' }}
                  </span>
                  {{ formatModuleName(module) }}
                </li>
              </ul>
            </div>

            <div class="plan-limits">
              <h4>Limits</h4>
              <ul>
                <li><strong>Users:</strong> {{ plan.limits.maxUsers }}</li>
                <li><strong>Members:</strong> {{ plan.limits.maxMembers }}</li>
                <li v-if="plan.limits.maxProducts">
                  <strong>Products:</strong> {{ plan.limits.maxProducts }}
                </li>
              </ul>
            </div>

            <button 
              class="btn-select"
              :disabled="isCurrentPlan(plan.id) || upgrading"
              @click="handleUpgrade(plan.id)"
            >
              <span v-if="upgrading && selectedPlanId === plan.id">Processing...</span>
              <span v-else-if="isCurrentPlan(plan.id)">Current Plan</span>
              <span v-else>Select Plan</span>
            </button>
          </div>
        </div>

        <!-- Payment Method Selection (shown after plan selection) -->
        <div v-if="showPaymentMethod" class="payment-method-section">
          <h3>Select Payment Method</h3>
          <div class="payment-methods">
            <label>
              <input type="radio" value="bank_transfer" v-model="paymentMethod" />
              Bank Transfer
            </label>
            <label>
              <input type="radio" value="credit_card" v-model="paymentMethod" />
              Credit Card
            </label>
            <label>
              <input type="radio" value="e_wallet" v-model="paymentMethod" />
              E-Wallet
            </label>
          </div>
          <div class="payment-actions">
            <button @click="showPaymentMethod = false" class="btn-secondary">Cancel</button>
            <button @click="confirmUpgrade" class="btn-primary">Confirm Upgrade</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSubscription } from '@/composables/useSubscription';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'upgrade-success'): void;
}>();

const router = useRouter();

const {
  currentSubscription,
  availablePlans,
  isLoading,
  error,
  fetchAvailablePlans,
  upgradeSubscription,
  formatPrice,
} = useSubscription();

const upgrading = ref(false);
const selectedPlanId = ref<string | null>(null);
const showPaymentMethod = ref(false);
const paymentMethod = ref('bank_transfer');

onMounted(() => {
  fetchAvailablePlans();
});

const isCurrentPlan = (planId: string): boolean => {
  return currentSubscription.value?.subscription.plan.id === planId;
};

const handleUpgrade = (planId: string) => {
  selectedPlanId.value = planId;
  showPaymentMethod.value = true;
};

const confirmUpgrade = async () => {
  if (!selectedPlanId.value) return;

  upgrading.value = true;
  try {
    const result = await upgradeSubscription(selectedPlanId.value, paymentMethod.value);
    
    // Show success message
    alert('Subscription upgrade initiated! Redirecting to payment...');
    
    // Redirect to payment page or invoice
    // router.push(`/payment/${result.subscription.id}`);
    
    emit('upgrade-success');
    emit('close');
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to upgrade subscription');
  } finally {
    upgrading.value = false;
    showPaymentMethod.value = false;
    selectedPlanId.value = null;
  }
};

function formatModuleName(name: string): string {
  return name
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 28px;
  color: #2c3e50;
}

.btn-close {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.loading, .error {
  text-align: center;
  padding: 40px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.plan-card {
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
}

.plan-card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
}

.plan-card.plan-current {
  border-color: #28a745;
  background: #f0f9f4;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-header h3 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.badge-current {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.plan-description {
  color: #6c757d;
  margin-bottom: 16px;
  min-height: 48px;
}

.plan-price {
  margin-bottom: 24px;
}

.price-amount {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
}

.price-duration {
  font-size: 14px;
  color: #6c757d;
}

.plan-features, .plan-limits {
  margin-bottom: 16px;
}

.plan-features h4, .plan-limits h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #2c3e50;
}

.plan-features ul, .plan-limits ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-features .check {
  color: #28a745;
  font-weight: bold;
}

.plan-features .cross {
  color: #dc3545;
  font-weight: bold;
}

.plan-limits li {
  padding: 4px 0;
  font-size: 14px;
  color: #495057;
}

.btn-select {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #007bff;
  color: white;
  transition: all 0.2s;
}

.btn-select:hover:not(:disabled) {
  background: #0056b3;
}

.btn-select:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.payment-method-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px solid #e9ecef;
}

.payment-method-section h3 {
  margin-bottom: 16px;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.payment-methods label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-methods label:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.payment-methods input[type="radio"] {
  width: 20px;
  height: 20px;
}

.payment-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>
```

#### 6. **Usage in Main Component**
```vue
<!-- pages/Dashboard.vue -->
<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <SubscriptionCard />
  </div>
</template>

<script setup lang="ts">
import SubscriptionCard from '@/components/SubscriptionCard.vue';
</script>
```

#### 7. **Vue Router Setup** (`router/index.ts`)
```typescript
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/pages/Dashboard.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    // ... other routes
  ],
});

// Auth guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken');
  
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;
```

#### 8. **Environment Variables** (`.env`)
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Error Handling

```javascript
async function getCurrentSubscription() {
  try {
    const response = await fetch('/api/v1/billing/subscription/current', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No subscription found - show onboarding
        showSubscriptionOnboarding();
        return null;
      }
      
      if (response.status === 401) {
        // Token expired - redirect to login
        redirectToLogin();
        return null;
      }

      throw new Error('Failed to fetch subscription');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    showErrorNotification('Unable to load subscription details');
    return null;
  }
}
```

---

## Testing Endpoints

### Using cURL

**Get Current Subscription:**
```bash
curl -X GET http://localhost:3000/api/v1/billing/subscription/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Available Plans:**
```bash
curl -X GET http://localhost:3000/api/v1/billing/subscription/plans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Upgrade Subscription:**
```bash
curl -X POST http://localhost:3000/api/v1/billing/subscription/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "your-plan-uuid",
    "paymentMethod": "bank_transfer"
  }'
```

### Using Postman

Import the collection from `docs/gym-api.postman_collection.json` and environment from `docs/gym-api.postman_environment.json`.

The following requests are available:
1. **Subscription - Get Current** → `GET /billing/subscription/current`
2. **Subscription - Get Plans** → `GET /billing/subscription/plans`
3. **Subscription - Upgrade** → `POST /billing/subscription/upgrade`

---

## Notes

1. **Trial Mode**: When `isTrialActive: true`, all limits are bypassed and all features are enabled
2. **Subscription Status**: 
   - `trial`: Initial trial period
   - `pending`: Awaiting payment confirmation
   - `active`: Currently active and usable
   - `expired`: Past end date
   - `cancelled`: Manually cancelled

3. **Upgrade Flow**:
   - User selects plan → Create pending subscription
   - Generate invoice → Process payment
   - Activate subscription → Old subscription cancelled

4. **Downgrade Prevention**: Downgrades to lower-priced plans are blocked. Users must contact support for plan changes.

5. **Feature Checking**: Frontend should check both `features.modules` and subscription status before enabling UI components.

---

## Related Documentation

- [BILLING-SUBSCRIPTION-FRONTEND.md](./BILLING-SUBSCRIPTION-FRONTEND.md) - Frontend integration guide
- [FEATURE-GATING-GUIDE.md](./FEATURE-GATING-GUIDE.md) - Feature gate implementation
- [SAAS-APPLICATION-FLOW.md](../SAAS-APPLICATION-FLOW.md) - Complete application flow
