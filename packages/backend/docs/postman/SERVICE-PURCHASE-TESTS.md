# Service Purchase Test Cases

## Setup: Enable Tax in Tenant Settings

```http
PATCH /api/v1/tenants/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "transactions": {
    "taxEnabled": true,
    "taxRate": 11,
    "taxType": "percentage"
  }
}
```

---

## Test Case 1: Single Purchase (Legacy Format)

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "startDate": "2025-01-15",
  "assignedTrainerId": "770e8400-e29b-41d4-a716-446655440001",
  "autoRenew": false,
  "paymentMethod": "cash",
  "paidAmount": 600000,
  "notes": "First service purchase"
}
```

### Expected Calculation
- Service Price: **500,000**
- Tax (11%): **55,000**
- **Total: 555,000**
- Paid: 600,000
- Change: 45,000

### Expected Response
```json
{
  "message": "1 service plan(s) purchased successfully",
  "data": {
    "activeServices": [
      {
        "id": "uuid",
        "memberId": "550e8400-e29b-41d4-a716-446655440001",
        "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
        "serviceType": "personal_training",
        "startDate": "2025-01-15T00:00:00.000Z",
        "endDate": "2025-02-14T00:00:00.000Z",
        "totalSessions": 10,
        "remainingSessions": 10,
        "status": "active",
        "autoRenew": false,
        "pricePaid": 555000,
        "currency": "IDR",
        "voucherDiscount": 0,
        "assignedTrainerId": "770e8400-e29b-41d4-a716-446655440001"
      }
    ],
    "transaction": {
      "id": "uuid",
      "transactionNumber": "TRX-202501-0001",
      "subtotal": 500000,
      "voucherDiscount": 0,
      "taxAmount": 55000,
      "totalAmount": 555000,
      "paidAmount": 600000,
      "changeAmount": 45000
    }
  }
}
```

---

## Test Case 2: Single Purchase with Voucher

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "voucherCode": "NEWYEAR50K",
  "paymentMethod": "credit_card",
  "paidAmount": 550000
}
```

### Voucher Details
- Code: NEWYEAR50K
- Type: Fixed
- Discount: 50,000

### Expected Calculation
- Service Price: **500,000**
- Voucher Discount: **-50,000**
- After Discount: **450,000**
- Tax (11%): **49,500**
- **Total: 499,500**
- Paid: 550,000
- Change: 50,500

### Expected Response
```json
{
  "message": "1 service plan(s) purchased successfully",
  "data": {
    "activeServices": [
      {
        "id": "uuid",
        "pricePaid": 499500,
        "voucherDiscount": 50000,
        "voucherId": "voucher-uuid"
      }
    ],
    "transaction": {
      "transactionNumber": "TRX-202501-0002",
      "subtotal": 500000,
      "voucherDiscount": 50000,
      "taxAmount": 49500,
      "totalAmount": 499500,
      "paidAmount": 550000,
      "changeAmount": 50500
    }
  }
}
```

---

## Test Case 3: Bulk Purchase with Percentage Voucher

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlans": [
    {
      "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
      "startDate": "2025-01-15",
      "assignedTrainerId": "770e8400-e29b-41d4-a716-446655440001",
      "autoRenew": false
    },
    {
      "servicePlanId": "660e8400-e29b-41d4-a716-446655440002",
      "startDate": "2025-02-01",
      "assignedTrainerId": "770e8400-e29b-41d4-a716-446655440002",
      "autoRenew": true
    }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 500000 },
    { "method": "credit_card", "amount": 500000 }
  ],
  "voucherCode": "BULK20",
  "notes": "Bulk purchase for member premium package"
}
```

### Service Plans
- Plan 1: 500,000 (Personal Training)
- Plan 2: 300,000 (Group Class)

### Voucher Details
- Code: BULK20
- Type: Percentage
- Discount: 20%

### Expected Calculation
- Subtotal: **800,000**
- Voucher (20%): **-160,000**
- After Discount: **640,000**
- Tax (11%): **70,400**
- **Total: 710,400**
- Paid: 1,000,000
- Change: 289,600

### Proportional Distribution
**Service 1 (500k):**
- Proportional Discount: 160,000 × (500,000 / 800,000) = 100,000
- Proportional Tax: 70,400 × (500,000 / 800,000) = 44,000
- Final Price: 500,000 - 100,000 + 44,000 = **444,000**

**Service 2 (300k):**
- Proportional Discount: 160,000 × (300,000 / 800,000) = 60,000
- Proportional Tax: 70,400 × (300,000 / 800,000) = 26,400
- Final Price: 300,000 - 60,000 + 26,400 = **266,400**

### Expected Response
```json
{
  "message": "2 service plan(s) purchased successfully",
  "data": {
    "activeServices": [
      {
        "id": "uuid-1",
        "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
        "pricePaid": 444000,
        "voucherDiscount": 100000
      },
      {
        "id": "uuid-2",
        "servicePlanId": "660e8400-e29b-41d4-a716-446655440002",
        "pricePaid": 266400,
        "voucherDiscount": 60000
      }
    ],
    "transaction": {
      "transactionNumber": "TRX-202501-0003",
      "subtotal": 800000,
      "voucherDiscount": 160000,
      "taxAmount": 70400,
      "totalAmount": 710400,
      "paidAmount": 1000000,
      "changeAmount": 289600
    }
  }
}
```

---

## Test Case 4: Tax Disabled (Backward Compatibility)

### Setup: Disable Tax
```http
PATCH /api/v1/tenants/settings
{
  "transactions": {
    "taxEnabled": false
  }
}
```

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "paymentMethod": "cash",
  "paidAmount": 500000
}
```

### Expected Calculation
- Service Price: **500,000**
- Tax: **0** (disabled)
- **Total: 500,000**

---

## Test Case 5: Insufficient Payment (Error)

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "paymentMethod": "cash",
  "paidAmount": 500000
}
```

### Expected Error Response (400)
```json
{
  "error": "INSUFFICIENT_PAYMENT",
  "message": "Payment insufficient. Required: 555000.00, Paid: 500000.00"
}
```

---

## Test Case 6: Voucher with Max Discount Cap

### Voucher Details
- Code: MEGA50
- Type: Percentage
- Discount: 50%
- Max Discount: 100,000

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "voucherCode": "MEGA50",
  "paymentMethod": "cash",
  "paidAmount": 500000
}
```

### Expected Calculation
- Service Price: **500,000**
- Voucher (50%): 250,000 → **Capped at 100,000**
- After Discount: **400,000**
- Tax (11%): **44,000**
- **Total: 444,000**

---

## Test Case 7: Split Payment (Multiple Methods)

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlans": [
    { "servicePlanId": "660e8400-e29b-41d4-a716-446655440001" }
  ],
  "paymentMethods": [
    { "method": "cash", "amount": 300000 },
    { "method": "credit_card", "amount": 200000 },
    { "method": "e_wallet", "amount": 100000 }
  ]
}
```

### Expected Calculation
- Service Price: **500,000**
- Tax (11%): **55,000**
- Total: **555,000**
- Paid: 600,000 (300k + 200k + 100k)
- Change: 45,000

### TransactionPayments Created
- 3 payment records (one per method)

---

## Test Case 8: Subscription Limit (Error)

### Scenario
Member already has 10 active services, limit is 10.

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "paymentMethod": "cash",
  "paidAmount": 600000
}
```

### Expected Error Response (403)
```json
{
  "error": "LIMIT_EXCEEDED",
  "message": "Active services limit would be exceeded. Current: 10, Limit: 10"
}
```

---

## Test Case 9: Fixed Tax Amount

### Setup: Fixed Tax
```http
PATCH /api/v1/tenants/settings
{
  "transactions": {
    "taxEnabled": true,
    "taxRate": 25000,
    "taxType": "fixed"
  }
}
```

### Request
```http
POST /api/v1/service/active/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "memberId": "550e8400-e29b-41d4-a716-446655440001",
  "servicePlanId": "660e8400-e29b-41d4-a716-446655440001",
  "paymentMethod": "cash",
  "paidAmount": 550000
}
```

### Expected Calculation
- Service Price: **500,000**
- Tax (Fixed): **25,000**
- **Total: 525,000**

---

## Postman Collection Variables

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "base_url": "http://localhost:3000/api/v1",
  "member_id": "550e8400-e29b-41d4-a716-446655440001",
  "service_plan_personal": "660e8400-e29b-41d4-a716-446655440001",
  "service_plan_group": "660e8400-e29b-41d4-a716-446655440002",
  "trainer_id": "770e8400-e29b-41d4-a716-446655440001"
}
```

---

## Verification Queries

### Check Transaction Items
```sql
SELECT 
  t.transactionNumber,
  ti.itemType,
  ti.itemName,
  ti.quantity,
  ti.unitPrice,
  ti.subtotal,
  ti.discount,
  ti.tax,
  ti.total
FROM "Transactions" t
JOIN "TransactionItems" ti ON t.id = ti.transactionId
WHERE t.transactionNumber = 'TRX-202501-0001'
ORDER BY ti.createdAt;
```

### Check Active Services with Pricing
```sql
SELECT 
  as_."id",
  m."firstName" || ' ' || m."lastName" as member,
  sp."name" as servicePlan,
  as_."pricePaid",
  as_."voucherDiscount",
  as_."status",
  t."transactionNumber"
FROM "ActiveServices" as_
JOIN "Members" m ON as_."memberId" = m.id
JOIN "ServicePlans" sp ON as_."servicePlanId" = sp.id
JOIN "Transactions" t ON as_."purchaseTransactionId" = t.id
WHERE as_."memberId" = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY as_."createdAt" DESC;
```

### Check Voucher Usage
```sql
SELECT 
  v.code,
  v.currentUsage,
  v.maxUsage,
  vu.discountAmount,
  vu.usedAt,
  t.transactionNumber
FROM "VoucherUsages" vu
JOIN "Vouchers" v ON vu.voucherId = v.id
JOIN "Transactions" t ON vu.transactionId = t.id
WHERE v.code = 'NEWYEAR50K'
ORDER BY vu.usedAt DESC;
```
