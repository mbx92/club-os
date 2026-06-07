# API Testing Examples - Frontend Subscription Endpoints

## Quick Test Guide

### Prerequisites
1. Server running on `http://localhost:8000`
2. Valid JWT token (obtain from login endpoint)
3. Active subscription in database

---

## Test Scenario 1: Get Current Subscription

### Request
```bash
curl -X GET http://localhost:8000/api/v1/billing/subscription/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response (Success)
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "active",
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-12-01T00:00:00.000Z",
      "plan": {
        "id": "plan-123",
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
      "reporting": {},
      "integrations": {},
      "support": {}
    },
    "isTrialActive": false
  }
}
```

### Expected Response (No Subscription)
```json
{
  "success": false,
  "message": "No active subscription found"
}
```

---

## Test Scenario 2: Get Available Plans

### Request
```bash
curl -X GET http://localhost:8000/api/v1/billing/subscription/plans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "basic-plan-id",
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
          "restaurant": false
        },
        "transactions": {},
        "payments": {},
        "reporting": {},
        "integrations": {},
        "support": {}
      }
    },
    {
      "id": "professional-plan-id",
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
          "restaurant": true
        },
        "transactions": {},
        "payments": {},
        "reporting": {},
        "integrations": {},
        "support": {}
      }
    }
  ]
}
```

---

## Test Scenario 3: Upgrade Subscription

### Request (Successful Upgrade)
```bash
curl -X POST http://localhost:8000/api/v1/billing/subscription/upgrade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "professional-plan-id",
    "paymentMethod": "bank_transfer"
  }'
```

### Expected Response (Success)
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "new-subscription-id",
      "status": "pending",
      "startDate": "2025-11-22T00:00:00.000Z",
      "endDate": "2026-11-22T00:00:00.000Z",
      "plan": {
        "id": "professional-plan-id",
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

### Expected Response (Same Plan Error)
```json
{
  "success": false,
  "message": "You are already on this plan. Use renew instead."
}
```

### Expected Response (Downgrade Error)
```json
{
  "success": false,
  "message": "Cannot downgrade to a lower-priced plan. Please contact support.",
  "currentPlan": "Professional",
  "targetPlan": "Basic"
}
```

### Expected Response (Invalid Plan)
```json
{
  "success": false,
  "message": "Subscription plan not found"
}
```

---

## Frontend Integration Code Examples

### React/Next.js Example

```typescript
// types/subscription.ts
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

export interface SubscriptionFeatures {
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
}

export interface CurrentSubscriptionResponse {
  subscription: Subscription;
  features: SubscriptionFeatures;
  isTrialActive: boolean;
}
```

```typescript
// services/subscriptionService.ts
import { apiClient } from './apiClient';

export const subscriptionService = {
  getCurrentSubscription: async (): Promise<CurrentSubscriptionResponse> => {
    const response = await apiClient.get('/billing/subscription/current');
    return response.data.data;
  },

  getAvailablePlans: async () => {
    const response = await apiClient.get('/billing/subscription/plans');
    return response.data.data;
  },

  upgradeSubscription: async (planId: string, paymentMethod: string) => {
    const response = await apiClient.post('/billing/subscription/upgrade', {
      planId,
      paymentMethod
    });
    return response.data.data;
  }
};
```

```typescript
// hooks/useSubscription.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: subscriptionService.getCurrentSubscription,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAvailablePlans() {
  return useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: subscriptionService.getAvailablePlans,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, paymentMethod }: { planId: string; paymentMethod: string }) =>
      subscriptionService.upgradeSubscription(planId, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
```

```tsx
// components/SubscriptionDashboard.tsx
import { useCurrentSubscription } from '@/hooks/useSubscription';

export function SubscriptionDashboard() {
  const { data, isLoading, error } = useCurrentSubscription();

  if (isLoading) return <div>Loading subscription...</div>;
  if (error) return <div>Error loading subscription</div>;
  if (!data) return <div>No active subscription</div>;

  const { subscription, features, isTrialActive } = data;

  return (
    <div className="subscription-dashboard">
      {isTrialActive && (
        <div className="trial-banner">
          ⏰ Trial mode active until {new Date(subscription.endDate).toLocaleDateString()}
        </div>
      )}

      <div className="subscription-card">
        <h2>{subscription.plan.name}</h2>
        <p>{subscription.status}</p>
        <p>Expires: {new Date(subscription.endDate).toLocaleDateString()}</p>
        <button onClick={() => showUpgradeModal()}>Upgrade Plan</button>
      </div>

      <div className="limits-card">
        <h3>Usage Limits</h3>
        <div className="limit-item">
          <span>Users: {features.limits.maxUsers}</span>
          <progress value={currentUsers} max={features.limits.maxUsers} />
        </div>
        <div className="limit-item">
          <span>Members: {features.limits.maxMembers}</span>
          <progress value={currentMembers} max={features.limits.maxMembers} />
        </div>
      </div>

      <div className="features-card">
        <h3>Active Modules</h3>
        <ul>
          {Object.entries(features.modules).map(([module, enabled]) => (
            <li key={module}>
              {enabled ? '✅' : '❌'} {module}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

```tsx
// components/PlanUpgradeModal.tsx
import { useAvailablePlans, useUpgradeSubscription } from '@/hooks/useSubscription';

export function PlanUpgradeModal({ isOpen, onClose }: Props) {
  const { data: plans } = useAvailablePlans();
  const upgradeMutation = useUpgradeSubscription();

  const handleUpgrade = async (planId: string) => {
    try {
      const result = await upgradeMutation.mutateAsync({
        planId,
        paymentMethod: 'bank_transfer'
      });

      // Redirect to payment page
      window.location.href = `/payment/${result.subscription.id}`;
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Choose Your Plan</h2>
      <div className="plans-grid">
        {plans?.map(plan => (
          <div key={plan.id} className="plan-card">
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <div className="price">Rp {Number(plan.price).toLocaleString()}</div>
            <ul>
              <li>Max Users: {plan.limits.maxUsers}</li>
              <li>Max Members: {plan.limits.maxMembers}</li>
              <li>Duration: {plan.duration} days</li>
            </ul>
            <button 
              onClick={() => handleUpgrade(plan.id)}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending ? 'Processing...' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

---

## Postman Collection Import

### Import Steps:
1. Open Postman
2. Click **Import** button
3. Select `docs/gym-api.postman_collection.json`
4. Select `docs/gym-api.postman_environment.json`
5. Set environment to "Gym API Development"
6. Update `{{baseUrl}}` to `http://localhost:8000/api/v1`
7. Login to get JWT token
8. Add token to environment variable `{{authToken}}`

### Available Requests:
- **Subscription - Get Current** → GET `/billing/subscription/current`
- **Subscription - Get Plans** → GET `/billing/subscription/plans`
- **Subscription - Upgrade** → POST `/billing/subscription/upgrade`

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Cause:** Missing or invalid JWT token

**Solution:**
```bash
# First login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gym.com",
    "password": "yourpassword"
  }'

# Use the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Issue 2: 404 No Active Subscription
**Cause:** Tenant doesn't have an active subscription

**Solution:** Create a subscription first:
```bash
curl -X POST http://localhost:8000/api/v1/billing/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "planId": "basic-plan-id",
    "paymentMethod": "bank_transfer"
  }'
```

### Issue 3: 403 Forbidden on Upgrade
**Cause:** User doesn't have permission to manage subscriptions

**Solution:** Check CASL permissions or use a user with admin role

---

## Testing Checklist

- [ ] Get current subscription for tenant with active subscription
- [ ] Get current subscription for tenant without subscription (404)
- [ ] Get available plans (should return all active plans)
- [ ] Upgrade to higher-priced plan (success)
- [ ] Attempt upgrade to same plan (error)
- [ ] Attempt upgrade to lower-priced plan (error)
- [ ] Verify old subscription is cancelled after upgrade
- [ ] Verify new subscription status is "pending"
- [ ] Test with expired/invalid JWT token (401)
- [ ] Test without authentication header (401)

---

## Next Steps After Testing

1. ✅ Verify all 3 endpoints work correctly
2. ✅ Test with different user roles and tenants
3. 🔄 Integrate with frontend application
4. 🔄 Implement payment flow
5. 🔄 Add subscription activation after payment
6. 🔄 Create UI components for subscription management
