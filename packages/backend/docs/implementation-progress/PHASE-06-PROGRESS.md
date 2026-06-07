# FASE 6 PROGRESS: COMBINED BILLING
## Unified Transaction System untuk Multi-Item Transactions

**Status**: 🔵 Not Started  
**Progress**: 0% (0/10 days completed)  
**Owner**: TBD  
**Start Date**: TBD  
**Target Completion**: TBD  
**Actual Completion**: -

---

## 📊 Progress Summary

### Week 1: Enhancements & Services (Days 1-5)
- [ ] **Day 1-2**: Unified Transaction Enhancements
  - [ ] Add `transaction_type` field ke Transaction model (ENUM: 'membership_only', 'pos_only', 'restaurant_only', 'combined')
  - [ ] Add `item_summary` JSONB ke Transaction (quick access to line items)
  - [ ] Migration: Backfill existing transactions dengan type
  - [ ] Update TransactionItem untuk polymorphic references (membership_id, pos_item_id, menu_item_id)
  - [ ] Test polymorphic associations
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 3-4**: Service Layer
  - [ ] Implement `CombinedTransactionService.js`
  - [ ] Method: `createCombinedTransaction(items, payments)` - Multi-item checkout
  - [ ] Method: `addItemToTransaction(transactionId, item)` - Add line item
  - [ ] Method: `removeItemFromTransaction(transactionId, itemId)` - Remove line item
  - [ ] Method: `calculateTotals(items)` - Subtotal, tax, discount, total
  - [ ] Method: `applySplitPayment(transactionId, payments)` - Multiple payment methods
  - [ ] Transaction safety: All-or-nothing commit
  - [ ] Unit tests: Multi-item scenarios
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 5**: Tax & Discount Logic
  - [ ] Implement tax calculation (per-item atau total-based)
  - [ ] Implement discount application (percentage, fixed amount, voucher)
  - [ ] Implement voucher validation (expiry, usage limit)
  - [ ] Update VoucherUsage model untuk combined transactions
  - [ ] Test edge cases: Multiple discounts, tax on discounted price
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

### Week 2: Controllers & Integration (Days 6-10)
- [ ] **Day 6-7**: Controller Implementation
  - [ ] `POST /api/transactions/combined` - Create multi-item transaction
  - [ ] `PATCH /api/transactions/:id/items` - Add/remove items
  - [ ] `POST /api/transactions/:id/payments/split` - Split payment
  - [ ] `GET /api/transactions/:id/invoice` - Generate combined invoice
  - [ ] Integration dengan existing transaction controller
  - [ ] CASL permissions: `create:combined-transaction`
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 8**: Invoice Generation
  - [ ] Implement `InvoiceService.js`
  - [ ] Method: `generateInvoice(transactionId)` - PDF generation dengan pdf-lib
  - [ ] Template: Combined invoice dengan sections (membership, POS, restaurant)
  - [ ] Itemized line items dengan tax breakdown
  - [ ] Multiple payment methods display
  - [ ] QR code untuk payment verification (optional)
  - [ ] Unit tests: PDF structure validation
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 9**: Testing
  - [ ] Integration tests: Combined transaction flow (create → add items → split payment)
  - [ ] Test scenarios: Membership + 3 café items
  - [ ] Test scenarios: 5 restaurant items + 2 POS items
  - [ ] Test edge cases: Partial payment, overpayment, refund
  - [ ] Test voucher application dengan combined transactions
  - [ ] Test tax calculation accuracy
  - [ ] Load testing: 50 concurrent combined transactions
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

- [ ] **Day 10**: Documentation & Deployment
  - [ ] API documentation: Combined transaction endpoints
  - [ ] Invoice template documentation
  - [ ] Tax calculation guide
  - [ ] Split payment guide
  - [ ] Workflow diagram: Combined billing flow
  - [ ] Deploy ke staging
  - [ ] UAT: Real-world scenario testing
  - **Status**: Not Started
  - **Blockers**: None
  - **Notes**: -

---

## 📝 Detailed Task Breakdown

### Database Enhancements
- [ ] **Transaction Model**
  - Add `transaction_type` ENUM field
  - Add `item_summary` JSONB field {membership_count, pos_count, restaurant_count}
  - Migration: Backfill existing transactions
  
- [ ] **TransactionItem Model**
  - Already polymorphic: `itemable_type`, `itemable_id`
  - Add explicit FKs: `membership_id`, `pos_item_id`, `menu_item_id` (optional, for query optimization)
  - Add `tax_amount` decimal field
  - Add `discount_amount` decimal field

- [ ] **TransactionPayment Model**
  - Already supports multiple payments per transaction
  - Ensure `payment_method` supports: cash, card, transfer, ewallet, voucher

### Service Layer Components
- [ ] **CombinedTransactionService**
  ```javascript
  async createCombinedTransaction({tenantId, items, payments}) {
    const transaction = await sequelize.transaction();
    try {
      // 1. Create Transaction record
      const txn = await Transaction.create({...}, {transaction});
      
      // 2. Create TransactionItems (membership, POS, restaurant)
      for (const item of items) {
        await TransactionItem.create({
          transaction_id: txn.id,
          itemable_type: item.type, // 'Membership', 'POSItem', 'MenuItem'
          itemable_id: item.id,
          quantity: item.quantity,
          price: item.price,
          tax_amount: calculateTax(item),
          discount_amount: applyDiscount(item)
        }, {transaction});
      }
      
      // 3. Create TransactionPayments (split payment)
      for (const payment of payments) {
        await TransactionPayment.create({
          transaction_id: txn.id,
          payment_method: payment.method,
          amount: payment.amount
        }, {transaction});
      }
      
      // 4. Update item_summary
      txn.item_summary = categorizeItems(items);
      await txn.save({transaction});
      
      await transaction.commit();
      return txn;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  ```

- [ ] **Tax Calculation**
  - Per-item tax: `item.price * item.tax_rate`
  - Total tax: Sum of all item taxes
  - Tax exemptions: Membership payments may be tax-exempt

- [ ] **Discount Application**
  - Percentage discount: `item.price * discount.percentage / 100`
  - Fixed discount: Distribute proportionally across items
  - Voucher discount: Apply to specific item types only

### Invoice Generation
- [ ] **PDF Template Structure**
  ```
  [Header]
  - Tenant logo, name, address
  - Invoice number, date
  - Customer name (if membership)
  
  [Items Section]
  === MEMBERSHIP ===
  - Membership Type: Gold (1x) - Rp 500.000
  
  === CAFÉ/POS ===
  - Coffee Latte (2x) - Rp 50.000
  - Protein Shake (1x) - Rp 45.000
  
  === RESTAURANT ===
  - Grilled Chicken (1x) - Rp 75.000
  - Caesar Salad (1x) - Rp 40.000
  
  [Totals]
  Subtotal:      Rp 710.000
  Tax (10%):     Rp  71.000
  Discount:      Rp  20.000
  ---------------------
  Total:         Rp 761.000
  
  [Payments]
  Cash:          Rp 500.000
  Card (Visa):   Rp 261.000
  ---------------------
  Total Paid:    Rp 761.000
  
  [Footer]
  - Thank you message
  - QR code for verification (optional)
  ```

### Testing Coverage
- [ ] Unit tests: CombinedTransactionService (all methods)
- [ ] Unit tests: Tax calculation (various rates)
- [ ] Unit tests: Discount application (percentage, fixed, voucher)
- [ ] Integration tests: Full flow (create → add → pay → invoice)
- [ ] Edge case tests: Partial payment, overpayment, refund
- [ ] Load tests: 50 concurrent combined transactions
- [ ] Invoice tests: PDF structure, itemization accuracy

---

## 🐛 Issues & Blockers

### Current Blockers
- None

### Potential Risks
- **Transaction Atomicity**: Partial failure (e.g., payment fails) leaves orphan records
  - Mitigation: Database transactions, rollback on any error
  - Testing: Simulate failures at each step
  
- **Tax Calculation Errors**: Rounding errors di large transactions
  - Mitigation: Use DECIMAL(10,2) not FLOAT, unit tests dengan edge values
  
- **Invoice Generation Performance**: PDF generation slow untuk large invoices
  - Mitigation: Async generation dengan queue, cache generated PDFs
  
- **Split Payment Validation**: Total payments ≠ transaction total
  - Mitigation: Strict validation sebelum commit, error message clear
  
- **Voucher Double-Use**: Voucher applied twice di concurrent transactions
  - Mitigation: Pessimistic locking pada VoucherUsage, atomic decrement

### Resolved Issues
- None

---

## 📊 Metrics & KPIs

### Performance Targets
- [ ] Combined transaction creation < 2 seconds
- [ ] Invoice PDF generation < 3 seconds
- [ ] Tax calculation accuracy 100% (no rounding errors > 1 cent)
- [ ] Split payment validation success rate 100%
- [ ] Support 50 concurrent combined transactions
- [ ] Test coverage > 80%

### Current Metrics
- Transaction creation time: Not measured yet
- Invoice generation time: Not measured yet
- Tax accuracy: Not tested
- Validation success rate: Not tested
- Concurrent capacity: Not tested
- Test coverage: 0%

---

## 🔄 Daily Updates

### 2025-11-22 (Example format)
- **Progress**: Not started yet (depends on Fase 2 & 5 completion)
- **Completed**: Planning documentation finalized
- **Next**: Wait for POS & Restaurant modules, Transaction sequences
- **Blockers**: Upstream dependencies not met
- **Notes**: -

---

## ✅ Definition of Done

- [ ] Database schema enhancements completed
- [ ] CombinedTransactionService implemented
- [ ] Tax & discount logic implemented dan tested
- [ ] All controllers implemented
- [ ] Invoice generation service implemented
- [ ] PDF template designed dan tested
- [ ] All tests passing (unit + integration + load)
- [ ] Tax calculation accuracy verified
- [ ] Split payment validation verified
- [ ] API documentation complete
- [ ] Invoice template documented
- [ ] Workflow diagram created
- [ ] Deployed to staging
- [ ] UAT completed dengan real-world scenarios
- [ ] Performance metrics met
- [ ] No critical bugs

---

## 📚 References

- [Plan Document](../../plan/PHASE-06-COMBINED-BILLING.md)
- [Transaction Architecture](../TRANSACTION-ARCHITECTURE.md)
- [Unified Transaction Models](../../src/models/transaction.js)
- [Voucher Models](../../src/models/voucher.js)

---

## 🔗 Dependencies

### Upstream Dependencies (Must Complete First)
- ✅ Fase 2: POS & Restaurant (needs POSItem, MenuItem untuk combined transactions)
- ✅ Fase 5: Transaction sequences (needs invoice_number generation)

### Downstream Dependencies (Blocks These)
- None (last major feature before integrations)

---

## 💡 Business Scenarios

### Scenario 1: Membership + Café Purchase
```
Customer buys:
- Gold Membership: Rp 500.000
- 2x Coffee Latte: Rp 50.000
Total: Rp 550.000 + 10% tax = Rp 605.000

Payment:
- Cash: Rp 500.000
- Card: Rp 105.000
```

### Scenario 2: Restaurant + POS + Voucher
```
Customer orders:
- Grilled Chicken: Rp 75.000
- Caesar Salad: Rp 40.000
- Protein Shake (POS): Rp 45.000
Subtotal: Rp 160.000

Discount: 10% voucher = Rp 16.000
Tax: 10% of (160.000 - 16.000) = Rp 14.400
Total: Rp 158.400

Payment:
- E-wallet (OVO): Rp 158.400
```

### Scenario 3: Split Bill (Multi-Customer)
```
Table of 3 people:
- Person A: 2 items = Rp 80.000
- Person B: 1 item = Rp 50.000
- Person C: 2 items = Rp 70.000
Total: Rp 200.000 + tax = Rp 220.000

Split:
- Person A pays: Rp 88.000 (card)
- Person B pays: Rp 55.000 (cash)
- Person C pays: Rp 77.000 (card)
```

---

**Last Updated**: 2025-11-22  
**Updated By**: System (Initial creation)
