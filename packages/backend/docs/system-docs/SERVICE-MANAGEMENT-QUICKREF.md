# 🎯 Service Management - Quick Reference

## 🚀 Quick Start

### 1. Create Service Plan (Admin)
```bash
POST /api/v1/service/plans
{
  "serviceType": "membership",
  "name": "30 Days Membership",
  "price": 500000,
  "durationType": "time_based",
  "duration": 30
}
```

### 2. Purchase Service (Member)
```bash
POST /api/v1/service/active/purchase
{
  "memberId": "{uuid}",
  "servicePlanId": "{uuid}",
  "paymentMethod": "cash",
  "paidAmount": 500000
}
```

### 3. View Member's Services
```bash
GET /api/v1/service/active/{memberId}?status=active
```

---

## 📊 Service Types Cheat Sheet

| Type | Duration | Has Sessions | Needs Trainer | Example |
|------|----------|--------------|---------------|---------|
| `membership` | time_based | ❌ | ❌ | 30 Days Gym Access |
| `class_package` | session_based | ✅ | ✅ | 12x Yoga Classes |
| `pt_package` | session_based | ✅ | ✅ | 8x Personal Training |
| `spa_package` | session_based | ✅ | Optional | 5x Massage |
| `custom` | either | Depends | Depends | Custom service |

---

## 🔑 Key Fields

### ServicePlan
```javascript
{
  serviceType: 'membership|class_package|pt_package|spa_package|custom',
  durationType: 'time_based|session_based',
  
  // For time_based (membership)
  duration: 30, // days
  
  // For session_based (packages)
  sessions: 12,
  validityDays: 60
}
```

### ActiveService
```javascript
{
  status: 'active|expired|depleted|cancelled|suspended',
  totalSessions: 12,
  remainingSessions: 8,
  startDate: '2024-01-01',
  endDate: '2024-03-01'
}
```

---

## 🎨 Common Operations

### Create Time-based Service (Membership)
```json
{
  "serviceType": "membership",
  "name": "Monthly Gym Pass",
  "price": 500000,
  "durationType": "time_based",
  "duration": 30,
  "accessControl": {
    "facilities": ["gym", "pool"],
    "maxCheckIns": 30
  }
}
```

### Create Session-based Service (PT Package)
```json
{
  "serviceType": "pt_package",
  "name": "12x Personal Training",
  "price": 2000000,
  "durationType": "session_based",
  "sessions": 12,
  "validityDays": 60,
  "accessControl": {
    "requiresTrainerAssignment": true
  }
}
```

### Purchase with Voucher
```json
{
  "memberId": "uuid",
  "servicePlanId": "uuid",
  "voucherCode": "DISC20",
  "paymentMethod": "credit_card",
  "paidAmount": 1600000
}
```

### Use a Session
```bash
POST /api/v1/service/active/{id}/use-session
{
  "notes": "Completed workout session"
}
```

### Assign Trainer
```bash
POST /api/v1/service/active/{id}/assign-trainer
{
  "trainerId": "uuid"
}
```

---

## 🔒 Feature Gates

### Required Module
```javascript
requireModule('serviceManagement')
```

### Feature Checks
```javascript
requireFeature('services.sessionTracking')
requireFeature('services.trainerAssignment')
requireFeature('services.bundlePackages')
```

### Limits
```javascript
maxServicePlans: 10
maxActiveServicesPerMember: 5
```

---

## ⚠️ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `SERVICE_PLAN_NOT_FOUND` | Invalid plan ID | Check plan exists & isActive |
| `LIMIT_EXCEEDED` | Too many plans/services | Upgrade subscription |
| `INSUFFICIENT_PAYMENT` | Payment < price | Pay correct amount |
| `NO_SESSIONS_REMAINING` | All sessions used | Service is depleted |
| `SERVICE_NOT_ACTIVE` | Service expired/cancelled | Check service status |

---

## 📱 Status Flow

```
Active Service Lifecycle:

Purchase → active
           ↓
   [Use Sessions / Wait]
           ↓
    ├─→ expired (past endDate)
    ├─→ depleted (sessions = 0)
    ├─→ cancelled (user cancelled)
    └─→ suspended (admin action)
```

---

## 🎯 Best Practices

1. **Always check subscription limits** before creating plans
2. **Verify member active services count** before purchase
3. **Use transactions** for purchase operations
4. **Track session usage** for analytics
5. **Set displayOrder** for better UI sorting
6. **Use isPopular flag** for featured plans

---

## 🔗 Related Endpoints

- Service Plans: `/api/v1/service/plans`
- Active Services: `/api/v1/service/active`
- Transactions: `/api/v1/transactions`
- Members: `/api/v1/gym/members`
- Trainers: `/api/v1/gym/trainers`
- Vouchers: `/api/v1/vouchers`

---

## 📚 Full Documentation

See: `docs/system-docs/UNIFIED-SERVICE-MANAGEMENT.md`
