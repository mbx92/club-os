# 🎯 Unified Service Management System

## 📋 Overview

Sistem **Unified Service Management** menggabungkan berbagai jenis layanan gym (membership, class packages, PT packages, spa packages) ke dalam satu model yang fleksibel dan terstruktur.

### ✅ Keuntungan Unified Model

1. **Flexibility** - Tenant bebas membuat service plan apa saja
2. **Code Reusability** - 1 controller, 1 set middleware untuk semua tipe
3. **Consistent Transaction Flow** - Semua menggunakan Transaction system yang sama
4. **Feature Gating** - Controlled via subscription plan limits
5. **Multiple Active Services** - Member bisa punya banyak service bersamaan

---

## 🏗️ Architecture

### Model Structure

```
ServicePlan (Template/Plan Level)
├── serviceType: membership | class_package | pt_package | spa_package | custom
├── durationType: time_based | session_based
├── price, currency
├── duration (for time_based)
├── sessions, validityDays (for session_based)
└── accessControl (flexible JSON for custom config)

ActiveService (Member's Active Service)
├── servicePlanId → ServicePlan
├── memberId → Member
├── serviceType (denormalized)
├── startDate, endDate
├── totalSessions, remainingSessions (for session_based)
├── status: active | expired | depleted | cancelled | suspended
├── purchaseTransactionId → Transaction
├── assignedTrainerId → Trainer (optional)
└── pricePaid, voucherDiscount
```

---

## 📊 Service Types

| Service Type | Duration Type | Example Use Case | Sessions | Trainer |
|--------------|--------------|------------------|----------|---------|
| **membership** | time_based | 30 Days Gym Access | ❌ | ❌ |
| **class_package** | session_based | 12x Yoga Classes | ✅ | ✅ (Instructor) |
| **pt_package** | session_based | 8x Personal Training | ✅ | ✅ (Dedicated) |
| **spa_package** | session_based | 5x Massage Package | ✅ | ✅ (Therapist) |
| **custom** | either | Tenant-defined service | Depends | Depends |

---

## 🔐 Feature Gating

Controlled via `src/utils/featureRegistry.js`:

### Modules
```javascript
modules: {
  serviceManagement: true // Required to access service endpoints
}
```

### Limits
```javascript
limits: {
  maxServicePlans: 10,              // Max plans tenant can create
  maxActiveServicesPerMember: 5     // Max active services per member
}
```

### Features
```javascript
services: {
  sessionTracking: true,       // Track session usage
  trainerAssignment: true,     // Assign trainers to services
  bundlePackages: true,        // Create bundle packages
  autoRenewal: true            // Auto-renew on expiry
}
```

### Subscription Plan Matrix

| Limit | Basic | Professional | Enterprise |
|-------|-------|--------------|------------|
| maxServicePlans | 10 | 50 | Unlimited |
| maxActiveServicesPerMember | 2 | 10 | Unlimited |
| sessionTracking | ✅ | ✅ | ✅ |
| trainerAssignment | ❌ | ✅ | ✅ |
| bundlePackages | ❌ | ✅ | ✅ |
| autoRenewal | ❌ | ✅ | ✅ |

---

## 🚀 API Endpoints

### Service Plans (Admin/Staff)

#### 1. List Service Plans
```http
GET /api/v1/service/plans
Authorization: Bearer {token}

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- search: string (search name/description)
- serviceType: membership | class_package | pt_package | spa_package | custom | all
- isActive: true | false | all
- sortBy: name | price | displayOrder | createdAt | serviceType
- sortOrder: ASC | DESC

Response:
{
  "data": [
    {
      "id": "uuid",
      "serviceType": "membership",
      "name": "30 Days Membership",
      "description": "Standard gym access for 30 days",
      "price": "500000.00",
      "currency": "IDR",
      "durationType": "time_based",
      "duration": 30,
      "accessControl": {
        "facilities": ["gym", "pool"],
        "accessHours": {...},
        "maxCheckIns": 30
      },
      "isActive": true,
      "isPopular": false,
      "displayOrder": 1
    }
  ],
  "pagination": {...}
}
```

#### 2. Get Service Plan by ID
```http
GET /api/v1/service/plans/:id
Authorization: Bearer {token}

Response:
{
  "data": {
    "id": "uuid",
    "serviceType": "pt_package",
    "name": "12x Personal Training",
    "durationType": "session_based",
    "sessions": 12,
    "validityDays": 60,
    "price": "2000000.00",
    "accessControl": {
      "requiresTrainerAssignment": true
    }
  }
}
```

#### 3. Create Service Plan
```http
POST /api/v1/service/plans
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "serviceType": "class_package",
  "name": "8x Yoga Package",
  "description": "8 yoga class sessions",
  "price": 800000,
  "currency": "IDR",
  "durationType": "session_based",
  "sessions": 8,
  "validityDays": 30,
  "accessControl": {
    "applicableClassTypes": ["yoga"],
    "requiresTrainerAssignment": true
  },
  "isActive": true,
  "isPopular": false,
  "displayOrder": 1
}

Response:
{
  "message": "Service plan created successfully",
  "data": {...}
}
```

#### 4. Update Service Plan
```http
PUT /api/v1/service/plans/:id
Authorization: Bearer {token}
Content-Type: application/json

Body: (partial update)
{
  "price": 900000,
  "isActive": true
}

Response:
{
  "message": "Service plan updated successfully",
  "data": {...}
}
```

#### 5. Delete Service Plan
```http
DELETE /api/v1/service/plans/:id
Authorization: Bearer {token}

Response:
{
  "message": "Service plan deleted successfully"
}

Note: Cannot delete if there are active services using this plan
```

#### 6. Get Service Type Statistics
```http
GET /api/v1/service/plans/stats
Authorization: Bearer {token}

Response:
{
  "data": [
    {
      "serviceType": "membership",
      "count": 3,
      "totalValue": "2500000.00",
      "avgPrice": "833333.33"
    },
    {
      "serviceType": "pt_package",
      "count": 2,
      "totalValue": "4000000.00",
      "avgPrice": "2000000.00"
    }
  ]
}
```

---

### Active Services (Member Services)

#### 1. Get Member's Active Services
```http
GET /api/v1/service/active/:memberId
Authorization: Bearer {token}

Query Parameters:
- status: active | expired | depleted | cancelled | suspended | all
- serviceType: membership | class_package | pt_package | spa_package | custom | all

Response:
{
  "data": [
    {
      "id": "uuid",
      "serviceType": "membership",
      "status": "active",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "remainingSessions": null,
      "servicePlan": {...},
      "assignedTrainer": null,
      "purchaseTransaction": {...}
    },
    {
      "id": "uuid",
      "serviceType": "pt_package",
      "status": "active",
      "totalSessions": 12,
      "remainingSessions": 8,
      "startDate": "2024-01-01",
      "endDate": "2024-03-01",
      "assignedTrainer": {...}
    }
  ]
}
```

#### 2. Purchase Service Plan
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "memberId": "uuid",
  "servicePlanId": "uuid",
  "startDate": "2024-01-01", // optional, default: today
  "assignedTrainerId": "uuid", // optional
  "voucherCode": "NEWYEAR2024", // optional
  "paymentMethod": "credit_card",
  "paidAmount": 2000000,
  "notes": "Special request notes",
  "autoRenew": false
}

Response:
{
  "message": "Service plan purchased successfully",
  "data": {
    "activeService": {
      "id": "uuid",
      "serviceType": "pt_package",
      "status": "active",
      "totalSessions": 12,
      "remainingSessions": 12,
      "startDate": "2024-01-01",
      "endDate": "2024-03-01",
      "pricePaid": "1800000.00",
      "voucherDiscount": "200000.00"
    },
    "transaction": {
      "id": "uuid",
      "transactionNumber": "TRX-202401-00123",
      "totalAmount": "1800000.00",
      "status": "completed"
    }
  }
}
```

#### 3. Use Session (Session-based Services)
```http
POST /api/v1/service/active/:id/use-session
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "notes": "Completed yoga class with instructor John"
}

Response:
{
  "message": "Session used successfully",
  "data": {
    "remainingSessions": 7,
    "status": "active"
  }
}
```

#### 4. Assign Trainer
```http
POST /api/v1/service/active/:id/assign-trainer
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "trainerId": "uuid"
}

Response:
{
  "message": "Trainer assigned successfully",
  "data": {...}
}
```

#### 5. Cancel Active Service
```http
POST /api/v1/service/active/:id/cancel
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "reason": "Member requested cancellation"
}

Response:
{
  "message": "Active service cancelled successfully",
  "data": {...}
}
```

---

## 💡 Real-World Use Cases

### Use Case 1: Member Beli Membership + PT Package
```javascript
// Step 1: Member beli 30 days membership
POST /api/v1/service/active/purchase
{
  "memberId": "john-uuid",
  "servicePlanId": "membership-30days-uuid",
  "paymentMethod": "credit_card",
  "paidAmount": 500000
}

// Step 2: Member beli 12x PT package
POST /api/v1/service/active/purchase
{
  "memberId": "john-uuid",
  "servicePlanId": "pt-12x-uuid",
  "assignedTrainerId": "trainer-smith-uuid",
  "paymentMethod": "credit_card",
  "paidAmount": 2000000
}

// Result: Member punya 2 active services bersamaan
// - 30 Days Membership (time-based, expires after 30 days)
// - 12x PT Package (session-based, 12 sessions, expires after 60 days)
```

### Use Case 2: Use PT Session
```javascript
// Member datang untuk PT session
POST /api/v1/service/active/{pt-service-id}/use-session
{
  "notes": "Completed upper body workout"
}

// Result:
// - remainingSessions: 11 (decreased from 12)
// - Status masih "active"
// - Setelah 12x sessions used → status: "depleted"
```

### Use Case 3: Check-in with Multiple Services
```javascript
// Member check-in ke gym
// System check active services:
GET /api/v1/service/active/{memberId}?status=active

// Returns:
[
  { serviceType: "membership", status: "active" }, // ✅ Bisa masuk
  { serviceType: "pt_package", remainingSessions: 8 } // ✅ Ada sesi PT tersedia
]

// Create check-in record with activeServiceId
```

---

## 🔄 Migration from Old System

### Old Models (Deprecated)
- `MembershipType` → Replace with `ServicePlan` (serviceType='membership')
- `Membership` → Replace with `ActiveService`

### Migration Steps
1. **Keep old models** for backward compatibility
2. **New features** use `ServicePlan` + `ActiveService`
3. **Gradually migrate** existing memberships to ActiveService
4. **Dual API support** during transition period

### Backward Compatibility
- Old endpoints still work: `/gym/memberships`
- New endpoints preferred: `/service/active`
- Data can coexist during migration

---

## 🎨 Frontend Integration Examples

### Service Plan Selector
```javascript
// Fetch available service plans
const plans = await fetch('/api/v1/service/plans?isActive=true');

// Group by serviceType
const grouped = {
  membership: plans.filter(p => p.serviceType === 'membership'),
  class_package: plans.filter(p => p.serviceType === 'class_package'),
  pt_package: plans.filter(p => p.serviceType === 'pt_package')
};

// Display pricing cards
grouped.membership.map(plan => (
  <PricingCard
    title={plan.name}
    price={plan.price}
    duration={`${plan.duration} days`}
    features={plan.accessControl.facilities}
  />
));
```

### Member Dashboard - Active Services
```javascript
// Fetch member's active services
const services = await fetch(`/api/v1/service/active/${memberId}?status=active`);

// Display cards
services.map(service => (
  <ServiceCard
    type={service.serviceType}
    status={service.status}
    expiryDate={service.endDate}
    sessionsRemaining={service.remainingSessions}
    trainer={service.assignedTrainer}
  />
));
```

### Purchase Flow
```javascript
// User selects service plan
const selectedPlan = servicePlans.find(p => p.id === selectedId);

// Apply voucher
const voucher = await fetch('/api/v1/vouchers/validate', {
  body: JSON.stringify({ code: voucherCode })
});

// Calculate final price
const finalPrice = selectedPlan.price - (voucher?.discount || 0);

// Purchase
const result = await fetch('/api/v1/service/active/purchase', {
  method: 'POST',
  body: JSON.stringify({
    memberId,
    servicePlanId: selectedPlan.id,
    voucherCode,
    paymentMethod: 'credit_card',
    paidAmount: finalPrice
  })
});
```

---

## 📝 Database Schema

### ServicePlans Table
```sql
CREATE TABLE "ServicePlans" (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  serviceType ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  durationType ENUM('time_based', 'session_based'),
  duration INTEGER, -- for time_based
  sessions INTEGER, -- for session_based
  validityDays INTEGER, -- for session_based
  accessControl JSON,
  isActive BOOLEAN DEFAULT true,
  isPopular BOOLEAN DEFAULT false,
  displayOrder INTEGER,
  isBundle BOOLEAN DEFAULT false,
  bundledServices JSON,
  version INTEGER DEFAULT 0,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

### ActiveServices Table
```sql
CREATE TABLE "ActiveServices" (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  memberId UUID NOT NULL,
  servicePlanId UUID NOT NULL,
  serviceType ENUM('membership', 'class_package', 'pt_package', 'spa_package', 'custom'),
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  totalSessions INTEGER,
  remainingSessions INTEGER,
  status ENUM('active', 'expired', 'depleted', 'cancelled', 'suspended'),
  autoRenew BOOLEAN DEFAULT false,
  purchaseTransactionId UUID,
  purchaseDate TIMESTAMP,
  assignedTrainerId UUID,
  pricePaid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  voucherId UUID,
  voucherDiscount DECIMAL(10,2) DEFAULT 0,
  metadata JSON,
  notes TEXT,
  version INTEGER DEFAULT 0,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  deletedAt TIMESTAMP
);
```

---

## 🔒 Security & Validation

### CASL Permissions
```javascript
// ServicePlan permissions
'read', 'ServicePlan'     // View service plans
'create', 'ServicePlan'   // Create new plans
'update', 'ServicePlan'   // Edit plans
'delete', 'ServicePlan'   // Delete plans

// ActiveService permissions
'read', 'ActiveService'   // View member services
'create', 'ActiveService' // Purchase services
'update', 'ActiveService' // Use sessions, assign trainer
'delete', 'ActiveService' // Cancel services
```

### Validation Rules
1. **durationType = time_based** → duration required
2. **durationType = session_based** → sessions + validityDays required
3. **Purchase** → Check subscription limits before creating
4. **Use Session** → Verify remainingSessions > 0
5. **Assign Trainer** → Verify trainer belongs to same tenant

---

## 📈 Benefits Over Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Models** | MembershipType + Membership | ServicePlan + ActiveService |
| **Flexibility** | Only gym memberships | Any service type |
| **Multiple Services** | ❌ | ✅ Member bisa punya banyak |
| **Session Tracking** | ❌ | ✅ Built-in |
| **Trainer Assignment** | ❌ | ✅ Built-in |
| **Transaction Link** | Limited | Full integration |
| **Feature Gating** | Limited | Complete control |
| **Scalability** | Low | High |

---

## 🚀 Next Steps

1. ✅ **Models Created** - ServicePlan, ActiveService
2. ✅ **Migrations Run** - Tables created
3. ✅ **Controllers Implemented** - Full CRUD + purchase
4. ✅ **Routes Registered** - Feature-gated endpoints
5. ✅ **Feature Registry Updated** - Limits & features added
6. ⏳ **Frontend Integration** - Build UI components
7. ⏳ **Migration Script** - Migrate old Membership data
8. ⏳ **Testing** - Unit & integration tests
9. ⏳ **Documentation** - API docs & examples

---

## 📞 Support

For questions or issues:
- Check API documentation: `/api-docs`
- Review error codes: `src/utils/errorCodes.js`
- Check logs: `logs/` directory
- Feature registry: `src/utils/featureRegistry.js`
