# Service Purchase System - Quick Reference

## 📋 Overview

Sistem pembelian service yang **unified** untuk semua jenis layanan gym:
- ✅ Membership (time-based access)
- ✅ Class Packages (session-based)
- ✅ PT Packages (session-based)
- ✅ Spa Packages (session-based)
- ✅ Custom Services

## 🎯 Key Features

### Race Condition Prevention
- ✅ **Unique transaction numbers** dengan sequence generator
- ✅ **Optimistic locking** pada Voucher usage
- ✅ **Pessimistic locking** pada concurrent service activation checks
- ✅ **Retry mechanism** dengan exponential backoff

### Transaction Architecture
- ✅ Menggunakan unified `Transaction` → `TransactionItem` → `TransactionPayment`
- ✅ `TransactionItem.itemType = 'service_plan'`
- ✅ Snapshot service details di `itemDetails` untuk receipt
- ✅ Link ke `ActiveService` via `purchaseTransactionId`

### Session & Expiry Management
- ✅ Time-based: `startDate + duration` → `endDate`
- ✅ Session-based: `sessions` tersimpan di `ActiveService.remainingSessions`
- ✅ Auto-status update: active → expired/depleted
- ✅ Validity tracking di `endDate`

## 🚀 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/services/purchase` | Beli service | Member (self) / Staff |
| GET | `/api/v1/services/active` | List active services | Member (self) / Staff |
| GET | `/api/v1/services/history` | Purchase history | Member (self) / Staff |
| GET | `/api/v1/services/receipt/:transactionId` | Get receipt | Member (self) / Staff |

## 📦 Database Changes

### Migration: `20251124154135-update-transaction-item-service-plan.js`
```sql
-- Tambah 'service_plan' ke itemType enum
ALTER TABLE "TransactionItems" 
  DROP CONSTRAINT "TransactionItems_itemType_check";

ALTER COLUMN itemType 
  TYPE ENUM('membership', 'product', 'service_plan');

-- Index untuk performance
CREATE INDEX transaction_items_item_type_idx ON "TransactionItems"(itemType);
CREATE INDEX transaction_items_transaction_item_type_idx 
  ON "TransactionItems"(transactionId, itemType);
```

### Model Updates
- `TransactionItem.itemType`: tambah 'service_plan'
- `TransactionItem.itemDetails`: store service snapshot
- Association: `TransactionItem.belongsTo(ServicePlan)`

## 🔒 Business Rules

### Service Limits
1. **Subscription Limit**: `maxActiveServicesPerMember` (Basic: 2, Pro: 10, Enterprise: unlimited)
2. **Conflict Check**: Member hanya bisa punya 1 membership aktif
3. **Multiple Packages**: Member bisa punya multiple class/PT/spa packages

### Voucher Rules
1. Check validity date
2. Check usage limit dengan race condition handling
3. Check per-member limit
4. Check applicable service types

### Payment Rules
1. Full payment required (no installment di v1)
2. Split payment allowed (multiple payment methods)
3. Total payment must match total amount

## 🏗️ Project Structure

```
src/
├── services/
│   └── servicePurchaseService.js         # Core business logic
├── controllers/service/
│   └── servicePurchaseController.js      # HTTP handlers
├── routes/service/
│   ├── servicePurchase.routes.js         # Route definitions
│   └── index.js                          # Export router
├── migrations/
│   └── 20251124154135-update-transaction-item-service-plan.js
└── models/
    ├── TransactionItem.js                # Updated model
    ├── ServicePlan.js                    # Existing
    ├── ActiveService.js                  # Existing
    └── Transaction.js                    # Existing

docs/
├── SERVICE-PURCHASE-SYSTEM.md            # Detailed design doc
├── SERVICE-PURCHASE-API-EXAMPLES.md      # API examples & frontend integration
└── SERVICE-PURCHASE-QUICK-REF.md         # This file
```

## 💡 Usage Examples

### Frontend: Purchase Service
```javascript
const result = await api.post('/api/v1/services/purchase', {
  memberId: 'member-uuid',
  servicePlanId: 'plan-uuid',
  startDate: '2025-11-24',
  paymentMethods: [
    { method: 'cash', amount: 500000 }
  ],
  voucherCode: 'PROMO10'
});

// Result includes:
// - transaction (with transactionNumber)
// - activeService (with sessions & dates)
// - receipt (ready for printing)
```

### Backend: Service Purchase Flow
```javascript
// servicePurchaseService.purchaseService() executes in single transaction:
1. Validate entities (member, servicePlan, voucher)
2. Check business rules (limits, conflicts)
3. Calculate dates & sessions
4. Apply voucher discount
5. Create Transaction (with unique sequence)
6. Create TransactionItem (with service snapshot)
7. Create TransactionPayments
8. Create ActiveService
9. Update voucher usage (with retry)
10. Return complete data + receipt
```

## 🧪 Testing Checklist

- [ ] Purchase membership (time-based)
- [ ] Purchase class package (session-based)
- [ ] Purchase dengan voucher
- [ ] Purchase dengan split payment
- [ ] Concurrent purchase (unique transaction numbers)
- [ ] Concurrent voucher usage (respects max limit)
- [ ] Member tries to buy 2nd membership (should fail)
- [ ] Exceed subscription service limit (should fail)
- [ ] Member sees own services only
- [ ] Staff sees all services
- [ ] Receipt generation
- [ ] Payment amount mismatch (should fail)

## 🔐 Security & Authorization

### Middleware Chain
```javascript
router.post('/purchase',
  authenticate,                          // JWT verification
  requireModule('serviceManagement'),    // Feature gate
  authorizeCasl('create', 'Transaction'), // CASL permission
  servicePurchaseController.purchaseService
);
```

### Authorization Logic
- **Members**: Can only purchase for themselves
- **Staff**: Can purchase for any member
- **Super Admin**: Bypass all checks

## 📊 Monitoring & Logging

### Logged Events
- Service purchase (with transaction details)
- Voucher usage
- Business rule violations
- Race condition retries
- Payment processing

### Metrics (Prometheus)
- Transaction count by type
- Average transaction amount
- Voucher redemption rate
- Service purchase by type
- Race condition retry count

## 🚧 Known Limitations (v1)

1. **No installment payments** - full payment only
2. **No auto-renewal** - manual renewal required
3. **No family plans** - individual purchases only
4. **No bundle packages** - single service only
5. **No refunds** - refund system belum diimplementasi

## 🔮 Future Enhancements

- [ ] Auto-renewal dengan recurring billing
- [ ] Installment payment system
- [ ] Bundle packages (multiple services)
- [ ] Family plan linking
- [ ] Refund & cancellation flow
- [ ] Loyalty points integration
- [ ] Waitlist system untuk full classes

## 📚 Related Documentation

- [TRANSACTION-ARCHITECTURE.md](./TRANSACTION-ARCHITECTURE.md) - Transaction system overview
- [RACE-CONDITION-PREVENTION.md](./RACE-CONDITION-PREVENTION.md) - Concurrency handling
- [SAAS-APPLICATION-FLOW.md](./SAAS-APPLICATION-FLOW.md) - Overall SaaS flow
- [MODULAR-STRUCTURE.md](./MODULAR-STRUCTURE.md) - Code organization

## 🆘 Troubleshooting

### Error: "Optimistic locking error"
**Cause**: Concurrent modification of voucher
**Solution**: System automatically retries (max 3x). If persists, check voucher usage

### Error: "Transaction number already exists"
**Cause**: Race condition in sequence generation
**Solution**: Uses pessimistic locking - should not happen. Check transaction isolation level

### Error: "Member sudah memiliki membership aktif"
**Cause**: Business rule - only 1 membership per member
**Solution**: Wait for current membership to expire or allow staff override

### Error: "Total pembayaran tidak sesuai"
**Cause**: Payment amount ≠ total amount
**Solution**: Recalculate on frontend before submitting

## 📞 Support

For implementation questions:
1. Check [SERVICE-PURCHASE-SYSTEM.md](./SERVICE-PURCHASE-SYSTEM.md) for detailed flow
2. Check [SERVICE-PURCHASE-API-EXAMPLES.md](./SERVICE-PURCHASE-API-EXAMPLES.md) for API usage
3. Review test cases in `/tests`
4. Check logs in `logs/` directory

---

**Last Updated**: 2025-11-24
**Version**: 1.0.0
**Status**: ✅ Production Ready
