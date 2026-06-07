# Service Purchase System

## Overview

Sistem pembelian service memungkinkan member untuk membeli berbagai layanan gym (membership, class packages, PT packages, spa packages) melalui unified transaction system. Setiap pembelian akan:
1. Membuat record `Transaction` dengan `TransactionItem` bertipe `service_plan`
2. Membuat record `ActiveService` yang berisi sesi dan masa aktif
3. Menggunakan sequence generator untuk mencegah race condition
4. Menyimpan snapshot data untuk cetak receipt

## Architecture

### Database Models

#### ServicePlan (sudah ada)
```
- serviceType: enum('membership', 'class_package', 'pt_package', 'spa_package', 'custom')
- durationType: enum('time_based', 'session_based')
- duration: untuk time_based (hari)
- sessions: untuk session_based (jumlah sesi)
- validityDays: masa berlaku untuk session_based packages
- price: harga service
```

#### TransactionItem (perlu update)
```
- itemType: enum('membership', 'product', 'service_plan') <- TAMBAH service_plan
- itemId: UUID ServicePlan
- itemDetails: JSON {
    serviceType,
    durationType,
    duration,
    sessions,
    validityDays,
    startDate,
    endDate,
    calculatedEndDate // untuk receipt
  }
```

#### ActiveService (sudah ada)
```
- servicePlanId: reference ke ServicePlan
- memberId: reference ke Member
- serviceType: denormalized dari ServicePlan
- startDate: tanggal mulai
- endDate: tanggal berakhir
- totalSessions: total sesi (untuk session_based)
- remainingSessions: sisa sesi
- status: enum('active', 'expired', 'depleted', 'cancelled', 'suspended')
- purchaseTransactionId: link ke Transaction
- pricePaid: harga yang dibayar (snapshot)
```

## Transaction Flow

### 1. Member Browse Services
**Frontend:**
- Halaman `/services` menampilkan semua service plans
- Filter by `serviceType`: membership, class_package, pt_package, spa_package, custom
- Search by name
- Display: name, description, price, duration/sessions, validity

**API Endpoint:**
```
GET /api/v1/services/plans?serviceType=all&search=&isActive=true
```

### 2. Member Select Service & Checkout

**Frontend Form:**
```javascript
{
  memberId: "uuid",
  servicePlanId: "uuid",
  startDate: "2025-11-24", // optional, default today
  paymentMethods: [
    {
      method: "cash",
      amount: 500000
    }
  ],
  voucherCode: "PROMO10", // optional
  notes: "Special request"
}
```

**Backend Process:**
1. **Validate Service Plan**
   - Check if service plan exists and isActive
   - Check subscription limit: `maxActiveServicesPerMember`
   - Check if member has active conflicting service (e.g., tidak bisa punya 2 membership aktif bersamaan)

2. **Calculate Dates & Sessions**
   - If `time_based`: calculate `endDate = startDate + duration days`
   - If `session_based`: 
     - `totalSessions = servicePlan.sessions`
     - `endDate = startDate + validityDays`

3. **Apply Voucher (if any)**
   - Validate voucher code
   - Calculate discount
   - Check voucher usage limit (with optimistic locking)

4. **Create Transaction (with sequence generator)**
   ```javascript
   Transaction.create({
     transactionNumber: "TRX-20251124-0001", // auto-generated
     customerId: memberId,
     customerType: "member",
     subtotal: servicePlan.price,
     voucherDiscount: calculatedDiscount,
     totalAmount: servicePlan.price - discount,
     status: "completed"
   })
   ```

5. **Create TransactionItem**
   ```javascript
   TransactionItem.create({
     transactionId,
     itemType: "service_plan",
     itemId: servicePlanId,
     itemName: servicePlan.name,
     quantity: 1,
     unitPrice: servicePlan.price,
     subtotal: servicePlan.price,
     discount: voucherDiscount,
     total: servicePlan.price - voucherDiscount,
     itemDetails: {
       serviceType: servicePlan.serviceType,
       durationType: servicePlan.durationType,
       duration: servicePlan.duration,
       sessions: servicePlan.sessions,
       validityDays: servicePlan.validityDays,
       startDate: startDate,
       endDate: calculatedEndDate,
       // Snapshot for receipt
       servicePlanSnapshot: {
         name: servicePlan.name,
         description: servicePlan.description,
         price: servicePlan.price
       }
     }
   })
   ```

6. **Create TransactionPayment**
   ```javascript
   TransactionPayment.create({
     transactionId,
     paymentMethod: "cash",
     amount: totalAmount,
     paymentDate: now,
     status: "completed"
   })
   ```

7. **Create ActiveService**
   ```javascript
   ActiveService.create({
     tenantId,
     memberId,
     servicePlanId,
     serviceType: servicePlan.serviceType,
     startDate,
     endDate: calculatedEndDate,
     totalSessions: servicePlan.sessions, // if session_based
     remainingSessions: servicePlan.sessions,
     status: "active",
     purchaseTransactionId: transactionId,
     purchaseDate: now,
     pricePaid: servicePlan.price - voucherDiscount,
     voucherId: voucher?.id,
     voucherDiscount: voucherDiscount
   })
   ```

8. **Commit Transaction**
   - All operations dalam satu DB transaction
   - Jika ada error, rollback semua

### 3. Generate Receipt

**Receipt Data Structure:**
```javascript
{
  transaction: {
    transactionNumber: "TRX-20251124-0001",
    transactionDate: "2025-11-24 14:30:00",
    status: "completed"
  },
  customer: {
    name: "John Doe",
    memberNumber: "M-001",
    phone: "+62812345678"
  },
  items: [
    {
      name: "30 Days Membership",
      type: "membership",
      duration: "30 days",
      startDate: "2025-11-24",
      endDate: "2025-12-24",
      price: 500000,
      discount: 50000,
      total: 450000
    }
  ],
  payment: {
    subtotal: 500000,
    discount: 50000,
    tax: 0,
    total: 450000,
    paymentMethod: "Cash",
    amountPaid: 450000,
    change: 0
  },
  activeService: {
    serviceId: "uuid",
    status: "active",
    validFrom: "2025-11-24",
    validUntil: "2025-12-24",
    remainingSessions: 12 // if session_based
  },
  gym: {
    name: "Fitness Center",
    address: "Jl. Sudirman No. 123",
    phone: "+62211234567"
  }
}
```

## API Endpoints

### Service Plans (Browse)
```
GET /api/v1/services/plans
Query: ?serviceType=membership&search=&isActive=true&page=1&limit=10
Auth: Required (Member/Staff)
Response: { plans: [], pagination: {} }
```

### Service Plan Detail
```
GET /api/v1/services/plans/:id
Auth: Required (Member/Staff)
Response: { servicePlan: {} }
```

### Purchase Service
```
POST /api/v1/services/purchase
Auth: Required (Member/Staff)
Body: {
  memberId: "uuid",
  servicePlanId: "uuid",
  startDate: "2025-11-24",
  paymentMethods: [{ method: "cash", amount: 500000 }],
  voucherCode: "PROMO10",
  notes: "string"
}
Response: {
  transaction: {},
  transactionItems: [],
  payments: [],
  activeService: {},
  receipt: {}
}
```

### Get Member Active Services
```
GET /api/v1/services/active
Query: ?memberId=uuid&serviceType=all&status=active
Auth: Required (Member sees own, Staff sees all)
Response: { activeServices: [], pagination: {} }
```

### Get Service Purchase History
```
GET /api/v1/services/history
Query: ?memberId=uuid&page=1&limit=10
Auth: Required
Response: { transactions: [], pagination: {} }
```

### Get Receipt for Print
```
GET /api/v1/services/receipt/:transactionId
Auth: Required
Response: { receipt: { transaction, customer, items, payment, activeService, gym } }
```

## Race Condition Prevention

### 1. Transaction Number Generation
```javascript
const transactionNumber = await ConcurrencyUtils.generateUniqueSequence(
  Transaction,
  {
    tenantId: tenantId,
    transactionNumber: { [Op.like]: `TRX-${datePrefix}-%` }
  },
  `TRX-${datePrefix}-`,
  transaction // DB transaction for locking
);
```

### 2. Voucher Usage (Optimistic Locking)
```javascript
await ConcurrencyUtils.withRetry(async () => {
  const voucher = await Voucher.findOne({
    where: { code, tenantId, isActive: true },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  
  if (voucher.currentUsage >= voucher.maxUsage) {
    throw new Error('Voucher sudah mencapai batas penggunaan');
  }
  
  await voucher.update(
    { currentUsage: voucher.currentUsage + 1 },
    { transaction, version: voucher.version }
  );
}, 3, 100, 'Voucher usage increment');
```

### 3. Check Concurrent Service Activation
```javascript
// Check if member already has active service of same type
const existingActiveService = await ActiveService.findOne({
  where: {
    memberId,
    serviceType: servicePlan.serviceType,
    status: 'active',
    endDate: { [Op.gte]: new Date() }
  },
  transaction,
  lock: transaction.LOCK.UPDATE
});

if (existingActiveService && servicePlan.serviceType === 'membership') {
  throw new Error('Member sudah memiliki membership aktif');
}
```

### 4. Service Limit Check
```javascript
const activeServicesCount = await ActiveService.count({
  where: {
    memberId,
    status: 'active',
    endDate: { [Op.gte]: new Date() }
  },
  transaction
});

const subscriptionLimit = tenant.subscription.plan.features.limits.maxActiveServicesPerMember;
if (subscriptionLimit > 0 && activeServicesCount >= subscriptionLimit) {
  throw new Error(`Member sudah mencapai batas maksimal ${subscriptionLimit} service aktif`);
}
```

## Frontend Implementation Guide

### 1. Service Browser Page
```jsx
// components/ServiceBrowser.jsx
- Filter by serviceType dropdown
- Search bar
- Card grid showing:
  - Service icon (based on type)
  - Service name
  - Price
  - Duration/Sessions
  - "Buy Now" button
- Pagination
```

### 2. Service Detail & Checkout Modal
```jsx
// components/ServiceCheckout.jsx
- Service details display
- Member selector (staff view) or auto-fill (member view)
- Start date picker (default today)
- Voucher code input
- Payment method selector
- Total calculation display
- "Complete Purchase" button
- Receipt preview/print
```

### 3. Active Services Dashboard
```jsx
// components/ActiveServices.jsx
- List of member's active services
- Show: service name, type, start/end date, remaining sessions, status
- Progress bar for session-based services
- "View Receipt" button
- "Cancel Service" button (if allowed)
```

### 4. Service History
```jsx
// components/ServiceHistory.jsx
- Table of past purchases
- Columns: date, service, amount paid, status
- "View Receipt" button
- Filter by date range, service type
```

## Business Rules

### 1. Service Type Restrictions
- **Membership**: Member hanya bisa punya 1 membership aktif
- **Class Package**: Member bisa punya multiple class packages
- **PT Package**: Member bisa punya multiple PT packages
- **Spa Package**: Member bisa punya multiple spa packages

### 2. Start Date Rules
- Default: today
- Can be future date (pre-purchase)
- Cannot be past date
- Service becomes active on start date

### 3. Payment Rules
- Full payment required (no installment for initial version)
- Multiple payment methods allowed (split payment)
- Total payment must equal service price minus discount

### 4. Voucher Rules
- One voucher per transaction
- Check validity date
- Check usage limit (with optimistic locking)
- Auto-apply discount to transaction

### 5. Auto-status Update
- Daily cron job to update expired services
- Check `endDate < today` → set status to 'expired'
- Check `remainingSessions = 0` → set status to 'depleted'

## Testing Scenarios

### 1. Concurrent Purchase Test
- 2 members buy same service simultaneously
- Both should succeed with unique transaction numbers

### 2. Voucher Race Condition Test
- Multiple members use same voucher simultaneously
- Voucher with maxUsage=10 should only be used 10 times
- 11th attempt should fail

### 3. Service Limit Test
- Member with Basic plan (maxActiveServicesPerMember=2) tries to buy 3rd service
- Should fail with clear error message

### 4. Conflicting Service Test
- Member with active membership tries to buy another membership
- Should fail
- Member should be able to buy class package even with active membership

### 5. Receipt Generation Test
- All service details correctly captured in itemDetails
- Start/end dates properly calculated
- Session info displayed for session-based services

## Migration Plan

### Phase 1: Database Schema (Current Sprint)
- [ ] Migration to update TransactionItem.itemType enum
- [ ] Migration to add indexes for performance

### Phase 2: Backend API (Current Sprint)
- [ ] Service purchase service layer
- [ ] Service purchase controller
- [ ] Routes with proper middleware
- [ ] Receipt generation endpoint

### Phase 3: Frontend (Next Sprint)
- [ ] Service browser page
- [ ] Checkout flow
- [ ] Active services dashboard
- [ ] Receipt viewer/printer

### Phase 4: Testing & Optimization
- [ ] Load testing for concurrent purchases
- [ ] Race condition testing
- [ ] Performance optimization
- [ ] Error handling refinement

## Security Considerations

1. **Authorization**
   - Members can only purchase for themselves
   - Staff can purchase for any member
   - Super admin can bypass all checks

2. **Validation**
   - Validate member exists and belongs to tenant
   - Validate service plan exists and isActive
   - Validate payment amount matches total
   - Validate voucher code and availability

3. **Audit Trail**
   - Log all purchases with user context
   - Log payment transactions
   - Log voucher usage
   - Log service activation/deactivation

4. **Feature Gating**
   - Check `serviceManagement` module enabled
   - Check subscription plan limits
   - Check payment method availability

## Performance Optimizations

1. **Database Indexes**
   - Composite index on (tenantId, serviceType, isActive) for ServicePlan
   - Composite index on (memberId, status, endDate) for ActiveService
   - Index on transactionNumber for fast lookup

2. **Caching**
   - Cache active service plans (5 min TTL)
   - Cache member's active services (1 min TTL)
   - Invalidate cache on purchase

3. **Query Optimization**
   - Use includes for eager loading related data
   - Limit fields in list queries
   - Use pagination for all list endpoints

4. **Transaction Scope**
   - Keep transaction scope as small as possible
   - Release locks quickly
   - Use appropriate isolation level

## Future Enhancements

1. **Recurring Billing**
   - Auto-renew services on expiry
   - Charge stored payment methods
   - Email notifications before renewal

2. **Service Bundles**
   - Combine multiple services at discounted price
   - Create bundle packages

3. **Installment Payments**
   - Split service cost into monthly payments
   - Track payment schedule

4. **Family Plans**
   - Link multiple members under one account
   - Share service benefits

5. **Loyalty Points**
   - Earn points on service purchase
   - Redeem points for discounts

6. **Waitlist System**
   - Join waitlist for full class packages
   - Auto-notify when slots available
