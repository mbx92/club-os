# FASE 5 PROGRESS: TRANSACTION SEQUENCES
## Database-Backed Sequence Numbers dengan Race Condition Prevention

**Status**: 🔵 Not Started  
**Progress**: 0% (0/5 days completed)  
**Owner**: TBD  
**Start Date**: TBD  
**Target Completion**: TBD  
**Actual Completion**: -

⚠️ **RECOMMENDED TO START FIRST** - Fase ini tidak ada dependencies dan foundational untuk semua fase lain.

---

## 📊 Progress Summary

### Week 1: Complete Implementation (Days 1-5)
- [ ] **Day 1**: Database Schema
  - [ ] Create TransactionSequence migration dengan FOR UPDATE support
  - [ ] Fields: tenant_id, prefix, current_number, format_pattern, reset_policy
  - [ ] Unique constraint: (tenant_id, prefix)
  - [ ] Seed sample sequences: INV, RCPT, ORD, MBR, POS
  - [ ] Test migration rollback
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 2**: Sequence Service
  - [ ] Implement `SequenceService.js`
  - [ ] Method: `getNextSequence(tenantId, prefix)` dengan pessimistic locking
  - [ ] Method: `resetSequence(tenantId, prefix)` untuk monthly/yearly reset
  - [ ] Implement format patterns: `INV-{YYYY}-{MM}-{0000}`
  - [ ] Error handling: Deadlock detection & retry (3x)
  - [ ] Unit tests: Concurrency simulation dengan Promise.all
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 3**: Integration dengan Controllers
  - [ ] Update `transactionController.js` - Generate sequence on create
  - [ ] Update `membershipPaymentController.js` - Generate sequence
  - [ ] Update `subscriptionController.js` - Invoice sequence
  - [ ] Update restaurant order controller - Order number sequence
  - [ ] Update POS session controller - Receipt number sequence
  - [ ] Add sequence field ke all relevant models (invoice_number, receipt_number, etc.)
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 4**: Concurrency Testing
  - [ ] Load test: 100 concurrent transactions generating sequences
  - [ ] Verify NO duplicate numbers (assertion critical)
  - [ ] Verify NO skipped numbers (unless deadlock retry failed)
  - [ ] Measure performance: Sequence generation overhead < 50ms
  - [ ] Test deadlock scenarios: 10 simultaneous requests
  - [ ] Test reset policy: Monthly reset at 00:00 first day
  - [ ] Test format patterns: Different formats per tenant
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 5**: Documentation & Deployment
  - [ ] Technical documentation: Pessimistic locking explanation
  - [ ] API documentation: Sequence management endpoints
  - [ ] Migration guide: Existing transactions (backfill sequences)
  - [ ] Monitoring setup: Sequence gaps alert, deadlock alert
  - [ ] Deploy ke staging
  - [ ] UAT: Verify no duplicates in production-like load
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

---

## 📝 Detailed Task Breakdown

### Database Schema
- [ ] **TransactionSequence Model**
  - `tenant_id` (UUID, FK to Tenant)
  - `prefix` (VARCHAR, e.g., 'INV', 'RCPT', 'ORD')
  - `current_number` (INTEGER, default 0)
  - `format_pattern` (VARCHAR, e.g., 'INV-{YYYY}-{MM}-{0000}')
  - `reset_policy` (ENUM: 'never', 'monthly', 'yearly')
  - `last_reset_at` (TIMESTAMP)
  - Unique constraint: `(tenant_id, prefix)`
  - Index: `(tenant_id, prefix)` untuk fast lookup

### Sequence Service Implementation
- [ ] **getNextSequence(tenantId, prefix)**
  ```javascript
  // Pseudocode
  const transaction = await sequelize.transaction();
  try {
    const seq = await TransactionSequence.findOne({
      where: {tenant_id: tenantId, prefix},
      lock: transaction.LOCK.UPDATE, // Pessimistic lock
      transaction
    });
    
    seq.current_number += 1;
    await seq.save({transaction});
    await transaction.commit();
    
    return formatSequence(seq.format_pattern, seq.current_number);
  } catch (error) {
    await transaction.rollback();
    // Retry logic here
  }
  ```

- [ ] **resetSequence(tenantId, prefix)**
  - Check reset_policy
  - Reset current_number ke 0
  - Update last_reset_at
  - Transaction-safe

- [ ] **formatSequence(pattern, number)**
  - Replace {YYYY} dengan current year
  - Replace {MM} dengan current month
  - Replace {0000} dengan zero-padded number
  - Example: `INV-2025-11-0001`

### Integration Points
- [ ] Transaction creation → Generate sequence → Set invoice_number
- [ ] Membership payment → Generate sequence → Set receipt_number
- [ ] Restaurant order → Generate sequence → Set order_number
- [ ] POS session → Generate sequence → Set session_number
- [ ] Subscription invoice → Generate sequence → Set invoice_number

### Testing Strategy
- [ ] **Unit Tests**
  - Test format patterns dengan different values
  - Test reset policy logic (monthly, yearly)
  - Test error handling (invalid prefix)
  
- [ ] **Concurrency Tests**
  - 100 concurrent requests → Verify 100 unique sequences
  - No duplicates assertion (critical)
  - No gaps assertion (kecuali deadlock retry failed)
  
- [ ] **Load Tests**
  - 1000 sequences in 1 minute → Measure throughput
  - Measure latency: p50, p95, p99
  - Target: < 50ms overhead per sequence
  
- [ ] **Edge Cases**
  - Deadlock scenario → Verify retry works
  - Database connection loss → Verify graceful failure
  - Reset at midnight → Verify sequence resets correctly

---

## 🐛 Issues & Blockers

### Current Blockers
- None (no dependencies)

### Potential Risks
- **Deadlocks**: Multiple transactions locking same sequence row
  - Mitigation: Retry logic dengan exponential backoff (1s, 2s, 4s)
  - Monitoring: Alert jika retry rate > 5%
  
- **Performance Bottleneck**: Sequence generation bisa slow di high load
  - Mitigation: Consider batch allocation (allocate 10 numbers at once)
  - Monitoring: Track sequence generation latency
  
- **Reset Policy Bugs**: Monthly reset fails, duplicate numbers di new month
  - Mitigation: Cron job untuk reset + manual verification
  - Testing: Simulate month boundary scenarios
  
- **Gap Numbers**: Deadlock retry failed, number skipped
  - Acceptable: Documented behavior
  - Monitoring: Log gaps untuk audit

### Resolved Issues
- None

---

## 📊 Metrics & KPIs

### Performance Targets
- [ ] Sequence generation time < 50ms (p95)
- [ ] Zero duplicate numbers (100% unique)
- [ ] Deadlock retry success rate > 95%
- [ ] Throughput > 1000 sequences/minute
- [ ] Test coverage > 90%

### Current Metrics
- Sequence generation time: Not measured yet
- Duplicate rate: Not tested
- Retry success rate: Not tested
- Throughput: Not tested
- Test coverage: 0%

---

## 🔄 Daily Updates

### 2025-11-22 (Example format)
- **Progress**: Not started yet (recommended to start first)
- **Completed**: Planning documentation finalized
- **Next**: Sprint planning, assign developer
- **Blockers**: None
- **Notes**: Consider starting this fase first due to zero dependencies

---

## ✅ Definition of Done

- [ ] TransactionSequence model created and tested
- [ ] SequenceService implemented dengan pessimistic locking
- [ ] All controllers integrated (5 integration points)
- [ ] Concurrency tests passing (100 concurrent, zero duplicates)
- [ ] Load tests meeting performance targets
- [ ] Reset policy tested (monthly/yearly)
- [ ] Format patterns tested (different formats)
- [ ] All tests passing (unit + integration + load)
- [ ] Technical documentation complete
- [ ] Monitoring alerts configured
- [ ] Deployed to staging
- [ ] UAT completed dengan production-like load
- [ ] Zero duplicates verified in staging
- [ ] No critical bugs

---

## 📚 References

- [Plan Document](../../plan/PHASE-05-TRANSACTION-SEQUENCES.md)
- [Race Condition Prevention](../RACE-CONDITION-PREVENTION.md)
- [Transaction Architecture](../TRANSACTION-ARCHITECTURE.md)
- [Sequelize Locking Docs](https://sequelize.org/docs/v6/core-concepts/transactions/#locks)

---

## 🔗 Dependencies

### Upstream Dependencies (Must Complete First)
- None ✅ (dapat dikerjakan paling awal)

### Downstream Dependencies (Blocks These)
- Fase 2: POS & Restaurant (needs sequence untuk orders & receipts)
- Fase 6: Combined billing (needs sequence untuk invoices)
- All transaction-related features

---

## 🔍 Technical Deep Dive

### Pessimistic Locking SQL
```sql
-- Sequelize generates this SQL
BEGIN TRANSACTION;

SELECT * FROM "TransactionSequences"
WHERE "tenant_id" = '123' AND "prefix" = 'INV'
FOR UPDATE; -- Locks this row until transaction ends

UPDATE "TransactionSequences"
SET "current_number" = "current_number" + 1
WHERE "id" = 456;

COMMIT; -- Releases lock
```

### Deadlock Detection
- PostgreSQL automatically detects deadlocks
- Default timeout: 1 second
- Sequelize throws `SequelizeTimeoutError`
- Retry logic catches and retries 3x

### Format Pattern Examples
```
INV-{YYYY}-{MM}-{0000}     → INV-2025-11-0001
RCPT-{YY}{MM}{DD}-{000}    → RCPT-251122-001
ORD-{0000}                 → ORD-0001
MBR-{YYYY}-{00000}         → MBR-2025-00001
```

---

**Last Updated**: 2025-11-22  
**Updated By**: System (Initial creation)
