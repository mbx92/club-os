# Service Plan Controller - Improvements & Currency Implementation

## 📋 Overview
Dokumentasi improvement pada `servicePlanController.js` dengan implementasi **dynamic currency** dari tenant settings dan **enhanced validation**.

---

## ✨ What's New

### 1. **Dynamic Currency from Tenant Settings**

Service plan sekarang menggunakan currency dari tenant settings secara otomatis.

**Flow:**
```javascript
// Helper function
function getTenantCurrency(tenant) {
  return tenant?.settings?.transaction?.currency || tenant?.settings?.currency || 'IDR';
}

// On create
const tenantCurrency = getTenantCurrency(tenant);
const finalCurrency = currency || tenantCurrency; // Allow override
```

**Tenant Settings Structure:**
```json
{
  "settings": {
    "transaction": {
      "currency": "USD"
    }
  }
}
```

**Benefits:**
- ✅ Konsisten dengan tax settings yang sudah ada
- ✅ Multi-currency per tenant
- ✅ Optional override saat create/update
- ✅ Default fallback ke IDR

---

### 2. **Service Type Validation**

Validasi spesifik berdasarkan `serviceType` dan `durationType`:

**Validation Rules:**

| Service Type | Duration Type | Required Fields | Access Control |
|-------------|---------------|-----------------|----------------|
| `membership` | `time_based` | `duration` (days) | `facilities`, `accessHours`, `maxCheckIns` |
| `class_package` | `session_based` | `sessions`, `validityDays` | `applicableClassTypes[]` |
| `pt_package` | `session_based` | `sessions`, `validityDays` | `requiresTrainerAssignment: true` |
| `spa_package` | `session_based` | `sessions`, `validityDays` | Optional |
| `custom` | `time_based` or `session_based` | Based on type | Optional |

**Example Validation:**
```javascript
// Membership must be time_based
if (serviceType === 'membership' && durationType !== 'time_based') {
  throw new Error('Membership must use time_based durationType');
}

// PT package defaults to requiring trainer
if (serviceType === 'pt_package') {
  accessControl.requiresTrainerAssignment = true; // Auto-set
}
```

---

### 3. **Enriched Response Data**

Semua endpoints sekarang mengembalikan data yang diperkaya:

```json
{
  "data": {
    "id": "uuid",
    "name": "12x Personal Training Package",
    "serviceType": "pt_package",
    "durationType": "session_based",
    "price": 2400000,
    "currency": "IDR",
    "sessions": 12,
    "validityDays": 90,
    
    // ENRICHED FIELDS (computed)
    "pricePerSession": "200000.00",
    "isTimeBased": false,
    "isSessionBased": true,
    "requiresTrainer": true,
    "tenantCurrency": "IDR",
    
    "tenant": {
      "id": "tenant-uuid",
      "name": "Gym ABC",
      "settings": {
        "transaction": {
          "currency": "IDR"
        }
      }
    }
  }
}
```

**Computed Fields:**
- `pricePerSession`: Calculated for session-based services
- `isTimeBased` / `isSessionBased`: Boolean helpers
- `requiresTrainer`: From accessControl
- `tenantCurrency`: Tenant's default currency

---

### 4. **Improved Transaction Handling**

**Before:**
```javascript
// ❌ No transaction consistency
const subscription = await req.user.tenant.getSubscription();
const servicePlan = await ServicePlan.create(...);
```

**After:**
```javascript
// ✅ All operations in single transaction
const t = await sequelize.transaction();
const tenant = await Tenant.findByPk(targetTenantId, {
  include: [{ association: 'subscription', include: ['plan'] }],
  transaction: t
});
// ... check limits
const servicePlan = await ServicePlan.create(..., { transaction: t });
await t.commit();
```

---

### 5. **Better Error Handling**

Validation errors sekarang lebih deskriptif:

```javascript
// Multiple validation errors combined
const validationErrors = validateServicePlanData(serviceType, durationType, data);
// Returns: [
//   "Duration is required and must be positive for time_based services",
//   "time_based durationType is only valid for membership service type"
// ]

if (validationErrors.length > 0) {
  throw createError('VALIDATION_ERROR', validationErrors.join('; '), 400);
}
```

---

## 🔧 API Changes

### **POST /api/v1/service-plans**

**Request Body:**
```json
{
  "serviceType": "pt_package",
  "name": "12x Personal Training",
  "description": "12 session personal training package",
  "price": 2400000,
  "currency": "IDR",  // OPTIONAL - uses tenant default if not provided
  "durationType": "session_based",
  "sessions": 12,
  "validityDays": 90,
  "accessControl": {
    "requiresTrainerAssignment": true  // Auto-set for pt_package
  },
  "isActive": true,
  "isPopular": false
}
```

**Response:**
```json
{
  "message": "Service plan created successfully",
  "data": {
    "id": "uuid",
    "name": "12x Personal Training",
    "price": 2400000,
    "currency": "IDR",  // From tenant settings or override
    "pricePerSession": "200000.00",
    "isSessionBased": true,
    "tenantCurrency": "IDR"
  }
}
```

---

### **PUT /api/v1/service-plans/:id**

**Improvements:**
- ✅ Validates service type changes
- ✅ Checks durationType compatibility
- ✅ Currency can be updated or kept as-is
- ✅ Optimistic locking with retry

**Request Body:**
```json
{
  "price": 2600000,
  "currency": "USD",  // Change currency
  "sessions": 15,     // Update sessions
  "validityDays": 120 // Extend validity
}
```

---

### **GET /api/v1/service-plans**

**Query Parameters:**
```
?page=1
&limit=10
&search=training
&serviceType=pt_package    // Filter by type
&isActive=true
&sortBy=price
&sortOrder=DESC
```

**Response includes enriched data:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "12x PT Package",
      "pricePerSession": "200000.00",
      "isSessionBased": true,
      "tenantCurrency": "IDR"
    }
  ],
  "pagination": { ... },
  "filters": { ... }
}
```

---

## 🧪 Testing Examples

### Test 1: Create Membership with Tenant Currency
```bash
# Set tenant currency first
PATCH /api/v1/tenants/settings
{
  "transaction": {
    "currency": "USD"
  }
}

# Create membership (will use USD automatically)
POST /api/v1/service-plans
{
  "serviceType": "membership",
  "name": "30 Days Membership",
  "price": 50,
  "durationType": "time_based",
  "duration": 30
}

# Response will have currency: "USD"
```

### Test 2: Validation - Wrong durationType
```bash
POST /api/v1/service-plans
{
  "serviceType": "membership",
  "name": "Invalid Membership",
  "price": 500000,
  "durationType": "session_based",  # ❌ Wrong!
  "sessions": 10
}

# Response:
{
  "error": "VALIDATION_ERROR",
  "message": "Membership must use time_based durationType; time_based durationType is only valid for membership service type"
}
```

### Test 3: Override Currency
```bash
POST /api/v1/service-plans
{
  "serviceType": "class_package",
  "name": "8x Yoga Package",
  "price": 800000,
  "currency": "IDR",  # Override tenant's USD setting
  "durationType": "session_based",
  "sessions": 8,
  "validityDays": 60
}
```

---

## 📊 Database Schema

No schema changes required. Uses existing:
- `tenant.settings` (JSON) - stores currency
- `ServicePlan.currency` (VARCHAR) - stores per-plan currency

**Migration:** Not needed, backward compatible.

---

## 🎯 Migration Guide

### For Existing Tenants

1. **Set tenant currency** (if not already set):
```bash
PATCH /api/v1/tenants/settings
{
  "transaction": {
    "currency": "IDR"
  }
}
```

2. **Existing service plans** will keep their currency field
3. **New service plans** will auto-use tenant currency

### For Developers

**Before:**
```javascript
// Old way - hardcoded currency
const servicePlan = await ServicePlan.create({
  currency: 'IDR',  // Hardcoded
  ...
});
```

**After:**
```javascript
// New way - dynamic currency
const tenant = await Tenant.findByPk(tenantId);
const currency = getTenantCurrency(tenant);  // From settings

const servicePlan = await ServicePlan.create({
  currency,  // Dynamic
  ...
});
```

---

## 🔗 Related Files

- **Controller**: `src/controllers/service/servicePlanController.js`
- **Model**: `src/models/ServicePlan.js`
- **Routes**: `src/routes/service/servicePlan.routes.js`
- **Tenant Settings**: `src/controllers/tenant/tenantController.js`
- **Formatters**: `src/utils/formatters.js` (for currency display)

---

## 📝 TODO / Future Enhancements

- [ ] Add bulk update currency endpoint
- [ ] Currency conversion API integration
- [ ] Historical price tracking
- [ ] Service plan templates by industry
- [ ] Analytics per service type
- [ ] Recommended pricing based on market data

---

## 🎉 Summary

**Key Improvements:**
1. ✅ Dynamic currency from tenant settings
2. ✅ Service type-specific validation
3. ✅ Enriched response data with computed fields
4. ✅ Better transaction handling
5. ✅ Improved error messages
6. ✅ Backward compatible

**No Breaking Changes:**
- Existing API endpoints work as before
- Optional currency override still supported
- All existing service plans remain valid
