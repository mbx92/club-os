# RENCANA PENGEMBANGAN BACKEND GYM-BE
## Overview Ekspansi Fitur Multi-Fase

**Tanggal Dibuat**: 21 November 2025  
**Status**: Planning Phase  
**Versi Backend**: 1.x (Base System)

---

## 🎯 Tujuan Utama

Mengembangkan backend gym-be dari sistem manajemen gym dasar menjadi platform multi-modul yang lengkap dengan kemampuan:

1. **Subscription Feature-Gating** - Kontrol fitur berdasarkan plan subscription
2. **POS & Restoran** - Modul Point of Sale dan manajemen restoran/café
3. **Thermal Printing** - Integrasi printer thermal untuk cetak struk otomatis
4. **Touchscreen UI** - Backend untuk mendukung tampilan touchscreen-friendly dengan desain table custom per tenant
5. **Transaction Sequences** - Sistem auto-numbering yang robust dengan race condition prevention
6. **Combined Billing** - Transaksi gabungan (membership + class + café dalam 1 bill)
7. **Third-Party Integrations** - Framework integrasi untuk Twilio, Midtrans, dan layanan eksternal lainnya

---

## 📋 Daftar Fase Implementasi

| Fase | Dokumen | Prioritas | Estimasi | Dependencies |
|------|---------|-----------|----------|--------------|
| **Fase 1** | [PHASE-01-SUBSCRIPTION-FEATURES.md](./PHASE-01-SUBSCRIPTION-FEATURES.md) | 🔴 High | 2 minggu | - |
| **Fase 2** | [PHASE-02-POS-RESTAURANT.md](./PHASE-02-POS-RESTAURANT.md) | 🔴 High | 3 minggu | Fase 1 |
| **Fase 3** | [PHASE-03-THERMAL-PRINTING.md](./PHASE-03-THERMAL-PRINTING.md) | 🟡 Medium | 2 minggu | Fase 2 |
| **Fase 4** | [PHASE-04-RESTAURANT-UI-TABLE-DESIGN.md](./PHASE-04-RESTAURANT-UI-TABLE-DESIGN.md) | 🟡 Medium | 2 minggu | Fase 2 |
| **Fase 5** | [PHASE-05-TRANSACTION-SEQUENCES.md](./PHASE-05-TRANSACTION-SEQUENCES.md) | 🔴 High | 1 minggu | - |
| **Fase 6** | [PHASE-06-COMBINED-TRANSACTIONS.md](./PHASE-06-COMBINED-TRANSACTIONS.md) | 🟡 Medium | 2 minggu | Fase 2, 5 |
| **Fase 7** | [PHASE-07-THIRD-PARTY-INTEGRATIONS.md](./PHASE-07-THIRD-PARTY-INTEGRATIONS.md) | 🟢 Low | 3 minggu | - |

**Total Estimasi**: 15 minggu (~3.5 bulan)

---

## 🏗️ Arsitektur Sistem Saat Ini

### Kekuatan Sistem yang Ada
✅ **Multi-Tenancy** - Isolasi data per tenant yang kuat  
✅ **Unified Transaction System** - Support transaksi kompleks dengan `Transaction`, `TransactionItem`, `TransactionPayment`  
✅ **Race Condition Prevention** - Pessimistic + optimistic locking sudah terimplementasi  
✅ **CASL Permissions** - Fine-grained authorization  
✅ **Subscription System** - SaaS billing untuk platform sudah ada  
✅ **Sequence Generator** - Auto-numbering dengan atomic operations  
✅ **Audit Trail** - Logging komprehensif  
✅ **Prometheus Monitoring** - Metrics sudah terintegrasi  

### Model Database yang Ada
```
Core Models (20):
├── Tenant              - Multi-tenant organizations
├── User                - System users
├── Role                - User roles with JSON permissions
├── Member              - Gym members
├── Membership          - Member membership records
├── MembershipType      - Membership plan types
├── CheckIn             - Member check-ins
├── SubscriptionPlan    - Platform subscription tiers
├── Subscription        - Active subscriptions per tenant
├── Invoice             - Subscription invoices
├── Payment             - Platform subscription payments
├── MembershipPayment   - Gym membership payments
├── MembershipPaymentRefund - Refunds
├── Product             - POS products (cafe items)
├── Transaction         - Unified transaction container
├── TransactionItem     - Transaction line items (polymorphic)
├── TransactionPayment  - Transaction payments
├── Voucher             - Discount vouchers
└── VoucherUsage        - Voucher usage tracking
```

### Middleware yang Ada
```
Authentication & Authorization:
├── authMiddleware.js          - JWT authentication
├── caslMiddleware.js          - CASL-based authorization
├── roleMiddleware.js          - Role-based authorization
├── subscriptionMiddleware.js  - Subscription validation
└── superAdminMiddleware.js    - Superadmin-only access

Operational:
├── auditMiddleware.js         - Audit logging
├── loggerMiddleware.js        - Request logging
├── metricsMiddleware.js       - Prometheus metrics
├── raceConditionLogger.js     - Concurrency event logging
└── errorHandler.js            - Centralized error handling
```

---

## 🚀 Strategi Deployment

### Pendekatan Incremental Release
Setiap fase akan di-deploy secara bertahap dengan strategi:

1. **Feature Flags** - Gunakan field `SubscriptionPlan.features` untuk kontrol rollout per tenant
2. **Backward Compatibility** - Maintain sistem lama sambil menambahkan fitur baru
3. **Database Migrations** - Migrasi schema bertahap dengan rollback plan
4. **API Versioning** - Pertahankan `/api/v1` untuk compatibility, tambahkan `/api/v2` jika breaking changes
5. **A/B Testing** - Test fitur baru di tenant tertentu sebelum rollout penuh

### Deployment Order (Rekomendasi)
```
Sprint 1-2:  Fase 5 (Transaction Sequences) - Foundation critical
Sprint 3-4:  Fase 1 (Subscription Features) - Business logic critical
Sprint 5-7:  Fase 2 (POS & Restaurant) - Main revenue feature
Sprint 8-9:  Fase 3 (Thermal Printing) - UX enhancement
Sprint 10-11: Fase 4 (Restaurant UI) - UX enhancement
Sprint 12-13: Fase 6 (Combined Transactions) - Advanced feature
Sprint 14-16: Fase 7 (Third-Party Integrations) - Extensions
```

---

## 🔧 Keputusan Teknis Utama

### 1. Feature-Gating Approach
**Keputusan**: Middleware-based dengan validasi terhadap `SubscriptionPlan.features` JSON  
**Alasan**: 
- Reusable untuk semua routes
- Sentralisasi logic di satu tempat
- Mudah di-test dan di-maintain
- Compatible dengan existing middleware chain

**Alternative yang Ditolak**:
- ❌ Controller-level checking (terlalu repetitif)
- ❌ Frontend-only gating (tidak secure)

### 2. POS vs Gym Mode
**Keputusan**: Multi-mode simultaneous dengan field `Tenant.modules` JSON  
**Alasan**:
- Tenant bisa jalankan gym + café bersamaan
- Flexibility lebih tinggi untuk business model hybrid
- Revenue stream lebih banyak

**Schema**:
```json
{
  "modules": {
    "gym": true,
    "pos": true,
    "restaurant": true,
    "classes": true
  }
}
```

### 3. Printer Configuration
**Keputusan**: Per-station dengan tenant admin control (model `PrinterDevice`)  
**Alasan**:
- Satu tenant bisa punya multiple lokasi/POS station
- Fleksibilitas untuk setup printer berbeda per station
- Admin tenant bisa manage sendiri tanpa intervensi superadmin

### 4. Transaction Architecture
**Keputusan**: Maintain existing `Transaction` model, expand polymorphic `TransactionItem`  
**Alasan**:
- Sistem sudah bagus dan teruji
- Tidak perlu rewrite dari awal
- Support backward compatibility dengan `MembershipPayment`

### 5. Sequence Management
**Keputusan**: Database-backed sequences dengan model `SequenceCounter`  
**Alasan**:
- Lebih reliable daripada in-memory counter
- Survive server restart
- Better race condition prevention dengan pessimistic locking
- Mudah di-audit dan di-monitor

### 6. Third-Party Integration Security
**Keputusan**: Enkripsi at-rest untuk credentials dengan tenant-specific keys  
**Alasan**:
- Compliance dengan security best practices
- Isolasi credentials antar tenant
- Mencegah credential leakage jika database breach

---

## 📊 Metrik Kesuksesan

### Technical Metrics
- **API Response Time** - P95 < 200ms untuk semua endpoints
- **Database Query Time** - P95 < 100ms
- **Race Condition Incidents** - Zero per sprint
- **System Uptime** - 99.9% SLA
- **Print Job Success Rate** - > 99%

### Business Metrics
- **Feature Adoption Rate** - > 60% tenant menggunakan fitur baru dalam 3 bulan
- **Transaction Volume** - 10x increase setelah POS module deployed
- **Average Transaction Value** - Increase 30% dengan combined billing
- **Customer Support Tickets** - < 5% increase meskipun fitur bertambah

### User Experience Metrics
- **Print Success Time** - < 3 detik dari save transaction ke print complete
- **UI Response Time** - < 100ms untuk touchscreen interactions
- **Feature Discoverability** - > 80% tenant tahu cara pakai fitur dalam 1 minggu

---

## 🧪 Strategi Testing

### Unit Tests
- Setiap function dan method harus punya unit test
- Coverage target: **> 80%**
- Mock external services (printer, payment gateway, SMS)

### Integration Tests
- Test complete flow dari API endpoint sampai database
- Test race condition scenarios dengan concurrent requests
- Test transaction rollback scenarios

### Load Testing
- Simulate 1000 concurrent users
- Test printer queue dengan 100 print jobs simultaneous
- Test sequence generation dengan high concurrency

### Printer Testing
- **Development**: Gunakan thermal printer emulator
- **Staging**: Gunakan real Epson TM-T82X
- **Production**: Monitor print success rate via Prometheus

---

## 🔒 Security Considerations

### API Security
- JWT authentication mandatory untuk semua protected routes
- Rate limiting per tenant (1000 requests/minute)
- CORS restricted ke whitelisted domains
- Input validation dengan Joi schemas

### Data Security
- Tenant isolation di semua queries (mandatory `tenantId` filter)
- Encrypted credentials untuk third-party integrations
- PCI compliance untuk payment data (jangan simpan card number)
- Audit trail untuk semua sensitive operations

### Printer Security
- IP whitelist untuk printer devices
- Authentication untuk printer management API
- Rate limiting untuk print jobs (prevent spam)

---

## 📚 Dokumentasi yang Perlu Diupdate

Setelah implementasi setiap fase, update dokumentasi berikut:

1. **API-DOCUMENTATION.md** - Tambahkan endpoint baru per fase
2. **TRANSACTION-ARCHITECTURE.md** - Update dengan combined transaction flow
3. **ROLE-PERMISSION-MANAGEMENT.md** - Tambahkan permissions untuk fitur baru
4. **RACE-CONDITION-PREVENTION.md** - Tambahkan sequence counter strategy
5. **Postman Collection** - Update dengan API requests baru

Dokumentasi baru yang perlu dibuat:
- **POS-MODULE.md** - Guide lengkap untuk POS operations
- **RESTAURANT-MODULE.md** - Guide untuk restaurant/café operations
- **THERMAL-PRINTING.md** - Setup guide untuk printer integration
- **THIRD-PARTY-INTEGRATIONS.md** - Guide untuk setup Twilio, Midtrans, dll
- **FEATURE-GATING.md** - Dokumentasi subscription features per plan

---

## 🤝 Dependencies & Third-Party Libraries

### Library Baru yang Perlu Ditambahkan

```json
{
  "dependencies": {
    "escpos": "^3.0.0",              // ESC/POS commands untuk thermal printer
    "net": "built-in",                // TCP/IP untuk printer connection
    "twilio": "^4.x",                 // SMS integration
    "midtrans-client": "^1.x",        // Payment gateway
    "node-cron": "^3.x",              // Scheduled jobs (subscription renewal)
    "pdf-lib": "^1.x",                // PDF generation untuk invoice
    "qrcode": "^1.x"                  // QR code untuk struk/table
  },
  "devDependencies": {
    "thermal-printer-emulator": "^1.x" // Untuk testing
  }
}
```

### External Services
- **Twilio** - SMS notifications (payment reminders, OTP)
- **Midtrans** - Payment gateway untuk online payments
- **Printer Epson TM-T82X** - Thermal printer via TCP/IP
- (Optional) **SendGrid** - Email notifications
- (Optional) **Sentry** - Error tracking
- (Optional) **Redis** - Caching & queue management untuk print jobs

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Race condition di sequence generator** | High | Medium | Implementasi pessimistic locking + comprehensive testing |
| **Printer offline/error** | Medium | High | Implement queue dengan retry mechanism + manual print fallback |
| **Payment gateway webhook down** | High | Low | Implement polling fallback + webhook retry dengan exponential backoff |
| **Database lock timeout** | High | Medium | Optimize query, reduce transaction scope, implement proper indexing |
| **Third-party API rate limit** | Medium | Medium | Implement request queuing + caching + retry logic |
| **Migration data loss** | Critical | Low | Comprehensive backup strategy + rollback plan + dry-run testing |
| **Breaking changes ke existing tenant** | High | Medium | Feature flags + backward compatibility + thorough regression testing |

---

## 🔄 Rollback Strategy

Jika deployment mengalami critical issue:

### Immediate Actions
1. **Feature Flag Off** - Disable fitur baru via `SubscriptionPlan.features`
2. **Route Disable** - Comment out new routes di `app.js`
3. **Database Rollback** - Jalankan down migration jika perlu

### Database Migration Rollback
Setiap migration harus punya `down()` function yang tested:
```javascript
// Example
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table
  },
  down: async (queryInterface, Sequelize) => {
    // Drop table - MUST BE TESTED
  }
};
```

### Communication Plan
1. Notify affected tenants via email/SMS
2. Update status page
3. Post-mortem meeting dalam 24 jam
4. Dokumentasi incident untuk learning

---

## 📞 Kontak & Ownership

### Phase Owners
- **Fase 1-2**: Backend Team Lead
- **Fase 3-4**: Full-stack Developer + UI/UX Consultant
- **Fase 5**: Senior Backend Developer
- **Fase 6**: Backend Team Lead
- **Fase 7**: Integration Specialist + Backend Developer

### Review & Approval
- **Technical Review**: CTO/Technical Lead
- **Business Review**: Product Manager
- **Security Review**: Security Team (khususnya Fase 7)
- **Final Approval**: Project Stakeholders

---

## 📅 Timeline & Milestones

### Q1 2026 (Jan - Mar)
- ✅ Planning & Architecture Design
- 🎯 Fase 5: Transaction Sequences
- 🎯 Fase 1: Subscription Features
- 🎯 Fase 2: POS & Restaurant (start)

### Q2 2026 (Apr - Jun)
- 🎯 Fase 2: POS & Restaurant (complete)
- 🎯 Fase 3: Thermal Printing
- 🎯 Fase 4: Restaurant UI
- 🎯 Fase 6: Combined Transactions

### Q3 2026 (Jul - Sep)
- 🎯 Fase 7: Third-Party Integrations
- 🎯 Bug fixes & optimization
- 🎯 Documentation completion
- 🎯 Production deployment

---

## 🎓 Learning & Training

### Developer Training Required
1. **ESC/POS Protocol** - Workshop untuk thermal printing
2. **Race Condition Best Practices** - Training session
3. **Payment Gateway Integration** - Security best practices
4. **Midtrans/Twilio APIs** - Hands-on workshop

### Documentation Training
1. API documentation standards
2. Postman collection maintenance
3. Markdown documentation best practices

---

## 📖 Referensi

### Internal Documentation
- [API Documentation](../docs/API-DOCUMENTATION.md)
- [Transaction Architecture](../docs/TRANSACTION-ARCHITECTURE.md)
- [Race Condition Prevention](../docs/RACE-CONDITION-PREVENTION.md)
- [Role Permission Management](../docs/ROLE-PERMISSION-MANAGEMENT.md)

### External Resources
- [Epson TM-T82X Programming Manual](https://download.epson-biz.com/modules/pos/index.php?page=single_soft&cid=6687)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/)
- [Midtrans API Documentation](https://docs.midtrans.com/)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [Sequelize Transaction Docs](https://sequelize.org/docs/v6/other-topics/transactions/)

---

## 📝 Change Log

| Tanggal | Versi | Perubahan | Author |
|---------|-------|-----------|--------|
| 2025-11-21 | 1.0 | Initial planning document | GitHub Copilot |

---

**Next Steps**: Baca dokumen fase per fase untuk detail implementasi teknis.

**Start with**: [PHASE-01-SUBSCRIPTION-FEATURES.md](./PHASE-01-SUBSCRIPTION-FEATURES.md)
