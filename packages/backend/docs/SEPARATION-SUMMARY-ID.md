# Ringkasan Pemisahan Psychology & Gym System

## 📌 Kesimpulan

Untuk memisahkan Psychology System dan Gym System menjadi 2 repository dan 2 database terpisah, Anda perlu melakukan **8 fase pekerjaan** dengan estimasi **17-26 hari kerja** (~208 jam).

---

## 🎯 Yang Perlu Dilakukan

### **Fase 1: Persiapan** (1-2 hari)
✅ Backup database lengkap  
✅ Backup code (git tag)  
✅ Analisis dependencies  
✅ Dokumentasi API contracts

### **Fase 2: Setup Psychology Repository** (2-3 hari)
✅ Clone repository baru  
✅ Hapus semua file gym  
✅ Reorganisasi folder structure  
✅ Update konfigurasi (package.json, etc)

### **Fase 3: Database Separation** (3-4 hari)
✅ Buat database baru `psychology_db`  
✅ Run migrations untuk schema  
✅ Migrate data dengan script otomatis  
✅ Verifikasi data integrity

### **Fase 4: Authentication & Authorization** (2-3 hari)
✅ Setup shared JWT authentication  
✅ Update CASL permissions  
✅ Split feature registry

### **Fase 5: API Integration** (3-4 hari)
✅ Implement patient data sync service  
✅ Update psychology order flow  
✅ Integration untuk revenue reporting

### **Fase 6: Clean Up Gym Repository** (1-2 hari)
✅ Hapus semua file psychology  
✅ Update routes & configs  
✅ Regenerate metadata

### **Fase 7: Testing & Validation** (3-5 hari)
✅ Unit testing kedua system  
✅ Integration testing  
✅ Performance testing

### **Fase 8: Deployment** (2-3 hari)
✅ Infrastructure setup  
✅ Nginx reverse proxy  
✅ PM2 configuration  
✅ Monitoring & alerts

---

## 📊 Struktur Akhir

### **Repository 1: gym-be**
```
gym-be/
├── src/
│   ├── models/
│   │   ├── tenant.js         ✅ Shared
│   │   ├── user.js           ✅ Shared
│   │   ├── patient.js        ✅ Shared
│   │   ├── member*.js        ✅ Gym only
│   │   ├── product*.js       ✅ Gym only
│   │   └── transaction*.js   ✅ Gym only
│   ├── controllers/gym/
│   ├── modules/gym/
│   └── modules/restaurant/
├── database: gym_db
└── port: 3000
```

### **Repository 2: psychology-be**
```
psychology-be/
├── src/
│   ├── models/
│   │   ├── tenant.js              ✅ Shared
│   │   ├── user.js                ✅ Shared
│   │   ├── patient.js             ✅ Shared (synced dari gym)
│   │   ├── psychologyPackage.js   ✅ Psychology only
│   │   ├── psychologyOrder.js     ✅ Psychology only
│   │   └── psychologySession.js   ✅ Psychology only
│   ├── controllers/psychology/
│   ├── services/
│   │   └── patientSyncService.js  ← NEW (sync dari gym)
│   └── public/psychology/
├── database: psychology_db
└── port: 3001
```

---

## 🔄 Integrasi Antar System

### **Patient Data Sync**
```
Gym System                Psychology System
┌─────────────┐          ┌──────────────────┐
│  Patient    │   API    │  Patient (copy)  │
│  (master)   │ ────────>│  (synced)        │
│             │  GET     │                  │
└─────────────┘          └──────────────────┘
```

**Flow:**
1. Patient dibuat di Gym System (master data)
2. Psychology Order perlu patient → call Gym API
3. Psychology System sync & cache patient data locally
4. Updates di Gym → Psychology re-sync saat diperlukan

### **Authentication**
```
┌──────────────────────────────────────┐
│  Shared JWT Secret                   │
│  "shared-secret-12345"               │
└──────────────────────────────────────┘
          ↓                    ↓
┌─────────────┐        ┌─────────────┐
│  Gym System │        │ Psychology  │
│  Validates  │        │  Validates  │
│  JWT Token  │        │  JWT Token  │
└─────────────┘        └─────────────┘
```

**Benefit:** User login sekali, bisa akses kedua system

---

## 🛠️ Tools & Scripts yang Disediakan

### **1. Migration Script**
```bash
# Dry run untuk preview
SOURCE_DB_NAME=gym_dev TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js --dry-run

# Actual migration
SOURCE_DB_NAME=gym_dev TARGET_DB_NAME=psychology_dev \
node scripts/migration/migratePsychologyData.js
```

**Fitur:**
- Auto-detect tenants dengan psychology data
- Migrate dalam urutan yang benar (respect foreign keys)
- Idempotent (bisa di-run ulang)
- Detailed logging & statistics

### **2. Verification Script**
```bash
SOURCE_DB_NAME=gym_dev TARGET_DB_NAME=psychology_dev \
node scripts/migration/verifyPsychologyData.js --verbose
```

**Checks:**
- ✓ Record counts match
- ✓ No orphaned foreign keys
- ✓ Tenant isolation maintained
- ✓ Data consistency
- ✓ Sample data verification

---

## 📋 Data yang Dipindahkan

### **Shared Tables** (hanya record terkait psychology)
- `Tenants` - Tenant yang punya data psychology
- `Users` - User dari tenant psychology
- `Patients` - Patient dari tenant psychology

### **Psychology Tables** (semua record)
- `PsychologyTestTypes` (~10-20 records)
- `PsychologyPackages` (~5-15 records)
- `PsychologyPackageItems` (~20-50 records)
- `PsychologyPriceRules` (~10-30 records)
- `PsychologyInvitations` (bisa ribuan)
- `PsychologyOrders` (bisa ribuan)
- `PsychologySessions` (bisa puluhan ribu)
- `PsychologyNorms` (~50-200 records)
- `PsychologySettings` (~10-20 records)
- `PsychologyReportCache` (bisa ribuan)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | ⚠️ Critical | Low | Multiple backups, dry-run, verification |
| Authentication issues | ⚠️ High | Medium | Shared JWT secret, thorough testing |
| Frontend breaking changes | ⚠️ Medium | High | API versioning, backward compatibility |
| Performance degradation | ⚠️ Medium | Medium | Caching, connection pooling, monitoring |
| Operational complexity | ⚠️ Medium | High | Documentation, automation, monitoring |

---

## 💰 Cost-Benefit Analysis

### **Costs:**
- 👨‍💻 Development time: ~208 hours (1 developer, 26 hari)
- 💾 Infrastructure: Minimal (jika same server, beda port)
- 📊 Operational overhead: Medium (2 systems to maintain)

### **Benefits:**
- ✅ True separation of concerns
- ✅ Independent scaling (psychology vs gym)
- ✅ Independent deployment cycles
- ✅ Easier team management (psychology team vs gym team)
- ✅ Clearer codebase (fokus 1 domain)
- ✅ Better security (isolation)
- ✅ Easier to sell/license separately

---

## 🚦 Decision Points

### **Apakah Harus Dipisah Sekarang?**

**PISAHKAN jika:**
- ✅ Psychology & Gym adalah 2 produk berbeda
- ✅ Team development terpisah
- ✅ Scaling requirements berbeda
- ✅ Deployment cycles berbeda
- ✅ Customer base berbeda
- ✅ Ada rencana jual/license salah satu

**JANGAN PISAHKAN jika:**
- ❌ Masih dalam fase MVP/early development
- ❌ Resource terbatas (1-2 developer)
- ❌ Feature overlap masih tinggi
- ❌ Belum ada customer/revenue
- ❌ Infrastructure belum ready

### **Alternative: Soft Separation**
Jika belum yakin mau hard separation:
1. Keep same database
2. Pisahkan codebase saja (2 repos)
3. Shared models via npm package
4. Deploy terpisah tapi akses same DB
5. Migrate database nanti saat sudah siap

---

## 📞 Next Steps

### **Immediate Actions:**
1. **Review dokumen lengkap:** [docs/SEPARATION-GUIDE.md](./SEPARATION-GUIDE.md)
2. **Diskusi dengan team:**
   - Apakah timing sudah tepat?
   - Siapa yang akan handle migration?
   - Berapa budget/timeline yang tersedia?
3. **Setup testing environment:**
   - Clone database untuk testing
   - Test migration scripts
   - Verify tidak ada data loss
4. **Create detailed project plan:**
   - Assign tasks
   - Set milestones
   - Define rollback criteria

### **Before Starting:**
- [ ] All stakeholders aware & aligned
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Testing environment ready
- [ ] Timeline approved
- [ ] Resource allocated

---

## 📚 Dokumentasi Lengkap

1. **[SEPARATION-GUIDE.md](./SEPARATION-GUIDE.md)**  
   Panduan lengkap 50+ halaman dengan detail setiap langkah

2. **[SEPARATION-QUICK-REFERENCE.md](./SEPARATION-QUICK-REFERENCE.md)**  
   Quick reference, checklists, troubleshooting

3. **[scripts/migration/README.md](../scripts/migration/README.md)**  
   Dokumentasi migration scripts

4. **[scripts/migration/migratePsychologyData.js](../scripts/migration/migratePsychologyData.js)**  
   Script untuk migrate data

5. **[scripts/migration/verifyPsychologyData.js](../scripts/migration/verifyPsychologyData.js)**  
   Script untuk verify data integrity

---

## ❓ FAQ

**Q: Berapa lama waktu yang dibutuhkan?**  
A: 17-26 hari kerja untuk 1 developer full-time. Bisa lebih cepat jika parallel.

**Q: Apakah bisa dilakukan tanpa downtime?**  
A: Ya, dengan strategi:
- Migration di background
- Blue-green deployment
- Feature flags untuk gradual rollout

**Q: Bagaimana jika ada error saat migration?**  
A: Ada rollback plan lengkap. Backup database sebelum mulai. Migration script idempotent (bisa di-run ulang).

**Q: Apakah frontend perlu diubah?**  
A: Minimal changes jika menggunakan API versioning. Psychology API pindah dari `/api/v1/psychology` ke domain baru.

**Q: Bisakah tetap pakai 1 database?**  
A: Bisa (soft separation), tapi tidak recommended untuk long-term. Mengurangi benefits separation.

---

**Dibuat:** 28 Januari 2026  
**Status:** Siap untuk review & eksekusi  
**Contact:** [Your Team/Contact Info]
